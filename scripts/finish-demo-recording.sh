#!/usr/bin/env bash
set -euo pipefail
# Silent source footage only. Add human narration before any submission.
ffmpeg -hide_banner -loglevel error -y -i artifacts/velum-guided-demo-footage.webm -c:v libx264 -threads 2 -preset ultrafast -crf 23 -pix_fmt yuv420p -movflags +faststart artifacts/velum-guided-demo-footage.mp4
ffprobe -v error -select_streams v:0 -show_entries stream=width,height -show_entries format=duration -of json artifacts/velum-guided-demo-footage.mp4
