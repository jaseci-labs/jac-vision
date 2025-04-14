import json
import os
import traceback

from datasets import load_dataset
from fastapi import HTTPException
from PIL import Image
from services.training_metrics import compute_metrics, print_training_summary
from sklearn.model_selection import train_test_split
from transformers import (
    TrainerCallback,
    TrainerControl,
    TrainerState,
    TrainingArguments,
)
from trl import SFTConfig, SFTTrainer
from unsloth import FastVisionModel, is_bf16_supported
from unsloth.trainer import UnslothVisionDataCollator
from utils.config_loader import load_model_config
from utils.dataset_utils import get_custom_dataset

os.environ["UNSLOTH_COMPILED_CACHE"] = "/tmp/unsloth_compiled_cache"
os.environ["UNSLOTH_RETURN_LOGITS"] = "1"

AVAILABLE_MODELS = [
    "unsloth/Llama-3.2-11B-Vision-bnb-4bit",
    "unsloth/Qwen2-VL-2B-Instruct-bnb-4bit",
    "unsloth/Pixtral-12B-2409",
]

task_status = {}
trained_models = {}

class ProgressCallback(TrainerCallback):
    def __init__(self, task_id: str, total_steps: int):
        self.task_id = task_id
        self.total_steps = total_steps

    def on_step_end(
        self,
        args: TrainingArguments,
        state: TrainerState,
        control: TrainerControl,
        **kwargs,
    ):
        progress = int((state.global_step / self.total_steps) * 100)
        task_status[self.task_id] = {
            "status": "RUNNING",
            "progress": progress,
            "loss": state.log_history[-1].get("loss") if state.log_history else None,
            "learning_rate": (
                state.log_history[-1].get("learning_rate")
                if state.log_history
                else None
            ),
            "epoch": state.epoch,
            "error": None,
        }

    def on_train_begin(self, args, state, control, **kwargs):
        task_status[self.task_id] = {
            "status": "RUNNING",
            "progress": 0,
            "loss": None,
            "learning_rate": None,
            "epoch": 0,
            "error": None,
        }

    def on_train_end(self, args, state, control, **kwargs):
        task_status[self.task_id].update({"status": "COMPLETED", "progress": 100})

def retreive_captioned_dataset():
    dataset_dir = "datasets"
    try:
        if not os.path.exists(dataset_dir):
            return HTTPException(status_code=404, content={"message": "Dataset directory not found."})
        folder_names = [
            name for name in os.listdir(dataset_dir)
            if os.path.isdir(os.path.join(dataset_dir, name))
        ]
        return {"datasets": folder_names}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Dataset loading failed")

def train_model(model_name: str, task_id: str, dataset_path: str):
    if model_name not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail="Invalid model name")
    json_file_path = os.path.join("jsons", dataset_path, ".json")
    root_folder = os.path.join("datasets", dataset_path)
    if not os.path.exists(json_file_path) or not os.path.exists(root_folder):
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    task_status[task_id] = {"status": "RUNNING", "progress": 0, "error": None}
    converted_dataset = get_custom_dataset(json_file_path, root_folder)

    try:
        model, tokenizer = FastVisionModel.from_pretrained(
            model_name, load_in_4bit=True, use_gradient_checkpointing="unsloth"
        )
        model = FastVisionModel.get_peft_model(
            model,
            finetune_vision_layers=False,
            finetune_language_layers=True,
            finetune_attention_modules=False,
            finetune_mlp_modules=True,
            r=8,  # The larger, the higher the accuracy, but might overfit
            lora_alpha=8,  # Recommended alpha == r at least
            lora_dropout=0,
            bias="none",
            random_state=3407,
            use_rslora=False,  # We support rank stabilized LoRA
            loftq_config=None,
            # r=16,
            # lora_alpha=16,
            # lora_dropout=0,
            # bias="none",
            # random_state=3407,
        )

        print("[MODEL INIT] Model and tokenizer loaded successfully.")
        FastVisionModel.for_training(model)

        train_dataset, eval_dataset = train_test_split(
            converted_dataset, test_size=0.2, random_state=42
        )

        trainer = SFTTrainer(
            model=model,
            tokenizer=tokenizer,
            data_collator=UnslothVisionDataCollator(model, tokenizer),
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            compute_metrics=compute_metrics,
            args=SFTConfig(
                per_device_train_batch_size=2,
                gradient_accumulation_steps=4,
                warmup_steps=5,
                max_steps=20,
                learning_rate=2e-4,
                fp16=not is_bf16_supported(),
                bf16=is_bf16_supported(),
                logging_steps=1,
                optim="adamw_8bit",
                # output_dir=f"outputs/{task_id}",
                remove_unused_columns=False,
                dataset_kwargs={"skip_prepare_dataset": True},
                dataset_num_proc=4,
                lr_scheduler_type="cosine",  # linear
                max_seq_length=2048,
                report_to="none",
            ),
        )

        print("[TRAINING] Starting training...")
        trainer.add_callback(ProgressCallback(task_id, trainer.args.max_steps))
        trainer.train()

        print("[TRAINING COMPLETE] Training completed successfully.")
        stats = print_training_summary(trainer)
        log_history = trainer.state.log_history

        print("[SAVING MODEL] Saving model and tokenizer.")
        task_path = f"outputs/{task_id}"
        model.save_pretrained(
            task_path,
            safe_serialization=True,
            save_adapter=True,  # Critical for PEFT
        )
        tokenizer.save_pretrained(task_path)

        task_status[task_id] = {
            "status": "COMPLETED",
            "progress": 100,
            "error": None,
            "metrics": stats,
            "log_history": log_history,
        }
        trained_models[task_id] = (model, tokenizer)

    except Exception as e:
        task_status[task_id] = {"status": "FAILED", "progress": 0, "error": str(e)}


