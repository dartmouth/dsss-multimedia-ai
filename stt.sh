#!/bin/bash

export WHISPER_CACHE_DIR="./stt"
uv run -w "fastapi[standard],openai-whisper" fastapi run stt.py --port 8004 --workers 1
