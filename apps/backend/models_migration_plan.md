# Models Migration Plan - Etki Analizi ve Aşamalı Geçiş

## 📊 Mevcut Durum Analizi

### Models.py İçeriği (632 satır)
```
1. Patient (109 satır)
2. Device (55 satır) 
3. Appointment (31 satır)
4. PatientNote (29 satır)
5. EReceipt (27 satır)
6. HearingTest (18 satır)
7. User (23 satır)
8. ActivityLog (27 satır)
9. Notification (51 satır)
10. DeviceAssignment (40 satır)
11. Sale (31 satır)
12. PaymentPlan (25 satır)
13. PaymentInstallment (22 satır)
14. Settings (19 satır)
15. Campaign (29 satır)
16. SMSLog (36 satır)
```

## 🎯 Potansiyel Etkiler Analizi

### 1. Import Etkileri
**Mevcut Import'lar:**
```python
# 47+ dosyada kullanılıyor
from models import db, Patient, Device, Appointment, ...
```

**Risk Seviyesi:** 🔴 **Yüksek**
- Tüm route dosyaları etkilenir
- Test dosyaları etkilenir
- Migration dosyaları etkilenir

### 2. Relationship Etkileri
**Mevcut Relationship'ler:**
```python
# Patient → Device, Appointment, PatientNote, EReceipt, HearingTest
# Device → Patient (backref)
# Sale → DeviceAssignment (FK)
```

**Risk Seviyesi:** 🟡 **Orta**
- Cross-model relationship'ler korunmalı
- Backref'ler çalışmaya devam etmeli

### 3. Database Migration Etkileri
**Enum Değişiklikleri:**
- Device.ear: 'left'→'LEFT', 'right'→'RIGHT', 'both'→'BILATERAL'
- Device.status: 'trial'→'TRIAL', yeni enum değerleri
- Device.category: string→enum

**Risk Seviyesi:** 🔴 **Yüksek**
- Mevcut veri dönüştürülmeli
- Frontend enum değerlerini güncellemeli
- API response'ları değişecek

### 4. Frontend Etkileri
**API Response Değişiklikleri:**
```javascript
// Öncesi
device.ear = 'left'
device.status = 'trial'

// Sonrası  
device.ear = 'LEFT'
device.status = 'TRIAL'
```

**Risk Seviyesi:** 🟡 **Orta**
- Frontend enum mapping'leri güncellenmeli
- Filtreleme logic'i değişmeli

## 🚀 Aşamalı Migration Stratejisi

### Faz 1: Models Directory Yapısı (Risk: Düşük)
**Hedef:** Mevcut models.py'yi bozmadan yeni yapı oluştur

```
backend/models/
├── __init__.py          # Tüm import'ları topla
├── base.py              # BaseModel, mixins
├── patient.py           # Patient modeli
├── device.py            # Device modeli  
├── appointment.py       # Appointment modeli
├── medical.py           # PatientNote, EReceipt, HearingTest
├── user.py              # User, ActivityLog
├── notification.py      # Notification modeli
├── sales.py             # Sale, PaymentPlan, PaymentInstallment, DeviceAssignment
├── system.py            # Settings modeli
├── campaign.py          # Campaign, SMSLog
├── inventory.py         # Mevcut inventory modeli (zaten var)
└── suppliers.py         # Mevcut suppliers modeli (zaten var)
```

**Implementasyon:**
1. ✅ `backend/models/` klasörü oluştur
2. ✅ Her model için ayrı dosya oluştur
3. ✅ `__init__.py`'de tüm import'ları topla
4. ✅ Mevcut `models.py`'yi koru (parallel çalışma)
5. ✅ Test et
6. ✅ Import'ları değiştir
7. ✅ `models.py`'yi sil

### Faz 2: Critical Fixes (Risk: Yüksek)
**Hedef:** ID default'ları ve kritik sorunları düzelt

