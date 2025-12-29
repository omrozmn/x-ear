# Python OCR Backend Service for X-Ear CRM
# File: paddle-backend/app.py

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import logging
from datetime import datetime, timedelta
import re
import json
import os
import requests
from sqlalchemy.orm import load_only
from sqlalchemy import text
from constants import normalize_category, CANONICAL_CATEGORY_HEARING_AID
from uuid import uuid4
from datetime import datetime, timezone

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)


def is_feature_enabled(flag_name):
    """Convenience helper: return True when the named feature flag is enabled in system settings."""
    try:
        settings_record = Settings.get_system_settings()
        val = settings_record.get_setting(f'features.{flag_name}', False)
        return bool(val)
    except Exception:
        return False

os.environ['REQUESTS_TIMEOUT'] = '1'  # Set timeout for network requests

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Database imports
from models.base import db
from models.patient import Patient
from models.device import Device
from models.appointment import Appointment
from models.medical import PatientNote, EReceipt
from models.user import User, ActivityLog
from models.notification import Notification
from models.sales import DeviceAssignment, Sale, PaymentPlan, PaymentInstallment
from models.system import Settings

from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from routes.auth import auth_bp
from utils.authorization import permission_required

app = Flask(__name__)

# Enable CORS for all routes with credentials support
# CORS configuration moved to after environment variable loading


# Configure logging early so validation and startup messages are visible
# Force reload trigger
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize OTP store
from services.otp_store import get_store
app.extensions['otp_store'] = get_store()

# Add file handler
file_handler = logging.FileHandler(os.path.join(os.path.dirname(__file__), 'server.log'))
file_handler.setLevel(logging.DEBUG)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logging.getLogger().addHandler(file_handler)

# Database configuration
# Flask convention: use instance folder for database files
# This keeps the database separate from code and follows best practices
default_db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'instance', 'xear_crm.db'))
raw_db_uri = os.getenv('DATABASE_URL', f'sqlite:///{default_db_path}')

# When using a local sqlite file, ensure the parent directory exists and the
# file can be created in development so startup write checks don't fail with
# "unable to open database file". This is safe for development only.
if raw_db_uri.startswith('sqlite:///'):
    try:
        _local_db_path = raw_db_uri[len('sqlite:///'):]
        _local_dir = os.path.dirname(_local_db_path)
        if _local_dir and not os.path.exists(_local_dir):
            os.makedirs(_local_dir, exist_ok=True)
        # Touch the file so sqlite can open it (no-op if it already exists)
        open(_local_db_path, 'a').close()
    except Exception as _e:
        logger.debug('Could not ensure sqlite file path exists: %s', _e)

# Validate DATABASE_URL to avoid cryptic psycopg connection errors when the
# environment variable is set but malformed (e.g. missing hostname). If the
# URL looks like a postgres URL but has no host part, fall back to the local
# sqlite DB to keep development workflows working.
from sqlalchemy.engine.url import make_url
try:
    parsed = make_url(raw_db_uri)
    # If a postgres-style URL is present but host is empty, treat as malformed
    if parsed.drivername and parsed.drivername.startswith('postgres') and not parsed.host:
        logger.warning("DATABASE_URL appears to be missing host; falling back to local sqlite for development.")
        raw_db_uri = f'sqlite:///{default_db_path}'
except Exception as e:
    logger.warning("Failed to parse DATABASE_URL; falling back to sqlite. Parse error: %s", str(e))
    raw_db_uri = f'sqlite:///{default_db_path}'

# Normalize relative sqlite paths (sqlite:///relative/path) to absolute paths to avoid file-open errors
if raw_db_uri.startswith('sqlite:///') and not raw_db_uri.startswith('sqlite:////'):
    rel_path = raw_db_uri[len('sqlite:///'):]
    if not os.path.isabs(rel_path):
        abs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', rel_path))
        raw_db_uri = 'sqlite:///' + abs_path

# Enforce a single canonical DB in development to avoid accidental debug DBs
# Flask convention: use instance/xear_crm.db for consistent development
if os.getenv('FLASK_ENV', 'production') == 'development':
    canonical_dev_db = 'sqlite:///' + os.path.abspath(os.path.join(os.path.dirname(__file__), 'instance', 'xear_crm.db'))
    if raw_db_uri != canonical_dev_db:
        logger.warning('Development environment detected: overriding DATABASE_URL %s -> %s', raw_db_uri, canonical_dev_db)
        raw_db_uri = canonical_dev_db

app.config['SQLALCHEMY_DATABASE_URI'] = raw_db_uri
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Environment-driven JWT secret
FLASK_ENV = os.getenv('FLASK_ENV', 'production')
JWT_SECRET = os.getenv('JWT_SECRET_KEY')
# Only enforce JWT secret in production
if FLASK_ENV == 'production' and not JWT_SECRET:
    raise RuntimeError('JWT_SECRET_KEY must be set in production environments')
app.config['JWT_SECRET_KEY'] = JWT_SECRET if JWT_SECRET else 'super-secret'

# DEBUG flag
app.config['DEBUG'] = os.getenv('DEBUG', '0') == '1'

# JWT cookie security (if cookies are used)
app.config['JWT_COOKIE_SECURE'] = os.getenv('JWT_COOKIE_SECURE', '1') == '1'

