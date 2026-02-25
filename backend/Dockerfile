# WeasyPrint needs system libs (Pango, Cairo, GObject). Railway's default image doesn't have them.
FROM python:3.13-slim-bookworm

# WeasyPrint: system libs + fonts (Docker has no fonts by default; WeasyPrint fails without them)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    fontconfig \
    fonts-liberation \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -fv

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
ENV PORT=8000
EXPOSE $PORT
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
