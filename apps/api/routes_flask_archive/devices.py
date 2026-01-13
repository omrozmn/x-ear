from flask import Blueprint, request, jsonify, make_response
from models.base import db
from models.device import Device
from models.inventory import InventoryItem
from models.enums import DeviceSide, DeviceStatus, DeviceCategory
from constants import CANONICAL_CATEGORY_HEARING_AID
from datetime import datetime
from sqlalchemy.orm import load_only
import logging
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction
from utils.decorators import unified_access
from utils.response import success_response, error_response

logger = logging.getLogger(__name__)

devices_bp = Blueprint('devices', __name__, url_prefix='/api')

@devices_bp.route('/devices', methods=['GET'])
@unified_access(resource='devices', action='read')
def get_devices(ctx):
    """Get devices with filtering"""
    try:
        category = request.args.get('category')
        status = request.args.get('status')
        search = request.args.get('search')
        brand = request.args.get('brand')
        inventory_only = request.args.get('inventory_only', 'false').lower() == 'true'
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))

        query = Device.query
        
        # Apply tenant scope - CRITICAL SECURITY
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)

        # Filter for inventory devices only if requested
        if inventory_only:
            query = query.filter(db.or_(Device.patient_id.is_(None), Device.patient_id == 'inventory'))

        # Apply filters
        if category:
            try:
                if category == CANONICAL_CATEGORY_HEARING_AID:
                    hearing_device_types = ['BTE', 'ITE', 'RIC', 'CIC', 'RIC-BTE', 'HEARING_AID', 'hearing_aid']
                    query = query.filter(db.or_(Device.category == CANONICAL_CATEGORY_HEARING_AID, Device.device_type.in_(hearing_device_types)))
                else:
                    query = query.filter(Device.category == category)
            except Exception:
                if category == CANONICAL_CATEGORY_HEARING_AID:
                    hearing_device_types = ['BTE', 'ITE', 'RIC', 'CIC', 'RIC-BTE', 'HEARING_AID', 'hearing_aid']
                    query = query.filter(Device.device_type.in_(hearing_device_types))
                else:
                    query = query.filter_by(device_type=category)
        if status:
            query = query.filter_by(status=status)
        if brand:
            query = query.filter_by(brand=brand)
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                db.or_(
                    Device.brand.ilike(search_filter),
                    Device.model.ilike(search_filter),
                    Device.serial_number.ilike(search_filter)
                )
            )

        try:
            query = query.options(load_only(Device.id, Device.patient_id, Device.inventory_id, Device.serial_number, Device.brand, Device.model, Device.device_type, Device.ear, Device.status, Device.price, Device.notes, Device.created_at, Device.updated_at))
        except Exception:
            pass

        query = query.order_by(Device.created_at.desc())
        devices = query.paginate(page=page, per_page=per_page, error_out=False)

        return success_response(
            data=[device.to_dict() for device in devices.items],
            meta={
                "total": devices.total,
                "page": page,
                "perPage": per_page,
                "totalPages": devices.pages,
                "tenant_scope": ctx.tenant_id
            }
        )
    except Exception as e:
        logger.error(f"Get devices error: {str(e)}")
        return error_response(str(e), status_code=500)


