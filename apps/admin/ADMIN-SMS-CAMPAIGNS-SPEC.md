# Admin SMS Kampanyaları - Teknik Spesifikasyon

## 🎯 Amaç

Admin panel üzerinden tenant'lara (özellikle kayıt tamamlamamış kullanıcılara) SMS kampanyaları göndermek.

## 📊 Hedef Kitle Segmentasyonu

### 1. Kayıt Tamamlamamış (Priority 1)
```sql
SELECT * FROM tenants 
WHERE status = 'PENDING' 
AND phone IS NOT NULL 
AND created_at > NOW() - INTERVAL '30 days'
```

**Kullanım Senaryosu:**
- Telefon numarası vermiş ama kayıt tamamlamamış
- Tanıtım SMS'i: "X-Ear CRM'e hoş geldiniz! Kaydınızı tamamlayın..."

### 2. Trial Kullanıcılar (Priority 2)
```sql
SELECT * FROM tenants 
WHERE status = 'TRIAL' 
AND subscription_end_date < NOW() + INTERVAL '7 days'
```

**Kullanım Senaryosu:**
- Deneme süresi bitiyor
- Upgrade teşvik: "Deneme süreniz 7 gün içinde bitiyor. %20 indirim..."

### 3. Plan Yok (Priority 3)
```sql
SELECT * FROM tenants 
WHERE (current_plan IS NULL OR current_plan = '') 
AND status NOT IN ('CANCELLED', 'SUSPENDED')
```

**Kullanım Senaryosu:**
- Kayıt olmuş ama plan seçmemiş
- Plan tanıtımı: "İşletmeniz için en uygun planı seçin..."

### 4. Aktif Aboneler (Priority 4)
```sql
SELECT * FROM tenants 
WHERE status = 'ACTIVE' 
AND current_plan IS NOT NULL
```

**Kullanım Senaryosu:**
- Yeni özellik duyuruları
- Güncelleme bildirimleri

## 🏗️ Sayfa Yapısı

### Ana Sayfa: `/admin/campaigns`

```
┌─────────────────────────────────────────────────────────────┐
│  Kampanyalar                                    [+ Yeni]    │
├─────────────────────────────────────────────────────────────┤
│  [Tenant Kampanyaları] [Sistem SMS'leri] [Geçmiş]          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Tenant Kampanyaları Sekmesi:                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Hedef Kitle Seçimi                                  │  │
│  │  ☐ Kayıt Tamamlamamış (PENDING) - 45 kişi           │  │
│  │  ☐ Deneme Sürümü (TRIAL) - 23 kişi                  │  │
│  │  ☐ Plan Yok - 12 kişi                                │  │
│  │  ☐ Aktif Aboneler - 156 kişi                         │  │
│  │                                                       │  │
│  │  Gelişmiş Filtreler:                                 │  │
│  │  Kayıt Tarihi: [Son 30 gün ▼]                       │  │
│  │  Ürün: [Tümü ▼]                                      │  │
│  │  Şehir: [Tümü ▼]                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Mesaj İçeriği:                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Şablon: [Hoşgeldin Mesajı ▼]                        │  │
│  │                                                       │  │
│  │  Merhaba {name},                                     │  │
│  │  X-Ear CRM'e hoş geldiniz! Kaydınızı tamamlayarak   │  │
│  │  işletmenizi dijitalleştirmeye başlayın.            │  │
│  │                                                       │  │
│  │  Karakter: 145/160                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Önizleme: 45 alıcı, ~45 SMS kredisi                       │
│  [İptal] [Önizleme] [Gönder]                               │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Backend API Endpoints

### 1. Hedef Kitle Listesi
```
GET /api/admin/campaigns/audience
Query params:
  - status: pending|trial|active|all
  - plan: null|starter|pro|enterprise
  - date_from: ISO date
  - date_to: ISO date
  - product_code: xear_hearing|xear_dental
  - city: string

Response:
{
  "success": true,
  "data": {
    "segments": [
      {
        "id": "pending",
        "name": "Kayıt Tamamlamamış",
        "count": 45,
        "description": "Telefon vermiş ama kayıt tamamlamamış"
      },
      {
        "id": "trial",
        "name": "Deneme Sürümü",
        "count": 23,
        "description": "Deneme sürümünde olan kullanıcılar"
      }
    ],
    "total": 68
  }
}
```

### 2. Kampanya Oluştur
```
POST /api/admin/campaigns
Body:
{
  "name": "Hoşgeldin Kampanyası",
  "target_audience": {
    "status": ["pending"],
    "plan": [null],
    "date_from": "2026-02-01",
    "date_to": "2026-03-06"
  },
  "message": "Merhaba {name}, X-Ear CRM'e hoş geldiniz!",
  "scheduled_at": null  // null = hemen gönder
}

