from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
from models.base import db
from models.patient import Patient
from models.sales import Sale
from models.sales import PaymentRecord
import logging

logger = logging.getLogger(__name__)

unified_cash_bp = Blueprint('unified_cash', __name__)


@unified_cash_bp.route('/unified-cash-records', methods=['GET'])
def get_unified_cash_records():
    """
    Birleşik cash records endpoint'i - tüm finansal kayıtları tek yerden döndürür.
    
    Şu kaynak türlerini birleştirir:
    - Sales (satışlar)
    - PaymentRecords (ödeme kayıtları)
    - Cash Records (nakit kayıtları)
    
    Query parametreleri:
    - limit: maksimum kayıt sayısı (varsayılan: 200)
    - start_date, end_date: tarih filtreleri (ISO format)
    - record_type: kayıt türü filtresi (sale, payment, cash)
    - patient_id: hasta ID filtresi
    - status: durum filtresi (paid, pending, partial)
    """
    try:
        # Query parametrelerini al
        limit = int(request.args.get('limit', '200'))
        record_type = request.args.get('record_type')  # sale, payment, cash
        patient_id = request.args.get('patient_id')
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # Tarih filtreleri için datetime objelerini hazırla
        start_dt = None
        end_dt = None
        
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
                if start_dt.tzinfo is None:
                    start_dt = start_dt.replace(hour=0, minute=0, second=0, microsecond=0)
            except Exception:
                pass
                
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date)
                if end_dt.tzinfo is None:
                    end_dt = end_dt.replace(hour=23, minute=59, second=59, microsecond=999999)
            except Exception:
                pass

        unified_records = []

        # 1. Sales kayıtlarını getir
        if not record_type or record_type == 'sale':
            sales_query = Sale.query
            
            if patient_id:
                sales_query = sales_query.filter(Sale.patient_id == patient_id)
            if status:
                sales_query = sales_query.filter(Sale.status == status)
            if start_dt:
                sales_query = sales_query.filter(Sale.created_at >= start_dt)
            if end_dt:
                sales_query = sales_query.filter(Sale.created_at <= end_dt)
                
            sales = sales_query.order_by(Sale.created_at.desc()).limit(limit // 3).all()
            
            for sale in sales:
                patient = db.session.get(Patient, sale.patient_id) if sale.patient_id else None
                patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() if patient else ''
                
                record = {
                    'id': f"sale_{sale.id}",
                    'originalId': sale.id,
                    'recordType': 'sale',
                    'date': sale.created_at.isoformat() if sale.created_at else datetime.now().isoformat(),
                    'transactionType': 'income',
                    'patientId': sale.patient_id,
                    'patientName': patient_name,
                    'amount': float(sale.total_amount or 0),
                    'status': sale.status or 'pending',
                    'description': f"Satış - {sale.notes or ''}",
                    'paymentMethod': 'mixed',  # Satışlar genelde karışık ödeme
                    'referenceNumber': None,
                    'category': 'sale'
                }
                unified_records.append(record)

        # 2. Payment Records kayıtlarını getir
        if not record_type or record_type == 'payment':
            payments_query = PaymentRecord.query
            
            if patient_id:
                payments_query = payments_query.filter(PaymentRecord.patient_id == patient_id)
            if status:
                payments_query = payments_query.filter(PaymentRecord.status == status)
            if start_dt:
                payments_query = payments_query.filter(PaymentRecord.payment_date >= start_dt)
            if end_dt:
                payments_query = payments_query.filter(PaymentRecord.payment_date <= end_dt)
                
            payments = payments_query.order_by(PaymentRecord.payment_date.desc()).limit(limit // 3).all()
            
            for payment in payments:
                patient = db.session.get(Patient, payment.patient_id) if payment.patient_id else None
                patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() if patient else ''
                
                # Ödeme türünü belirle (pozitif = gelir, negatif = gider)
                transaction_type = 'income' if (payment.amount or 0) >= 0 else 'expense'
                
                record = {
                    'id': f"payment_{payment.id}",
                    'originalId': payment.id,
                    'recordType': 'payment',
                    'date': payment.payment_date.isoformat() if payment.payment_date else datetime.now().isoformat(),
                    'transactionType': transaction_type,
                    'patientId': payment.patient_id,
                    'patientName': patient_name,
                    'amount': float(payment.amount or 0),
                    'status': payment.status or 'paid',
                    'description': payment.notes or f"{payment.payment_type or 'Ödeme'} - {payment.payment_method or ''}",
                    'paymentMethod': payment.payment_method or 'unknown',
                    'referenceNumber': payment.reference_number,
                    'category': 'payment'
                }
                unified_records.append(record)

        # 3. Cash Records (özel nakit kayıtları) - PaymentRecord'dan cash olanları
        if not record_type or record_type == 'cash':
            cash_query = PaymentRecord.query.filter(PaymentRecord.payment_method == 'cash')
            
            if patient_id:
                cash_query = cash_query.filter(PaymentRecord.patient_id == patient_id)
            if status:
                cash_query = cash_query.filter(PaymentRecord.status == status)
            if start_dt:
                cash_query = cash_query.filter(PaymentRecord.payment_date >= start_dt)
            if end_dt:
                cash_query = cash_query.filter(PaymentRecord.payment_date <= end_dt)
                
            cash_records = cash_query.order_by(PaymentRecord.payment_date.desc()).limit(limit // 3).all()
            
            def derive_record_type(notes: str) -> str:
                """Notlardan kayıt türünü çıkar"""
                n = (notes or '').lower()
                if 'pil' in n or 'batarya' in n:
                    return 'pil'
                if 'filtre' in n:
                    return 'filtre'
                if 'tamir' in n or 'onarım' in n:
                    return 'tamir'
                if 'kaparo' in n or 'kapora' in n:
                    return 'kaparo'
                if 'kalıp' in n:
                    return 'kalip'
                if 'teslim' in n:
                    return 'teslimat'
                return 'diger'
            
            for cash_record in cash_records:
                # Eğer bu kayıt zaten payment olarak eklendiyse, tekrar ekleme
                existing_payment_id = f"payment_{cash_record.id}"
                if any(r['id'] == existing_payment_id for r in unified_records):
                    continue
                    
                patient = db.session.get(Patient, cash_record.patient_id) if cash_record.patient_id else None
                patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() if patient else ''
                
                transaction_type = 'income' if (cash_record.amount or 0) >= 0 else 'expense'
                
                record = {
                    'id': f"cash_{cash_record.id}",
                    'originalId': cash_record.id,
                    'recordType': 'cash',
                    'date': cash_record.payment_date.isoformat() if cash_record.payment_date else datetime.now().isoformat(),
                    'transactionType': transaction_type,
                    'patientId': cash_record.patient_id,
                    'patientName': patient_name,
                    'amount': float(cash_record.amount or 0),
                    'status': cash_record.status or 'paid',
                    'description': cash_record.notes or 'Nakit işlem',
                    'paymentMethod': 'cash',
                    'referenceNumber': cash_record.reference_number,
                    'category': derive_record_type(cash_record.notes)
                }
                unified_records.append(record)

        # Kayıtları tarihe göre sırala (en yeni önce)
        unified_records.sort(key=lambda x: x['date'], reverse=True)
        
        # Limit uygula
        unified_records = unified_records[:limit]

        # Özet istatistikleri hesapla
        total_income = sum(r['amount'] for r in unified_records if r['transactionType'] == 'income')
        total_expense = sum(abs(r['amount']) for r in unified_records if r['transactionType'] == 'expense')
        net_amount = total_income - total_expense

        return jsonify({
            'success': True,
            'data': unified_records,
            'totalCount': len(unified_records),
            'summary': {
                'totalIncome': total_income,
                'totalExpense': total_expense,
                'netAmount': net_amount,
                'recordTypes': {
                    'sales': len([r for r in unified_records if r['recordType'] == 'sale']),
                    'payments': len([r for r in unified_records if r['recordType'] == 'payment']),
                    'cash': len([r for r in unified_records if r['recordType'] == 'cash'])
                }
            }
        })

    except Exception as e:
        db.session.rollback()
        logger.error(f"Unified cash records error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@unified_cash_bp.route('/unified-cash-records/summary', methods=['GET'])
def get_cash_summary():
    """
    Finansal özet bilgileri döndürür.
    
    Query parametreleri:
    - period: özet dönemi (today, week, month, year)
    - start_date, end_date: özel tarih aralığı
    """
    try:
        period = request.args.get('period', 'month')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Tarih aralığını belirle
        now = datetime.now()
        
        if period == 'today':
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif period == 'week':
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            start_dt = start_dt - timedelta(days=start_dt.weekday())  # Haftanın başı
            end_dt = start_dt + timedelta(days=6, hours=23, minutes=59, seconds=59)
        elif period == 'month':
            start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                end_dt = now.replace(year=now.year + 1, month=1, day=1) - timedelta(microseconds=1)
            else:
                end_dt = now.replace(month=now.month + 1, day=1) - timedelta(microseconds=1)
        elif period == 'year':
            start_dt = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
            end_dt = now.replace(year=now.year + 1, month=1, day=1) - timedelta(microseconds=1)
        else:
            # Özel tarih aralığı
            if start_date and end_date:
                start_dt = datetime.fromisoformat(start_date)
                end_dt = datetime.fromisoformat(end_date)
            else:
                # Varsayılan olarak bu ay
                start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if now.month == 12:
                    end_dt = now.replace(year=now.year + 1, month=1, day=1) - timedelta(microseconds=1)
                else:
                    end_dt = now.replace(month=now.month + 1, day=1) - timedelta(microseconds=1)

        # Sales toplamları
        sales_total = db.session.query(db.func.sum(Sale.total_amount)).filter(
            Sale.created_at >= start_dt,
            Sale.created_at <= end_dt
        ).scalar() or 0

        # Payment toplamları (gelir)
        payments_income = db.session.query(db.func.sum(PaymentRecord.amount)).filter(
            PaymentRecord.payment_date >= start_dt,
            PaymentRecord.payment_date <= end_dt,
            PaymentRecord.amount > 0
        ).scalar() or 0

        # Payment toplamları (gider)
        payments_expense = db.session.query(db.func.sum(PaymentRecord.amount)).filter(
            PaymentRecord.payment_date >= start_dt,
            PaymentRecord.payment_date <= end_dt,
            PaymentRecord.amount < 0
        ).scalar() or 0

        # Cash toplamları
        cash_income = db.session.query(db.func.sum(PaymentRecord.amount)).filter(
            PaymentRecord.payment_date >= start_dt,
            PaymentRecord.payment_date <= end_dt,
            PaymentRecord.payment_method == 'cash',
            PaymentRecord.amount > 0
        ).scalar() or 0

        cash_expense = db.session.query(db.func.sum(PaymentRecord.amount)).filter(
            PaymentRecord.payment_date >= start_dt,
            PaymentRecord.payment_date <= end_dt,
            PaymentRecord.payment_method == 'cash',
            PaymentRecord.amount < 0
        ).scalar() or 0

        total_income = float(sales_total) + float(payments_income) + float(cash_income)
        total_expense = abs(float(payments_expense)) + abs(float(cash_expense))
        net_amount = total_income - total_expense

        return jsonify({
            'success': True,
            'period': period,
            'startDate': start_dt.isoformat(),
            'endDate': end_dt.isoformat(),
            'summary': {
                'totalIncome': total_income,
                'totalExpense': total_expense,
                'netAmount': net_amount,
                'breakdown': {
                    'sales': float(sales_total),
                    'paymentsIncome': float(payments_income),
                    'paymentsExpense': abs(float(payments_expense)),
                    'cashIncome': float(cash_income),
                    'cashExpense': abs(float(cash_expense))
                }
            }
        })

    except Exception as e:
        logger.error(f"Cash summary error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500