@devices_bp.route('/devices', methods=['POST'])
@unified_access(resource='devices', action='create')
def create_device(ctx):
    """Create a new device"""
    try:
        data = request.get_json()
        if not data:
            return error_response("No data provided", status_code=400)

        required_fields = ['patientId', 'brand', 'model', 'type']
        for field in required_fields:
            if field not in data:
                return error_response(f"Missing required field: {field}", status_code=400)

        if 'id' not in data:
            import random
            data['id'] = f"dev_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}_{random.randint(100000, 999999)}"

        device = Device()
        device.id = data['id']
        device.tenant_id = ctx.tenant_id  # Set tenant_id from context
        device.patient_id = data['patientId']
        device.inventory_id = data.get('inventoryId')
        serial_num = data.get('serialNumber')
        device.serial_number = serial_num if serial_num and serial_num.strip() else None
        device.brand = data['brand']
        device.model = data['model']
        device.device_type = data['type']
        
        if 'category' in data:
            device.category = DeviceCategory.from_legacy(data['category'])
        elif data['type'] in ['hearing_aid']:
            device.category = DeviceCategory.HEARING_AID
        
        if 'ear' in data:
            device.ear = DeviceSide.from_legacy(data['ear'])
        
        device.status = DeviceStatus.from_legacy(data.get('status', 'in_stock'))
        device.price = data.get('price')
        
        if 'serialNumberLeft' in data:
            serial_left = data['serialNumberLeft']
            device.serial_number_left = serial_left if serial_left and serial_left.strip() else None
        if 'serialNumberRight' in data:
            serial_right = data['serialNumberRight']
            device.serial_number_right = serial_right if serial_right and serial_right.strip() else None
        
        notes_val = data.get('notes')
        device.notes = notes_val if notes_val and notes_val.strip() else None

        if data.get('trialPeriod'):
            trial = data['trialPeriod']
            if trial.get('startDate'):
                device.trial_start_date = datetime.fromisoformat(trial['startDate'])
            if trial.get('endDate'):
                device.trial_end_date = datetime.fromisoformat(trial['endDate'])
            if trial.get('extendedUntil'):
                device.trial_extended_until = datetime.fromisoformat(trial['extendedUntil'])

        if data.get('warranty'):
            warranty = data['warranty']
            if warranty.get('startDate'):
                device.warranty_start_date = datetime.fromisoformat(warranty['startDate'])
            if warranty.get('endDate'):
                device.warranty_end_date = datetime.fromisoformat(warranty['endDate'])
            device.warranty_terms = warranty.get('terms')

        db.session.add(device)
        db.session.commit()

        from app import log_activity
        log_activity('system', 'create', 'device', device.id, {
            'patientId': device.patient_id,
            'brand': device.brand,
            'model': device.model,
            'type': device.device_type
        }, request)

        resp = make_response(success_response(data=device.to_dict(), status_code=201))
        resp.headers['Location'] = f"/api/devices/{device.id}"
        return resp
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create device error: {str(e)}")
        return error_response(str(e), status_code=500)


@devices_bp.route('/devices/<device_id>', methods=['GET'])
@unified_access(resource='devices', action='read')
def get_device(ctx, device_id):
    """Get a specific device"""
    try:
        device = db.session.get(Device, device_id)
        if not device or (ctx.tenant_id and device.tenant_id != ctx.tenant_id):
            return error_response("Device not found", status_code=404)
        return success_response(data=device.to_dict())
    except Exception as e:
        logger.error(f"Get device error: {str(e)}")
        return error_response(str(e), status_code=500)


@devices_bp.route('/devices/<device_id>', methods=['PUT', 'PATCH'])
@unified_access(resource='devices', action='edit')
@idempotent(methods=['PUT', 'PATCH'])
@optimistic_lock(Device, id_param='device_id')
@with_transaction
def update_device(ctx, device_id):
    """Update a device"""
    try:
        data = request.get_json()
        if not data:
            return error_response("No data provided", status_code=400)

        device = db.session.get(Device, device_id)
        if not device or (ctx.tenant_id and device.tenant_id != ctx.tenant_id):
            return error_response("Device not found", status_code=404)

        if 'brand' in data:
            device.brand = data['brand']
        if 'model' in data:
            device.model = data['model']
        if 'type' in data:
            device.device_type = data['type']
        if 'category' in data:
            device.category = DeviceCategory.from_legacy(data['category'])
        if 'ear' in data:
            device.ear = DeviceSide.from_legacy(data['ear'])
        if 'status' in data:
            device.status = DeviceStatus.from_legacy(data['status'])
        if 'price' in data:
            device.price = data['price']
        if 'notes' in data:
            device.notes = data['notes']
        if 'serialNumber' in data:
            device.serial_number = data['serialNumber']
        if 'serialNumberLeft' in data:
            serial_left = data['serialNumberLeft']
            device.serial_number_left = serial_left if serial_left and serial_left.strip() else None
        if 'serialNumberRight' in data:
            serial_right = data['serialNumberRight']
            device.serial_number_right = serial_right if serial_right and serial_right.strip() else None

        if data.get('trialPeriod'):
            trial = data['trialPeriod']
            if trial.get('startDate'):
                device.trial_start_date = datetime.fromisoformat(trial['startDate'])
            if trial.get('endDate'):
                device.trial_end_date = datetime.fromisoformat(trial['endDate'])
            if trial.get('extendedUntil'):
                device.trial_extended_until = datetime.fromisoformat(trial['extendedUntil'])

        if data.get('warranty'):
            warranty = data['warranty']
            if warranty.get('startDate'):
                device.warranty_start_date = datetime.fromisoformat(warranty['startDate'])
            if warranty.get('endDate'):
                device.warranty_end_date = datetime.fromisoformat(warranty['endDate'])
            device.warranty_terms = warranty.get('terms')

        db.session.commit()
        return success_response(data=device.to_dict())
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update device error: {str(e)}")
        return error_response(str(e), status_code=500)


