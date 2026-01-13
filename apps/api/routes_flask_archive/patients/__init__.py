from flask import Blueprint

# Define the blueprint
patients_bp = Blueprint('patients', __name__)

# Import routes to register them with the blueprint
# We use local imports to avoid circular dependency issues at module level if possible,
# or relies on the fact that patients_bp is already defined here.
from . import read
from . import write
from . import bulk
from . import export
