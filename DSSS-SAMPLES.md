## Setup
import requests, time, json
REMOTE_API_HOST="10.28.1.33"
MODEL_NAME = "google/gemma-4-12B-it"

## Transcription

response = requests.get("https://audio-samples.github.io/samples/mp3/blizzard_tts_unbiased/sample-0/real.mp3")
mp3_data = response.content
# with open("sample.mp3", "rb") as file:
#     mp3_data = file.read()
response = requests.post(
    f"http://{REMOTE_API_HOST}:8004/transcribe",
    files={"audio": (mp3_data)},
)
print(response.json())

## Chat Completions
response = requests.post(
    f"http://{REMOTE_API_HOST}:8000/v1/chat/completions",
    json={
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "Generate the lyrics to a 60 second song. Only output the lyrics, no other content. There should be two verses and no chorus. The lyrics should be 50 words or less. Don't include any lyrics metadata or time signatures."},
        ],
        "stream": False,
    },
)
lyrics = response.json()["choices"][0]["message"]["content"]
print(lyrics)
    
## Generate Song - https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/Tutorial.md
response = requests.post(
    f"http://{REMOTE_API_HOST}:8001/release_task",
    json={
        "prompt": "upbeat pop song",
        "lyrics": lyrics,
        "inference_steps": 20,
        "audio_duration": 60,
    },
)
task_id = response.json()["data"]["task_id"]
print(f"Task ID: {task_id}")
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
        audio_response = requests.get(
            f"http://{REMOTE_API_HOST}:8001{result[0]['file']}"
        )
        with open("generated_song.mp3", "wb") as f:
            f.write(audio_response.content)
        print("generated_song.mp3 created")
        break
    elif response.json()["data"][0]["status"] == 2:
        print("FAILED")
        break

## Generate Photo
response = requests.get("https://raw.githubusercontent.com/dartmouth/dsss-multimedia-ai/main/samples/sample_photo.png")
photo_data = response.content
# with open("sample.png", "rb") as file:
#     photo_data = file.read()
prompt = "Add a crazy green hat"
response = requests.post(
    f"http://{REMOTE_API_HOST}:8002/generate_photo",
    data={"prompt": prompt},
    files={"image": ("sample_photo.png", photo_data, "image/png")},
)
with open(f"generated_photo.png", "wb") as f:
    f.write(response.content)
print("generated_photo.png created")

## Repo
git clone https://github.com/dartmouth/dsss-multimedia-ai
