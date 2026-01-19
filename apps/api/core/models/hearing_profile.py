from .base import db, BaseModel, gen_id, JSONMixin, now_utc
import sqlalchemy as sa

class HearingProfile(BaseModel, JSONMixin):
    __tablename__ = 'hearing_profiles'

    id = db.Column(db.String(50), primary_key=True)
    party_id = db.Column(db.String(50), nullable=False, unique=True, index=True)
    sgk_info = db.Column(db.Text) # JSON string
    created_at = db.Column(db.DateTime, default=now_utc)
    updated_at = db.Column(db.DateTime, default=now_utc, onupdate=now_utc)
    
    tenant_id = db.Column(db.String(36), db.ForeignKey('tenants.id'), nullable=True, index=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        if not self.id:
            self.id = gen_id("hprof")
            
    @property
    def sgk_info_json(self):
        return self.json_load(self.sgk_info)
    
    @sgk_info_json.setter
    def sgk_info_json(self, value):
        self.sgk_info = self.json_dump(value)

    def to_dict(self):
        return {
            'id': self.id,
            'partyId': self.party_id,
            'sgkInfo': self.sgk_info_json,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
