from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from models.affiliate_user import AffiliateUser
from services.affiliate_service import AffiliateService
from db import get_db
from typing import List

router = APIRouter(prefix="/affiliate", tags=["affiliate"])

def get_affiliate_service():
    return AffiliateService


class AffiliateRegisterRequest(BaseModel):
    email: str
    password: str
    iban: str | None = None


class AffiliateLoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register", response_model=None)
def register_affiliate(payload: AffiliateRegisterRequest, db: Session = Depends(get_db)):
    try:
        affiliate = AffiliateService.create_affiliate(db, payload.email, payload.password, payload.iban)
        return {"id": affiliate.id, "email": affiliate.email, "code": affiliate.code}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=None)
def login_affiliate(payload: AffiliateLoginRequest, db: Session = Depends(get_db)):
    user = AffiliateService.authenticate(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return {"id": user.id, "email": user.email}

@router.get("/me", response_model=None)
def get_me(affiliate_id: int, db: Session = Depends(get_db)):
    user = AffiliateService.get_affiliate_by_id(db, affiliate_id)
    if not user:
        raise HTTPException(status_code=404, detail="Affiliate not found")
    return {"id": user.id, "email": user.email, "iban": user.iban, "is_active": user.is_active, "code": user.code}


@router.patch("/{affiliate_id}", response_model=None)
def update_affiliate_iban(affiliate_id: int, iban: str, db: Session = Depends(get_db)):
    try:
        user = AffiliateService.update_iban(db, affiliate_id, iban)
        return {"id": user.id, "iban": user.iban}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/list", response_model=List[dict])
def list_affiliates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = AffiliateService.list_affiliates(db, skip, limit)
    return [{"id": u.id, "email": u.email, "iban": u.iban, "is_active": u.is_active} for u in users]
