import os
import pathlib
import random
import string
import subprocess
from io import BytesIO
from typing import List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response

app = FastAPI()


@app.post("/generate_montage")
async def generate_montage(
    images: List[UploadFile] = File(...), song: UploadFile = File(...)
):
    if len(images) != 10:
        raise HTTPException(status_code=400, detail="Exactly 10 images are required")

    prefix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))

    for i, image in enumerate(images):
        content = await image.read()
        filename = f"{prefix}_image_{i}.png"
        with open(filename, "wb") as f:
            f.write(content)

    song_filename = f"{prefix}_song.mp3"
    song_content = await song.read()
    with open(song_filename, "wb") as f:
        f.write(song_content)

    video_filename = f"{prefix}_video.mp4"
    montage_filename = f"{prefix}_final_video.mp4"

    subprocess.run(
        f'ffmpeg -y -loop 1 -t 7.4 -i {prefix}_image_0.png -loop 1 -t 7.4 -i {prefix}_image_1.png -loop 1 -t 7.4 -i {prefix}_image_2.png -loop 1 -t 7.4 -i {prefix}_image_3.png -loop 1 -t 7.4 -i {prefix}_image_4.png -loop 1 -t 7.4 -i {prefix}_image_5.png -loop 1 -t 7.4 -i {prefix}_image_6.png -loop 1 -t 7.4 -i {prefix}_image_7.png -loop 1 -t 7.4 -i {prefix}_image_8.png -loop 1 -t 7.4 -i {prefix}_image_9.png -filter_complex "[0][1]xfade=transition=dissolve:duration=1:offset=6.4[f1]; [f1][2]xfade=transition=dissolve:duration=1:offset=12.8[f2]; [f2][3]xfade=transition=dissolve:duration=1:offset=19.2[f3]; [f3][4]xfade=transition=dissolve:duration=1:offset=25.6[f4]; [f4][5]xfade=transition=dissolve:duration=1:offset=32[f5]; [f5][6]xfade=transition=dissolve:duration=1:offset=38.4[f6]; [f6][7]xfade=transition=dissolve:duration=1:offset=44.8[f7]; [f7][8]xfade=transition=dissolve:duration=1:offset=51.2[f8]; [f8][9]xfade=transition=dissolve:duration=1:offset=57.6,format=yuv420p[v]" -map "[v]" {video_filename}',
        shell=True,
    )
    subprocess.run(
        f"ffmpeg -y -i {video_filename} -i {song_filename} -c:v copy -c:a aac -shortest {montage_filename}",
        shell=True,
    )

    with pathlib.Path(montage_filename).open("rb") as f:
        video_binary = f.read()

    os.remove(montage_filename)
    os.remove(video_filename)
    os.remove(song_filename)

    for i, image in enumerate(images):
        os.remove(f"{prefix}_image_{i}.png")

    return Response(content=video_binary, media_type="video/mp4")