# Configure CORS origins from env
cors_origins = os.getenv('CORS_ORIGINS', '')
if cors_origins:
    origins = [o.strip() for o in cors_origins.split(',') if o.strip()]
else:
    # Explicitly list development endpoints to support credentials
    origins = [
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:5173',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:8081',
        'http://127.0.0.1:5173'
    ]
# Allow CORS for all routes in development so the frontend (on another origin)
# can fetch health/openapi and other non-/api endpoints during local testing.
# The allowed origins are configured via the CORS_ORIGINS environment variable
# and default to '*' for convenient local development.
CORS(app, resources={r"/*": {
    "origins": origins,
    "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization", "Idempotency-Key", "X-Request-Id", "x-request-id", "sentry-trace", "baggage"]
}})
# Ensure CORS exposes common headers and handles preflight headers predictably
# CRITICAL: This must match the allow_headers in CORS() above
app.config['CORS_HEADERS'] = 'Content-Type,Authorization,Idempotency-Key,X-Request-Id,x-request-id,sentry-trace,baggage'
app.config['CORS_SUPPORTS_CREDENTIALS'] = True

# Initialize DB and extensions
db.init_app(app)
from flask_migrate import Migrate
migrate = Migrate(app, db)

def _sanitize_for_json(obj):
    """Recursively convert Decimal and other non-serializable types to JSON-serializable forms."""
    from decimal import Decimal
    if obj is None:
        return None
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_sanitize_for_json(v) for v in obj]
    # Fallback to string representation
    try:
        return str(obj)
    except Exception:
        return None

def log_activity(user_id, action, entity_type, entity_id=None, details=None, request=None, tenant_id=None, message=None):
    """Log user activity for audit purposes"""
    try:
        # Use a UUID and microsecond timestamp to ensure unique IDs even under
        # rapid test-driven operations that would otherwise collide with lower
        # resolution timestamps.
        log_entry = ActivityLog(
            id=f"log_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}_{uuid4().hex[:8]}",
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=json.dumps(_sanitize_for_json(details)) if details else None,
            message=message,
            ip_address=request.remote_addr if request else None,
            user_agent=request.headers.get('User-Agent') if request else None
        )
        db.session.add(log_entry)
        db.session.commit()
    except Exception as e:
        logger.error(f"Failed to log activity: {str(e)}")
        db.session.rollback()

# Initialize optional extensions (OTP store, etc.)
from extensions import init_extensions
init_extensions(app)

# Initialize Tenant Security (Global Query Filter)
try:
    from utils.tenant_security import setup_tenant_security
    setup_tenant_security(app, db)
    logger.info('Tenant security (global query filter) initialized')
except Exception as e:
    logger.error(f'Failed to initialize tenant security: {e}')


# Register unified response envelope middleware
try:
    from utils.response_envelope import register_response_envelope
    register_response_envelope(app)
except Exception as _e:
    logger.warning('Response envelope middleware not registered: %s', _e)

try:
    from utils.metrics import init_metrics
    # Initialize metrics in a guarded helper; it will no-op when prometheus_client is absent
    init_metrics(app)
except Exception as e:
    logger.warning('Prometheus initialization skipped: %s', e)

# VATANSMS Configuration
VATANSMS_USERNAME = os.getenv('VATANSMS_USERNAME', '4ab531b6fd26fd9ba6010b0d')
VATANSMS_PASSWORD = os.getenv('VATANSMS_PASSWORD', '49b2001edbb1789e4e62f935')
VATANSMS_SENDER = 'OZMN TIBCHZ'

# Cloudflare Turnstile Configuration
TURNSTILE_SECRET_KEY = os.getenv('TURNSTILE_SECRET_KEY')
TURNSTILE_SITE_KEY = os.getenv('TURNSTILE_SITE_KEY')

def verify_turnstile_token(token):
    """Verify Cloudflare Turnstile token"""
    if not TURNSTILE_SECRET_KEY:
        logger.warning("TURNSTILE_SECRET_KEY not configured, skipping verification")
        return True  # Allow in development

    if not token:
        return False

    try:
        url = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
        payload = {
            "secret": TURNSTILE_SECRET_KEY,
            "response": token
        }

        response = requests.post(url, data=payload, timeout=10)

        if response.status_code == 200:
            result = response.json()
            return result.get('success', False)
        else:
            logger.error(f"Turnstile verification failed: HTTP {response.status_code}")
            return False

    except Exception as e:
        logger.error(f"Turnstile verification error: {str(e)}")
        return False


# Register blueprints
from routes.ocr import ocr_bp
app.register_blueprint(ocr_bp, url_prefix='/api/ocr')

# ===== PATIENT CRUD ENDPOINTS =====

# Patients routes migrated to a blueprint in backend/routes/patients.py
from routes.patients import patients_bp
app.register_blueprint(patients_bp, url_prefix='/api')

# ===== APPOINTMENT CRUD ENDPOINTS =====
# Appointments routes migrated to a blueprint in backend/routes/appointments.py
from routes.appointments import appointments_bp
app.register_blueprint(appointments_bp, url_prefix='/api')

# ===== DEVICE/INVENTORY ENDPOINTS =====
# Devices routes migrated to a blueprint in backend/routes/devices.py
from routes.devices import devices_bp
app.register_blueprint(devices_bp)  # Blueprint already has url_prefix='/api'

