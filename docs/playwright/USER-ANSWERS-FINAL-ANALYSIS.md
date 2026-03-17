# Kullanıcı Cevapları - Final Analiz

**Tarih**: 2026-02-03  
**Durum**: Tüm cevaplar alındı ve analiz edildi

---

## ✅ KULLANICI CEVAPLARI - ÖZET

### 1. Kasa Kaydı (Hasta Adı İLE) → Stok Takibi

**Soru**: Kasa kaydında hasta adı girilirse ürün seçimi zorunlu mu? Stok düşümü olacak mı?

**Cevap**: 
> "kasa kaydını günlük kayıt defteri gibi düşün. bu yüzden var. stok takibi yapmayacak"

**Analiz**: ✅ NET CEVAP
- Kasa kaydı = Günlük kayıt defteri
- Stok takibi YAPMAZ
- Ürün seçimi zorunlu DEĞİL
- Sadece finansal kayıt amaçlı

**Sonuç**: Kasa kaydı basitleştirilmiş, stok entegrasyonu YOK

---

### 2. Trial/Loaner Ataması → Stok Etkisi

**Soru**: Trial ve Loaner ataması stok düşürür mü? Geri getirince stok geri yüklenir mi?

**Cevap**:
> "evet düşürür çünkü hastaya cihaz veriliyor"
> "evet yükler"
> "evet düşürür ve geri getirdiinde hasta cihazı stok geri yükler"

**Analiz**: ✅ NET CEVAP
- Trial → Stok düşer (cihaz hastada)
- Loaner → Stok düşer (cihaz hastada)
- Geri getirince → Stok geri yüklenir
- Repair → Stok değişmez (zaten hastada)
- Replacement → Stok düşer (yeni cihaz)

**Stok Etkisi Tablosu**:
```python
STOCK_IMPACT = {
    "Sale": "decrease",       # Stok düşer (satıldı)
    "Trial": "decrease",      # Stok düşer (hastada) ← GÜNCELLEME
    "Loaner": "decrease",     # Stok düşer (hastada) ← GÜNCELLEME
    "Repair": "no_change",    # Stok değişmez (zaten hastada)
    "Replacement": "decrease" # Stok düşer (yeni cihaz)
}

# Geri alma işlemi
if return_device:
    if assignment.reason in ["Trial", "Loaner"]:
        stock.quantity += 1  # Stok geri yüklenir ✅
```

**Sonuç**: Trial ve Loaner için stok rezervasyon değil, direkt düşüm

---

### 3. İade Senaryosu → Reverse Transaction

**Soru**: Satış iadesi yapılırsa ne olur?

**Cevap**:
> "evet satış kaydı iptal edilir"
> "ilgili satışa iade not düşülür iade kaydı yapılması önerisi koyulur satışa"
> "evet iptal düşülür" (kasa kaydı)
> "evet geri iade edilir" (ödeme)
> "sorulur çünkü bazen iadelerde satış iptal edilir ama ürün geri gelmez"

**Analiz**: ✅ NET CEVAP
- Satış kaydı → İptal edilir (status: "returned")
- Fatura → İade notu düşülür (fatura iptal edilmez, not eklenir)
- Kasa kaydı → İptal düşülür (ters kayıt)
- Ödeme → Geri iade edilir
- Stok → SORULUR (bazen ürün geri gelmez)

**İade İşlemi Flow**:
```python
def process_return(sale_id):
    sale = get_sale(sale_id)
    
    # 1. Satış kaydı durumu güncelle
    sale.status = "returned"
    
    # 2. Fatura'ya iade notu ekle (iptal etme)
    if sale.invoice:
        add_invoice_note(sale.invoice.id, f"İade: {sale.id}")
    
    # 3. Kasa kaydı ters kayıt (gider olarak)
    create_cash_record(
        amount=-sale.total,
        type="refund",
        notes=f"İade: {sale.id}"
    )
    
    # 4. Ödeme iadesi
    create_refund_payment(sale.id)
    
    # 5. Stok geri yükle (SORULUR)
    show_dialog(
        "Ürün geri geldi mi?",
        options=["Evet", "Hayır"],
        onYes=lambda: restore_stock(sale.device_id)
    )
```

