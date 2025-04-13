import json
import logging
import os
import shutil
import zipfile
from io import BytesIO

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, Form
from fastapi.responses import FileResponse, StreamingResponse
from schemas.models import AutoAnnotateRequest, CaptionRequest
from services.dataset_service import auto_annotate_task, get_all_images, load_existing_data, process_image, auto_annotation_status

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter()

# json_file_path = "jsons/car_damage_data.json"
# root_folder = "datasets/CarDataset"

def save_json(json_file_name, data):
    if not os.path.exists(os.path.dirname(json_file_name)):
        os.makedirs(os.path.dirname(json_file_name))
    json_file_path = os.path.join("jsons", json_file_name)
    with open(json_file_path, "w") as json_file:
        json.dump(data, json_file, indent=4)
    logger.info(f"JSON updated at {json_file_path}")


@router.post("/upload-image-folder")
async def upload_image_folder(file: UploadFile = File(...), folder_name: str = Form(...)):
    safe_folder_name = folder_name.strip().lower().replace(" ", "_")

    if safe_folder_name == "":
        raise HTTPException(status_code=400, detail="Folder name cannot be empty")
    elif not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="File must be a ZIP file")

    upload_dir = os.path.join("datasets", safe_folder_name)
    if os.path.exists(upload_dir):
        raise HTTPException(status_code=400, detail="Folder already exists")
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
        if os.path.exists(zip_path):
            os.remove(zip_path)
    return {
        "message": "Image folder uploaded successfully",
        "folder_name": safe_folder_name,
        }


@router.get("/get-next-image")
async def get_next_image(
    dataset_path: str,
    api_key: str = "",
    api_type: str = "openrouter",
    model: str = "google/gemma-3-12b-it:free",
):
    if not api_key:
        raise HTTPException(status_code=400, detail="API key is required")
    image_files = get_all_images(dataset_path)
    if not image_files:
        return {"done": True, "message": "All images have been processed!"}
    image_path, relative_path = image_files[0]
    image_data = process_image(image_path, relative_path, api_key, api_type, model)
    if image_data:
        return {
            "image_path": relative_path,
            "caption": image_data.caption,
            "total": len(image_files),
        }
    raise HTTPException(status_code=500, detail="Failed to process image")


@router.post("/save-caption")
async def save_caption(request: CaptionRequest, file_path: str):
    existing_data = []
    json_file_path = os.path.join("jsons", file_path)
    if os.path.exists(json_file_path):
        with open(json_file_path, "r") as f:
            existing_data = json.load(f)
    existing_data.append({"image": request.image_path, "caption": request.caption})
    with open(json_file_path, "w") as f:
        json.dump(existing_data, f)
    return {"message": "Caption saved successfully"}


@router.get("/download-dataset")
async def download_dataset(file_path: str):
    json_file_path = os.path.join("jsons", file_path)
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
async def download_json(file_path: str):
    json_file_path = os.path.join("jsons", file_path)
    if not os.path.exists(json_file_path):
        raise HTTPException(status_code=404, detail="JSON file not found")
    return FileResponse(
        path=json_file_path, filename=json_file_path, media_type="application/json"
    )


@router.get("/images/{filename:path}")
async def serve_image(filename: str, file_path: str = ""):
    root_folder = os.path.join("datasets", file_path)
    file_path = os.path.join(root_folder, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)


@router.get("/get-json")
async def get_json():
    return {"data": load_existing_data()}


@router.delete("/clear-data")
async def clear_data(file_path: str = ""):
    root_folder = os.path.join("datasets", file_path)
    json_file_path = os.path.join("jsons", file_path)
    if os.path.exists(json_file_path):
        os.remove(json_file_path)
    if os.path.exists(root_folder):
        shutil.rmtree(root_folder)
        os.makedirs(root_folder)
    return {"message": "All data cleared successfully"}

@router.post("/auto-annotate")
async def start_auto_annotate(
    request: AutoAnnotateRequest,
    background_tasks: BackgroundTasks
):
    if auto_annotation_status["running"]:
        raise HTTPException(400, "Annotation already in progress")

    # Reset status
    auto_annotation_status.update({
        "processed": 0,
        "failed": 0,
        "errors": [],
        "total_images": 0,
    })

    background_tasks.add_task(
        auto_annotate_task,
        request.api_key,
        request.api_type,
        request.model
    )
    return {"message": "Auto annotation started"}

@router.get("/auto-annotate/status")
async def get_annotation_status():
    return {
        "status": "running" if auto_annotation_status["running"] else "idle",
        "progress": {
            "processed": auto_annotation_status["processed"],
            "failed": auto_annotation_status["failed"],
            "total": auto_annotation_status["total_images"],
            "percentage": round(
                (auto_annotation_status["processed"] + auto_annotation_status["failed"]) /
                max(auto_annotation_status["total_images"], 1) * 100,
                2
            ) if auto_annotation_status["total_images"] > 0 else 0,
        },
        "current_image": auto_annotation_status["current_image"],
        "errors": auto_annotation_status["errors"][-5:]  # Last 5 errors
    }
