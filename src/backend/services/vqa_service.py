from unsloth import FastVisionModel
import base64
import sqlite3
from datetime import datetime
from io import BytesIO

import google.generativeai as genai
import numpy as np
import openai
import requests
import torch
from bert_score import score as bert_scorer
from PIL import Image
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from transformers import Blip2Processor  # Qwen-specific processor
from transformers import AutoTokenizer

AVAILABLE_MODELS = [
        "unsloth/Llama-3.2-11B-Vision-bnb-4bit",
        "unsloth/Qwen2-VL-2B-Instruct-bnb-4bit",
        "unsloth/Pixtral-12B-2409",
    ]

snt_model = SentenceTransformer('all-MiniLM-L6-v2')

def process_vqa(
    image_content=None, question=None, api_key=None, api_type=None, model_name=None
):
    image_base64 = None
    if image_content:
        try:
            image_obj = Image.open(BytesIO(image_content)).convert("RGB")
            buffered = BytesIO()
            image_obj.save(buffered, format="JPEG")
            image_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        except:
            pass

    if api_key and api_type:
        try:
            if api_type.lower() == "gemini":
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel("gemini-1.5-flash")
                if image_base64:
                    response = model.generate_content(
                        [
                            {
                                "role": "user",
                                "parts": [
                                    {"text": question},
                                    {
                                        "inline_data": {
                                            "mime_type": "image/jpeg",
                                            "data": image_base64,
                                        }
                                    },
                                ],
                            }
                        ]
                    )
                else:
                    response = model.generate_content(
                        [{"role": "user", "parts": [{"text": question}]}]
                    )
                answer = response.text
            elif api_type.lower() == "openai":
                messages = [{"role": "user", "content": []}]
                if image_base64:
                    messages[0]["content"].append(
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            },
                        }
                    )
                messages[0]["content"].append({"type": "text", "text": question})
                response = openai.ChatCompletion.create(
                    model="gpt-4-vision-preview", messages=messages, max_tokens=300
                )
                answer = response.choices[0].message.content
            else:
                raise Exception("Invalid API type")
        except Exception as e:
            raise e
    else:
        raise Exception("API credentials required")

    conn = sqlite3.connect("vqa_history.db")
    c = conn.cursor()
    c.execute(
        "INSERT INTO vqa_history (image_base64, question, answer, timestamp) VALUES (?, ?, ?, ?)",
        (image_base64 if image_base64 else "", question, answer, str(datetime.now())),
    )
    conn.commit()
    conn.close()
    return {"answer": answer}


def get_history():
    conn = sqlite3.connect("vqa_history.db")
    c = conn.cursor()
    c.execute("SELECT * FROM vqa_history ORDER BY timestamp DESC")
    history = [
        {
            "id": row[0],
            "image_base64": row[1],
            "question": row[2],
            "answer": row[3],
            "timestamp": row[4],
        }
        for row in c.fetchall()
    ]
    conn.close()
    return {"history": history}


def delete_history_entry(history_id):
    conn = sqlite3.connect("vqa_history.db")
    c = conn.cursor()
    c.execute("DELETE FROM vqa_history WHERE id = ?", (history_id,))
    conn.commit()
    conn.close()
    return {"message": f"Deleted entry {history_id}"}


def clear_history():
    conn = sqlite3.connect("vqa_history.db")
    c = conn.cursor()
    c.execute("DELETE FROM vqa_history")
    conn.commit()
    conn.close()
    return {"message": "Cleared all history"}


def process_unfinetuned_vqa(image_content=None, question=None, model_name=None):

    if model_name not in AVAILABLE_MODELS:
        raise ValueError(f"Invalid model name: {model_name}")

    # Load base model without LoRA adapters
    model, tokenizer = FastVisionModel.from_pretrained(
        model_name,
        load_in_4bit=True,
        use_gradient_checkpointing=False,
        trust_remote_code=True  # Critical for Qwen models
    )

    # Process image
    image_base64 = None
    image_tensor = None
    if image_content:
        try:
            # Convert to PIL image
            image = Image.open(BytesIO(image_content)).convert("RGB")

            # Qwen-VL specific processing
            if "Qwen2-VL" in model_name:

                processor = Blip2Processor.from_pretrained(
                    "Qwen/Qwen-VL-Chat",
                    trust_remote_code=True
                )
                image_tensor = processor(image, return_tensors="pt")["pixel_values"]
            else:
                # Processing for other models
                image_tensor = model.preprocess_image(image)

            # Move tensor to GPU
            image_tensor = image_tensor.to(model.device).half()

            # Convert to base64 for storage
            buffered = BytesIO()
            image.save(buffered, format="JPEG")
            image_base64 = base64.b64encode(buffered.getvalue()).decode("utf-8")
        except Exception as e:
            raise ValueError(f"Image processing failed: {str(e)}")

    # Rest of the function remains the same...

    # Format input with template
    prompt = f"""<start_of_turn>user
    {question}
    {f"<image>{model.tokenizer.eos_token}" if image_content else ""}
    <start_of_turn>assistant
    """

    # Generate response
    try:
        inputs = tokenizer(
            prompt,
            return_tensors="pt",
            truncation=True,
            max_length=2048
        ).to(model.device)

        with torch.no_grad():
            generation_config = {
                "do_sample": True,
                "temperature": 0.7,
                "top_p": 0.9,
                "max_new_tokens": 256,
            }

            if image_tensor is not None:
                if "Qwen2-VL" in model_name:
                    generation_config["query_embeds"] = model.get_query_embeds(inputs, image_tensor)
                else:
                    generation_config["images"] = image_tensor

            outputs = model.generate(**inputs, **generation_config)

        answer = tokenizer.decode(outputs[0], skip_special_tokens=True)
        answer = answer.split("<start_of_turn>assistant")[-1].strip()
    except Exception as e:
        raise RuntimeError(f"Inference failed: {str(e)}")

    # Store in database
    conn = sqlite3.connect("vqa_history.db")
    c = conn.cursor()
    c.execute(
        """INSERT INTO vqa_history
        (image_base64, question, answer, timestamp, model_type)
        VALUES (?, ?, ?, ?, ?)""",
        (
            image_base64 if image_content else "",
            question,
            answer,
            str(datetime.now()),
            "unfinetuned"
        )
    )
    conn.commit()
    conn.close()

    return {"answer": answer}

def compare_responses(question, response1, response2):

    embeddings = snt_model.encode([response1, response2])
    cos_sim = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]

    P, R, F1 = bert_scorer([response1], [response2], lang="en")

    return {
        "cosine_similarity": float(cos_sim),
        "bert_score": {
            "precision": float(P.mean().item()),
            "recall": float(R.mean().item()),
            "f1": float(F1.mean().item())
        },
        "question": question,
        "responses": {
            "response1": response1,
            "response2": response2
        }
    }