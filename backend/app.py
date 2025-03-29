from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from PIL import Image
import psutil
import requests
import logging
import google.generativeai as genai
import base64
from io import BytesIO
import sqlite3
from datetime import datetime
import shutil
import openai
from transformers import AutoModelForCausalLM, AutoProcessor, Qwen2VLForConditionalGeneration, Qwen2ForCausalLM
import torch
from huggingface_hub import snapshot_download, HfApi
from pydantic import BaseModel, Field
import json
from typing import Optional, List
import zipfile  # Added for ZIP file creation
import google.generativeai as genai

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI()

# Add CORS middleware to allow requests from the frontend (http://localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware to log raw request details for debugging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.debug(f"Request path: {request.url.path}")
    logger.debug(f"Request headers: {request.headers}")
    if request.method == "POST" and "multipart/form-data" in request.headers.get("content-type", ""):
        content_length = request.headers.get("content-length", "unknown")
        logger.debug(f"Content-Length: {content_length}")
    response = await call_next(request)
    return response

# Initialize SQLite database for VQA history
def init_db():
    conn = sqlite3.connect('vqa_history.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS vqa_history
                 (id INTEGER PRIMARY KEY AUTOINCREMENT, image_base64 TEXT, question TEXT, answer TEXT, timestamp TEXT)''')
    conn.commit()
    conn.close()

init_db()

# Configuration for image captioning
root_folder = "CarData"
json_file_path = "car_damage_data.json"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")  # Load from environment variable
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
SITE_URL = "<YOUR_SITE_URL>"
SITE_NAME = "<YOUR_SITE_NAME>"
API_TIMEOUT = 60
MAX_RETRIES = 3
RETRY_DELAY = 10
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB limit for uploads

# Ensure the CarData folder exists
if not os.path.exists(root_folder):
    os.makedirs(root_folder)

# Pydantic models for request validation
class FineTuneRequest(BaseModel):
    model: str = Field(..., min_length=1)
    dataset: str = Field(..., min_length=1)

class DownloadModelRequest(BaseModel):
    model: str = Field(..., min_length=1)
    token: str = Field(None, min_length=1)

class CheckModelAccessRequest(BaseModel):
    model: str = Field(..., min_length=1)
    token: str = Field(None, min_length=1)

class DeleteModelRequest(BaseModel):
    model: str = Field(..., min_length=1)

class CaptionRequest(BaseModel):
    caption: str
    image_path: str

class CaptionResponse(BaseModel):
    image: str
    caption: str

class GetNextImageResponse(BaseModel):
    image_path: str
    caption: str
    total: int

# Utility functions for image captioning
def load_existing_data():
    if os.path.exists(json_file_path):
        try:
            with open(json_file_path, "r") as file:
                content = file.read().strip()
                return json.loads(content) if content else []
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON in {json_file_path}. Starting with an empty list.")
            return []
    return []

def save_json(data):
    with open(json_file_path, "w") as json_file:
        json.dump(data, json_file, indent=4)
    logger.info(f"JSON updated at {json_file_path}")

def encode_image(image_path: str) -> str:
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode("utf-8")

def process_image(image_path: str, relative_path: str, api_key: str, api_type: str, model: str = "google/gemma-3-12b-it:free") -> Optional[CaptionResponse]:
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
                        {"role": "user", "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                        ]}
                    ]
                }
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": SITE_URL,
                    "X-Title": SITE_NAME
                }
                response = requests.post(OPENROUTER_URL, headers=headers, data=json.dumps(payload))
                response.raise_for_status()
                result = response.json()
                return CaptionResponse(image=relative_path, caption=result["choices"][0]["message"]["content"])
            elif api_type.lower() == "openai":
                OPENAI_URL = "https://api.openai.com/v1/chat/completions"
                payload = {
                    "model": "gpt-4-vision-preview",
                    "messages": [
                        {"role": "user", "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}}
                        ]}
                    ],
                    "max_tokens": 300
                }
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                response = requests.post(OPENAI_URL, headers=headers, data=json.dumps(payload))
                response.raise_for_status()
                result = response.json()
                return CaptionResponse(image=relative_path, caption=result["choices"][0]["message"]["content"])
            elif api_type.lower() == "gemini":
                genai.configure(api_key=api_key)
                model_gemini = genai.GenerativeModel('gemini-1.5-flash')
                response = model_gemini.generate_content([
                    {"role": "user", "parts": [
                        {"text": prompt},
                        {"inline_data": {"mime_type": "image/jpeg", "data": image_base64}}
                    ]}
                ])
                return CaptionResponse(image=relative_path, caption=response.text)
            else:
                raise HTTPException(status_code=400, detail=f"API type {api_type} not supported")
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
                relative_path = os.path.relpath(image_path, root_folder).replace("\\", "/")
                if relative_path not in existing_paths:
                    image_files.append((image_path, relative_path))
    return image_files

# Existing endpoints
@app.post("/finetune")
async def finetune(request: FineTuneRequest):
    model_name = request.model
    dataset_name = request.dataset
    # Verify the model exists
    model_path = os.path.join("models", model_name)
    if not os.path.exists(model_path):
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
    # Load the dataset
    try:
        dataset = load_dataset(dataset_name)
        train_dataset = dataset["train"]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to load dataset {dataset_name}: {str(e)}")
    # Load the model and processor
    try:
        model = AutoModelForVisualQuestionAnswering.from_pretrained(model_path)
        processor = AutoProcessor.from_pretrained(model_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load model {model_name}: {str(e)}")
    # Preprocess the dataset (example for VQA)
    def preprocess_function(examples):
        inputs = processor(
            images=examples["image"],
            text=examples["question"],
            return_tensors="pt",
            padding=True,
            truncation=True
        )
        inputs["labels"] = examples["answer"]
        return inputs
    train_dataset = train_dataset.map(preprocess_function, batched=True)
    # Define training arguments
    training_args = TrainingArguments(
        output_dir=f"./finetuned_{model_name}",
        num_train_epochs=3,
        per_device_train_batch_size=8,
        save_steps=10_000,
        save_total_limit=2,
        logging_dir='./logs',
        logging_steps=100,
    )
    # Initialize the trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
    )
    # Start fine-tuning
    try:
        trainer.train()
        trainer.save_model(f"./finetuned_{model_name}")
        return {"message": f"Successfully fine-tuned {model_name} on dataset {dataset_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fine-tune model: {str(e)}")

@app.post('/vqa')
async def vqa(
    model: str = Form(None),
    image: UploadFile = File(None),
    question: str = Form(None),
    api_key: str = Form(None),
    api_type: str = Form(None)
):
    if not question:
        logger.warning("Missing question in /vqa request")
        raise HTTPException(status_code=400, detail="Missing question")
    image_base64 = None
    if image:
        if not image.content_type.startswith('image/'):
            logger.error(f"Invalid content type for uploaded file: {image.content_type}")
            raise HTTPException(status_code=400, detail="Uploaded file must be an image (e.g., JPEG, PNG).")
        try:
            image_content = await image.read()
            logger.debug(f"First 10 bytes of image data: {image_content[:10]}")
            image_obj = Image.open(BytesIO(image_content)).convert('RGB')
            buffered = BytesIO()
            image_obj.save(buffered, format="JPEG")
            image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        except Exception as e:
            logger.error(f"Invalid image file: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid image file. Please upload a valid image.")
    if api_key and api_type:
        if api_type.lower() == 'gemini':
            try:
                genai.configure(api_key=api_key)
                model_gemini = genai.GenerativeModel('gemini-1.5-flash')
                if image_base64:
                    response = model_gemini.generate_content([
                        {"role": "user", "parts": [
                            {"text": question},
                            {"inline_data": {"mime_type": "image/jpeg", "data": image_base64}}
                        ]}
                    ])
                else:
                    response = model_gemini.generate_content([
                        {"role": "user", "parts": [
                            {"text": question}
                        ]}
                    ])
                answer = response.text
            except Exception as e:
                logger.error(f"Error with Gemini API: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error with Gemini API: {str(e)}")
        elif api_type.lower() == 'openai':
            try:
                openai.api_key = api_key
                messages = [{"role": "user", "content": []}]
                if image_base64:
                    messages[0]["content"].append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}})
                messages[0]["content"].append({"type": "text", "text": question})
                response = openai.ChatCompletion.create(
                    model="gpt-4-vision-preview",
                    messages=messages,
                    max_tokens=300
                )
                answer = response.choices[0].message.content
            except Exception as e:
                logger.error(f"Error with OpenAI API: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Error with OpenAI API: {str(e)}")
        else:
            raise HTTPException(status_code=400, detail='Invalid API type. Use "gemini" or "openai".')
    else:
        if not model:
            raise HTTPException(status_code=400, detail="Model name required when not using an API key.")
        try:
            model_dir = f'./finetuned_model/{model.replace("/", "_")}'
            if not os.path.exists(model_dir):
                logger.error(f"Model {model} not found in {model_dir}")
                raise HTTPException(status_code=404, detail=f"Model {model} not found. Please download the model first.")
            if 'qwen2-vl' in model.lower():
                if not image:
                    raise HTTPException(status_code=400, detail="Image is required for Qwen2-VL models.")
                model_obj = Qwen2VLForConditionalGeneration.from_pretrained(model_dir)
                processor = AutoProcessor.from_pretrained(model_dir)
            elif 'qwen' in model.lower():
                if image:
                    raise HTTPException(status_code=400, detail="Qwen2 models do not support image inputs. Use a vision-language model or an API key.")
                model_obj = Qwen2ForCausalLM.from_pretrained(model_dir)
                processor = AutoProcessor.from_pretrained(model_dir)
            else:
                if image:
                    raise HTTPException(status_code=400, detail="This model does not support image inputs. Use a vision-language model or an API key.")
                model_obj = AutoModelForCausalLM.from_pretrained(model_dir)
                processor = AutoProcessor.from_pretrained(model_dir)
            if image:
                inputs = processor(
                    text=question,
                    images=image_obj,
                    return_tensors="pt",
                    padding=True,
                    truncation=True
                )
            else:
                inputs = processor(
                    text=question,
                    return_tensors="pt",
                    padding=True,
                    truncation=True
                )
            with torch.no_grad():
                outputs = model_obj.generate(
                    **inputs,
                    max_new_tokens=50,
                    do_sample=True,
                    temperature=0.7,
                )
            answer = processor.decode(outputs[0], skip_special_tokens=True)
        except Exception as e:
            logger.error(f"Error with local model inference: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error with local model inference: {str(e)}")
    logger.info(f"VQA completed: answer={answer}")
    conn = sqlite3.connect('vqa_history.db')
    c = conn.cursor()
    c.execute('INSERT INTO vqa_history (image_base64, question, answer, timestamp) VALUES (?, ?, ?, ?)',
              (image_base64 if image_base64 else '', question, answer, str(datetime.now())))
    conn.commit()
    conn.close()
    return {"answer": answer}

@app.get('/vqa/history')
async def get_vqa_history():
    try:
        conn = sqlite3.connect('vqa_history.db')
        c = conn.cursor()
        c.execute('SELECT * FROM vqa_history ORDER BY timestamp DESC')
        history = [{'id': row[0], 'image_base64': row[1], 'question': row[2], 'answer': row[3], 'timestamp': row[4]} for row in c.fetchall()]
        conn.close()
        return {"history": history}
    except Exception as e:
        logger.error(f"Error in /vqa/history: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete('/vqa/history/delete/{history_id}')
async def delete_vqa_history(history_id: int):
    try:
        conn = sqlite3.connect('vqa_history.db')
        c = conn.cursor()
        c.execute('DELETE FROM vqa_history WHERE id = ?', (history_id,))
        conn.commit()
        conn.close()
        return {"message": f"History entry {history_id} deleted successfully"}
    except Exception as e:
        logger.error(f"Error in /vqa/history/delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.delete('/vqa/history/clear')
async def clear_vqa_history():
    try:
        conn = sqlite3.connect('vqa_history.db')
        c = conn.cursor()
        c.execute('DELETE FROM vqa_history')
        conn.commit()
        conn.close()
        return {"message": "All VQA history cleared successfully"}
    except Exception as e:
        logger.error(f"Error in /vqa/history/clear: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/models')
async def list_models():
    try:
        models_dir = './finetuned_model'
        if not os.path.exists(models_dir):
            logger.debug("No finetuned models found")
            return {"models": []}
        models = [d for d in os.listdir(models_dir) if os.path.isdir(os.path.join(models_dir, d))]
        logger.debug(f"Found models: {models}")
        return {"models": models}
    except Exception as e:
        logger.error(f"Error in /models: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/search')
async def search(query: str = None, limit: int = 50, offset: int = 0):
    if not query:
        logger.debug("No query provided in /search request")
        return {"models": [], "total": 0}
    query = query.lower()
    logger.debug(f"Searching for models with query: {query}, limit: {limit}, offset: {offset}")
    try:
        response = requests.get(
            f"https://huggingface.co/api/models?search={query}&limit={limit}&offset={offset}&full=True"
        )
        if response.status_code != 200:
            logger.error(f"Failed to fetch models from Hugging Face: {response.status_code} {response.text}")
            raise HTTPException(status_code=502, detail=f"Failed to fetch models from Hugging Face: {response.status_code}")
        models_data = response.json()
        total_models = response.headers.get('X-Total-Count', len(models_data))
        processed_models = []
        for model in models_data:
            model_id = model['id']
            try:
                model_info_response = requests.get(f"https://huggingface.co/api/models/{model_id}")
                if model_info_response.status_code == 200:
                    model_info = model_info_response.json()
                    model_size = "Unknown"
                    if 'lastModified' in model_info and 'siblings' in model_info:
                        total_size = 0
                        for file in model_info.get('siblings', []):
                            if file.get('rfilename', '').endswith(('.safetensors', '.bin')):
                                total_size += 1
                        model_size = f"{total_size} GB" if total_size > 0 else "Unknown"
                    processed_models.append({
                        "id": model_id,
                        "size": model_size,
                        "tags": model_info.get('tags', []),
                        "likes": model_info.get('likes', 0),
                        "downloads": model_info.get('downloads', 0)
                    })
            except Exception as e:
                logger.warning(f"Failed to fetch metadata for {model_id}: {str(e)}")
                processed_models.append({
                    "id": model_id,
                    "size": "Unknown",
                    "tags": model.get('tags', []),
                    "likes": model.get('likes', 0),
                    "downloads": model.get('downloads', 0)
                })
        logger.debug(f"Found {len(processed_models)} models")
        return {"models": processed_models, "total": int(total_models)}
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error while fetching models: {str(e)}")
        raise HTTPException(status_code=502, detail="Network error while fetching models")
    except Exception as e:
        logger.error(f"Error in /search: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get('/system-info')
async def system_info():
    try:
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        timestamp = str(datetime.now())
        logger.debug("Fetched system info")
        return {
            "timestamp": timestamp,
            "cpu_usage_percent": cpu_usage,
            "cpu_usage_label": f"{cpu_usage}%",
            "memory_total_gb": round(memory.total / (1024 ** 3), 2),
            "memory_used_gb": round(memory.used / (1024 ** 3), 2),
            "memory_remaining_gb": round((memory.total - memory.used) / (1024 ** 3), 2),
            "memory_percent": memory.percent,
            "disk_total_gb": round(disk.total / (1024 ** 3), 2),
            "disk_used_gb": round(disk.used / (1024 ** 3), 2),
            "disk_remaining_gb": round((disk.total - disk.used) / (1024 ** 3), 2),
            "disk_percent": disk.percent,
        }
    except Exception as e:
        logger.error(f"Error in /system-info: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/download-model')
async def download_model(request: DownloadModelRequest):
    logger.debug(f"Received request body: {request}")
    logger.debug(f"Model value: {request.model}, Token: {request.token}")
    model_name = request.model
    token = request.token
    if not model_name:
        logger.warning("Missing model name in /download-model request")
        raise HTTPException(status_code=400, detail="Missing model name")
    output_dir = f'./finetuned_model/{model_name.replace("/", "_")}'
    if os.path.exists(output_dir):
        logger.info(f"Model {model_name} already exists at {output_dir}")
        return {"message": f"Model {model_name} already exists"}
    logger.debug(f"Downloading model: {model_name} with token: {token}")
    os.makedirs(output_dir, exist_ok=True)
    try:
        snapshot_download(
            repo_id=model_name,
            local_dir=output_dir,
            local_dir_use_symlinks=False,
            token=token if token else None
        )
        logger.info(f"Model {model_name} downloaded successfully to {output_dir}")
        return {"message": f"Model {model_name} downloaded successfully"}
    except Exception as e:
        if "401 Client Error" in str(e) or "403 Client Error" in str(e):
            model_url = f"https://huggingface.co/{model_name}"
            logger.warning(f"Model {model_name} is restricted or token is invalid.")
            raise HTTPException(
                status_code=403,
                detail={
                    "error": f"Model {model_name} is restricted or your token is invalid. Please request access on Hugging Face or verify your token.",
                    "action": f"Visit {model_url} to request access. Provide your Hugging Face token after approval."
                }
            )
        else:
            logger.error(f"Error downloading model {model_name}: {str(e)}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Error downloading model: {str(e)}")

@app.post('/check-model-access')
async def check_model_access(request: CheckModelAccessRequest):
    model_name = request.model
    token = request.token
    logger.debug(f"Checking access for model: {model_name}, Token: {token}")
    if not model_name:
        logger.warning("Missing model name in /check-model-access request")
        raise HTTPException(status_code=400, detail="Missing model name")
    api = HfApi()
    try:
        model_info = api.model_info(model_name, token=token if token else None)
        logger.info(f"User has access to model {model_name}")
        return {
            "restricted": model_info.gated if hasattr(model_info, 'gated') else False,
            "has_access": True,
            "message": f"You have access to model {model_name}."
        }
    except Exception as e:
        if "401 Client Error" in str(e) or "403 Client Error" in str(e):
            model_url = f"https://huggingface.co/{model_name}"
            logger.warning(f"Model {model_name} is restricted or token is invalid.")
            return {
                "restricted": True,
                "has_access": False,
                "message": f"Model {model_name} is restricted or your token is invalid. Please request access on Hugging Face or verify your token.",
                "action": f"Visit {model_url} to request access, then provide your Hugging Face token."
            }
        else:
            logger.error(f"Error checking model {model_name}: {str(e)}")
            model_url = f"https://huggingface.co/{model_name}"
            return {
                "restricted": True,
                "has_access": False,
                "message": f"Failed to check access for {model_name}: {str(e)}",
                "action": f"Visit {model_url} to request access, then provide your Hugging Face token."
            }

@app.post('/delete-model')
async def delete_model(request: DeleteModelRequest):
    model_name = request.model
    if not model_name:
        logger.warning("Missing model name in /delete-model request")
        raise HTTPException(status_code=400, detail="Missing model name")
    model_dir = f'./finetuned_model/{model_name}'
    if not os.path.exists(model_dir):
        logger.warning(f"Model directory {model_dir} does not exist")
        raise HTTPException(status_code=404, detail=f"Model {model_name} not found")
    shutil.rmtree(model_dir)
    logger.info(f"Model {model_name} deleted successfully from {model_dir}")
    return {"message": f"Model {model_name} deleted successfully"}

# New endpoints for image captioning
@app.post("/upload-image-folder")
async def upload_image_folder(file: UploadFile = File(...)):
    if not file:
        logger.error("No file provided in the request")
        raise HTTPException(status_code=400, detail="No file provided in the request")
    if not file.filename.endswith('.zip'):
        logger.error(f"Invalid file type: {file.filename}. Expected a ZIP file.")
        raise HTTPException(status_code=400, detail="File must be a ZIP file")
    if file.size > MAX_FILE_SIZE:
        logger.error(f"File size {file.size} exceeds maximum limit of {MAX_FILE_SIZE} bytes")
        raise HTTPException(status_code=400, detail=f"File size exceeds maximum limit of {MAX_FILE_SIZE / (1024 * 1024)} MB")
    logger.debug(f"Received file: {file.filename}, Content-Type: {file.content_type}, Size: {file.size}")
    upload_dir = "CarData"
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    os.makedirs(upload_dir)

    zip_path = os.path.join(upload_dir, "uploaded.zip")
    try:
        with open(zip_path, "wb") as buffer:
            total_bytes = 0
            while True:
                chunk = await file.read(8192)  # Read in 8KB chunks
                if not chunk:
                    break
                buffer.write(chunk)
                total_bytes += len(chunk)
            logger.debug(f"Total bytes written: {total_bytes}")
    except Exception as e:
        logger.error(f"Error saving uploaded file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving uploaded file: {str(e)}")

    try:
        shutil.unpack_archive(zip_path, upload_dir)
    except Exception as e:
        logger.error(f"Error extracting ZIP file: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error extracting ZIP file: {str(e)}")
    finally:
        os.remove(zip_path)

    try:
        for item in os.listdir(upload_dir):
            item_path = os.path.join(upload_dir, item)
            if os.path.isdir(item_path) and item != "__MACOSX":
                for sub_item in os.listdir(item_path):
                    shutil.move(os.path.join(item_path, sub_item), upload_dir)
                shutil.rmtree(item_path)
    except Exception as e:
        logger.error(f"Error organizing extracted files: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error organizing extracted files: {str(e)}")

    return {"message": "Image folder uploaded successfully"}

@app.get("/get-next-image")
async def get_next_image(api_key: str = "", api_type: str = "openrouter", model: str = "google/gemma-3-12b-it:free"):
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    image_files = get_all_images()
    if not image_files:
        return {"done": True, "message": "All images have been processed!"}
    image_path, relative_path = image_files[0]
    image_data = process_image(image_path, relative_path, api_key, api_type, model)
    if image_data:
        return {"image_path": relative_path, "caption": image_data.caption, "total": len(image_files)}
    raise HTTPException(status_code=500, detail="Failed to process image")

@app.post("/save-caption")
async def save_caption(request: CaptionRequest):
    caption = request.caption
    image_path = request.image_path

    existing_data = load_existing_data()
    existing_data.append({"image": image_path, "caption": caption})
    save_json(existing_data)

    return {"message": "Caption saved successfully"}

# Serve images from the CarData folder
@app.get("/images/{filename:path}")
async def serve_image(filename: str):
    file_path = os.path.join(root_folder, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

# Existing endpoint to download the JSON file
@app.get("/download-json")
async def download_json():
    if not os.path.exists(json_file_path):
        raise HTTPException(status_code=404, detail="JSON file not found")
    return FileResponse(
        path=json_file_path,
        filename="car_damage_data.json",
        media_type="application/json"
    )

# New endpoint to download the dataset as a ZIP file (Feature 1)
@app.get("/download-dataset")
async def download_dataset():
    existing_data = load_existing_data()
    if not existing_data:
        raise HTTPException(status_code=404, detail="No data available to download")

    # Create a ZIP file in memory
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # Add the JSON file
        zip_file.write(json_file_path, "car_damage_data.json")
        # Add all images referenced in the JSON
        for entry in existing_data:
            image_path = os.path.join(root_folder, entry["image"])
            if os.path.exists(image_path):
                zip_file.write(image_path, f"images/{entry['image']}")

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=car_damage_dataset.zip"}
    )

# New endpoint to preview the JSON data (Feature 2)
@app.get("/get-json")
async def get_json():
    data = load_existing_data()
    return {"data": data}

# New endpoint to clear all data (Feature 3)
@app.delete("/clear-data")
async def clear_data():
    if os.path.exists(json_file_path):
        os.remove(json_file_path)
    if os.path.exists(root_folder):
        shutil.rmtree(root_folder)
        os.makedirs(root_folder)
    return {"message": "All data cleared successfully"}


# Pydantic model for chatbot requests
class ChatbotRequest(BaseModel):
    message: str
    api_key: str
    # Removed api_type since we're using Gemini only

# Utility function for model recommendations
def get_model_recommendations(task: str) -> str:
    recommendations = {
        "vqa": "For Visual Question Answering (VQA), I recommend using a model like 'Qwen/Qwen2-VL-7B-Instruct'. It’s great for tasks involving both images and text. You’ll need to provide a dataset with images and questions.",
        "image_captioning": "For image captioning, a model like 'Salesforce/blip-image-captioning-base' works well. It can generate descriptions for images. Make sure your dataset contains images and corresponding captions.",
        "low_compute_1b": (
            "Here are some 1B parameter models that work well on low-compute devices:\n"
            "1. **Qwen2.5-1.5B-Instruct** (1.54B parameters): Created by Alibaba Cloud, this model is great for tasks like coding, math, and working with over 29 languages, including English and Chinese. It can handle long texts (up to 32,768 tokens).\n"
            "2. **distilbert-base-uncased** (66M parameters, but a good alternative if 1B is too large): A smaller model for text classification tasks, like sorting text into categories.\n"
            "3. **OuteTTS-0.2-500M** (500M parameters, another alternative): A text-to-speech model by OuteAI, useful for generating speech from text.\n"
            "Note: If these models are still too large, you may need to search for smaller models on Hugging Face."
        ),
        "visual_language": (
            "For fine-tuning a visual language model (VLM) for tasks like damage assessment, you need a model that can process both images and text. Since you're looking for a 1B parameter model, here are some recommendations:\n"
            "1. **Salesforce/blip-image-captioning-base** (223M parameters): This model is designed for image captioning, making it a good fit for generating textual descriptions of damage from images. It’s smaller than 1B parameters, which makes it efficient for low-compute devices.\n"
            "2. **openai/clip-vit-base-patch32** (151M parameters): CLIP models are excellent for vision-language tasks, as they can understand both images and text. This model can be fine-tuned for damage assessment by training it to classify or describe damage levels.\n"
            "3. **microsoft/git-base** (124M parameters): This VLM is designed for image captioning and visual question answering. It can be fine-tuned to generate damage descriptions or answer questions about the extent of damage in images.\n"
            "**Dataset Suggestions**:\n"
            "- **Search on Kaggle**: Look for datasets like 'Car Damage Detection' or 'Building Damage Assessment' on Kaggle. These often include images of damaged items with labels.\n"
            "- **Create Your Own Dataset**: Collect images of damaged items (e.g., cars, buildings) and label them with descriptions (e.g., 'minor scratch', 'severe crack'). Tools like Labelbox can help with labeling.\n"
            "**Hardware Note**: These models require at least 4GB of GPU memory for fine-tuning. Ensure your system meets this requirement."
        ),
        "general": "If you’re unsure about your task, a versatile model like 'google/gemma-2-9b-it' can handle a variety of tasks, including text generation and classification. Describe your task, and I can suggest something more specific!"
    }
    return recommendations.get(task.lower(), recommendations["general"])

# Chatbot endpoint
@app.post("/chatbot")
async def chatbot(request: ChatbotRequest):
    message = request.message
    api_key = request.api_key

    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")

    # System prompt to guide the chatbot
    system_prompt = (
        "You are a professional assistant for a model search and fine-tuning application. Your goal is to assist users, including non-technical ones, in finding and downloading machine learning models from Hugging Face. "
        "Provide clear, concise, and professional answers in a structured, point-wise format (e.g., using bullet points or numbered steps) to ensure clarity and ease of understanding. "
        "Avoid technical jargon unless necessary, and explain terms in simple language. "
        "If a user asks for a list of models, provide the answer in a numbered list with brief descriptions of each model, including its purpose and any relevant details (e.g., parameter count, task suitability). "
        "If exact model names or counts are unavailable, guide the user on how to find the information themselves in a step-by-step manner. "
        "You can help with: "
        "1. Recommending models based on the user’s task (e.g., Visual Question Answering, image captioning). "
        "2. Explaining model types (e.g., text-generation, vision-language) in simple terms. "
        "3. Guiding the user through the process of searching and downloading a model. "
        "4. Answering common questions like 'What is a vision-language model?' or 'How do I download a restricted model?' "
        "5. Explaining model sizes (e.g., what does '1B parameters' mean?) and whether a user’s system can handle it. "
        "Always be patient, encouraging, and professional!"
    )

    try:
        genai.configure(api_key=api_key)
        model_gemini = genai.GenerativeModel('gemini-1.5-flash')
        task = "general"
        if "vqa" in message.lower() or "visual question answering" in message.lower():
            task = "vqa"
        elif "image captioning" in message.lower():
            task = "image_captioning"
        elif "1b" in message.lower() or "1 billion" in message.lower():
            task = "low_compute_1b"
        elif "visual language" in message.lower() or "visual luange" in message.lower():
            task = "visual_language"

        recommendation = get_model_recommendations(task)
        enhanced_prompt = f"{message}\n\nIf applicable, include this recommendation in your response: {recommendation}"

        logger.info(f"Sending request to Gemini with prompt: {enhanced_prompt}")
        response = model_gemini.generate_content([
            {"role": "user", "parts": [
                {"text": f"{system_prompt}\n\n{enhanced_prompt}"}
            ]}
        ])
        answer = response.text

        return {"response": answer}
    except Exception as e:
        logger.error(f"Error in chatbot endpoint: {str(e)}")
        if "rate limit" in str(e).lower():
            raise HTTPException(status_code=429, detail="API rate limit exceeded. Please try again later.")
        elif "authentication" in str(e).lower() or "invalid api key" in str(e).lower():
            raise HTTPException(status_code=401, detail="Invalid API key. Please check your API key and try again.")
        else:
            raise HTTPException(status_code=500, detail=f"Error processing chatbot request: {str(e)}")