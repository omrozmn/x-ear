# Zaman Çizelgesi (Timeline) Denetim Raporu

## 📋 Özet

Hasta detayları sayfasındaki "Zaman Çizelgesi" sekmesinin tüm işlemleri düzgün kaydettiğini kontrol ettim.

## 🔍 Mevcut Durum

### Frontend Timeline Sistemi

**Dosya**: `x-ear/apps/web/src/components/parties/PartyTimelineTab.tsx`

**Veri Kaynakları**:
1. **Party nesnesinden toplanan olaylar** (client-side):
   - ✅ Hasta kaydı (registration)
   - ✅ Notlar (notes)
   - ✅ Randevular (appointments)
   - ✅ Cihaz atamaları (devices)
   - ✅ Ödemeler/Satışlar (sales/payments)
   - ✅ İletişim (SMS, aramalar)
   - ✅ SGK durum değişiklikleri
   - ✅ E-reçete kayıtları
   - ✅ Raporlar/Belgeler

2. **Backend'den gelen timeline API'si**:
   - Endpoint: `GET /api/parties/{party_id}/timeline`
   - ActivityLog tablosundan ve Party.custom_data_json'dan birleştirilmiş veriler

### Backend Timeline Sistemi

**Dosya**: `x-ear/apps/api/routers/timeline.py`

**Endpoints**:
1. `GET /timeline` - Tüm timeline olayları
2. `GET /parties/{party_id}/timeline` - Hasta timeline'ı
3. `POST /parties/{party_id}/timeline` - Yeni olay ekle
4. `POST /parties/{party_id}/activities` - Aktivite logla (alias)
5. `DELETE /parties/{party_id}/timeline/{event_id}` - Olay sil

**Veri Kaynakları**:
1. **ActivityLog tablosu** - Otomatik loglama
2. **Party.custom_data_json['timeline']** - Manuel olaylar

## ❌ Tespit Edilen Sorunlar

### 1. KRITIK: Frontend Timeline Backend'i Kullanmıyor

**Sorun**: `PartyTimelineTab.tsx` component'i backend timeline API'sini çağırmıyor. Sadece Party nesnesinden client-side olarak olayları topluyor.

**Kod**:
```typescript
// PartyTimelineTab.tsx - Backend API çağrısı YOK!
const allEvents = useMemo(() => {
  const events: TimelineEvent[] = [];
  
  // Party nesnesinden olayları topluyor
  if (party.createdAt) { ... }
  if (party.notes) { ... }
  if (party.devices) { ... }
  // ...
  
  return events;
}, [party]);
```

**Olması Gereken**:
```typescript
// usePartyTimeline hook'u kullanmalı
const { timeline, loading } = usePartyTimeline(party.id);
```

### 2. ActivityLog Kayıtları Eksik

Backend'de sadece şu işlemler ActivityLog'a kaydediliyor:

✅ **Kaydedilen İşlemler**:
- `note_created` - Not ekleme (party_service.py)
- `hearing_test_created` - İşitme testi (hearing_profile_service.py)
- `invoice_issued` - Fatura kesme (invoices.py)
- `document_upload` - Belge yükleme (documents.py)
- `file_upload_init` - Dosya yükleme başlangıcı
- `file_delete` - Dosya silme
- `TOPLU_YUKLEME` - Toplu import (bulk_import_tools.py)

