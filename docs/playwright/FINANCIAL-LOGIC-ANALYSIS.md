# Financial Logic Analysis - Çelişki Kontrolü

**Tarih**: 2026-02-03  
**Amaç**: Kullanıcı cevaplarındaki finansal mantık tutarlılığını kontrol etmek

---

## 📊 KULLANICI CEVAPLARI ÖZETİ

### 1. Satış Kaydı
- ✅ 3 yöntemle satış yapılabilir:
  1. Yeni Satış Modalı
  2. Cihaz Atama Modalı (reason="Sale")
  3. Kasa Kaydı Modalı (hasta adı ile)

### 2. Kasa Kaydı
- ✅ Her satış bir kasa kaydıdır
- ✅ Ama her kasa kaydı satış değildir
- ✅ Hasta adı girilirse → Satış + Kasa Kaydı
- ✅ Hasta adı girilmezse → Sadece Kasa Kaydı

### 3. Cihaz Ataması
- ✅ 5 atama nedeni: Sale, Trial, Loaner, Repair, Replacement
- ✅ Sadece "Sale" nedeni satış kaydı oluşturur
- ✅ Diğer nedenler (Trial, Loaner, etc.) satış oluşturmaz

### 4. Faturalama
- ✅ Kullanıcı isterse fatura keser (otomatik değil)
- ✅ Satış → Fatura (opsiyonel)
- ✅ Fatura kesilmeden de satış yapılabilir

### 5. Ödeme/Tahsilat
- ✅ Parçalı ödeme desteklenir
- ✅ Nakit + Kredi Kartı + Senet
- ✅ Tahsilat modalı ile takip

---

## 🔍 ÇELİŞKİ ANALİZİ

### ✅ TUTARLI MANTIKLAR

#### 1. Satış → Kasa Kaydı İlişkisi
```
Satış Yapıldı → MUTLAKA Kasa Kaydı Oluşur ✅
Kasa Kaydı Oluştu → Satış OLABİLİR veya OLMAYAB İLİR ✅

Örnek:
- Cihaz satışı (15,000 TL) → Satış kaydı + Kasa kaydı ✅
- Ofis kirası ödendi (5,000 TL) → Sadece kasa kaydı (gider) ✅
```

**Sonuç**: ✅ TUTARLI - Her satış kasa kaydıdır, ama tersi değil

---

#### 2. Cihaz Ataması → Satış İlişkisi
```
Atama Nedeni = "Sale" → Satış Kaydı Oluşur ✅
Atama Nedeni = "Trial" → Satış Kaydı OLUŞMAZ ✅
Atama Nedeni = "Loaner" → Satış Kaydı OLUŞMAZ ✅

Örnek:
- Cihaz atandı (reason="Sale") → Satış + Kasa + Atama ✅
- Cihaz atandı (reason="Trial") → Sadece atama (satış yok) ✅
```

**Sonuç**: ✅ TUTARLI - Sadece "Sale" nedeni satış oluşturur

---

#### 3. Satış → Fatura İlişkisi
```
Satış Yapıldı → Fatura OPSİYONEL ✅
Fatura Kesildi → MUTLAKA Satış Var ✅

Örnek:
- Cihaz satışı (15,000 TL) → Satış kaydı ✅, Fatura YOK (henüz) ✅
- Kullanıcı "Fatura Kes" → Fatura oluşturulur ✅
```

**Sonuç**: ✅ TUTARLI - Fatura opsiyonel, ama fatura varsa satış var

---

#### 4. Ödeme → Satış İlişkisi
```
Satış Yapıldı → Ödeme Takibi Başlar ✅
Parçalı Ödeme → Tahsilat Modalı ile Takip ✅

Örnek:
- Satış: 15,000 TL
- Ödeme 1: 5,000 TL (Nakit) → Kalan: 10,000 TL ✅
- Ödeme 2: 3,000 TL (Kredi Kartı) → Kalan: 7,000 TL ✅
- Ödeme 3: 7,000 TL (Senet) → Kalan: 0 TL ✅
```

**Sonuç**: ✅ TUTARLI - Parçalı ödeme mantığı doğru

---

### ⚠️ POTANSİYEL SORUNLAR (Dikkat Edilmesi Gerekenler)

#### 1. Kasa Kaydı (Hasta Adı İLE) → Satış Oluşturma

**Senaryo**:
```
1. Kasa kaydı modalını aç
2. Hasta seç: "Ahmet Yılmaz"
3. Tutar gir: 5,000 TL
4. Kaydet
→ Sonuç: Satış kaydı + Kasa kaydı oluşur
```

