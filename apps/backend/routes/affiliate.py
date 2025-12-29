from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.affiliate_user import AffiliateUser
from services.affiliate_service import AffiliateService
from db import get_db
from typing import List

router = APIRouter(prefix="/affiliate", tags=["affiliate"])

def get_affiliate_service():
    return AffiliateService

@router.post("/register", response_model=None)
def register_affiliate(email: str, password: str, iban: str, db: Session = Depends(get_db)):
    try:
        affiliate = AffiliateService.create_affiliate(db, email, password, iban)
        return {"id": affiliate.id, "email": affiliate.email}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=None)
def login_affiliate(email: str, password: str, db: Session = Depends(get_db)):
    user = AffiliateService.authenticate(db, email, password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"id": user.id, "email": user.email}

@router.get("/me", response_model=None)
def get_me(affiliate_id: int, db: Session = Depends(get_db)):
    user = AffiliateService.get_affiliate_by_id(db, affiliate_id)
    if not user:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    return {"id": user.id, "email": user.email, "iban": user.iban, "is_active": user.is_active}

@router.get("/list", response_model=List[dict])
def list_affiliates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = AffiliateService.list_affiliates(db, skip, limit)
    return [{"id": u.id, "email": u.email, "iban": u.iban, "is_active": u.is_active} for u in users]
