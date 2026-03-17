FROM python:3.11-slim

WORKDIR /app

# Install shared library
COPY apps/hbys-common /tmp/hbys-common
RUN pip install --no-cache-dir /tmp/hbys-common && rm -rf /tmp/hbys-common

# Install service dependencies
COPY apps/hbys-surgery/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY apps/hbys-surgery/ .

EXPOSE 8108

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8108"]