@devices_bp.route('/devices/<device_id>', methods=['DELETE'])
@unified_access(resource='devices', action='delete')
def delete_device(ctx, device_id):
    """Delete a device or device assignment"""
    try:
        device = db.session.get(Device, device_id)
        if device:
            if ctx.tenant_id and device.tenant_id != ctx.tenant_id:
                return error_response("Device not found", status_code=404)
            db.session.delete(device)
            db.session.commit()
            return success_response(data={'message': 'Device deleted successfully'})

        from models.sales import DeviceAssignment
        assignment = db.session.get(DeviceAssignment, device_id)
        
        if assignment:
            if ctx.tenant_id and assignment.tenant_id != ctx.tenant_id:
                return error_response("Device not found", status_code=404)
                
            if assignment.delivery_status == 'delivered' and assignment.inventory_id:
                inventory = db.session.get(InventoryItem, assignment.inventory_id)
                if inventory:
                    inventory.update_inventory(1)
            
            if assignment.is_loaner and assignment.loaner_inventory_id:
                loaner_inv = db.session.get(InventoryItem, assignment.loaner_inventory_id)
                if loaner_inv:
                    loaner_inv.update_inventory(1)
            
            db.session.delete(assignment)
            db.session.commit()
            return success_response(data={'message': 'Device assignment deleted and stock restored'})

        return error_response("Device not found", status_code=404)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete device error: {str(e)}")
        return error_response(str(e), status_code=500)


@devices_bp.route('/devices/<device_id>/stock-update', methods=['POST'])
@unified_access(resource='devices', action='edit')
def update_device_stock(ctx, device_id):
    """Update device stock levels"""
    try:
        data = request.get_json() or {}
        operation = data.get('operation')
        quantity = int(data.get('quantity', 0) or 0)
        reason = data.get('reason', '')
        notes = data.get('notes', '')

        if not operation:
            return error_response("Operation required", status_code=400)

        device = db.session.get(Device, device_id)
        if not device or (ctx.tenant_id and device.tenant_id != ctx.tenant_id):
            return error_response("Device not found", status_code=404)

        if notes:
            device.notes = (device.notes or '') + f"\n[stock-update] {operation} x{quantity}: {notes}"

        db.session.add(device)
        db.session.commit()

        from app import log_activity
        log_activity('system', 'device_stock_update', 'device', device_id, {
            'operation': operation,
            'quantity': quantity,
            'reason': reason,
            'notes': notes
        }, request)

        return success_response(data={'message': 'Stock update applied'})
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update device stock error: {str(e)}")
        return error_response(str(e), status_code=500)


