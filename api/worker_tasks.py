import base64
import json
import os
import pathlib
import subprocess
import sys
import time
import warnings

import requests
from pydantic import BaseModel
from redis import Redis
from rq import Queue

warnings.filterwarnings("ignore")

llm_general_model = os.getenv("LLM_GENERAL_MODEL", "google/gemma-4-12B-it")
llm_vision_model = os.getenv("LLM_VISION_MODEL", "google/gemma-4-12B-it")
llm_base_url = os.getenv("LLM_BASE_URL", "http://10.28.1.33:8000")
REMOTE_API_HOST = os.getenv("REMOTE_API_HOST", "10.28.1.33")


class Storyboard(BaseModel):
    frames: list[str]


def generate_text(prompt):
    print(f"Sending the following to {llm_general_model}: {prompt}")
    resp = requests.post(
        f"{llm_base_url}/v1/chat/completions",
        json={
            "model": llm_general_model,
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": prompt},
            ],
            "stream": False,
        },
    )

    return resp.json()["choices"][0]["message"]["content"]


def generate_text_as_json(prompt):
    resp = requests.post(
        f"{llm_base_url}/v1/chat/completions",
        json={
            "model": llm_general_model,
            "messages": [
                {"role": "user", "content": prompt},
            ],
            "stream": False,
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "storyboard",
                    "schema": Storyboard.model_json_schema(),
                },
            },
        },
    )
    return resp.json()["choices"][0]["message"]["content"]


def generate_text_from_image(image, prompt):
    resp = requests.post(
        f"{llm_base_url}/v1/chat/completions",
        json={
            "model": llm_vision_model,
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image}"},
                        },
                    ],
                },
            ],
            "stream": False,
        },
    )
    return resp.json()["choices"][0]["message"]["content"]


def get_db():
    """Get or create an RQ queue."""
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    redis_conn = Redis(host=redis_host, port=redis_port, db=0)
    return redis_conn


def get_queue(queue_name: str = "default") -> Queue:
    """Get or create an RQ queue."""
    redis_host = os.getenv("REDIS_HOST", "localhost")
    redis_port = int(os.getenv("REDIS_PORT", "6379"))
    redis_conn = Redis(host=redis_host, port=redis_port, db=0)
    return Queue(queue_name, connection=redis_conn)


def generate_video() -> dict:
    """A task that simulates long-running work."""
    print(f"Running generate_video")
    db = get_db()
    db.set("generate_video", "PROCESSING")

    files = []
    for i in range(1, 11):
        files.append(
            (
                "images",
                db.get(
                    f"generated_photo_{i}",
                ),
            )
        )

    files.append(("song", db.get("generated_song")))

    response = requests.post(
        f"http://{REMOTE_API_HOST}:8003/generate_montage",
        files=files,
    )
    db.set("generated_video", response.content)

    print("generate_video completed")
    db.set("generate_video", "COMPLETED")

    return {
        "status": "completed",
        "message": "Task finished successfully",
    }


def generate_photos() -> dict:
    """A task that simulates long-running work."""
    print(f"Running generate_photos")
    db = get_db()
    db.set("generate_photos", "PROCESSING")

    user_photo = db.get("user_photo")

    for i in range(1, 11):
        print(f"Generating photo for storyboard frame {i}...")
        prompt = db.get(f"user_storyboard_frame_{i}").decode("utf-8")
        print(prompt)
        response = requests.post(
            f"http://{REMOTE_API_HOST}:8002/generate_photo",
            data={"prompt": prompt},
            files={"image": ("sample_photo.png", user_photo, "image/png")},
        )
        db.set(f"generated_photo_{i}", response.content)
        with open(f"generated_photo_{i}.png", "wb") as f:
            f.write(response.content)

    print("generate_photos completed")
    db.set("generate_photos", "COMPLETED")

    if db.get("generate_song") == b"COMPLETED":
        print("launching generate_video")
        queue = get_queue()
        queue.enqueue(generate_video)
    else:
        print("NOT launching generate_video")

    return {
        "status": "completed",
        "message": "Task finished successfully",
    }


