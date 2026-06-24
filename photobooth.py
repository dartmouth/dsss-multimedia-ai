from io import BytesIO

import torch
from diffusers import Flux2KleinPipeline
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import Response
from PIL import Image

app = FastAPI()

device = (
    "cuda"
    if torch.cuda.is_available()
    else "mps"
    if torch.backends.mps.is_available()
    else "cpu"
)
dtype = torch.bfloat16 if device != "cpu" else torch.float32

image_pipe = Flux2KleinPipeline.from_pretrained(
    "black-forest-labs/FLUX.2-klein-4B", torch_dtype=dtype
)
image_pipe.to(device)


@app.post("/generate_photo")
async def generate_photo(prompt: str = Form(...), image: UploadFile = File(...)):
    # Read input image
    input_image = Image.open(BytesIO(await image.read()))

    # Generate image from prompt and input image
    result = image_pipe(
        image=input_image,
        prompt=prompt,
        height=480,
        width=640,
        guidance_scale=4.0,
        # guidance_scale=3.5,
        num_inference_steps=4,
        # num_inference_steps=28,
        # max_sequence_length=512,
    ).images[0]

    # Return as binary PNG
    img_io = BytesIO()
    result.save(img_io, format="PNG")
    img_io.seek(0)

    return Response(content=img_io.getvalue(), media_type="image/png")

