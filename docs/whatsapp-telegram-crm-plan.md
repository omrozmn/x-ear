# WhatsApp ve Telegram CRM Ajan Entegrasyon Planı

## Karar Özeti

- `WhatsApp bireysel / Web / Desktop oturumu` QR ile bağlanıp resmi olmayan otomasyon yapmak teknik olarak mümkündür ve bu repo için ilk faz olarak kullanılacaktır.
- `WhatsApp için uzun vadeli yol` Meta WhatsApp Business Platform / Cloud API üzerinden ilerlemektir.
- `Telegram için önerilen yol` kampanya değil, bot tabanlı yönetim ve ajan kontrol entegrasyonudur; mevcut kod tabanında bunun başlangıç izi zaten vardır.
- `Kampanyalar` tarafında SMS sekmesi örnek alınabilir, ama WhatsApp kampanyası SMS gibi serbest toplu gönderim mantığıyla kurgulanmamalıdır.

## WhatsApp QR Yaklaşımı

OpenClaw benzeri ürünler genelde şu modele yaslanır:

- kullanıcı QR okutur
- servis bir web oturumu veya bağlı cihaz oturumu açar
- gelen/giden mesajlar headless otomasyon veya reverse-engineered istemci ile yönetilir

Bu yaklaşımın problemleri:

- `hesap ban riski`: resmi olmayan istemci davranışı tespit edilebilir
- `çoklu tenant riski`: aynı altyapıda çok sayıda işletme hesabı tutmak operasyonel olarak kırılgan olur
- `mesaj kaybı riski`: session invalidation, re-auth, device trust, captcha, rate limit
- `uyumluluk riski`: KVKK, sağlık verisi, hasta iletişimi, audit log, açık rıza
- `sürdürülebilirlik riski`: WhatsApp web protokolü değiştikçe entegrasyon kırılır

Sonuç:

- `ilk faz / beta` olarak yapılabilir
- `ürünleşme` için tenant izolasyonu ve risk uyarıları zorunludur

## WhatsApp İçin Uygulanacak Strateji

### Faz 1 Yolu: WhatsApp Web Session Bridge

İlk aşamada uygulanacak model:

- kullanıcı panelden `WhatsApp Beta` ekranına gelir
- sistem QR üretir
- kullanıcı QR okutur
- bağlı session tenant bazlı izole worker içinde tutulur
- gelen mesajlar CRM konuşma tablosuna akar
- AI ajanı cevap üretir
- kullanıcı isterse manuel isterse otomatik cevap gönderir

Bu mod için kurallar:

- `beta / unsupported` etiketi
- tenant başına izole session
- session secret şifreli saklama
- reconnect ve device-lost akışı
- düşük hız limiti
- kampanya için throttle ve günlük sınır

### Faz 2 Yolu: Resmi WhatsApp Business Platform

Bu modelde:

- tenant kendi işletme numarasını bağlar
- onboarding mümkünse `Embedded Signup` ile yapılır
- mesajlar sizin backend üzerinden resmi API ile gider
- CRM ajanı webhook ile gelen mesaja cevap üretir

Artıları:

- audit edilebilir
- ölçeklenebilir
- webhook tabanlı, stabil
- template, opt-in, delivery status yönetilebilir

Eksileri:

- Business doğrulama gerekebilir
- kampanya serbestliği SMS kadar geniş değildir
- konuşma penceresi, template, onay ve politika kısıtları vardır

## Telegram İçin Doğru Ürün Stratejisi

Telegram tarafı daha uygun:

- bot API resmi ve stabil
- webhook / polling kolay
- tenant bazlı bot veya merkezi bot kurulabilir
- AI ajanı ile çift yönlü akış kolaydır

Mevcut repoda zaten başlangıç var:

- `apps/api/utils/telegram.py`
- `apps/api/utils/telegram_inbox.py`
- `apps/api/scripts/telegram_bot_relay.py`
- `apps/api/routers/admin_integrations.py`

Bu yüzden Telegram:

- kampanya kanalı değil
- bot yönetimi ve sistem komut kanalı
- admin/operasyon destek kanalı

olarak konumlanmalıdır.

## İstenen Deneyim Nasıl Sağlanır

### Hedef UX

- kullanıcı `Entegrasyonlar > WhatsApp` veya `Entegrasyonlar > Telegram` ekranına girer
- bağlanma adımını tamamlar
- sistem webhook veya relay kanalı açar
- kullanıcı kendi CRM AI ajanıyla mesajlaşmaya başlar
- gelen konuşmalar `hasta / lead / ticket` ile eşleştirilir

