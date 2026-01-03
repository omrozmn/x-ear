from flask import Blueprint

# Define the blueprint
inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')

# Import routes to register them with the blueprint
from . import read
from . import write
from . import bulk
from . import metadata
