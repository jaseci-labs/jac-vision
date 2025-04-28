import difflib
import os

import pandas as pd

CONFIG_DIR = "configs"
default_configs = {
    "unsloth/Pixtral-12B-2409": {
        "batch_size": 4,
        "learning_rate": 2e-5,
        "epochs": 10,
        "optimizer": "AdamW",
        "mixed_precision": True,
        "sequence_length": 2048,
    },
    "unsloth/Llama-3.2-11B-Vision-bnb-4bit": {
        "batch_size": 4,
        "learning_rate": 1e-5,
        "epochs": 12,
        "optimizer": "AdamW",
        "mixed_precision": True,
        "sequence_length": 3000,
    },
    "unsloth/Qwen2-VL-7B-Instruct-bnb-4bit": {
        "batch_size": 8,
        "learning_rate": 3e-4,
        "epochs": 8,
        "optimizer": "AdamW",
        "mixed_precision": False,
        "sequence_length": 2048,
    },
}

adaptive_configs = {
    "unsloth/Llama-3.2-11B-Vision-bnb-4bit": {
        "batch_size": 4,
        "learning_rate": 2e-5,
        "epochs": 10,
    },
    "unsloth/Qwen2-VL-7B-Instruct-bnb-4bit": {
        "batch_size": 8,
        "learning_rate": 3e-4,
        "epochs": 8,
    },
    "unsloth/Pixtral-12B-2409": {
        "batch_size": 4,
        "learning_rate": 2e-5,
        "epochs": 10,
    },
}


def get_adaptive_config(model_name: str) -> dict:
    return adaptive_configs.get(model_name, {})


def load_model_config(model_name: str, goal_type: str, target: str) -> dict:
    filename_map = {
        "unsloth/Llama-3.2-11B-Vision-bnb-4bit": "LLaMA_Configs.csv",
        "unsloth/Pixtral-12B-2409": "Pixtral_Configs.csv",
        "unsloth/Qwen2-VL-7B-Instruct-bnb-4bit": "Qwen_Configs.csv",
    }
    csv_file = filename_map.get(model_name)
    if not csv_file:
        raise ValueError(f"No config for {model_name}")
    path = os.path.join(CONFIG_DIR, csv_file)
    if not os.path.exists(path):
        return default_configs.get(model_name)
    df = pd.read_csv(path)
    filtered_df = df[df["goal_type"].str.lower() == goal_type.lower()]
    available_targets = filtered_df["target"].astype(str).tolist()
    match = filtered_df[
        filtered_df["target"].astype(str).str.lower() == str(target).lower()
    ]
    if match.empty:
        closest = difflib.get_close_matches(str(target), available_targets, n=1)
        if closest:
            match = filtered_df[
                filtered_df["target"].astype(str).str.lower() == str(closest[0]).lower()
            ]
        else:
            return default_configs.get(model_name)
    row = match.iloc[0]
    return {
        "batch_size": int(row["batch_size"]),
        "learning_rate": float(row["learning_rate"]),
        "epochs": int(row["epochs"]),
        "optimizer": row["optimizer"],
        "mixed_precision": row["mixed_precision"] == "Yes",
        "sequence_length": int(row["sequence_length"]),
    }