**Sonuç**: İade işlemi için reverse transaction + stok sorusu

---

### 4. SGK Rapor Durumu Değişimi → Finansal Düzeltme

**Soru**: Rapor durumu "pending" → "none" değişirse SGK ödemesi geri alınır mı?

**Cevap**:
> "hayır bir işlem yapılmaz bilgilendirme düzeyindedir raporlarından takip ederler hastayı merkezler"
> "eğer fark alırsa ilgili satışa gidip kendisi tahsilat kaydı girip rapor durumunu özel satışa döndürebilir"
> "hayır değişmez genelde ama isterse değiştirir kullanıcı"

**Analiz**: ✅ NET CEVAP
- SGK ödemesi → Otomatik geri alınmaz
- Bilgilendirme → Raporlardan takip edilir
- Kullanıcı → Manuel tahsilat kaydı girebilir
- Satış tutarı → Otomatik değişmez (kullanıcı isterse değiştirir)

**Rapor Durumu Değişimi Flow**:
```python
def update_report_status(sale_id, new_status):
    sale = get_sale(sale_id)
    old_status = sale.report_status
    
    # Rapor durumu değiştiğinde sadece bilgilendirme
    if old_status in ["received", "pending"] and new_status == "none":
        # Otomatik işlem YOK
        # Sadece bilgilendirme göster
        show_info(
            "Rapor durumu değiştirildi. "
            "Gerekirse tahsilat kaydı girebilir ve satış tutarını güncelleyebilirsiniz."
        )
    
    # Rapor durumu güncelle
    sale.report_status = new_status
```

**Sonuç**: Rapor durumu değişiminde otomatik finansal düzeltme YOK, sadece bilgilendirme

---

## 🎯 FİNAL SONUÇ

### ✅ TUTARLI VE NET CEVAPLAR

1. **Kasa Kaydı**: Günlük kayıt defteri, stok takibi YOK
2. **Trial/Loaner**: Stok düşer, geri gelince yüklenir
3. **İade**: Reverse transaction + stok sorusu
4. **SGK Rapor**: Otomatik düzeltme YOK, manuel işlem

### ❌ ÇELİŞKİ YOK

Tüm cevaplar tutarlı ve net. Finansal mantık sağlam.

### 📋 UYGULAMA GEREKLİLİKLERİ

#### 1. Kasa Kaydı Modalı
```typescript
// Basitleştirilmiş kasa kaydı
interface CashRecordForm {
  amount: number;
  type: "income" | "expense";
  partyId?: string;  // Opsiyonel
  notes?: string;
  tags?: string[];
}

// Stok entegrasyonu YOK
// Ürün seçimi YOK
// Sadece finansal kayıt
```

#### 2. Cihaz Ataması - Stok Etkisi
```python
# Backend: Atama nedeni → Stok etkisi
STOCK_IMPACT = {
    "Sale": "decrease",       # Stok düşer
    "Trial": "decrease",      # Stok düşer ← GÜNCELLEME
    "Loaner": "decrease",     # Stok düşer ← GÜNCELLEME
    "Repair": "no_change",    # Stok değişmez
    "Replacement": "decrease" # Stok düşer
}

# Geri alma işlemi
def return_device(assignment_id):
    assignment = get_assignment(assignment_id)
    
    if assignment.reason in ["Trial", "Loaner"]:
        # Stok geri yükle
        device = get_device(assignment.device_id)
        device.stock += 1
        device.status = "available"
```

