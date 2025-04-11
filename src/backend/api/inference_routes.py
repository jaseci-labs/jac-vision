from fastapi import APIRouter, UploadFile, File, Form
from services.inference_service import (
    list_finetuned_models,
    load_finetuned_model,
    run_vqa
)

router = APIRouter()

@router.get("/vqa/models")
def get_finetuned_models():
    return list_finetuned_models()

@router.post("/vqa/load")
def load_model(task_id: str):
    return load_finetuned_model(task_id)

@router.post("/vqa/answer")
async def get_vqa_answer(
    question: str = Form(...),
    task_id: str = Form(...),
    image: UploadFile = File(...)
):
    return await run_vqa(task_id, image, question)
