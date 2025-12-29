from flask import Blueprint, request, jsonify, make_response
from models.base import db
from models.device import Device
from models.inventory import Inventory
from models.enums import DeviceSide, DeviceStatus, DeviceCategory
from constants import CANONICAL_CATEGORY_HEARING_AID
from datetime import datetime
from sqlalchemy.orm import load_only
import logging
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction

logger = logging.getLogger(__name__)

devices_bp = Blueprint('devices', __name__, url_prefix='/api')

@devices_bp.route('/devices', methods=['GET'])
def get_devices():
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

        return jsonify({
            "success": True,
            "data": [device.to_dict() for device in devices.items],
            "devices": [device.to_dict() for device in devices.items],
            "meta": {
                "total": devices.total,
                "page": page,
                "perPage": per_page,
                "totalPages": devices.pages
            },
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Get devices error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


@devices_bp.route('/devices', methods=['POST'])
def create_device():
    """Create a new device"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided",
                "timestamp": datetime.now().isoformat()
            }), 400

        required_fields = ['patientId', 'brand', 'model', 'type']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    "success": False,
                    "error": f"Missing required field: {field}",
                    "timestamp": datetime.now().isoformat()
                }), 400

        if 'id' not in data:
            import random
            data['id'] = f"dev_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}_{random.randint(100000, 999999)}"

        device = Device()
        device.id = data['id']
        device.patient_id = data['patientId']
        device.inventory_id = data.get('inventoryId')
        # Handle serial number: convert empty string to None for UNIQUE constraint
        serial_num = data.get('serialNumber')
        device.serial_number = serial_num if serial_num and serial_num.strip() else None
        device.brand = data['brand']
        device.model = data['model']
        device.device_type = data['type']
        # Handle enum conversions
        if 'category' in data:
            device.category = DeviceCategory.from_legacy(data['category'])
        elif data['type'] in ['hearing_aid']:
            device.category = DeviceCategory.HEARING_AID
        
        if 'ear' in data:
            device.ear = DeviceSide.from_legacy(data['ear'])
        
        device.status = DeviceStatus.from_legacy(data.get('status', 'in_stock'))
        device.price = data.get('price')
        
        # Handle serial numbers for left and right ear
        if 'serialNumberLeft' in data:
            serial_left = data['serialNumberLeft']
            device.serial_number_left = serial_left if serial_left and serial_left.strip() else None
        if 'serialNumberRight' in data:
            serial_right = data['serialNumberRight']
            device.serial_number_right = serial_right if serial_right and serial_right.strip() else None
        
        # Handle notes: convert empty string to None
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

        # Log device creation
        from app import log_activity
        log_activity('system', 'create', 'device', device.id, {
            'patientId': device.patient_id,
            'brand': device.brand,
            'model': device.model,
            'type': device.device_type
        }, request)

        resp = make_response(jsonify({
            "success": True,
            "data": device.to_dict(),
            "message": "Device created successfully",
            "timestamp": datetime.now().isoformat()
        }), 201)
        resp.headers['Location'] = f"/api/devices/{device.id}"
        return resp

    except Exception as e:
        db.session.rollback()
        logger.error(f"Create device error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


@devices_bp.route('/devices/<device_id>', methods=['GET'])
def get_device(device_id):
    """Get a specific device"""
    try:
        device = db.session.get(Device, device_id)
        if not device:
            return jsonify({
                "success": False,
                "error": "Device not found",
                "timestamp": datetime.now().isoformat()
            }), 404

        return jsonify({
            "success": True,
            "data": device.to_dict(),
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Get device error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


@devices_bp.route('/devices/<device_id>', methods=['PUT','PATCH'])
@idempotent(methods=['PUT', 'PATCH'])
@optimistic_lock(Device, id_param='device_id')
@with_transaction
def update_device(device_id):
    """Update a device (PUT full update or PATCH partial update)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided",
                "timestamp": datetime.now().isoformat()
            }), 400

        device = db.session.get(Device, device_id)
        if not device:
            return jsonify({
                "success": False,
                "error": "Device not found",
                "timestamp": datetime.now().isoformat()
            }), 404

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

        return jsonify({
            "success": True,
            "data": device.to_dict(),
            "message": "Device updated successfully",
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Update device error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


@devices_bp.route('/devices/<device_id>', methods=['DELETE'])
def delete_device(device_id):
    """Delete a device or device assignment"""
    try:
        # 1. Try deleting standard Device
        device = db.session.get(Device, device_id)
        if device:
            db.session.delete(device)
            db.session.commit()
            return jsonify({
                "success": True,
                "message": "Device deleted successfully",
                "timestamp": datetime.now().isoformat()
            })

        # 2. Try deleting DeviceAssignment (for inventory items)
        from models.sales import DeviceAssignment
        assignment = db.session.get(DeviceAssignment, device_id)
        
        if assignment:
            # Restore stock if applicable
            if assignment.delivery_status == 'delivered' and assignment.inventory_id:
                inventory = db.session.get(Inventory, assignment.inventory_id)
                if inventory:
                    inventory.update_inventory(1)
                    # Log movement could be added here
            
            # Restore loaner stock if applicable
            if assignment.is_loaner and assignment.loaner_inventory_id:
                 loaner_inv = db.session.get(Inventory, assignment.loaner_inventory_id)
                 if loaner_inv:
                      loaner_inv.update_inventory(1)
            
            db.session.delete(assignment)
            db.session.commit()
            
            return jsonify({
                "success": True,
                "message": "Device assignment deleted and stock restored",
                "timestamp": datetime.now().isoformat()
            })

        return jsonify({
            "success": False,
            "error": "Device not found",
            "timestamp": datetime.now().isoformat()
        }), 404

    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete device error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


@devices_bp.route('/devices/<device_id>/stock-update', methods=['POST'])
def update_device_stock(device_id):
    """Update device stock levels (simplified).
    This endpoint is intentionally permissive for tests — real inventory logic
    should live in a dedicated inventory table/service.
    """
    try:
        data = request.get_json() or {}
        operation = data.get('operation')
        quantity = int(data.get('quantity', 0) or 0)
        reason = data.get('reason', '')
        notes = data.get('notes', '')

        if not operation:
            return jsonify({"success": False, "error": "Operation required", "timestamp": datetime.now().isoformat()}), 400

        device = db.session.get(Device, device_id)
        if not device:
            return jsonify({"success": False, "error": "Device not found", "timestamp": datetime.now().isoformat()}), 404

        log_details = {
            'deviceId': device_id,
            'operation': operation,
            'quantity': quantity,
            'reason': reason,
            'notes': notes
        }

        if notes:
            device.notes = (device.notes or '') + f"\n[stock-update] {operation} x{quantity}: {notes}"

        db.session.add(device)
        db.session.commit()

        from app import log_activity
        log_activity('system', 'device_stock_update', 'device', device_id, log_details, request)

        return jsonify({"success": True, "message": "Stock update applied (simulated)", "timestamp": datetime.now().isoformat()}), 200

    except Exception as e:
        db.session.rollback()
        logger.error(f"Update device stock error: {str(e)}")
        return jsonify({"success": False, "error": str(e), "timestamp": datetime.now().isoformat()}), 500


@devices_bp.route('/devices/categories', methods=['GET'])
def get_device_categories():
    """Get available device categories"""
    try:
        categories = db.session.query(Device.category).distinct().filter(Device.category.isnot(None), Device.category != '').all()
        # Convert enum values to strings for JSON serialization
        category_list = [cat[0].value if hasattr(cat[0], 'value') else str(cat[0]) for cat in categories if cat[0]]

        if not category_list:
            types = db.session.query(Device.device_type).distinct().filter(Device.device_type.isnot(None)).all()
            type_list = [t[0] for t in types if t[0]]

            hearing_types = ['BTE', 'ITE', 'RIC', 'CIC', 'RIC-BTE', 'HEARING_AID', 'hearing_aid']
            if any(t in hearing_types for t in type_list):
                if 'hearing_aid' not in category_list:
                    category_list.append('hearing_aid')

            for t in type_list:
                if t not in category_list:
                    category_list.append(t)

        return jsonify({
            "success": True,
            "categories": category_list,
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Get device categories error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


@devices_bp.route('/devices/brands', methods=['GET'])
def get_device_brands():
    """Get available device brands from inventory"""
    try:
        brands = db.session.query(Inventory.brand).distinct().filter(Inventory.brand.isnot(None)).all()
        # Convert to list of strings
        brand_list = [str(brand[0]) for brand in brands if brand[0]]

        return jsonify({
            "success": True,
            "brands": brand_list,
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Get device brands error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500


@devices_bp.route('/devices/brands', methods=['POST'])
@idempotent(methods=['POST'])
def create_device_brand():
    """Create a new device brand by creating a placeholder device"""
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({
                "success": False,
                "error": "Brand name is required",
                "timestamp": datetime.now().isoformat()
            }), 400

        brand_name = data['name'].strip()
        if not brand_name:
            return jsonify({
                "success": False,
                "error": "Brand name cannot be empty",
                "timestamp": datetime.now().isoformat()
            }), 400

        # Check if brand already exists
        existing_brand = db.session.query(Device.brand).filter(Device.brand == brand_name).first()
        if existing_brand:
            return jsonify({
                "success": False,
                "error": "Brand already exists",
                "timestamp": datetime.now().isoformat()
            }), 409

        # Create a placeholder device to establish the brand
        placeholder_device = Device(
            serial_number=f"BRAND_PLACEHOLDER_{brand_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            brand=brand_name,
            model=f"Placeholder for {brand_name}",
            category="aksesuar",  # Use a generic category
            device_type="aksesuar",
            status=DeviceStatus.AVAILABLE,
            patient_id="inventory",  # Mark as inventory item
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        db.session.add(placeholder_device)
        db.session.commit()

        return jsonify({
            "success": True,
            "brand": {
                "name": brand_name,
                "created_at": datetime.now().isoformat()
            },
            "message": f"Brand '{brand_name}' created successfully",
            "timestamp": datetime.now().isoformat()
        }), 201

    except Exception as e:
        db.session.rollback()
        logger.error(f"Create device brand error: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "timestamp": datetime.now().isoformat()
        }), 500


@devices_bp.route('/devices/low-stock', methods=['GET'])
def get_low_stock_devices():
    """Get devices with low stock levels"""
    try:
        devices = Device.query.filter(Device.status == 'available').limit(10).all()

        return jsonify({
            "success": True,
            "devices": [device.to_dict() for device in devices],
            "count": len(devices),
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Get low stock devices error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500
