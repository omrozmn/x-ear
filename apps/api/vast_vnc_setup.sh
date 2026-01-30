#!/bin/bash
# Vast.ai VNC + Desktop Setup Script
# Installs XFCE desktop + TigerVNC for GUI access

set -e

echo "🖥️  X-Ear Vast.ai VNC Setup"
echo "=============================="

# Update system
echo "📦 Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

# Install desktop environment (XFCE - lightweight)
echo "🎨 Installing XFCE desktop environment..."
apt-get install -y \
    xfce4 \
    xfce4-goodies \
    xfce4-terminal \
    dbus-x11 \
    x11-xserver-utils

# Install VNC server
echo "📡 Installing TigerVNC server..."
apt-get install -y tigervnc-standalone-server tigervnc-common

# Install useful tools
echo "🔧 Installing development tools..."
apt-get install -y \
    firefox \
    vim \
    nano \
    htop \
    git \
    curl \
    wget \
    python3-pip \
    python3-venv \
    build-essential

# Setup VNC password
echo "🔐 Setting up VNC password..."
mkdir -p ~/.vnc
echo "xear2025" | vncpasswd -f > ~/.vnc/passwd
chmod 600 ~/.vnc/passwd

# Create VNC startup script
echo "⚙️  Configuring VNC startup..."
cat > ~/.vnc/xstartup << 'EOF'
#!/bin/bash
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
export XKL_XMODMAP_DISABLE=1
export XDG_CURRENT_DESKTOP="XFCE"
export XDG_SESSION_DESKTOP="XFCE"

# Start XFCE
startxfce4 &
EOF

chmod +x ~/.vnc/xstartup

# Create VNC config
cat > ~/.vnc/config << 'EOF'
geometry=1920x1080
dpi=96
localhost=no
alwaysshared
EOF

# Kill any existing VNC servers
echo "🧹 Cleaning up existing VNC sessions..."
vncserver -kill :1 2>/dev/null || true
vncserver -kill :2 2>/dev/null || true

# Start VNC server
echo "🚀 Starting VNC server..."
vncserver :1 -geometry 1920x1080 -depth 24

# Get the VNC port
VNC_PORT=5901
VNC_DISPLAY=":1"

# Install vLLM and dependencies
echo "🤖 Installing vLLM and ML dependencies..."
pip3 install --no-cache-dir vllm torch transformers fastapi uvicorn

# Create desktop shortcuts
echo "🔗 Creating desktop shortcuts..."
mkdir -p ~/Desktop

# Terminal shortcut
cat > ~/Desktop/Terminal.desktop << 'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=Terminal
Comment=Xfce Terminal Emulator
Exec=xfce4-terminal
Icon=utilities-terminal
Terminal=false
Categories=System;TerminalEmulator;
EOF
chmod +x ~/Desktop/Terminal.desktop

# Firefox shortcut
cat > ~/Desktop/Firefox.desktop << 'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=Firefox
Comment=Web Browser
Exec=firefox
Icon=firefox
Terminal=false
Categories=Network;WebBrowser;
EOF
chmod +x ~/Desktop/Firefox.desktop

# vLLM Control script
cat > ~/Desktop/vLLM-Control.desktop << 'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=vLLM Control
Comment=Start/Stop vLLM Server
Exec=xfce4-terminal -e "bash -c 'bash /root/vllm_control.sh; exec bash'"
Icon=applications-science
Terminal=true
Categories=Development;
EOF
chmod +x ~/Desktop/vLLM-Control.desktop

# Create vLLM control script
cat > /root/vllm_control.sh << 'EOF'
#!/bin/bash

echo "🤖 vLLM Server Control Panel"
echo "=============================="
echo ""
echo "1) Start vLLM Server"
echo "2) Stop vLLM Server"
echo "3) View Logs"
echo "4) Test API"
echo "5) Exit"
echo ""
read -p "Select option: " choice

case $choice in
    1)
        echo "🚀 Starting vLLM server..."
        nohup python3 -m vllm.entrypoints.openai.api_server \
            --model Qwen/Qwen2-VL-7B-Instruct \
            --host 0.0.0.0 \
            --port 8000 \
            --dtype float16 \
            --trust-remote-code \
            > /root/vllm.log 2>&1 &
        echo "✅ vLLM started! Check logs: tail -f /root/vllm.log"
        ;;
    2)
        echo "🛑 Stopping vLLM server..."
        pkill -f vllm
        echo "✅ vLLM stopped!"
        ;;
    3)
        echo "📊 vLLM Logs (Ctrl+C to exit):"
        tail -f /root/vllm.log
        ;;
    4)
        echo "🧪 Testing API..."
        curl http://localhost:8000/v1/models
        ;;
    5)
        exit 0
        ;;
    *)
        echo "❌ Invalid option"
        ;;
esac

read -p "Press Enter to continue..."
EOF
chmod +x /root/vllm_control.sh

# Create system monitor script
cat > ~/Desktop/System-Monitor.desktop << 'EOF'
[Desktop Entry]
Version=1.0
Type=Application
Name=System Monitor
Comment=GPU and System Status
Exec=xfce4-terminal -e "watch -n 2 nvidia-smi"
Icon=utilities-system-monitor
Terminal=true
Categories=System;Monitor;
EOF
chmod +x ~/Desktop/System-Monitor.desktop

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me)

echo ""
echo "✅ VNC Setup Complete!"
echo "=============================="
echo ""
echo "📡 VNC Connection Info:"
echo "   Address: $PUBLIC_IP:$VNC_PORT"
echo "   Display: $VNC_DISPLAY"
echo "   Password: xear2025"
echo ""
echo "🔌 Connection Methods:"
echo ""
echo "   1. VNC Viewer (Recommended):"
echo "      Download: https://www.realvnc.com/en/connect/download/viewer/"
echo "      Connect to: $PUBLIC_IP:$VNC_PORT"
echo ""
echo "   2. macOS Screen Sharing:"
echo "      Finder → Go → Connect to Server"
echo "      vnc://$PUBLIC_IP:$VNC_PORT"
echo ""
echo "   3. SSH Tunnel (Secure):"
echo "      ssh -L 5901:localhost:5901 -i vast_temp_key -p <SSH_PORT> root@$PUBLIC_IP"
echo "      Then connect to: localhost:5901"
echo ""
echo "🔧 VNC Management:"
echo "   Start VNC: vncserver :1"
echo "   Stop VNC:  vncserver -kill :1"
echo "   List VNC:  vncserver -list"
echo ""
echo "📝 Desktop shortcuts created:"
echo "   - Terminal"
echo "   - Firefox"
echo "   - vLLM Control"
echo "   - System Monitor"
echo ""
echo "🔐 Security Note:"
echo "   VNC password: xear2025"
echo "   Change with: vncpasswd"
echo ""
