FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy shared library
COPY apps/hbys-common /app/hbys-common
RUN pip install --no-cache-dir -e /app/hbys-common 2>/dev/null || true

# Copy service requirements and install
COPY apps/hbys-emergency/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY apps/hbys-emergency/ /app/

EXPOSE 8107

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8107"]