Response:
{
  "success": true,
  "data": {
    "campaign_id": "camp_123",
    "recipients_count": 45,
    "estimated_cost": 45,
    "status": "scheduled"
  }
}
```

### 3. Kampanya Geçmişi
```
GET /api/admin/campaigns
Response:
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "camp_123",
        "name": "Hoşgeldin Kampanyası",
        "sent_at": "2026-03-06T10:00:00Z",
        "recipients_count": 45,
        "delivered_count": 43,
        "failed_count": 2,
        "status": "completed"
      }
    ]
  }
}
```

## 📝 Mesaj Şablonları

### 1. Kayıt Tamamlamamış
```
Merhaba {name},
X-Ear CRM'e hoş geldiniz! Kaydınızı tamamlayarak işletmenizi dijitalleştirmeye başlayın.
Kayıt: {signup_link}
```

### 2. Deneme Süresi Bitiyor
```
Merhaba {name},
Deneme süreniz {days_left} gün içinde bitiyor. Şimdi abone olun, %20 indirim kazanın!
Planlar: {plans_link}
```

### 3. Plan Seçimi
```
Merhaba {name},
İşletmeniz için en uygun planı seçin. Starter, Pro veya Enterprise.
Planlar: {plans_link}
```

### 4. Yeni Özellik Duyurusu
```
Merhaba {name},
X-Ear CRM'de yeni özellikler! AI analiz, otomatik raporlama ve daha fazlası.
Detaylar: {features_link}
```

## 🎨 Frontend Komponenti

### Dosya Yapısı
```
apps/admin/src/pages/admin/campaigns/
├── CampaignsPage.tsx          # Ana sayfa
├── TenantCampaignsTab.tsx     # Tenant kampanyaları sekmesi
├── SystemSmsTab.tsx           # Sistem SMS'leri sekmesi
├── CampaignHistoryTab.tsx     # Geçmiş sekmesi
├── AudienceSelector.tsx       # Hedef kitle seçici
├── MessageEditor.tsx          # Mesaj editörü
└── CampaignPreview.tsx        # Önizleme modalı
```

## 🔐 Güvenlik

### 1. İzinler
- Sadece `super_admin` kampanya oluşturabilir
- `admin` sadece görüntüleyebilir

### 2. Rate Limiting
- Maksimum 1000 SMS/kampanya
- Maksimum 5 kampanya/gün

### 3. Onay Mekanizması
- 100+ alıcı için onay gerekli
- Önizleme zorunlu

## 📊 Raporlama

### Kampanya Metrikleri
- Gönderilen SMS sayısı
- Teslim edilen SMS sayısı
- Başarısız SMS sayısı
- Tıklama oranı (link varsa)
- Dönüşüm oranı (kayıt tamamlama)

## 🚀 Implementasyon Aşamaları

### Faz 1: Temel Yapı (1-2 gün)
- [ ] Backend: Audience segmentation API
- [ ] Backend: Campaign creation API
- [ ] Frontend: CampaignsPage skeleton
- [ ] Frontend: AudienceSelector component

### Faz 2: Mesaj Editörü (1 gün)
- [ ] Frontend: MessageEditor component
- [ ] Frontend: Template system
- [ ] Frontend: Character counter
- [ ] Frontend: Variable replacement preview

### Faz 3: Gönderim (1 gün)
- [ ] Backend: SMS sending integration
- [ ] Backend: Queue system (Celery/Redis)
- [ ] Frontend: CampaignPreview modal
- [ ] Frontend: Send confirmation

### Faz 4: Geçmiş & Raporlama (1 gün)
- [ ] Backend: Campaign history API
- [ ] Backend: Delivery status tracking
- [ ] Frontend: CampaignHistoryTab
- [ ] Frontend: Metrics dashboard

## 🔄 Web App'den Farklılıklar

| Özellik | Web App (Tenant) | Admin Panel |
|---------|------------------|-------------|
| Hedef Kitle | Hastalar | Tenant'lar |
| Krediler | Tenant SMS kredisi | Admin SMS kredisi |
| Segmentasyon | Hasta durumu, randevu | Tenant status, plan |
| İzinler | Tenant admin | Super admin |
| Otomasyon | Randevu hatırlatma | Kayıt hatırlatma |

## 💡 Sonuç

**Öneri:** Web app'deki SMS modülünü kopyalamak yerine, tenant'lara özel yeni bir kampanya modülü oluşturun. Bu şekilde:
- Daha temiz kod
- Tenant'lara özel segmentasyon
- Admin'e özel özellikler
- Kolay bakım

**Hızlı Başlangıç:** Önce basit bir "Hedef Kitle + Mesaj + Gönder" yapısı ile başlayın, sonra şablonlar ve otomasyon ekleyin.
