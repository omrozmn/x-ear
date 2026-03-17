# Satış-Fatura Sayfa Tasarımı - Best Practice

**Tarih**: 2026-02-03  
**Amaç**: Satış ve fatura yönetimi için optimal sayfa yapısı

---

## 🎯 KULLANICI İHTİYACI

> "Alış satış altındaki satışlar subitem ile açılan sayfada faturalar görünüyordu oraya satışları koyalım demişti k ya. Yeni bir faturalar sayfası açmadan aynı sayfada satışları gösterip fatura durumunu mu gösterelim her kayıtta ayrı bir sayfaya gerek kalmadan?"

**Analiz**:
- ✅ Kullanıcı tek sayfada hem satış hem fatura durumu görmek istiyor
- ✅ Ayrı fatura sayfası gereksiz tıklama yaratıyor
- ✅ Satış → Fatura ilişkisi net olmalı

---

## 🏆 ENDÜSTRİ BEST PRACTICE

### Yaklaşım: Tek Sayfa (Satışlar + Fatura Durumu)

**Örnekler**:
1. **Shopify**: Orders sayfasında hem sipariş hem fatura durumu
2. **Odoo**: Sales Orders sayfasında invoice status kolonu
3. **SAP**: Sales Document'te invoice status
4. **NetSuite**: Sales Order'da billing status
5. **QuickBooks**: Sales Receipt'te invoice link

**Avantajları**:
- ✅ Tek yerden tüm bilgiler
- ✅ Daha az tıklama
- ✅ Satış → Fatura ilişkisi net
- ✅ Kullanıcı dostu

---

## 📐 ÖNERİLEN TASARIM

### Sidebar Yapısı

```
Sidebar:
├── Dashboard
├── Hastalar (Parties)
├── Satışlar ← ANA SAYFA
│   └── Tüm satışlar + fatura durumu
├── Faturalar ← AYRI SAYFA (Muhasebe için)
│   ├── Giden Faturalar
│   ├── Gelen Faturalar (Alışlar)
│   └── E-Fatura Yönetimi
├── Envanter
├── Kasa
├── Raporlar
└── Ayarlar
```

---

### Satışlar Sayfası (Ana Liste)

#### Tablo Kolonları

| Kolon | Açıklama | Örnek |
|-------|----------|-------|
| Tarih | Satış tarihi | 03.02.2026 |
| Hasta Adı | Müşteri adı | Ahmet Yılmaz |
| Ürün | Cihaz/Pil/Filtre | Phonak Audeo P90 |
| Tutar | Toplam tutar | 15,000 TL |
| Ödeme Durumu | Badge | 🟢 Ödendi / 🟡 Kısmi / 🔴 Bekliyor |
| Fatura Durumu | Badge | 🟢 Kesildi / 🟡 Bekliyor / ⚪ Yok |
| Aksiyonlar | Butonlar | ... (dropdown) |

#### Ödeme Durumu Badge'leri

```typescript
// Ödeme durumu renkleri
const paymentStatusColors = {
  paid: "green",      // 🟢 Ödendi (100%)
  partial: "yellow",  // 🟡 Kısmi (0-99%)
  pending: "red"      // 🔴 Bekliyor (0%)
};

// Örnek
<Badge color={paymentStatusColors[sale.paymentStatus]}>
  {sale.paymentStatus === "paid" && "Ödendi"}
  {sale.paymentStatus === "partial" && `Kısmi (${sale.paidPercentage}%)`}
  {sale.paymentStatus === "pending" && "Bekliyor"}
</Badge>
```

#### Fatura Durumu Badge'leri

```typescript
// Fatura durumu renkleri
const invoiceStatusColors = {
  issued: "green",      // 🟢 Kesildi
  sent: "blue",         // 🔵 Gönderildi (e-fatura)
  pending: "yellow",    // 🟡 Bekliyor
  none: "gray",         // ⚪ Yok
  cancelled: "red"      // 🔴 İptal
};

// Örnek
<Badge color={invoiceStatusColors[sale.invoiceStatus]}>
  {sale.invoiceStatus === "issued" && "Kesildi"}
  {sale.invoiceStatus === "sent" && "Gönderildi"}
  {sale.invoiceStatus === "pending" && "Bekliyor"}
  {sale.invoiceStatus === "none" && "Yok"}
  {sale.invoiceStatus === "cancelled" && "İptal"}
</Badge>
```

#### Aksiyonlar Dropdown

