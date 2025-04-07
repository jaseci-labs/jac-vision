# VLM Finetuner

**VLM Finetuner** is a web-based tool designed for fine-tuning Vision-Language Models (VLMs). It provides an intuitive interface for researchers and developers to manage VLMs, perform Vision Question Answering (VQA), generate image captions, monitor system resources, and interact with an AI-powered chatbot for assistance.

## Features

### Model Management

- Search for Vision-Language Models on Hugging Face with pagination support.
- Download models, including access-controlled ones using Hugging Face tokens.
- Fine-tune models using custom datasets.
- List and delete downloaded models.

### Vision Question Answering (VQA)

- Upload images and ask questions using Gemini or OpenAI models.
- View, delete, and manage VQA history (stored in SQLite by default).

### Chatbot Assistance

- Interactive chatbot powered by Gemini or OpenAI models for guidance.
- Draggable and resizable chatbot window with a debug overlay for layout troubleshooting.
- Full-screen mode on small screens for improved usability.

### Image Captioning

- Upload image folders to generate captions using a selected VLM (e.g., `google/gemma-3-12b-it:free`).
- Edit, save, and export captions as a ZIP file or JSON dataset.

### System Monitoring

- Real-time monitoring of CPU, memory, and disk usage on the server.

### Frontend

- Built with **React**, **TypeScript**, and **Material-UI** for a modern, responsive interface.
- Dynamic layout adjustments with collapsible elements (e.g., sidebar, header, footer).

## Prerequisites

Ensure the following dependencies are installed before proceeding:

- **Python**: Version 3.8 or higher.
- **Node.js**: Version 16 or higher.
- **npm**: Bundled with Node.js.
- **Hugging Face Account**: Required for downloading models (token needed for restricted models).
- **API Keys** (optional for advanced features):
  - Google Generative AI API key (for Gemini models).
  - OpenAI API key (for OpenAI models).

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/GayuruRamanayake/vlm-finetuner.git
cd vlm-finetuner
```

### 2. Backend Setup

#### a. Create a Virtual Environment

```bash
python -m venv venv
```

#### b. Activate the Virtual Environment

##### On Windows (Command Prompt)

```bash
venv/Scripts/activate
```

##### On macOS / Linux / WSL

```bash
source venv/bin/activate
```

#### c. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### 3. Frontend Setup

#### a. Install Frontend Dependencies

```bash
cd frontend  # Navigate to the frontend directory if applicable
npm install
```

#### b. Start the Frontend

```bash
npm run dev
```
