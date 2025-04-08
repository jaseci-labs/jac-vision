import json
import os
import shutil
import zipfile
from io import BytesIO

from fastapi import APIRouter, File, HTTPException, UploadFile, logger
from fastapi.responses import StreamingResponse

from schemas.models import *

router = APIRouter()

json_file_path = "car_damage_data.json"


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
    upload_dir = "CarData"
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
async def save_caption(request: CaptionRequest):
    caption = request.caption
    image_path = request.image_path

    existing_data = load_existing_data()
    existing_data.append({"image": image_path, "caption": caption})
    save_json(existing_data)

    return {"message": "Caption saved successfully"}


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
        for root, _, files in os.walk("CarData"):
            for file in files:
                zip_file.write(os.path.join(root, file))
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=dataset.zip"},
    )
