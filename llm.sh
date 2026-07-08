#!/bin/bash

docker rm -f gemma4
docker run -it --rm --name gemma4 \
  --ipc=host --network host --shm-size 16G --gpus all \
  -v ~/.cache/huggingface:/root/.cache/huggingface \
  vllm/vllm-openai:v0.24.0 \
    --model google/gemma-4-12B-it \
    --max-model-len 32768 \
    --max-num-seqs 25 \
    --gpu-memory-utilization 0.50 \
    --enable-auto-tool-choice \
    --reasoning-parser gemma4 \
    --tool-call-parser gemma4 \
    --limit-mm-per-prompt '{"image": 4, "audio": 1}' \
    --speculative-config '{"method":"mtp","model":"google/gemma-4-12B-it-assistant","num_speculative_tokens":4}' \
    --async-scheduling \
    --host 0.0.0.0 \
    --port 8000