**Potansiyel Sorun**:
- ❓ Hangi ürün satıldı? (Cihaz mı, pil mi, filtre mi?)
- ❓ Stok düşümü nasıl olacak?
- ❓ Fatura bilgileri nasıl doldurulacak?

**Çözüm Önerisi**:
```typescript
// Kasa kaydı modalında hasta seçilirse:
if (partySelected) {
  // Ürün seçimi ZORUNLU olmalı
  <FormField name="product" required>
    <Select>
      <option>Cihaz Seç</option>
      <option>Pil Seç</option>
      <option>Filtre Seç</option>
    </Select>
  </FormField>
  
  // Stok düşümü otomatik
  // Satış kaydı oluşturulur
}
```

**Sonuç**: ⚠️ DİKKAT - Ürün seçimi zorunlu olmalı, yoksa stok tutarsızlığı
kasa kaydını günlük kayıt defteri gibi düşün. bu yüzden var. stok takibi yapmayacak
---

#### 2. Cihaz Ataması (Trial) → Geri Alma → Stok

**Senaryo**:
```
1. Cihaz atandı (reason="Trial")
2. Stok düştü mü? (Evet, cihaz hastada)
3. Hasta cihazı geri getirdi
4. Stok geri yüklendi mi?
```

**Potansiyel Sorun**:
- ❓ Trial ataması stok düşürür mü?
evet düşürür çünkü hastaya cihaz veriliyor
- ❓ Geri alma işlemi stok geri yükler mi?
evet yükler
- ❓ Loaner ataması stok düşürür mü?
evet düşürür ve geri getirdiinde hasta cihazı stok geri yükler.
**Çözüm Önerisi**:
```python
# Atama nedeni → Stok etkisi
STOCK_IMPACT = {
    "Sale": "decrease",      # Stok düşer (satıldı)
    "Trial": "reserve",      # Stok rezerve edilir (geri gelecek)
    "Loaner": "reserve",     # Stok rezerve edilir (geri gelecek)
    "Repair": "no_change",   # Stok değişmez (zaten hastada)
    "Replacement": "decrease" # Stok düşer (yeni cihaz verildi)
}

# Geri alma işlemi
if return_device:
    if assignment.reason in ["Trial", "Loaner"]:
        stock.quantity += 1  # Stok geri yüklenir
```

**Sonuç**: ⚠️ DİKKAT - Stok rezervasyon mantığı gerekli

---

#### 3. Satış → Fatura → İptal Senaryosu

**Senaryo**:
```
1. Satış yapıldı (15,000 TL)
2. Fatura kesildi
3. E-fatura gönderildi
4. Hasta cihazı iade etti
5. Ne olacak?
```

**Potansiyel Sorun**:
- ❓ Satış kaydı iptal edilir mi?
evet satış kaydı iptal edilir
- ❓ Fatura iptal edilir mi? (E-fatura iptal süreci?)
ilgili stışa iade not düşülür iade kaydı yapılması önerisi koyulur satışa.
- ❓ Kasa kaydı iptal edilir mi?
eevet iptal düşülür
- ❓ Ödeme geri iade edilir mi?
evet geri iade edilir 
- ❓ Stok geri yüklenir mi?
sorulur çünkü bazen iadelerde satış iptal edilir ama ürün geri gelmez.

**Çözüm Önerisi**:
```python
# İade işlemi (Reverse Transaction)
def process_return(sale_id):
    sale = get_sale(sale_id)
    
    # 1. Satış kaydı durumu güncelle
    sale.status = "returned"
    
    # 2. Fatura iptal et (e-fatura sistemi)
    if sale.invoice:
        cancel_invoice(sale.invoice.id)
    
    # 3. Kasa kaydı ters kayıt (gider olarak)
    create_cash_record(
        amount=-sale.total,
        type="refund",
        notes=f"İade: {sale.id}"
    )
    
    # 4. Ödeme iadesi
    create_refund_payment(sale.id)
    
    # 5. Stok geri yükle
    if sale.device:
        sale.device.stock += 1
        sale.device.status = "available"
```

**Sonuç**: ⚠️ DİKKAT - İade senaryosu için reverse transaction mantığı gerekli

---

#### 4. SGK Ödemesi → Rapor Durumu Değişimi

**Senaryo**:
```
1. Satış yapıldı (reportStatus="pending")
2. SGK ödemesi düşüldü (698 TL)
3. Hasta rapor getirmedi
4. reportStatus → "none" olarak güncellendi
5. Ne olacak?
```

