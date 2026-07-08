import os
import tempfile
from io import BytesIO

import whisper
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import Response

whisper_cache_dir = os.getenv("WHISPER_CACHE_DIR", "/worker")

app = FastAPI()


whisper_model = whisper.load_model("medium", download_root=whisper_cache_dir)


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    print("Transcribing audio")
    temp_audio_file = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
    temp_audio_file.write(await audio.read())
    temp_audio_file.close()
    print(f"{temp_audio_file.name=}")
    result = whisper_model.transcribe(temp_audio_file.name)
    os.remove(temp_audio_file.name)
    return {"text": result["text"].strip()}
