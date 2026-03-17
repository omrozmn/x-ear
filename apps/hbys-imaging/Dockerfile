FROM python:3.11-slim

WORKDIR /app

# Install shared lib first
COPY ../hbys-common /tmp/hbys-common
RUN pip install --no-cache-dir /tmp/hbys-common && rm -rf /tmp/hbys-common

# Install service dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8106

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8106"]
