"""
Patients Export Operations
--------------------------
Export patients as CSV with optional filtering.
Uses @unified_access for tenant scoping.
"""

from flask import request, jsonify, make_response
from models.base import db
from models.patient import Patient
import csv
import io
import json
from datetime import datetime
import logging
from . import patients_bp
from utils.decorators import unified_access
from utils.query_policy import tenant_scoped_query

logger = logging.getLogger(__name__)


@patients_bp.route('/patients/export', methods=['GET'])
@unified_access(resource='patients', action='export')
def export_patients_csv(ctx):
    """Export patients as CSV - Unified Access.
    Supports optional query params: status, segment, q (search term).
    """
    try:
        status = request.args.get('status')
        segment = request.args.get('segment')
        q = request.args.get('q')

        # Use tenant-scoped query
        query = tenant_scoped_query(ctx, Patient)
        
        if status:
            query = query.filter_by(status=status)
        if segment:
            query = query.filter_by(segment=segment)
        if q:
            search_filter = f"%{q}%"
            query = query.filter(db.or_(
                Patient.first_name.ilike(search_filter),
                Patient.last_name.ilike(search_filter),
                Patient.tc_number.ilike(search_filter),
                Patient.phone.ilike(search_filter),
                Patient.email.ilike(search_filter),
            ))

        patients = query.order_by(Patient.created_at.desc()).all()

        # Build CSV in memory
        output = io.StringIO()
        writer = csv.writer(output)
        # Header
        writer.writerow(['id','tcNumber','firstName','lastName','phone','email','birthDate','gender','status','segment','tags','createdAt'])
        for p in patients:
            writer.writerow([
                p.id,
                p.tc_number,
                p.first_name,
                p.last_name,
                p.phone,
                p.email,
                p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else '',
                p.gender,
                p.status,
                p.segment,
                json.dumps(json.loads(p.tags) if p.tags else []),
                p.created_at.isoformat() if hasattr(p, 'created_at') and p.created_at else ''
            ])

        csv_bytes = output.getvalue().encode('utf-8')
        output.close()

        # Log export
        from app import log_activity        
        log_activity(ctx.principal_id or 'unknown', 'export', 'patient', None, {'count': len(patients)}, request)

        logger.info(f"Patients exported: {len(patients)} by {ctx.principal_id}")

        response = make_response(csv_bytes)
        response.headers.set('Content-Type', 'text/csv; charset=utf-8')
        response.headers.set('Content-Disposition', 'attachment', filename=f'patients_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv')
        return response
    except Exception as e:
        logger.exception('Export failed: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500
