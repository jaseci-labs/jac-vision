# VLM Finetuner

A web-based tool for fine-tuning Vision-Language Models (VLMs), with features for searching, downloading, and fine-tuning models from Hugging Face, performing Vision Question Answering (VQA), generating image captions, monitoring system resources, and interacting with a chatbot for assistance. The tool is designed to be user-friendly, supporting both researchers and developers in leveraging VLMs for various tasks.

## Features

- **Model Management**:
  - Search for VLM models on Hugging Face with pagination.
  - Download models, with support for access control checks using Hugging Face tokens.
  - Fine-tune models using custom datasets.
  - List and delete downloaded models.
- **Vision Question Answering (VQA)**:
  - Perform VQA by uploading an image and asking a question, using Gemini or OpenAI models.
  - View, delete, and clear VQA history (stored in SQLite by default).
- **Chatbot**:
  - Interactive chatbot powered by Gemini or OpenAI models for task assistance.
  - Draggable and resizable chatbot window with a debug overlay for troubleshooting layout issues.
  - Full-screen mode on small screens for better usability.
- **Image Captioning**:
  - Upload a folder of images to generate captions using a specified VLM (e.g., `google/gemma-3-12b-it:free`).
  - Edit and save captions, then download the dataset as a ZIP file or JSON.
- **System Monitoring**:
  - Monitor server CPU, memory, and disk usage in real-time.
- **Frontend**:
  - Built with React, TypeScript, and Material-UI for a responsive and modern interface.
  - Supports dynamic layout adjustments for collapsible elements (e.g., sidebar, header, footer).

## Prerequisites

- **Python**: Version 3.8 or higher.
- **Node.js**: Version 16 or higher (for the frontend).
- **npm**: Comes with Node.js.
- **Hugging Face Account**: For downloading models (optional token for restricted models).
- **API Keys** (optional):
  - Google Generative AI API key (for Gemini models).
  - OpenAI API key (for OpenAI models).

## Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/GayuruRamanayake/vlm-finetuner.git
cd vlm-finetuner


##  2. Set Up the Backend
##  a. Create a Virtual Environment

python -m venv venv

# activate the vitual environment

source venv/bin/activate  # On Windows: venv\Scripts\activate

##  b. Install Backend Dependencies

pip install -r requirements.txt


##   3. Set Up the Frontend
##  a. Install Frontend Dependencies


cd frontend  # If your frontend code is in a subdirectory
npm install

## b. Start the Frontend

npm run dev 
