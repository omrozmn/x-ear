FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for xmlsec
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config \
    libxml2-dev \
    libxmlsec1-dev \
    libxmlsec1-openssl \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install hbys-common shared library
COPY ../hbys-common /tmp/hbys-common
RUN pip install --no-cache-dir /tmp/hbys-common

# Install service dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8103

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8103"]
