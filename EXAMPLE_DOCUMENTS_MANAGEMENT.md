# Örnek Belgeler Yönetim Sistemi

## Genel Bakış

SMS entegrasyonu başvuru sürecinde kullanıcılara gösterilecek örnek belgelerin (boş sözleşme şablonu, dolu sözleşme örneği, kimlik fotokopisi örneği vb.) yönetimi için admin panel arayüzü oluşturuldu.

## Dosya Konumları

### Örnek Belgeler (Public Static Files)
```
x-ear/apps/web/public/documents/sms/
├── contract-example.pdf      # Boş sözleşme şablonu
├── contract-filled.pdf       # Dolu sözleşme örneği
├── id-card-example.jpg       # Kimlik fotokopisi örneği
├── residence-example.pdf     # İkametgah belgesi örneği
├── tax-plate-example.pdf     # Vergi levhası örneği
├── activity-cert-example.pdf # Faaliyet belgesi örneği
└── signature-example.pdf     # İmza sirküleri örneği
```

### Tenant Belgeleri (Private Storage)
```
storage/sms_documents/{tenant_id}/
├── contract.pdf
├── id_card.jpg
├── residence.pdf
├── tax_plate.pdf
├── activity_cert.pdf
└── signature_circular.pdf
```

## Yeni Eklenen Dosyalar

### 1. Admin Panel Sayfası
**Dosya**: `x-ear/apps/admin/src/pages/admin/ExampleDocuments.tsx`

**Özellikler**:
- Tüm örnek belgelerin listesi
- Her belge için durum göstergesi (Mevcut/Eksik)
- Önizleme özelliği
- İndirme özelliği
- Yükleme özelliği
- Dosya adı ve açıklama bilgileri

**Bileşenler**:
- `ExampleDocuments`: Ana sayfa bileşeni
- `ExampleDocumentRow`: Her belge satırı için alt bileşen
- Preview modal (Radix UI Dialog)

### 2. Route Tanımı
**Dosya**: `x-ear/apps/admin/src/routes/example-documents.tsx`

TanStack Router ile route tanımı.

### 3. Sidebar Güncellemesi
**Dosya**: `x-ear/apps/admin/src/components/admin/AdminSidebar.tsx`

"Örnek Belgeler" menü öğesi eklendi (Dosyalar menüsünden sonra).

### 4. README Güncellemesi
**Dosya**: `x-ear/apps/web/public/documents/README.md`

Admin panel yönetim talimatları eklendi.

## Kullanım Akışı

### Admin Tarafı

1. **Admin Panel'e Giriş**
   - URL: `http://localhost:8082`
   - Credentials: `admin@x-ear.com` / `Admin123!`

2. **Örnek Belgeler Sayfasına Git**
   - Sol menüden "Örnek Belgeler" seçeneğine tıkla

3. **Belge Yönetimi**
   - **Durum Kontrolü**: Her belge için "Mevcut" veya "Eksik" durumu görüntülenir
   - **Önizleme**: Mevcut belgeleri önizle (Eye icon)
   - **İndirme**: Mevcut belgeleri indir (Download icon)
   - **Yükleme**: Yeni belge yükle veya mevcut belgeyi değiştir (Upload icon)

### Kullanıcı Tarafı

1. **Web App'e Giriş**
   - URL: `http://localhost:8080`

2. **SMS Entegrasyonu Sayfasına Git**
   - Ayarlar > Entegrasyonlar > SMS Entegrasyonu

3. **Örnek Belgeleri Görüntüle**
   - "Örnek Sözleşme" butonuna tıkla (mavi info box içinde)
   - Belge önizlemesi modal'da açılır

## Teknik Detaylar

### Dosya Kontrolü
```typescript
const checkFileExists = async (path: string): Promise<boolean> => {
    try {
        const response = await fetch(path, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
};
```

### Dosya Yükleme (Şu Anki Durum)
Şu anda dosya yükleme manuel olarak yapılmaktadır:
1. Admin panel'de "Yükle" butonuna tıkla
2. Toast mesajı ile dosya konumu gösterilir
3. Dosyayı manuel olarak belirtilen konuma kopyala

### Gelecek Geliştirmeler (TODO)

1. **Backend Endpoint Eklenmeli**
   ```python
   @router.post("/api/admin/example-documents/upload")
   async def upload_example_document(
       document_type: str,
       file: UploadFile
   ):
       # Save to public/documents/sms/
       # Return success response
   ```

2. **Otomatik Dosya Yükleme**
   - Admin panel'den yüklenen dosyalar otomatik olarak public klasörüne kaydedilmeli
   - Dosya adı validasyonu yapılmalı
   - Dosya boyutu kontrolü eklenmeli

3. **Versiyonlama**
   - Eski dosyalar yedeklenmeli
   - Değişiklik geçmişi tutulmalı

4. **CDN Entegrasyonu**
   - Production'da dosyalar CDN'e yüklenebilir
   - Daha hızlı erişim için

## Güvenlik Notları

- Örnek belgeler public'tir (herkes erişebilir)
- Hassas bilgi içermemelidir
- Sadece örnek/şablon dosyalar olmalıdır
- Gerçek müşteri bilgileri içermemelidir

## Test Senaryoları

### 1. Admin Panel Erişimi
- [ ] Admin panel'e giriş yapılabiliyor
- [ ] "Örnek Belgeler" menüsü görünüyor
- [ ] Sayfa yükleniyor

### 2. Belge Listesi
- [ ] Tüm 7 belge listeleniyor
- [ ] Durum göstergeleri doğru çalışıyor
- [ ] Dosya adları ve açıklamalar görünüyor

### 3. Önizleme
- [ ] Mevcut belgeler önizlenebiliyor
- [ ] Modal açılıyor ve kapanıyor
- [ ] PDF/JPG dosyalar doğru görüntüleniyor

### 4. İndirme
- [ ] Dosyalar indirilebiliyor
- [ ] Doğru dosya adıyla indiriliyor

### 5. Yükleme
- [ ] Dosya seçme dialog'u açılıyor
- [ ] Toast mesajı gösteriliyor
- [ ] Dosya formatı kontrolü çalışıyor

### 6. Kullanıcı Tarafı
- [ ] Örnek sözleşme butonu görünüyor
- [ ] Modal açılıyor
- [ ] Sözleşme önizlemesi çalışıyor

## İlgili Dosyalar

### Frontend (Admin)
- `x-ear/apps/admin/src/pages/admin/ExampleDocuments.tsx`
- `x-ear/apps/admin/src/routes/example-documents.tsx`
- `x-ear/apps/admin/src/components/admin/AdminSidebar.tsx`

### Frontend (Web)
- `x-ear/apps/web/src/pages/settings/Integration.tsx`
- `x-ear/apps/web/public/documents/README.md`
- `x-ear/apps/web/public/documents/sms/` (örnek dosyalar)

### Backend (Gelecek)
- `x-ear/apps/api/routers/admin_example_documents.py` (TODO)

## Sonuç

Örnek belgeler için admin panel arayüzü başarıyla oluşturuldu. Admin kullanıcılar artık:
- Tüm örnek belgeleri tek bir yerden görebilir
- Belge durumlarını kontrol edebilir
- Belgeleri önizleyebilir ve indirebilir
- Yeni belgeler yükleyebilir (manuel olarak)

Gelecekte backend endpoint eklenerek otomatik dosya yükleme özelliği eklenebilir.
