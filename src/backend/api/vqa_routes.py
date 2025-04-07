from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from backend.api.models import *
from services.vqa_service import process_vqa, get_history, delete_history_entry, clear_history
import sqlite3
from datetime import datetime
import base64
from io import BytesIO
from PIL import Image
import os
import requests
import openai
import google.generativeai as genai

router = APIRouter()

@router.post("/vqa")
async def vqa_endpoint(model: str = Form(None), image: UploadFile = File(None), question: str = Form(None), api_key: str = Form(None), api_type: str = Form(None)):
    if not question:
        raise HTTPException(status_code=400, detail="Missing question")
    image_base64 = None
    if image:
        if not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="Uploaded file must be an image")
        try:
            image_content = await image.read()
            image_obj = Image.open(BytesIO(image_content)).convert('RGB')
            buffered = BytesIO()
            image_obj.save(buffered, format="JPEG")
            image_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        except Exception as e:
            raise HTTPException(status_code=400, detail="Invalid image file")

    if api_key and api_type:
        try:
            if api_type.lower() == 'gemini':
                genai.configure(api_key=api_key)
                model_gemini = genai.GenerativeModel('gemini-1.5-flash')
                if image_base64:
                    response = model_gemini.generate_content([{"role": "user", "parts": [{"text": question}, {"inline_data": {"mime_type": "image/jpeg", "data": image_base64}}]}])
                else:
                    response = model_gemini.generate_content([{"role": "user", "parts": [{"text": question}]}])
                answer = response.text
            elif api_type.lower() == 'openai':
                messages = [{"role": "user", "content": []}]
                if image_base64:
                    messages[0]["content"].append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}})
                messages[0]["content"].append({"type": "text", "text": question})
                response = openai.ChatCompletion.create(model="gpt-4-vision-preview", messages=messages, max_tokens=300)
                answer = response.choices[0].message.content
            else:
                raise HTTPException(status_code=400, detail='Invalid API type')
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    else:
        raise HTTPException(status_code=400, detail="API key and type required")

    conn = sqlite3.connect('vqa_history.db')
    c = conn.cursor()
    c.execute('INSERT INTO vqa_history (image_base64, question, answer, timestamp) VALUES (?, ?, ?, ?)', (image_base64 if image_base64 else '', question, answer, str(datetime.now())))
    conn.commit()
    conn.close()
    return {"answer": answer}

@router.get("/vqa/history")
async def get_vqa_history():
    conn = sqlite3.connect('vqa_history.db')
    c = conn.cursor()
    c.execute('SELECT * FROM vqa_history ORDER BY timestamp DESC')
    history = [{'id': row[0], 'image_base64': row[1], 'question': row[2], 'answer': row[3], 'timestamp': row[4]} for row in c.fetchall()]
    conn.close()
    return {"history": history}

@router.delete("/vqa/history/delete/{history_id}")
async def delete_history(history_id: int):
    conn = sqlite3.connect('vqa_history.db')
    c = conn.cursor()
    c.execute('DELETE FROM vqa_history WHERE id = ?', (history_id,))
    conn.commit()
    conn.close()
    return {"message": f"History entry {history_id} deleted successfully"}

@router.delete("/vqa/history/clear")
async def clear_vqa_history():
    conn = sqlite3.connect('vqa_history.db')
    c = conn.cursor()
    c.execute('DELETE FROM vqa_history')
    conn.commit()
    conn.close()
    return {"message": "All VQA history cleared successfully"}