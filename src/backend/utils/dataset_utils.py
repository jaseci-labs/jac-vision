import json
import os

from PIL import Image

instruction = "You are an expert damage assessment analyzer. Describe accurately what you see in this image."


def convert_to_conversation(sample):
    return {
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": instruction},
                    {"type": "image", "image": sample["image"]},
                ],
            },
            {
                "role": "assistant",
                "content": [{"type": "text", "text": sample["caption"]}],
            },
        ]
    }


def get_custom_dataset(json_file_path, root_folder):
    with open(json_file_path, "r") as f:
        data = json.load(f)

    custom_dataset = []
    for sample in data:
        full_path = os.path.join(root_folder, sample["image"])
        if os.path.exists(full_path):
            try:
                image = Image.open(full_path)
                custom_dataset.append(
                    convert_to_conversation(
                        {"image": image, "caption": sample["caption"]}
                    )
                )
            except Exception as e:
                print(f"[ERROR] Could not load image {full_path}: {e}")
        else:
            print(f"[WARNING] Image not found: {full_path}")
    return custom_dataset
