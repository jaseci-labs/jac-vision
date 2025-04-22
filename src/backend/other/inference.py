import os

import pandas as pd
from PIL import Image
from transformers import TextStreamer
from unsloth import FastVisionModel

# --- CONFIGURABLES ---
image_folder = "inference_images"  # Folder with images to process
output_excel = "base_model_outputs.xlsx"
instruction = (
    "Describe this image as if analyzing a vehicle's condition for an insurance report."
)
max_tokens = 300
# ----------------------

model, tokenizer = FastVisionModel.from_pretrained(
    "unsloth/Qwen2-VL-2B-Instruct-bnb-4bit",
    load_in_4bit=True,
    use_gradient_checkpointing="unsloth",
)

FastVisionModel.for_inference(model)

text_streamer = TextStreamer(tokenizer, skip_prompt=True)

results = []

for filename in sorted(os.listdir(image_folder)):
    if filename.lower().endswith((".jpg", ".png", ".jpeg")):
        try:
            image_path = os.path.join(image_folder, filename)
            image = Image.open(image_path).convert("RGB")

            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "image"},
                        {"type": "text", "text": instruction},
                    ],
                }
            ]
            input_text = tokenizer.apply_chat_template(
                messages, add_generation_prompt=True
            )
            inputs = tokenizer(
                image,
                input_text,
                add_special_tokens=False,
                return_tensors="pt",
            ).to("cuda")

            output = model.generate(
                **inputs,
                streamer=text_streamer,
                max_new_tokens=300,
                use_cache=True,
                temperature=0.7,
                min_p=0.1,
            )

            decoded = tokenizer.batch_decode(output, skip_special_tokens=True)[
                0
            ].strip()

            results.append({"Image": filename, "Without Fine-tuning Response": decoded})
            print(f"✅ Processed {filename}")

        except Exception as e:
            print(f"❌ Error processing {filename}: {e}")

df = pd.DataFrame(results)
df.to_excel(output_excel, index=False)
print(f"📄 Excel saved to {output_excel}")
