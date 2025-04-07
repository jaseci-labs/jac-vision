import os
import shutil

import requests
from fastapi import APIRouter, HTTPException, logger
from huggingface_hub import HfApi, snapshot_download

from backend.api.models import *

router = APIRouter()


@router.get("/models")
async def list_models():
    try:
        models_dir = "./finetuned_model"
        if not os.path.exists(models_dir):
            logger.debug("No finetuned models found")
            return {"models": []}
        models = [
            d
            for d in os.listdir(models_dir)
            if os.path.isdir(os.path.join(models_dir, d))
        ]
        logger.debug(f"Found models: {models}")
        return {"models": models}
    except Exception as e:
        logger.error(f"Error in /models: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search(query: str = None, limit: int = 50, offset: int = 0):
    if not query:
        logger.debug("No query provided in /search request")
        return {"models": [], "total": 0}
    query = query.lower()
    logger.debug(
        f"Searching for models with query: {query}, limit: {limit}, offset: {offset}"
    )
    try:
        response = requests.get(
            f"https://huggingface.co/api/models?search={query}&limit={limit}&offset={offset}&full=True"
        )
        if response.status_code != 200:
            logger.error(
                f"Failed to fetch models from Hugging Face: {response.status_code} {response.text}"
            )
            raise HTTPException(
                status_code=502,
                detail=f"Failed to fetch models from Hugging Face: {response.status_code}",
            )
        models_data = response.json()
        total_models = response.headers.get("X-Total-Count", len(models_data))
        processed_models = []
        for model in models_data:
            model_id = model["id"]
            try:
                model_info_response = requests.get(
                    f"https://huggingface.co/api/models/{model_id}"
                )
                if model_info_response.status_code == 200:
                    model_info = model_info_response.json()
                    model_size = "Unknown"
                    if "lastModified" in model_info and "siblings" in model_info:
                        total_size = 0
                        for file in model_info.get("siblings", []):
                            if file.get("rfilename", "").endswith(
                                (".safetensors", ".bin")
                            ):
                                total_size += 1
                        model_size = f"{total_size} GB" if total_size > 0 else "Unknown"
                    processed_models.append(
                        {
                            "id": model_id,
                            "size": model_size,
                            "tags": model_info.get("tags", []),
                            "likes": model_info.get("likes", 0),
                            "downloads": model_info.get("downloads", 0),
                        }
                    )
            except Exception as e:
                logger.warning(f"Failed to fetch metadata for {model_id}: {str(e)}")
                processed_models.append(
                    {
                        "id": model_id,
                        "size": "Unknown",
                        "tags": model.get("tags", []),
                        "likes": model.get("likes", 0),
                        "downloads": model.get("downloads", 0),
                    }
                )
        logger.debug(f"Found {len(processed_models)} models")
        return {"models": processed_models, "total": int(total_models)}
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error while fetching models: {str(e)}")
        raise HTTPException(
            status_code=502, detail="Network error while fetching models"
        )
    except Exception as e:
        logger.error(f"Error in /search: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/download-model")
async def download_model(request: DownloadModelRequest):
    model_name = request.model
    token = request.token
    output_dir = f'./finetuned_model/{model_name.replace("/", "_")}'
    if os.path.exists(output_dir):
        return {"message": f"Model {model_name} already exists"}
    try:
        snapshot_download(
            repo_id=model_name,
            local_dir=output_dir,
            local_dir_use_symlinks=False,
            token=token,
        )
        return {"message": f"Model {model_name} downloaded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check-model-access")
async def check_model_access(request: CheckModelAccessRequest):
    try:
        api = HfApi()
        model_info = api.model_info(request.model, token=request.token)
        return {
            "restricted": model_info.gated,
            "has_access": True,
            "message": f"You have access to model {request.model}",
        }
    except Exception as e:
        return {"restricted": True, "has_access": False, "message": str(e)}


@router.post("/delete-model")
async def delete_model(request: DeleteModelRequest):
    model_dir = f"./finetuned_model/{request.model}"
    if not os.path.exists(model_dir):
        raise HTTPException(status_code=404, detail="Model not found")
    shutil.rmtree(model_dir)
    return {"message": f"Model {request.model} deleted successfully"}
