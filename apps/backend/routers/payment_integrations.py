"""
FastAPI Payment Integrations Router - Migrated from Flask routes/payment_integrations.py
Handles POS/PayTR payment integrations
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request, Form
from fastapi.responses import PlainTextResponse
from typing import Optional
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
import logging
import os

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from database import get_db, gen_id
from schemas.base import ResponseEnvelope
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments/pos", tags=["PaymentIntegrations"])

# --- Schemas ---

class PayTRConfigUpdate(BaseModel):
    enabled: bool = True
    merchant_id: Optional[str] = None
    merchant_key: Optional[str] = None
    merchant_salt: Optional[str] = None
    test_mode: bool = False

class PayTRInitiateRequest(BaseModel):
    sale_id: Optional[str] = None
    patient_id: Optional[str] = None
    installment_count: int = 1
    amount: float
    description: Optional[str] = None

# --- Helper Functions ---

def get_tenant_paytr_settings(db: Session, tenant_id: str) -> Optional[dict]:
    """Retrieve PayTR settings for a tenant"""
    from models.tenant import Tenant
    
    tenant = db.get(Tenant, access.tenant_id)
    if not tenant or not tenant.settings:
        return None
    
    pos_settings = tenant.settings.get('pos_integration', {})
    if not pos_settings.get('enabled') or pos_settings.get('provider') != 'paytr':
        return None
    
    return {
        'merchant_id': pos_settings.get('merchant_id'),
        'merchant_key': pos_settings.get('merchant_key'),
        'merchant_salt': pos_settings.get('merchant_salt'),
        'test_mode': pos_settings.get('test_mode', False)
    }

# --- Routes ---

@router.get("/paytr/config")
def get_paytr_config(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get Tenant PayTR Config"""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    settings = get_tenant_paytr_settings(db, access.tenant_id) or {}
    
    # Obfuscate secret keys
    m_key = settings.get('merchant_key', '')
    m_salt = settings.get('merchant_salt', '')
    
    masked_key = m_key[:4] + '****' + m_key[-4:] if len(m_key) > 8 else '****'
    masked_salt = m_salt[:4] + '****' + m_salt[-4:] if len(m_salt) > 8 else '****'
    
    return ResponseEnvelope(data={
        'merchant_id': settings.get('merchant_id', ''),
        'merchant_key_masked': masked_key,
        'merchant_salt_masked': masked_salt,
        'test_mode': settings.get('test_mode', False),
        'enabled': bool(settings.get('merchant_id'))
    })

