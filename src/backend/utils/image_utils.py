import base64
from io import BytesIO

from PIL import Image


def encode_image(image_path: str) -> str:
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode("utf-8")


def process_uploaded_image(image_file):
    image_content = image_file.read()
    image_obj = Image.open(BytesIO(image_content)).convert("RGB")
    buffered = BytesIO()
    image_obj.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")
