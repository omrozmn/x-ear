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
    try:
        data = vast_get("/instances/")
        instances = data.get("instances", [])
        
        # Return any instance we own
        if instances:
            logger.info(f"Found {len(instances)} existing instance(s)")
            return instances[0]  # Return first instance
        
        logger.info("No existing instances found")
        return None
    except Exception as e:
        logger.error(f"Failed to get instances: {e}")
        return None

def destroy_instance(instance_id):
    """Destroy a failed/stuck instance."""
    logger.info(f"Destroying stuck instance {instance_id}...")
    try:
        requests.delete(f"{API_BASE}/instances/{instance_id}/", headers=HEADERS)
        logger.info(f"Instance {instance_id} destroyed")
        return True
    except Exception as e:
        logger.error(f"Failed to destroy instance: {e}")
        return False

def rent_new_instance():
    """Search for best offer and rent a new instance."""
    logger.info(f"Searching for new {GPU_TYPE} offers under ${MAX_PRICE}/hr...")
    
    # Correct query format for Vast.ai API
    query_string = f"gpu_name={GPU_TYPE} num_gpus=1 dph_total<{MAX_PRICE} disk_space>={MIN_DISK} reliability>0.98 verified=true"
    
    try:
        # Use simple query parameter
        offers_response = requests.get(
            f"{API_BASE}/bundles/",
            headers=HEADERS,
            params={"q": query_string}
        )
        offers_response.raise_for_status()
        offers_data = offers_response.json()
        offers = offers_data.get("offers", [])
    except Exception as e:
        logger.error(f"Failed to fetch offers: {e}")
        # Try without verified filter
        try:
            query_string = f"gpu_name={GPU_TYPE} num_gpus=1 dph_total<{MAX_PRICE} disk_space>={MIN_DISK}"
            offers_response = requests.get(
                f"{API_BASE}/bundles/",
                headers=HEADERS,
                params={"q": query_string}
            )
            offers_response.raise_for_status()
            offers_data = offers_response.json()
            offers = offers_data.get("offers", [])
        except Exception as e2:
            logger.error(f"Failed again: {e2}")
            return None
    
    if not offers:
        logger.warning("No suitable offers found at the moment.")
        return None
        
    best_offer = offers[0]
    offer_id = best_offer.get('id')
    logger.info(f"Renting instance from offer {offer_id} at ${best_offer.get('dph_total', 0):.3f}/hr")
    
    # Configure onstart to set up SSH access immediately
    ssh_key = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDC0k+ISzK89AXXo5eNnNCZDQzX/Dv8iOy+jE1tiDzO6 antigravity-temp"
    onstart_cmd = (
        "mkdir -p /root/.ssh && "
        f"echo '{ssh_key}' >> /root/.ssh/authorized_keys && "
        "chmod 700 /root/.ssh && chmod 600 /root/.ssh/authorized_keys"
    )
    
    rent_config = {
        "client_id": "me",
        "image": "nvidia/cuda:12.1.0-devel-ubuntu22.04",
        "disk": MIN_DISK,
        "onstart": onstart_cmd,
        "runtype": "ssh"
    }
    
    try:
        # Use /asks endpoint for renting
        rent_response = requests.put(f"{API_BASE}/asks/{offer_id}/", headers=HEADERS, json=rent_config)
        rent_response.raise_for_status()
        res = rent_response.json()
        
        if res.get("success"):
            logger.info(f"New instance contract created: {res.get('new_contract')}")
            return res
        else:
            logger.error(f"Rent failed: {res}")
            return None
    except Exception as e:
        logger.error(f"Failed to rent instance: {e}")
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
    
    # Correct bootstrap path
    boot_path = os.path.join(os.path.dirname(__file__), "ai/vast_controller/bootstrap.sh")
    
    if not os.path.exists(boot_path):
        logger.error(f"Bootstrap script not found: {boot_path}")
        return False
    
    # Use the SSH key
    key_path = os.path.join(os.path.dirname(__file__), "vast_temp_key")
    
    if not os.path.exists(key_path):
        logger.error(f"SSH key not found: {key_path}")
        return False
    
    cmd = f"ssh -n -p {port} -i {key_path} -o StrictHostKeyChecking=no root@{ip} 'bash -s' < {boot_path}"
    result = sh(cmd)
    logger.info(f"Bootstrap result: {result}")
    return True

def main_loop():
    logger.info("X-Ear Vast AI Controller started.")
    stuck_count = {}  # Track how long instances are stuck
    
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
            
            # Handle exited/stopped instances
            if status in ["exited", "stopped"]:
                logger.warning(f"Instance {iid} is {status}. Attempting to restart...")
                
                # Track stuck instances
                if iid not in stuck_count:
                    stuck_count[iid] = 0
                stuck_count[iid] += 1
                
                # If stuck for too long (5 attempts = 5 minutes), destroy and rent new
                if stuck_count[iid] > 5:
                    logger.error(f"Instance {iid} stuck in {status} for too long. Destroying...")
                    destroy_instance(iid)
                    stuck_count.pop(iid, None)
                    time.sleep(10)
                    logger.info("Renting new instance...")
                    rent_new_instance()
                    time.sleep(120)
                    continue
                
                # Try to start
                try:
                    vast_put(f"/instances/{iid}/", data={"state": "running"})
                    logger.info(f"Start command sent to instance {iid}")
                except Exception as e:
                    logger.error(f"Failed to start instance: {e}")
                
                time.sleep(60)
                continue
            
            # Handle loading state
            elif status == "loading":
                logger.info(f"Instance {iid} is loading...")
                
                # Track loading time
                if iid not in stuck_count:
                    stuck_count[iid] = 0
                stuck_count[iid] += 1
                
                # If loading for too long (10 attempts = 10 minutes), destroy
                if stuck_count[iid] > 10:
                    logger.error(f"Instance {iid} stuck in loading. Destroying...")
                    destroy_instance(iid)
                    stuck_count.pop(iid, None)
                    time.sleep(10)
                    rent_new_instance()
                    time.sleep(120)
                    continue
                    
            # Handle running state
            elif status == "running":
                # Reset stuck counter
                stuck_count.pop(iid, None)
                
                ip = inst.get("public_ipaddr")
                port = inst.get("ssh_port")
                
                logger.info(f"Instance {iid} is running at {ip}:{port}")
                
                # Check server health (via local tunnel)
                # Note: This requires tunnel to be open
                if not health_check(ip, 8000):
                    logger.warning(f"Inference server not healthy on {iid}. Running bootstrap...")
                    run_bootstrap(inst)
                
                # Idle Check
                gpu_util = inst.get("gpu_util", 0)
                if gpu_util is not None and gpu_util < 1:
                    logger.info(f"Instance {iid} is idle (GPU: {gpu_util}%).")
                    # TODO: Implement idle shutdown after IDLE_MIN minutes
                
        except Exception as e:
            logger.error(f"Error in main loop: {e}", exc_info=True)
            
        time.sleep(60)

if __name__ == "__main__":
    if not VAST_KEY:
        print("Error: VAST_API_KEY environment variable not set.")
        print("Set it in .env file or export VAST_API_KEY=your-key")
        exit(1)
    
    logger.info(f"Configuration:")
    logger.info(f"  GPU Type: {GPU_TYPE}")
    logger.info(f"  Max Price: ${MAX_PRICE}/hr")
    logger.info(f"  Min Disk: {MIN_DISK}GB")
    logger.info(f"  Idle Timeout: {IDLE_MIN} minutes")
    
    main_loop()