**2.1 ID Default'ları**
```python
# backend/models/base.py
from uuid import uuid4
from datetime import datetime, timezone

def now_utc():
    return datetime.now(timezone.utc)

def gen_id(prefix):
    return f"{prefix}_{uuid4().hex[:8]}"

class BaseModel(db.Model):
    __abstract__ = True
    created_at = db.Column(db.DateTime, default=now_utc)
    updated_at = db.Column(db.DateTime, default=now_utc, onupdate=now_utc)
```

**2.2 Model ID'leri**
```python
# Her modelde:
id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("pat"))
```

**Etki:** ✅ **Güvenli** - Mevcut kayıtlar etkilenmez, yeni kayıtlar otomatik ID alır

### Faz 3: Enum Migrations (Risk: Yüksek)
**Hedef:** String alanları enum'a çevir

**3.1 Enum Tanımları**
```python
# backend/models/enums.py
from enum import Enum

class DeviceSide(Enum):
    LEFT = 'LEFT'
    RIGHT = 'RIGHT'  
    BILATERAL = 'BILATERAL'

class DeviceStatus(Enum):
    IN_STOCK = 'IN_STOCK'
    ASSIGNED = 'ASSIGNED'
    TRIAL = 'TRIAL'
    DEFECTIVE = 'DEFECTIVE'
    LOST = 'LOST'

class DeviceCategory(Enum):
    HEARING_AID = 'HEARING_AID'
    BATTERY = 'BATTERY'
    ACCESSORY = 'ACCESSORY'
```

**3.2 Migration Script**
```python
# migration: 001_convert_to_enums.py
def upgrade():
    # 1. Enum tiplerini oluştur (PostgreSQL için)
    op.execute("CREATE TYPE device_side AS ENUM ('LEFT', 'RIGHT', 'BILATERAL')")
    
    # 2. Mevcut veriyi dönüştür
    op.execute("""
        UPDATE devices SET 
        ear = CASE 
            WHEN ear = 'left' THEN 'LEFT'
            WHEN ear = 'right' THEN 'RIGHT' 
            WHEN ear = 'both' THEN 'BILATERAL'
            ELSE 'LEFT'
        END
    """)
    
    # 3. Kolon tipini değiştir
    op.alter_column('devices', 'ear', type_=sa.Enum(DeviceSide))
```

**Etki:** ⚠️ **Riskli** - Veri dönüşümü gerekli, frontend güncellemesi şart

### Faz 4: Money Fields (Risk: Orta)
**Hedef:** Float'ları Numeric'e çevir

```python
# migration: 002_fix_money_fields.py
def upgrade():
    # Float → Numeric(12,2)
    op.alter_column('devices', 'price', type_=sa.Numeric(12,2))
    op.alter_column('sales', 'total_amount', type_=sa.Numeric(12,2))
    op.alter_column('payment_installments', 'amount', type_=sa.Numeric(12,2))
```

**Etki:** ✅ **Güvenli** - Precision artışı, veri kaybı yok

### Faz 5: DateTime Consolidation (Risk: Orta)
**Hedef:** Appointment date+time → start_at

```python
# migration: 003_consolidate_datetime.py
def upgrade():
    # Yeni kolon ekle
    op.add_column('appointments', sa.Column('start_at', sa.DateTime))
    
    # Veriyi birleştir
    op.execute("""
        UPDATE appointments 
        SET start_at = date + (time || ':00')::interval
        WHERE date IS NOT NULL AND time IS NOT NULL
    """)
    
    # Eski kolonları sil
    op.drop_column('appointments', 'date')
    op.drop_column('appointments', 'time')
```

**Etki:** ⚠️ **Riskli** - Frontend appointment logic'i değişmeli

## 📋 Implementasyon Adımları

### Adım 1: Models Directory Oluştur (Güvenli)

```bash
# 1. Klasör yapısını oluştur
mkdir -p backend/models

# 2. Base model oluştur
touch backend/models/base.py
touch backend/models/__init__.py
```

### Adım 2: Model Dosyalarını Oluştur (Parallel)

