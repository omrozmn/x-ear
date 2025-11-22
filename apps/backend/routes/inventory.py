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
from models.inventory import Inventory, UNIT_TYPES
from models.brand import Brand
from models.category import Category
from uuid import uuid4

inventory_bp = Blueprint('inventory', __name__, url_prefix='/api/inventory')


@inventory_bp.route('', methods=['GET'])
def get_all_inventory():
    """Get all inventory items with optional filtering and pagination"""
    try:
        # Query parameters for filtering
        category = request.args.get('category')
        brand = request.args.get('brand')
        supplier = request.args.get('supplier')
        low_stock = request.args.get('low_stock', 'false').lower() == 'true'
        out_of_stock = request.args.get('out_of_stock', 'false').lower() == 'true'
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
        
        if brand:
            query = query.filter(Inventory.brand.ilike(f'%{brand}%'))
        
        if supplier:
            query = query.filter(Inventory.supplier.ilike(f'%{supplier}%'))
        
        if low_stock:
            query = query.filter(
                Inventory.available_inventory > 0,
                Inventory.available_inventory <= Inventory.reorder_level
            )
        
        if out_of_stock:
            query = query.filter(Inventory.available_inventory == 0)
        
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
        
        # Safely serialize items so a single bad row doesn't cause a 500
        data_list = []
        for item in items:
            try:
                data_list.append(item.to_dict())
            except Exception as _e:
                print(f"Warning: failed to serialize inventory item {getattr(item, 'id', None)}: {_e}")
                data_list.append({'id': getattr(item, 'id', None), 'name': getattr(item, 'name', None)})
        return jsonify({
            'success': True,
            'data': data_list,
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
    # Advanced search endpoint moved here: preserve original advanced_search behavior
@inventory_bp.route('/search', methods=['GET'])
def advanced_search():
    """Advanced product search with comprehensive filtering"""
    try:
        # Search parameters
        q = request.args.get('q', '').strip()
        category = request.args.get('category')
        brand = request.args.get('brand')
        min_price = request.args.get('minPrice', type=float)
        max_price = request.args.get('maxPrice', type=float)
        in_stock = request.args.get('inStock', type=bool)
        low_stock = request.args.get('lowStock', 'false').lower() == 'true'
        features = request.args.get('features', '').split(',') if request.args.get('features') else []
        supplier = request.args.get('supplier')
        warranty_period = request.args.get('warrantyPeriod', type=int)
        
        # Sorting parameters
        sort_by = request.args.get('sortBy', 'name')
        sort_order = request.args.get('sortOrder', 'asc')
        
        # Pagination parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))
        
        # Validate parameters
        if page < 1:
            page = 1
        if limit < 1 or limit > 100:
            limit = 20
        
        valid_sort_fields = ['name', 'price', 'stock', 'brand', 'category', 'createdAt']
        if sort_by not in valid_sort_fields:
            sort_by = 'name'
        
        if sort_order not in ['asc', 'desc']:
            sort_order = 'asc'
        
        # Build query
        query = Inventory.query
        
        # Text search across multiple fields
        if q:
            search_filter = db.or_(
                Inventory.name.ilike(f'%{q}%'),
                Inventory.brand.ilike(f'%{q}%'),
                Inventory.model.ilike(f'%{q}%'),
                Inventory.barcode.ilike(f'%{q}%'),
                Inventory.description.ilike(f'%{q}%')
            )
            query = query.filter(search_filter)
        
        # Category filter
        if category:
            query = query.filter(Inventory.category == category)
        
        # Brand filter
        if brand:
            query = query.filter(Inventory.brand == brand)
        
        # Price range filter
        if min_price is not None:
            query = query.filter(Inventory.price >= min_price)
        if max_price is not None:
            query = query.filter(Inventory.price <= max_price)
        
        # Stock filters
        if in_stock is not None:
            if in_stock:
                query = query.filter(Inventory.available_inventory > 0)
            else:
                query = query.filter(Inventory.available_inventory <= 0)
        
        if low_stock:
            query = query.filter(Inventory.available_inventory <= Inventory.reorder_level)
        
        # Features filter (assuming features are stored as JSON or comma-separated)
        if features and features[0]:  # Check if features list is not empty
            for feature in features:
                if feature.strip():
                    query = query.filter(Inventory.features.ilike(f'%{feature.strip()}%'))
        
        # Supplier filter
        if supplier:
            query = query.filter(Inventory.supplier == supplier)
        
        # Warranty period filter
        if warranty_period is not None:
            query = query.filter(Inventory.warranty_period >= warranty_period)
        
        # Apply sorting
        sort_column = getattr(Inventory, sort_by, Inventory.name)
        if sort_order == 'desc':
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply pagination
        offset = (page - 1) * limit
        items = query.offset(offset).limit(limit).all()
        
        # Calculate pagination metadata
        total_pages = (total_count + limit - 1) // limit
        
        # Get filter options for frontend
        categories = db.session.query(Inventory.category).distinct().filter(
            Inventory.category.isnot(None)
        ).all()
        brands = db.session.query(Inventory.brand).distinct().filter(
            Inventory.brand.isnot(None)
        ).all()
        suppliers = db.session.query(Inventory.supplier).distinct().filter(
            Inventory.supplier.isnot(None)
        ).all()
        
        # Get price range
        price_stats = db.session.query(
            db.func.min(Inventory.price),
            db.func.max(Inventory.price)
        ).first()
        
        # Safely serialize items for the response
        safe_items = []
        for item in items:
            try:
                safe_items.append(item.to_dict())
            except Exception as _e:
                print(f"Warning: failed to serialize inventory item {getattr(item, 'id', None)}: {_e}")
                safe_items.append({'id': getattr(item, 'id', None), 'name': getattr(item, 'name', None)})

        return jsonify({
            'success': True,
            'data': {
                'items': safe_items,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total_count,
                    'totalPages': total_pages
                },
                'filters': {
                    'categories': [cat[0] for cat in categories if cat[0]],
                    'brands': [brand[0] for brand in brands if brand[0]],
                    'suppliers': [sup[0] for sup in suppliers if sup[0]],
                    'priceRange': {
                        'min': float(price_stats[0]) if price_stats[0] else 0,
                        'max': float(price_stats[1]) if price_stats[1] else 0
                    }
                }
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


@inventory_bp.route('/categories_old', methods=['GET'])
def get_categories_old():
    """Get all available product categories with counts"""
    try:
        # Get categories with item counts
        categories = db.session.query(
            Inventory.category,
            db.func.count(Inventory.id).label('count')
        ).filter(
            Inventory.category.isnot(None)
        ).group_by(Inventory.category).all()
        
        category_list = []
        for category, count in categories:
            if category and category.strip():
                category_list.append({
                    'id': category.lower().replace(' ', '_'),
                    'name': category,
                    'count': count,
                    'description': f'{count} items in {category}'
                })
        
        return jsonify({
            'success': True,
            'data': category_list,
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


@inventory_bp.route('/brands_old', methods=['GET'])
def get_brands_old():
    """Get all available product brands with counts and categories"""
    try:
        # Get brands with item counts and associated categories
        brands_data = db.session.query(
            Inventory.brand,
            Inventory.category,
            db.func.count(Inventory.id).label('count')
        ).filter(
            Inventory.brand.isnot(None)
        ).group_by(Inventory.brand, Inventory.category).all()
        
        # Organize brands with their categories
        brands_dict = {}
        for brand, category, count in brands_data:
            if brand and brand.strip():
                if brand not in brands_dict:
                    brands_dict[brand] = {
                        'name': brand,
                        'count': 0,
                        'categories': []
                    }
                brands_dict[brand]['count'] += count
                if category and category not in brands_dict[brand]['categories']:
                    brands_dict[brand]['categories'].append(category)
        
        brand_list = list(brands_dict.values())
        
        return jsonify({
            'success': True,
            'data': brand_list,
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


@inventory_bp.route('/features', methods=['GET'])
def get_features():
    """Get all available product features with counts"""
    try:
        # Get all items with features
        items_with_features = db.session.query(Inventory.features, Inventory.category).filter(
            Inventory.features.isnot(None)
        ).all()
        
        features_dict = {}
        for features_str, category in items_with_features:
            if features_str and features_str.strip():
                try:
                    # Accept either JSON array or comma-separated string
                    if features_str.strip().startswith('['):
                        parsed = json.loads(features_str)
                        feature_list = [f.strip() for f in parsed if isinstance(f, str) and f.strip()]
                    else:
                        feature_list = [f.strip() for f in features_str.split(',') if f.strip()]
                except Exception:
                    # Skip malformed feature values
                    continue

                for feature in feature_list:
                    if feature not in features_dict:
                        features_dict[feature] = {
                            'name': feature,
                            'count': 0,
                            'category': category
                        }
                    features_dict[feature]['count'] += 1
        
        feature_list = list(features_dict.values())
        
        return jsonify({
            'success': True,
            'data': feature_list,
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


@inventory_bp.route('/brands', methods=['GET'])
def get_brands():
    """Get available brands from both brands table and inventory"""
    try:
        # Get brands from brands table
        brand_objects = Brand.query.all()
        brands_from_table = [b.name for b in brand_objects]
        
        # Get distinct brands from inventory (for backwards compatibility)
        inventory_brands = db.session.query(Inventory.brand).distinct().filter(Inventory.brand.isnot(None)).all()
        brands_from_inventory = [str(brand[0]) for brand in inventory_brands if brand[0] and str(brand[0]).strip()]
        
        # Combine and deduplicate
        all_brands = list(set(brands_from_table + brands_from_inventory))
        all_brands.sort()
        
        return jsonify({
            'success': True,
            'data': {
                'brands': all_brands
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
    """Create a new brand"""
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

        # Check if brand already exists in brands table
        existing_brand = Brand.query.filter_by(name=brand_name).first()
        
        if existing_brand:
            return jsonify({
                'success': False,
                'error': f'Brand "{brand_name}" already exists',
                'requestId': str(uuid4()),
                'timestamp': now_utc().isoformat()
            }), 409

        # Create new brand
        new_brand = Brand(name=brand_name)
        db.session.add(new_brand)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'brand': brand_name,
                'id': new_brand.id
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
        item.stock_code = data.get('stockCode', item.stock_code)
        item.supplier = data.get('supplier', item.supplier)
        item.unit = data.get('unit', item.unit)
        item.description = data.get('description', item.description)
        item.price = float(data.get('price', item.price))
        item.cost = float(data.get('cost', item.cost)) if 'cost' in data else item.cost
        # VAT/KDV handling (support both vatRate and kdv payload fields)
        if 'vatRate' in data:
            item.vat_rate = float(data.get('vatRate') or data.get('kdv', item.vat_rate or 18))
        elif 'kdv' in data:
            item.vat_rate = float(data.get('kdv'))
        # Price/cost include flags (frontend toggles) — support camelCase and snake_case
        if 'priceIncludesKdv' in data:
            item.price_includes_kdv = bool(data.get('priceIncludesKdv'))
        elif 'price_includes_kdv' in data:
            item.price_includes_kdv = bool(data.get('price_includes_kdv'))
        if 'costIncludesKdv' in data:
            item.cost_includes_kdv = bool(data.get('costIncludesKdv'))
        elif 'cost_includes_kdv' in data:
            item.cost_includes_kdv = bool(data.get('cost_includes_kdv'))
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
        
        safe_items = []
        for item in items:
            try:
                safe_items.append(item.to_dict())
            except Exception as _e:
                print(f"Warning: failed to serialize inventory item {getattr(item, 'id', None)}: {_e}")
                safe_items.append({'id': getattr(item, 'id', None), 'name': getattr(item, 'name', None)})

        return jsonify({
            'success': True,
            'data': safe_items,
            'count': len(safe_items)
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
        # Total stock across all inventory items
        try:
            total_stock = int(db.session.query(db.func.coalesce(db.func.sum(Inventory.available_inventory), 0)).scalar() or 0)
        except Exception:
            total_stock = 0
        
        # Calculate total value taking into account whether stored price includes KDV (VAT)
        # and the item's kdv_rate. If price includes KDV, use price as-is; otherwise
        # multiply by (1 + kdv_rate/100).
        try:
            # SQL expression: available_inventory * (CASE WHEN price_includes_kdv THEN price ELSE price * (1 + kdv_rate/100) END)
            total_value_expr = Inventory.available_inventory * db.case(
                (Inventory.price_includes_kdv == True, Inventory.price),
                else_=Inventory.price * (1 + (Inventory.kdv_rate / 100.0))
            )
            total_value = db.session.query(db.func.sum(total_value_expr)).scalar() or 0
        except Exception:
            # Fallback to simple multiplication if DB backend can't handle the case expression
            total_value = db.session.query(
                db.func.sum(Inventory.available_inventory * Inventory.price)
            ).scalar() or 0
        
        # Category breakdown
        try:
            # Use same VAT-aware expression for category breakdown values
            category_value_expr = Inventory.available_inventory * db.case(
                (Inventory.price_includes_kdv == True, Inventory.price),
                else_=Inventory.price * (1 + (Inventory.kdv_rate / 100.0))
            )
            category_stats = db.session.query(
                Inventory.category,
                db.func.count(Inventory.id).label('count'),
                db.func.sum(category_value_expr).label('value')
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
            # Use same VAT-aware expression for brand breakdown values
            brand_value_expr = Inventory.available_inventory * db.case(
                (Inventory.price_includes_kdv == True, Inventory.price),
                else_=Inventory.price * (1 + (Inventory.kdv_rate / 100.0))
            )
            brand_stats = db.session.query(
                Inventory.brand,
                db.func.count(Inventory.id).label('count'),
                db.func.sum(brand_value_expr).label('value')
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
                # DB-level total count (alias for clarity); frontend should use this
                'dbTotalItems': total_items,
                # Total stock across all items
                'totalStock': total_stock,
                # Hearing aid specific KPIs
                'hearingAid': {
                    'count': Inventory.query.filter(Inventory.category == 'hearing_aid').count(),
                    'stock': int(db.session.query(db.func.coalesce(db.func.sum(Inventory.available_inventory), 0)).filter(Inventory.category == 'hearing_aid').scalar() or 0)
                },
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
    """Get all unique inventory categories from both categories table and inventory"""
    try:
        # Get categories from categories table
        category_objects = Category.query.all()
        categories_from_table = [c.name for c in category_objects]
        
        # Get distinct categories from inventory items (for backwards compatibility)
        inventory_categories = db.session.query(Inventory.category).distinct().filter(
            Inventory.category.isnot(None),
            Inventory.category != ''
        ).all()
        categories_from_inventory = [category[0] for category in inventory_categories if category[0]]
        
        # Combine and deduplicate
        all_categories = list(set(categories_from_table + categories_from_inventory))
        all_categories.sort()
        
        return jsonify({
            'success': True,
            'data': {
                'categories': all_categories
            },
            'meta': {
                'total': len(all_categories)
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
    """Create a new inventory category"""
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
        
        # Check if category already exists in categories table
        existing_category = Category.query.filter_by(name=category_name).first()
        
        if existing_category:
            return jsonify({
                'success': False,
                'error': f'Category "{category_name}" already exists',
                'requestId': str(uuid4()),
                'timestamp': now_utc().isoformat()
            }), 409
        
        # Create new category
        new_category = Category(name=category_name)
        db.session.add(new_category)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {
                'category': category_name,
                'id': new_category.id
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


@inventory_bp.route('/units', methods=['GET'])
def get_units():
    """Get all available unit types for inventory items"""
    try:
        return jsonify({
            'success': True,
            'data': UNIT_TYPES,
            'message': 'Unit types retrieved successfully'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
