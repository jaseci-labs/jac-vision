import os
from datetime import datetime

import pandas as pd


def save_training_log(model_name, config, metrics):
    log_data = {
        "model": model_name,
        "batch_size": config["batch_size"],
        "learning_rate": config["learning_rate"],
        "epochs": config["epochs"],
        "peak_memory_gb": metrics.get("peak_memory_gb", 0),
        "training_time": metrics.get("train_runtime_minutes", 0),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

    print(f"[LOG DATA]: {log_data}")

    log_file = os.path.join("src/backend/configs", "adapt_training_logs.xlsx")

    if not os.path.exists(log_file):
        df = pd.DataFrame(columns=log_data.keys())
        df.to_excel(log_file, index=False)

        print(f"Training log file created at {log_file}.")

    try:
        if os.path.exists(log_file):
            df = pd.read_excel(log_file)
        else:
            df = pd.DataFrame(columns=log_data.keys())

        df = pd.concat([df, pd.DataFrame([log_data])], ignore_index=True)
        df.to_excel(log_file, index=False)

        print(f"Training log saved successfully to {log_file}.")
    except Exception as e:
        print(f"Failed to save training log: {str(e)}")


# Test data
test_model = "unsloth/Llama-3.2-11B-Vision-bnb-4bit"

test_config = {"batch_size": 8, "learning_rate": 2e-5, "epochs": 10}
test_metrics = {"peak_memory_gb": 12.3, "train_runtime_minutes": 45.6}

# Run test
print("Starting test...")
save_training_log(model_name=test_model, config=test_config, metrics=test_metrics)

# Verify output
try:
    log_path = "src/backend/configs/adapt_training_logs.xlsx"
    df = pd.read_excel(log_path, engine="openpyxl")
    print("\nLatest log entry:")
    print(df.tail(1).to_string(index=False))
    print("\nTest successful! Log entry added.")
except Exception as e:
    print(f"\nTest failed: {str(e)}")
    print("Make sure you have:")
    print("1. Installed dependencies: pip install pandas openpyxl")
    print("2. Correct directory structure: src/backend/configs/")
