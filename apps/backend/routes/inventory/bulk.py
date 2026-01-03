"""Inventory Bulk Operations"""
from flask import request, jsonify
from models.base import db
from models.inventory import InventoryItem as Inventory
from . import inventory_bp
from utils.decorators import unified_access
from utils.idempotency import idempotent
import csv
import io
import logging

logger = logging.getLogger(__name__)

@inventory_bp.route('/bulk_upload', methods=['POST'])
@unified_access(resource='inventory', action='write')
@idempotent(methods=['POST'])
def bulk_upload_inventory(ctx):
    """Bulk upload inventory items from CSV"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        if not file.filename:
            return jsonify({'success': False, 'error': 'No file selected'}), 400
        
        # Read file content
        content = file.read().decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(content))
        
        created = 0
        updated = 0
        errors = []
        
        for row_num, row in enumerate(reader, start=1):
            try:
                name = row.get('name') or row.get('Name')
                if not name:
                    errors.append({'row': row_num, 'error': 'Missing name'})
                    continue
                
                # Check if exists
                existing = Inventory.query.filter_by(
                    name=name,
                    tenant_id=ctx.tenant_id
                ).first()
                
                if existing:
                    # Update
                    for key, value in row.items():
                        if hasattr(existing, key) and value:
                            setattr(existing, key, value)
                    updated += 1
                else:
                    # Create
                    item = Inventory.from_dict(row)
                    item.tenant_id = ctx.tenant_id
                    db.session.add(item)
                    created += 1
                
                db.session.flush()
            except Exception as e:
                errors.append({'row': row_num, 'error': str(e)})
                db.session.rollback()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'created': created,
            'updated': updated,
            'errors': errors
        }), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Bulk upload error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
