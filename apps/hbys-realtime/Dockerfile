FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared library
COPY ../hbys-common /app/hbys-common
ENV PYTHONPATH="/app:/app/hbys-common"

# Copy application code
COPY . /app

EXPOSE 8113

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8113"]