#### 3. İade İşlemi
```typescript
// Frontend: İade modalı
interface ReturnModal {
  saleId: string;
  returnReason: string;
  returnAmount: number;  // Tam/Kısmi
  deviceReturned: boolean;  // ← YENİ: Ürün geri geldi mi?
  notes?: string;
}

// Backend: İade işlemi
def process_return(sale_id, device_returned):
    # 1. Satış iptal
    sale.status = "returned"
    
    # 2. Fatura notu
    add_invoice_note(sale.invoice_id, "İade")
    
    # 3. Kasa ters kayıt
    create_cash_record(amount=-sale.total, type="refund")
    
    # 4. Ödeme iadesi
    create_refund_payment(sale_id)
    
    # 5. Stok (sadece ürün geri geldiyse)
    if device_returned:
        restore_stock(sale.device_id)
```

#### 4. SGK Rapor Durumu
```typescript
// Frontend: Rapor durumu değişimi
function updateReportStatus(saleId, newStatus) {
  const oldStatus = sale.reportStatus;
  
  // Sadece bilgilendirme
  if (oldStatus !== "none" && newStatus === "none") {
    showInfo(
      "Rapor durumu değiştirildi. " +
      "Gerekirse tahsilat kaydı girebilir ve satış tutarını güncelleyebilirsiniz."
    );
  }
  
  // Rapor durumu güncelle (otomatik finansal düzeltme YOK)
  updateSale(saleId, { reportStatus: newStatus });
}
```

---

## 📊 GÜNCELLENEN MANTIK TABLOSU

| Özellik | Eski Varsayım | Kullanıcı Cevabı | Sonuç |
|---------|---------------|------------------|-------|
| Kasa Kaydı Stok | Stok düşer | Stok düşmez | ✅ Basitleştirildi |
| Trial Stok | Rezerve | Düşer | ✅ Güncellendi |
| Loaner Stok | Rezerve | Düşer | ✅ Güncellendi |
| İade Fatura | İptal | Not ekle | ✅ Güncellendi |
| İade Stok | Otomatik yükle | Sorulur | ✅ Güncellendi |
| SGK Rapor | Otomatik düzelt | Manuel | ✅ Güncellendi |

---

## 🚀 SONRAKI ADIMLAR

### 1. Hasta Detayları - Satış Tablosu Güncelleme

**Eklenecekler**:
- Fatura Durumu kolonu (badge)
- Fatura Kes butonu (aksiyonlar)
- Fatura Görüntüle butonu
- E-Fatura Gönder butonu

**Dosya**: `x-ear/apps/web/src/components/parties/party/SalesTableView.tsx`

### 2. Backend - Sale Model Güncelleme

**Eklenecekler**:
```python
# Sale model
invoice_status = Column(String, default="none")  # none, issued, sent, cancelled
invoice_id = Column(String, ForeignKey("invoices.id"), nullable=True)
```

### 3. Backend - Stok Mantığı Güncelleme

**Güncellenecekler**:
```python
# Trial ve Loaner için stok düşümü
STOCK_IMPACT = {
    "Trial": "decrease",   # Rezerve değil, düşüm
    "Loaner": "decrease"   # Rezerve değil, düşüm
}
```

### 4. İade İşlemi Modalı

**Yeni Modal**:
- İade nedeni
- İade tutarı
- Ürün geri geldi mi? (checkbox)
- Notlar

---

## 📚 İLGİLİ DÖKÜMANLAR

- [Financial Logic Analysis](./FINANCIAL-LOGIC-ANALYSIS.md) - Orijinal analiz
- [Sales Invoice Page Design](./SALES-INVOICE-PAGE-DESIGN.md) - Sayfa tasarımı
- [Sales Table Invoice Status Implementation](./SALES-TABLE-INVOICE-STATUS-IMPLEMENTATION.md) - Implementasyon

---

**Sonuç**: Tüm cevaplar net ve tutarlı. Finansal mantık sağlam. Implementasyona hazır.

