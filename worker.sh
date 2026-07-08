#!/bin/bash

cd api
OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES \
uv run -w redis,rq,requests,pydantic python -u worker.py
