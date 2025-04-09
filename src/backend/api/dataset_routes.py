import json
import os
import shutil
import zipfile
from io import BytesIO

from fastapi import APIRouter, File, HTTPException, UploadFile, logger
from fastapi.responses import FileResponse, StreamingResponse

from services.dataset_service import get_all_images, process_image
from schemas.models import *

router = APIRouter()

json_file_path = "car_damage_data.json"
root_folder = "CarDataset"

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


def save_json(data):
    with open(json_file_path, "w") as json_file:
        json.dump(data, json_file, indent=4)
    logger.info(f"JSON updated at {json_file_path}")


@router.post("/upload-image-folder")
async def upload_image_folder(file: UploadFile = File(...)):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="File must be a ZIP file")
    upload_dir = "CarDataset"
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    os.makedirs(upload_dir)
    zip_path = os.path.join(upload_dir, "uploaded.zip")
    try:
        with open(zip_path, "wb") as buffer:
            while True:
                chunk = await file.read(8192)
                if not chunk:
                    break
                buffer.write(chunk)
        shutil.unpack_archive(zip_path, upload_dir)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        os.remove(zip_path)
    return {"message": "Image folder uploaded successfully"}


@router.get("/get-next-image")
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


@router.post("/save-caption")
async def save_caption(request: CaptionRequest):
    existing_data = []
    if os.path.exists("car_damage_data.json"):
        with open("car_damage_data.json", "r") as f:
            existing_data = json.load(f)
    existing_data.append({"image": request.image_path, "caption": request.caption})
    with open("car_damage_data.json", "w") as f:
        json.dump(existing_data, f)
    return {"message": "Caption saved successfully"}


@router.get("/download-dataset")
async def download_dataset():
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as zip_file:
        if os.path.exists("car_damage_data.json"):
            zip_file.write("car_damage_data.json")
        for root, _, files in os.walk("CarDataset"):
            for file in files:
                zip_file.write(os.path.join(root, file))
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=dataset.zip"},
    )

@router.get("/images/{filename:path}")
async def serve_image(filename: str):
    file_path = os.path.join(root_folder, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)