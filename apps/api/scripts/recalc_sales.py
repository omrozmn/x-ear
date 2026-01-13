#!/usr/bin/env python3
import os
import sys
from datetime import datetime

# Ensure backend package import works
sys.path.insert(0, os.path.dirname(__file__) + '/..')

from app import app, get_settings
from models.base import db
from models.sales import Sale, DeviceAssignment
from services.pricing import calculate_device_pricing


def run_recalc(patient_id=None, sale_id=None, limit=None):
    with app.app_context():
        q = Sale.query
        if sale_id:
            q = q.filter_by(id=sale_id)
        if patient_id:
            q = q.filter_by(patient_id=patient_id)
        sales = q.order_by(Sale.created_at.desc()).all()
        if limit:
            sales = sales[:int(limit)]

        settings = get_settings().get_json().get('settings', {})

        updated = 0
        processed = 0
        for s in sales:
            processed += 1
            assignments = DeviceAssignment.query.filter_by(sale_id=s.id).all()
            if not assignments:
                # Legacy linkage: right/left ids
                linked_ids = [getattr(s, 'right_ear_assignment_id', None), getattr(s, 'left_ear_assignment_id', None)]
                linked_ids = [lid for lid in linked_ids if lid]
                if linked_ids:
                    assignments = DeviceAssignment.query.filter(DeviceAssignment.id.in_(linked_ids)).all()
            if not assignments:
                continue

            payload = []
            for a in assignments:
                payload.append({
                    'device_id': a.device_id,
                    'base_price': float(a.list_price) if a.list_price else 0.0,
                    'discount_type': a.discount_type,
                    'discount_value': float(a.discount_value or 0.0),
                    'sgk_scheme': a.sgk_scheme
                })

            sgk_scheme = assignments[0].sgk_scheme if assignments and assignments[0].sgk_scheme else settings.get('sgk', {}).get('default_scheme')

            calc = calculate_device_pricing(
                device_assignments=payload,
                accessories=[],
                services=[],
                sgk_scheme=sgk_scheme,
                settings=settings
            )

            s.list_price_total = calc.get('total_amount', s.list_price_total)
            s.total_amount = calc.get('total_amount', s.total_amount)
            s.discount_amount = calc.get('total_discount', s.discount_amount)
            s.final_amount = calc.get('sale_price_total', s.final_amount)
            s.sgk_coverage = calc.get('sgk_coverage_amount', s.sgk_coverage)
            s.patient_payment = calc.get('patient_responsible_amount', s.patient_payment)
            db.session.add(s)
            updated += 1

        db.session.commit()
        print({
            'success': True,
            'updated': updated,
            'processed': processed,
            'timestamp': datetime.now().isoformat()
        })


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='Recalculate SGK and payments for sales')
    parser.add_argument('--patientId', dest='patient_id')
    parser.add_argument('--saleId', dest='sale_id')
    parser.add_argument('--limit', dest='limit')
    args = parser.parse_args()
    run_recalc(patient_id=args.patient_id, sale_id=args.sale_id, limit=args.limit)