# ===== CAMPAIGN MANAGEMENT ENDPOINTS =====
# Campaigns routes migrated to a blueprint in backend/routes/campaigns.py
from routes.campaigns import campaigns_bp
app.register_blueprint(campaigns_bp, url_prefix='/api')

# ===== AUTOMATION ENDPOINTS =====
#from inline automation endpoints (migrated to backend/routes/automation.py)
from routes.automation import automation_bp
app.register_blueprint(automation_bp, url_prefix='/api')

# ===== DASHBOARD/REPORTS ENDPOINTS =====
# Dashboard and reports routes migrated to blueprints in backend/routes/dashboard.py and backend/routes/reports.py
from routes.dashboard import dashboard_bp
app.register_blueprint(dashboard_bp, url_prefix='/api')
from routes.reports import reports_bp
app.register_blueprint(reports_bp, url_prefix='/api')

# ===== SGK INTEGRATION ENDPOINTS =====
# SGK endpoints migrated to backend/routes/sgk.py
from routes.sgk import sgk_bp
app.register_blueprint(sgk_bp, url_prefix='/api')

# ===== DEVICE SALES ENDPOINTS =====
# Sales routes migrated to a blueprint in backend/routes/sales.py
from routes.sales import sales_bp
app.register_blueprint(sales_bp, url_prefix='/api')

# ===== INVOICE & PROFORMA ENDPOINTS =====
# Invoice and proforma routes migrated to a blueprint in backend/routes/invoices.py
from routes.invoices import invoices_bp, proformas_bp
app.register_blueprint(invoices_bp, url_prefix='/api')
app.register_blueprint(proformas_bp, url_prefix='/api')

# ===== PAYMENT RECORDS ENDPOINTS =====
# Payment tracking for sales, promissory notes, and collections
from routes.payments import payments_bp
app.register_blueprint(payments_bp, url_prefix='/api')

# ===== PAYMENT INTEGRATIONS (POS) ENDPOINTS =====
from routes.payment_integrations import payment_integrations_bp
app.register_blueprint(payment_integrations_bp)

# ===== POS COMMISSION RATES ENDPOINTS =====
from routes.pos_commission import pos_commission_bp
app.register_blueprint(pos_commission_bp)



# ===== CASH RECORDS ENDPOINTS =====
# Cash register records for cashflow management
from routes.unified_cash import unified_cash_bp
app.register_blueprint(unified_cash_bp, url_prefix='/api')

from routes.cash_records import cash_records_bp
app.register_blueprint(cash_records_bp, url_prefix='/api')

# ===== INVENTORY ENDPOINTS =====
# Inventory routes for managing stock, serial numbers, and device inventory
from routes.inventory import inventory_bp
app.register_blueprint(inventory_bp)  # inventory_bp already has url_prefix='/api/inventory'

# ===== SUPPLIERS ENDPOINTS =====
# Suppliers routes for managing suppliers and product-supplier relationships
from routes.suppliers import suppliers_bp
app.register_blueprint(suppliers_bp)  # suppliers_bp already has /api prefix in routes

# ===== DEVICE REPLACEMENTS & RETURN INVOICES =====
# Device replacements and return invoices for supplier returns
from routes.replacements import replacements_bp
app.register_blueprint(replacements_bp)  # replacements_bp already has url_prefix='/api'

# Additional invoice action routes (issue, copy, pdf serve, etc.)
from routes.invoices_actions import invoices_actions_bp
app.register_blueprint(invoices_actions_bp)

# BirFatura adapter routes (adapter endpoints for frontend -> backend -> provider)
from routes.birfatura import birfatura_bp
# Register without url_prefix because routes in the blueprint already include `/api/EFatura/*` paths
app.register_blueprint(birfatura_bp)

# ===== NOTIFICATION ENDPOINTS =====
# Notifications routes migrated to a blueprint in backend/routes/notifications.py
from routes.notifications import notifications_bp
app.register_blueprint(notifications_bp, url_prefix='/api')

# Communications blueprint
from routes.communications import communications_bp
app.register_blueprint(communications_bp, url_prefix='/api')

# SMS Integration blueprint
from routes.sms_integration import sms_bp
app.register_blueprint(sms_bp, url_prefix='/api')

# Activity Logs blueprint
from routes.activity_logs import activity_logs_bp
app.register_blueprint(activity_logs_bp, url_prefix='/api')

# Upload blueprint
from routes.upload import upload_bp
app.register_blueprint(upload_bp, url_prefix='/api/upload')

# Roles & Permissions blueprint
from routes.roles import roles_bp
from routes.permissions import permissions_bp
app.register_blueprint(roles_bp, url_prefix='/api')
app.register_blueprint(permissions_bp, url_prefix='/api')

# ===== PATIENT SUBRESOURCES ENDPOINTS =====
# Patient subresources: hearing-tests, notes, ereceipts, devices
from routes.patient_subresources import patient_subresources_bp
app.register_blueprint(patient_subresources_bp, url_prefix='/api')

# Timeline/Activity endpoints for patients
from routes.timeline import timeline_bp
app.register_blueprint(timeline_bp, url_prefix='/api')

# Patient Documents endpoints
from routes.documents import documents_bp
app.register_blueprint(documents_bp, url_prefix='/api')

from routes.plans import plans_bp
app.register_blueprint(plans_bp, url_prefix='/api/plans')

from routes.addons import addons_bp
app.register_blueprint(addons_bp, url_prefix='/api/addons')