@router.put("/paytr/config")
def update_paytr_config(
    request_data: PayTRConfigUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update Tenant PayTR Config"""
    from models.tenant import Tenant
    
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    # Require admin/tenant_admin
    if access.user and access.user.role not in ['admin', 'tenant_admin']:
        raise HTTPException(status_code=403, detail="Admin permissions required")
    
    tenant = db.get(Tenant, access.tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    if not tenant.settings:
        tenant.settings = {}
    
    pos_settings = tenant.settings.get('pos_integration', {})
    
    # Handle masked keys
    new_key = request_data.merchant_key
    new_salt = request_data.merchant_salt
    
    final_key = new_key if new_key and '****' not in new_key else pos_settings.get('merchant_key', '')
    final_salt = new_salt if new_salt and '****' not in new_salt else pos_settings.get('merchant_salt', '')
    
    pos_settings.update({
        'provider': 'paytr',
        'enabled': request_data.enabled,
        'merchant_id': request_data.merchant_id,
        'merchant_key': final_key,
        'merchant_salt': final_salt,
        'test_mode': request_data.test_mode
    })
    
    tenant.settings['pos_integration'] = pos_settings
    flag_modified(tenant, "settings")
    
    db.commit()
    
    return ResponseEnvelope(message="PayTR config updated")

@router.post("/paytr/initiate")
def initiate_paytr_payment(
    request_data: PayTRInitiateRequest,
    request: Request,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """
    Initiate PayTR Payment
    Supports Sale-linked or Standalone
    """
    from models.sales import Sale, PaymentRecord
    from models.patient import Patient
    from services.paytr_service import PayTRService
    
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    try:
        sale_id = request_data.sale_id
        patient_id = request_data.patient_id
        installment_count = request_data.installment_count
        amount = request_data.amount
        description = request_data.description or ''
        
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Invalid amount")
        
        # Verify Tenant Settings
        settings = get_tenant_paytr_settings(db, access.tenant_id)
        if not settings:
            raise HTTPException(status_code=400, detail="PayTR integration not configured")
        
        sale = None
        if sale_id:
            sale = db.get(Sale, sale_id)
            if not sale or sale.tenant_id != access.tenant_id:
                raise HTTPException(status_code=404, detail="Sale not found")
            
            # Idempotency Check
            existing_pending = db.query(PaymentRecord).filter_by(
                sale_id=sale.id,
                amount=amount,
                status='pending',
                pos_provider='paytr'
            ).order_by(PaymentRecord.payment_date.desc()).first()
            
            if existing_pending:
                time_diff = datetime.now(timezone.utc) - existing_pending.payment_date
                if time_diff < timedelta(minutes=10):
                    logger.warning(f"Duplicate payment initiate blocked for sale {sale.id}, amount {amount}")
                    raise HTTPException(status_code=400, detail="Bu satış için bekleyen bir ödeme zaten var.")
        
        if not patient_id and sale:
            patient_id = sale.patient_id
        
        transaction_id = gen_id("ptr")
        current_branch_id = getattr(access.user, 'branch_id', None) if access.user else None
        
        payment_record = PaymentRecord(
            tenant_id=access.tenant_id,
            branch_id=current_branch_id,
            patient_id=patient_id,
            sale_id=sale_id,
            amount=amount,
            payment_date=datetime.now(timezone.utc),
            payment_method='card',
            payment_type='payment',
            status='pending',
            pos_provider='paytr',
            pos_transaction_id=transaction_id,
            installment_count=installment_count,
            notes=description or (f"Satis #{sale_id}" if sale_id else "Pesin Tahsilat")
        )
        db.add(payment_record)
        db.commit()
        
        paytr = PayTRService(
            merchant_id=settings['merchant_id'],
            merchant_key=settings['merchant_key'],
            merchant_salt=settings['merchant_salt'],
            test_mode=settings['test_mode']
        )
        
        # User Info
        user_name = "Misafir Kullanici"
        user_email = "noreply@xear.com"
        user_phone = "5555555555"
        user_address = "Adres Yok"
        
        if patient_id:
            patient = db.get(Patient, patient_id)
            if patient:
                user_name = f"{patient.first_name} {patient.last_name}"
                user_email = patient.email or user_email
                user_phone = patient.phone or user_phone
                user_address = getattr(patient, 'address_full', None) or user_address
        
        basket_item_name = description or (f"Satis #{sale_id}" if sale_id else "Tahsilat")
        basket = [[basket_item_name, str(amount), 1]]
        
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
        ok_url = f"{frontend_url}/pos/success"
        fail_url = f"{frontend_url}/pos/fail"
        
        ip = request.headers.get('X-Forwarded-For', request.client.host if request.client else '127.0.0.1')
        
        payload = paytr.generate_token_request(
            user_ip=ip,
            order_id=transaction_id,
            email=user_email,
            payment_amount=amount,
            user_basket=basket,
            no_installment="0" if installment_count > 1 else "1",
            max_installment="12",
            user_name=user_name,
            user_address=user_address,
            user_phone=user_phone,
            merchant_ok_url=ok_url,
            merchant_fail_url=fail_url
        )
        
        token_result = paytr.get_token(payload)
        
        if token_result['success']:
            return ResponseEnvelope(data={
                'token': token_result['token'],
                'iframe_url': 'https://www.paytr.com/odeme/guvenli/' + token_result['token'],
                'payment_record_id': payment_record.id
            })
        else:
            raise HTTPException(status_code=400, detail=token_result.get('error', 'PayTR error'))
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PayTR Initiate Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/paytr/callback", response_class=PlainTextResponse)
async def paytr_callback(
    merchant_oid: str = Form(...),
    status: str = Form(...),
    total_amount: Optional[str] = Form(None),
    failed_reason_msg: Optional[str] = Form(None),
    hash: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    PayTR Server-to-Server Callback
    Idempotent: Checks if already paid.
    Public endpoint - validation via PayTR hash check.
    """
    from models.sales import Sale, PaymentRecord
    from services.paytr_service import PayTRService
    
    try:
        # 1. Find Record
        payment = db.query(PaymentRecord).filter_by(pos_transaction_id=merchant_oid).first()
        if not payment:
            logger.error(f"PayTR Callback: Record not found {merchant_oid}")
            return "OK"
        
        # Idempotency Check
        if payment.status in ['paid', 'failed']:
            logger.info(f"PayTR Callback: Transaction {merchant_oid} already processed as {payment.status}")
            return "OK"
        
        # 2. Get Settings
        settings = get_tenant_paytr_settings(db, payment.tenant_id)
        if not settings:
            logger.error(f"PayTR: Settings missing for tenant {payment.tenant_id}")
            return "OK"
        
        # 3. Validate Hash
        paytr = PayTRService(
            merchant_id=settings['merchant_id'],
            merchant_key=settings['merchant_key'],
            merchant_salt=settings['merchant_salt'],
            test_mode=settings['test_mode']
        )
        
        callback_data = {
            'merchant_oid': merchant_oid,
            'status': status,
            'total_amount': total_amount,
            'hash': hash
        }
        
        if not paytr.validate_callback(callback_data):
            logger.error(f"PayTR: Invalid Hash {merchant_oid}")
            return "OK"
        
        # 4. Update
        payment.pos_raw_response = callback_data
        
        if status == 'success':
            payment.status = 'paid'
            payment.pos_status = 'success'
            payment.gross_amount = float(total_amount or 0) / 100
            payment.net_amount = payment.gross_amount
            
            # Update Linked Sale
            if payment.sale_id:
                sale = db.get(Sale, payment.sale_id)
                if sale:
                    sale.paid_amount = float(sale.paid_amount or 0) + float(payment.amount)
                    sale_total = float(sale.total_amount or sale.final_amount or 0)
                    if sale.paid_amount >= sale_total - 0.01:
                        sale.status = 'paid'
                    elif sale.paid_amount > 0:
                        sale.status = 'partial'
        else:
            payment.status = 'failed'
            payment.pos_status = 'failed'
            payment.error_message = failed_reason_msg or 'Unknown Error'
        
        db.commit()
        return "OK"
        
    except Exception as e:
        logger.error(f"PayTR Callback Exception for merchant_oid={merchant_oid}: {str(e)}")
        try:
            error_payment = db.query(PaymentRecord).filter_by(pos_transaction_id=merchant_oid).first()
            if error_payment and error_payment.status == 'pending':
                error_payment.status = 'error'
                error_payment.error_message = f"Callback error: {str(e)}"
                db.commit()
        except:
            pass
        return "OK"

@router.get("/transactions")
def get_pos_transactions(
    provider: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Report Endpoint for POS Transactions (Admin)"""
    from models.sales import PaymentRecord
    
    # Strict admin check
    if not access.is_super_admin and (not access.user or access.user.role not in ['admin', 'tenant_admin']):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Base query
    query = db.query(PaymentRecord).filter(PaymentRecord.pos_provider.isnot(None))
    
    # Tenant scoping if not super admin
    if not access.is_super_admin and access.tenant_id:
        query = query.filter_by(tenant_id=access.tenant_id)
    
    if provider:
        query = query.filter_by(pos_provider=provider)
    
    if start_date:
        try:
            s_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.filter(PaymentRecord.payment_date >= s_dt)
        except:
            pass
    
    if end_date:
        try:
            e_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.filter(PaymentRecord.payment_date <= e_dt)
        except:
            pass
    
    query = query.order_by(PaymentRecord.payment_date.desc()).limit(limit)
    records = query.all()
    
    return ResponseEnvelope(data=[
        p.to_dict() if hasattr(p, 'to_dict') else {'id': p.id}
        for p in records
    ])
