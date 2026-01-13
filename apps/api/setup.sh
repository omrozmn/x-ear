#!/bin/bash
# Setup script for spaCy Backend Service

echo "🚀 Setting up PaddleOCR Backend Service for X-Ear CRM..."

# Create virtual environment
echo "📦 Creating Python virtual environment..."
python3 -m venv paddleocr-env

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source paddleocr-env/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

# Test PaddleOCR installation
echo "🧪 Testing PaddleOCR installation..."
python -c "
try:
    from paddleocr import PaddleOCR
    ocr = PaddleOCR()
    print('✅ PaddleOCR imported and initialized successfully')
except Exception as e:
    print(f'❌ PaddleOCR setup failed: {e}')
    exit(1)

# Test Flask
try:
    from flask import Flask
    print('✅ Flask imported successfully')
except:
    print('❌ Flask import failed')
    exit(1)

print('🎉 Setup completed successfully!')
"

echo ""
echo "🎯 Setup Complete!"
echo ""
echo "To start the PaddleOCR backend service:"
echo "1. Activate environment: source paddleocr-env/bin/activate"
echo "2. Start server: python app.py"
echo "3. Test endpoint: curl http://localhost:5000/health"
echo ""
echo "The service will be available at: http://localhost:5000"
echo ""