```typescript
<DropdownMenu>
  <DropdownMenuTrigger>
    <Button variant="ghost" size="sm">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {/* Ödeme işlemleri */}
    {sale.paymentStatus !== "paid" && (
      <DropdownMenuItem onClick={() => openPaymentModal(sale.id)}>
        💰 Tahsilat Yap
      </DropdownMenuItem>
    )}
    
    {/* Fatura işlemleri */}
    {sale.invoiceStatus === "none" && (
      <DropdownMenuItem onClick={() => openInvoiceModal(sale.id)}>
        📄 Fatura Kes
      </DropdownMenuItem>
    )}
    
    {sale.invoiceStatus === "issued" && (
      <>
        <DropdownMenuItem onClick={() => viewInvoice(sale.invoiceId)}>
          👁️ Fatura Görüntüle
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => sendInvoice(sale.invoiceId)}>
          📧 E-Fatura Gönder
        </DropdownMenuItem>
      </>
    )}
    
    {sale.invoiceStatus === "sent" && (
      <DropdownMenuItem onClick={() => viewInvoice(sale.invoiceId)}>
        👁️ Fatura Görüntüle
      </DropdownMenuItem>
    )}
    
    {/* Diğer işlemler */}
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => viewSaleDetails(sale.id)}>
      📋 Detaylar
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => openReturnModal(sale.id)}>
      ↩️ İade İşlemi
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

### Filtreler

```typescript
// Üst kısımda filtreler
<div className="flex gap-4 mb-4">
  {/* Tarih aralığı */}
  <DateRangePicker />
  
  {/* Ödeme durumu */}
  <Select>
    <option value="all">Tüm Ödemeler</option>
    <option value="paid">Ödendi</option>
    <option value="partial">Kısmi</option>
    <option value="pending">Bekliyor</option>
  </Select>
  
  {/* Fatura durumu */}
  <Select>
    <option value="all">Tüm Faturalar</option>
    <option value="issued">Kesildi</option>
    <option value="sent">Gönderildi</option>
    <option value="pending">Bekliyor</option>
    <option value="none">Yok</option>
  </Select>
  
  {/* Arama */}
  <Input placeholder="Hasta adı ara..." />
</div>
```

---

### Faturalar Sayfası (Ayrı - Muhasebe için)

**Amaç**: Muhasebe departmanı için özelleşmiş fatura yönetimi

#### Özellikler

1. **Giden Faturalar** (Satış faturaları)
   - Tüm faturalar (satışla ilişkili + manuel)
   - E-fatura gönderimi
   - Toplu işlemler
   - Muhasebe raporları

2. **Gelen Faturalar** (Alış faturaları)
   - Tedarikçi faturaları
   - Envanter alımları
   - Gider faturaları

3. **E-Fatura Yönetimi**
   - Gönderim durumu
   - Hata logları
   - Yeniden gönderim

#### Tablo Kolonları

| Kolon | Açıklama |
|-------|----------|
| Fatura No | Otomatik numara |
| Tarih | Fatura tarihi |
| Müşteri/Tedarikçi | İlgili taraf |
| Tutar | Fatura tutarı |
| Durum | Kesildi/Gönderildi/İptal |
| E-Fatura | Gönderildi mi? |
| Satış | İlişkili satış (link) |
| Aksiyonlar | Görüntüle/İndir/İptal |

---

## 🎨 UI/UX MOCKUP

### Satışlar Sayfası

```
┌─────────────────────────────────────────────────────────────────┐
│ Satışlar                                    [+ Yeni Satış]       │
├─────────────────────────────────────────────────────────────────┤
│ Filtreler:                                                       │
│ [Tarih: Son 30 gün ▼] [Ödeme: Tümü ▼] [Fatura: Tümü ▼] [Ara...] │
├─────────────────────────────────────────────────────────────────┤
│ Tarih      │ Hasta        │ Ürün      │ Tutar    │ Ödeme  │ Fatura │ ... │
├────────────┼──────────────┼───────────┼──────────┼────────┼────────┼─────┤
│ 03.02.2026 │ Ahmet Yılmaz │ Phonak P90│ 15,000₺  │ 🟢 Ödendi │ 🟢 Kesildi │ ⋮ │
│ 02.02.2026 │ Ayşe Demir   │ Duracell  │ 1,200₺   │ 🟡 Kısmi  │ ⚪ Yok     │ ⋮ │
│ 01.02.2026 │ Mehmet Kaya  │ Signia NX │ 18,000₺  │ 🔴 Bekliyor│ 🟡 Bekliyor│ ⋮ │
└─────────────────────────────────────────────────────────────────┘

