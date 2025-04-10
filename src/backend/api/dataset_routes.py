import json
import os
import shutil
import zipfile
from io import BytesIO

from fastapi import APIRouter, File, HTTPException, UploadFile, logger
from fastapi.responses import FileResponse, StreamingResponse

from services.dataset_service import get_all_images, load_existing_data, process_image
from schemas.models import *

router = APIRouter()

json_file_path = "jsons/car_damage_data.json"
root_folder = "datasets/CarDataset"

def save_json(data):
    with open(json_file_path, "w") as json_file:
        json.dump(data, json_file, indent=4)
    logger.info(f"JSON updated at {json_file_path}")


@router.post("/upload-image-folder")
async def upload_image_folder(file: UploadFile = File(...)):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="File must be a ZIP file")
    upload_dir = "datasets/CarDataset"
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
    if os.path.exists(json_file_path):
        with open(json_file_path, "r") as f:
            existing_data = json.load(f)
    existing_data.append({"image": request.image_path, "caption": request.caption})
    with open(json_file_path, "w") as f:
        json.dump(existing_data, f)
    return {"message": "Caption saved successfully"}


@router.get("/download-dataset")
async def download_dataset():
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as zip_file:
        if os.path.exists(json_file_path):
            zip_file.write(json_file_path)
        for root, _, files in os.walk("datasets/CarDataset"):
            for file in files:
                zip_file.write(os.path.join(root, file))
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=dataset.zip"},
    )

@router.get("/download-json")
async def download_json():
    if not os.path.exists(json_file_path):
        raise HTTPException(status_code=404, detail="JSON file not found")
    return FileResponse(
        path=json_file_path,
        filename=json_file_path,
        media_type="application/json"
    )

@router.get("/images/{filename:path}")
async def serve_image(filename: str):
    file_path = os.path.join(root_folder, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

@router.get("/get-json")
async def get_json():
    return {"data": load_existing_data()}

@router.delete("/clear-data")
async def clear_data():
    if os.path.exists(json_file_path):
        os.remove(json_file_path)
    if os.path.exists(root_folder):
        shutil.rmtree(root_folder)
        os.makedirs(root_folder)
    return {"message": "All data cleared successfully"}
