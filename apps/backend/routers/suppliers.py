"""
FastAPI Suppliers Router - Migrated from Flask routes/suppliers/
Supplier CRUD, search, stats, and product relationships
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel, Field
import logging

from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from dependencies import get_db, get_current_context, AccessContext
from schemas.base import ResponseEnvelope, ApiError
from models.base import db
from models.suppliers import Supplier, ProductSupplier
from models.tenant import Tenant

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Suppliers"])

# --- Helper Functions ---

def tenant_scoped_query(ctx: AccessContext, model):
    """Apply tenant scoping to query"""
    query = model.query
    if ctx.tenant_id:
        query = query.filter_by(tenant_id=ctx.tenant_id)
    return query

def get_or_404_scoped(ctx: AccessContext, model, record_id):
    """Get record with tenant scoping or raise 404"""
    record = db.session.get(model, record_id)
    if not record:
        return None
    if ctx.tenant_id and hasattr(record, 'tenant_id') and record.tenant_id != ctx.tenant_id:
        return None
    return record

# --- Request Schemas ---

class SupplierCreate(BaseModel):
    company_name: str = Field(..., alias="companyName")
    company_code: Optional[str] = Field(None, alias="companyCode")
    tax_number: Optional[str] = Field(None, alias="taxNumber")
    tax_office: Optional[str] = Field(None, alias="taxOffice")
    contact_person: Optional[str] = Field(None, alias="contactPerson")
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    fax: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "Türkiye"
    postal_code: Optional[str] = Field(None, alias="postalCode")
    payment_terms: Optional[str] = Field(None, alias="paymentTerms")
    currency: str = "TRY"
    rating: Optional[float] = None
    notes: Optional[str] = None
    is_active: bool = Field(True, alias="isActive")
    tenant_id: Optional[str] = Field(None, alias="tenantId")

class SupplierUpdate(BaseModel):
    company_name: Optional[str] = Field(None, alias="companyName")
    company_code: Optional[str] = Field(None, alias="companyCode")
    tax_number: Optional[str] = Field(None, alias="taxNumber")
    tax_office: Optional[str] = Field(None, alias="taxOffice")
    contact_person: Optional[str] = Field(None, alias="contactPerson")
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    fax: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = Field(None, alias="postalCode")
    payment_terms: Optional[str] = Field(None, alias="paymentTerms")
    currency: Optional[str] = None
    rating: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = Field(None, alias="isActive")

# --- Routes ---

@router.get("/suppliers")
def get_suppliers(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    city: Optional[str] = None,
    sort_by: str = "company_name",
    sort_order: str = "asc",
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Get all suppliers with filtering and pagination"""
    try:
        query = tenant_scoped_query(ctx, Supplier)
        
        if is_active is not None:
            query = query.filter(Supplier.is_active == is_active)
        
        if city:
            query = query.filter(Supplier.city.ilike(f'%{city}%'))
        
        if search:
            search_term = f'%{search}%'
            query = query.filter(
                or_(
                    Supplier.company_name.ilike(search_term),
                    Supplier.company_code.ilike(search_term),
                    Supplier.contact_person.ilike(search_term),
                    Supplier.email.ilike(search_term),
                    Supplier.phone.ilike(search_term)
                )
            )
            query = query.order_by(Supplier.company_name.asc())
        else:
            if hasattr(Supplier, sort_by):
                order_column = getattr(Supplier, sort_by)
                if sort_order == 'desc':
                    query = query.order_by(order_column.desc())
                else:
                    query = query.order_by(order_column.asc())
        
        total = query.count()
        suppliers = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return ResponseEnvelope(
            data=[s.to_dict() for s in suppliers],
            meta={
                "page": page,
                "perPage": per_page,
                "total": total,
                "totalPages": (total + per_page - 1) // per_page
            }
        )
    except Exception as e:
        logger.error(f"Get suppliers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suppliers/search")
