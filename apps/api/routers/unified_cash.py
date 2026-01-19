"""
FastAPI Unified Cash Router - Migrated from Flask routes/unified_cash.py
Provides unified view of all financial records (sales, payments, cash)
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from schemas.base import ResponseEnvelope
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["UnifiedCash"])

# --- Helper Functions ---

def derive_record_type(notes: str) -> str:
    """Derive record type from notes"""
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

# --- Routes ---

@router.get("/unified-cash-records", operation_id="listUnifiedCashRecords")
def get_unified_cash_records(
    limit: int = Query(200, ge=1, le=1000),
    record_type: Optional[str] = None,
    party_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """
    Unified cash records endpoint - returns all financial records from one place.
    
    Combines:
    - Sales (satışlar)
    - PaymentRecords (ödeme kayıtları)
    - Cash Records (nakit kayıtları)
    """
    try:
        from models.sales import Sale, PaymentRecord
        from core.models.party import Party
        
        # Parse date filters
        start_dt = None
        end_dt = None
        
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except Exception:
                pass
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except Exception:
                pass
        
        unified_records = []
        
        # 1. Sales records
        if not record_type or record_type == 'sale':
            sales_query = db.query(Sale)
            if access.tenant_id:
                sales_query = sales_query.filter(Sale.tenant_id == access.tenant_id)
            
            if party_id:
                sales_query = sales_query.filter(Sale.party_id == party_id)
            if status:
                sales_query = sales_query.filter(Sale.status == status)
            if start_dt:
                sales_query = sales_query.filter(Sale.created_at >= start_dt)
            if end_dt:
                sales_query = sales_query.filter(Sale.created_at <= end_dt)
            
            sales = sales_query.order_by(Sale.created_at.desc()).limit(limit // 3).all()
            
            for sale in sales:
                patient = db.get(Party, sale.party_id) if sale.party_id else None
                patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() if patient else ''
                
                record = {
                    'id': f"sale_{sale.id}",
                    'originalId': sale.id,
                    'recordType': 'sale',
                    'date': sale.created_at.isoformat() if sale.created_at else datetime.now(timezone.utc).isoformat(),
                    'transactionType': 'income',
                    'partyId': sale.party_id,
                    'patientName': patient_name,
                    'amount': float(sale.total_amount or 0),
                    'status': sale.status or 'pending',
                    'description': f"Satış - {sale.notes or ''}",
                    'paymentMethod': 'mixed',
                    'referenceNumber': None,
                    'category': 'sale'
                }
                unified_records.append(record)
        
        # 2. Payment Records
        if not record_type or record_type == 'payment':
            payments_query = db.query(PaymentRecord)
            if access.tenant_id:
                payments_query = payments_query.filter(PaymentRecord.tenant_id == access.tenant_id)
            
            if party_id:
                payments_query = payments_query.filter(PaymentRecord.party_id == party_id)
            if status:
                payments_query = payments_query.filter(PaymentRecord.status == status)
            if start_dt:
                payments_query = payments_query.filter(PaymentRecord.payment_date >= start_dt)
            if end_dt:
                payments_query = payments_query.filter(PaymentRecord.payment_date <= end_dt)
            
            payments = payments_query.order_by(PaymentRecord.payment_date.desc()).limit(limit // 3).all()
            
            for payment in payments:
                patient = db.get(Party, payment.party_id) if payment.party_id else None
                patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() if patient else ''
                
                transaction_type = 'income' if (payment.amount or 0) >= 0 else 'expense'
                
                record = {
                    'id': f"payment_{payment.id}",
                    'originalId': payment.id,
                    'recordType': 'payment',
                    'date': payment.payment_date.isoformat() if payment.payment_date else datetime.now(timezone.utc).isoformat(),
                    'transactionType': transaction_type,
                    'partyId': payment.party_id,
                    'patientName': patient_name,
                    'amount': float(payment.amount or 0),
                    'status': payment.status or 'paid',
                    'description': payment.notes or f"{payment.payment_type or 'Ödeme'} - {payment.payment_method or ''}",
                    'paymentMethod': payment.payment_method or 'unknown',
                    'referenceNumber': payment.reference_number,
                    'category': 'payment'
                }
                unified_records.append(record)
        
        # 3. Cash Records (cash payments)
        if not record_type or record_type == 'cash':
            cash_query = db.query(PaymentRecord).filter(PaymentRecord.payment_method == 'cash')
            if access.tenant_id:
                cash_query = cash_query.filter(PaymentRecord.tenant_id == access.tenant_id)
            
            if party_id:
                cash_query = cash_query.filter(PaymentRecord.party_id == party_id)
            if status:
                cash_query = cash_query.filter(PaymentRecord.status == status)
            if start_dt:
                cash_query = cash_query.filter(PaymentRecord.payment_date >= start_dt)
            if end_dt:
                cash_query = cash_query.filter(PaymentRecord.payment_date <= end_dt)
            
            cash_records = cash_query.order_by(PaymentRecord.payment_date.desc()).limit(limit // 3).all()
            
            for cash_record in cash_records:
                # Skip if already added as payment
                existing_payment_id = f"payment_{cash_record.id}"
                if any(r['id'] == existing_payment_id for r in unified_records):
                    continue
                
                patient = db.get(Party, cash_record.party_id) if cash_record.party_id else None
                patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() if patient else ''
                
                transaction_type = 'income' if (cash_record.amount or 0) >= 0 else 'expense'
                
                record = {
                    'id': f"cash_{cash_record.id}",
                    'originalId': cash_record.id,
                    'recordType': 'cash',
                    'date': cash_record.payment_date.isoformat() if cash_record.payment_date else datetime.now(timezone.utc).isoformat(),
                    'transactionType': transaction_type,
                    'partyId': cash_record.party_id,
                    'patientName': patient_name,
                    'amount': float(cash_record.amount or 0),
                    'status': cash_record.status or 'paid',
                    'description': cash_record.notes or 'Nakit işlem',
                    'paymentMethod': 'cash',
                    'referenceNumber': cash_record.reference_number,
                    'category': derive_record_type(cash_record.notes)
                }
                unified_records.append(record)
        
        # Sort by date (newest first)
        unified_records.sort(key=lambda x: x['date'], reverse=True)
        
        # Apply limit
        unified_records = unified_records[:limit]
        
        # Calculate summary statistics
        total_income = sum(r['amount'] for r in unified_records if r['transactionType'] == 'income')
        total_expense = sum(abs(r['amount']) for r in unified_records if r['transactionType'] == 'expense')
        net_amount = total_income - total_expense
        
        return ResponseEnvelope(
            data=unified_records,
            meta={
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
            }
        )
        
    except Exception as e:
        logger.error(f"Unified cash records error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/unified-cash-records/summary", operation_id="listUnifiedCashRecordSummary")
def get_cash_summary(
    period: str = Query("month"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """
    Financial summary information.
    
    Query parameters:
    - period: summary period (today, week, month, year)
    - start_date, end_date: custom date range
    """
    try:
        from models.sales import Sale, PaymentRecord
        
        # Determine date range
        now = datetime.now(timezone.utc)
        
        if period == 'today':
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = now.replace(hour=23, minute=59, second=59, microsecond=999999)
        elif period == 'week':
            start_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
            start_dt = start_dt - timedelta(days=start_dt.weekday())
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
            # Custom date range
            if start_date and end_date:
                start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            else:
                # Default to this month
                start_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                if now.month == 12:
                    end_dt = now.replace(year=now.year + 1, month=1, day=1) - timedelta(microseconds=1)
                else:
                    end_dt = now.replace(month=now.month + 1, day=1) - timedelta(microseconds=1)
        
        # Build base queries with tenant scoping
        def scoped_query(model):
            q = db.query(model)
            if access.tenant_id:
                q = q.filter(model.tenant_id == access.tenant_id)
            return q
        
        # Sales total
        sales_total = scoped_query(Sale).with_entities(
            func.sum(Sale.total_amount)
        ).filter(
            Sale.created_at >= start_dt,
            Sale.created_at <= end_dt
        ).scalar() or 0
        
        # Payment totals (income)
        payments_income = scoped_query(PaymentRecord).with_entities(
            func.sum(PaymentRecord.amount)
        ).filter(
            PaymentRecord.payment_date >= start_dt,
            PaymentRecord.payment_date <= end_dt,
            PaymentRecord.amount > 0
        ).scalar() or 0
        
        # Payment totals (expense)
        payments_expense = scoped_query(PaymentRecord).with_entities(
            func.sum(PaymentRecord.amount)
        ).filter(
            PaymentRecord.payment_date >= start_dt,
            PaymentRecord.payment_date <= end_dt,
            PaymentRecord.amount < 0
        ).scalar() or 0
        
        # Cash totals
        cash_income = scoped_query(PaymentRecord).with_entities(
            func.sum(PaymentRecord.amount)
        ).filter(
            PaymentRecord.payment_date >= start_dt,
            PaymentRecord.payment_date <= end_dt,
            PaymentRecord.payment_method == 'cash',
            PaymentRecord.amount > 0
        ).scalar() or 0
        
        cash_expense = scoped_query(PaymentRecord).with_entities(
            func.sum(PaymentRecord.amount)
        ).filter(
            PaymentRecord.payment_date >= start_dt,
            PaymentRecord.payment_date <= end_dt,
            PaymentRecord.payment_method == 'cash',
            PaymentRecord.amount < 0
        ).scalar() or 0
        
        total_income = float(sales_total) + float(payments_income) + float(cash_income)
        total_expense = abs(float(payments_expense)) + abs(float(cash_expense))
        net_amount = total_income - total_expense
        
        return ResponseEnvelope(data={
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
        raise HTTPException(status_code=500, detail=str(e))
