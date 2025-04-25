import asyncio
import json
import logging
import os
import shutil
import zipfile
from io import BytesIO

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from schemas.models import (
    AutoAnnotateRequest,
    CaptionRequest,
    PreviewResponse,
    PromptRequest,
)
from services.dataset_service import (
    DEFAULT_PROMPT,
    caption_workflow_state,
    get_all_images,
    load_existing_data,
    process_image,
    process_image_with_prompt,
)

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

router = APIRouter()


def save_json(json_file_name, data):
    if not os.path.exists(os.path.dirname(json_file_name)):
        os.makedirs(os.path.dirname(json_file_name))
    json_file_path = os.path.join("jsons", json_file_name)
    with open(json_file_path, "w") as json_file:
        json.dump(data, json_file, indent=4)
    logger.info(f"JSON updated at {json_file_path}")


@router.post("/upload-image-folder")
async def upload_image_folder(
    file: UploadFile = File(...), folder_name: str = Form(...)
):
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
async def save_caption(request: CaptionRequest):
    existing_data = []
    json_file_path = os.path.join("jsons", f"{request.dataset_path}.json")
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


@router.get("/images/{folder_path:path}/{filename:path}")
async def serve_image(filename: str, folder_path: str = ""):
    file_path = os.path.join("datasets", folder_path, filename)
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


@router.get("/get-default-prompt")
async def get_default_prompt():
    return {"prompt": caption_workflow_state["custom_prompt"]}


@router.post("/set-prompt")
async def set_custom_prompt(request: PromptRequest):
    caption_workflow_state["custom_prompt"] = request.prompt
    return {"message": "Prompt updated successfully"}


@router.get("/show-captioning-preview")
async def preview_captioning(
    file_path: str,
    api_key: str, # Use OpenRouter API key for preview
):
    if not api_key:
        raise HTTPException(400, "API key is required")
    if not file_path:
        raise HTTPException(400, "File path is required")

    print("Starting preview_captioning endpoint")
    image_files = get_all_images(file_path)
    if not image_files:
        raise HTTPException(400, "No images available for preview")

    image_path, relative_path = image_files[0]
    prompt = caption_workflow_state["custom_prompt"] or DEFAULT_PROMPT

    try:
        caption = process_image_with_prompt(
            image_path,
            relative_path,
            prompt,
            api_key=api_key,
        )
        print(f"Preview generated for image: {relative_path}")
        return PreviewResponse(
            image_path=relative_path, caption=caption, prompt_used=prompt
        )
    except Exception as e:
        raise HTTPException(500, f"Preview failed: {str(e)}")


async def auto_caption_task(
    api_key: str, # Use OpenRouter API key for auto captioning
    model: str,
    file_path: str
):

    print("Starting auto_caption_task")
    image_files = get_all_images(file_path)

    print(f"Found {len(image_files)} images for captioning")
    caption_workflow_state["progress"] = {
        "total": len(image_files),
        "processed": 0,
        "failed": 0,
        "errors": [],
    }

    prompt = caption_workflow_state["custom_prompt"] or DEFAULT_PROMPT
    print(f"Using prompt: {prompt}")

    json_file_path = os.path.join("jsons", f"{file_path}.json")
    print(f"JSON file path: {json_file_path}")

    for idx, (image_path, relative_path) in enumerate(image_files):
        print(
            f"Processing image {idx + 1}/{len(image_files)}: {relative_path}\n"
        )
        try:
            caption = process_image_with_prompt(
                image_path,
                relative_path,
                prompt,
                api_key,
            )
            print(
                f"Generated caption for {relative_path}: {caption}"
            )

            request = CaptionRequest(
                dataset_path=file_path,
                image_path=relative_path,
                caption=caption
            )
            await save_caption(request)
            print(f"Caption saved for {relative_path}")

            caption_workflow_state["progress"]["processed"] += 1
        except Exception as e:
            print(f"Error processing {relative_path}: {str(e)}")
            caption_workflow_state["progress"]["failed"] += 1
            caption_workflow_state["progress"]["errors"].append(
                f"{relative_path}: {str(e)}"
            )

        # Update progress
        caption_workflow_state["progress"]["processed"] = idx + 1
        await asyncio.sleep(1)  # Rate limiting

    print("auto_caption_task completed")


@router.post("/start-auto-captioning")
async def start_auto_captioning(
    background_tasks: BackgroundTasks,
    api_key: str = Form(...),
    file_path: str = Form(...),
    model: str = Form("google/gemma-3-12b-it:free"),
):
    print("Received request to start auto captioning")
    if caption_workflow_state["current_job"]:
        print("Captioning job already in progress")
        raise HTTPException(400, "Captioning job already in progress")

    print("Starting background task for auto captioning")
    background_tasks.add_task(auto_caption_task, api_key, model, file_path)
    return {"message": "Auto captioning started"}


@router.get("/auto-captioning-progress")
async def get_captioning_progress():
    return {
        "status": "running" if caption_workflow_state["current_job"] else "idle",
        "progress": caption_workflow_state["progress"],
    }
