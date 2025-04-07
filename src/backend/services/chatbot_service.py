import requests
import google.generativeai as genai

def search_huggingface_models(query, tags, param_range_min, param_range_max, hardware_gpu_memory, preference, limit):
    try:
        response = requests.get("https://huggingface.co/api/models", params={"search": query, "filter": tags, "limit": limit, "sort": "downloads", "direction": -1})
        models = response.json()
        filtered = []
        for model in models:
            model_name = model["id"]
            downloads = model.get("downloads", 0)
            tags = model.get("tags", [])
            param_count = 3.0 if "3b" in model_name.lower() else 7.0 if "7b" in model_name.lower() else None
            if not param_count or param_count < param_range_min or param_count > param_range_max: continue
            gpu_memory = param_count * 2
            if hardware_gpu_memory and gpu_memory > hardware_gpu_memory: continue
            pros = ["Strong in VQA" if "vqa" in tags else "", "Multilingual" if "multilingual" in tags else ""]
            cons = ["High requirements" if param_count > 4.0 else "", "Less tested" if downloads < 1000 else ""]
            filtered.append({"name": model_name, "param_count": param_count, "tags": tags, "downloads": downloads, "gpu_memory": gpu_memory, "pros": pros, "cons": cons})
        return filtered[:limit]
    except: return []

def get_model_recommendations(task_type, param_range_min, param_range_max, hardware_gpu_memory, preference):
    task_settings = {
        "vqa": {"query": "vision-language", "tags": ["vqa"], "intro": "VQA recommendations:"},
        "image_captioning": {"query": "image-captioning", "tags": ["image-captioning"], "intro": "Captioning models:"},
        "visual_language": {
            "query": "vision-language",
            "tags": ["vision-language", "image-captioning", "vqa"],
            "intro": "For vision-language tasks (e.g., damage assessment, image understanding), here are some recommended models that can process both images and text:"
        },
        "general": {"query": "vision-language", "tags": [], "intro": "General models:"}
    }
    settings = task_settings.get(task_type, task_settings["general"])
    models = search_huggingface_models(settings["query"], settings["tags"], param_range_min, param_range_max, hardware_gpu_memory, preference, 3)
    response = settings["intro"]
    for model in models:
        response += f"\n{model['name']} ({model['param_count']}B params)"
    return response

def process_chat_message(message, api_key, task_type, param_range_min, param_range_max, hardware_gpu_memory, preference):
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')
    recommendation = get_model_recommendations(task_type, param_range_min, param_range_max, hardware_gpu_memory, preference)
    response = model.generate_content(f"{message}\n\nRecommendations: {recommendation}")
    return response.text