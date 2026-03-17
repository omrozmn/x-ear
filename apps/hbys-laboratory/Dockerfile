FROM python:3.11-slim

WORKDIR /app

# Install shared library first
COPY apps/hbys-common /app/hbys-common
RUN pip install --no-cache-dir -e /app/hbys-common || true

# Install service dependencies
COPY apps/hbys-laboratory/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY apps/hbys-laboratory/ .

EXPOSE 8104

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8104"]
