from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from services.vqa_service import (
    clear_history,
    delete_history_entry,
    get_history,
    process_vqa,
)

from backend.schemas.models import VQARequest

router = APIRouter()


@router.post("/process_vqa")
async def process_vqa_endpoint(
    request: VQARequest,
):
    if not request.question:
        raise HTTPException(status_code=400, detail="Missing question")

    image_content = None
    if request.image:
        if not request.image.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400, detail="Uploaded file must be an image"
            )
        image_content = await request.image.read()

    try:
        result = process_vqa(
            image_content=image_content,
            question=request.question,
            api_key=request.api_key,
            api_type=request.api_type,
            model_name=request.model,
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
