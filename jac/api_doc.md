1. dataset routes
    - upload_image_folder - post
    - get_next_image - get
    - save_caption - post
    - download_dataset - get
    - download_json - get
    - serve_image - get
    - get_json - get
    - clear_data - delete
    - get_default_prompt - get
    - set_custom_prompt - post
    - preview_captioning - get
    - auto_caption_task - - async
    - start_auto_captioning - post
    - get_captioning_progress - get

2. finetune routes
    - get_models - get - sync
    - get_captioned_datasets - get - sync
    - start_finetuning - post - async
    - start_adapt_finetuning - post - async
    - finetune_with_goal - post - async
    - check_status - get - sync
    - stream_status - get - sync
    - save_model_req - post - sync
    - save_gguf_endpoint - post - sync
    - get_training_metrics - get - sync
    - get_adaptive_config - get - async
    - get_tensorboard_metrics - get - async

3. inference routes
    - get_finetuned_models - get - async
    - load_finetuned_model - post - async
    - process_inference - post - async
    - process_unfinetuned_vqa_endpoint - post - async
    - compare_responses_endpoint - post - async

4. model routes
    - list_models - get - async
    - search - get - async
    - download_model - post - async
    - check_model_access - post - async
    - delete_model - post - async

5. system routes
    - get_system_info - get - async

6. vqa routes
    - process_vqa_endpoint - post - async
    - get_vqa_history - get - async
    - delete_history - delete - async
    - clear_vqa_history - delete - async