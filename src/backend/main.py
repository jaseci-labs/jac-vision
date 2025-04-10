from api.dataset_routes import router as dataset_router
from api.model_routes import router as model_router
from api.finetune_routes import router as finetune_router
from api.system_routes import router as system_router
from api.vqa_routes import router as vqa_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="VLM Fine-Tuning API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(finetune_router, prefix="/api/finetune")
app.include_router(vqa_router, prefix="/api/vqa")
app.include_router(model_router, prefix="/api/models")
app.include_router(dataset_router, prefix="/api/datasets")
app.include_router(system_router, prefix="/api/system")
