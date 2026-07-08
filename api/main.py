import base64
import os
import pathlib
import random
import string
from typing import List

from fastapi import FastAPI, File, UploadFile
from fastapi.staticfiles import StaticFiles
from redis import Redis
from rq import Queue, Worker
from worker_tasks import (
    generate_lyrics,
    generate_photos,
    generate_storyboard,
    generate_transcripts,
)

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
# ENVIRONMENT = os.getenv("ENVIRONMENT", "production")


# Queue setup
def get_queue(queue_name: str = "default") -> Queue:
    """Get or create an RQ queue."""
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    redis_conn = Redis(host=redis_host, port=redis_port, db=0)
    return Queue(queue_name, connection=redis_conn)


# Queue setup
def get_db():
    """Get or create an RQ queue."""
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    redis_conn = Redis(host=redis_host, port=redis_port, db=0)
    return redis_conn


def generate_random_string(length=8):
    # Define the pool of characters (letters and digits)
    characters = string.ascii_letters + string.digits
    # Use random.choices to pick 'k' characters and join them into a string
    random_string = "".join(random.choices(characters, k=length))
    return random_string


app = FastAPI(title="Minimalist API", version="1.0.0")


@app.get("/")
async def root():
    """Root endpoint returning a welcome message."""
    return {"message": "Welcome to the Minimalist FastAPI Application"}


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


# @app.get("/items/{item_id}")
# async def read_item(item_id: int, q: str | None = None):
#     """Get an item by ID with optional query parameter."""
#     result = {"item_id": item_id}
#     if q:
#         result["q"] = q
#     return result


@app.post("/api/photo")
async def upload_photo(file: UploadFile = File(...)):
    """Upload a photo file and save it as photo.jpg.

    Example:
        curl -X POST http://localhost:8000/api/photo \
            -F "file=@./sample_photo.png"
    """
    db = get_db()
    queue = get_queue()

    # Read the file content
    content = await file.read()

    db.set("user_photo", content)
    # Save the file to the current directory as photo.jpg
    # with open("photo.png", "wb") as f:
    #     f.write(content)

    queue.enqueue(generate_storyboard)
    db.set("generate_storyboard", "QUEUED")

    return {
        "message": "Photo uploaded and saved successfully",
    }


@app.post("/api/audio")
async def upload_audio(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...),
):
    """Upload 2 audio files (webm) and save them to disk.

    Example:
        curl -X POST http://localhost:8000/api/audio \
            -F "file1=@./sample_audio1.webm" \
            -F "file2=@./sample_audio2.webm"
    """

    for f in (file1, file2):
        if not (f.content_type or "").startswith("audio/"):
            print(f"Warning: unexpected content-type: {f.content_type}")

    db = get_db()

    # Save first file as webm
    content = await file1.read()
    db.set("user_audio1", content)
    # with open("audio1.webm", "wb") as f:
    #     f.write(content)

    # Save second file as webm
    content = await file2.read()
    db.set("user_audio2", content)
    # with open("audio2.webm", "wb") as f:
    #     f.write(content)

    queue = get_queue()

    job1 = queue.enqueue(generate_transcripts)
    db.set("generate_transcripts", "QUEUED")

    return {
        "message": "Audio files (webm) uploaded and saved successfully",
    }


@app.get("/api/job-status")
async def get_job_status():
    """Get the status of all jobs.

    Example:
        curl -X GET http://localhost:8000/api/job-status | jq
    """
    db = get_db()
    return {
        "generate_photos": db.get("generate_photos"),
        "generate_lyrics": db.get("generate_lyrics"),
        "generate_song": db.get("generate_song"),
        "generate_video": db.get("generate_video"),
        "generate_transcripts": db.get("generate_transcripts"),
        "generate_storyboard": db.get("generate_storyboard"),
    }


@app.get("/api/lyrics")
async def get_lyrics():
    """Get the generated lyrics from the database.

    Returns:
        dict: A dictionary containing the lyrics content or an error message if not found.

    Example:
        curl http://localhost:8000/api/lyrics
    """
    if ENVIRONMENT == "development":
        return {
            "lyrics": "**Verse 1**  \nOn a worn floor I’m standing, spiky hair in the glow,  \nA map tucked to my side, a path that only I know.  \nThe walls whisper secrets, the shadows all around—  \nI’m chasing a quiet promise that the Quill might be found.\n\n**Pre‑Chorus**  \nThe library waits, its doors heavy with runes,  \nInk curls like a storm that’s ready to swoon.  \nI tighten my grip on the faded lines,  \nReady to step where the old knowledge shines.\n\n**Chorus**  \nI’m looking for a Quill, silver‑blue light in the dark,  \nA feather that writes stories of the unseen spark.  \nThrough ink‑veiled whispers and a keeper’s fierce glare,  \nI’ll find the truth that lies hidden somewhere.\n\n**Verse 2**  \nA vortex of words tries to trap my steady stride,  \nI leap over the chaos, my focus on the tide.  \nPages become armor against a web of lore,  \nEach step draws me nearer to the prize I adore.\n\n**Bridge**  \nInk splashes like shards, a final storm breaks apart—  \nI breathe in the silence that steadies my heart.  \nThe pedestal glows, a pulse matching mine—  \nI reach out and feel the power that’s now mine.\n\n**Chorus**  \nI’ve found a Quill, silver‑blue light in the dark,  \nA feather that writes stories of the unseen spark.  \nWith ink no longer a barrier but a friend,  \nI’ll write new chapters that will never end.\n\n**Outro**  \nThe jungle‑jellyfish t‑shirt shimmers with every line,  \nThe potted tree sways as I leave the old behind.  \nA quiet triumph in my neutral face, now bright—  \nThe Quill in hand, I’ll write the future’s light."
        }

    db = get_db()
    lyrics = db.get("generated_lyrics")

    return {"lyrics": lyrics}


