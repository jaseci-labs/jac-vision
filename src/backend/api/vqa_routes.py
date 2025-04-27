from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from services.vqa_service import compare_responses  # New import
from services.vqa_service import process_unfinetuned_vqa  # New import
from services.vqa_service import (clear_history, delete_history_entry,
                                  get_history, process_vqa)

router = APIRouter()


@router.post("/process_vqa")
async def process_vqa_endpoint(
    model: str = Form(None),
    image: UploadFile = File(None),
    question: str = Form(None),
    api_key: str = Form(None),
    api_type: str = Form(None),
):
    if not question:
        raise HTTPException(status_code=400, detail="Missing question")

    image_content = None
    if image:
        if not image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400, detail="Uploaded file must be an image"
            )
        image_content = await image.read()

    try:
        result = process_vqa(
            image_content=image_content,
            question=question,
            api_key=api_key,
            api_type=api_type,
            model_name=model,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_vqa_history():
    try:
        return get_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/delete/{history_id}")
async def delete_history(history_id: int):
    try:
        return delete_history_entry(history_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/clear")
async def clear_vqa_history():
    try:
        return clear_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/process_vqa/unfinetuned")
async def process_unfinetuned_vqa_endpoint(
    model: str = Form(...),
    image: UploadFile = File(None),
    question: str = Form(...),
):
    if not question:
        raise HTTPException(status_code=400, detail="Missing question")
    if model not in [
        "unsloth/Llama-3.2-11B-Vision-bnb-4bit",
        "unsloth/Qwen2-VL-2B-Instruct-bnb-4bit",
        "unsloth/Pixtral-12B-2409",
    ]:
        raise HTTPException(status_code=400, detail="Invalid model name")

    image_content = None
    if image:
        if not image.content_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Uploaded file must be an image")
        image_content = await image.read()

    try:
        result = process_unfinetuned_vqa(
            image_content=image_content,
            question=question,
            model_name=model,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/compare_responses")
async def compare_responses_endpoint(
    question: str = Form(...),
    finetuned_response: str = Form(...),
    unfinetuned_response: str = Form(...),
):
    try:
        comparison = compare_responses(question, finetuned_response, unfinetuned_response)
        return comparison
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))