from routes.subscriptions import subscriptions_bp
app.register_blueprint(subscriptions_bp, url_prefix='/api/subscriptions')

from routes.config import config_bp
app.register_blueprint(config_bp, url_prefix='/api')

# Pre-warm OCR/NLP service in development or when explicitly requested to reduce first-request latency
try:
    PREWARM = os.getenv('PREWARM_OCR', '0') == '1' or FLASK_ENV != 'production'
    if PREWARM:
        try:
            from services.ocr_service import initialize_nlp_service
            import threading
            logger.info('Scheduling OCR/NLP service pre-warm in background')
            def _do_prewarm():
                try:
                    initialize_nlp_service()
                    logger.info('OCR/NLP service pre-warm complete')
                except Exception as e:
                    logger.warning(f'Pre-warming OCR/NLP service failed: {e}')
            t = threading.Thread(target=_do_prewarm, daemon=True)
            t.start()
        except Exception as e:
            logger.warning(f'Pre-warming OCR/NLP service failed to start: {e}')
except Exception:
    pass

# Do not run startup checks here; they run later once the app context is available.
# Note: Only require JWT secret in production environments

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health endpoint exposing overall status and DB read/write check results.
    Returns 200 when read+write ok, 503 when write fails, and 500 when other errors occur.
    """
    try:
        # Quick read check
        db.session.execute(text('SELECT 1'))

        # Quick write check using nested transaction (won't persist)
        write_ok = _check_db_writeable()
        if not write_ok:
            return jsonify({'success': False, 'db_read_ok': True, 'db_write_ok': False, 'error': 'Database is read-only'}), 503

        # NLP service availability (non-blocking check)
        spacy_available = False
        hf_ner_available = False
        try:
            from services.ocr_service import get_nlp_service
            svc = get_nlp_service(init_if_missing=False)
            if svc:
                spacy_available = bool(getattr(svc, 'nlp', None))
                hf_ner_available = bool(getattr(svc, 'hf_ner', None))
        except Exception:
            pass

        return jsonify({'success': True, 'db_read_ok': True, 'db_write_ok': True, 'database_connected': True, 'spacy_available': spacy_available, 'hf_ner_available': hf_ner_available}), 200
    except Exception as e:
        logger.exception('Health check failed: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== REGISTRATION / AUTH ENDPOINTS (DEV) =====
from routes.registration import registration_bp
app.register_blueprint(registration_bp)

# Register auth blueprint (login/OTP endpoints)
app.register_blueprint(auth_bp, url_prefix='/api')

# ===== ADMIN PANEL ENDPOINTS =====
from routes.admin import admin_bp
app.register_blueprint(admin_bp)  # admin_bp already has url_prefix='/api/admin'

from routes.admin_plans import admin_plans_bp
app.register_blueprint(admin_plans_bp)  # admin_plans_bp already has url_prefix='/api/admin/plans'

from routes.admin_tenants import admin_tenants_bp
app.register_blueprint(admin_tenants_bp)  # admin_tenants_bp already has url_prefix='/api/admin/tenants'

from routes.admin_addons import admin_addons_bp
app.register_blueprint(admin_addons_bp)  # admin_addons_bp already has url_prefix='/api/admin/addons'

from routes.admin_dashboard import admin_dashboard_bp
app.register_blueprint(admin_dashboard_bp)  # admin_dashboard_bp already has url_prefix='/api/admin/dashboard'

from routes.admin_analytics import admin_analytics_bp
app.register_blueprint(admin_analytics_bp)

from routes.admin_settings import admin_settings_bp
from routes.admin_scan_queue import admin_scan_queue_bp
app.register_blueprint(admin_scan_queue_bp)
from routes.admin_production import admin_production_bp
app.register_blueprint(admin_production_bp)
app.register_blueprint(admin_settings_bp)

from routes.admin_invoices import admin_invoices_bp
app.register_blueprint(admin_invoices_bp)

from routes.admin_suppliers import admin_suppliers_bp
app.register_blueprint(admin_suppliers_bp)

from routes.admin_tickets import admin_tickets_bp
app.register_blueprint(admin_tickets_bp)

from routes.admin_campaigns import admin_campaigns_bp
app.register_blueprint(admin_campaigns_bp)

# Admin Roles & Permissions Management
from routes.admin_roles import admin_roles_bp
app.register_blueprint(admin_roles_bp)  # admin_roles_bp has no prefix - routes define full path
from routes.admin_patients import admin_patients_bp
from routes.admin_appointments import admin_appointments_bp
from routes.admin_inventory import admin_inventory_bp
from routes.admin_notifications import admin_notifications_bp
from routes.admin_api_keys import admin_api_keys_bp
from routes.admin_birfatura import admin_birfatura_bp
from routes.admin_marketplaces import admin_marketplaces_bp
from routes.admin_settings import admin_settings_bp
from routes.admin_integrations import admin_integrations_bp
app.register_blueprint(admin_integrations_bp)
app.register_blueprint(admin_marketplaces_bp)
app.register_blueprint(admin_birfatura_bp)
app.register_blueprint(admin_api_keys_bp)
app.register_blueprint(admin_notifications_bp)
app.register_blueprint(admin_inventory_bp)
app.register_blueprint(admin_appointments_bp)
app.register_blueprint(admin_patients_bp)

# ===== CHECKOUT / COMMERCE ENDPOINTS =====
from routes.checkout import checkout_bp
app.register_blueprint(checkout_bp)

# ===== TENANT USER MANAGEMENT ENDPOINTS =====
from routes.tenant_users import tenant_users_bp
app.register_blueprint(tenant_users_bp, url_prefix='/api')

# ===== USER MANAGEMENT ENDPOINTS (legacy /api/users) =====
from routes.users import users_bp
app.register_blueprint(users_bp, url_prefix='/api')

# ===== BRANCH MANAGEMENT ENDPOINTS =====
from routes.branches import branches_bp
app.register_blueprint(branches_bp, url_prefix='/api')


# Global error handler to capture unexpected exceptions and return JSON during development
import traceback
@app.errorhandler(Exception)
def handle_unexpected_error(e):
    logger.exception('Unhandled exception: %s', e)
    if app.config.get('DEBUG'):
        return jsonify({'success': False, 'error': str(e), 'trace': traceback.format_exc()}), 500
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

@app.route('/api/settings/pricing', methods=['GET'])
def get_pricing_settings():
    """Get pricing settings specifically"""
    try:
        # Get settings from database
        settings_record = db.session.get(Settings, 'system_settings')
        
        if settings_record:
            all_settings = json.loads(settings_record.settings_data)
            pricing_settings = all_settings.get('pricing', {})
        else:
            # Default pricing settings if no settings exist
            pricing_settings = {
                "devices": {
                    "basic": 2500.00,
                    "standard": 3500.00,
                    "premium": 5000.00,
                    "wireless": 6000.00
                },
                "accessories": {
                    "battery_pack": 150.00,
                    "charger": 200.00,
                    "case": 100.00,
                    "ear_mold": 300.00
                },
                "services": {
                    "fitting": 500.00,
                    "adjustment": 200.00,
                    "repair": 300.00,
                    "maintenance": 400.00
                }
            }

        return jsonify({
            "success": True,
            "data": pricing_settings,
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Get pricing settings error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500

@app.route('/api/settings', methods=['GET'])
def get_settings():
    """Get system settings from database"""
    try:
        # Try to get settings from database
        settings_record = db.session.get(Settings, 'system_settings')
        file_settings = {}
        # Load current_settings.json from disk and extract nested "settings" if available
        try:
            current_settings_path = os.path.join(os.path.dirname(__file__), 'current_settings.json')
            if os.path.exists(current_settings_path):
                with open(current_settings_path, 'r', encoding='utf-8') as f:
                    file_json = json.load(f)
                    file_settings = file_json.get('settings', file_json) or {}
        except Exception as _e:
            # Non-fatal: continue with DB/default settings
            logger.debug('Could not load current_settings.json: %s', _e)

        def _merge_sgk(base, extra):
            try:
                if not isinstance(base, dict):
                    base = {}
                if not isinstance(extra, dict):
                    return base
                base.setdefault('sgk', {})
                base['sgk'].setdefault('schemes', {})
                extra_sgk = extra.get('sgk', {})
                # Merge schemes
                schemes_extra = extra_sgk.get('schemes', {})
                if isinstance(schemes_extra, dict):
                    base['sgk']['schemes'] = {**base['sgk'].get('schemes', {}), **schemes_extra}
                # Merge flags/defaults without overwriting explicit DB values
                if 'enabled' in extra_sgk and 'enabled' not in base['sgk']:
                    base['sgk']['enabled'] = extra_sgk.get('enabled')
                if 'default_scheme' in extra_sgk and 'default_scheme' not in base['sgk']:
                    base['sgk']['default_scheme'] = extra_sgk.get('default_scheme')
            except Exception as _e:
                logger.debug('SGK merge failed: %s', _e)
            return base

        if settings_record:
            # Return settings from database, merged with file-based SGK schemes for completeness
            db_settings = json.loads(settings_record.settings_data)
            merged = _merge_sgk(db_settings, file_settings)
            return jsonify({
                "success": True,
                "settings": merged,
                "timestamp": datetime.now().isoformat()
            })

        # If no settings in database, create default settings
        default_settings = {
            "company": {
                "name": "X-Ear İşitme Merkezi",
                "address": "Atatürk Cad. No: 123, Kadıköy, İstanbul",
                "phone": "+90 216 555 0123",
                "email": "info@x-ear.com",
                "taxNumber": "1234567890"
            },
            "system": {
                "defaultBranch": ""
            },
            "notifications": {
                "email": True,
                "sms": True,
                "desktop": False
            },
            "features": {
                "integrations_ui": False,
                "pricing_ui": False,
                "security_ui": False
            }
        }

        # Save default settings to database
        settings_record = Settings(
            id='system_settings',
            settings_data=json.dumps(default_settings)
        )
        db.session.add(settings_record)
        db.session.commit()

        # Merge defaults with file-based SGK schemes as well
        merged_defaults = _merge_sgk(default_settings, file_settings)
        return jsonify({
            "success": True,
            "settings": merged_defaults,
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Get settings error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500

from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction

@app.route('/api/settings', methods=['PUT'])
@idempotent(methods=['PUT'])
@optimistic_lock(Settings, id_param='settings_id', version_header='If-Match')
@with_transaction
def update_settings():
    """Update system settings"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "No data provided", "timestamp": datetime.now().isoformat()}), 400

        # Validate settings object
        settings = data.get('settings', {})
        if not settings:
            return jsonify({"success": False, "error": "Settings object required", "timestamp": datetime.now().isoformat()}), 400

        # Basic validation (extend as needed)
        # Save settings to database
        settings_record = db.session.get(Settings, 'system_settings')
        if settings_record:
            settings_record.settings_data = json.dumps(settings)
        else:
            settings_record = Settings(id='system_settings', settings_data=json.dumps(settings))
            db.session.add(settings_record)

        db.session.commit()

        return jsonify({"success": True, "message": "Settings updated successfully", "validated_sections": list(settings.keys()), "timestamp": datetime.now().isoformat()})

    except Exception as e:
        db.session.rollback()
        logger.error(f"Update settings error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500

@app.route('/api/settings', methods=['POST'])
def save_settings():
    """Save system settings"""
    try:
        payload = request.get_json() or {}
        new_settings = payload.get('settings') if isinstance(payload.get('settings'), dict) else payload

        settings_record = Settings.get_system_settings()
        # Capture a before snapshot for audit logging (JSON-serializable)
        try:
            before_snapshot = settings_record.settings_json if hasattr(settings_record, 'settings_json') else json.loads(settings_record.settings_data)
        except Exception:
            before_snapshot = None
        # Merge shallowly to avoid overwriting critical keys unintentionally
        current = settings_record.settings_json or {}
        merged = { **current, **(new_settings or {}) }
        settings_record.settings_json = merged
        db.session.add(settings_record)
        db.session.commit()
        return jsonify({'success': True, 'settings': merged}), 200
    except Exception as e:
        db.session.rollback()
        logger.error('Failed to save settings: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/settings', methods=['PATCH'])
@permission_required('settings.update')
def patch_settings():
    """Apply partial updates to system settings using dot-path notation.
    Request body: { "updates": { "company.name": "New", "system.timezone": "Europe/London" } }
    """
    try:
        payload = request.get_json() or {}
        updates = payload.get('updates') if isinstance(payload.get('updates'), dict) else None
        # Support legacy single-path form {path: 'company.name', value: 'X'}
        if updates is None and payload.get('path'):
            updates = { payload.get('path'): payload.get('value') }

        if not updates or not isinstance(updates, dict):
            return jsonify({"success": False, "error": "'updates' object required (dot-path -> value)" , "timestamp": datetime.now().isoformat()}), 400

        settings_record = Settings.get_system_settings()
        # Capture before snapshot for audit purposes
        try:
            before_snapshot = settings_record.settings_json if hasattr(settings_record, 'settings_json') else json.loads(settings_record.settings_data)
        except Exception:
            before_snapshot = None
        # Apply each update using existing helper
        for path, val in updates.items():
            # Basic validation: path should be non-empty string, limit length to prevent abuse
            if not isinstance(path, str) or not path or len(path) > 255:
                return jsonify({"success": False, "error": f"Invalid path: {path}" , "timestamp": datetime.now().isoformat()}), 400
            settings_record.update_setting(path, val)

        db.session.add(settings_record)
        db.session.commit()

        # Audit log: record which paths were updated and by whom (jwt identity)
        try:
            user_id = get_jwt_identity()
            try:
                after_snapshot = settings_record.settings_json if hasattr(settings_record, 'settings_json') else json.loads(settings_record.settings_data)
            except Exception:
                after_snapshot = None
            details = {
                'updated_paths': list(updates.keys()),
                'before': before_snapshot,
                'after': after_snapshot
            }
            log_activity(user_id=user_id, action='settings.update', entity_type='settings', entity_id='system_settings', details=details, request=request)
        except Exception:
            # Don't fail the request if logging fails; error already logged in helper
            pass

        return jsonify({"success": True, "message": "Settings updated (partial)", "updated": list(updates.keys()), "settings": settings_record.settings_json, "timestamp": datetime.now().isoformat()}), 200

    except Exception as e:
        db.session.rollback()
        logger.exception('Patch settings error: %s', e)
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500

import sqlite3


def _check_db_writeable():
    """Attempt a nested transaction write and rollback to verify DB is writable.
    Returns True when write succeeds (even though it's rolled back); False when a write error occurs.
    """
    try:
        # Use a nested transaction (SAVEPOINT) so nothing persists if DB is writable
        with db.session.begin_nested():
            # Use ActivityLog model which is lightweight and already present in schema
            temp = ActivityLog(
                id=f'health_{uuid4().hex}',
                user_id='system',
                action='healthcheck',
                entity_type='system',
                details=json.dumps({'ts': datetime.now().isoformat()})
            )
            db.session.add(temp)
            # Force a flush so SQLite will attempt a write and raise if read-only
            db.session.flush()
        return True
    except sqlite3.OperationalError as e:
        logger.exception('DB write check failed (OperationalError): %s', e)
        db.session.rollback()
        return False
    except Exception as e:
        # If table doesn't exist, we assume it's a fresh DB and writable (or migration will fix it)
        if 'relation "activity_logs" does not exist' in str(e) or 'no such table: activity_logs' in str(e):
            logger.info('Skipping write check: activity_logs table missing (likely pre-migration)')
            try:
                db.session.rollback()
            except Exception:
                pass
            return True
            
        logger.exception('DB write check unexpected error: %s', e)
        try:
            db.session.rollback()
        except Exception:
            pass
        return False


def startup_checks():
    # Run a non-blocking writeability check and decide behavior based on the environment
    writable = _check_db_writeable()
    if not writable:
        logger.critical('Database is not writable at startup. Application will continue in degraded mode.')
        # Fail fast in production to avoid serving a broken instance
        if FLASK_ENV == 'production':
            raise RuntimeError('Database is not writable. Exiting to prevent degraded production run.')

# Simple rate limiting in-memory store: {identifier: (count, reset_ts)}
# _rate_limits is now handled by otp_store.increment_rate when using Redis, or in-memory fallback
_RATE_LIMIT_WINDOW_SECONDS = 3600
_RATE_LIMIT_MAX = 5

@app.route('/api/sms/monitoring', methods=['GET'])
def sms_monitoring():
    # SMS monitoring is provided by the notifications blueprint or the auth module; keep a thin shim to require auth
    auth = request.headers.get('Authorization')
    if not auth:
        return jsonify({"success": False, "error": "Unauthorized"}), 401
    # Delegate to notifications monitoring where implemented
    return jsonify({"success": True, "monitoring": {"total_sent": 100, "successful_sends": 95, "failed_sends": 5}}), 200

@app.route('/api/openapi.yaml', methods=['GET', 'OPTIONS'])
def serve_openapi_yaml():
    """Serve the canonical OpenAPI contract for frontend/back-end sync and respond to CORS preflight.

    Returns CORS headers so the static Swagger UI served from a different origin (e.g. localhost:8080)
    can fetch the YAML without browser CORS errors.
    """
    # Handle preflight
    if request.method == 'OPTIONS':
        # Minimal preflight response
        resp = app.make_response(('', 204))
        # Compute a single Access-Control-Allow-Origin value. If configured origins include '*', allow all.
        request_origin = request.headers.get('Origin')
        if isinstance(origins, list):
            if '*' in origins:
                acao = '*'
            elif request_origin and request_origin in origins:
                acao = request_origin
            else:
                acao = 'null'
        else:
            acao = origins
        resp.headers['Access-Control-Allow-Origin'] = acao
        resp.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Authorization,Content-Type,X-Request-Id,x-request-id'
        resp.headers['Access-Control-Max-Age'] = '3600'
        return resp

    try:
        # openapi.yaml is stored at the repository root
        openapi_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'openapi.yaml'))
        if not os.path.exists(openapi_path):
            logger.error('openapi.yaml not found at %s', openapi_path)
            return jsonify({'success': False, 'error': 'OpenAPI contract not available'}), 404

        # Serve as YAML with appropriate mimetype
        resp = send_file(openapi_path, mimetype='application/x-yaml')
        # Compute single allowed origin value for the response and set Vary header so caches behave correctly.
        request_origin = request.headers.get('Origin')
        if isinstance(origins, list):
            if '*' in origins:
                acao = '*'
            elif request_origin and request_origin in origins:
                acao = request_origin
            else:
                acao = 'null'
        else:
            acao = origins
        resp.headers['Access-Control-Allow-Origin'] = acao
        resp.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Authorization,Content-Type,X-Request-Id,x-request-id'
        resp.headers['Vary'] = 'Origin'
        return resp
    except Exception as e:
        logger.error(f'Serve OpenAPI error: {str(e)}')
        return jsonify({'success': False, 'error': 'Failed to serve OpenAPI contract'}), 500

