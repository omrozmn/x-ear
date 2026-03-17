# Test Inventory - Codebase Analizi Cevapları

**Tarih**: 2026-02-02  
**Durum**: Codebase analiz edildi, cevaplar bulundu

---

## 📊 CODEBASE ANALİZİ SONUÇLARI

### ✅ SORU 1-2: Cihaz Atama Nedenleri

**Kaynak**: `x-ear/apps/api/schemas/sales.py` + Kullanıcı Onayı

**Cevap**:
```python
# Default: "Sale"
reason: Optional[str] = Field("Sale")
```

**Atama Nedenleri (KULLANICI ONAYLI)**:
- ✅ **Sale** (Satış) - Default
- ✅ **Trial** (Test/Deneme)
- ✅ **Replacement** (Değişim)
- ✅ **Loaner** (Emanet) - `is_loaner` flag ile işaretlenir
- ✅ **Tamir** (Repair)
- ❌ **İade** (Return) - YOK

**NOT**: `is_loaner` ayrı bir boolean field. Emanet atamaları için kullanılır.

**Test/Loaner Atama Fiyat Bilgileri**:
```python
# Tüm atama tipleri için fiyat bilgileri var:
base_price: Optional[float]
sale_price: Optional[float]
sgk_support: Optional[float]
patient_payment: Optional[float]
```

**Geri Alma İşlemi**: Codebase'de `delivery_status` field'ı var:
- `pending` (Beklemede)
- `delivered` (Teslim edildi)
- Muhtemelen geri alma için `returned` veya `cancelled` olabilir (doğrulanmalı)

---

### ✅ SORU 3-4: Pil Satışı - Rapor Durumu

**Kaynak**: `x-ear/apps/api/schemas/sales.py` + Kullanıcı Onayı

**Cevap**:
```python
report_status: Optional[str] = Field(None, alias="reportStatus")
```

**Rapor Durumları (KULLANICI ONAYLI)**:
- ✅ `received` (Rapor alındı) → SGK ödemesi düşülür ✅
- ✅ `pending` (Rapor bekliyor) → SGK ödemesi düşülür ✅ (anlaşma yapılmış demek)
- ✅ `none` (Özel satış - rapor yok) → SGK ödemesi düşülmez ✅

**SGK Ödemesi Mantığı (KULLANICI ONAYLI)**:
```
Rapor Alındı (received):  SGK ödemesi düşülür ✅
Rapor Bekliyor (pending): SGK ödemesi düşülür ✅ (hasta rapor getireceği üzerinde anlaşılmış)
Özel Satış (none):        SGK ödemesi düşülmez ✅
```

**Güncelleme**: `report_status` güncellenebilir:
```python
# Update endpoint'inde:
if 'report_status' in data:
    assignment.report_status = data.get('report_status')
```

---

### ✅ SORU 15-16: Kasa Kaydı - Etiket Sistemi

**Kaynak**: `x-ear/apps/api/routers/cash_records.py`

**Cevap**:
```python
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
```

**Önceden Tanımlı Etiketler**:
- ✅ Pil / Batarya
- ✅ Filtre
- ✅ Tamir / Onarım
- ✅ Kaparo / Kapora
- ✅ Kalıp
- ✅ Teslim / Teslimat
- ✅ Diğer (default)

**Etiket Sistemi**:
- Etiketler `notes` field'ından otomatik türetiliyor
- Kullanıcı `notes` alanına yazar, backend etiket türetir
- Dinamik etiket oluşturma: Kullanıcı istediği metni yazabilir, backend en yakın etiketi bulur

**Storage Keys** (Frontend):
```typescript
// backups/constants/storage-keys.ts
export const INCOME_RECORD_TYPES = 'x-ear.cashflow.incomeTypes@v1'
export const EXPENSE_RECORD_TYPES = 'x-ear.cashflow.expenseTypes@v1'
export const CUSTOM_RECORD_TYPES = 'x-ear.cashflow.customRecordTypes@v1'
```

---

### ❌ SORU 7: SGK Rapor Takibi

**Kaynak**: Codebase'de arama yapıldı

**Cevap**: **BULUNAMADI** ❌

```bash
# Arama sonucu:
sgk.*report.*track|report.*expir|rapor.*takip
→ No matches found
```

**Sonuç**: SGK rapor takibi özelliği **henüz uygulanmamış**.