**Potansiyel Sorun**:
- ❓ SGK ödemesi geri alınır mı?
hayır bir işlem yapılmaz bilgilendirme düzeyindedir raporlarından takip ederler hastayı merkezler.
- ❓ Hasta farkı öder mi?
eğer fark alırsa ilgili satışa gidip kendisi tahsilat kaydı girip rapor durumunu özel satışa döndürebilir.
- ❓ Satış tutarı güncellenir mi?
hayır değişmez genelde ama isterse dğeiştirir kullanıcı

**Çözüm Önerisi**:
```python
# Rapor durumu değiştiğinde
def update_report_status(sale_id, new_status):
    sale = get_sale(sale_id)
    old_status = sale.report_status
    
    # Eğer SGK ödemesi düşülmüşse ve rapor iptal edildiyse
    if old_status in ["received", "pending"] and new_status == "none":
        # SGK ödemesi geri alınır
        sgk_refund = sale.sgk_support
        
        # Hasta farkı ödemeli
        additional_payment = sgk_refund
        
        # Satış tutarı güncellenir
        sale.patient_payment += additional_payment
        sale.sgk_support = 0
        
        # Tahsilat modalı açılır (ek ödeme için)
        open_payment_modal(sale_id, additional_payment)
```

**Sonuç**: ⚠️ DİKKAT - Rapor durumu değişiminde finansal düzeltme gerekli

---

## 🎯 SONUÇ: ÇELİŞKİ VAR MI?

### ✅ TUTARLI MANTIKLAR (Sorun Yok)
1. ✅ Satış → Kasa Kaydı ilişkisi
2. ✅ Cihaz Ataması → Satış ilişkisi
3. ✅ Satış → Fatura ilişkisi
4. ✅ Parçalı ödeme mantığı

### ⚠️ DİKKAT EDİLMESİ GEREKENLER (Sorun Değil, Ama Detaylandırılmalı)
1. ⚠️ Kasa kaydı (hasta adı ile) → Ürün seçimi zorunlu olmalı
2. ⚠️ Trial/Loaner ataması → Stok rezervasyon mantığı gerekli
3. ⚠️ İade senaryosu → Reverse transaction mantığı gerekli
4. ⚠️ Rapor durumu değişimi → Finansal düzeltme gerekli

### ❌ ÇELİŞKİ YOK
- Finansal mantık tutarlı
- Stok takibi mantıklı
- Ödeme takibi doğru
- Faturalama mantığı sağlam

---

## 📋 ÖNERİLER

### 1. Kasa Kaydı Modalı (Hasta Adı İLE)
```typescript
// Hasta seçilirse ürün seçimi ZORUNLU
if (partySelected) {
  <FormField name="product" required>
    <ProductSelect />
  </FormField>
}
```

### 2. Stok Rezervasyon Sistemi
```python
# Stok durumları
STOCK_STATUS = {
    "available": "Mevcut",
    "reserved_trial": "Rezerve (Test)",
    "reserved_loaner": "Rezerve (Emanet)",
    "sold": "Satıldı",
    "in_repair": "Tamirde"
}
```

### 3. İade İşlemi (Reverse Transaction)
```python
# İade butonu (satış listesinde)
<Button onClick={() => processReturn(saleId)}>
  İade İşlemi
</Button>

# İade modalı
- İade nedeni
- İade tutarı (tam/kısmi)
- Fatura iptal (evet/hayır)
- Stok geri yükle (evet/hayır)
```

### 4. Rapor Durumu Değişimi Uyarısı
```typescript
// Rapor durumu değiştiğinde uyarı
if (oldStatus !== "none" && newStatus === "none") {
  showWarning(
    "SGK ödemesi geri alınacak. Hasta farkı ödemeli. Devam edilsin mi?"
  );
}
```

---

## 🏆 GENEL DEĞERLENDİRME

**Finansal Mantık**: ✅ TUTARLI  
**Stok Takibi**: ✅ TUTARLI (rezervasyon eklenirse)  
**Ödeme Takibi**: ✅ TUTARLI  
**Faturalama**: ✅ TUTARLI  

**Çelişki**: ❌ YOK  
**Dikkat Gereken Noktalar**: ⚠️ 4 adet (yukarıda detaylandırıldı)

---

## 📚 İLGİLİ DÖKÜMANLAR

- [Test Inventory](./08-TEST-INVENTORY.md)
- [Missing Features TODO](./MISSING-FEATURES-TODO.md)
- [Current Status](./CURRENT-STATUS-AND-NEXT-STEPS.md)

---

**Sonuç**: Finansal mantık tutarlı, ama bazı edge case'ler için ek özellikler gerekli (stok rezervasyon, iade işlemi, rapor durumu değişimi).

