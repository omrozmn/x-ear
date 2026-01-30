# Örnek Belgeler Klasörü

Bu klasör, kullanıcılara gösterilecek örnek belgeleri içerir.

## Yapı

```
documents/
├── sms/                          # SMS entegrasyonu belgeleri
│   ├── contract-example.pdf      # Boş sözleşme şablonu
│   ├── contract-filled.pdf       # Dolu sözleşme örneği
│   ├── id-card-example.jpg       # Kimlik fotokopisi örneği
│   ├── residence-example.pdf     # İkametgah belgesi örneği
│   ├── tax-plate-example.pdf     # Vergi levhası örneği
│   ├── activity-cert-example.pdf # Faaliyet belgesi örneği
│   └── signature-example.pdf     # İmza sirküleri örneği
└── pos/                          # POS entegrasyonu belgeleri (gelecek)
```

## Yönetim

### Admin Panel'den Yönetim

Örnek belgeleri admin panel'den yönetebilirsiniz:

1. Admin Panel'e giriş yapın
2. Sol menüden **"Örnek Belgeler"** seçeneğine tıklayın
3. Her belge için:
   - **Durum**: Dosyanın mevcut olup olmadığını gösterir
   - **Önizle**: Mevcut dosyayı görüntüleyin
   - **İndir**: Dosyayı indirin
   - **Yükle**: Yeni dosya yükleyin veya mevcut dosyayı değiştirin

### Manuel Yönetim

Alternatif olarak, dosyaları manuel olarak da yönetebilirsiniz:

1. Belgeyi `x-ear/apps/web/public/documents/sms/` klasörüne kopyalayın
2. Dosya adını aşağıdaki tablodaki isimlerle eşleştirin
3. Değişiklikleri commit edin

### Dosya Adları

| Belge Türü | Dosya Adı | Format |
|------------|-----------|--------|
| Boş Sözleşme Şablonu | `contract-example.pdf` | PDF |
| Dolu Sözleşme Örneği | `contract-filled.pdf` | PDF |
| Kimlik Fotokopisi | `id-card-example.jpg` | JPG/PNG |
| İkametgah Belgesi | `residence-example.pdf` | PDF |
| Vergi Levhası | `tax-plate-example.pdf` | PDF |
| Faaliyet Belgesi | `activity-cert-example.pdf` | PDF |
| İmza Sirküleri | `signature-example.pdf` | PDF |

## Kullanım

### Frontend'de Kullanım

```typescript
// Örnek sözleşmeyi göster
<iframe src="/documents/sms/contract-example.pdf" />

// Dolu örnek göster
<iframe src="/documents/sms/contract-filled.pdf" />
```

### Kullanıcı Tarafında Görüntüleme

Kullanıcılar örnek belgeleri şu konumlardan görüntüleyebilir:

1. **Web App**: Ayarlar > Entegrasyonlar > SMS Entegrasyonu > Başvuru Belgeleri
2. Her belge için "Örnek Sözleşme" butonu ile örnek dosyayı görüntüleyebilirler

## Notlar

- Bu klasördeki dosyalar public'tir (herkes erişebilir)
- Hassas bilgi içermemelidir
- Build sırasında otomatik kopyalanır
- CDN'e deploy edilebilir
- Admin panel'den yüklenen dosyalar otomatik olarak bu klasöre kaydedilir
