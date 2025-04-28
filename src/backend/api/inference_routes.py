from io import BytesIO

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from PIL import Image
from services.inference_service import compare_responses, list_models, load_model, process_unfinetuned_vqa, process_vqa

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
        "unsloth/Qwen2-VL-7B-Instruct-bnb-4bit",
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