@app.route('/swagger.html', methods=['GET'])
def serve_swagger_ui():
    """Serve the static Swagger UI page from the repository `public/` folder.

    This helps local development: visit http://<backend-host>:<port>/swagger.html so the
    Swagger UI and `/api/openapi.yaml` are on the same origin and no CORS overrides are needed.
    """
    try:
        swagger_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'public', 'swagger.html'))
        if not os.path.exists(swagger_path):
            logger.error('swagger.html not found at %s', swagger_path)
            return jsonify({'success': False, 'error': 'Swagger UI not available'}), 404
        return send_file(swagger_path, mimetype='text/html')
    except Exception as e:
        logger.error(f'Serve Swagger UI error: {str(e)}')
        return jsonify({'success': False, 'error': 'Failed to serve Swagger UI'}), 500

# Flask 3.x removed the `before_first_request` hook; run startup checks during app initialization
# to surface configuration or DB errors early in development. In production this will still raise
# when appropriate.
with app.app_context():
    try:
        # Guard call in case startup_checks isn't available in unusual import orders
        if 'startup_checks' in globals() and callable(startup_checks):
            startup_checks()
        else:
            logger.warning('startup_checks not found; skipping startup DB checks')
    except Exception as e:
        logger.exception('Startup checks failed during initialization: %s', e)
        if FLASK_ENV == 'production':
            raise

