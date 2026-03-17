#!/bin/bash
# Start Vast.ai Controller as background daemon

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment
if [ -f ".env" ]; then
    export $(grep -v '^#' .env | grep VAST_API_KEY | xargs)
fi

if [ -z "$VAST_API_KEY" ]; then
    echo "❌ VAST_API_KEY not set in .env"
    exit 1
fi

# Check if already running
if [ -f "vast_controller.pid" ]; then
    PID=$(cat vast_controller.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo "⚠️  Controller already running (PID: $PID)"
        echo "Stop it first with: ./stop_controller.sh"
        exit 1
    fi
fi

echo "🚀 Starting Vast.ai Controller..."

# Start controller in background
nohup python3 vast_controller.py > vast_controller_output.log 2>&1 &
PID=$!

echo $PID > vast_controller.pid

echo "✅ Controller started (PID: $PID)"
echo ""
echo "📊 Monitor logs:"
echo "   tail -f vast_controller.log"
echo ""
echo "🛑 Stop controller:"
echo "   ./stop_controller.sh"
