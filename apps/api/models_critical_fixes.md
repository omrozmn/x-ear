# Models.py Kritik Düzeltmeler

## 🚨 Hemen Düzelt (Kritik)

### 1. ID Alanlarında Default Yok
**Sorun:** Tüm modellerde `id = db.Column(db.String(50), primary_key=True)` - default yok
**Risk:** Elle set etmeyi unutursak 500 error

**Çözüm:**
```python
from uuid import uuid4

def gen_id(prefix):
    return f"{prefix}_{uuid4().hex[:8]}"

# Her model için:
id = db.Column(db.String(50), primary_key=True, default=lambda: gen_id("pat"))
```

### 2. Para Alanları Float Kullanıyor
**Sorun:** `Device.price = db.Column(db.Float)` - floating point precision hatası
**Risk:** Para hesaplamalarında hata

**Çözüm:**
```python
price = db.Column(db.Numeric(12,2))  # Tüm para alanları için
```

### 3. Ear/Side Alanları Tutarsız
**Sorun:** 
- `Device.ear`: 'left'|'right'|'both'
- Başka yerlerde 'R'|'L' kullanılıyor

**Çözüm:**
```python
from enum import Enum

class DeviceSide(Enum):
    LEFT = 'LEFT'
    RIGHT = 'RIGHT'
    BILATERAL = 'BILATERAL'

device_side = db.Enum(DeviceSide, name='device_side')
Device.ear = db.Column(device_side)
```

### 4. Status/Category Serbest Metin
**Sorun:** `status = db.Column(db.String(20), default='trial')` - veri dağılır
**Risk:** Filtreleme ve raporlamada tutarsızlık

**Çözüm:**
```python
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

Device.status = db.Column(db.Enum(DeviceStatus), default=DeviceStatus.IN_STOCK)
Device.category = db.Column(db.Enum(DeviceCategory), default=DeviceCategory.HEARING_AID)
```

### 5. JSON Alanlar Manuel Serialize/Deserialize
**Sorun:** `tags = db.Column(db.Text)` - her seferinde json.dumps/loads
**Risk:** Bug çıkarır, unutulur

**Çözüm:**
```python
class JSONMixin:
    @staticmethod
    def json_dump(val):
        return json.dumps(val or {})
    
    @staticmethod
    def json_load(raw):
        return json.loads(raw) if raw else {}

# Property'ler ile:
@property
def tags_json(self):
    return JSONMixin.json_load(self.tags)

@tags_json.setter
def tags_json(self, value):
    self.tags = JSONMixin.json_dump(value)
```

### 6. TC Number vs Identity Number Çakışması
**Sorun:** İkisi de unique olabilir, semantik belirsiz
**Risk:** Veri tutarsızlığı

**Çözüm:**
```python
# tc_number: Türk vatandaşları için zorunlu, unique
# identity_number: Yabancılar için opsiyonel, unique değil
tc_number = db.Column(db.String(11), unique=True, nullable=True)  # Yabancılar için nullable
identity_number = db.Column(db.String(20), nullable=True)  # Unique değil
```

### 7. Date + Time Ayrı (Appointment)
**Sorun:** `date = db.Column(db.DateTime)` + `time = db.Column(db.String(10))`
**Risk:** Timezone sorunları, karmaşık sorgular

**Çözüm:**
```python
start_at = db.Column(db.DateTime, nullable=False)  # UTC
duration = db.Column(db.Integer, default=30)  # dakika
```

### 8. FK'larda ondelete/onupdate Yok
**Sorun:** Cascade davranışı belirsiz
**Risk:** Orphan kayıtlar

**Çözüm:**
```python
patient_id = db.Column(db.String(50), 
                      db.ForeignKey('patients.id', ondelete='CASCADE'), 
                      nullable=False)
```

## 🔧 İyileştir (Yakın Vade)

### 1. Index'ler Eksik
```python
__table_args__ = (
    db.Index('ix_patient_tc', 'tc_number'),
    db.Index('ix_device_serial', 'serial_number'),
    db.Index('ix_device_category', 'category'),
    db.Index('ix_appointment_date', 'start_at'),
)
```

