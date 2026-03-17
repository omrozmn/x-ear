FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy shared library
COPY ../hbys-common/hbys_common /app/hbys_common

# Copy service code
COPY . /app

EXPOSE 8109

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8109"]