def train_model_with_goal(
    task_id: str, model_name: str, dataset_id: str, goal_type: str, target: str
):
    if model_name not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail="Invalid model name")

    try:
        config = load_model_config(model_name, goal_type, target)

        print(f"[TRAIN START] Task ID: {task_id}")
        print(
            f"[TRAIN INFO] Loading config for model: {model_name}, goal: {goal_type}, target: {target}"
        )
        print("[TRAIN CONFIG] Hyperparameters loaded:")
        print(config)

        model, tokenizer = FastVisionModel.from_pretrained(
            model_name, load_in_4bit=True, use_gradient_checkpointing="unsloth"
        )

        model = FastVisionModel.get_peft_model(
            model,
            finetune_vision_layers=False,
            finetune_language_layers=True,
            finetune_attention_modules=True,
            finetune_mlp_modules=True,
            r=16,
            lora_alpha=16,
            lora_dropout=0,
            bias="none",
            random_state=3407,
        )

        print("[MODEL INIT] Model and tokenizer loaded successfully.")

        train_dataset = get_custom_dataset(json_file_path, root_folder)

        FastVisionModel.for_training(model)

        trainer = SFTTrainer(
            model=model,
            tokenizer=tokenizer,
            data_collator=UnslothVisionDataCollator(model, tokenizer),
            train_dataset=train_dataset,
            args=SFTConfig(
                per_device_train_batch_size=config["batch_size"],
                gradient_accumulation_steps=4,
                max_steps=config["epochs"],
                learning_rate=config["learning_rate"],
                fp16=not is_bf16_supported() if config["mixed_precision"] else False,
                bf16=is_bf16_supported() if config["mixed_precision"] else False,
                logging_steps=1,
                optim=(
                    "adamw_8bit"
                    if "8bit" in config["optimizer"].lower()
                    else "adamw_torch"
                ),
                output_dir=f"outputs/{task_id}",
                remove_unused_columns=False,
                dataset_kwargs={"skip_prepare_dataset": True},
                dataset_num_proc=4,
                max_seq_length=config["sequence_length"],
                report_to="none",
            ),
        )

        print("[TRAINING] Starting training with selected config...")

        trainer.add_callback(ProgressCallback(task_id, trainer.args.max_steps))
        trainer.train()

        stats = print_training_summary(trainer)
        print("[TRAINING COMPLETE] Training completed successfully.")

        task_status[task_id] = {
            "status": "COMPLETED",
            "progress": 100,
            "error": None,
            "metrics": stats,
        }
        trained_models[task_id] = (model, tokenizer)

    except Exception as e:
        print("[ERROR] Training failed with error:")
        traceback.print_exc()
        task_status[task_id] = {"status": "FAILED", "progress": 0, "error": str(e)}
        raise HTTPException(status_code=500, detail="Training failed")
