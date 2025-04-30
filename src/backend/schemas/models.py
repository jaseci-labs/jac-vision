from typing import List, Optional

from fastapi import Depends, HTTPException, UploadFile
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def get_api_key(api_key: str = Depends(api_key_header)):
    if not api_key:
        raise HTTPException(status_code=401, detail="API key is required")
    return api_key


class BaseDatasetRequest(BaseModel):
    dataset_path: str
    api_key: str = Depends(get_api_key)
    api_type: str = "openrouter"
    model: str = "google/gemma-3-12b-it:free"


class FineTuningRequest(BaseModel):
    model_name: str
    dataset_path: str
    app_name: str


class InferenceRequest(BaseModel):
    app_name: str


class SaveModelRequest(BaseModel):
    task_id: str
    app_name: str
    hf_username: str
    hf_token: str


class GGUFSaveRequest(BaseModel):
    task_id: str
    app_name: str
    quant_method: str = "q4_k_m"
    output_dir: str = "gguf_models"


class GoalTrainingRequest(BaseModel):
    model_name: str
    goal_type: str  # "accuracy" or "compute"
    target: str  # e.g., '85%' or '24GB'
    dataset_path: str
    app_name: str


class VQARequest(BaseModel):
    model: str
    image: UploadFile
    question: str
    api_key: str
    api_type: str = "gemini"


class CaptionRequest(BaseModel):
    caption: str
    image_path: str
    dataset_path: str


class CaptionResponse(BaseModel):
    image: str
    caption: str


class DownloadModelRequest(BaseModel):
    model: str
    token: Optional[str] = None


class CheckModelAccessRequest(BaseModel):
    model: str
    token: Optional[str] = None


class DeleteModelRequest(BaseModel):
    model: str


class ChatbotRequest(BaseModel):
    message: str
    api_key: str
    task_type: str = "general"
    param_range_min: float = 3.0
    param_range_max: float = 7.0
    hardware_gpu_memory: Optional[float] = None
    preference: Optional[str] = None


class GetNextImageResponse(BaseModel):
    image_path: str
    caption: str
    total: int


class AutoAnnotateRequest(BaseModel):
    api_key: str
    api_type: str
    model: str = "google/gemma-3-12b-it:free"


class PromptRequest(BaseModel):
    prompt: str


class PreviewResponse(BaseModel):
    image_path: str
    caption: str
    prompt_used: str


class AdaptFineTuningRequest(BaseModel):
    model_name: str
    dataset_path: str
    app_name: str
    batch_size: Optional[int] = None
    learning_rate: Optional[float] = None
    epochs: Optional[int] = None
