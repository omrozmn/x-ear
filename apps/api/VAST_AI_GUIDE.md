# Vast.ai Instance Management Guide

## 🚀 Quick Start

### 1. Setup API Key
Add to `x-ear/apps/api/.env`:
```bash
VAST_API_KEY=your-api-key-here
```

Get your API key from: https://console.vast.ai/ → Account Settings → API Key

### 2. Setup VNC + Desktop
```bash
cd x-ear/apps/api
./vast_connect.sh vnc
```

This will:
- ✅ Install XFCE desktop environment
- ✅ Setup TigerVNC server
- ✅ Create desktop shortcuts
- ✅ Install vLLM and dependencies
- ✅ Configure automatic startup

## 🖥️ VNC Connection

### Option 1: VNC Viewer (Recommended)
1. Download VNC Viewer: https://www.realvnc.com/en/connect/download/viewer/
2. Connect to: `<IP>:5901`
3. Password: `xear2025`

### Option 2: macOS Screen Sharing
1. Open Finder
2. Go → Connect to Server (⌘K)
3. Enter: `vnc://<IP>:5901`
4. Password: `xear2025`

### Option 3: SSH Tunnel (Secure)
```bash
# Open tunnel
./vast_connect.sh tunnel

# In another terminal, connect to localhost
# VNC Viewer: localhost:5901
```

## 🎨 Desktop Environment

### Pre-installed Applications
- **Firefox** - Web browser
- **Terminal** - XFCE Terminal
- **vLLM Control** - Start/stop vLLM server
- **System Monitor** - GPU and system stats

### Desktop Shortcuts
All shortcuts are on the desktop for quick access:
- 🖥️ Terminal
- 🌐 Firefox
- 🤖 vLLM Control
- 📊 System Monitor

## 🤖 vLLM Management

### Start vLLM Server
```bash
# In tmux window 1 or any shell pane
python3 -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen2-VL-7B-Instruct \
  --host 0.0.0.0 \
  --port 8000 \
  --dtype float16 \
  --trust-remote-code
```

### Test API
```bash
# Check if server is running
curl http://localhost:8000/v1/models

# Test completion
curl http://localhost:8000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen/Qwen2-VL-7B-Instruct",
    "prompt": "Hello, how are you?",
    "max_tokens": 50
  }'
```

### View Logs
```bash
tail -f /root/vllm.log
```

### Stop vLLM
```bash
pkill -f vllm
```

## 🚇 SSH Tunnel (Local Development)

Open tunnel to access vLLM from your local machine:
```bash
# In a separate terminal
./vast_connect.sh tunnel
```

This maps `localhost:8000` → `remote:8000`

Now you can access vLLM from your local machine:
```bash
curl http://localhost:8000/v1/models
```

## 📊 Monitoring

### GPU Status
```bash
nvidia-smi
# or
watch -n 1 nvidia-smi
```

### System Resources
```bash
# CPU/Memory
htop

# Disk usage
df -h

# Network
ss -tunap | grep :8000
```

### vLLM Metrics
```bash
# Request count
curl http://localhost:8000/metrics | grep request

# GPU memory
nvidia-smi --query-gpu=memory.used,memory.total --format=csv
```

## 🔧 Troubleshooting

### VNC not connecting
```bash
# Check VNC status
vncserver -list

# Restart VNC
vncserver -kill :1
vncserver :1 -geometry 1920x1080 -depth 24

# Check firewall
ufw status
```

### Change VNC password
```bash
vncpasswd
# Then restart VNC server
```

### Desktop not loading
```bash
# Check xstartup permissions
chmod +x ~/.vnc/xstartup

# Restart VNC
vncserver -kill :1
vncserver :1
```

### vLLM not starting
```bash
# Check logs
tail -100 /root/vllm.log

# Check GPU
nvidia-smi

# Check disk space
df -h

# Reinstall dependencies
pip install --upgrade vllm torch transformers
```

### SSH connection issues
```bash
# Check instance status
./vast_connect.sh info

# Verify key permissions
chmod 600 vast_temp_key

# Test connection
ssh -i vast_temp_key -p <PORT> -v root@<IP>
```

### Port 8000 already in use
```bash
# Find process
lsof -i :8000

# Kill process
kill -9 <PID>
```

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `./vast_connect.sh info` | Show instance information |
| `./vast_connect.sh ssh` | Simple SSH connection |
| `./vast_connect.sh tunnel` | Open SSH tunnel (port 8000) |
| `./vast_connect.sh vnc` | Setup VNC + Desktop environment |

## 🔐 Security Notes

- SSH key: `vast_temp_key` (ED25519)
- Public key is auto-injected on instance creation
- Key is used for all SSH connections
- Never commit the private key to git (already in .gitignore)

## 📚 Additional Resources

- [Vast.ai Documentation](https://vast.ai/docs/)
- [vLLM Documentation](https://docs.vllm.ai/)
- [Tmux Cheat Sheet](https://tmuxcheatsheet.com/)
- [Qwen2-VL Model Card](https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct)

## 💡 Tips

1. **Use VNC for GUI** - Full desktop experience with Firefox, terminals, etc.
2. **Monitor GPU usage** - Use the System Monitor desktop shortcut
3. **Use the tunnel** - Secure connection via SSH tunnel
4. **Check logs first** - Most issues are visible in vLLM logs
5. **Change default password** - Run `vncpasswd` to set a new password
6. **Screen resolution** - Edit `~/.vnc/config` to change resolution
