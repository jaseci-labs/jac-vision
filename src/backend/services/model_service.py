import os
import shutil
import requests
from huggingface_hub import snapshot_download, HfApi

def list_models():
    models_dir = './finetuned_model'
    return {"models": [d for d in os.listdir(models_dir) if os.path.isdir(os.path.join(models_dir, d))]} if os.path.exists(models_dir) else {"models": []}

def search_models(query, limit, offset):
    try:
        response = requests.get(f"https://huggingface.co/api/models?search={query}&limit={limit}&offset={offset}&full=True")
        return {"models": response.json(), "total": response.headers.get('X-Total-Count', len(response.json()))}
    except Exception as e: raise e

def download_model(model_name, token):
    output_dir = f'./finetuned_model/{model_name.replace("/", "_")}'
    if os.path.exists(output_dir): return {"message": "Model exists"}
    try:
        snapshot_download(repo_id=model_name, local_dir=output_dir, local_dir_use_symlinks=False, token=token)
        return {"message": "Download successful"}
    except Exception as e: raise e

def check_model_access(model_name, token):
    try:
        api = HfApi()
        model_info = api.model_info(model_name, token=token)
        return {"restricted": model_info.gated, "has_access": True}
    except Exception as e: return {"restricted": True, "has_access": False}

def delete_model(model_name):
    model_dir = f'./finetuned_model/{model_name}'
    if not os.path.exists(model_dir): raise FileNotFoundError
    shutil.rmtree(model_dir)
    return {"message": "Model deleted"}