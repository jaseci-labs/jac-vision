import datetime
import json
import os
import traceback

from datasets import load_dataset
from fastapi import HTTPException
from PIL import Image
import pandas as pd
from services.training_metrics import (
    ProgressCallback,
    compute_metrics,
    print_training_summary,
    task_status,
)
from sklearn.model_selection import train_test_split
from trl import SFTConfig, SFTTrainer
from unsloth import FastVisionModel, is_bf16_supported
from unsloth.trainer import UnslothVisionDataCollator
from utils.config_loader import get_adaptive_config, load_model_config
from utils.dataset_utils import get_custom_dataset

os.environ["UNSLOTH_COMPILED_CACHE"] = "/tmp/unsloth_compiled_cache"
os.environ["UNSLOTH_RETURN_LOGITS"] = "1"

AVAILABLE_MODELS = [
    "unsloth/Llama-3.2-11B-Vision-bnb-4bit",
    "unsloth/Qwen2-VL-2B-Instruct-bnb-4bit",
    "unsloth/Pixtral-12B-2409",
]

trained_models = {}


def retreive_captioned_dataset():
    dataset_dir = "datasets"
    try:
        if not os.path.exists(dataset_dir):
            return HTTPException(
                status_code=404, content={"message": "Dataset directory not found."}
            )
        folder_names = [
            name
            for name in os.listdir(dataset_dir)
            if os.path.isdir(os.path.join(dataset_dir, name))
        ]
        return {"datasets": folder_names}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Dataset loading failed")


