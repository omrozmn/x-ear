#!/bin/bash
# Simple SSH Tunnel Script for Vast.ai
# Opens tunnels for VNC (5901) and vLLM (8000)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_PATH="$SCRIPT_DIR/vast_temp_key"

# Check if key exists
if [ ! -f "$KEY_PATH" ]; then
    echo "❌ SSH key not found: $KEY_PATH"
    exit 1
fi

chmod 600 "$KEY_PATH"

# Get connection details from user or API
if [ -z "$1" ] || [ -z "$2" ]; then
    echo "🔍 Checking Vast.ai for running instances..."
    
    # Try to get from API if key is available
    if [ -n "$VAST_API_KEY" ]; then
        python3 "$SCRIPT_DIR/check_vast.py" "$VAST_API_KEY"
        echo ""
        read -p "Enter IP address: " IP
        read -p "Enter SSH port: " PORT
    else
        echo ""
        echo "Usage: $0 <IP> <SSH_PORT>"
        echo ""
        echo "Example: $0 123.45.67.89 12345"
        echo ""
        echo "Or set VAST_API_KEY to auto-detect"
        exit 1
    fi
else
    IP="$1"
    PORT="$2"
fi

echo ""
echo "🚇 Opening SSH Tunnels..."
echo "=========================="
echo "Remote: root@$IP:$PORT"
echo "Tunnels:"
echo "  - VNC:  localhost:5901 → remote:5901"
echo "  - vLLM: localhost:8000 → remote:8000"
echo ""
echo "Press Ctrl+C to close tunnels"
echo ""

# Open tunnel with both ports
ssh -i "$KEY_PATH" -p "$PORT" -o StrictHostKeyChecking=no \
    -L 5901:localhost:5901 \
    -L 8000:localhost:8000 \
    -N root@"$IP"
