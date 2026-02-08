# Test Inventory - Yeni Sorular (Cevaplardan Sonra)

**Tarih**: 2026-02-02  
**Durum**: Cevaplar analiz edildi, yeni sorular oluşturuldu

---

## 🎯 Cevaplardan Çıkan Yeni Sorular

### 🔴 KASA KAYDI (Cash Register) - ÇOK KRİTİK

Cevabından anladığım:
- ✅ Her satış kasa kaydıdır
- ✅ Ama her kasa kaydı satış değildir
- ✅ Hasta adı girilirse → Satış olarak kaydedilir
- ✅ Hasta adı girilmezse → Sadece kasa kaydı

**YENİ SORULAR**:

1. **Kasa Kaydı Oluşturma Flow'u**:
   ```
   Senaryo 1: Hasta adı GİRİLİRSE
   1. Kasa kaydı modalını aç
   2. Hasta seç (autocomplete?)
   3. Tutar gir
   4. Ürün seç (opsiyonel)
   5. Kaydet
   → Sonuç: Hem kasa kaydı, hem satış oluşur
   → Toast: "İlgili hasta adına satış olarak kaydedildi"
   
   Senaryo 2: Hasta adı GİRİLMEZSE
   1. Kasa kaydı modalını aç
   2. Tutar gir
   3. Etiket seç/oluştur
   4. Kaydet
   → Sonuç: Sadece kasa kaydı oluşur
   → Toast: "Kasa kaydı oluşturuldu"
   ```

   ❓ **SORU 1.1**: Kasa kaydı modalı nerede açılıyor? (Dashboard'da mı, ayrı bir sayfada mı?)
   
   ❓ **SORU 1.2**: "Etiket" ne demek? (Örnek: "Pil satışı", "Tamir", "Kaparo"?) Kullanıcı kendisi mi oluşturuyor?
   
   ❓ **SORU 1.3**: Kasa kaydında "Gider" de kaydedilebiliyor mu? (Sadece gelir mi, yoksa gider de mi?)
   
   ❓ **SORU 1.4**: Kasa kaydı oluştururken ödeme yöntemi seçiliyor mu? (Nakit, Kredi Kartı, etc.)

---

### 🔴 SATIŞ vs CIHAZ ATAMASI - Karmaşık İlişki

Cevabından anladığım:
- ✅ Satış 2 şekilde yapılabilir:
  1. **Yeni Satış Modalı** → Sadece cihaz satışı, otomatik atama
  2. **Cihaz Atama Modalı** → Atama nedeni "Satış" seçilirse satış kaydı oluşur

**YENİ SORULAR**:

2. **Cihaz Atama Flow'u**:
   ```
   1. Hasta detayına git
   2. "Cihaz Ata" sekmesine tıkla
   3. Cihaz seç (autocomplete)
   4. Atama nedeni seç: "Satış" / "Test" / "Loaner" / "Değişim"
   5. Eğer "Satış" seçildiyse:
      - Fiyat bilgileri otomatik dolsun
      - SGK indirimi hesaplansın
      - Ödeme bilgileri girilsin
   6. Kaydet
   ```

   ❓ **SORU 2.1**: Atama nedenleri tam olarak neler? (Satış, Test, Loaner, Değişim, Tamir, İade?)
   
   ❓ **SORU 2.2**: "Test" veya "Loaner" atama yapıldığında fiyat bilgileri giriliyor mu?
   
   ❓ **SORU 2.3**: Cihaz ataması yapıldıktan sonra geri alınabiliyor mu? (Atama iptali?)
   
   ❓ **SORU 2.4**: Bir cihaz aynı anda birden fazla hastaya atanabilir mi? (Örn: Test amaçlı)

---

### 🔴 SATIŞ SEKMESİ vs FATURALAR SEKMESİ - Yapı Değişikliği

Cevabından anladığım:
- ❌ Şu anda: "Satışlar" altında "Faturalar" var (YANLIŞ)
- ✅ Olması gereken: "Satışlar-Alışlar" ana sekme, "Faturalar" alt item

**YENİ SORULAR**:

3. **Yeni Navigasyon Yapısı**:
   ```
   Sidebar:
   ├── Dashboard
   ├── Hastalar (Parties)
   ├── Satışlar-Alışlar ← YENİ
   │   ├── Tüm Satışlar (liste)
   │   ├── Fatura Oluştur
   │   └── Tahsilat Yap
   ├── Faturalar
   │   ├── Giden Faturalar (satış faturaları)
   │   ├── Gelen Faturalar (alış faturaları)
   │   └── Yeni Fatura
   ├── Envanter
   └── ...
   ```

   ❓ **SORU 3.1**: "Satışlar-Alışlar" sekmesi şu anda var mı, yoksa oluşturmamız mı gerekiyor?
   
   ❓ **SORU 3.2**: "Alışlar" (gelen faturalar) için ayrı bir flow var mı? (Tedarikçiden cihaz alımı?)
   
   ❓ **SORU 3.3**: Satış listesinde hangi bilgiler gösteriliyor? (Hasta adı, cihaz, tutar, ödeme durumu, fatura durumu?)

---

### 🔴 ÖDEME TAKİBİ - Tahsilat Modalı

Cevabından anladığım:
- ✅ Tahsilat modalı ile parçalı ödemeler yapılabiliyor
- ✅ Örnek: 10,000 TL satış → 3,000 TL nakit + 2,000 TL kredi kartı + 5,000 TL senet

**YENİ SORULAR**:

4. **Tahsilat Modalı Flow'u**:
   ```
   1. Satış listesinden "Tahsilat Yap" butonuna tıkla
   2. Tahsilat modalı açılır
   3. Kalan tutar gösterilir (örn: 10,000 TL)
   4. Ödeme ekle:
      - Tutar: 3,000 TL
      - Yöntem: Nakit
      - Tarih: Bugün
   5. Ödeme ekle:
      - Tutar: 2,000 TL
      - Yöntem: Kredi Kartı
      - Taksit: 3
      - Tarih: Bugün
   6. Ödeme ekle:
      - Tutar: 5,000 TL
      - Yöntem: Senet
      - Vade: 30 gün sonra
   7. Kaydet
   → Toplam tahsilat: 10,000 TL
   → Kalan: 0 TL
   ```

   ❓ **SORU 4.1**: Tahsilat modalı nerede açılıyor? (Satış listesinde mi, hasta detayında mı, her ikisinde de mi?)
   
   ❓ **SORU 4.2**: Toplam tahsilat satış tutarını geçebilir mi? (Fazla ödeme durumu?)
   
   ❓ **SORU 4.3**: Tahsilat sonrası ödeme iptal edilebilir mi? (İade senaryosu?)
   
   ❓ **SORU 4.4**: Senet oluşturulduğunda ayrı bir "Senet Takip" ekranına mı düşüyor?

---

### 🔴 SENET TAKİBİ

Cevabından anladığım:
- ✅ Senet takip modalı var
- ✅ Senet oluşturma yapılabiliyor
- ✅ Senet tahsil bildirimi yapılabiliyor

**YENİ SORULAR**:

5. **Senet Takip Flow'u**:
   ```
   1. Senet Takip ekranına git
   2. Tüm senetler listelenir (vade tarihine göre)
   3. Vadesi gelen senet için "Tahsil Et" butonuna tıkla
   4. Tahsil modalı açılır:
      - Tahsil tarihi
      - Tahsil yöntemi (Nakit, Havale, etc.)
      - Not
   5. Kaydet
   → Senet durumu: "Tahsil Edildi"
   ```

   ❓ **SORU 5.1**: Senet Takip ekranı nerede? (Sidebar'da ayrı bir sekme mi?)
   
   ❓ **SORU 5.2**: Senet oluşturulurken hangi bilgiler giriliyor? (Tutar, vade, senet no, banka?)
   
   ❓ **SORU 5.3**: Vadesi geçmiş senetler için uyarı var mı? (Kırmızı renk, bildirim?)
   
   ❓ **SORU 5.4**: Senet tahsil edilmediğinde ne oluyor? (Takip devam ediyor mu?)

---

### 🔴 SGK RAPORU TAKİBİ

Cevabından anladığım:
- ✅ İşitme cihazında 5 sene SGK raporu geçerli
- ✅ 1 sene sonra kullanıcıya bilgilendirme yapılmalı

**YENİ SORULAR**:

6. **SGK Rapor Takip Flow'u**:
   ```
   Senaryo: Hasta 2025-01-01'de cihaz aldı (5 yıllık rapor)
   
   2026-01-01: Sistem uyarı gösterir
   → "Ahmet Yılmaz'ın SGK raporu 1 yıl geçti, kontrol edin"
   
   2030-01-01: Sistem uyarı gösterir
   → "Ahmet Yılmaz'ın SGK raporu süresi doldu, yeni rapor gerekli"
   ```

   ❓ **SORU 6.1**: Bu özellik şu anda uygulanmış mı? (Yoksa yapacak mıyız?)
   
   ❓ **SORU 6.2**: Uyarı nerede gösteriliyor? (Dashboard'da mı, hasta detayında mı, bildirim olarak mı?)
   
   ❓ **SORU 6.3**: Uyarı kapatılabiliyor mu? (Kullanıcı "Kontrol ettim" diyebiliyor mu?)
   
   ❓ **SORU 6.4**: SGK rapor bilgileri nerede saklanıyor? (HearingProfile'da mı?)

---

### 🔴 PİL SATIŞI - SGK Ödemesi

Cevabından anladığım:
- ✅ Pil satışı "raporlu" olarak işaretlenebiliyor
- ✅ SGK 104 adet pil için 698 TL ödüyor
- ✅ Envanterde paket içeriği ve birim seçilebilmeli

**YENİ SORULAR**:

7. **Pil Satış Flow'u**:
   ```
   1. Satış modalını aç
   2. Ürün seç: "Pil" (autocomplete)
   3. Paket seçimi:
      - Paket: "Duracell 60'lı Paket"
      - Birim: "Adet"
      - Paket içi adet: 60
   4. Satılan miktar: 2 paket (120 adet)
   5. "Raporlu" checkbox'ı işaretle
   6. SGK ödemesi otomatik hesaplansın:
      - 120 adet / 104 adet = 1.15 birim
      - 1.15 * 698 TL = 802.70 TL SGK ödemesi
   7. Kaydet
   ```

   ❓ **SORU 7.1**: Pil satışı cihaz atamasıyla mı yapılıyor, yoksa ayrı bir satış modalıyla mı?
   
   ❓ **SORU 7.2**: "Raporlu" checkbox'ı nerede? (Satış modalında mı, ürün seçiminde mi?)
   
   ❓ **SORU 7.3**: SGK ödeme hesaplaması otomatik mi yapılıyor, yoksa manuel mi giriliyor?
   
   ❓ **SORU 7.4**: Envanterde paket içeriği özelliği şu anda var mı? (Yoksa ekleyecek miyiz?)

---

### 🔴 FATURA OLUŞTURMA - Satıştan Faturaya

Cevabından anladığım:
- ✅ Kullanıcı isterse fatura oluşturuyor (otomatik değil)
- ✅ Satış tablosunda "Fatura Oluştur" butonu var
- ✅ Fatura bilgileri otomatik dolduruluyor

**YENİ SORULAR**:

8. **Fatura Oluşturma Flow'u**:
   ```
   1. Satış listesinde "Fatura Oluştur" butonuna tıkla
   2. Fatura modalı açılır (bilgiler otomatik dolu):
      - Müşteri: Ahmet Yılmaz (otomatik)
      - Ürünler: İşitme Cihazı (otomatik)
      - Tutar: 15,000 TL (otomatik)
      - Tarih: Bugün (değiştirilebilir)
   3. Fatura tipi seç:
      - Normal Fatura
      - SGK Faturası
      - İhracat Faturası
   4. Fatura detaylarını düzenle (isteğe bağlı)
   5. "Fatura Kes" butonuna tıkla
   6. E-fatura sistemine gönderilir
   7. PDF oluşturulur
   8. Faturalar sekmesine düşer
   ```

   ❓ **SORU 8.1**: Fatura modalı nerede açılıyor? (Satış listesinde mi, hasta detayında mı, her ikisinde de mi?)
   
   ❓ **SORU 8.2**: Fatura tipi seçimi zorunlu mu? (Varsayılan "Normal Fatura" mı?)
   
   ❓ **SORU 8.3**: E-fatura gönderimi senkron mu, asenkron mu? (Kullanıcı bekliyor mu?)
   
   ❓ **SORU 8.4**: Fatura kesildikten sonra iptal edilebilir mi? (İptal faturası?)

---

### 🔴 ADMIN PANEL - Tenant ve Role Impersonation

Cevabından anladığım:
- ✅ Super admin aynı giriş ekranından giriş yapıyor
- ✅ Tenant seçmeden CRUD işlemi yapamıyor
- ✅ Role impersonate edebiliyor

**YENİ SORULAR**:

9. **Admin Impersonation Flow'u**:
   ```
   1. Super admin login yapar (admin_user@example.com)
   2. Dashboard'a yönlendirilir
   3. Tenant seçmeden CRUD işlemi yapmaya çalışırsa:
      → Toast: "Lütfen tenant seçin"
   4. Tenant seç: "Klinik A"
   5. Role seç (opsiyonel): "Audiologist"
   6. Artık "Klinik A" tenant'ında "Audiologist" rolüyle işlem yapabilir
   7. Impersonation banner gösterilir (üstte)
   8. "Impersonation'ı Durdur" butonuna tıkla
   9. Super admin moduna geri dön
   ```

   ✅ **CEVAP 9.1**: Tenant seçimi modalı otomatik AÇILMIYOR, kullanıcı manuel seçiyor
   
   ❓ **SORU 9.2**: Role seçimi opsiyonel mi? (Seçmezse ne oluyor?)
   
   ❓ **SORU 9.3**: Impersonation banner nerede gösteriliyor? (Üstte mi, altta mı?)
   
   ❓ **SORU 9.4**: Impersonation sırasında yapılan işlemler audit log'a düşüyor mu?

---

### 🔴 LOADING SPINNER & TOAST

Cevabından anladığım:
- ✅ Loading spinner olmalı
- ✅ Toast notification best practice kadar görünmeli

**YENİ SORULAR**:

10. **UI/UX Detayları**:
    
    ❓ **SORU 10.1**: Loading spinner nerede gösteriliyor? (Button içinde mi, sayfa ortasında mı, her ikisi de mi?)
    
    ❓ **SORU 10.2**: Toast notification kaç saniye görünüyor? (3 saniye mi, 5 saniye mi?)
    
    ❓ **SORU 10.3**: Toast notification kapatılabiliyor mu? (X butonu var mı?)
    
    ❓ **SORU 10.4**: Birden fazla toast aynı anda gösterilebiliyor mu? (Stack olarak mı?)

---

## 📊 Yeni Test Senaryoları (Cevaplardan Çıkan)

### CASH-001: Kasa Kaydı (Hasta Adı İLE)
```typescript
test('CASH-001: Kasa kaydı hasta adıyla oluşturulur ve satış olarak kaydedilir', async ({ page }) => {
  // 1. Login
  // 2. Kasa kaydı modalını aç
  // 3. Hasta seç
  // 4. Tutar gir
  // 5. Kaydet
  // 6. Toast: "İlgili hasta adına satış olarak kaydedildi"
  // 7. Satış listesinde görünmeli
  // 8. Kasa kaydı listesinde görünmeli
});
```

### CASH-002: Kasa Kaydı (Hasta Adı OLMADAN)
```typescript
test('CASH-002: Kasa kaydı hasta adı olmadan oluşturulur', async ({ page }) => {
  // 1. Login
  // 2. Kasa kaydı modalını aç
  // 3. Tutar gir
  // 4. Etiket seç/oluştur
  // 5. Kaydet
  // 6. Toast: "Kasa kaydı oluşturuldu"
  // 7. Kasa kaydı listesinde görünmeli
  // 8. Satış listesinde GÖRÜNMEMELI
});
```

### DEVICE-001: Cihaz Atama (Satış Nedeniyle)
```typescript
test('DEVICE-001: Cihaz atama satış nedeniyle yapılır', async ({ page }) => {
  // 1. Login
  // 2. Hasta detayına git
  // 3. "Cihaz Ata" sekmesine tıkla
  // 4. Cihaz seç
  // 5. Atama nedeni: "Satış"
  // 6. Fiyat bilgileri otomatik dolsun
  // 7. Kaydet
  // 8. Satış listesinde görünmeli
});
```

### PAYMENT-001: Parçalı Ödeme (Tahsilat Modalı)
```typescript
test('PAYMENT-001: Parçalı ödeme tahsilat modalıyla yapılır', async ({ page }) => {
  // 1. Login
  // 2. Satış listesine git
  // 3. "Tahsilat Yap" butonuna tıkla
  // 4. 3,000 TL nakit ekle
  // 5. 2,000 TL kredi kartı ekle
  // 6. 5,000 TL senet ekle
  // 7. Kaydet
  // 8. Kalan tutar: 0 TL
});
```

### PROMISSORY-001: Senet Oluşturma ve Tahsil
```typescript
test('PROMISSORY-001: Senet oluşturulur ve tahsil edilir', async ({ page }) => {
  // 1. Login
  // 2. Satış listesine git
  // 3. "Tahsilat Yap" → Senet ekle
  // 4. Senet Takip ekranına git
  // 5. Senet listede görünmeli
  // 6. "Tahsil Et" butonuna tıkla
  // 7. Tahsil modalı açılır
  // 8. Kaydet
  // 9. Senet durumu: "Tahsil Edildi"
});
```

---

## 🎯 Öncelikli Sorular (Hemen Cevap Gerekli)

1. **SORU 1.1**: Kasa kaydı modalı nerede açılıyor?
2. **SORU 1.2**: "Etiket" ne demek? Örnekler?
3. **SORU 2.1**: Atama nedenleri tam liste?
4. **SORU 3.1**: "Satışlar-Alışlar" sekmesi var mı?
5. **SORU 4.1**: Tahsilat modalı nerede açılıyor?
6. **SORU 5.1**: Senet Takip ekranı nerede?
7. **SORU 6.1**: SGK rapor takibi uygulanmış mı?
8. **SORU 7.1**: Pil satışı nasıl yapılıyor?
9. **SORU 8.1**: Fatura modalı nerede açılıyor?
10. **SORU 9.1**: Tenant seçimi modalı otomatik mı açılıyor?

---

## 📝 Sonraki Adım

Bu soruları cevaplayınca:
1. Test Inventory'yi tamamlayacağım (~150-200 test)
2. Her test için flow + assertion + TestID yazacağım
3. Karmaşık flow'ları birlikte detaylandıracağız

**Şu anda**: 10 yeni kritik soru + 5 yeni test senaryosu eklendi