### 2. Device Status Default Yanlış
```python
# Şu an: default='trial'
# Olmalı: default=DeviceStatus.IN_STOCK
```

## 📋 Migration Planı

### Faz 1: Enum'lar ve ID Default'ları
```python
# migration: 001_add_enums_and_id_defaults.py
def upgrade():
    # 1. Enum'ları oluştur
    op.execute("CREATE TYPE device_side AS ENUM ('LEFT', 'RIGHT', 'BILATERAL')")
    op.execute("CREATE TYPE device_status AS ENUM ('IN_STOCK', 'ASSIGNED', 'TRIAL', 'DEFECTIVE', 'LOST')")
    op.execute("CREATE TYPE device_category AS ENUM ('HEARING_AID', 'BATTERY', 'ACCESSORY')")
    
    # 2. Mevcut veriyi dönüştür
    op.execute("UPDATE devices SET ear = 'LEFT' WHERE ear = 'left'")
    op.execute("UPDATE devices SET ear = 'RIGHT' WHERE ear = 'right'")
    op.execute("UPDATE devices SET ear = 'BILATERAL' WHERE ear = 'both'")
    
    # 3. Kolonları değiştir
    op.alter_column('devices', 'ear', type_=sa.Enum('LEFT', 'RIGHT', 'BILATERAL', name='device_side'))
    op.alter_column('devices', 'status', type_=sa.Enum('IN_STOCK', 'ASSIGNED', 'TRIAL', 'DEFECTIVE', 'LOST', name='device_status'))
```

### Faz 2: Para Alanları ve Appointment
```python
# migration: 002_fix_money_and_datetime.py
def upgrade():
    # Para alanlarını Numeric'e çevir
    op.alter_column('devices', 'price', type_=sa.Numeric(12,2))
    op.alter_column('sales', 'total_amount', type_=sa.Numeric(12,2))
    
    # Appointment'ı tek datetime'a çevir
    op.add_column('appointments', sa.Column('start_at', sa.DateTime))
    op.execute("UPDATE appointments SET start_at = date + time::interval")
    op.drop_column('appointments', 'date')
    op.drop_column('appointments', 'time')
```

### Faz 3: Index'ler ve FK Constraints
```python
# migration: 003_add_indexes_and_constraints.py
def upgrade():
    # Index'ler
    op.create_index('ix_patient_tc', 'patients', ['tc_number'])
    op.create_index('ix_device_serial', 'devices', ['serial_number'])
    op.create_index('ix_appointment_start', 'appointments', ['start_at'])
    
    # FK constraints güncelle
    op.drop_constraint('devices_patient_id_fkey', 'devices')
    op.create_foreign_key('devices_patient_id_fkey', 'devices', 'patients', 
                         ['patient_id'], ['id'], ondelete='SET NULL')
```

## 🎯 Beklenen Sonuç

### Öncesi (Mevcut)
```python
# Hatalı kullanım örnekleri:
device = Device()  # id yok → 500 error
device.price = 99.99  # float precision hatası
device.ear = 'sol'  # tutarsız değer
device.status = 'stokta'  # serbest metin
```

### Sonrası (Düzeltilmiş)
```python
# Güvenli kullanım:
device = Device()  # id otomatik: "dev_a1b2c3d4"
device.price = Decimal('99.99')  # hassas para
device.ear = DeviceSide.LEFT  # enum güvenliği
device.status = DeviceStatus.IN_STOCK  # tutarlı değer
```

## 🚀 Uygulama Adımları

1. **Backup al**: Mevcut veritabanını yedekle
2. **Test environment'ta dene**: Migration'ları test et
3. **Enum migration'ı yap**: Veri dönüşümü kritik
4. **Frontend'i güncelle**: Yeni enum değerlerini kullan
5. **Production'a deploy**: Downtime planla

Bu düzeltmeler yapıldığında models.py **production-ready** olacak! 🎯