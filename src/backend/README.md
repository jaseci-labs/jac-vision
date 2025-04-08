### Project Structure Overview

```markdown
backend/                         
├── api/                         # API endpoint handlers
│   ├── dataset_routes.py        # Handles dataset upload/download endpoints
│   ├── model_routes.py          # Manages model download/delete/search endpoints  
│   ├── routes.py                # Core fine-tuning API endpoints
│   ├── system_routes.py         # System monitoring/health check endpoints
│   └── vqa_routes.py            # Visual Question Answering API endpoints
│
├── configs/                     # Training configuration files
│   ├── LLaMA_Configs.csv        # LLaMA model hyperparameters
│   ├── Pixtral_Configs.csv      # Pixtral model configurations  
│   └── Qwen_Configs.csv         # Qwen model training parameters
│
├── schemas/                     
│   └── models.py                # Models for request/response validation
│
├── services/                    
│   ├── chatbot_service.py       # AI chatbot recommendation engine
│   ├── dataset_service.py       # Dataset processing/management logic
│   ├── inference.py             # Model inference/prediction service
│   ├── model_service.py         # Model download/management operations
│   ├── save.py                  # Model saving/export functionality
│   ├── training.py              # Core model training implementation  
│   ├── training_metrics.py      # Training performance tracking
│   └── vqa_service.py           # Visual QA processing backend
│
├── utils/                       
│   ├── config_loader.py         # Loads training configurations
│   ├── dataset_utils.py         # Dataset conversion/formatting tools
│   └── image_utils.py           # Image processing/encoding helpers
│
├── main.py                      
├── README.md                    
├── requirements.txt             
└── vqa_history.db               # Database for VQA interaction history
```