def generate_storyboard() -> dict:
    # Check if photo exist, and re submit the job if it doesn't
    print(f"Running generate_storyboard")
    db = get_db()
    db.set("generate_storyboard", "PROCESSING")

    print("generating user_description")
    user_photo_b64 = base64.b64encode(db.get("user_photo")).decode("utf-8")
    user_description = generate_text_from_image(
        user_photo_b64, "Describe the person in this photo in one sentence. Be brief."
    )
    db.set("user_description", user_description)
    print(f"{user_description=}")

    # TODO: Wait for user_object and user_object to be available
    user_object = None
    user_location = None
    while not user_object or not user_location:
        print("Waiting for 'user_location' and 'user_object' to be available...")
        if db.get("user_object"):
            user_object = db.get("user_object").decode()
        if db.get("user_location"):
            user_location = db.get("user_location").decode()
        time.sleep(1)

    # TODO: Used structured output to avoid bad json
    print("Generating the 10 frame storyboard")
    storyboard_list = generate_text_as_json(
        f"Create a ten frame storyboard that describes a hero who really wants {user_object}. The hero description is: {user_description}. In the story, they should have to overcome an obstacle or nemesis, to get to their object.  The final storyboard frame should be the hero with the {user_object} in {user_location}. For each storyboard frame, describe the content in one short paragraph. Return output in raw json as a list of descriptions and nothing else. Don't specify the frame number in the description."
    )
    print(storyboard_list)
    storyboard_list = json.loads(storyboard_list)["frames"]
    for i in range(1, 11):
        print(f"saving storyboard frame {i}...\n{storyboard_list[i - 1]}")
        db.set(f"user_storyboard_frame_{i}", storyboard_list[i - 1])

    db.set("generate_storyboard", "COMPLETED")

    queue = get_queue()

    print("queuing generate_lyrics")
    queue.enqueue(generate_lyrics)
    db.set("generate_lyrics", "QUEUED")

    # print("queuing generate_voice")
    # queue.enqueue(generate_voice)
    # db.set("generate_voice", "QUEUED")

    queue = get_queue()
    queue.enqueue(generate_photos)
    db.set("generate_photos", "QUEUED")

    return {
        "status": "completed",
        "message": "Task finished successfully",
    }


def generate_song() -> dict:
    """A task that simulates long-running work."""
    print(f"Running generate_song")
    db = get_db()
    db.set("generate_song", "PROCESSING")

    lyrics = db.get("generated_lyrics").decode()
    print(lyrics)

    response = requests.post(
        f"http://{REMOTE_API_HOST}:8001/release_task",
        json={
            "prompt": "upbeat pop song",
            "lyrics": lyrics,
            "inference_steps": 20,
            "audio_duration": 60,
        },
    )
    print(response.status_code)
    print(response.json())

    task_id = response.json()["data"]["task_id"]
    print(task_id)

    while True:
        time.sleep(1)
        print(".", end="")
        response = requests.post(
            f"http://{REMOTE_API_HOST}:8001/query_result",
            json={"task_id_list": [task_id]},
        )
        if response.json()["data"][0]["status"] == 1:
            print("DONE")
            result = json.loads(response.json()["data"][0]["result"])
            print(result)
            audio_response = requests.get(
                f"http://{REMOTE_API_HOST}:8001{result[0]['file']}"
            )
            db.set("generated_song", audio_response.content)
            with open("generated_song.mp3", "wb") as f:
                f.write(audio_response.content)
            break
        elif response.json()["data"][0]["status"] == 2:
            print("FAILED")
            break

    # with pathlib.Path("sample_song.mp3").open("rb") as f:
    #    song_binary = f.read()
    # db.set("generated_song", song_binary)

    print("generate_song completed")
    db.set("generate_song", "COMPLETED")

    if db.get("generate_photos") == b"COMPLETED":
        print("launching generate_video")
        queue = get_queue()
        queue.enqueue(generate_video)
    else:
        print("NOT launching generate_video")

    return {
        "status": "completed",
        "message": "Task finished successfully",
    }


