# Place this file inside backend/ (already done).
# When deploying on Railway/Render, set Root Directory = "backend" and this
# Dockerfile will be picked up automatically with no extra path config needed.

FROM python:3.11-slim

# Install the exiftool system binary — this is why we can't use a plain
# serverless/Nixpacks Python build. exiftool is a Perl program, not a pip package.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libimage-exiftool-perl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway/Render inject a $PORT env var at runtime — bind to it instead of a
# hardcoded port, falling back to 8000 for local `docker run` testing.
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
