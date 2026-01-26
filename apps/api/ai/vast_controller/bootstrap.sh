#!/bin/bash
# X-Ear AI Instance Bootstrap Script
# Installs vLLM and Qwen2-VL-7B-Instruct for Vision/Smart AI tasks.

set -e

echo "Starting system update and dependency installation..."
apt-get update
apt-get install -y python3-pip git curl zstd libsm6 libxext6 libxrender-dev libxcb1 libgl1 libglib2.0-0

echo "Installing vLLM and core ML dependencies..."
# Using --no-cache-dir to save disk space during installation
pip install --no-cache-dir vllm torch transformers fastapi uvicorn

echo "Preparing models directory..."
mkdir -p /models
cd /models

# Vision model is preferred for Smart tasks
MODEL_ID="Qwen/Qwen2-VL-7B-Instruct"

echo "Starting vLLM OpenAI-compatible server..."
# Note: In a real bootstrap, we might pull from HF hub directly via vLLM
# dtype=float16 is used to fit and run efficiently on RTX 3090 (24GB VRAM)
nohup python3 -m vllm.entrypoints.openai.api_server \
  --model $MODEL_ID \
  --host 0.0.0.0 \
  --port 8000 \
  --dtype float16 \
  --trust-remote-code \
  > /root/vllm.log 2>&1 &

echo "Bootstrap command sent to background. Follow logs with: tail -f /root/vllm.log"