**Strateji:** Mevcut models.py'yi koru, yeni dosyalarda kopyala

```python
# backend/models/patient.py
from .base import db, BaseModel
import json

class Patient(BaseModel):
    __tablename__ = 'patients'
    
    # Mevcut Patient modelini kopyala
    # ID default ekle
    id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("pat"))
    # ... diğer alanlar
```

### Adım 3: Import Testi (Kritik)

```python
# Test script: test_new_models.py
try:
    from models import Patient as OldPatient
    from models.patient import Patient as NewPatient
    
    # Aynı şema mı kontrol et
    assert OldPatient.__table__.columns.keys() == NewPatient.__table__.columns.keys()
    print("✅ Schema match")
except Exception as e:
    print(f"❌ Schema mismatch: {e}")
```

### Adım 4: Gradual Import Switch

```python
# backend/models/__init__.py
from .base import db
from .patient import Patient
from .device import Device
# ... diğer modeller

# Backward compatibility için
__all__ = ['db', 'Patient', 'Device', ...]
```

### Adım 5: Route Dosyalarını Güncelle (Aşamalı)

```python
# Öncesi
from models import db, Patient, Device

# Sonrası (aynı import çalışır)
from models import db, Patient, Device
```

## 🧪 Test Stratejisi

### Unit Tests
```python
# tests/test_models_migration.py
def test_patient_creation():
    # Eski model
    old_patient = OldPatient(first_name="Test")
    
    # Yeni model  
    new_patient = NewPatient(first_name="Test")
    
    # ID otomatik oluşuyor mu?
    assert new_patient.id is not None
    assert new_patient.id.startswith("pat_")
```

### Integration Tests
```python
def test_api_compatibility():
    # API response'ları değişmedi mi?
    response = client.get('/api/patients')
    assert response.status_code == 200
    
    patient = response.json['data'][0]
    assert 'id' in patient
    assert 'firstName' in patient
```

## ⚠️ Risk Mitigation

### 1. Backup Strategy
```bash
# Her faz öncesi backup
pg_dump xear_crm > backup_before_phase_1.sql
```

### 2. Rollback Plan
```python
# Her migration için rollback
def downgrade():
    # Enum'ları geri çevir
    op.execute("UPDATE devices SET ear = lower(ear)")
    op.drop_constraint('device_side_enum')
```

### 3. Feature Flags
```python
# Yeni enum'ları kademeli açma
USE_NEW_ENUMS = os.getenv('USE_NEW_ENUMS', 'false') == 'true'

if USE_NEW_ENUMS:
    device.status = DeviceStatus.IN_STOCK
else:
    device.status = 'in_stock'
```

## 📈 Success Metrics

### Faz 1 Success (Models Directory)
- ✅ Tüm import'lar çalışıyor
- ✅ Test'ler geçiyor  
- ✅ API response'ları aynı
- ✅ Frontend çalışıyor

### Faz 2 Success (Critical Fixes)
- ✅ Yeni kayıtlar otomatik ID alıyor
- ✅ Para hesaplamaları doğru
- ✅ Enum değerleri tutarlı

### Faz 3 Success (Full Migration)
- ✅ Database constraint'leri çalışıyor
- ✅ Frontend yeni enum'ları kullanıyor
- ✅ Performance iyileşti (index'ler)

## 🎯 Timeline

| Faz | Süre | Risk | Rollback |
|-----|------|------|----------|
| Faz 1: Models Directory | 2-3 gün | Düşük | Kolay |
| Faz 2: Critical Fixes | 3-5 gün | Orta | Orta |
| Faz 3: Enum Migration | 5-7 gün | Yüksek | Zor |
| Faz 4: Money Fields | 2-3 gün | Düşük | Kolay |
| Faz 5: DateTime | 3-4 gün | Orta | Orta |

**Toplam:** 15-22 gün (3-4 hafta)

Bu plan ile **sıfır downtime** ve **minimum risk** ile migration yapabiliriz! 🚀