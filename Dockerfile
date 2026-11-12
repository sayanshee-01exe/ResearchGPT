# ── Stage 1: build the React frontend ──────────────────────────────────────────
FROM node:22-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ .
RUN npm run build

# ── Stage 2: Python backend serving the API + built frontend ──────────────────
FROM python:3.12

WORKDIR /app

# ── Layer 1: install deps (cached until requirements.txt changes) ─────────────
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Layer 2: backend package ───────────────────────────────────────────────────
COPY backend/ backend/

# ── Layer 3: documents ─────────────────────────────────────────────────────────
COPY documents/ documents/

# ── Layer 4: application files (change most often — last for cache efficiency) ─
COPY evaluate.py .
COPY main.py .
COPY goldens.json .

# ── Layer 5: built frontend static assets ──────────────────────────────────────
COPY --from=frontend-build /app/frontend/dist frontend/dist

EXPOSE 8000

# Hosts like Railway pass the port in $PORT; default to 8000 locally.
CMD ["sh", "-c", "uvicorn backend.api:app --host 0.0.0.0 --port ${PORT:-8000}"]
