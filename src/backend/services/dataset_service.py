import asyncio
import base64
import json
import logging
import os
import time
import zipfile
from io import BytesIO
from typing import Any, Dict, Optional

import google.generativeai as genai
import requests
from fastapi import HTTPException
from schemas.models import CaptionResponse
from utils.image_utils import encode_image

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

MAX_RETRIES = 3
SITE_URL = "<YOUR_SITE_URL>"
SITE_NAME = "<YOUR_SITE_NAME>"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
# root_folder = "datasets/CarDataset"
# json_file_path = "jsons/car_damage_data.json"

auto_annotation_status: Dict[str, Any] = {
    "running": False,
    "processed": 0,
    "failed": 0,
    "current_image": None,
    "total_images": 0,
    "errors": [],
}

DEFAULT_PROMPT = (
    "Describe a car's condition in one paragraph for a car damage dataset, based on the provided image. "
    "If visible damage exists, detail the type, the specific parts affected, the severity, and notable aspects like "
    "the damage location. If no damage is visible, state that clearly and include the car’s "
    "overall condition and any relevant observations. Ensure the description is clear, precise, and avoids assumptions "
    "beyond the image content. Do not include introductory phrases like 'Here is a description,' 'Based on the image,' "
    "'This image shows,' or any reference to the image itself and statements like 'further inspection is needed'; "
    "focus solely on the car's state in a direct, standalone manner."
)

caption_workflow_state = {
    "custom_prompt": DEFAULT_PROMPT,
    "current_job": None,
    "progress": {"total": 0, "processed": 0, "failed": 0, "errors": []},
}


def load_existing_data(file_path: str):
    json_file_path = os.path.join("jsons", f"{file_path}.json")
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
                "Describe a car's condition in one paragraph for a car damage dataset, based on the provided image. "
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


def get_all_images(dataset_path):
    image_extensions = (".jpg", ".jpeg", ".png")
    existing_data = load_existing_data(dataset_path)
    existing_paths = {entry["image"] for entry in existing_data}
    image_files = []
    dataset_path = os.path.join("datasets", dataset_path)
    for folder_name, _, files in os.walk(dataset_path):
        for file in files:
            if file.lower().endswith(image_extensions):
                image_path = os.path.join(folder_name, file)
                relative_path = os.path.relpath(image_path, dataset_path).replace(
                    "\\", "/"
                )
                if relative_path not in existing_paths:
                    image_files.append((image_path, relative_path))
    return image_files


async def auto_annotate_task(
    dataset_path: str, api_key: str, api_type: str, model: str
):
    global auto_annotation_status
    try:
        auto_annotation_status["running"] = True
        image_files = get_all_images(dataset_path)
        auto_annotation_status["total_images"] = len(image_files)

        logger.info(f"Starting auto-annotation of {len(image_files)} images")

        while image_files:
            image_path, relative_path = image_files[0]
            auto_annotation_status["current_image"] = relative_path

            try:
                result = process_image(
                    image_path, relative_path, api_key, api_type, model
                )
                if result:
                    existing_data = load_existing_data(dataset_path)
                    existing_data.append(
                        {"image": relative_path, "caption": result.caption}
                    )
                    json_file_path = os.path.join("jsons", dataset_path)
                    with open(json_file_path, "w") as f:
                        json.dump(existing_data, f)
                    auto_annotation_status["processed"] += 1
                    logger.info(f"Processed {relative_path} successfully")
                else:
                    auto_annotation_status["failed"] += 1
                    logger.warning(f"Failed to process {relative_path}")
            except Exception as e:
                auto_annotation_status["failed"] += 1
                error_msg = f"{relative_path}: {str(e)}"
                auto_annotation_status["errors"].append(error_msg)
                logger.error(error_msg)

            # Remove processed image from queue
            image_files = get_all_images(dataset_path)
            await asyncio.sleep(1)

        logger.info("Auto-annotation completed successfully")
    finally:
        auto_annotation_status.update(
            {
                "running": False,
                "current_image": None,
            }
        )
        logger.info("Auto-annotation task has ended")


def process_image_with_prompt(
    image_path: str,
    relative_path: str,
    prompt: str,
    api_key: str,
    model: str = "google/gemma-3-12b-it:free",
    max_retries: int = 3,
) -> Optional[str]:
    for attempt in range(max_retries):
        try:
            # Encode image to base64
            image_base64 = encode_image(image_path)

            # Build the API request payload
            payload = {
                "model": model,
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

            # Set up headers with dynamic API key
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": SITE_URL,
                "X-Title": SITE_NAME,
            }

            # Make the API request
            response = requests.post(
                OPENROUTER_URL, headers=headers, data=json.dumps(payload), timeout=30
            )
            response.raise_for_status()

            # Extract and return the caption
            result = response.json()
            return result["choices"][0]["message"]["content"]

        except Exception as e:
            logging.error(f"Attempt {attempt+1} failed for {relative_path}: {str(e)}")
            if attempt == max_retries - 1:
                return None
            time.sleep(2**attempt)  # Exponential backoff

    return None
