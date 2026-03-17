#!/usr/bin/env python3
"""
Seed Device Technical Specifications — Global Hearing Aid Catalog

Updates inventory items with hearing aid technical specifications
(max_output_spl, max_gain, fitting_range_min, fitting_range_max)
based on brand and model matching.

Also seeds a `device_catalog` reference table with the full worldwide
device database (brand, model, device_type, channels, rechargeable,
bluetooth, regulatory status).

Falls back to device-type defaults when no exact brand/model match is found.

Usage:
    cd apps/api
    python scripts/seed_device_specs.py
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text, func
from sqlalchemy.orm import sessionmaker
from core.models import InventoryItem

# ---------------------------------------------------------------------------
# GLOBAL DEVICE CATALOG
# ---------------------------------------------------------------------------
# Each entry: {brand, model, device_type, max_output_spl, max_gain,
#              fitting_range_min, fitting_range_max, channels, rechargeable,
#              bluetooth, regulatory}
# ---------------------------------------------------------------------------

GLOBAL_DEVICE_CATALOG = [

    # -- Anaton --
    {"brand": "Anaton", "model": "Inova CIC", "device_type": "CIC",
     "max_output_spl": 108, "max_gain": 40, "fitting_range_min": 15, "fitting_range_max": 60,
     "channels": 12, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Inova HG+ SP", "device_type": "BTE",
     "max_output_spl": 133, "max_gain": 73, "fitting_range_min": 20, "fitting_range_max": 105,
     "channels": 12, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Inova ITC", "device_type": "ITC",
     "max_output_spl": 116, "max_gain": 50, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": 12, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Inova ITE", "device_type": "ITE",
     "max_output_spl": 120, "max_gain": 56, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": 12, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Lina BTE", "device_type": "BTE",
     "max_output_spl": 130, "max_gain": 66, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": 16, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Lina CIC", "device_type": "CIC",
     "max_output_spl": 110, "max_gain": 43, "fitting_range_min": 15, "fitting_range_max": 65,
     "channels": 16, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Lina GN SP", "device_type": "BTE",
     "max_output_spl": 136, "max_gain": 76, "fitting_range_min": 30, "fitting_range_max": 110,
     "channels": 16, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Lina HG+ UP", "device_type": "BTE",
     "max_output_spl": 139, "max_gain": 80, "fitting_range_min": 40, "fitting_range_max": 120,
     "channels": 16, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Lina IIC", "device_type": "IIC",
     "max_output_spl": 106, "max_gain": 36, "fitting_range_min": 15, "fitting_range_max": 55,
     "channels": 16, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Lina ITE", "device_type": "ITE",
     "max_output_spl": 118, "max_gain": 53, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": 16, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Sport BTE", "device_type": "BTE",
     "max_output_spl": 130, "max_gain": 68, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Sport Kids BTE", "device_type": "BTE",
     "max_output_spl": 133, "max_gain": 73, "fitting_range_min": 15, "fitting_range_max": 105,
     "channels": 16, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Sport RIC", "device_type": "RIC",
     "max_output_spl": 124, "max_gain": 56, "fitting_range_min": 10, "fitting_range_max": 85,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Tie Modular BTE", "device_type": "BTE",
     "max_output_spl": 130, "max_gain": 66, "fitting_range_min": 10, "fitting_range_max": 100,
     "channels": 32, "rechargeable": False, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Tie X BTE", "device_type": "BTE",
     "max_output_spl": 134, "max_gain": 73, "fitting_range_min": 10, "fitting_range_max": 105,
     "channels": 32, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Tie X RIC", "device_type": "RIC",
     "max_output_spl": 126, "max_gain": 58, "fitting_range_min": 10, "fitting_range_max": 90,
     "channels": 32, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Anaton", "model": "Tie XR RIC", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 62, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": 32, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},

    # -- Audibel --
    {"brand": "Audibel", "model": "Via AI BTE", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 82, "fitting_range_min": 30, "fitting_range_max": 120,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Audibel", "model": "Via AI CIC", "device_type": "CIC",
     "max_output_spl": 110, "max_gain": 40, "fitting_range_min": 15, "fitting_range_max": 55,
     "channels": 24, "rechargeable": False, "bluetooth": False, "regulatory": "FDA"},
    {"brand": "Audibel", "model": "Via AI ITE", "device_type": "ITE",
     "max_output_spl": 127, "max_gain": 60, "fitting_range_min": 10, "fitting_range_max": 85,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Audibel", "model": "Via AI RIC", "device_type": "RIC",
     "max_output_spl": 133, "max_gain": 68, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},

    # -- Audicus --
    {"brand": "Audicus", "model": "Aura", "device_type": "ITE",
     "max_output_spl": 115, "max_gain": 45, "fitting_range_min": 10, "fitting_range_max": 65,
     "channels": 8, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Audicus", "model": "Wave", "device_type": "RIC",
     "max_output_spl": 122, "max_gain": 52, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": 12, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},

    # -- Audien --
    {"brand": "Audien", "model": "Atom Pro 2", "device_type": "ITC",
     "max_output_spl": 110, "max_gain": 35, "fitting_range_min": 15, "fitting_range_max": 55,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "FDA"},

    # -- Audifon --
    {"brand": "Audifon", "model": "Baja SP", "device_type": "BTE",
     "max_output_spl": 140, "max_gain": 80, "fitting_range_min": 30, "fitting_range_max": 115,
     "channels": 16, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Audifon", "model": "Ino ITE", "device_type": "ITE",
     "max_output_spl": 118, "max_gain": 52, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": 12, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Audifon", "model": "Lewi BTE", "device_type": "BTE",
     "max_output_spl": 137, "max_gain": 77, "fitting_range_min": 10, "fitting_range_max": 105,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Audifon", "model": "Lewi R", "device_type": "RIC",
     "max_output_spl": 130, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},

    # -- Audio Service --
    {"brand": "Audio Service", "model": "G6 ITC", "device_type": "ITC",
     "max_output_spl": 115, "max_gain": 50, "fitting_range_min": 10, "fitting_range_max": 70,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Audio Service", "model": "G7 BTE", "device_type": "BTE",
     "max_output_spl": 133, "max_gain": 70, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Audio Service", "model": "G7 RIC", "device_type": "RIC",
     "max_output_spl": 129, "max_gain": 62, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},

    # -- Austar --
    {"brand": "Austar", "model": "BTE SP", "device_type": "BTE",
     "max_output_spl": 130, "max_gain": 60, "fitting_range_min": 20, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Austar", "model": "RIC 16ch", "device_type": "RIC",
     "max_output_spl": 120, "max_gain": 45, "fitting_range_min": 10, "fitting_range_max": 70,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},

    # -- Axtel --
    {"brand": "Axtel", "model": "Mini CIC", "device_type": "CIC",
     "max_output_spl": 107, "max_gain": 39, "fitting_range_min": 15, "fitting_range_max": 58,
     "channels": 8, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Axtel", "model": "Pro BTE", "device_type": "BTE",
     "max_output_spl": 130, "max_gain": 68, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Axtel", "model": "Pro RIC", "device_type": "RIC",
     "max_output_spl": 124, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 85,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},

    # -- Beltone --
    {"brand": "Beltone", "model": "Achieve", "device_type": "RIC",
     "max_output_spl": 136, "max_gain": 70, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Beltone", "model": "Amaze", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 65, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Beltone", "model": "Boost Ultra", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 83, "fitting_range_min": 30, "fitting_range_max": 120,
     "channels": 17, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Beltone", "model": "Imagine", "device_type": "RIC",
     "max_output_spl": 133, "max_gain": 67, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Beltone", "model": "Serene", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 58, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},

    # -- Bernafon --
    {"brand": "Bernafon", "model": "Alpha XT miniBTE", "device_type": "BTE",
     "max_output_spl": 119, "max_gain": 76, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Bernafon", "model": "Alpha XT miniRITE", "device_type": "RIC",
     "max_output_spl": 129, "max_gain": 72, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Bernafon", "model": "Encanta XT", "device_type": "RIC",
     "max_output_spl": 127, "max_gain": 68, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Bernafon", "model": "Leox SP", "device_type": "BTE",
     "max_output_spl": 138, "max_gain": 78, "fitting_range_min": 30, "fitting_range_max": 110,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Bernafon", "model": "Leox UP", "device_type": "BTE",
     "max_output_spl": 142, "max_gain": 85, "fitting_range_min": 40, "fitting_range_max": 120,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Bernafon", "model": "Viron 5", "device_type": "RIC",
     "max_output_spl": 124, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Bernafon", "model": "Viron 7", "device_type": "RIC",
     "max_output_spl": 125, "max_gain": 65, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Bernafon", "model": "Viron 9", "device_type": "RIC",
     "max_output_spl": 125, "max_gain": 65, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Bernafon", "model": "Zerena", "device_type": "RIC",
     "max_output_spl": 120, "max_gain": 58, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},

    # -- Cadenza --
    {"brand": "Cadenza", "model": "Fi6", "device_type": "CIC",
     "max_output_spl": 110, "max_gain": 35, "fitting_range_min": 15, "fitting_range_max": 55,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Cadenza", "model": "H7", "device_type": "BTE",
     "max_output_spl": 125, "max_gain": 45, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Cadenza", "model": "H77", "device_type": "BTE",
     "max_output_spl": 128, "max_gain": 50, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "CE"},

    # -- Coselgi --
    {"brand": "Coselgi", "model": "Aria BTE", "device_type": "BTE",
     "max_output_spl": 132, "max_gain": 72, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Coselgi", "model": "Aria RIC", "device_type": "RIC",
     "max_output_spl": 126, "max_gain": 65, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Coselgi", "model": "Mia CIC", "device_type": "CIC",
     "max_output_spl": 108, "max_gain": 42, "fitting_range_min": 15, "fitting_range_max": 60,
     "channels": 12, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},

    # -- Eargo --
    {"brand": "Eargo", "model": "Eargo 6", "device_type": "CIC",
     "max_output_spl": 108, "max_gain": 35, "fitting_range_min": 15, "fitting_range_max": 50,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Eargo", "model": "Eargo 7", "device_type": "CIC",
     "max_output_spl": 110, "max_gain": 38, "fitting_range_min": 15, "fitting_range_max": 55,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Eargo", "model": "Eargo SE", "device_type": "CIC",
     "max_output_spl": 105, "max_gain": 30, "fitting_range_min": 15, "fitting_range_max": 45,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "FDA"},
    {"brand": "Eargo", "model": "Link by Eargo", "device_type": "CIC",
     "max_output_spl": 108, "max_gain": 35, "fitting_range_min": 15, "fitting_range_max": 50,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},

    # -- Earnet --
    {"brand": "Earnet", "model": "Aria6 BTE", "device_type": "BTE",
     "max_output_spl": 130, "max_gain": 64, "fitting_range_min": 10, "fitting_range_max": 85,
     "channels": 16, "rechargeable": True, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Biyonix RIC", "device_type": "RIC",
     "max_output_spl": 129, "max_gain": 61, "fitting_range_min": 10, "fitting_range_max": 85,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Elite BTE", "device_type": "BTE",
     "max_output_spl": 136, "max_gain": 76, "fitting_range_min": 10, "fitting_range_max": 100,
     "channels": 32, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Elite ITE", "device_type": "ITE",
     "max_output_spl": 122, "max_gain": 56, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": 32, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Elite RIC", "device_type": "RIC",
     "max_output_spl": 130, "max_gain": 62, "fitting_range_min": 10, "fitting_range_max": 90,
     "channels": 32, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Fine BTE", "device_type": "BTE",
     "max_output_spl": 131, "max_gain": 69, "fitting_range_min": 10, "fitting_range_max": 90,
     "channels": 16, "rechargeable": False, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Fine RIC", "device_type": "RIC",
     "max_output_spl": 127, "max_gain": 57, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": 16, "rechargeable": False, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Earnet", "model": "King BTE", "device_type": "BTE",
     "max_output_spl": 140, "max_gain": 80, "fitting_range_min": 10, "fitting_range_max": 110,
     "channels": 49, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Earnet", "model": "King CIC", "device_type": "CIC",
     "max_output_spl": 114, "max_gain": 48, "fitting_range_min": 15, "fitting_range_max": 65,
     "channels": 49, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Earnet", "model": "King RIC", "device_type": "RIC",
     "max_output_spl": 133, "max_gain": 68, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": 49, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Nano3 BTE", "device_type": "BTE",
     "max_output_spl": 126, "max_gain": 56, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": 12, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Royal BTE", "device_type": "BTE",
     "max_output_spl": 134, "max_gain": 70, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Smart BTE", "device_type": "BTE",
     "max_output_spl": 134, "max_gain": 72, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Smart Kids BTE", "device_type": "BTE",
     "max_output_spl": 137, "max_gain": 77, "fitting_range_min": 15, "fitting_range_max": 105,
     "channels": 24, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Smart RIC", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 60, "fitting_range_min": 10, "fitting_range_max": 85,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Tie Modular", "device_type": "BTE",
     "max_output_spl": 136, "max_gain": 72, "fitting_range_min": 10, "fitting_range_max": 100,
     "channels": 32, "rechargeable": False, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Tie X BTE", "device_type": "BTE",
     "max_output_spl": 137, "max_gain": 77, "fitting_range_min": 10, "fitting_range_max": 105,
     "channels": 32, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Tie X RIC", "device_type": "RIC",
     "max_output_spl": 131, "max_gain": 63, "fitting_range_min": 10, "fitting_range_max": 90,
     "channels": 32, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Earnet", "model": "Tie XR RIC", "device_type": "RIC",
     "max_output_spl": 133, "max_gain": 67, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": 32, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},

    # -- Earsmate --
    {"brand": "Earsmate", "model": "F332", "device_type": "CIC",
     "max_output_spl": 108, "max_gain": 35, "fitting_range_min": 15, "fitting_range_max": 50,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Earsmate", "model": "G29", "device_type": "RIC",
     "max_output_spl": 114, "max_gain": 38, "fitting_range_min": 10, "fitting_range_max": 65,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Earsmate", "model": "G75D", "device_type": "BTE",
     "max_output_spl": 117, "max_gain": 45, "fitting_range_min": 10, "fitting_range_max": 70,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "CE"},

    # -- Elehear --
    {"brand": "Elehear", "model": "Alpha Pro", "device_type": "RIC",
     "max_output_spl": 119, "max_gain": 46, "fitting_range_min": 10, "fitting_range_max": 65,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},

    # -- Great-Ears --
    {"brand": "Great-Ears", "model": "G18D", "device_type": "RIC",
     "max_output_spl": 116, "max_gain": 42, "fitting_range_min": 10, "fitting_range_max": 65,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Great-Ears", "model": "G25", "device_type": "BTE",
     "max_output_spl": 120, "max_gain": 45, "fitting_range_min": 10, "fitting_range_max": 70,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "CE"},

    # -- Hansaton --
    {"brand": "Hansaton", "model": "AQ BTE SP", "device_type": "BTE",
     "max_output_spl": 133, "max_gain": 73, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Hansaton", "model": "AQ Sound SHD 5", "device_type": "RIC",
     "max_output_spl": 127, "max_gain": 58, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Hansaton", "model": "AQ Sound SHD 7", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 60, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Hansaton", "model": "AQ Sound SHD 9", "device_type": "RIC",
     "max_output_spl": 131, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},

    # -- Helix --
    {"brand": "Helix", "model": "Alfa W 100 RIE-MR", "device_type": "RIC",
     "max_output_spl": 120, "max_gain": 52, "fitting_range_min": 0, "fitting_range_max": 75,
     "channels": 12, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Helix", "model": "Alfa W 200 RIE-MR", "device_type": "RIC",
     "max_output_spl": 125, "max_gain": 58, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Helix", "model": "Alfa W 300 RIE-MR", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 62, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Helix", "model": "Alfa W 500 RIE-MR", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 68, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Helix", "model": "Alfa W 200 BTE", "device_type": "BTE",
     "max_output_spl": 130, "max_gain": 65, "fitting_range_min": 10, "fitting_range_max": 90,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Helix", "model": "Alfa W 300 BTE", "device_type": "BTE",
     "max_output_spl": 135, "max_gain": 72, "fitting_range_min": 10, "fitting_range_max": 100,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Helix", "model": "Alfa W 300 BTE SP", "device_type": "BTE",
     "max_output_spl": 138, "max_gain": 78, "fitting_range_min": 25, "fitting_range_max": 110,
     "channels": 20, "rechargeable": False, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Helix", "model": "Alfa W 200 ITE", "device_type": "ITE",
     "max_output_spl": 118, "max_gain": 50, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": 12, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Helix", "model": "Alfa W 300 CIC", "device_type": "CIC",
     "max_output_spl": 112, "max_gain": 44, "fitting_range_min": 15, "fitting_range_max": 60,
     "channels": 16, "rechargeable": False, "bluetooth": False, "regulatory": "CE"},

    # -- Interton --
    {"brand": "Interton", "model": "Move", "device_type": "BTE",
     "max_output_spl": 128, "max_gain": 60, "fitting_range_min": 10, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Interton", "model": "Ready", "device_type": "RIC",
     "max_output_spl": 120, "max_gain": 50, "fitting_range_min": 0, "fitting_range_max": 75,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},

    # -- Jabra --
    {"brand": "Jabra", "model": "Enhance Plus", "device_type": "ITE",
     "max_output_spl": 112, "max_gain": 40, "fitting_range_min": 10, "fitting_range_max": 60,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Jabra", "model": "Enhance Select 100", "device_type": "RIC",
     "max_output_spl": 118, "max_gain": 45, "fitting_range_min": 0, "fitting_range_max": 70,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Jabra", "model": "Enhance Select 200", "device_type": "RIC",
     "max_output_spl": 120, "max_gain": 48, "fitting_range_min": 0, "fitting_range_max": 75,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Jabra", "model": "Enhance Select 300", "device_type": "RIC",
     "max_output_spl": 122, "max_gain": 52, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},

    # -- Jinghao --
    {"brand": "Jinghao", "model": "JH-A39", "device_type": "RIC",
     "max_output_spl": 118, "max_gain": 42, "fitting_range_min": 10, "fitting_range_max": 65,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},
    {"brand": "Jinghao", "model": "JH-D16", "device_type": "ITE",
     "max_output_spl": 115, "max_gain": 40, "fitting_range_min": 10, "fitting_range_max": 60,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "CE"},
    {"brand": "Jinghao", "model": "JH-D26", "device_type": "BTE",
     "max_output_spl": 125, "max_gain": 50, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "CE"},

    # -- Kirkland --
    {"brand": "Kirkland", "model": "KS 10 BTE", "device_type": "BTE",
     "max_output_spl": 135, "max_gain": 72, "fitting_range_min": 10, "fitting_range_max": 100,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Kirkland", "model": "KS 10 RIC", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},

    # -- Lexie --
    {"brand": "Lexie", "model": "B1", "device_type": "RIC",
     "max_output_spl": 115, "max_gain": 42, "fitting_range_min": 10, "fitting_range_max": 60,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Lexie", "model": "B2 Plus", "device_type": "RIC",
     "max_output_spl": 117, "max_gain": 44, "fitting_range_min": 10, "fitting_range_max": 65,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},

    # -- MDHearing --
    {"brand": "MDHearing", "model": "Neo", "device_type": "BTE",
     "max_output_spl": 120, "max_gain": 50, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": 4, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "MDHearing", "model": "Volt+", "device_type": "BTE",
     "max_output_spl": 125, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": 4, "rechargeable": True, "bluetooth": False, "regulatory": "FDA"},

    # -- MicroTech --
    {"brand": "MicroTech", "model": "Mosaic AI BTE", "device_type": "BTE",
     "max_output_spl": 135, "max_gain": 72, "fitting_range_min": 10, "fitting_range_max": 100,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "MicroTech", "model": "Mosaic AI RIC", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 60, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 16, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},

    # -- Miracle-Ear --
    {"brand": "Miracle-Ear", "model": "Genius 5.0 BTE", "device_type": "BTE",
     "max_output_spl": 140, "max_gain": 82, "fitting_range_min": 10, "fitting_range_max": 115,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Miracle-Ear", "model": "Genius 5.0 ITE", "device_type": "ITE",
     "max_output_spl": 122, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Miracle-Ear", "model": "Genius 5.0 RIC", "device_type": "RIC",
     "max_output_spl": 136, "max_gain": 78, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},

    # -- NewSound --
    {"brand": "NewSound", "model": "VHP-220", "device_type": "BTE",
     "max_output_spl": 130, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "CE"},
    {"brand": "NewSound", "model": "VHP-602", "device_type": "ITE",
     "max_output_spl": 115, "max_gain": 42, "fitting_range_min": 10, "fitting_range_max": 65,
     "channels": None, "rechargeable": True, "bluetooth": False, "regulatory": "CE"},
    {"brand": "NewSound", "model": "Vivo 108", "device_type": "RIC",
     "max_output_spl": 118, "max_gain": 45, "fitting_range_min": 10, "fitting_range_max": 70,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "CE"},

    # -- NuEar --
    {"brand": "NuEar", "model": "Intro AI BTE UP", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 82, "fitting_range_min": 30, "fitting_range_max": 120,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "NuEar", "model": "Intro AI ITE", "device_type": "ITE",
     "max_output_spl": 127, "max_gain": 60, "fitting_range_min": 10, "fitting_range_max": 85,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "NuEar", "model": "Intro AI RIC", "device_type": "RIC",
     "max_output_spl": 133, "max_gain": 68, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},

    # -- Nuheara --
    {"brand": "Nuheara", "model": "IQbuds2 MAX", "device_type": "ITE",
     "max_output_spl": 112, "max_gain": 40, "fitting_range_min": 15, "fitting_range_max": 55,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},

    # -- Oticon --
    {"brand": "Oticon", "model": "CROS PX", "device_type": "RIC",
     "max_output_spl": 0, "max_gain": 0, "fitting_range_min": 0, "fitting_range_max": 0,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Intent 1 miniRITE", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 75, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Intent 2 miniRITE", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 75, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Intent 3 miniRITE", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 75, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Intent 4 miniRITE", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 75, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Intent miniBTE", "device_type": "BTE",
     "max_output_spl": 120, "max_gain": 78, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Jet", "device_type": "BTE",
     "max_output_spl": 128, "max_gain": 68, "fitting_range_min": 10, "fitting_range_max": 85,
     "channels": None, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Oticon", "model": "More 1 miniRITE", "device_type": "RIC",
     "max_output_spl": 130, "max_gain": 73, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "More 2 miniRITE", "device_type": "RIC",
     "max_output_spl": 130, "max_gain": 73, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "More 3 miniRITE", "device_type": "RIC",
     "max_output_spl": 130, "max_gain": 73, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Opn S 1", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Opn S 2", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Opn S 3", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Opn S BTE PP", "device_type": "BTE",
     "max_output_spl": 136, "max_gain": 76, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Own CIC", "device_type": "CIC",
     "max_output_spl": 108, "max_gain": 47, "fitting_range_min": 10, "fitting_range_max": 55,
     "channels": None, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Oticon", "model": "Own IIC", "device_type": "IIC",
     "max_output_spl": 108, "max_gain": 47, "fitting_range_min": 10, "fitting_range_max": 55,
     "channels": None, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Oticon", "model": "Own ITC", "device_type": "ITC",
     "max_output_spl": 115, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 70,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Own ITE", "device_type": "ITE",
     "max_output_spl": 120, "max_gain": 60, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Play PX", "device_type": "BTE",
     "max_output_spl": 135, "max_gain": 75, "fitting_range_min": 15, "fitting_range_max": 100,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Real 1 miniRITE", "device_type": "RIC",
     "max_output_spl": 131, "max_gain": 74, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Real 2 miniRITE", "device_type": "RIC",
     "max_output_spl": 131, "max_gain": 74, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Real 3 miniRITE", "device_type": "RIC",
     "max_output_spl": 131, "max_gain": 74, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Real miniBTE", "device_type": "BTE",
     "max_output_spl": 114, "max_gain": 76, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Ruby", "device_type": "RIC",
     "max_output_spl": 121, "max_gain": 58, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Xceed 1 SP", "device_type": "BTE",
     "max_output_spl": 142, "max_gain": 80, "fitting_range_min": 40, "fitting_range_max": 110,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Xceed 1 UP", "device_type": "BTE",
     "max_output_spl": 146, "max_gain": 87, "fitting_range_min": 50, "fitting_range_max": 120,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Xceed 2 SP", "device_type": "BTE",
     "max_output_spl": 142, "max_gain": 80, "fitting_range_min": 40, "fitting_range_max": 110,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Xceed 2 UP", "device_type": "BTE",
     "max_output_spl": 146, "max_gain": 87, "fitting_range_min": 50, "fitting_range_max": 120,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Xceed 3 SP", "device_type": "BTE",
     "max_output_spl": 142, "max_gain": 80, "fitting_range_min": 40, "fitting_range_max": 110,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Xceed 3 UP", "device_type": "BTE",
     "max_output_spl": 146, "max_gain": 87, "fitting_range_min": 50, "fitting_range_max": 120,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Xceed Play SP", "device_type": "BTE",
     "max_output_spl": 142, "max_gain": 80, "fitting_range_min": 40, "fitting_range_max": 110,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Xceed Play UP", "device_type": "BTE",
     "max_output_spl": 146, "max_gain": 87, "fitting_range_min": 50, "fitting_range_max": 120,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Zeal", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 75, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Oticon", "model": "Zircon", "device_type": "RIC",
     "max_output_spl": 124, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},

    # -- Otofonix --
    {"brand": "Otofonix", "model": "Encore", "device_type": "BTE",
     "max_output_spl": 120, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": 4, "rechargeable": True, "bluetooth": False, "regulatory": "FDA"},
    {"brand": "Otofonix", "model": "Helix", "device_type": "BTE",
     "max_output_spl": 118, "max_gain": 53, "fitting_range_min": 15, "fitting_range_max": 75,
     "channels": 4, "rechargeable": True, "bluetooth": False, "regulatory": "FDA"},

    # -- Philips --
    {"brand": "Philips", "model": "HearLink 9040 miniRITE", "device_type": "RIC",
     "max_output_spl": 130, "max_gain": 68, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Philips", "model": "HearLink 9050 CIC", "device_type": "CIC",
     "max_output_spl": 108, "max_gain": 47, "fitting_range_min": 10, "fitting_range_max": 55,
     "channels": None, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Philips", "model": "HearLink 9050 IIC", "device_type": "IIC",
     "max_output_spl": 108, "max_gain": 47, "fitting_range_min": 10, "fitting_range_max": 55,
     "channels": None, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Philips", "model": "HearLink 9050 ITC", "device_type": "ITC",
     "max_output_spl": 119, "max_gain": 56, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Philips", "model": "HearLink 9050 ITE", "device_type": "ITE",
     "max_output_spl": 119, "max_gain": 56, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Philips", "model": "HearLink 9050 miniBTE", "device_type": "BTE",
     "max_output_spl": 135, "max_gain": 75, "fitting_range_min": 0, "fitting_range_max": 105,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Philips", "model": "HearLink 9050 miniRITE", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 70, "fitting_range_min": 0, "fitting_range_max": 100,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Philips", "model": "HearLink BTE SP", "device_type": "BTE",
     "max_output_spl": 137, "max_gain": 78, "fitting_range_min": 20, "fitting_range_max": 110,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Philips", "model": "HearLink BTE UP", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 82, "fitting_range_min": 30, "fitting_range_max": 120,
     "channels": None, "rechargeable": False, "bluetooth": True, "regulatory": "both"},

    # -- Phonak --
    {"brand": "Phonak", "model": "Audeo Infinio R", "device_type": "RIC",
     "max_output_spl": 133, "max_gain": 72, "fitting_range_min": 20, "fitting_range_max": 95,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Audeo L 30", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 71, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": 8, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Audeo L 50", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 71, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": 12, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Audeo L 70", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 71, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": 16, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Audeo L 90", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 71, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": 20, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Audeo L R", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 71, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Audeo M", "device_type": "RIC",
     "max_output_spl": 130, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Audeo P 30", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 8, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Audeo P 50", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 12, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Audeo P 70", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 16, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Audeo P 90", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 20, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Audeo Sphere Infinio", "device_type": "RIC",
     "max_output_spl": 135, "max_gain": 76, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Bolero B", "device_type": "BTE",
     "max_output_spl": 130, "max_gain": 75, "fitting_range_min": 20, "fitting_range_max": 90,
     "channels": 20, "rechargeable": True, "bluetooth": False, "regulatory": "both"},
    {"brand": "Phonak", "model": "Bolero M", "device_type": "BTE",
     "max_output_spl": 132, "max_gain": 80, "fitting_range_min": 20, "fitting_range_max": 90,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "CROS Lumity", "device_type": "RIC",
     "max_output_spl": 0, "max_gain": 0, "fitting_range_min": 0, "fitting_range_max": 0,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Naida L SP", "device_type": "BTE",
     "max_output_spl": 138, "max_gain": 80, "fitting_range_min": 40, "fitting_range_max": 110,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Naida L UP", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 82, "fitting_range_min": 40, "fitting_range_max": 120,
     "channels": 20, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Naida M SP", "device_type": "BTE",
     "max_output_spl": 137, "max_gain": 78, "fitting_range_min": 30, "fitting_range_max": 105,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Naida M UP", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 82, "fitting_range_min": 30, "fitting_range_max": 120,
     "channels": 20, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Naida P SP", "device_type": "BTE",
     "max_output_spl": 138, "max_gain": 78, "fitting_range_min": 30, "fitting_range_max": 110,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Naida P UP", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 82, "fitting_range_min": 30, "fitting_range_max": 120,
     "channels": 20, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Sky L", "device_type": "BTE",
     "max_output_spl": 139, "max_gain": 80, "fitting_range_min": 15, "fitting_range_max": 120,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Sky M", "device_type": "BTE",
     "max_output_spl": 137, "max_gain": 78, "fitting_range_min": 15, "fitting_range_max": 110,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Slim Lumity", "device_type": "RIC",
     "max_output_spl": 125, "max_gain": 55, "fitting_range_min": 20, "fitting_range_max": 80,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Virto B", "device_type": "ITE",
     "max_output_spl": 112, "max_gain": 50, "fitting_range_min": 10, "fitting_range_max": 60,
     "channels": 20, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Phonak", "model": "Virto Infinio CIC", "device_type": "CIC",
     "max_output_spl": 110, "max_gain": 65, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": 20, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Phonak", "model": "Virto Infinio IIC", "device_type": "IIC",
     "max_output_spl": 110, "max_gain": 65, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": 20, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Phonak", "model": "Virto Infinio ITE", "device_type": "ITE",
     "max_output_spl": 110, "max_gain": 67, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Virto M", "device_type": "ITE",
     "max_output_spl": 113, "max_gain": 52, "fitting_range_min": 10, "fitting_range_max": 65,
     "channels": 20, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Phonak", "model": "Virto P", "device_type": "ITE",
     "max_output_spl": 116, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 70,
     "channels": 20, "rechargeable": False, "bluetooth": True, "regulatory": "both"},

    # -- ReSound --
    {"brand": "ReSound", "model": "ENZO Q", "device_type": "BTE",
     "max_output_spl": 142, "max_gain": 83, "fitting_range_min": 30, "fitting_range_max": 120,
     "channels": 17, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "LiNX Quattro BTE", "device_type": "BTE",
     "max_output_spl": 133, "max_gain": 72, "fitting_range_min": 20, "fitting_range_max": 95,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "LiNX Quattro RIE", "device_type": "RIC",
     "max_output_spl": 134, "max_gain": 67, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "Nexia 5 Micro RIE", "device_type": "RIC",
     "max_output_spl": 137, "max_gain": 72, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 12, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "Nexia 7 Micro RIE", "device_type": "RIC",
     "max_output_spl": 139, "max_gain": 74, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 14, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "Nexia 9 Micro RIE", "device_type": "RIC",
     "max_output_spl": 139, "max_gain": 74, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "Nexia BTE 77", "device_type": "BTE",
     "max_output_spl": 134, "max_gain": 74, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "Nexia BTE 88", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 82, "fitting_range_min": 30, "fitting_range_max": 120,
     "channels": 17, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "Nexia CIC", "device_type": "CIC",
     "max_output_spl": 110, "max_gain": 40, "fitting_range_min": 10, "fitting_range_max": 55,
     "channels": 17, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "ReSound", "model": "Nexia ITC", "device_type": "ITC",
     "max_output_spl": 120, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "Nexia ITE", "device_type": "ITE",
     "max_output_spl": 120, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "Nexia RIE 61", "device_type": "RIC",
     "max_output_spl": 139, "max_gain": 74, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "Nexia RIE 62", "device_type": "RIC",
     "max_output_spl": 139, "max_gain": 74, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "OMNIA BTE 77", "device_type": "BTE",
     "max_output_spl": 134, "max_gain": 73, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "OMNIA BTE 88", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 85, "fitting_range_min": 30, "fitting_range_max": 120,
     "channels": 17, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "OMNIA RIE 61", "device_type": "RIC",
     "max_output_spl": 137, "max_gain": 72, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "OMNIA RIE 62", "device_type": "RIC",
     "max_output_spl": 137, "max_gain": 72, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "OMNIA miniRIE", "device_type": "RIC",
     "max_output_spl": 136, "max_gain": 70, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "ONE BTE", "device_type": "BTE",
     "max_output_spl": 133, "max_gain": 72, "fitting_range_min": 20, "fitting_range_max": 95,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "ONE M&RIE", "device_type": "RIC",
     "max_output_spl": 127, "max_gain": 56, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "ReSound", "model": "ONE RIE", "device_type": "RIC",
     "max_output_spl": 135, "max_gain": 68, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 17, "rechargeable": True, "bluetooth": True, "regulatory": "both"},

    # -- Rexton --
    {"brand": "Rexton", "model": "BiCore B-Li", "device_type": "BTE",
     "max_output_spl": 132, "max_gain": 68, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Rexton", "model": "BiCore B-Li HP", "device_type": "BTE",
     "max_output_spl": 138, "max_gain": 78, "fitting_range_min": 20, "fitting_range_max": 110,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Rexton", "model": "BiCore R-Li", "device_type": "RIC",
     "max_output_spl": 130, "max_gain": 62, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Rexton", "model": "MotionCore B-Li", "device_type": "BTE",
     "max_output_spl": 130, "max_gain": 65, "fitting_range_min": 10, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Rexton", "model": "MyCore INOX CIC", "device_type": "CIC",
     "max_output_spl": 108, "max_gain": 40, "fitting_range_min": 10, "fitting_range_max": 55,
     "channels": None, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Rexton", "model": "Reach INOX CIC", "device_type": "CIC",
     "max_output_spl": 110, "max_gain": 42, "fitting_range_min": 10, "fitting_range_max": 60,
     "channels": None, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Rexton", "model": "Reach R-Li", "device_type": "RIC",
     "max_output_spl": 131, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Rexton", "model": "Reach SR", "device_type": "RIC",
     "max_output_spl": 125, "max_gain": 55, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},

    # -- Rion --
    {"brand": "Rion", "model": "HB-A2R RIC", "device_type": "RIC",
     "max_output_spl": 126, "max_gain": 58, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 12, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Rion", "model": "HB-G1 SP", "device_type": "BTE",
     "max_output_spl": 145, "max_gain": 85, "fitting_range_min": 40, "fitting_range_max": 120,
     "channels": 12, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Rion", "model": "HB-J1R BTE", "device_type": "BTE",
     "max_output_spl": 142, "max_gain": 80, "fitting_range_min": 30, "fitting_range_max": 115,
     "channels": 12, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Rion", "model": "HI-C2 CIC", "device_type": "CIC",
     "max_output_spl": 112, "max_gain": 42, "fitting_range_min": 15, "fitting_range_max": 60,
     "channels": 8, "rechargeable": False, "bluetooth": False, "regulatory": "both"},

    # -- Sennheiser --
    {"brand": "Sennheiser", "model": "All-Day Clear", "device_type": "RIC",
     "max_output_spl": 120, "max_gain": 48, "fitting_range_min": 10, "fitting_range_max": 70,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},

    # -- Signia --
    {"brand": "Signia", "model": "Active Pro IX", "device_type": "ITE",
     "max_output_spl": 112, "max_gain": 45, "fitting_range_min": 10, "fitting_range_max": 65,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Insio AX", "device_type": "ITE",
     "max_output_spl": 123, "max_gain": 58, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": 48, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Insio Charge&Go IX CIC", "device_type": "CIC",
     "max_output_spl": 125, "max_gain": 60, "fitting_range_min": 10, "fitting_range_max": 100,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Insio Charge&Go IX ITC", "device_type": "ITC",
     "max_output_spl": 125, "max_gain": 60, "fitting_range_min": 10, "fitting_range_max": 100,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Insio Charge&Go IX ITE", "device_type": "ITE",
     "max_output_spl": 125, "max_gain": 60, "fitting_range_min": 10, "fitting_range_max": 100,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Motion 13 5X", "device_type": "BTE",
     "max_output_spl": 135, "max_gain": 75, "fitting_range_min": 10, "fitting_range_max": 100,
     "channels": 32, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Motion 13 7X", "device_type": "BTE",
     "max_output_spl": 135, "max_gain": 75, "fitting_range_min": 10, "fitting_range_max": 100,
     "channels": 48, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Motion Charge&Go AX", "device_type": "BTE",
     "max_output_spl": 138, "max_gain": 78, "fitting_range_min": 10, "fitting_range_max": 115,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Motion Charge&Go IX", "device_type": "BTE",
     "max_output_spl": 140, "max_gain": 80, "fitting_range_min": 10, "fitting_range_max": 120,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Motion SP X", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 82, "fitting_range_min": 20, "fitting_range_max": 120,
     "channels": 48, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Motion UP X", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 82, "fitting_range_min": 20, "fitting_range_max": 120,
     "channels": 48, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Pure 312 3X", "device_type": "RIC",
     "max_output_spl": 130, "max_gain": 72, "fitting_range_min": 10, "fitting_range_max": 90,
     "channels": 24, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Pure 312 5X", "device_type": "RIC",
     "max_output_spl": 131, "max_gain": 74, "fitting_range_min": 10, "fitting_range_max": 90,
     "channels": 32, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Pure 312 7X", "device_type": "RIC",
     "max_output_spl": 131, "max_gain": 75, "fitting_range_min": 10, "fitting_range_max": 90,
     "channels": 48, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Pure Charge&Go AX", "device_type": "RIC",
     "max_output_spl": 138, "max_gain": 83, "fitting_range_min": 10, "fitting_range_max": 110,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Pure Charge&Go IX", "device_type": "RIC",
     "max_output_spl": 139, "max_gain": 84, "fitting_range_min": 10, "fitting_range_max": 115,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Silk Charge&Go IX", "device_type": "CIC",
     "max_output_spl": 115, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 80,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Silk X", "device_type": "CIC",
     "max_output_spl": 112, "max_gain": 50, "fitting_range_min": 10, "fitting_range_max": 70,
     "channels": 48, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Signia", "model": "Styletto AX", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 56, "fitting_range_min": 10, "fitting_range_max": 100,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Signia", "model": "Styletto IX", "device_type": "RIC",
     "max_output_spl": 129, "max_gain": 58, "fitting_range_min": 10, "fitting_range_max": 110,
     "channels": 48, "rechargeable": True, "bluetooth": True, "regulatory": "both"},

    # -- Sonic --
    {"brand": "Sonic", "model": "Captivate 100", "device_type": "RIC",
     "max_output_spl": 122, "max_gain": 60, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Sonic", "model": "Captivate BTE", "device_type": "BTE",
     "max_output_spl": 118, "max_gain": 72, "fitting_range_min": 10, "fitting_range_max": 90,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Sonic", "model": "Enchant 100", "device_type": "RIC",
     "max_output_spl": 118, "max_gain": 55, "fitting_range_min": 0, "fitting_range_max": 78,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Sonic", "model": "Radiant 100 miniRITE", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 70, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Sonic", "model": "Radiant BTE", "device_type": "BTE",
     "max_output_spl": 117, "max_gain": 74, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Sonic", "model": "Trek SP", "device_type": "BTE",
     "max_output_spl": 135, "max_gain": 75, "fitting_range_min": 30, "fitting_range_max": 100,
     "channels": None, "rechargeable": False, "bluetooth": False, "regulatory": "both"},

    # -- Sony --
    {"brand": "Sony", "model": "CRE-C10", "device_type": "ITE",
     "max_output_spl": 110, "max_gain": 38, "fitting_range_min": 15, "fitting_range_max": 55,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Sony", "model": "CRE-E10", "device_type": "RIC",
     "max_output_spl": 115, "max_gain": 45, "fitting_range_min": 10, "fitting_range_max": 65,
     "channels": None, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},

    # -- Starkey --
    {"brand": "Starkey", "model": "Evolv AI BTE 13", "device_type": "BTE",
     "max_output_spl": 133, "max_gain": 70, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": 24, "rechargeable": False, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Evolv AI BTE 675 UP", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 82, "fitting_range_min": 30, "fitting_range_max": 120,
     "channels": 24, "rechargeable": False, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Evolv AI BTE R", "device_type": "BTE",
     "max_output_spl": 135, "max_gain": 72, "fitting_range_min": 10, "fitting_range_max": 100,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Evolv AI CIC", "device_type": "CIC",
     "max_output_spl": 108, "max_gain": 38, "fitting_range_min": 15, "fitting_range_max": 55,
     "channels": 24, "rechargeable": False, "bluetooth": False, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Evolv AI IIC", "device_type": "IIC",
     "max_output_spl": 108, "max_gain": 38, "fitting_range_min": 15, "fitting_range_max": 55,
     "channels": 24, "rechargeable": False, "bluetooth": False, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Evolv AI ITC", "device_type": "ITC",
     "max_output_spl": 118, "max_gain": 52, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": 24, "rechargeable": False, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Evolv AI ITE", "device_type": "ITE",
     "max_output_spl": 118, "max_gain": 52, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": 24, "rechargeable": False, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Evolv AI RIC 312", "device_type": "RIC",
     "max_output_spl": 120, "max_gain": 52, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": 24, "rechargeable": False, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Evolv AI RIC R", "device_type": "RIC",
     "max_output_spl": 133, "max_gain": 68, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Genesis AI CIC NW", "device_type": "CIC",
     "max_output_spl": 110, "max_gain": 40, "fitting_range_min": 15, "fitting_range_max": 55,
     "channels": 24, "rechargeable": False, "bluetooth": False, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Genesis AI IIC NW", "device_type": "IIC",
     "max_output_spl": 105, "max_gain": 35, "fitting_range_min": 15, "fitting_range_max": 50,
     "channels": 24, "rechargeable": False, "bluetooth": False, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Genesis AI ITC R", "device_type": "ITC",
     "max_output_spl": 120, "max_gain": 52, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Genesis AI ITE R", "device_type": "ITE",
     "max_output_spl": 127, "max_gain": 60, "fitting_range_min": 10, "fitting_range_max": 85,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Genesis AI RIC 312", "device_type": "RIC",
     "max_output_spl": 118, "max_gain": 50, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": 24, "rechargeable": False, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Genesis AI RIC RT", "device_type": "RIC",
     "max_output_spl": 124, "max_gain": 55, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Genesis AI mRIC R", "device_type": "RIC",
     "max_output_spl": 133, "max_gain": 68, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Livio AI", "device_type": "RIC",
     "max_output_spl": 125, "max_gain": 55, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Livio Edge AI", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 60, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Muse iQ", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 60, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Omega AI BTE UP", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 82, "fitting_range_min": 30, "fitting_range_max": 120,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Omega AI CIC NW", "device_type": "CIC",
     "max_output_spl": 110, "max_gain": 40, "fitting_range_min": 15, "fitting_range_max": 55,
     "channels": 24, "rechargeable": False, "bluetooth": False, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Omega AI IIC NW", "device_type": "IIC",
     "max_output_spl": 105, "max_gain": 35, "fitting_range_min": 15, "fitting_range_max": 50,
     "channels": 24, "rechargeable": False, "bluetooth": False, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Omega AI ITC R", "device_type": "ITC",
     "max_output_spl": 120, "max_gain": 52, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Omega AI ITE R", "device_type": "ITE",
     "max_output_spl": 127, "max_gain": 60, "fitting_range_min": 10, "fitting_range_max": 85,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Omega AI RIC RT", "device_type": "RIC",
     "max_output_spl": 124, "max_gain": 55, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Omega AI mRIC", "device_type": "RIC",
     "max_output_spl": 133, "max_gain": 68, "fitting_range_min": 0, "fitting_range_max": 95,
     "channels": 24, "rechargeable": True, "bluetooth": True, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Picasso CIC", "device_type": "CIC",
     "max_output_spl": 120, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": 24, "rechargeable": False, "bluetooth": False, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Picasso ITC", "device_type": "ITC",
     "max_output_spl": 120, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": 24, "rechargeable": False, "bluetooth": False, "regulatory": "FDA"},
    {"brand": "Starkey", "model": "Picasso ITE", "device_type": "ITE",
     "max_output_spl": 120, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": 24, "rechargeable": False, "bluetooth": False, "regulatory": "FDA"},

    # -- Unitron --
    {"brand": "Unitron", "model": "Insera V-10 NW", "device_type": "CIC",
     "max_output_spl": 108, "max_gain": 40, "fitting_range_min": 10, "fitting_range_max": 55,
     "channels": 20, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Unitron", "model": "Insera V-R", "device_type": "ITE",
     "max_output_spl": 118, "max_gain": 52, "fitting_range_min": 10, "fitting_range_max": 75,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Unitron", "model": "Moxi Blu", "device_type": "RIC",
     "max_output_spl": 129, "max_gain": 61, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Unitron", "model": "Moxi V-312", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 60, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 20, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Unitron", "model": "Moxi V-R", "device_type": "RIC",
     "max_output_spl": 130, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Unitron", "model": "Moxi V-RT", "device_type": "RIC",
     "max_output_spl": 130, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 90,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Unitron", "model": "Stride Blu", "device_type": "BTE",
     "max_output_spl": 131, "max_gain": 69, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Unitron", "model": "Stride V-M", "device_type": "BTE",
     "max_output_spl": 130, "max_gain": 68, "fitting_range_min": 10, "fitting_range_max": 95,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Unitron", "model": "Stride V-PR", "device_type": "BTE",
     "max_output_spl": 135, "max_gain": 75, "fitting_range_min": 20, "fitting_range_max": 100,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Unitron", "model": "Stride V-SP", "device_type": "BTE",
     "max_output_spl": 138, "max_gain": 80, "fitting_range_min": 30, "fitting_range_max": 110,
     "channels": 20, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Unitron", "model": "Stride V-UP", "device_type": "BTE",
     "max_output_spl": 141, "max_gain": 82, "fitting_range_min": 40, "fitting_range_max": 120,
     "channels": 20, "rechargeable": False, "bluetooth": True, "regulatory": "both"},

    # -- Widex --
    {"brand": "Widex", "model": "Beyond 330", "device_type": "RIC",
     "max_output_spl": 127, "max_gain": 57, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": 15, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Widex", "model": "Beyond 440", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 58, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": 15, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Widex", "model": "Evoke 220", "device_type": "RIC",
     "max_output_spl": 127, "max_gain": 60, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": 15, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Widex", "model": "Evoke 330", "device_type": "RIC",
     "max_output_spl": 128, "max_gain": 62, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": 15, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Widex", "model": "Evoke 440", "device_type": "RIC",
     "max_output_spl": 129, "max_gain": 63, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": 15, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Widex", "model": "Magnify", "device_type": "RIC",
     "max_output_spl": 115, "max_gain": 50, "fitting_range_min": 0, "fitting_range_max": 80,
     "channels": 15, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Widex", "model": "Moment 110 mRIC", "device_type": "RIC",
     "max_output_spl": 129, "max_gain": 64, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 15, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Widex", "model": "Moment 220 mRIC", "device_type": "RIC",
     "max_output_spl": 130, "max_gain": 66, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 15, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Widex", "model": "Moment 330 mRIC", "device_type": "RIC",
     "max_output_spl": 131, "max_gain": 67, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 15, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Widex", "model": "Moment 440 mRIC", "device_type": "RIC",
     "max_output_spl": 131, "max_gain": 68, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 15, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Widex", "model": "Moment BTE 13 D", "device_type": "BTE",
     "max_output_spl": 128, "max_gain": 70, "fitting_range_min": 0, "fitting_range_max": 100,
     "channels": 15, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Widex", "model": "Moment CIC", "device_type": "CIC",
     "max_output_spl": 110, "max_gain": 45, "fitting_range_min": 0, "fitting_range_max": 60,
     "channels": 15, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Widex", "model": "Moment IIC", "device_type": "IIC",
     "max_output_spl": 110, "max_gain": 45, "fitting_range_min": 0, "fitting_range_max": 60,
     "channels": 15, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
    {"brand": "Widex", "model": "Moment ITC", "device_type": "ITC",
     "max_output_spl": 115, "max_gain": 52, "fitting_range_min": 0, "fitting_range_max": 70,
     "channels": 15, "rechargeable": False, "bluetooth": True, "regulatory": "both"},
    {"brand": "Widex", "model": "SmartRIC", "device_type": "RIC",
     "max_output_spl": 132, "max_gain": 69, "fitting_range_min": 0, "fitting_range_max": 85,
     "channels": 15, "rechargeable": True, "bluetooth": True, "regulatory": "both"},
    {"brand": "Widex", "model": "Unique 440", "device_type": "RIC",
     "max_output_spl": 124, "max_gain": 52, "fitting_range_min": 0, "fitting_range_max": 75,
     "channels": 15, "rechargeable": False, "bluetooth": False, "regulatory": "both"},
]

# ---------------------------------------------------------------------------
# Derive BRAND_MODEL_SPECS tuples from the catalog for inventory matching
# ---------------------------------------------------------------------------
# (brand_lower, model_substring_lower, max_output_spl, max_gain,
#  fitting_range_min, fitting_range_max)

BRAND_MODEL_SPECS = [
    (
        d["brand"].lower(),
        d["model"].lower(),
        d["max_output_spl"],
        d["max_gain"],
        d["fitting_range_min"],
        d["fitting_range_max"],
    )
    for d in GLOBAL_DEVICE_CATALOG
]

# ---------------------------------------------------------------------------
# Device-type fallback defaults (when no brand/model match)
# ---------------------------------------------------------------------------

DEVICE_TYPE_DEFAULTS = {
    "bte": {"max_output_spl": 135, "max_gain": 75, "fitting_range_min": 0, "fitting_range_max": 110},
    "ric": {"max_output_spl": 128, "max_gain": 60, "fitting_range_min": 0, "fitting_range_max": 90},
    "ite": {"max_output_spl": 120, "max_gain": 55, "fitting_range_min": 10, "fitting_range_max": 80},
    "itc": {"max_output_spl": 115, "max_gain": 50, "fitting_range_min": 10, "fitting_range_max": 70},
    "cic": {"max_output_spl": 110, "max_gain": 42, "fitting_range_min": 15, "fitting_range_max": 60},
    "iic": {"max_output_spl": 105, "max_gain": 35, "fitting_range_min": 15, "fitting_range_max": 50},
}

# Generic fallback for hearing aids when no style is determinable
GENERIC_HEARING_AID_DEFAULT = {
    "max_output_spl": 128,
    "max_gain": 55,
    "fitting_range_min": 0,
    "fitting_range_max": 85,
}


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def detect_style(name, model, features_str):
    """Try to detect the hearing aid style from name, model, or features text."""
    search_text = " ".join(filter(None, [name, model, features_str])).lower()
    for style in ("iic", "cic", "itc", "ite", "ric", "bte"):
        if style in search_text:
            return style
    style_names = {
        "behind the ear": "bte",
        "receiver in canal": "ric",
        "in the ear": "ite",
        "in the canal": "itc",
        "completely in canal": "cic",
        "invisible in canal": "iic",
    }
    for phrase, style in style_names.items():
        if phrase in search_text:
            return style
    return None


def match_brand_model(brand, model):
    """Try to find a matching spec entry by brand and model substring."""
    if not brand:
        return None
    brand_lower = brand.strip().lower()
    model_lower = (model or "").strip().lower()

    for spec_brand, spec_model, spl, gain, rmin, rmax in BRAND_MODEL_SPECS:
        if spec_brand != brand_lower:
            continue
        if spec_model in model_lower or model_lower in spec_model:
            return {
                "max_output_spl": spl,
                "max_gain": gain,
                "fitting_range_min": rmin,
                "fitting_range_max": rmax,
            }
    return None


def get_database_url():
    """Resolve database URL using the same logic as the application."""
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return db_url
    default_path = Path(__file__).resolve().parent.parent / "instance" / "xear_crm.db"
    return f"sqlite:///{default_path.as_posix()}"


# ---------------------------------------------------------------------------
# Reference catalog seeding
# ---------------------------------------------------------------------------

def seed_reference_catalog(session):
    """Create and populate the device_catalog reference table."""
    session.execute(text("""
        CREATE TABLE IF NOT EXISTS device_catalog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            brand TEXT,
            model TEXT,
            device_type TEXT,
            max_output_spl INTEGER,
            max_gain INTEGER,
            fitting_range_min INTEGER,
            fitting_range_max INTEGER,
            channels INTEGER,
            rechargeable BOOLEAN,
            bluetooth BOOLEAN,
            regulatory TEXT
        )
    """))
    session.commit()

    # Check how many rows already exist
    result = session.execute(text("SELECT COUNT(*) FROM device_catalog"))
    existing = result.scalar()
    if existing > 0:
        print(f"  device_catalog already has {existing} rows — clearing for fresh seed.")
        session.execute(text("DELETE FROM device_catalog"))
        session.commit()

    for d in GLOBAL_DEVICE_CATALOG:
        session.execute(
            text("""
                INSERT INTO device_catalog
                    (brand, model, device_type, max_output_spl, max_gain,
                     fitting_range_min, fitting_range_max, channels,
                     rechargeable, bluetooth, regulatory)
                VALUES
                    (:brand, :model, :device_type, :max_output_spl, :max_gain,
                     :fitting_range_min, :fitting_range_max, :channels,
                     :rechargeable, :bluetooth, :regulatory)
            """),
            {
                "brand": d["brand"],
                "model": d["model"],
                "device_type": d["device_type"],
                "max_output_spl": d["max_output_spl"],
                "max_gain": d["max_gain"],
                "fitting_range_min": d["fitting_range_min"],
                "fitting_range_max": d["fitting_range_max"],
                "channels": d.get("channels"),
                "rechargeable": d.get("rechargeable", False),
                "bluetooth": d.get("bluetooth", False),
                "regulatory": d.get("regulatory"),
            },
        )

    session.commit()
    print(f"  Seeded {len(GLOBAL_DEVICE_CATALOG)} entries into device_catalog.")


# ---------------------------------------------------------------------------
# Inventory update
# ---------------------------------------------------------------------------

def update_inventory_specs(session):
    """Update hearing-aid inventory items with technical specifications."""
    items = session.query(InventoryItem).filter(
        InventoryItem.category == "hearing_aid"
    ).all()

    print(f"Found {len(items)} hearing aid inventory items")

    updated_exact = 0
    updated_style = 0
    updated_generic = 0
    skipped = 0

    for item in items:
        if (item.max_output_spl is not None
                and item.max_gain is not None
                and item.fitting_range_min is not None
                and item.fitting_range_max is not None):
            skipped += 1
            continue

        specs = match_brand_model(item.brand, item.model)
        if specs:
            source = "brand/model"
            updated_exact += 1
        else:
            style = detect_style(item.name, item.model, item.features)
            if style and style in DEVICE_TYPE_DEFAULTS:
                specs = DEVICE_TYPE_DEFAULTS[style]
                source = f"style({style})"
                updated_style += 1
            else:
                specs = GENERIC_HEARING_AID_DEFAULT
                source = "generic"
                updated_generic += 1

        item.max_output_spl = specs["max_output_spl"]
        item.max_gain = specs["max_gain"]
        item.fitting_range_min = specs["fitting_range_min"]
        item.fitting_range_max = specs["fitting_range_max"]

        print(f"  [{source}] {item.brand or '?'} {item.model or '?'} -> "
              f"SPL={specs['max_output_spl']}, gain={specs['max_gain']}, "
              f"range={specs['fitting_range_min']}-{specs['fitting_range_max']} dB HL")

    session.commit()
    return updated_exact, updated_style, updated_generic, skipped


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    db_url = get_database_url()
    print(f"Using database: {db_url}")

    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    engine = create_engine(db_url, connect_args=connect_args)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # 1. Seed the reference catalog
        print("\n=== Seeding Reference Catalog ===")
        seed_reference_catalog(session)

        # 2. Update inventory items with specs
        print("\n=== Updating Inventory Specs ===")
        exact, style, generic, skipped = update_inventory_specs(session)

        # 3. Summary statistics
        brands = sorted({d["brand"] for d in GLOBAL_DEVICE_CATALOG})
        type_counts = {}
        for d in GLOBAL_DEVICE_CATALOG:
            dt = d["device_type"]
            type_counts[dt] = type_counts.get(dt, 0) + 1

        print("\n" + "=" * 55)
        print("  SEED SUMMARY")
        print("=" * 55)
        print(f"  Catalog entries:      {len(GLOBAL_DEVICE_CATALOG)}")
        print(f"  Unique brands:        {len(brands)}")
        print(f"  Device types:         {dict(sorted(type_counts.items()))}")
        print(f"  Inventory exact:      {exact}")
        print(f"  Inventory by style:   {style}")
        print(f"  Inventory generic:    {generic}")
        print(f"  Inventory skipped:    {skipped}")
        print(f"  Brands: {', '.join(brands)}")
        print("=" * 55)

    except Exception as exc:
        session.rollback()
        print(f"Error: {exc}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
