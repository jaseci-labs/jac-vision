from unsloth import FastVisionModel
import os
from io import BytesIO

from bert_score import score as bert_scorer
from peft import PeftConfig, PeftModel
from PIL import Image
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from transformers import AutoTokenizer, TextStreamer

snt_model = SentenceTransformer("all-MiniLM-L6-v2")

loaded_models = {}


def list_models():
    models_dir = "outputs"
    return {
        "models": [
            d
            for d in os.listdir(models_dir)
            if os.path.isdir(os.path.join(models_dir, d))
        ]
    }


def load_model(app_name):
    task_path = os.path.join("outputs", app_name)

    model, tokenizer = FastVisionModel.from_pretrained(
        model_name=task_path,
        load_in_4bit=True,  # Set to False for 16bit LoRA
    )
    FastVisionModel.for_inference(model)

    loaded_models[app_name] = (model, tokenizer)
    return model, tokenizer


def process_vqa(app_name, image, question):
    if app_name not in loaded_models:
        load_model(app_name)

    model, tokenizer = loaded_models[app_name]

    messages = [
        {
            "role": "user",
            "content": [{"type": "image"}, {"type": "text", "text": question}],
        }
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
        min_p=0.1,
    )

    return tokenizer.decode(outputs[0], skip_special_tokens=True)


def process_unfinetuned_vqa(image, question, model_name):

    model, tokenizer = FastVisionModel.from_pretrained(
        model_name=model_name,
        load_in_4bit=True,
        use_gradient_checkpointing="unsloth",
    )

    print(f"Loaded model: {model_name}")

    FastVisionModel.for_inference(model)

    messages = [
        {
            "role": "user",
            "content": [{"type": "image"}, {"type": "text", "text": question}],
        }
    ]

    input_text = tokenizer.apply_chat_template(messages, add_generation_prompt=True)

    print(f"Input text: {input_text}")

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
        min_p=0.1,
    )

    print(f"Generated output: {outputs}")

    return tokenizer.decode(outputs[0], skip_special_tokens=True)


def compare_responses(question, response1, response2):
    try:
        embeddings = snt_model.encode([response1, response2])

        cos_sim = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        P, R, F1 = bert_scorer([response1], [response2], lang="en")

        return {
            "cosine_similarity": float(cos_sim),
            "bert_score": {
                "precision": float(P.mean().item()),
                "recall": float(R.mean().item()),
                "f1": float(F1.mean().item()),
            },
            "question": question,
            "responses": {"response1": response1, "response2": response2},
        }
    except Exception as e:
        print(f"[ERROR] Failed to compare responses: {e}")
        return {"error": str(e)}
