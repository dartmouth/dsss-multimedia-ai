#!/bin/bash

uv run -w "fastapi[standard]" fastapi run montage.py --port 8003 --workers 1