def search_suppliers(
    q: str = Query("", min_length=0),
    limit: int = Query(10, ge=1, le=50),
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Fast supplier search for autocomplete"""
    try:
        if not q or len(q) < 2:
            return ResponseEnvelope(data={"suppliers": []})
        
        search_term = f'%{q}%'
        query = tenant_scoped_query(ctx, Supplier).filter(
            Supplier.is_active == True,
            or_(
                Supplier.company_name.ilike(search_term),
                Supplier.company_code.ilike(search_term),
                Supplier.contact_person.ilike(search_term)
            )
        ).order_by(Supplier.company_name.asc()).limit(limit)
        
        suppliers = query.all()
        
        return ResponseEnvelope(data={"suppliers": [s.to_dict() for s in suppliers]})
    except Exception as e:
        logger.error(f"Search suppliers error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suppliers/stats")
def get_supplier_stats(
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Get supplier statistics"""
    try:
        base_query = tenant_scoped_query(ctx, Supplier)
        
        total_suppliers = base_query.count()
        active_suppliers = base_query.filter_by(is_active=True).count()
        inactive_suppliers = total_suppliers - active_suppliers
        
        # Total product relationships
        if ctx.tenant_id:
            supplier_ids = [s.id for s in base_query.all()]
            total_relationships = ProductSupplier.query.filter(
                ProductSupplier.supplier_id.in_(supplier_ids),
                ProductSupplier.is_active == True
            ).count() if supplier_ids else 0
        else:
            total_relationships = ProductSupplier.query.filter_by(is_active=True).count()
        
        # Average rating
        avg_rating_result = base_query.filter(
            Supplier.is_active == True,
            Supplier.rating.isnot(None)
        ).with_entities(func.avg(Supplier.rating)).scalar()
        
        avg_rating = float(avg_rating_result) if avg_rating_result else 0.0
        
        return ResponseEnvelope(
            data={
                "totalSuppliers": total_suppliers,
                "activeSuppliers": active_suppliers,
                "inactiveSuppliers": inactive_suppliers,
                "totalProductRelationships": total_relationships,
                "averageRating": round(avg_rating, 1)
            }
        )
    except Exception as e:
        logger.error(f"Get supplier stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suppliers/{supplier_id}")
def get_supplier(
    supplier_id: int,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Get a single supplier by ID"""
    try:
        supplier = get_or_404_scoped(ctx, Supplier, supplier_id)
        if not supplier:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Supplier not found", code="SUPPLIER_NOT_FOUND").model_dump(mode="json")
            )
        
        supplier_dict = supplier.to_dict()
        supplier_dict['products'] = [
            ps.to_dict(include_product=True)
            for ps in supplier.products
            if ps.is_active
        ]
        
        return ResponseEnvelope(data=supplier_dict)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get supplier error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/suppliers", status_code=201)
def create_supplier(
    supplier_in: SupplierCreate,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Create a new supplier"""
    try:
        tenant_id = ctx.tenant_id or supplier_in.tenant_id
        
        if not tenant_id:
            tenant = Tenant.query.first()
            if tenant:
                tenant_id = tenant.id
        
        if not tenant_id:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="tenant_id is required", code="TENANT_REQUIRED").model_dump(mode="json")
            )
        
        # Check for duplicate
        existing = Supplier.query.filter_by(
            tenant_id=tenant_id,
            company_name=supplier_in.company_name
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=ApiError(message="Supplier with this company name already exists", code="DUPLICATE").model_dump(mode="json")
            )
        
        data = supplier_in.model_dump(by_alias=False, exclude={'tenant_id'})
        supplier = Supplier(tenant_id=tenant_id, **data)
        
        db_session.add(supplier)
        db_session.commit()
        
        logger.info(f"Supplier created: {supplier.id}")
        return ResponseEnvelope(data=supplier.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create supplier error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/suppliers/{supplier_id}")
def update_supplier(
    supplier_id: int,
    supplier_in: SupplierUpdate,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Update an existing supplier"""
    try:
        supplier = get_or_404_scoped(ctx, Supplier, supplier_id)
        if not supplier:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Supplier not found", code="SUPPLIER_NOT_FOUND").model_dump(mode="json")
            )
        
        data = supplier_in.model_dump(exclude_unset=True, by_alias=False)
        
        # Check for duplicate name
        if 'company_name' in data and data['company_name'] != supplier.company_name:
            existing = Supplier.query.filter_by(
                tenant_id=supplier.tenant_id,
                company_name=data['company_name']
            ).first()
            if existing:
                raise HTTPException(
                    status_code=409,
                    detail=ApiError(message="Supplier with this company name already exists", code="DUPLICATE").model_dump(mode="json")
                )
        
        for key, value in data.items():
            if hasattr(supplier, key):
                setattr(supplier, key, value)
        
        db_session.commit()
        
        logger.info(f"Supplier updated: {supplier.id}")
        return ResponseEnvelope(data=supplier.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update supplier error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/suppliers/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    ctx: AccessContext = Depends(get_current_context),
    db_session: Session = Depends(get_db)
):
    """Delete a supplier (soft delete)"""
    try:
        supplier = get_or_404_scoped(ctx, Supplier, supplier_id)
        if not supplier:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Supplier not found", code="SUPPLIER_NOT_FOUND").model_dump(mode="json")
            )
        
        # Soft delete
        supplier.is_active = False
        
        # Deactivate product relationships
        for ps in supplier.products:
            ps.is_active = False
        
        db_session.commit()
        
        logger.info(f"Supplier deleted (soft): {supplier.id}")
        return ResponseEnvelope(message="Supplier deactivated successfully")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Delete supplier error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
