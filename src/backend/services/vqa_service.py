import sqlite3
from datetime import datetime
import base64
from io import BytesIO
from PIL import Image
import requests
import google.generativeai as genai
import openai

def process_vqa(image_content=None, question=None, api_key=None, api_type=None, model_name=None):
    image_base64 = None
    if image_content:
        try:
            image_obj = Image.open(BytesIO(image_content)).convert('RGB')
            buffered = BytesIO()
            image_obj.save(buffered, format="JPEG")
            image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        except: pass

    if api_key and api_type:
        try:
            if api_type.lower() == 'gemini':
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-1.5-flash')
                if image_base64:
                    response = model.generate_content([{"role": "user", "parts": [{"text": question}, {"inline_data": {"mime_type": "image/jpeg", "data": image_base64}}]}])
                else:
                    response = model.generate_content([{"role": "user", "parts": [{"text": question}]}])
                answer = response.text
            elif api_type.lower() == 'openai':
                messages = [{"role": "user", "content": []}]
                if image_base64:
                    messages[0]["content"].append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}})
                messages[0]["content"].append({"type": "text", "text": question})
                response = openai.ChatCompletion.create(model="gpt-4-vision-preview", messages=messages, max_tokens=300)
                answer = response.choices[0].message.content
            else: raise Exception("Invalid API type")
        except Exception as e: raise e
    else: raise Exception("API credentials required")

    conn = sqlite3.connect('vqa_history.db')
    c = conn.cursor()
    c.execute('INSERT INTO vqa_history (image_base64, question, answer, timestamp) VALUES (?, ?, ?, ?)', (image_base64 if image_base64 else '', question, answer, str(datetime.now())))
    conn.commit()
    conn.close()
    return {"answer": answer}

def get_history():
    conn = sqlite3.connect('vqa_history.db')
    c = conn.cursor()
    c.execute('SELECT * FROM vqa_history ORDER BY timestamp DESC')
    history = [{'id': row[0], 'image_base64': row[1], 'question': row[2], 'answer': row[3], 'timestamp': row[4]} for row in c.fetchall()]
    conn.close()
    return {"history": history}

def delete_history_entry(history_id):
    conn = sqlite3.connect('vqa_history.db')
    c = conn.cursor()
    c.execute('DELETE FROM vqa_history WHERE id = ?', (history_id,))
    conn.commit()
    conn.close()
    return {"message": f"Deleted entry {history_id}"}

def clear_history():
    conn = sqlite3.connect('vqa_history.db')
    c = conn.cursor()
    c.execute('DELETE FROM vqa_history')
    conn.commit()
    conn.close()
    return {"message": "Cleared all history"}