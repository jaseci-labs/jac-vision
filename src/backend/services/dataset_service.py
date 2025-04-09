import base64
import json
import os
import shutil
import zipfile
from io import BytesIO

import google.generativeai as genai
import requests
from schemas.models import *
from fastapi import HTTPException, logger
from utils.image_utils import encode_image

MAX_RETRIES = 3
SITE_URL = "<YOUR_SITE_URL>"
SITE_NAME = "<YOUR_SITE_NAME>"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
root_folder = "CarDataset"
json_file_path = "car_damage_data.json"


def load_existing_data():
    if os.path.exists(json_file_path):
        try:
            with open(json_file_path, "r") as file:
                content = file.read().strip()
                return json.loads(content) if content else []
        except json.JSONDecodeError:
            logger.warning(
                f"Invalid JSON in {json_file_path}. Starting with an empty list."
            )
            return []
    return []

def process_image(
    image_path: str,
    relative_path: str,
    api_key: str,
    api_type: str,
    model: str = "google/gemma-3-12b-it:free",
) -> Optional[CaptionResponse]:
    for attempt in range(MAX_RETRIES):
        try:
            image_base64 = encode_image(image_path)
            prompt = (
                "Describe a car’s condition in one paragraph for a car damage dataset, based on the provided image. "
                "If visible damage exists, detail the type, the specific parts affected, the severity, and notable aspects like "
                "the damage location. If no damage is visible, state that clearly and include the car’s "
                "overall condition and any relevant observations. Ensure the description is clear, precise, and avoids assumptions "
                "beyond the image content. Do not include introductory phrases like 'Here is a description,' 'Based on the image,' "
                "'This image shows,' or any reference to the image itself and statements like 'further inspection is needed'; focus solely on the car’s state in a direct, standalone manner."
            )

            if api_type.lower() == "openrouter":
                payload = {
                    "model": model,  # Use the model passed from the frontend
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{image_base64}"
                                    },
                                },
                            ],
                        }
                    ],
                }
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": SITE_URL,
                    "X-Title": SITE_NAME,
                }
                response = requests.post(
                    OPENROUTER_URL, headers=headers, data=json.dumps(payload)
                )
                response.raise_for_status()
                result = response.json()
                return CaptionResponse(
                    image=relative_path,
                    caption=result["choices"][0]["message"]["content"],
                )
            elif api_type.lower() == "openai":
                OPENAI_URL = "https://api.openai.com/v1/chat/completions"
                payload = {
                    "model": "gpt-4-vision-preview",
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{image_base64}"
                                    },
                                },
                            ],
                        }
                    ],
                    "max_tokens": 300,
                }
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                }
                response = requests.post(
                    OPENAI_URL, headers=headers, data=json.dumps(payload)
                )
                response.raise_for_status()
                result = response.json()
                return CaptionResponse(
                    image=relative_path,
                    caption=result["choices"][0]["message"]["content"],
                )
            elif api_type.lower() == "gemini":
                genai.configure(api_key=api_key)
                model_gemini = genai.GenerativeModel("gemini-1.5-flash")
                response = model_gemini.generate_content(
                    [
                        {
                            "role": "user",
                            "parts": [
                                {"text": prompt},
                                {
                                    "inline_data": {
                                        "mime_type": "image/jpeg",
                                        "data": image_base64,
                                    }
                                },
                            ],
                        }
                    ]
                )
                return CaptionResponse(image=relative_path, caption=response.text)
            else:
                raise HTTPException(
                    status_code=400, detail=f"API type {api_type} not supported"
                )
        except Exception as e:
            logger.error(f"Error for {relative_path} (attempt {attempt + 1}): {str(e)}")
            if attempt < MAX_RETRIES - 1:
                continue
            return None


def get_all_images():
    image_extensions = (".jpg", ".jpeg", ".png")
    existing_data = load_existing_data()
    existing_paths = {entry["image"] for entry in existing_data}
    image_files = []
    for folder_name, _, files in os.walk(root_folder):
        for file in files:
            if file.lower().endswith(image_extensions):
                image_path = os.path.join(folder_name, file)
                relative_path = os.path.relpath(image_path, root_folder).replace(
                    "\\", "/"
                )
                if relative_path not in existing_paths:
                    image_files.append((image_path, relative_path))
    return image_files


def upload_image_folder(file):
    if not file.filename.endswith(".zip"):
        raise ValueError("Not a ZIP file")
    upload_dir = "CarDataset"
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    os.makedirs(upload_dir)
    zip_path = os.path.join(upload_dir, "uploaded.zip")
    try:
        with open(zip_path, "wb") as buffer:
            while True:
                chunk = file.file.read(8192)
                if not chunk:
                    break
                buffer.write(chunk)
        shutil.unpack_archive(zip_path, upload_dir)
        return True
    except:
        raise
    finally:
        os.remove(zip_path)


def get_next_image(
    api_key: str = "",
    api_type: str = "openrouter",
    model: str = "google/gemma-3-12b-it:free",
):
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    image_files = get_all_images()
    if not image_files:
        return {"done": True, "message": "All images have been processed!"}
    image_path, relative_path = image_files[0]
    image_data = process_image(image_path, relative_path, api_key, api_type, model)
    if image_data:
        return {
            "image_path": relative_path,
            "caption": image_data.caption,
            "total": len(image_files),
        }
    raise HTTPException(status_code=500, detail="Failed to process image")


def save_caption(caption, image_path):
    existing_data = []
    if os.path.exists("car_damage_data.json"):
        with open("car_damage_data.json", "r") as f:
            existing_data = json.load(f)
    existing_data.append({"image": image_path, "caption": caption})
    with open("car_damage_data.json", "w") as f:
        json.dump(existing_data, f)
    return True


def download_dataset():
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as zip_file:
        if os.path.exists("car_damage_data.json"):
            zip_file.write("car_damage_data.json")
        for root, _, files in os.walk("CarDataset"):
            for file in files:
                zip_file.write(os.path.join(root, file))
    buffer.seek(0)
    return buffer