@app.get("/api/song")
async def get_song():
    """Get the generated song from the database as base64 encoded content.

    Returns:
        dict: A dictionary containing the base64 encoded song content or None if not found.

    Example:
        curl http://localhost:8000/api/song
    """
    if ENVIRONMENT == "development":
        with pathlib.Path("sample_song.mp3").open("rb") as f:
            song_binary = f.read()
        return {"song": base64.b64encode(song_binary).decode("utf-8")}

    db = get_db()
    song_binary = db.get("generated_song")

    if song_binary is None:
        return {"song": None}

    # Encode binary data to base64
    song_base64 = base64.b64encode(song_binary).decode("utf-8")

    return {"song": song_base64}


@app.get("/api/video")
async def get_video():
    """Get the generated video from the database as base64 encoded content.

    Returns:
        dict: A dictionary containing the base64 encoded video content or None if not found.

    Example:
        curl http://localhost:8000/api/video
    """
    if ENVIRONMENT == "development":
        with pathlib.Path("sample_video.mp4").open("rb") as f:
            video_binary = f.read()
        return {"video": base64.b64encode(video_binary).decode("utf-8")}

    db = get_db()
    video_binary = db.get("generated_video")

    if video_binary is None:
        return {"video": None}

    # Encode binary data to base64
    video_base64 = base64.b64encode(video_binary).decode("utf-8")

    return {"video": video_base64}


@app.get("/api/photo_details")
async def get_photo_details():
    db = get_db()

    result = {}

    for i in range(1, 11):
        result[f"generated_photo_{i}"] = base64.b64encode(
            db.get(f"generated_photo_{i}")
        ).decode("utf-8")

    for i in range(1, 11):
        result[f"user_storyboard_frame_{i}"] = db.get(f"user_storyboard_frame_{i}")

    result["user_photo"] = base64.b64encode(db.get("user_photo")).decode("utf-8")

    return {"photo": result}


@app.get("/api/interview_details")
async def get_interview_details():

    db = get_db()

    return {
        "interview": {
            "generated_transcript_audio1": db.get("generated_transcript_audio1"),
            "generated_transcript_audio2": db.get("generated_transcript_audio2"),
            "user_object": db.get("user_object"),
            "user_location": db.get("user_location"),
        }
    }


@app.get("/api/storyboard_details")
async def get_storyboard_details():

    db = get_db()

    result = {}
    for i in range(1, 11):
        result[f"user_storyboard_frame_{i}"] = db.get(f"user_storyboard_frame_{i}")

    result["user_description"] = db.get("user_description")

    return {"storyboard": result}


@app.post("/api/reset")
async def reset():
    """Reset the application by deleting all generate_* keys from Redis and removing audio/photo files.

    This endpoint:
    - Deletes all generate_* keys from the Redis database
    - Removes audio1.mp3, audio2.mp3, audio3.mp3, and photo.jpg files

    Example:
        curl -X POST http://localhost:8000/api/reset | jq
    """
    db = get_db()

    # TODO: Kill all jobs running
    # TODO: Remove any jobs from the redis queue

    # Delete all generate_* keys from Redis
    deleted_keys = []
    for key in db.scan_iter("generate_*"):
        db.delete(key)
        deleted_keys.append(key.decode("utf-8") if isinstance(key, bytes) else key)

    for key in db.scan_iter("generated_*"):
        db.delete(key)
        deleted_keys.append(key.decode("utf-8") if isinstance(key, bytes) else key)

    for key in db.scan_iter("user_*"):
        db.delete(key)
        deleted_keys.append(key.decode("utf-8") if isinstance(key, bytes) else key)

    # Delete the specified files
    files_to_delete = [
        "generated_song.mp3",
        "generated_video.mp4",
        "generated_final_video.mp4",
        "generated_photo_1.png",
        "generated_photo_2.png",
        "generated_photo_3.png",
        "generated_photo_4.png",
        "generated_photo_5.png",
        "generated_photo_6.png",
        "generated_photo_7.png",
        "generated_photo_8.png",
        "generated_photo_9.png",
        "generated_photo_10.png",
    ]
    deleted_files = []
    for filename in files_to_delete:
        if os.path.exists(filename):
            os.remove(filename)
            deleted_files.append(filename)

    return {
        "message": "Reset completed successfully",
        "deleted_keys": deleted_keys,
        # "deleted_files": deleted_files,
    }


app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="frontend")