Aksiyonlar Dropdown (⋮):
┌─────────────────────┐
│ 💰 Tahsilat Yap     │
│ 📄 Fatura Kes       │
│ 👁️ Fatura Görüntüle │
│ 📧 E-Fatura Gönder  │
│ ─────────────────── │
│ 📋 Detaylar         │
│ ↩️ İade İşlemi      │
└─────────────────────┘
```

---

## 📊 VERİ MODELİ

### Sale Model (Backend)

```python
class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=False)
    party_id = Column(String, ForeignKey("parties.id"))
    
    # Ürün bilgileri
    product_type = Column(String)  # device, pill, filter
    product_id = Column(String)
    quantity = Column(Integer, default=1)
    
    # Fiyat bilgileri
    base_price = Column(Float)
    sale_price = Column(Float)
    sgk_support = Column(Float, default=0)
    patient_payment = Column(Float)
    total = Column(Float)
    
    # Ödeme durumu
    payment_status = Column(String)  # paid, partial, pending
    paid_amount = Column(Float, default=0)
    remaining_amount = Column(Float)
    
    # Fatura durumu ← YENİ
    invoice_status = Column(String, default="none")  # none, pending, issued, sent, cancelled
    invoice_id = Column(String, ForeignKey("invoices.id"), nullable=True)
    
    # İlişkiler
    party = relationship("Party")
    invoice = relationship("Invoice", back_populates="sale")
    payments = relationship("Payment", back_populates="sale")
```

### Invoice Model (Backend)

```python
class Invoice(Base):
    __tablename__ = "invoices"
    
    id = Column(String, primary_key=True)
    tenant_id = Column(String, nullable=False)
    
    # Fatura bilgileri
    invoice_number = Column(String, unique=True)
    invoice_date = Column(DateTime)
    invoice_type = Column(String)  # normal, sgk, export
    
    # Müşteri bilgileri
    party_id = Column(String, ForeignKey("parties.id"))
    
    # Tutar bilgileri
    subtotal = Column(Float)
    tax = Column(Float)
    total = Column(Float)
    
    # Durum
    status = Column(String)  # issued, sent, cancelled
    e_invoice_status = Column(String)  # pending, sent, failed
    e_invoice_uuid = Column(String, nullable=True)
    
    # İlişkili satış ← YENİ
    sale_id = Column(String, ForeignKey("sales.id"), nullable=True)
    
    # İlişkiler
    party = relationship("Party")
    sale = relationship("Sale", back_populates="invoice")
```

---

## 🔄 İŞ AKIŞI

### 1. Satış Yapma

```
1. Yeni Satış Modalı Aç
2. Hasta Seç
3. Ürün Seç (Cihaz/Pil/Filtre)
4. Fiyat Bilgileri Doldur
5. Kaydet
→ Satış kaydı oluşur
→ payment_status: "pending"
→ invoice_status: "none"
```

### 2. Tahsilat Yapma

```
1. Satış Listesinde "Tahsilat Yap" Tıkla
2. Tahsilat Modalı Açılır
3. Ödeme Ekle (Nakit/Kredi Kartı/Senet)
4. Kaydet
→ payment_status güncellenir
→ Eğer tam ödendiyse: "paid"
→ Eğer kısmi ödendiyse: "partial"
```

### 3. Fatura Kesme

```
1. Satış Listesinde "Fatura Kes" Tıkla
2. Fatura Modalı Açılır (bilgiler otomatik dolu)
3. Fatura Tipi Seç (Normal/SGK/İhracat)
4. Kaydet
→ Fatura oluşur
→ invoice_status: "issued"
→ sale.invoice_id set edilir
```

### 4. E-Fatura Gönderme

```
1. Satış Listesinde "E-Fatura Gönder" Tıkla
2. E-fatura sistemine gönderilir
3. Başarılıysa:
   → invoice_status: "sent"
   → e_invoice_status: "sent"
4. Başarısızsa:
   → e_invoice_status: "failed"
   → Hata mesajı göster
