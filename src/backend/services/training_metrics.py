import torch
from sklearn.metrics import accuracy_score
from transformers import (
    TrainerCallback,
    TrainerControl,
    TrainerState,
    TrainingArguments,
)

task_status = {}


class ProgressCallback(TrainerCallback):
    def __init__(self, task_id: str, total_steps: int):
        self.task_id = task_id
        self.total_steps = total_steps
        self.current_epoch = 0

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

    def on_epoch_end(self, args, state, control, **kwargs):
        train_metrics = {
            "training_loss": state.log_history[-1].get("loss"),
            "training_accuracy": state.log_history[-1].get("train_accuracy"),
        }

        eval_metrics = next(
            (log for log in reversed(state.log_history) if "eval_loss" in log), None
        )

        if eval_metrics:
            task_status[self.task_id]["epoch_metrics"] = {
                "epoch": self.current_epoch,
                "training_loss": train_metrics["training_loss"],
                "training_accuracy": train_metrics["training_accuracy"],
                "validation_loss": eval_metrics.get("eval_loss"),
                "validation_accuracy": eval_metrics.get("eval_accuracy"),
            }

        self.current_epoch += 1


def print_training_summary(trainer):
    # Get initial GPU memory usage
    start_gpu_memory = round(torch.cuda.memory_allocated() / 1024 / 1024 / 1024, 3)
    max_memory = round(
        torch.cuda.get_device_properties(0).total_memory / 1024 / 1024 / 1024, 3
    )

    used_memory = round(torch.cuda.max_memory_reserved() / 1024 / 1024 / 1024, 3)
    used_memory_for_lora = round(used_memory - start_gpu_memory, 3)
    used_percentage = round(used_memory / max_memory * 100, 3)
    lora_percentage = round(used_memory_for_lora / max_memory * 100, 3)

    runtime_seconds = trainer.state.log_history[-1]["train_runtime"]
    runtime_minutes = round(runtime_seconds / 60, 2)

    print(f"TRAINING SUMMARY")
    print(f"Runtime: {runtime_seconds} sec ({runtime_minutes} min)")
    print(f"Peak reserved memory: {used_memory} GB")
    print(f"Memory used for LoRA: {used_memory_for_lora} GB")
    print(f"Memory usage %: {used_percentage}%")
    print(f"LoRA memory %: {lora_percentage}%")

    return {
        "train_runtime_seconds": runtime_seconds,
        "train_runtime_minutes": runtime_minutes,
        "peak_memory_gb": used_memory,
        "lora_memory_gb": used_memory_for_lora,
        "memory_usage_percent": used_percentage,
        "lora_memory_percent": lora_percentage,
    }


def compute_metrics(eval_preds):
    predictions, labels, _ = eval_preds  # Add third element for losses

    if isinstance(predictions, tuple):
        logits = predictions[0]  # Some models return (logits, ...)
    else:
        logits = predictions

    predictions = logits.argmax(axis=-1)
    acc = accuracy_score(labels, predictions)

    return {
        "eval_accuracy": acc,
        "eval_loss": None,  # Add if you need to track loss
    }