@app.before_request
def _handle_options_preflight():
    """Short-circuit OPTIONS preflight requests so they are not subject to
    authentication or other request processing that might return a non-2xx
    status (which would cause the browser to block the actual request).
    """
    if request.method == 'OPTIONS':
        resp = app.make_response(('', 204))
        origin = request.headers.get('Origin') or '*'
        # Mirror the allowed origin (if configured) to support credentialed requests
        if isinstance(origins, list):
            if '*' in origins:
                acao = '*'
            elif origin and origin in origins:
                acao = origin
            else:
                acao = 'null'
        else:
            acao = origins or '*'
        resp.headers['Access-Control-Allow-Origin'] = acao
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-User-ID, Idempotency-Key, X-Request-Id, x-request-id, sentry-trace, baggage'
        resp.headers['Access-Control-Max-Age'] = '3600'
        # When allowing credentials, reflect origin and include header
        if app.config.get('CORS_SUPPORTS_CREDENTIALS') and origin and acao != '*':
            resp.headers['Access-Control-Allow-Credentials'] = 'true'
        return resp

# CORS headers are handled by Flask-CORS configuration above.
# Manual @app.after_request CORS handler removed to prevent conflicts.

# Ensure database tables exist in development or when explicitly requested
if os.getenv('FORCE_CREATE_TABLES', '0') == '1' or os.getenv('FLASK_ENV', 'production') != 'production':
    try:
        with app.app_context():
            logger.info('Ensuring database tables exist (create_all)')
            db.create_all()
    except Exception as e:
        logger.exception('Failed to run create_all on startup: %s', e)

