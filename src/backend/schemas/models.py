from typing import List, Optional

from fastapi import UploadFile
from pydantic import BaseModel, Field


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
    model: Optional[str] = None
    image: Optional[UploadFile] = None
    question: str
    api_key: Optional[str] = None
    api_type: Optional[str] = None


class CaptionRequest(BaseModel):
    caption: str
    image_path: str


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
