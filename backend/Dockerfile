# WeasyPrint needs system libs (Pango, Cairo, GObject). Railway's default image doesn't have them.
FROM python:3.13-slim-bookworm

# Install WeasyPrint system dependencies (see https://doc.courtbouillon.org/weasyprint/stable/first_steps.html)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
ENV PORT=8000
EXPOSE $PORT
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
