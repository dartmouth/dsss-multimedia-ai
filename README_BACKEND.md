# README_BACKEND

## Install Dependencies

```text
sudo apt install ffmpeg
#sudo apt install redis-server
#sudo systemctl disable --now redis-server
```

## Launch Services

```shell
tmux new-session -d -s "dsss" -n "gpu" "nvtop"
# tmux new-window -t "dsss" -n "redis" "redis-server --bind 127.0.0.1 --requirepass mypassword"
tmux new-window -t "dsss" -n "llm" "./llm.sh"
tmux new-window -t "dsss" -n "musicbox" "./musicbox.sh"
tmux new-window -t "dsss" -n "photobooth" "./photobooth.sh"
tmux new-window -t "dsss" -n "montage" "./montage.sh"
```

## LLM

```shell
mkdir llm
#uvx hf download litert-community/gemma-4-E2B-it-litert-lm gemma-4-E2B-it.litertlm --local-dir ./llm
#uvx hf download litert-community/gemma-4-E4B-it-litert-lm gemma-4-E4B-it.litertlm --local-dir ./llm
uvx hf download litert-community/gemma-4-12B-it-litert-lm gemma-4-12B-it.litertlm --local-dir ./llm

export API_HOST="100.91.96.77"
curl http://$API_HOST:9379/v1/models
curl http://$API_HOST:9379/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemma4-12b,gpu",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Musicbox

### Setup Directories

```shell
mkdir -p ./musicbox/{outputs,checkpoints}
```

### Download Models

```shell
uvx hf download ACE-Step/Ace-Step1.5 --local-dir ./musicbox/checkpoints
uvx hf download ACE-Step/acestep-5Hz-lm-4B --local-dir ./musicbox/checkpoints/acestep-5Hz-lm-4B
uvx hf download ACE-Step/acestep-v15-turbo-shift3 --local-dir ./musicbox/checkpoints/acestep-v15-turbo-shift3
```

### Run Server

```shell
./musicbox.sh

# INFO:     Application startup complete.
# INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
```

### Test Music Generation

https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/Tutorial.md

```shell
uv run -w requests - <<EOF
import requests, time, json
API_HOST="100.91.96.77"
LYRICS="""
[Verse 1]
City lights blinking through the rain
Neon signs guide the midnight train
Empty streets echo with a beat
Heart is drumming to the rhythm of my feet

[Chorus]
Let it go, the night is ours to take,
We’ll break the rules for goodness sake,
Through the shadows we will find the dawn,
Keep believing and carry on.

[Verse 2]
Ticket stubs from a past mistake
Windshield wipers wash away the ache
Radio playing an old familiar tune
Driving fast under a silver moon

[Chorus]
Let it go, the night is ours to take,
We’ll break the rules for goodness sake,
Through the shadows we will find the dawn,
Keep believing and carry on.
"""

response = requests.post(
    f"http://{API_HOST}:8001/release_task",
    json={
        "prompt": "upbeat pop song, no buildup",
        "lyrics": LYRICS,
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
        f"http://{API_HOST}:8001/query_result",
        json={"task_id_list": [task_id]},
    )
    if response.json()["data"][0]["status"] == 1:
        print("DONE")
        result = json.loads(response.json()["data"][0]["result"])
        print(result)
        audio_response = requests.get(f"http://{API_HOST}:8001{result[0]['file']}")
        with open("output.mp3", "wb") as f:
            f.write(audio_response.content)
        break
    elif response.json()["data"][0]["status"] == 2:
        print("FAILED")
        break
EOF
```

## Photobooth

### Run Server

```shell
./photobooth.sh
```

### Test Image Generation

```shell
export API_HOST=100.91.96.77
for i in {1..10}; do
  curl -X POST http://$API_HOST:8002/generate_photo \
    -F "prompt=add a random hat in a random tropical location doing a random activity" \
    -F "image=@./samples/sample_photo.png" \
    --output "image$i.png"
done
```

## Montage Maker

### Run Server

```shell
./montage.sh
```

### Test Image Generation

```shell
export API_HOST=100.91.96.77
curl -X POST http://$API_HOST:8003/generate_montage \
  -F "images=@./samples/sample_image1.png" \
  -F "images=@./samples/sample_image2.png" \
  -F "images=@./samples/sample_image3.png" \
  -F "images=@./samples/sample_image4.png" \
  -F "images=@./samples/sample_image5.png" \
  -F "images=@./samples/sample_image6.png" \
  -F "images=@./samples/sample_image7.png" \
  -F "images=@./samples/sample_image8.png" \
  -F "images=@./samples/sample_image9.png" \
  -F "images=@./samples/sample_image10.png" \
  -F "song=@./samples/sample_song.mp3" \
  --output montage.mp4
```

