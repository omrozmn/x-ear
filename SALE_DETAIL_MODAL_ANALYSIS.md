# Satış Detay Modalı - Analiz ve Düzeltme Planı

## 📋 Mevcut Durum

Satış tablosunda bir kayda tıklandığında `EditSaleModal` açılıyor. Bu modal:
- **Dosya**: `apps/web/src/components/parties/modals/EditSaleModal.tsx`
- **Açılış**: `PartySalesTab.tsx` → `onSaleClick={(sale) => handleEditSaleClick(sale)}`
- **İçerik**: Sol tarafta form alanları, sağ tarafta PaymentSummary kartı

## 🐛 Tespit Edilen Sorunlar

### 1. "Her iki kulak" → "Bilateral" Çevirisi
**Sorun**: Kulak seçimi "both" olduğunda "Her iki kulak" yerine "Bilateral" yazmalı
**Dosya**: `SaleFormFields.tsx` veya ilgili form component
**Çözüm**: Ear field display logic'ini güncelle

### 2. Cihaz Atama ID ve Satış ID Eksik
**Sorun**: Modalda bu bilgiler görünmüyor
**Nerede olmalı**: Üst kısımda veya başlıkta
**Çözüm**: EditSaleModal'a bu bilgileri ekle

### 3. Sağdaki Kartta İç İçe Girmiş Rakamlar
**Sorun**: PaymentSummary kartında layout bozuk
**Dosya**: `PaymentSummary.tsx`
**Çözüm**: Grid layout'u düzelt, nested div'leri temizle

### 4. Son Kayıt Dışında Bilgiler Gelmiyor
**Sorun**: Eski satış kayıtlarının detayları yüklenmiyor
**Root Cause**: Backend'den gelen data mapping sorunu veya frontend'de data parse hatası
**Çözüm**: 
- Backend response'u kontrol et (curl ile)
- Frontend'de console.log ekle
- Data mapping'i düzelt

### 5. Ödeme Özeti Kartı - "Detay" Butonu Sorunları

#### 5a. Son Kayıtta Modal Kapanıyor
**Sorun**: Yeni oluşturulan satışta "Detay" butonuna tıklayınca modal kapanıyor
**Root Cause**: Payment records boş olduğunda farklı davranış
**Çözüm**: PaymentTrackingModal'ı her zaman aç, boş state'i handle et

#### 5b. Tüm Ödemeleri Gösteriyor
**Sorun**: PaymentTrackingModal açıldığında kullanıcının TÜM satışlarının TÜM ödemelerini gösteriyor
**Olması Gereken**: Sadece ilgili satışın ödemelerini göstermeli
**Dosya**: `PaymentTrackingModal.tsx`
**Çözüm**: 
- Modal'a `saleId` prop'u ekle
- Payment records'u `saleId` ile filtrele
- Yeni ödeme eklerken de `saleId` ile ilişkilendir

#### 5c. Buton Adı Yanlış
**Sorun**: "Detay" yerine "Ödeme Takibi" yazmalı
**Dosya**: `PaymentSummary.tsx` line 113
**Çözüm**: Button text'i değiştir

### 6. Durum Dropdown Yanlış Seçenekler

**Mevcut Seçenekler** (`EditSaleModal.tsx` line 119-125):
```typescript
{ value: 'draft', label: 'Taslak' },
{ value: 'confirmed', label: 'Onaylandı' },
{ value: 'delivered', label: 'Teslim Edildi' },
{ value: 'completed', label: 'Tamamlandı' },
{ value: 'cancelled', label: 'İptal' }
```

**Olması Gereken**:
```typescript
{ value: 'cancelled', label: 'İptal' },
{ value: 'delivered', label: 'Teslim Edildi' },
{ value: 'ordered', label: 'Sipariş Edildi' },
{ value: 'waiting_report', label: 'Rapor Bekleniyor' }
```

**Durum Mapping Logic**:
- Cihaz atama formundaki `deliveryStatus` ve `reportStatus` ile map edilmeli
- `deliveryStatus === 'delivered'` → `delivered`
- `reportStatus === 'waiting'` → `waiting_report`
- Ödeme tamamlandı + (rapor yok VEYA rapor teslim edildi) → `completed`

## 📊 Veri Akışı Analizi

### Backend → Frontend Data Flow

```
Backend: /api/parties/{partyId}/sales
  ↓
Response: SaleRead[] with ExtendedSaleRead properties
  ↓
PartySalesTab: setSales(transformedSales)
  ↓
SalesTableView: onSaleClick={(sale) => ...}
  ↓
EditSaleModal: sale prop
  ↓
PaymentSummary: sale prop
  ↓
PaymentTrackingModal: sale prop
```

### Hangi Bilgiler Nerede Olmalı?

#### EditSaleModal (Ana Modal)
**Üst Kısım (Header)**:
- Satış ID: `sale.id`
- Cihaz Atama ID: `sale.devices[0].assignmentUid` veya `sale.rightEarAssignmentId` / `sale.leftEarAssignmentId`
- Tarih: `sale.saleDate`

**Sol Taraf (Form)**:
- Ürün Bilgileri (Marka, Model)
- Kulak: "Bilateral" (eğer `ear === 'both'`)
- Seri Numaraları
- Fiyat Bilgileri
- SGK Bilgileri

**Sağ Taraf (PaymentSummary)**:
- Toplam Tutar: `sale.finalAmount`
- Ödenen: `sale.paidAmount`
- Kalan: `sale.remainingAmount`
- "Ödeme Takibi" butonu

**Alt Kısım (Footer)**:
- Durum dropdown (düzeltilmiş seçeneklerle)
- İptal / Güncelle butonları

#### PaymentTrackingModal
**Göstermesi Gerekenler**:
- Sadece bu satışa ait ödeme kayıtları (`paymentRecords.filter(p => p.saleId === sale.id)`)
- Yeni ödeme ekleme formu (saleId ile ilişkilendirilmiş)
- Ödeme geçmişi tablosu

## 🔧 Düzeltme Adımları

### Adım 1: PaymentTrackingModal'ı Düzelt
1. `saleId` prop'u ekle
2. Payment records'u filtrele
3. Yeni ödeme eklerken saleId'yi kullan

### Adım 2: PaymentSummary'yi Düzelt
1. "Detay" → "Ödeme Takibi" buton text'i
2. Layout'u düzelt (nested div'leri temizle)
3. Modal'ı her zaman aç (boş state handle et)

### Adım 3: EditSaleModal'ı Düzelt
1. Header'a Satış ID ve Cihaz Atama ID ekle
2. Durum dropdown seçeneklerini güncelle
3. Durum mapping logic'i ekle

### Adım 4: SaleFormFields'ı Düzelt
1. "Her iki kulak" → "Bilateral" çevirisi
2. Ear field display logic'ini güncelle

### Adım 5: Data Loading Sorununu Çöz
1. Backend response'u kontrol et
2. Console log'ları ekle
3. Data mapping'i düzelt

## 📝 Test Senaryoları

1. **Yeni Satış**: Ödeme takibi modalı açılmalı, boş state göstermeli
2. **Eski Satış**: Tüm bilgiler doğru yüklenmeli
3. **Bilateral Satış**: "Bilateral" yazmalı
4. **Ödeme Takibi**: Sadece ilgili satışın ödemeleri görünmeli
5. **Durum Değiştirme**: Cihaz atama durumu ile senkronize olmalı
