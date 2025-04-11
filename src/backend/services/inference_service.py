import os
from unsloth import FastVisionModel
from transformers import TextStreamer
from io import BytesIO

loaded_models = {}

def list_models():
    models_dir = "outputs"
    return {"models": [d for d in os.listdir(models_dir) if os.path.isdir(os.path.join(models_dir, d))]}

def load_model(task_id):
    model_path = os.path.join("outputs", task_id)
    if not os.path.exists(model_path):
        raise ValueError(f"Model {task_id} not found")

    model, tokenizer = FastVisionModel.from_pretrained(model_path, load_in_4bit=True)
    model = FastVisionModel.for_inference(model)
    loaded_models[task_id] = (model, tokenizer)
    return model, tokenizer

def process_vqa(task_id, image, question):
    if task_id not in loaded_models:
        load_model(task_id)

    model, tokenizer = loaded_models[task_id]

    messages = [
        {"role": "user", "content": [
            {"type": "image"},
            {"type": "text", "text": question}
        ]}
    ]

    input_text = tokenizer.apply_chat_template(messages, add_generation_prompt=True)
    inputs = tokenizer(
        image,
        input_text,
        add_special_tokens=False,
        return_tensors="pt",
    ).to("cuda")

    text_streamer = TextStreamer(tokenizer, skip_prompt=True)
    outputs = model.generate(
        **inputs,
        streamer=text_streamer,
        max_new_tokens=128,
        use_cache=True,
        temperature=1.5,
        min_p=0.1
    )

    return tokenizer.decode(outputs[0], skip_special_tokens=True)