### WhatsApp UX

İlk faz deneyim:

- kullanıcı `Bağlan` der
- QR görünür
- QR okutulur
- birkaç saniye içinde konuşma başlar

İkinci faz:

- resmi API onboarding
- webhook doğrulama
- aynı inbox üzerinden devam

### Telegram UX

Burada iki yol var:

- kullanıcı bottan `/start` gönderir ve tenant ile eşleşir
- veya bot deep link ile tenant bağlanır

İstenirse QR sadece şu amaçla kullanılabilir:

- QR kod aslında `t.me/<bot>?start=<tenant_token>` linkini açar

Bu, Telegram için güvenli ve pratik bir "QR ile başlat" deneyimidir.

## Kampanyalar Tarafında Kritik Karar

### SMS Modeli Şu Anda Mevcut

Kod tabanında hazır iskelet var:

- web ekranı: `apps/web/src/pages/campaigns/SmsPage.tsx`
- web toplu SMS: `apps/web/src/pages/campaigns/BulkSmsTab.tsx`
- admin kampanyaları: `apps/admin/src/pages/admin/AdminCampaignsPage.tsx`
- backend kampanya router: `apps/api/routers/campaigns.py`
- veri modeli: `apps/api/core/models/campaign.py`

### WhatsApp Kampanyası SMS Gibi Yapılmamalı

Şunlar doğrudan kopyalanmamalı:

- serbest toplu text blast
- kullanıcı session’ı üstünden binlerce gönderim
- resmi template / opt-in / limit yapısını bypass eden akış

Bunun yerine:

- kanal türü `sms | whatsapp | telegram_admin | email` olmalı
- `delivery policy` kanal bazlı ayrılmalı
- WhatsApp QR beta için sıkı throttle ve quality guard konmalı
- resmi WhatsApp kanalında template zorunlu akış desteklenmeli

## Önerilen Mimari

### 1. Channel Abstraction

Yeni soyutlama:

- `communication_channels`
- `channel_accounts`
- `conversation_threads`
- `conversation_messages`
- `campaign_dispatch_jobs`

Minimum kanal enum:

- `sms`
- `whatsapp_cloud`
- `whatsapp_session_beta`
- `telegram_admin`

### 2. Conversation Router

Tek servis:

- mesaj gelir
- kanal normalize edilir
- telefon / chat_id üzerinden hasta eşleşir
- AI ajanı context alır
- ajan cevap önerir veya otomatik yanıtlar
- cevap seçilen kanaldan geri gönderilir

### 3. AI Guardrails

Özellikle sağlık verisi için:

- otomatik cevap kategorileri sınırlanmalı
- reçete / teşhis / hukuki taahhüt otomatik verilmemeli
- insan onayı gerektiren aksiyonlar tanımlanmalı
- konuşma logları audit edilebilir olmalı

## Fazlara Bölünmüş Uygulama Planı

### Faz 0: Teknik Temizlik

- mevcut `campaigns` modeline `channel_type` ekle
- `sms_logs` yapısını `message_logs` olacak şekilde genelleştir veya yeni tablo aç
- mevcut SMS ekranlarını kanal bağımsız servis katmanına taşı

### Faz 1: WhatsApp QR Session Beta

- tenant bazlı session worker oluştur
- QR üretme endpoint’i ekle
- QR state polling veya websocket ekle
- inbound message capture ekle
- outbound text send ekle
- session restore / reconnect ekle
- CRM agent routing ekle
- bulk send için düşük limitli beta kampanya desteği ekle

Çıkış kriteri:

- kullanıcı QR ile bağlanır
- konuşmalar CRM’de görünür
- AI ajanı yanıtlayabilir
- seçili segmentlere düşük hacimli WhatsApp gönderimi yapılabilir

### Faz 2: Telegram’ı Bot Yönetimi Olarak Ürünleştir

- admin entegrasyon ekranındaki Telegram config alanını tenant bazlı netleştir
- polling yerine webhook desteği ekle
- `telegram_inbox.json` dosya tabanlı yaklaşımı DB tabanına taşı
- gelen mesajı admin/operator akışına bağla
- AI agent response pipeline kur
- Telegram’ı komut, alarm ve yönetim amaçlı kullan

Çıkış kriteri:

- tenant botunu bağlar
- admin komutları çalışır
- sistem olayları Telegram’a düşer
- bot yönetim kanalı işler

### Faz 3: WhatsApp Resmi Kanal

- Meta app / business setup
- tenant onboarding akışı
- phone number binding
- webhook verification
- inbound message ingestion
- outbound approved-template sending
- 24 saat pencere kuralları

Çıkış kriteri:

- tenant resmi numarasını bağlar
- gelen WhatsApp mesajı CRM konuşmasına düşer
- ajan cevap verir
- template tabanlı kampanya gönderimi yapılır

### Faz 4: Omnichannel Inbox

- tek konuşma listesi
- kanal filtresi
- patient timeline içinde SMS / WhatsApp / Telegram birleşik görünüm
- ajan önerisi, hazır cevap, otomasyon kuralları

### Faz 5: Kampanyalar V2

- mevcut `SMS Yönetimi` ekranını `Mesajlaşma` ekranına dönüştür
- üst seviye sekmeler:
  - `Tekil Mesaj`
  - `Toplu Gönderim`
  - `Otomasyon`
  - `Gelen Kutusu`
- kanal seçici:
  - `SMS`
  - `WhatsApp`
  - `Telegram`

Not:

- WhatsApp sekmesinde serbest toplu gönderim açılmamalı
- yalnızca izinli senaryolar ve template tabanlı akış açılmalı

## Repo Bazlı Somut Değişiklik Sırası

### Backend

1. `apps/api/core/models/campaign.py`
   - `channel_type`
   - `provider_type`
   - `conversation_window_expires_at`
   - `template_name`

2. `apps/api/routers/campaigns.py`
   - SMS’e gömülü logic çıkarılmalı
   - `dispatch_campaign(channel, provider, recipients, content)` servis çağrılmalı

3. Yeni router’lar
   - `apps/api/routers/telegram_messages.py`
   - `apps/api/routers/whatsapp_messages.py`
   - `apps/api/routers/whatsapp_sessions.py`
   - `apps/api/routers/conversations.py`

4. Yeni servisler
   - `apps/api/services/messaging/telegram_service.py`
   - `apps/api/services/messaging/whatsapp_cloud_service.py`
   - `apps/api/services/messaging/whatsapp_session_service.py`
   - `apps/api/services/messaging/conversation_service.py`
   - `apps/api/services/messaging/agent_router.py`

### Frontend

1. `apps/web/src/pages/campaigns/SmsPage.tsx`
   - ekran adı `Mesajlaşma`
   - kanal seçici eklenecek

2. `apps/web/src/pages/campaigns/BulkSmsTab.tsx`
   - kanal bağımsız `BulkCampaignTab` bileşenine evrilecek
   - kanal bazlı validation alacak

3. Yeni sayfalar
   - `apps/web/src/pages/messages/InboxPage.tsx`
   - `apps/web/src/pages/messages/ConversationDetailPage.tsx`

4. Admin tarafı
   - `apps/admin/src/pages/admin/AdminCampaignsPage.tsx`
   - tenant bazlı kanal sağlığı, webhook durumu, template durumu

## Ne Yapılmamalı

- WhatsApp Web otomasyonunu ana ürün akışı yapmayın
- tenantları aynı ortak session havuzunda çalıştırmayın
- hastalara bulk blast mantığıyla WhatsApp gönderimi açmayın
- opt-in olmadan tanıtım mesajı atmayın
- mesajlaşma kayıtlarını JSON dosyada tutmayın
- sağlık verisini üçüncü taraf başsız browser worker’larda dolaştırmayın

## Önerilen Nihai Yol

Sıralama şu olmalı:

1. `WhatsApp session beta` kur
2. `Telegram admin bot` kur
3. `Omnichannel inbox` kur
4. `WhatsApp Cloud API` ile resmi bağlantıyı ekle
5. `Kampanyalar` ekranını kanal bazlı hale getir

## Bu Repo İçin Net Sonuç

- `Evet`, kullanıcı QR veya link ile kendi CRM AI ajanıyla hızlıca chatleşmeye başlayabilir.
- `Telegram için` bunu bot yönetimi ve operasyon kanalı olarak kullanmak daha mantıklıdır.
- `WhatsApp için` ilk çıkış QR session beta ile yapılacaktır.
- `Hayır`, WhatsApp kampanyalarını uzun vadede "WhatsApp Desktop’tan toplu SMS atıyormuş gibi" kurgulamak doğru ürün yolu değildir.