@devices_bp.route('/devices/categories', methods=['GET'])
@unified_access(resource='devices', action='read')
def get_device_categories(ctx):
    """Get available device categories"""
    try:
        query = db.session.query(Device.category).distinct().filter(Device.category.isnot(None), Device.category != '')
        if ctx.tenant_id:
            query = query.filter(Device.tenant_id == ctx.tenant_id)
        categories = query.all()
        
        category_list = [cat[0].value if hasattr(cat[0], 'value') else str(cat[0]) for cat in categories if cat[0]]

        if not category_list:
            type_query = db.session.query(Device.device_type).distinct().filter(Device.device_type.isnot(None))
            if ctx.tenant_id:
                type_query = type_query.filter(Device.tenant_id == ctx.tenant_id)
            types = type_query.all()
            type_list = [t[0] for t in types if t[0]]

            hearing_types = ['BTE', 'ITE', 'RIC', 'CIC', 'RIC-BTE', 'HEARING_AID', 'hearing_aid']
            if any(t in hearing_types for t in type_list):
                if 'hearing_aid' not in category_list:
                    category_list.append('hearing_aid')

            for t in type_list:
                if t not in category_list:
                    category_list.append(t)

        return success_response(data={'categories': category_list})
    except Exception as e:
        logger.error(f"Get device categories error: {str(e)}")
        return error_response(str(e), status_code=500)


@devices_bp.route('/devices/brands', methods=['GET'])
@unified_access(resource='devices', action='read')
def get_device_brands(ctx):
    """Get available device brands"""
    try:
        # Get brands from both Brand table and Device/Inventory tables
        brands_set = set()
        
        # From Brand table
        from models.brand import Brand
        brand_models = Brand.query.all()
        for brand in brand_models:
            if brand.name:
                brands_set.add(brand.name)
        
        # From Device table
        device_query = db.session.query(Device.brand).distinct().filter(
            Device.brand.isnot(None),
            Device.brand != ''
        )
        if ctx.tenant_id:
            device_query = device_query.filter(Device.tenant_id == ctx.tenant_id)
        
        for brand in device_query.all():
            if brand[0]:
                brands_set.add(brand[0])
        
        # From Inventory table (for backward compatibility)
        inv_query = db.session.query(InventoryItem.brand).distinct().filter(
            InventoryItem.brand.isnot(None),
            InventoryItem.brand != ''
        )
        if ctx.tenant_id:
            inv_query = inv_query.filter(InventoryItem.tenant_id == ctx.tenant_id)
        
        for brand in inv_query.all():
            if brand[0]:
                brands_set.add(brand[0])
        
        brand_list = sorted(list(brands_set))
        return success_response(data={'brands': brand_list})
    except Exception as e:
        logger.error(f"Get device brands error: {str(e)}")
        return error_response(str(e), status_code=500)


@devices_bp.route('/devices/brands', methods=['POST'])
@unified_access(resource='devices', action='create')
@idempotent(methods=['POST'])
def create_device_brand(ctx):
    """Create a new device brand"""
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return error_response("Brand name is required", status_code=400)

        brand_name = data['name'].strip()
        if not brand_name:
            return error_response("Brand name cannot be empty", status_code=400)

        # Check if brand already exists
        query = db.session.query(Device.brand).filter(Device.brand == brand_name)
        if ctx.tenant_id:
            query = query.filter(Device.tenant_id == ctx.tenant_id)
        existing_brand = query.first()
        
        if existing_brand:
            return error_response("Brand already exists", status_code=409)

        # Create placeholder device
        placeholder_device = Device(
            tenant_id=ctx.tenant_id,
            serial_number=f"BRAND_PLACEHOLDER_{brand_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            brand=brand_name,
            model=f"Placeholder for {brand_name}",
            category="aksesuar",
            device_type="aksesuar",
            status='IN_STOCK',
            patient_id="inventory",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        db.session.add(placeholder_device)
        db.session.commit()

        return success_response(
            data={
                'brand': {
                    'name': brand_name,
                    'created_at': datetime.now().isoformat()
                }
            },
            status_code=201
        )
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create device brand error: {str(e)}")
        return error_response("Internal server error", status_code=500)


@devices_bp.route('/devices/low-stock', methods=['GET'])
@unified_access(resource='devices', action='read')
def get_low_stock_devices(ctx):
    """Get devices with low stock levels"""
    try:
        query = Device.query.filter(Device.status == 'IN_STOCK')
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
        devices = query.limit(10).all()

        return success_response(
            data={
                'devices': [device.to_dict() for device in devices],
                'count': len(devices)
            }
        )
    except Exception as e:
        logger.error(f"Get low stock devices error: {str(e)}")
        return error_response(str(e), status_code=500)
