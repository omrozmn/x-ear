# 🖥️ VNC Quick Start Guide

## 1️⃣ Setup (One-time)

```bash
cd x-ear/apps/api

# Add API key to .env
echo "VAST_API_KEY=your-key-here" >> .env

# Install VNC + Desktop
./vast_connect.sh vnc
```

⏱️ Installation takes ~5-10 minutes

## 2️⃣ Connect

### macOS (Built-in)
```
Finder → Go → Connect to Server (⌘K)
vnc://<IP>:5901
Password: xear2025
```

### Windows/Linux (VNC Viewer)
1. Download: https://www.realvnc.com/en/connect/download/viewer/
2. Connect to: `<IP>:5901`
3. Password: `xear2025`

### Secure Tunnel (Recommended)
```bash
# Terminal 1: Open tunnel
./vast_connect.sh tunnel

# Terminal 2: Connect VNC to localhost:5901
```

## 3️⃣ Desktop Shortcuts

- 🖥️ **Terminal** - Command line
- 🌐 **Firefox** - Web browser
- 🤖 **vLLM Control** - Start/stop AI server
- 📊 **System Monitor** - GPU stats

## 4️⃣ Start vLLM

Double-click **vLLM Control** on desktop, then:
```
1) Start vLLM Server
```

Wait 2-3 minutes for model to load.

## 5️⃣ Test API

In Terminal:
```bash
curl http://localhost:8000/v1/models
```

## 🔐 Security

**Default Password:** `xear2025`

**Change it:**
```bash
vncpasswd
vncserver -kill :1
vncserver :1
```

## 🆘 Help

**VNC not working?**
```bash
# SSH into instance
./vast_connect.sh ssh

# Check VNC status
vncserver -list

# Restart VNC
vncserver -kill :1
vncserver :1 -geometry 1920x1080 -depth 24
```

**Get instance IP:**
```bash
./vast_connect.sh info
```

**Full guide:** See `VAST_AI_GUIDE.md`
