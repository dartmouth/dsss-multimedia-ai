#!/bin/bash

uv run -w "fastapi[standard],torch,diffusers,transformers,accelerate" fastapi run photobooth.py --port 8002 --workers 1

