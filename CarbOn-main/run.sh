#!/usr/bin/env bash
# CarbOn'u yerelde başlatır
set -e
pip install -r requirements.txt
uvicorn app.main:app --reload --port "${PORT:-8000}"