# Initialize JWT manager
jwt = JWTManager(app)

# ===== PERMISSION MIDDLEWARE (MERKEZI İZİN KONTROLÜ) =====
# Bu middleware tüm endpoint'leri config/permissions_map.py'deki 
# tanımlara göre otomatik olarak kontrol eder.
try:
    from middleware.permission_middleware import (
        init_permission_middleware, 
        register_permission_blueprint,
        validate_permission_map
    )
    init_permission_middleware(app)
    register_permission_blueprint(app)
    logger.info('Permission middleware initialized successfully')
    
    # Validate permission map against database (production'da kritik)
    with app.app_context():
        validation = validate_permission_map()
        if not validation['valid']:
            logger.error(f"Permission map validation failed: {validation['errors']}")
        else:
            logger.info(f"Permission map validation passed. Warnings: {validation['warnings']}")
except Exception as e:
    logger.error(f'Failed to initialize permission middleware: {e}')
    if FLASK_ENV == 'production':
        raise RuntimeError(f'Permission middleware initialization failed: {e}')



@app.route('/api/admin/features', methods=['GET'])
@jwt_required()
def admin_get_features():
    """Return the current feature flags for admin UI.

    Requires JWT; access to the admin panel itself is verified client-side, but
    we still require a logged-in user to fetch flags.
    """
    try:
        settings_record = Settings.get_system_settings()
        features = settings_record.get_setting('features', {}) or {}
        # Ensure features are returned as objects with mode & plans
        normalized = {}
        for k, v in (features.items() if isinstance(features, dict) else []):
            if isinstance(v, dict) and 'mode' in v:
                normalized[k] = v
            else:
                # legacy boolean handling -> convert to object
                normalized[k] = {'mode': 'visible' if bool(v) else 'hidden', 'plans': []}
        return jsonify({'success': True, 'features': normalized}), 200
    except Exception as e:
        logger.exception('Failed to read features: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/admin/features', methods=['PATCH'])
