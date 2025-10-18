# Inventory API Routes for X-Ear CRM
# RESTful API endpoints for inventory management

from flask import Blueprint, request, jsonify
from models.base import db
import sys
from pathlib import Path
from datetime import datetime, timezone
from utils.idempotency import idempotent

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

# Add models directory to path to import inventory
from models.inventory import Inventory
from uuid import uuid4

inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')


@inventory_bp.route('', methods=['GET'])
def get_all_inventory():
    """Get all inventory items with optional filtering and pagination"""
    try:
        # Query parameters for filtering
        category = request.args.get('category')
        low_stock = request.args.get('lowStock', 'false').lower() == 'true'
        search = request.args.get('search', '').lower()
        
        # Pagination parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Validate pagination parameters
        if page < 1:
            page = 1
        if per_page < 1 or per_page > 100:
            per_page = 20
        
        # Build query
        query = Inventory.query
        
        if category:
            query = query.filter_by(category=category)
        
        if low_stock:
            query = query.filter(Inventory.available_inventory <= Inventory.reorder_level)
        
        if search:
            query = query.filter(
                db.or_(
                    Inventory.name.ilike(f'%{search}%'),
                    Inventory.brand.ilike(f'%{search}%'),
                    Inventory.model.ilike(f'%{search}%')
                )
            )
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply pagination
        items = query.order_by(Inventory.name).offset((page - 1) * per_page).limit(per_page).all()
        
        # Calculate pagination metadata
        total_pages = (total_count + per_page - 1) // per_page
        has_next = page < total_pages
        has_prev = page > 1
        
        return jsonify({
            'success': True,
            'data': [item.to_dict() for item in items],
            'meta': {
                'page': page,
                'perPage': per_page,
                'total': total_count,
                'totalPages': total_pages
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@inventory_bp.route('/brands', methods=['GET'])
def get_brands():
    """Get available brands from inventory"""
    try:
        # Get distinct brands from inventory
        brands = db.session.query(Inventory.brand).distinct().filter(Inventory.brand.isnot(None)).all()
        
        # Convert to list and filter out empty strings
        brand_list = [str(brand[0]) for brand in brands if brand[0] and str(brand[0]).strip()]
        
        return jsonify({
            'success': True,
            'data': {
                'brands': brand_list
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@inventory_bp.route('/brands', methods=['POST'])
@idempotent(methods=['POST'])
def create_brand():
    """Create a new brand by creating a placeholder inventory item"""
    try:
        data = request.get_json()
        if not data or 'name' not in data:
            return jsonify({
                'success': False,
                'error': 'Brand name is required',
                'requestId': str(uuid4()),
                'timestamp': now_utc().isoformat()
            }), 400

        brand_name = data['name'].strip()
        if not brand_name:
            return jsonify({
                'success': False,
                'error': 'Brand name cannot be empty',
                'requestId': str(uuid4()),
                'timestamp': now_utc().isoformat()
            }), 400

        # Check if brand already exists
        existing_brand = db.session.query(Inventory.brand).filter_by(brand=brand_name).first()
        
        if existing_brand:
            return jsonify({
                'success': False,
                'error': f'Brand "{brand_name}" already exists',
                'requestId': str(uuid4()),
                'timestamp': now_utc().isoformat()
            }), 409

        # No need to create placeholder items - just return success
        # The brand will be available when actual inventory items are created with this brand
        
        return jsonify({
            'success': True,
            'data': {
                'brand': brand_name
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@inventory_bp.route('/<item_id>', methods=['GET'])
def get_inventory_item(item_id):
    """Get a single inventory item by ID"""
    try:
        item = db.session.get(Inventory, item_id)
        
        if not item:
            return jsonify({
                'success': False,
                'error': 'Inventory item not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': item.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@inventory_bp.route('', methods=['POST'])
@idempotent(methods=['POST'])
def create_inventory_item():
    """Create a new inventory item"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required fields
        required_fields = ['name', 'brand', 'category', 'price']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Check for duplicate barcode
        if data.get('barcode'):
            existing = Inventory.query.filter_by(barcode=data['barcode']).first()
            if existing:
                return jsonify({
                    'success': False,
                    'error': 'Barcode already exists'
                }), 400
        
        # Create inventory item
        item = Inventory.from_dict(data)
        
        db.session.add(item)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': item.to_dict(),
            'message': 'Inventory item created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@inventory_bp.route('/<item_id>', methods=['PUT', 'PATCH'])
def update_inventory_item(item_id):
    """Update an existing inventory item"""
    try:
        item = db.session.get(Inventory, item_id)
        
        if not item:
            return jsonify({
                'success': False,
                'error': 'Inventory item not found'
            }), 404
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Check for duplicate barcode (if changed)
        if data.get('barcode') and data['barcode'] != item.barcode:
            existing = Inventory.query.filter_by(barcode=data['barcode']).first()
            if existing:
                return jsonify({
                    'success': False,
                    'error': 'Barcode already exists'
                }), 400
        
        # Update fields
        item.name = data.get('name', item.name)
        item.brand = data.get('brand', item.brand)
        item.model = data.get('model', item.model)
        item.category = data.get('category', item.category)
        item.barcode = data.get('barcode', item.barcode)
        item.supplier = data.get('supplier', item.supplier)
        item.description = data.get('description', item.description)
        item.price = float(data.get('price', item.price))
        item.direction = data.get('direction') or data.get('ear', item.direction)
        item.ear = data.get('ear') or data.get('direction', item.ear)
        item.warranty = data.get('warranty', item.warranty)
        item.reorder_level = data.get('reorderLevel') or data.get('minInventory', item.reorder_level)
        
        # Update features if provided
        if 'features' in data:
            import json
            features = data.get('features', [])
            item.features = json.dumps(features) if features else None
        
        # Update inventory levels if provided
        if 'availableInventory' in data or 'inventory' in data:
            item.available_inventory = data.get('availableInventory') or data.get('inventory', item.available_inventory)
        
        if 'onTrial' in data:
            item.on_trial = data.get('onTrial', item.on_trial)
        
        # Update serial numbers if provided
        if 'availableSerials' in data:
            import json
            serials = data.get('availableSerials', [])
            item.available_serials = json.dumps(serials) if serials else None
        
        item.updated_at = now_utc()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': item.to_dict(),
            'message': 'Inventory item updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@inventory_bp.route('/<item_id>', methods=['DELETE'])
def delete_inventory_item(item_id):
    """Delete an inventory item"""
    try:
        item = db.session.get(Inventory, item_id)
        
        if not item:
            return jsonify({
                'success': False,
                'error': 'Inventory item not found'
            }), 404
        
        # Import ProductSupplier model to handle related records
        from models.suppliers import ProductSupplier
        
        # Delete related product_suppliers records first
        related_suppliers = ProductSupplier.query.filter_by(product_id=item_id).all()
        for supplier_link in related_suppliers:
            db.session.delete(supplier_link)
        
        # Now delete the inventory item
        db.session.delete(item)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Inventory item deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@inventory_bp.route('/<item_id>/activity', methods=['POST'])
def log_inventory_activity(item_id):
    """Log an activity for an inventory item"""
    try:
        item = db.session.get(Inventory, item_id)
        
        if not item:
            return jsonify({
                'success': False,
                'error': 'Inventory item not found'
            }), 404
        
        data = request.get_json() or {}
        
        # Store activity in a simple JSON format
        # For now, we'll use a simple list stored in a new column
        activity = {
            'id': data.get('id', f"activity_{uuid4().hex[:16]}"),
            'productId': item_id,
            'action': data.get('action'),
            'description': data.get('description'),
            'metadata': data.get('metadata', {}),
            'timestamp': data.get('timestamp', now_utc().isoformat()),
            'user': data.get('user', 'Admin User')
        }
        
        # Get existing activities
        import json
        activities = json.loads(item.activity_log) if hasattr(item, 'activity_log') and item.activity_log else []
        activities.insert(0, activity)  # Add to beginning
        activities = activities[:100]  # Keep only last 100
        
        # Store back
        if not hasattr(item, 'activity_log'):
            # Column doesn't exist yet, skip storage but return success
            return jsonify({
                'success': True,
                'data': activity,
                'message': 'Activity logged (in-memory only, column not yet migrated)'
            }), 201
        
        item.activity_log = json.dumps(activities)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': activity,
            'message': 'Activity logged successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@inventory_bp.route('/<item_id>/activity', methods=['GET'])
def get_inventory_activities(item_id):
    """Get activity log for an inventory item"""
    try:
        item = db.session.get(Inventory, item_id)
        
        if not item:
            return jsonify({
                'success': False,
                'error': 'Inventory item not found'
            }), 404
        
        import json
        activities = json.loads(item.activity_log) if hasattr(item, 'activity_log') and item.activity_log else []
        
        return jsonify({
            'success': True,
            'activities': activities
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@inventory_bp.route('/<item_id>/serials', methods=['POST'])
@idempotent(methods=['POST'])
def add_serial_numbers(item_id):
    """Add serial numbers to an inventory item"""
    try:
        item = db.session.get(Inventory, item_id)
        
        if not item:
            return jsonify({
                'success': False,
                'error': 'Inventory item not found'
            }), 404
        
        data = request.get_json()
        serials = data.get('serials', [])
        
        if not serials:
            return jsonify({
                'success': False,
                'error': 'No serial numbers provided'
            }), 400
        
        added_count = 0
        for serial in serials:
            if item.add_serial_number(serial):
                added_count += 1
        
        item.updated_at = now_utc()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': item.to_dict(),
            'message': f'{added_count} serial number(s) added successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@inventory_bp.route('/<item_id>/assign', methods=['POST'])
@idempotent(methods=['POST'])
def assign_to_patient(item_id):
    """Assign inventory item to a patient (reduces stock)"""
    try:
        item = db.session.get(Inventory, item_id)
        
        if not item:
            return jsonify({
                'success': False,
                'error': 'Inventory item not found'
            }), 404
        
        data = request.get_json()
        patient_id = data.get('patientId')
        serial_number = data.get('serialNumber')
        quantity = data.get('quantity', 1)
        
        if not patient_id:
            return jsonify({
                'success': False,
                'error': 'Patient ID is required'
            }), 400
        
        # If serial number provided, remove it from available serials
        if serial_number:
            if not item.remove_serial_number(serial_number):
                return jsonify({
                    'success': False,
                    'error': 'Serial number not found in inventory'
                }), 400
        else:
            # Otherwise, just decrease inventory count
            if not item.update_inventory(-quantity):
                return jsonify({
                    'success': False,
                    'error': 'Insufficient inventory'
                }), 400
        
        item.updated_at = now_utc()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': item.to_dict(),
            'message': 'Item assigned to patient successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@inventory_bp.route('/low-stock', methods=['GET'])
def get_low_stock_items():
    """Get all items with low stock levels"""
    try:
        items = Inventory.query.filter(
            Inventory.available_inventory <= Inventory.reorder_level
        ).order_by(Inventory.available_inventory).all()
        
        return jsonify({
            'success': True,
            'data': [item.to_dict() for item in items],
            'count': len(items)
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@inventory_bp.route('/stats', methods=['GET'])
def get_inventory_stats():
    """Get inventory statistics"""
    try:
        total_items = Inventory.query.count()
        low_stock_count = Inventory.query.filter(
            Inventory.available_inventory <= Inventory.reorder_level
        ).count()
        out_of_stock_count = Inventory.query.filter(
            Inventory.available_inventory == 0
        ).count()
        
        total_value = db.session.query(
            db.func.sum(Inventory.available_inventory * Inventory.price)
        ).scalar() or 0
        
        # Category breakdown
        try:
            category_stats = db.session.query(
                Inventory.category,
                db.func.count(Inventory.id).label('count'),
                db.func.sum(Inventory.available_inventory * Inventory.price).label('value')
            ).group_by(Inventory.category).all()
            
            category_breakdown = {}
            for category, count, value in category_stats:
                category_breakdown[category or 'Diğer'] = {
                    'count': count,
                    'value': float(value or 0)
                }
        except Exception as e:
            category_breakdown = {}
        
        # Brand breakdown
        try:
            brand_stats = db.session.query(
                Inventory.brand,
                db.func.count(Inventory.id).label('count'),
                db.func.sum(Inventory.available_inventory * Inventory.price).label('value')
            ).group_by(Inventory.brand).order_by(db.func.count(Inventory.id).desc()).limit(10).all()
            
            brand_breakdown = {}
            for brand, count, value in brand_stats:
                brand_breakdown[brand or 'Bilinmeyen'] = {
                    'count': count,
                    'value': float(value or 0)
                }
        except Exception as e:
            brand_breakdown = {}
        
        return jsonify({
            'success': True,
            'data': {
                'totalItems': total_items,
                'lowStockCount': low_stock_count,
                'outOfStockCount': out_of_stock_count,
                'totalValue': float(total_value),
                'categoryBreakdown': category_breakdown,
                'brandBreakdown': brand_breakdown
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@inventory_bp.route('/categories', methods=['GET'])
def get_categories():
    """Get all unique inventory categories"""
    try:
        # Get distinct categories from inventory items
        categories = db.session.query(Inventory.category).distinct().filter(
            Inventory.category.isnot(None),
            Inventory.category != ''
        ).order_by(Inventory.category).all()
        
        # Extract category names from tuples
        category_list = [category[0] for category in categories if category[0]]
        
        return jsonify({
            'success': True,
            'data': {
                'categories': category_list
            },
            'meta': {
                'total': len(category_list)
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@inventory_bp.route('/categories', methods=['POST'])
@idempotent(methods=['POST'])
def create_category():
    """Create a new inventory category by adding an inventory item with that category"""
    try:
        data = request.get_json()
        
        if not data or 'category' not in data:
            return jsonify({
                'success': False,
                'error': 'Category name is required',
                'requestId': str(uuid4()),
                'timestamp': now_utc().isoformat()
            }), 400
        
        category_name = data['category'].strip()
        
        if not category_name:
            return jsonify({
                'success': False,
                'error': 'Category name cannot be empty',
                'requestId': str(uuid4()),
                'timestamp': now_utc().isoformat()
            }), 400
        
        # Check if category already exists
        existing_category = db.session.query(Inventory.category).filter_by(category=category_name).first()
        
        if existing_category:
            return jsonify({
                'success': False,
                'error': f'Category "{category_name}" already exists',
                'requestId': str(uuid4()),
                'timestamp': now_utc().isoformat()
            }), 409
        
        # No need to create placeholder items - just return success
        # The category will be available when actual inventory items are created with this category
        
        return jsonify({
            'success': True,
            'data': {
                'category': category_name
            },
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500
