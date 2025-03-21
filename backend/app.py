from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from PIL import Image
import psutil
import requests
import logging
import google.generativeai as genai
import base64
from io import BytesIO
import sqlite3
from datetime import datetime
import shutil
import openai
from transformers import AutoModelForCausalLM, AutoProcessor, Qwen2VLForConditionalGeneration
import torch
from huggingface_hub import hf_hub_download, snapshot_download

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})

# Initialize SQLite database for VQA history
def init_db():
    conn = sqlite3.connect('vqa_history.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS vqa_history
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  image_base64 TEXT,
                  question TEXT,
                  answer TEXT,
                  timestamp TEXT)''')
    conn.commit()
    conn.close()

init_db()

@app.route('/finetune', methods=['POST'])
def finetune():
    try:
        data = request.get_json()
        model_name = data.get('model')
        dataset_link = data.get('dataset')

        if not model_name or not dataset_link:
            logger.warning("Missing model or dataset in /finetune request")
            return jsonify({'message': 'Missing model or dataset'}), 400

        logger.debug(f"Fine-tuning model: {model_name} with dataset: {dataset_link}")
        output_dir = f'./finetuned_model/{model_name.replace("/", "_")}'
        os.makedirs(output_dir, exist_ok=True)
        logger.info(f"Fine-tuning completed for {model_name}. Model saved to {output_dir}")
        return jsonify({'message': 'Fine-tuning completed. Model saved.'})
    except Exception as e:
        logger.error(f"Error in /finetune: {str(e)}", exc_info=True)
        return jsonify({'message': f'Error: {str(e)}'}), 500

@app.route('/vqa', methods=['POST'])
def vqa():
    try:
        model_name = request.form.get('model')
        image_file = request.files.get('image') if 'image' in request.files else None
        question = request.form.get('question')
        api_key = request.form.get('api_key')
        api_type = request.form.get('api_type')

        if not question:
            logger.warning("Missing question in /vqa request")
            return jsonify({'answer': 'Missing question'}), 400

        image = None
        image_base64 = None
        if image_file:
            try:
                image = Image.open(image_file).convert('RGB')
                buffered = BytesIO()
                image.save(buffered, format="JPEG")
                image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
            except Exception as e:
                logger.error(f"Invalid image file: {str(e)}")
                return jsonify({'answer': 'Invalid image file. Please upload a valid image.'}), 400

        if api_key and api_type:
            if api_type.lower() == 'gemini':
                try:
                    genai.configure(api_key=api_key)
                    model = genai.GenerativeModel('gemini-1.5-flash')
                    if image_base64:
                        response = model.generate_content([
                            {"role": "user", "parts": [
                                {"text": question},
                                {"inline_data": {"mime_type": "image/jpeg", "data": image_base64}}
                            ]}
                        ])
                    else:
                        response = model.generate_content([
                            {"role": "user", "parts": [
                                {"text": question}
                            ]}
                        ])
                    answer = response.text
                except Exception as e:
                    logger.error(f"Error with Gemini API: {str(e)}")
                    return jsonify({'answer': f'Error with Gemini API: {str(e)}'}), 500
            elif api_type.lower() == 'openai':
                try:
                    openai.api_key = api_key
                    messages = [{"role": "user", "content": []}]
                    if image_base64:
                        messages[0]["content"].append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}})
                    messages[0]["content"].append({"type": "text", "text": question})
                    response = openai.ChatCompletion.create(
                        model="gpt-4-vision-preview",
                        messages=messages,
                        max_tokens=300
                    )
                    answer = response.choices[0].message.content
                except Exception as e:
                    logger.error(f"Error with OpenAI API: {str(e)}")
                    return jsonify({'answer': f'Error with OpenAI API: {str(e)}'}), 500
            else:
                return jsonify({'answer': 'Invalid API type. Use "gemini" or "openai".'}), 400
        else:
            if not model_name:
                return jsonify({'answer': 'Model name required when not using an API key.'}), 400
            try:
                # Check if the model exists in the finetuned_model directory
                model_dir = f'./finetuned_model/{model_name.replace("/", "_")}'
                if not os.path.exists(model_dir):
                    logger.error(f"Model {model_name} not found in {model_dir}")
                    return jsonify({'answer': f'Model {model_name} not found. Please download the model first.'}), 404

                if 'qwen' in model_name.lower():
                    model = Qwen2VLForConditionalGeneration.from_pretrained(model_dir)
                    processor = AutoProcessor.from_pretrained(model_dir)
                else:
                    model = AutoModelForCausalLM.from_pretrained(model_dir)
                    processor = AutoProcessor.from_pretrained(model_dir)

                if image:
                    inputs = processor(
                        text=question,
                        images=image,
                        return_tensors="pt",
                        padding=True,
                        truncation=True
                    )
                else:
                    inputs = processor(
                        text=question,
                        return_tensors="pt",
                        padding=True,
                        truncation=True
                    )

                with torch.no_grad():
                    outputs = model.generate(
                        **inputs,
                        max_new_tokens=50,
                        do_sample=True,
                        temperature=0.7,
                    )

                answer = processor.decode(outputs[0], skip_special_tokens=True)
            except Exception as e:
                logger.error(f"Error with local model inference: {str(e)}")
                return jsonify({'answer': f'Error with local model inference: {str(e)}'}), 500

        logger.info(f"VQA completed: answer={answer}")

        conn = sqlite3.connect('vqa_history.db')
        c = conn.cursor()
        c.execute('INSERT INTO vqa_history (image_base64, question, answer, timestamp) VALUES (?, ?, ?, ?)',
                  (image_base64 if image_base64 else '', question, answer, str(datetime.now())))
        conn.commit()
        conn.close()

        return jsonify({'answer': answer})
    except Exception as e:
        logger.error(f"Error in /vqa: {str(e)}", exc_info=True)
        return jsonify({'answer': f'Error: {str(e)}'}), 500

@app.route('/vqa/history', methods=['GET'])
def get_vqa_history():
    try:
        conn = sqlite3.connect('vqa_history.db')
        c = conn.cursor()
        c.execute('SELECT * FROM vqa_history ORDER BY timestamp DESC')
        history = [{'id': row[0], 'image_base64': row[1], 'question': row[2], 'answer': row[3], 'timestamp': row[4]} for row in c.fetchall()]
        conn.close()
        return jsonify({'history': history})
    except Exception as e:
        logger.error(f"Error in /vqa/history: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/vqa/history/delete/<int:history_id>', methods=['DELETE'])
def delete_vqa_history(history_id):
    try:
        conn = sqlite3.connect('vqa_history.db')
        c = conn.cursor()
        c.execute('DELETE FROM vqa_history WHERE id = ?', (history_id,))
        conn.commit()
        conn.close()
        return jsonify({'message': f'History entry {history_id} deleted successfully'})
    except Exception as e:
        logger.error(f"Error in /vqa/history/delete: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/vqa/history/clear', methods=['DELETE'])
def clear_vqa_history():
    try:
        conn = sqlite3.connect('vqa_history.db')
        c = conn.cursor()
        c.execute('DELETE FROM vqa_history')
        conn.commit()
        conn.close()
        return jsonify({'message': 'All VQA history cleared successfully'})
    except Exception as e:
        logger.error(f"Error in /vqa/history/clear: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/models', methods=['GET'])
def list_models():
    try:
        models_dir = './finetuned_model'
        if not os.path.exists(models_dir):
            logger.debug("No finetuned models found")
            return jsonify({'models': []})
        
        models = [d for d in os.listdir(models_dir) if os.path.isdir(os.path.join(models_dir, d))]
        logger.debug(f"Found models: {models}")
        return jsonify({'models': models})
    except Exception as e:
        logger.error(f"Error in /models: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/search', methods=['GET'])
def search():
    try:
        query = request.args.get('query', '').lower()
        if not query:
            logger.debug("No query provided in /search request")
            return jsonify({'models': []})

        logger.debug(f"Searching for models with query: {query}")
        response = requests.get(
            f"https://huggingface.co/api/models?search={query}&limit=10"
        )
        if response.status_code != 200:
            logger.error(f"Failed to fetch models from Hugging Face: {response.status_code} {response.text}")
            return jsonify({'error': f'Failed to fetch models from Hugging Face: {response.status_code}'}), 502

        models_data = response.json()
        filtered_models = [model['id'] for model in models_data if query in model['id'].lower()]
        logger.debug(f"Found models: {filtered_models}")
        return jsonify({'models': filtered_models})
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error while fetching models: {str(e)}")
        return jsonify({'error': 'Network error while fetching models'}), 502
    except Exception as e:
        logger.error(f"Error in /search: {str(e)}", exc_info=True)
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@app.route('/system-info', methods=['GET'])
def system_info():
    try:
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        timestamp = str(datetime.now())
        logger.debug("Fetched system info")
        return jsonify({
            'timestamp': timestamp,
            'cpu_usage_percent': cpu_usage,
            'cpu_usage_label': f"{cpu_usage}%",
            'memory_total_gb': round(memory.total / (1024 ** 3), 2),
            'memory_used_gb': round(memory.used / (1024 ** 3), 2),
            'memory_remaining_gb': round((memory.total - memory.used) / (1024 ** 3), 2),
            'memory_percent': memory.percent,
            'disk_total_gb': round(disk.total / (1024 ** 3), 2),
            'disk_used_gb': round(disk.used / (1024 ** 3), 2),
            'disk_remaining_gb': round((disk.total - disk.used) / (1024 ** 3), 2),
            'disk_percent': disk.percent,
        })
    except Exception as e:
        logger.error(f"Error in /system-info: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/download-model', methods=['POST'])
def download_model():
    try:
        data = request.get_json()
        model_name = data.get('model')

        if not model_name:
            logger.warning("Missing model name in /download-model request")
            return jsonify({'message': 'Missing model name'}), 400

        logger.debug(f"Downloading model: {model_name}")
        output_dir = f'./finetuned_model/{model_name.replace("/", "_")}'
        os.makedirs(output_dir, exist_ok=True)

        # Download the model using huggingface_hub
        snapshot_download(repo_id=model_name, local_dir=output_dir, local_dir_use_symlinks=False)
        logger.info(f"Model {model_name} downloaded successfully to {output_dir}")
        return jsonify({'message': f'Model {model_name} downloaded successfully'})
    except Exception as e:
        logger.error(f"Error in /download-model: {str(e)}", exc_info=True)
        return jsonify({'message': f'Error: {str(e)}'}), 500

@app.route('/delete-model', methods=['POST'])
def delete_model():
    try:
        data = request.get_json()
        model_name = data.get('model')

        if not model_name:
            logger.warning("Missing model name in /delete-model request")
            return jsonify({'message': 'Missing model name'}), 400

        model_dir = f'./finetuned_model/{model_name}'
        if not os.path.exists(model_dir):
            logger.warning(f"Model directory {model_dir} does not exist")
            return jsonify({'message': f'Model {model_name} not found'}), 404

        shutil.rmtree(model_dir)
        logger.info(f"Model {model_name} deleted successfully from {model_dir}")
        return jsonify({'message': f'Model {model_name} deleted successfully'})
    except Exception as e:
        logger.error(f"Error in /delete-model: {str(e)}", exc_info=True)
        return jsonify({'message': f'Error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)