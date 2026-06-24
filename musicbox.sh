#!/bin/bash

PYTHONUNBUFFERED=1 \
ACESTEP_LM_BACKEND=pt \
ACESTEP_LM_MODEL_PATH=$PWD/musicbox/checkpoints/acestep-5Hz-lm-4B \
ACESTEP_CONFIG_PATH=$PWD/musicbox/checkpoints/acestep-v15-turbo-shift3 \
ACESTEP_PROJECT_ROOT=$PWD/musicbox/ \
ACESTEP_OUTPUT_DIR=$PWD/musicbox/outputs \
ACESTEP_TMPDIR=$PWD/musicbox/outputs \
uvx -p 3.12 --directory $PWD/musicbox --from git+https://github.com/ACE-Step/ACE-Step-1.5.git@v0.1.4 acestep-api --host 0.0.0.0 --port 8001
