from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from io import BytesIO
from PIL import Image
import numpy as np
import requests
import logging
import os

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
app = FastAPI()

MODEL_DIR = Path(os.getenv("MODEL_DIR", Path(__file__).resolve().parent / "models"))
_MODEL_CACHE = {}
UPLOADS_BASE_URL = os.getenv("UPLOADS_BASE_URL")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust as needed for your security requirements
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def preprocess_image(_image, size):
    _image = _image.convert("RGB")
    img = _image.resize((size, size), Image.Resampling.LANCZOS)
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array /= 255.0
    return img_array

def predict_image(model, _image, size):
    preprocessed_image = preprocess_image(_image, size)
    prediction = model.predict(preprocessed_image)
    class_index = np.argmax(prediction)
    class_labels = ['Hyalomma', 'Rhipicephalus', "Unidentified"]
    predicted_class = class_labels[class_index]
    return predicted_class

def get_model(model_filename):
    cached_model = _MODEL_CACHE.get(model_filename)
    if cached_model is not None:
        return cached_model
    model_path = MODEL_DIR / model_filename
    loaded_model = load_model(model_path)
    _MODEL_CACHE[model_filename] = loaded_model
    return loaded_model

def build_image_url(domain, image_name):
    if UPLOADS_BASE_URL:
        return f"{UPLOADS_BASE_URL.rstrip('/')}/uploads/{image_name}"
    scheme = "https"
    if domain.startswith("localhost") or domain.startswith("127.0.0.1"):
        scheme = "http"
    return f"{scheme}://{domain}/uploads/{image_name}"

@app.get("/predict/")
async def get_results(imageName: str, modelInputFeatureSize: int, modelFilename: str, domain: str):
    try:
        logger.debug("Received request with params: imageName=%s, modelInputFeatureSize=%d, modelFilename=%s, domain=%s", 
                     imageName, modelInputFeatureSize, modelFilename, domain)

        loaded_model = get_model(modelFilename)

        url = build_image_url(domain, imageName)
        response = requests.get(url)
        response.raise_for_status()  # Raise an error for bad responses
        img = Image.open(BytesIO(response.content))

        result = predict_image(loaded_model, img, modelInputFeatureSize)

        return {"classification": result}

    except Exception as e:
        logger.error("Error processing request: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
