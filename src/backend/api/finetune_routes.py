import json
import time
import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse
from schemas.models import (
    AdaptFineTuningRequest,
    FineTuningRequest,
    GGUFSaveRequest,
    GoalTrainingRequest,
    SaveModelRequest,
    GetHyperParamRequest
)
from services.save import save_gguf_model, save_model
from services.training import (
    AVAILABLE_MODELS,
    get_model_list,
    get_tensorboard_logs,
    retreive_captioned_dataset,
    task_status,
    train_adapt_model,
    train_model,
    train_model_with_goal,
    get_hyperparameters_list,
)

router = APIRouter()

adaptive_configs = {
    "unsloth/Llama-3.2-11B-Vision-bnb-4bit": {
        "batch_size": 4,
        "learning_rate": 2e-5,
        "epochs": 10,
    },
    "unsloth/Qwen2-VL-2B-Instruct-bnb-4bit": {
        "batch_size": 8,
        "learning_rate": 3e-4,
        "epochs": 8,
    },
    "unsloth/Pixtral-12B-2409": {
        "batch_size": 4,
        "learning_rate": 2e-5,
        "epochs": 10,
    },
}


@router.get("/models")
def get_models():
    return {"models": get_model_list()}


@router.get("/get-hyperparameters")
def get_hyperparameters(request: GetHyperParamRequest):
    return {"hyperparameters": get_hyperparameters_list(request.model_name)}


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
        app_name=request.app_name,
    )
    return {"task_id": task_id, "status": "STARTED"}


@router.post("/start-adapt-finetune")
async def start_adapt_finetuning(
    request: AdaptFineTuningRequest, background_tasks: BackgroundTasks
):
    task_id = str(uuid.uuid4())
    background_tasks.add_task(
        train_adapt_model,
        model_name=request.model_name,
        task_id=task_id,
        dataset_path=request.dataset_path,
        app_name=request.app_name,
        batch_size=request.batch_size,
        learning_rate=request.learning_rate,
        epochs=request.epochs,
    )
    return {"task_id": task_id, "status": "STARTED"}


@router.post("/finetune-with-goal")
async def finetune_with_goal(
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
            request.app_name,
        )
        return {"task_id": task_id, "status": "STARTED"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status/{task_id}")
def check_status(task_id: str):
    status = task_status.get(task_id)
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "status": status.get("status"),
        "progress": status.get("progress"),
        "epoch_metrics": status.get("epoch_metrics"),
        "current_epoch": status.get("current_epoch", 0),
        "metrics": status.get("metrics", {}),
    }


@router.get("/stream-status/{task_id}")
def stream_status(task_id: str):
    def event_generator():
        last_epoch = -1
        while True:
            status = task_status.get(task_id)
            if not status:
                yield f"data: {json.dumps({'error': 'Task not found'})}\n\n"
                break

            # Send epoch updates
            if (
                "epoch_metrics" in status
                and status["epoch_metrics"]["epoch"] > last_epoch
            ):
                last_epoch = status["epoch_metrics"]["epoch"]
                epoch_data = json.dumps(
                    {"type": "epoch_update", "data": status["epoch_metrics"]}
                )
                yield f"data: {epoch_data}\n\n"

            # Send regular status updates
            sanitized_status = {k: v for k, v in status.items() if k != "model"}
            status_data = json.dumps(
                {"type": "status_update", "data": sanitized_status}
            )
            yield f"data: {status_data}\n\n"

            if status["status"] in ["COMPLETED", "FAILED"]:
                break
            time.sleep(1)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


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


@router.get("/adaptive-config/{model_name}")
async def get_adaptive_config(model_name: str):

    decoded_model_name = model_name.replace("%2F", "/")  # Decode URL-encoded slashes
    print(f"Fetching adaptive config for model: {decoded_model_name}")
    if decoded_model_name not in adaptive_configs:
        raise HTTPException(
            status_code=404, detail="Model not found in adaptive configurations"
        )

    config = adaptive_configs.get(decoded_model_name)

    return {
        "model": decoded_model_name,
        "batch_size": config["batch_size"],
        "learning_rate": config["learning_rate"],
        "epochs": config["epochs"],
    }


@router.get("/tensorboard-logs/{app_name}")
async def get_tensorboard_metrics(app_name: str):
    try:
        return get_tensorboard_logs(app_name)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))
