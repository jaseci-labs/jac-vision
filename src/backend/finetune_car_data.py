import os
import json
import pandas as pd
from PIL import Image
from unsloth import FastVisionModel
from transformers import TextStreamer
from unsloth.trainer import UnslothVisionDataCollator
from trl import SFTTrainer, SFTConfig
from unsloth import is_bf16_supported

json_path = "car_damage_data.json"
image_dir = "DamageAssessment_1"
output_excel = "inference_results.xlsx"
image_folder = "inference_images"
excel_path = "base_model_outputs.xlsx"

instruction = "Describe this image as if analyzing a vehicle's condition for an insurance report."

df = pd.read_excel(excel_path)

model, tokenizer = FastVisionModel.from_pretrained(
    "unsloth/Qwen2-VL-2B-Instruct-bnb-4bit",
    load_in_4bit = True,
    use_gradient_checkpointing = "unsloth",
)

model = FastVisionModel.get_peft_model(
    model,
    finetune_vision_layers     = True, # False if not finetuning vision layers
    finetune_language_layers   = True, # False if not finetuning language layers
    finetune_attention_modules = True, # False if not finetuning attention layers
    finetune_mlp_modules       = True, # False if not finetuning MLP layers

    r = 4,           # The larger, the higher the accuracy, but might overfit
    lora_alpha = 8,  # Recommended alpha == r at least
    lora_dropout = 0.1,
    bias = "none",
    random_state = 3407,
    use_rslora = False,  # We support rank stabilized LoRA
    loftq_config = None, # And LoftQ
    # target_modules = "all-linear", # Optional now! Can specify a list if needed
)

def convert_to_conversation(image, caption):
    """Convert an image and caption to conversation format."""
    return {
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": instruction},
                    {"type": "image", "image": image},
                ],
            },
            {
                "role": "assistant",
                "content": [{"type": "text", "text": caption}],
            },
        ]
    }

with open(json_path, "r") as f:
    data = json.load(f)

dataset = []
for entry in data:
    image_path = os.path.join(image_dir, entry["image"])
    caption = entry["caption"]
    try:
        image = Image.open(image_path)  # Load image with PIL
        dataset.append(convert_to_conversation(image, caption))
    except FileNotFoundError:
        print(f"Error: Image not found -> {image_path}")


FastVisionModel.for_training(model) # Enable for training!

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    data_collator = UnslothVisionDataCollator(model, tokenizer), # Must use!
    train_dataset = dataset,
    args = SFTConfig(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,
        warmup_steps = 5,
        max_steps = 30,
        # num_train_epochs = 1, # Set this instead of max_steps for full training runs
        learning_rate = 1e-4,
        fp16 = not is_bf16_supported(),
        bf16 = is_bf16_supported(),
        logging_steps = 1,
        optim = "adamw_8bit",
        weight_decay = 0.01,
        lr_scheduler_type = "linear",
        seed = 3407,
        output_dir = "outputs",
        report_to = "none",     # For Weights and Biases

        # You MUST put the below items for vision finetuning:
        remove_unused_columns = False,
        dataset_text_field = "",
        dataset_kwargs = {"skip_prepare_dataset": True},
        dataset_num_proc = 4,
        max_seq_length = 2048,
    ),
)

trainer.train()


FastVisionModel.for_inference(model) # Enable for inference!

def perform_inference(image_path):
    image = Image.open(image_path).convert("RGB")
    messages = [
        {"role": "user", "content": [
            {"type": "image"},
            {"type": "text", "text": instruction}
        ]}
    ]
    input_text = tokenizer.apply_chat_template(messages, add_generation_prompt=True)
    inputs = tokenizer(image, input_text, add_special_tokens=False, return_tensors="pt").to("cuda")
    
    text_streamer = TextStreamer(tokenizer, skip_prompt=True)
    output = model.generate(**inputs, streamer=text_streamer, max_new_tokens=500,
                            use_cache=True, temperature=0.7, min_p=0.1)
    
    return tokenizer.batch_decode(output, skip_special_tokens=True)[0].strip()


for index, row in df.iterrows():
    image_path = os.path.join(image_folder, row["Image"])
    fine_tuned_response = perform_inference(image_path)
    
    df.at[index, "fine_tuned_response"] = fine_tuned_response
    print(f"✅ Processed {row['Image']}")

df.to_excel(output_excel, index=False)
print(f"📄 Results saved to {output_excel}")