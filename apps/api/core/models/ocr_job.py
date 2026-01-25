from models.base import db, BaseModel
from models.mixins import TenantScopedMixin
import enum
import sqlalchemy as sa

class OCRJobStatus(enum.Enum):
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'

class OCRJob(BaseModel, TenantScopedMixin):
    __tablename__ = 'ocr_jobs'

    id = db.Column(db.String(36), primary_key=True)
    # tenant_id is now inherited from TenantScopedMixin
    status = db.Column(sa.Enum(OCRJobStatus), default=OCRJobStatus.PENDING)
    file_path = db.Column(db.String(512), nullable=False)
    result = db.Column(db.JSON) # Store OCR result
    error_message = db.Column(db.Text)
    
    # Metadata
    document_type = db.Column(db.String(50)) # e.g. 'medical_report', 'prescription'
    patient_name = db.Column(db.String(100)) # Extracted or provided
    
    def to_dict(self):
        return {
            'id': self.id,
            'status': self.status.value,
            'file_path': self.file_path,
            'result': self.result,
            'error_message': self.error_message,
            'document_type': self.document_type,
            'patient_name': self.patient_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
