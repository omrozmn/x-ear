#!/bin/bash
# Stop Vast.ai Controller daemon

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -f "vast_controller.pid" ]; then
    echo "❌ Controller not running (no PID file)"
    exit 1
fi

PID=$(cat vast_controller.pid)

if ! ps -p $PID > /dev/null 2>&1; then
    echo "⚠️  Process $PID not found (already stopped?)"
    rm vast_controller.pid
    exit 0
fi

echo "🛑 Stopping controller (PID: $PID)..."
kill $PID

# Wait for process to stop
for i in {1..10}; do
    if ! ps -p $PID > /dev/null 2>&1; then
        echo "✅ Controller stopped"
        rm vast_controller.pid
        exit 0
    fi
    sleep 1
done

# Force kill if still running
echo "⚠️  Force killing..."
kill -9 $PID
rm vast_controller.pid
echo "✅ Controller force stopped"
