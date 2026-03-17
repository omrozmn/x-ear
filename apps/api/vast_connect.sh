#!/bin/bash
# Vast.ai Instance Connection Helper
# Usage: ./vast_connect.sh [command]
# Commands: info, ssh, tunnel, screen

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KEY_PATH="$SCRIPT_DIR/vast_temp_key"

# Load environment variables (safely)
if [ -f "$SCRIPT_DIR/.env" ]; then
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key =~ ^#.*$ ]] && continue
        [[ -z $key ]] && continue
        # Export the variable
        export "$key=$value"
    done < <(grep -v '^#' "$SCRIPT_DIR/.env" | grep -v '^$')
fi

if [ -z "$VAST_API_KEY" ]; then
    echo "❌ Error: VAST_API_KEY not set in .env file"
    echo "Please add: VAST_API_KEY=your-api-key-here"
    exit 1
fi

# Get instance info
get_instance_info() {
    curl -s -H "Authorization: Bearer $VAST_API_KEY" \
        "https://console.vast.ai/api/v0/instances" | \
        python3 -c "
import sys, json
data = json.load(sys.stdin)
instances = data.get('instances', [])
if not instances:
    print('No instances found')
    sys.exit(1)
    
# Find RTX 3090 instance
for inst in instances:
    if inst.get('gpu_name') == 'RTX_3090':
        print(f\"Instance ID: {inst['id']}\")
        print(f\"Status: {inst.get('actual_status', 'unknown')}\")
        print(f\"IP: {inst.get('public_ipaddr', 'N/A')}\")
        print(f\"SSH Port: {inst.get('ssh_port', 'N/A')}\")
        print(f\"GPU Util: {inst.get('gpu_util', 0)}%\")
        sys.exit(0)
        
print('No RTX 3090 instance found')
sys.exit(1)
"
}

# Get SSH connection details
get_ssh_details() {
    curl -s -H "Authorization: Bearer $VAST_API_KEY" \
        "https://console.vast.ai/api/v0/instances" | \
        python3 -c "
import sys, json
data = json.load(sys.stdin)
instances = data.get('instances', [])
for inst in instances:
    if inst.get('gpu_name') == 'RTX_3090':
        print(f\"{inst.get('public_ipaddr')} {inst.get('ssh_port')}\")
        sys.exit(0)
sys.exit(1)
"
}

# Commands
case "${1:-info}" in
    info)
        echo "📊 Vast.ai Instance Information:"
        echo "================================"
        get_instance_info
        ;;
        
    ssh)
        echo "🔌 Connecting to Vast.ai instance..."
        read IP PORT <<< $(get_ssh_details)
        if [ -z "$IP" ]; then
            echo "❌ Could not get instance details"
            exit 1
        fi
        chmod 600 "$KEY_PATH"
        ssh -i "$KEY_PATH" -p "$PORT" -o StrictHostKeyChecking=no root@"$IP"
        ;;
        
    tunnel)
        echo "🚇 Opening SSH tunnel (local:8000 -> remote:8000)..."
        read IP PORT <<< $(get_ssh_details)
        if [ -z "$IP" ]; then
            echo "❌ Could not get instance details"
            exit 1
        fi
        chmod 600 "$KEY_PATH"
        echo "Tunnel: localhost:8000 -> $IP:8000"
        echo "Press Ctrl+C to close tunnel"
        ssh -i "$KEY_PATH" -p "$PORT" -o StrictHostKeyChecking=no \
            -L 8000:localhost:8000 -N root@"$IP"
        ;;
        
    vnc)
        echo "🖥️  Setting up VNC + Desktop environment..."
        read IP PORT <<< $(get_ssh_details)
        if [ -z "$IP" ]; then
            echo "❌ Could not get instance details"
            exit 1
        fi
        chmod 600 "$KEY_PATH"
        
        # Copy VNC setup script to remote
        echo "📤 Uploading VNC setup script..."
        scp -i "$KEY_PATH" -P "$PORT" -o StrictHostKeyChecking=no \
            "$SCRIPT_DIR/vast_vnc_setup.sh" root@"$IP":/root/
        
        # Run VNC setup script on remote
        echo "🚀 Installing desktop environment (this may take 5-10 minutes)..."
        ssh -i "$KEY_PATH" -p "$PORT" -o StrictHostKeyChecking=no -t root@"$IP" \
            "chmod +x /root/vast_vnc_setup.sh && /root/vast_vnc_setup.sh"
        ;;
        
    *)
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  info    - Show instance information (default)"
        echo "  ssh     - Connect via SSH"
        echo "  tunnel  - Open SSH tunnel (port 8000)"
        echo "  vnc     - Setup VNC + Desktop environment"
        echo ""
        echo "Examples:"
        echo "  $0 info"
        echo "  $0 ssh"
        echo "  $0 tunnel"
        echo "  $0 vnc"
        ;;
esac
