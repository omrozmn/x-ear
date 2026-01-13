
import os

CORE_MODELS_DIR = "core/models"
SHIM_DIR = "models"

def create_shims():
    if not os.path.exists(SHIM_DIR):
        os.makedirs(SHIM_DIR)
        
    # Create __init__.py shim
    with open(os.path.join(SHIM_DIR, "__init__.py"), "w") as f:
        f.write("# Legacy Shim for models package\n")
        f.write("from core.models import *  # noqa\n")

    # Iterate over files in core/models
    for filename in os.listdir(CORE_MODELS_DIR):
        if filename.endswith(".py") and filename != "__init__.py":
            module_name = filename[:-3]
            shim_path = os.path.join(SHIM_DIR, filename)
            
            with open(shim_path, "w") as f:
                f.write(f"# Legacy Shim for models.{module_name}\n")
                f.write(f"from core.models.{module_name} import *  # noqa\n")
            
            print(f"Created shim: {shim_path}")

if __name__ == "__main__":
    create_shims()