**Yapılması Gerekenler**:
1. Raporlar sayfasında "SGK Rapor Takibi" sekmesi oluştur
2. Cihaz satışlarının rapor tarihlerini takip et
3. 1 yıl sonra uyarı göster
4. 5 yıl sonra "Rapor süresi doldu" uyarısı göster

---

### ✅ SORU 19-20: Envanter - Paket İçeriği

**Kaynak**: `x-ear/apps/api/core/models/inventory.py`

**Cevap**: **UNIT FIELD VAR, PACKAGE_QUANTITY YOK** ⚠️

**Mevcut Durum**:
```python
# Unit field VAR ✅
unit = db.Column(db.String(50), default='adet')

# Unit types array VAR ✅
UNIT_TYPES = [
    'adet',  # piece
    'kutu',  # box
    'paket',  # package
    'set',  # set
    'metre', 'santimetre', 'milimetre', 'kilometre',
    'litre', 'mililitre',
    'kilogram', 'gram', 'ton',
    'saniye', 'dakika', 'saat', 'gün', 'hafta', 'ay', 'yıl',
    'metrekare',
    'çift',  # pair
]
```

**Eksik**:
- ❌ `package_quantity` field'ı YOK (paket içi adet için)
- ❌ Pil satışında paket hesaplaması YOK

**Yapılması Gerekenler**:
1. ✅ `unit` field'ı zaten var (kullanılabilir)
2. ❌ Envanter modeline `package_quantity` field'ı ekle (paket içi adet)
3. ❌ Pil satışında paket seçildiğinde adet otomatik hesaplansın
4. ❌ SGK ödemesi otomatik hesaplansın (104 adet = 698 TL)

**Örnek Kullanım**:
```python
# Envanter kaydı:
name: "Duracell Pil"
unit: "paket"
package_quantity: 60  # ← YENİ FIELD
price: 500.0

# Satış:
quantity: 2  # 2 paket
total_pieces: 2 * 60 = 120 adet
sgk_payment: (120 / 104) * 698 = 805.38 TL
```

---

## 📋 ÖZET: Cevaplanan Sorular

| Soru | Durum | Kaynak |
|------|-------|--------|
| 1-2. Atama Nedenleri | ✅ Bulundu + Onaylandı | schemas/sales.py + Kullanıcı |
| 3-4. Rapor Durumu | ✅ Bulundu + Onaylandı | schemas/sales.py + Kullanıcı |
| 5-6. Satışlar-Alışlar | ✅ Alışlar sayfası VAR | Kullanıcı |
| 7. SGK Rapor Takibi | ❌ Uygulanmamış | - |
| 8. Pil Satışı | ✅ Kısmen bulundu | schemas/sales.py |
| 9-10. Senet Takip | ❓ Kullanıcı cevaplıyor | - |
| 11-14. Admin/Tenant | ✅ Kısmen cevaplandı | Kullanıcı |
| 15-16. Etiket Sistemi | ✅ Bulundu | routers/cash_records.py |
| 17-18. Fatura Modalı | ❓ Kullanıcı cevaplıyor | - |
| 19-20. Paket İçeriği | ⚠️ Unit VAR, package_quantity YOK | core/models/inventory.py |

---

## 🎯 KULLANICIDAN DOĞRULANMASI GEREKENLER

### 1. Atama Nedenleri Tam Liste
Codebase'de sadece 3 tane bulundu:
- Sale
- Trial
- Replacement

**Soru**: Başka atama nedenleri var mı? (Loaner, Tamir, İade, etc.)

### 2. Rapor Durumu - SGK Ödemesi
**Soru**: "Rapor Bekliyor" (pending) durumunda SGK ödemesi düşülüyor mu?

### 3. Satışlar-Alışlar Navigasyon
**Soru**: "Alışlar" sayfası şu anda var mı? Yoksa oluşturmamız mı gerekiyor?

### 4. Paket İçeriği
**Soru**: Envanter ürün oluştururken "Paket İçeriği" alanı var mı? Yoksa ekleyecek miyiz?

---

## 📝 SONRAKİ ADIMLAR

1. ✅ Kullanıcı soruları cevaplasın
2. ✅ Doğrulamaları yapalım
3. ✅ Test Inventory'yi tamamlayalım (~150-200 test)
4. ✅ Frontend'i başlatıp UI'ı inceleyelim (gerekirse)
