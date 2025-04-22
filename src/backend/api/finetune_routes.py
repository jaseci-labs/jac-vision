import json
import time
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from schemas.models import (
    FineTuningRequest,
    GGUFSaveRequest,
    GoalTrainingRequest,
    SaveModelRequest,
)
from services.save import save_gguf_model, save_model
from services.training import (
    AVAILABLE_MODELS,
    retreive_captioned_dataset,
    task_status,
    train_model,
    train_model_with_goal,
    trained_models,
)

router = APIRouter()


@router.get("/models")
def get_models():
    return {"models": AVAILABLE_MODELS}


@router.get("/datasets")
def get_captioned_datasets():
    return retreive_captioned_dataset()


@router.post("/start-finetuning")
async def start_finetuning(
    request: FineTuningRequest, background_tasks: BackgroundTasks
):
    task_id = str(uuid.uuid4())
    background_tasks.add_task(
        train_model,
        model_name=request.model_name,
        task_id=task_id,
        dataset_path=request.dataset_path,
    )
    return {"task_id": task_id, "status": "STARTED"}


@router.post("/tune-with-goal")
async def train_with_goal(
    request: GoalTrainingRequest, background_tasks: BackgroundTasks
):
    task_id = str(uuid.uuid4())
    try:
        background_tasks.add_task(
            train_model_with_goal,
            task_id,
            request.model_name,
            request.dataset_path,
            request.goal_type,
            request.target,
        )
        return {"task_id": task_id, "status": "STARTED"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status/{task_id}")
def check_status(task_id: str):
    status = task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return {k: v for k, v in status.items() if k != "model"}


@router.get("/stream-status/{task_id}")
def stream_status(task_id: str):
    def event_generator():
        while True:
            status = task_status.get(task_id)
            if not status:
                yield f"data: {json.dumps({'error': 'Task not found'})}\n\n"
                break
            sanitized_status = {k: v for k, v in status.items() if k != "model"}
            yield f"data: {json.dumps(sanitized_status)}\n\n"
            if status["status"] in ["COMPLETED", "FAILED"]:
                break
            time.sleep(2)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/save-model")
def save_model_req(request: SaveModelRequest):
    try:
        return save_model(
            request.task_id, request.app_name, request.hf_username, request.hf_token
        )
    except:
        raise HTTPException(
            status_code=404, detail="Model not found or training not completed"
        )


@router.post("/save-gguf")
def save_gguf_endpoint(request: GGUFSaveRequest):
    try:
        return save_gguf_model(
            task_id=request.task_id,
            output_dir=request.output_dir,
            quant_method=request.quant_method,
        )
    except:
        raise HTTPException(
            status_code=404, detail="Model not found or training not completed"
        )


@router.get("/get-metrics/{task_id}")
def get_training_metrics(task_id: str):
    if task_id not in task_status:
        return {"error": "Invalid task ID"}

    status = task_status[task_id]
    return {
        "status": status.get("status"),
        "metrics": status.get("metrics", {}),
        "log_history": status.get("log_history", []),
    }
