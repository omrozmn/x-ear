import os
import time
import subprocess
import requests
import logging
from datetime import datetime

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.FileHandler("vast_controller.log"), logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Configuration from environment
VAST_KEY = os.environ.get("VAST_API_KEY")
MAX_PRICE = float(os.environ.get("MAX_PRICE", 0.12))
MIN_DISK = int(os.environ.get("MIN_DISK_GB", 40))
GPU_TYPE = os.environ.get("GPU_TYPE", "RTX_3090")
IDLE_MIN = int(os.environ.get("IDLE_MINUTES", 10))

API_BASE = "https://console.vast.ai/api/v0"
HEADERS = {"Authorization": f"Bearer {VAST_KEY}"}

def sh(cmd):
    """Execute shell command and return output."""
    try:
        return subprocess.check_output(cmd, shell=True).decode().strip()
    except subprocess.CalledProcessError as e:
        logger.error(f"Command failed: {cmd} - Error: {e}")
        return ""

def vast_get(path):
    """GET request to Vast AI API."""
    response = requests.get(f"{API_BASE}{path}", headers=HEADERS)
    response.raise_for_status()
    return response.json()

def vast_post(path, data=None):
    """POST request to Vast AI API."""
    response = requests.post(f"{API_BASE}{path}", headers=HEADERS, json=data)
    response.raise_for_status()
    return response.json()

def vast_put(path, data=None):
    """PUT request to Vast AI API."""
    response = requests.put(f"{API_BASE}{path}", headers=HEADERS, json=data)
    response.raise_for_status()
    return response.json()

def find_managed_instance():
    """Find an existing instance that matches our criteria."""
    data = vast_get("/instances")
    instances = data.get("instances", [])
    
    # Prioritize 'running' or 'loading' instances
    for inst in instances:
        if inst.get("gpu_name") == GPU_TYPE:
             # We manage any RTX 3090 we own for now
             return inst
    return None

def rent_new_instance():
    """Search for best offer and rent a new instance."""
    logger.info(f"Searching for new {GPU_TYPE} offers under ${MAX_PRICE}/hr...")
    # Simplified search query
    query = f"gpu_name={GPU_TYPE} num_gpus=1 dph<{MAX_PRICE} disk_space>={MIN_DISK} reliability>0.98"
    offers_data = vast_get(f"/bundles?q={query}")
    offers = offers_data.get("offers", [])
    
    if not offers:
        logger.warning("No suitable offers found at the moment.")
        return None
        
    best_offer = offers[0]
    logger.info(f"Renting instance from offer {best_offer['id']} at ${best_offer['dph_total']}/hr")
    
    # Configure onstart to set up SSH access immediately
    onstart_cmd = (
        "mkdir -p /root/.ssh; "
        "echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDC0k+ISzK89AXXo5eNnNCZDQzX/Dv8iOy+jE1tiDzO6 antigravity-temp' >> /root/.ssh/authorized_keys; "
        "chmod 700 /root/.ssh; chmod 600 /root/.ssh/authorized_keys"
    )
    
    config = {
        "image": "nvidia/cuda:12.1.0-devel-ubuntu22.04",
        "disk": MIN_DISK,
        "onstart_cmd": onstart_cmd
    }
    
    res = vast_put(f"/bundles/{best_offer['id']}/", data=config)
    if res.get("success"):
        logger.info(f"New instance contract created: {res.get('new_contract')}")
        return res
    return None

def health_check(ip, port):
    """Check if vLLM server is responding."""
    try:
        # vLLM OpenAI endpoint
        resp = requests.get(f"http://localhost:8000/v1/models", timeout=5)
        return resp.status_code == 200
    except:
        return False

def run_bootstrap(inst):
    """Copy and run bootstrap script on the remote instance."""
    ip = inst.get("public_ipaddr")
    port = inst.get("ssh_port")
    logger.info(f"Bootstrapping instance {inst['id']} at {ip}:{port}...")
    
    # Ensure local bootstrap file exists
    boot_path = os.path.join(os.path.dirname(__file__), "bootstrap.sh")
    
    # Use the temporary key we managed
    key_path = "../../vast_temp_key" # Relative to this script location
    
    cmd = f"ssh -n -p {port} -i {key_path} -o StrictHostKeyChecking=no root@{ip} 'bash -s' < {boot_path}"
    sh(cmd)

def main_loop():
    logger.info("X-Ear Vast AI Controller started.")
    
    while True:
        try:
            inst = find_managed_instance()
            
            if not inst:
                logger.info("No active instance found. Renting...")
                rent_new_instance()
                time.sleep(120) # Wait for provider to start provisioning
                continue
                
            status = inst.get("actual_status")
            iid = inst.get("id")
            
            if status == "stopped":
                logger.info(f"Instance {iid} is stopped. Starting...")
                vast_put(f"/instances/{iid}/", data={"state": "running"})
                time.sleep(30)
                continue
                
            if status == "running":
                ip = inst.get("public_ipaddr")
                port = inst.get("ssh_port")
                
                # Check server health (via local tunnel)
                # Note: Controller assumes tunnel is managed elsewhere or handles it
                if not health_check(ip, 8000):
                    logger.warning(f"Inference server not healthy on {iid}. Checking if bootstrap needed...")
                    # For simplicity, we trigger bootstrap if health fails and it's running
                    run_bootstrap(inst)
                
                # Idle Check
                gpu_util = inst.get("gpu_util", 0)
                if gpu_util is not None and gpu_util < 1:
                    # In a real scenario, we'd track timestamp of last activity
                    # and stop after IDLE_MIN. Here we just log for now.
                    logger.info(f"Instance {iid} is idle (GPU: {gpu_util}%).")
            
            elif status == "loading":
                logger.info(f"Instance {iid} is still loading...")
                
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
            
        time.sleep(60)

if __name__ == "__main__":
    if not VAST_KEY:
        print("Error: VAST_API_KEY environment variable not set.")
        exit(1)
    main_loop()
