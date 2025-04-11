from unsloth import FastLanguageModel
import os
import torch
from PIL import Image
from transformers import TextStreamer
from io import BytesIO

inference_cache = {}  # key: task_id, value: (model, tokenizer)

def list_finetuned_models():
    output_dir = "outputs"
    return {"models": [d for d in os.listdir(output_dir) if os.path.isdir(os.path.join(output_dir, d))]}

def load_finetuned_model(task_id):
    if task_id in inference_cache:
        return {"status": "already loaded"}

    model_dir = os.path.join("outputs", task_id)
    if not os.path.exists(model_dir):
        return {"error": f"Model not found for task_id: {task_id}"}

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name = model_dir,
        dtype = None,
        load_in_4bit = True,
    )
    model = FastLanguageModel.for_inference(model)
    inference_cache[task_id] = (model, tokenizer)

    return {"status": f"Model {task_id} loaded successfully"}

async def run_vqa(task_id, image_file, instruction):
    if task_id not in inference_cache:
        return {"error": f"Model {task_id} not loaded."}

    model, tokenizer = inference_cache[task_id]

    image = Image.open(BytesIO(await image_file.read())).convert("RGB")

    messages = [
        {"role": "user", "content": [
            {"type": "image"},
            {"type": "text", "text": instruction}
        ]}
    ]
    input_text = tokenizer.apply_chat_template(messages, add_generation_prompt=True)
    inputs = tokenizer(
        image,
        input_text,
        add_special_tokens=False,
        return_tensors="pt"
    ).to("cuda")

    streamer = TextStreamer(tokenizer, skip_prompt=True, skip_special_tokens=True)
    output = model.generate(**inputs, streamer=streamer, max_new_tokens=128, temperature=1.5, min_p=0.1)

    return {"answer": tokenizer.decode(output[0], skip_special_tokens=True)}
