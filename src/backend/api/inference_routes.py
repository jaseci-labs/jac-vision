from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image
from services.inference_service import list_models, load_model, process_vqa

router = APIRouter()


@router.get("/models")
async def get_finetuned_models():
    try:
        return list_models()
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/load-model")
async def load_finetuned_model(app_name: str = Form(...)):
    try:
        load_model(app_name)
        return {"message": f"Model {app_name} loaded successfully"}
    except Exception as e:
        raise HTTPException(500, str(e))


@router.post("/process")
async def process_inference(
    image: UploadFile = File(None),
    question: str = Form(...),
    app_name: str = Form(...),
):
    try:
        image_content = await image.read() if image else None
        image_obj = (
            Image.open(BytesIO(image_content)).convert("RGB") if image_content else None
        )

        result = process_vqa(app_name, image_obj, question)
        return {"answer": result}
    except Exception as e:
        raise HTTPException(500, str(e))