❌ **Kaydedilmeyen İşlemler**:
- Hasta oluşturma/güncelleme
- Cihaz atama/kaldırma
- Satış oluşturma/güncelleme
- Randevu oluşturma/güncelleme/iptal
- Ödeme işlemleri
- SGK durum değişiklikleri
- Etiket güncellemeleri
- Hasta silme
- Senet işlemleri (sadece PromissoryNotesTab'da manuel log var)

### 3. İki Farklı Timeline Sistemi

**Sistem 1**: ActivityLog tablosu (otomatik)
- Backend'de bazı işlemler otomatik kaydediliyor
- Tenant-scoped
- Filtrelenebilir

**Sistem 2**: Party.custom_data_json['timeline'] (manuel)
- Frontend'den manuel POST ile ekleniyor
- Sadece timeline endpoint'i üzerinden
- Diğer işlemler bu sistemi kullanmıyor

**Sorun**: İki sistem senkronize değil ve tutarsız.

## 🔧 Önerilen Düzeltmeler

### Öncelik 1: Frontend'i Backend API'ye Bağla

**Değiştirilecek Dosya**: `x-ear/apps/web/src/components/parties/PartyTimelineTab.tsx`

```typescript
// ❌ MEVCUT (Yanlış)
const allEvents = useMemo(() => {
  const events: TimelineEvent[] = [];
  // Party nesnesinden topluyor...
  return events;
}, [party]);

// ✅ OLASI GEREKEN (Doğru)
import { usePartyTimeline } from '@/hooks/party/usePartyTimeline';

const { timeline, loading, error } = usePartyTimeline(party.id);

// timeline zaten backend'den geliyor, client-side toplama gereksiz
```

### Öncelik 2: Eksik ActivityLog Kayıtlarını Ekle

Her kritik işlem için ActivityLog kaydı eklenmel i:

**1. Hasta İşlemleri** (`routers/parties.py`):
```python
# Hasta oluşturma
activity_log = ActivityLog(
    user_id=access.user_id,
    action='party_created',
    entity_type='party',
    entity_id=party.id,
    tenant_id=access.tenant_id,
    details=json.dumps({'name': f"{party.first_name} {party.last_name}"})
)

# Hasta güncelleme
activity_log = ActivityLog(
    action='party_updated',
    details=json.dumps({'changes': updated_fields})
)

# Hasta silme
activity_log = ActivityLog(
    action='party_deleted'
)
```

**2. Cihaz İşlemleri** (`routers/devices.py`):
```python
# Cihaz atama
activity_log = ActivityLog(
    action='device_assigned',
    entity_type='device',
    entity_id=device.id,
    details=json.dumps({
        'party_id': party_id,
        'device': f"{device.brand} {device.model}",
        'serial': device.serial_number
    })
)

# Cihaz kaldırma
activity_log = ActivityLog(
    action='device_removed'
)
```

**3. Satış İşlemleri** (`routers/sales.py`):
```python
# Satış oluşturma
activity_log = ActivityLog(
    action='sale_created',
    entity_type='sale',
    entity_id=sale.id,
    details=json.dumps({
        'party_id': party_id,
        'total_amount': sale.total_amount,
        'payment_method': sale.payment_method
    })
)

# Satış güncelleme
activity_log = ActivityLog(
    action='sale_updated'
)

# Satış silme
activity_log = ActivityLog(
    action='sale_deleted'
)
```

**4. Randevu İşlemleri** (`routers/appointments.py`):
```python
# Randevu oluşturma
activity_log = ActivityLog(
    action='appointment_created',
    entity_type='appointment',
    entity_id=appointment.id
)

# Randevu güncelleme
activity_log = ActivityLog(
    action='appointment_updated'
)

# Randevu iptal
activity_log = ActivityLog(
    action='appointment_cancelled'
)
```

**5. Ödeme İşlemleri** (`routers/payments.py`):
```python
# Ödeme alındı
activity_log = ActivityLog(
    action='payment_received',
    entity_type='payment',
    details=json.dumps({
        'amount': payment.amount,
        'method': payment.method
    })
)
```

**6. SGK İşlemleri** (`routers/sgk.py`):
```python
# SGK durum değişikliği
activity_log = ActivityLog(
    action='sgk_status_changed',
    entity_type='sgk',
    details=json.dumps({
        'old_status': old_status,
        'new_status': new_status
    })
)
```

**7. Etiket İşlemleri** (`routers/parties.py`):
```python
# Etiket güncelleme
activity_log = ActivityLog(
    action='tags_updated',
    entity_type='party',
    entity_id=party_id,
    details=json.dumps({
        'status': updates.get('status'),
        'segment': updates.get('segment'),
        'acquisition_type': updates.get('acquisitionType')
    })
)
```

### Öncelik 3: Tek Timeline Sistemi Kullan

**Karar**: ActivityLog tablosunu tek kaynak olarak kullan, custom_data_json'ı kaldır.

**Neden**:
- ActivityLog zaten var ve indexlenmiş
- Tenant-scoped
- Filtrelenebilir
- Performanslı

**Değişiklik**:
```python
# timeline.py - custom_data_json kullanımını kaldır
@router.get("/parties/{party_id}/timeline")
def get_party_timeline(party_id: str, ...):
    # ❌ KALDIR
    # custom_data = patient.custom_data_json or {}
    # timeline = custom_data.get('timeline', [])
    
    # ✅ SADECE ActivityLog kullan
    activity_logs = db.query(ActivityLog).filter_by(
        entity_type='party',
        entity_id=party_id
    ).order_by(ActivityLog.created_at.desc()).all()
    
    return format_timeline(activity_logs)
```

## 📊 Beklenen Sonuç

Düzeltmeler sonrası timeline şunları gösterecek:

1. ✅ Hasta oluşturuldu
2. ✅ Hasta bilgileri güncellendi
3. ✅ Etiketler güncellendi (durum, segment, kazanım türü)
4. ✅ Not eklendi
5. ✅ Cihaz atandı
6. ✅ Cihaz kaldırıldı
7. ✅ Satış oluşturuldu
8. ✅ Satış güncellendi
9. ✅ Ödeme alındı
10. ✅ Randevu oluşturuldu
11. ✅ Randevu güncellendi
12. ✅ Randevu iptal edildi
13. ✅ SGK durumu değişti
14. ✅ Belge yüklendi
15. ✅ Fatura kesildi
16. ✅ İşitme testi yapıldı
17. ✅ Senet oluşturuldu
18. ✅ Senet tahsil edildi
19. ✅ Senet iptal edildi

## 🎯 Uygulama Planı

### Adım 1: Frontend Düzeltmesi (Hızlı)
1. `PartyTimelineTab.tsx` - usePartyTimeline hook'unu kullan
2. Client-side event toplama kodunu kaldır
3. Backend'den gelen timeline'ı direkt göster

### Adım 2: Backend ActivityLog Eklemeleri (Orta)
1. Her router'a ActivityLog kayıtları ekle
2. Kritik işlemler öncelikli
3. Test et

### Adım 3: Timeline Sistemi Birleştirme (Uzun)
1. custom_data_json kullanımını kaldır
2. Sadece ActivityLog kullan
3. Migration yaz (eski timeline verilerini ActivityLog'a taşı)

## 🔗 İlgili Dosyalar

**Frontend**:
- `x-ear/apps/web/src/components/parties/PartyTimelineTab.tsx` - Timeline UI
- `x-ear/apps/web/src/hooks/party/usePartyTimeline.ts` - Timeline hook
- `x-ear/apps/web/src/components/payments/PromissoryNotesTab.tsx` - Senet timeline örneği

**Backend**:
- `x-ear/apps/api/routers/timeline.py` - Timeline endpoints
- `x-ear/apps/api/routers/parties.py` - Hasta işlemleri
- `x-ear/apps/api/routers/sales.py` - Satış işlemleri
- `x-ear/apps/api/routers/devices.py` - Cihaz işlemleri
- `x-ear/apps/api/services/party_service.py` - Not ekleme (ActivityLog var)
- `x-ear/apps/api/models/user.py` - ActivityLog model

## ✅ Sonuç

**Mevcut Durum**: Timeline sistemi yarı çalışır durumda. Frontend backend'i kullanmıyor, backend'de çoğu işlem kaydedilmiyor.

**Gerekli İyileştirmeler**:
1. Frontend'i backend API'ye bağla (KRITIK)
2. Tüm işlemler için ActivityLog ekle (YÜKSEK)
3. Tek timeline sistemi kullan (ORTA)

**Tahmini Süre**:
- Adım 1: 2 saat
- Adım 2: 1 gün
- Adım 3: 4 saat
- **Toplam**: ~2 gün
