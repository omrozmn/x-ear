# Satış Görüntüleme Sorunları ve Çözümler

## Tespit Edilen Sorunlar

### 1. ✅ Barkod Tekrarı (ÇÖZÜLDÜ)
**Sorun**: Bilateral satışta aynı barkod 2 kez görünüyor (her kulak için ayrı satır)
**Neden**: `renderBarcodeSerialInfo` fonksiyonu her device için ayrı barkod gösteriyordu
**Çözüm**: Barkod sadece 1 kez gösterilecek (tüm devices için aynı), seri numaraları ayrı ayrı listelenecek

### 2. ✅ Kalan Tutar Farklılığı (ÇÖZÜLDÜ)
**Sorun**: Satış geçmişinde 8.217,28 TRY vs Modal'da 6.521,60 TRY
**Neden**: Backend'den gelen `remainingAmount` kullanılıyordu ama yanlış hesaplanmış olabilir
**Çözüm**: Frontend'de doğru hesaplama: `remainingAmount = finalAmount - paidAmount`

### 3. ⚠️ Peşin Ödeme Tahsilat Olarak Gelmiyor (KISMEN ÇÖZÜLDÜ)
**Sorun**: Peşin ödeme (down payment) ödeme takibinde görünmüyor
**Neden**: 
- Peşin ödeme `sale.paidAmount` olarak saklanıyor
- Ancak `payment_records` tablosunda kayıt yok
- PaymentTrackingModal sadece `payment_records` tablosundan veri çekiyor

**Çözüm Seçenekleri**:
1. **Backend Fix (Önerilen)**: Satış oluşturulurken peşin ödeme için otomatik payment record oluştur
2. **Frontend Workaround**: PaymentTrackingModal'da `sale.paidAmount` varsa ama payment records yoksa, "İlk Peşinat" olarak göster

## Uygulanan Değişiklikler

### Frontend (x-ear/apps/web/src/components/parties/party/SalesTableView.tsx)

1. **Barkod Gösterimi**: 
   - Sadece ilk device'ın barkodu gösteriliyor
   - Tüm seri numaraları listeleniy or (Sol/Sağ ayrımı ile)

2. **Kalan Tutar Hesaplama**:
   ```typescript
   const remainingAmount = Math.max(0, displayTotal - paidAmount);
   ```

## Yapılması Gerekenler

### Backend (Önerilen)
1. Satış oluşturulurken `paidAmount > 0` ise otomatik payment record oluştur:
   ```python
   if sale.paid_amount and sale.paid_amount > 0:
       payment = PaymentRecord(
           id=f"payment_{uuid4().hex[:8]}",
           party_id=sale.party_id,
           sale_id=sale.id,
           amount=sale.paid_amount,
           payment_method=sale.payment_method or 'cash',
           payment_type='down_payment',
           status='paid',
           payment_date=sale.sale_date or datetime.utcnow(),
           created_at=datetime.utcnow()
       )
       db.add(payment)
   ```

2. Satış güncellenirken `paidAmount` değişirse payment record'ı güncelle veya oluştur

### Frontend (Workaround)
PaymentTrackingModal'da peşin ödemeyi göster:
```typescript
// If sale has paidAmount but no payment records, show it as initial down payment
if (sale.paidAmount > 0 && realPaymentRecords.length === 0) {
  realPaymentRecords.unshift({
    id: 'initial-down-payment',
    saleId: sale.id,
    amount: sale.paidAmount,
    paymentDate: sale.saleDate || new Date().toISOString(),
    paymentMethod: sale.paymentMethod || 'cash',
    status: 'paid',
    notes: 'İlk Peşinat'
  });
}
```

## Test Senaryoları

1. ✅ Bilateral satış → Barkod 1 kez görünmeli
2. ✅ Kalan tutar → Tüm yerlerde aynı olmalı (finalAmount - paidAmount)
3. ⚠️ Peşin ödeme → Ödeme takibinde görünmeli

## Notlar

- Barkod ve kalan tutar sorunları frontend'de çözüldü
- Peşin ödeme sorunu için backend fix önerilir (payment record otomatik oluşturma)
- Alternatif olarak frontend workaround uygulanabilir