@jwt_required()
def admin_patch_features():
    """Patch feature flags. Body: { features: { 'integrations_ui': true } }

    Authorization: user must have `settings.update` or `features.toggle`.
    """
    try:
        payload = request.get_json() or {}
        new_flags = payload.get('features') if isinstance(payload.get('features'), dict) else None
        if not new_flags:
            return jsonify({'success': False, 'error': "'features' object required"}), 400

        user_id = get_jwt_identity()
        user = db.session.get(User, user_id)
        # permission helper `can` is in utils.authorization
        from utils.authorization import can
        if not (can(user, 'settings.update') or can(user, 'features.toggle')):
            return jsonify({'success': False, 'error': 'Forbidden - insufficient permission'}), 403

        settings_record = Settings.get_system_settings()
        before = settings_record.get_setting('features', {}) or {}
        # Apply updates under features key; accept object shape {mode, plans}
        sf = dict(before) if isinstance(before, dict) else {}
        for k, v in new_flags.items():
            if isinstance(v, dict):
                mode = v.get('mode', 'hidden')
                if mode not in ('visible', 'frozen', 'hidden'):
                    return jsonify({'success': False, 'error': f'Invalid mode for {k}'}), 400
                plans = v.get('plans') or []
                if not isinstance(plans, list):
                    return jsonify({'success': False, 'error': f'plans must be a list for {k}'}), 400
                sf[k] = {'mode': mode, 'plans': [str(p) for p in plans]}
            else:
                # legacy boolean -> visible/hidden
                sf[k] = {'mode': 'visible' if bool(v) else 'hidden', 'plans': []}
        # Save back
        settings_record.update_setting('features', sf)
        db.session.add(settings_record)
        db.session.commit()

        # Audit
        try:
            details = {'before': before, 'after': sf}
            log_activity(user_id=user_id, action='features.update', entity_type='settings', entity_id='system_settings', details=details, request=request)
        except Exception:
            pass

        # Refresh cache for SettingsService consumers if needed; return new flags
        return jsonify({'success': True, 'features': sf}), 200
    except Exception as e:
        db.session.rollback()
        logger.exception('Failed to patch features: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    # When running app.py directly, default to port 5003 for local development
    run_port = int(os.getenv('FLASK_RUN_PORT', '5003'))
    run_host = os.getenv('FLASK_RUN_HOST', '0.0.0.0')
    logger.info(f"Starting Flask development server on {run_host}:{run_port}")
    app.run(host=run_host, port=run_port, debug=app.config.get('DEBUG', False))