def save_training_log(model_name, config, metrics):
    log_data = {
        "model": model_name,
        "batch_size": config["batch_size"],
        "learning_rate": config["learning_rate"],
        "epochs": config["epochs"],
        "peak_memory_gb": metrics.get("peak_memory_gb", 0),
        "training_time": metrics.get("train_runtime_minutes", 0),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    print(f"[LOG DATA]: {log_data}")

    log_file = os.path.join("src/backend/configs", "adapt_training_logs.csv")

    try:
        os.makedirs(os.path.dirname(log_file), exist_ok=True)

        if not os.path.exists(log_file):
            pd.DataFrame([log_data]).to_csv(log_file, index=False)
            print(f"New training log created at {log_file}")
        else:
            pd.DataFrame([log_data]).to_csv(log_file, mode='a', header=False, index=False)
            print(f"Appended to training log at {log_file}")

    except Exception as e:
        print(f"Failed to save training log: {str(e)}")


def train_model(
    model_name: str,
    task_id: str,
    dataset_path: str,
    app_name: str
):
    if model_name not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail="Invalid model name")

    json_file_path = os.path.join("jsons", f"{dataset_path}.json")
    root_folder = os.path.join("datasets", dataset_path)

    if not os.path.exists(json_file_path) or not os.path.exists(root_folder):
        raise HTTPException(status_code=404, detail="Dataset not found")

    task_status[task_id] = {"status": "RUNNING", "progress": 0, "error": None}
    converted_dataset = get_custom_dataset(json_file_path, root_folder)

    try:
        model, tokenizer = FastVisionModel.from_pretrained(
            model_name, load_in_4bit=True, use_gradient_checkpointing="unsloth",
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
            use_rslora=False,
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
                # evaluation_strategy="epoch",
                # per_device_eval_batch_size=2,
                # load_best_model_at_end=True,
                # metric_for_best_model="eval_loss",
            ),
        )

        print("[TRAINING] Starting training...")
        trainer.add_callback(ProgressCallback(task_id, trainer.args.max_steps))
        trainer.train()

        print("[TRAINING COMPLETE] Training completed successfully.")
        stats = print_training_summary(trainer)
        log_history = trainer.state.log_history

        print("[SAVING MODEL] Saving model and tokenizer.")
        task_path = f"outputs/{app_name}"
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
    task_id: str,
    model_name: str,
    dataset_path: str,
    goal_type: str,
    target: str,
    app_name: str,
):

    if model_name not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail="Invalid model name")

    json_file_path = os.path.join("jsons", f"{dataset_path}.json")
    root_folder = os.path.join("datasets", dataset_path)

    if not os.path.exists(json_file_path) or not os.path.exists(root_folder):
        raise HTTPException(status_code=404, detail="Dataset not found")

    task_status[task_id] = {"status": "RUNNING", "progress": 0, "error": None}
    converted_dataset = get_custom_dataset(json_file_path, root_folder)

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
            use_rslora=False,
            loftq_config=None,
        )

        print("[MODEL INIT] Model and tokenizer loaded successfully.")
        train_dataset, eval_dataset = train_test_split(
            converted_dataset, test_size=0.2, random_state=42
        )
        FastVisionModel.for_training(model)

        trainer = SFTTrainer(
            model=model,
            tokenizer=tokenizer,
            data_collator=UnslothVisionDataCollator(model, tokenizer),
            train_dataset=train_dataset,
            eval_dataset=eval_dataset,
            compute_metrics=compute_metrics,
            args=SFTConfig(
                per_device_train_batch_size=config["batch_size"],
                gradient_accumulation_steps=4,
                warmup_steps=5,
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
                output_dir=f"outputs/{app_name}",
                remove_unused_columns=False,
                dataset_kwargs={"skip_prepare_dataset": True},
                dataset_num_proc=4,
                max_seq_length=config["sequence_length"],
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
        task_path = f"outputs/{app_name}"
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
        print("[ERROR] Training failed with error:")
        traceback.print_exc()
        task_status[task_id] = {"status": "FAILED", "progress": 0, "error": str(e)}
        raise HTTPException(status_code=500, detail="Training failed")


def train_adapt_model(
    model_name: str,
    task_id: str,
    dataset_path: str,
    app_name: str,
    batch_size: int = None,
    learning_rate: float = None,
    epochs: int = None,
):
    config = get_adaptive_config(model_name)

    final_config = {
        "batch_size": batch_size or config.get("batch_size", 4),
        "learning_rate": learning_rate or config.get("learning_rate", 2e-5),
        "epochs": epochs or config.get("epochs", 10),
    }

    print(f"[FINAL CONFIG]: {final_config}")

    if model_name not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail="Invalid model name")

    json_file_path = os.path.join("jsons", f"{dataset_path}.json")
    root_folder = os.path.join("datasets", dataset_path)

    if not os.path.exists(json_file_path) or not os.path.exists(root_folder):
        raise HTTPException(status_code=404, detail="Dataset not found")

    task_status[task_id] = {"status": "RUNNING", "progress": 0, "error": None}
    converted_dataset = get_custom_dataset(json_file_path, root_folder)

    try:
        model, tokenizer = FastVisionModel.from_pretrained(
            model_name, load_in_4bit=True, use_gradient_checkpointing="unsloth",
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
            use_rslora=False,
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
                per_device_train_batch_size=final_config["batch_size"],
                gradient_accumulation_steps=4,
                warmup_steps=5,
                max_steps=final_config["epochs"],
                learning_rate=final_config["learning_rate"],
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
                # evaluation_strategy="epoch",
                # per_device_eval_batch_size=2,
                # load_best_model_at_end=True,
                # metric_for_best_model="eval_loss",
            ),
        )

        print("[TRAINING] Starting training...")
        trainer.add_callback(ProgressCallback(task_id, trainer.args.max_steps))
        trainer.train()

        print("[TRAINING COMPLETE] Training completed successfully.")
        stats = print_training_summary(trainer)
        log_history = trainer.state.log_history

        print("[SAVING MODEL] Saving model and tokenizer.")
        task_path = f"outputs/{app_name}"
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

        print("[SAVING TRAINING LOG] Saving training log.")
        print(task_status[task_id]["status"])
        print(task_status[task_id]["metrics"])

        if task_status[task_id]["status"] == "COMPLETED":
            save_training_log(
                model_name,
                final_config,
                task_status[task_id]["metrics"]
            )

    except Exception as e:
        task_status[task_id] = {"status": "FAILED", "progress": 0, "error": str(e)}