def generate_lyrics() -> dict:
    """A task that simulates long-running work."""
    print(f"Running generate_lyrics")
    db = get_db()
    db.set("generate_lyrics", "PROCESSING")
    user_object = db.get("user_object").decode()
    user_location = db.get("user_location").decode()

    prompt = f"Generate the lyrics to a 60 second long short song. Only output the lyrics, no other content. There should be two verses and no chorus. The lyrics should be 50 words or less. Don't include any lyrics metadata or time signatures. The song should be about a person that is trying to seek an item. Don't specify gender in the lyrics.\n\n"
    prompt += f"The item the person is seeking: {user_object}\n\n"
    # prompt += f"Favorite location: {user_location}\n\n"
    prompt += f"Storyboard:\n"

    for i in range(1, 11):
        print(f"getting storyboard frame {i}...")
        prompt += db.get(f"user_storyboard_frame_{i}").decode()
        prompt += "\n"

    lyrics = generate_text(prompt)
    db.set("generated_lyrics", lyrics)
    print(lyrics)
    print("generate_lyrics completed")
    db.set("generate_lyrics", "COMPLETED")

    print("launching generate_song")
    queue = get_queue()
    queue.enqueue(generate_song)
    db.set("generate_song", "QUEUED")

    return {
        "status": "completed",
        "message": "Task finished successfully",
    }


def generate_transcripts() -> dict:
    """A task that simulates long-running work."""

    print(f"Running generate_transcripts")
    db = get_db()
    db.set("generate_transcripts", "PROCESSING")

    ###
    # Generate transcripts
    ###

    # STT Audio1
    response = requests.post(
        f"http://{REMOTE_API_HOST}:8004/transcribe",
        files={"audio": ("audio.webm", db.get("user_audio1"), "audio/webm")},
    )
    print(response.json())
    transcript_audio1 = response.json()["text"]
    db.set("generated_transcript_audio1", transcript_audio1)
    print(f"{transcript_audio1=}")

    # STT Audio2
    response = requests.post(
        f"http://{REMOTE_API_HOST}:8004/transcribe",
        files={"audio": ("audio.webm", db.get("user_audio2"), "audio/webm")},
    )
    print(response.json())
    transcript_audio2 = response.json()["text"]
    db.set("generated_transcript_audio2", transcript_audio2)
    print(f"{transcript_audio2=}")

    print("generating user_object")
    user_object = generate_text(
        f"From the description below for a historical vocation, what primary small object would they be most interest in possessing. Response in a single word, or title: \n\n{transcript_audio2}"
    )
    db.set("user_object", user_object)
    print(f"{user_object=}")

    print("generating user_location")
    user_location = generate_text(
        f"Given the description below of a person's ideal vacation, what one single location would they like to visit most. Only respond with the title:\n\n{transcript_audio1}"
    )
    db.set("user_location", user_location)
    print(f"{user_location=}")

    db.set("generate_transcripts", "COMPLETED")

    return {
        "status": "completed",
        "message": "Task finished successfully",
    }


# Example task functions
def simple_task(name: str) -> str:
    """A simple task that returns a greeting."""
    print(f"Processing task for: {name}")
    return f"Hello, {name}!"


def long_running_task(duration: int = 5) -> dict:
    """A task that simulates long-running work."""
    print(f"Starting long task (duration: {duration}s)")
    time.sleep(duration)
    print("Long task completed")
    return {
        "status": "completed",
        "duration": duration,
        "message": "Task finished successfully",
    }


def process_data(data: list) -> dict:
    """Process a list of data items."""
    print(f"Processing {len(data)} items...")
    result = {
        "total_items": len(data),
        "sum": sum(data) if all(isinstance(x, (int, float)) for x in data) else None,
        "processed": True,
    }
    print(f"Processing complete: {result}")
    return result


def failing_task():
    """An example task that fails (for testing error handling)."""
    print("This task will fail...")
    raise ValueError("This is an intentional error for testing")
