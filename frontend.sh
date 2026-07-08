#!/bin/bash

cd api
export ENVIRONMENT=production
uv run -w "fastapi[standard],redis,rq,requests" fastapi run main.py --host localhost --port 8010 --workers 1