```

---

## 🧪 TEST SENARYOLARI

### TEST-001: Satış Listesi Görüntüleme
```typescript
test('should display sales list with invoice status', async ({ page }) => {
  // 1. Login
  // 2. Satışlar sayfasına git
  // 3. Tablo görünmeli
  // 4. Kolonlar doğru mu kontrol et:
  //    - Tarih, Hasta, Ürün, Tutar, Ödeme Durumu, Fatura Durumu
  // 5. Badge'ler doğru renkte mi kontrol et
});
```

### TEST-002: Fatura Durumu Filtreleme
```typescript
test('should filter sales by invoice status', async ({ page }) => {
  // 1. Login
  // 2. Satışlar sayfasına git
  // 3. Fatura durumu filtresi: "Kesildi" seç
  // 4. Sadece faturası kesilmiş satışlar görünmeli
  // 5. Fatura durumu filtresi: "Yok" seç
  // 6. Sadece faturası olmayan satışlar görünmeli
});
```

### TEST-003: Fatura Kesme İşlemi
```typescript
test('should create invoice from sale', async ({ page }) => {
  // 1. Login
  // 2. Satışlar sayfasına git
  // 3. Faturası olmayan bir satış bul
  // 4. Aksiyonlar → "Fatura Kes" tıkla
  // 5. Fatura modalı açılır
  // 6. Bilgiler otomatik dolu mu kontrol et
  // 7. Kaydet
  // 8. Toast: "Fatura başarıyla oluşturuldu"
  // 9. Fatura durumu: "Kesildi" olmalı
  // 10. Aksiyonlar → "Fatura Görüntüle" görünmeli
});
```

### TEST-004: E-Fatura Gönderme
```typescript
test('should send e-invoice', async ({ page }) => {
  // 1. Login
  // 2. Satışlar sayfasına git
  // 3. Faturası kesilmiş bir satış bul
  // 4. Aksiyonlar → "E-Fatura Gönder" tıkla
  // 5. Loading spinner görünmeli
  // 6. Toast: "E-fatura başarıyla gönderildi"
  // 7. Fatura durumu: "Gönderildi" olmalı
});
```

---

## 📋 UYGULAMA PLANI

### Adım 1: Backend (API)

1. **Sale Model Güncelleme**
   ```python
   # Add invoice_status field
   invoice_status = Column(String, default="none")
   invoice_id = Column(String, ForeignKey("invoices.id"), nullable=True)
   ```

2. **Invoice Model Güncelleme**
   ```python
   # Add sale_id field
   sale_id = Column(String, ForeignKey("sales.id"), nullable=True)
   ```

3. **Migration**
   ```bash
   alembic revision --autogenerate -m "add_invoice_status_to_sales"
   alembic upgrade head
   ```

4. **API Endpoints**
   ```python
   # GET /api/sales (fatura durumu ile)
   # POST /api/sales/{id}/invoice (fatura kes)
   # POST /api/invoices/{id}/send (e-fatura gönder)
   ```

---

### Adım 2: Frontend (UI)

1. **Satışlar Sayfası Güncelleme**
   ```typescript
   // Add invoice status column
   // Add invoice status filter
   // Add invoice actions (dropdown)
   ```

2. **Fatura Modalı**
   ```typescript
   // Create invoice modal
   // Auto-fill from sale data
   // Invoice type selection
   ```

3. **E-Fatura Gönderimi**
   ```typescript
   // Send e-invoice button
   // Loading state
   // Success/error handling
   ```

---

### Adım 3: Testing

1. **Backend Tests**
   ```python
   # test_sale_invoice_status.py
   # test_invoice_creation_from_sale.py
   # test_e_invoice_sending.py
   ```

2. **Frontend E2E Tests**
   ```typescript
   // tests/e2e/sale/sale-invoice-integration.spec.ts
   ```

---

## 🎯 SONUÇ

**Önerilen Yaklaşım**: ✅ Tek Sayfa (Satışlar + Fatura Durumu)

**Avantajları**:
- ✅ Kullanıcı dostu (tek yerden her şey)
- ✅ Daha az tıklama
- ✅ Satış → Fatura ilişkisi net
- ✅ Endüstri standardı (Shopify, Odoo, SAP)

**Faturalar Sayfası**: Ayrı sayfa olarak kalmalı (muhasebe için)

**Uygulama Süresi**: 2-3 gün
- Backend: 1 gün
- Frontend: 1 gün
- Testing: 1 gün

---

## 📚 İLGİLİ DÖKÜMANLAR

- [Financial Logic Analysis](./FINANCIAL-LOGIC-ANALYSIS.md)
- [Test Inventory](./08-TEST-INVENTORY.md)
- [Current Status](./CURRENT-STATUS-AND-NEXT-STEPS.md)

