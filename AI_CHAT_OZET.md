# AI Chat Özelliği - Hızlı Başlangıç

## ✅ Tamamlanan İşlemler

1. **AI Chat Widget Eklendi** (`AIChatWidget.tsx`)
   - Sağ alt köşede floating chat butonu
   - Minimize/maximize özelliği
   - Oturum bazlı konuşma
   - Türkçe hata mesajları
   - PII/PHI uyarıları

2. **AI Client Oluşturuldu** (`ai.client.ts`)
   - `sendChatMessage()` - Chat mesajı gönderme
   - `getAIStatus()` - AI durumu sorgulama
   - Best practice'lere uygun (apiClient kullanımı)

3. **App.tsx'e Entegre Edildi**
   - Widget tüm sayfalarda görünür
   - AuthProvider içinde çalışır
   - Otomatik session yönetimi

## 🚀 Nasıl Kullanılır?

### 1. Backend'i Başlatın

```bash
cd x-ear/apps/api
python main.py
# veya
uvicorn main:app --reload --port 5003
```

### 2. Frontend'i Başlatın

```bash
cd x-ear/apps/web
pnpm dev
# http://localhost:8080
```

### 3. AI Chat'i Kullanın

1. Sağ alt köşedeki mavi yuvarlak butona tıklayın
2. Mesajınızı yazın (örn: "Bugün kaç randevum var?")
3. Enter'a basın veya gönder butonuna tıklayın
4. AI asistan yanıt verecektir

## ⚙️ Konfigürasyon (Opsiyonel)

AI Layer varsayılan olarak **Phase A (read-only)** modunda çalışır. Bu modda:
- ✅ Sorular sorabilirsiniz
- ✅ Bilgi alabilirsiniz
- ❌ İşlem yapılamaz (güvenlik için)

### Environment Variables

```bash
# .env dosyasına ekleyin (opsiyonel)
AI_PHASE=A                    # A=read_only, B=proposal, C=execution
AI_ENABLED=true               # AI aktif/pasif
AI_MODEL_PROVIDER=local       # Ollama kullanımı
AI_MODEL_ID=qwen2.5-7b-instruct
AI_MODEL_BASE_URL=http://localhost:11434
```

## 🔧 Ollama Kurulumu (Opsiyonel)

AI Layer şu anda **mock mode**'da çalışıyor. Gerçek AI yanıtları için Ollama kurulumu gerekli:

```bash
# macOS
brew install ollama

# Model indirme
ollama pull qwen2.5:7b-instruct

# Ollama başlatma
ollama serve
```

## 📊 Özellikler

### Mevcut
- ✅ Chat widget (floating button)
- ✅ Oturum bazlı konuşma
- ✅ Intent classification
- ✅ PII/PHI maskeleme
- ✅ Türkçe hata mesajları
- ✅ Rate limiting
- ✅ Quota yönetimi
- ✅ Kill switch (acil kapatma)

### Admin Panel
- ✅ AI Metrics Dashboard (zaten mevcut)
- ✅ Latency metrikleri (P50, P95, P99)
- ✅ Hata oranları
- ✅ Alert yönetimi

## 🎯 Örnek Kullanım Senaryoları

```
Kullanıcı: "Bugün kaç randevum var?"
AI: "Bugün 5 randevunuz var. Detayları görmek ister misiniz?"

Kullanıcı: "Son eklenen hastaları göster"
AI: "Son 24 saatte 3 yeni hasta eklendi: ..."

Kullanıcı: "Bu ay kaç satış yaptık?"
AI: "Bu ay toplam 47 satış gerçekleştirildi, toplam tutar: ..."
```

## 🔒 Güvenlik

- **PII/PHI Maskeleme**: Hassas bilgiler otomatik maskelenir
- **Rate Limiting**: 20 istek/dakika/kullanıcı
- **Quota**: 1000 istek/gün/tenant
- **Audit Log**: Tüm işlemler kayıt altında
- **Kill Switch**: Acil durumda AI kapatılabilir

## 📝 Notlar

1. **AI yanıtları doğrulanmalıdır** - Beta özellik
2. **Phase A (read-only)** - Sadece bilgi verir, işlem yapmaz
3. **Ollama opsiyonel** - Mock mode'da da çalışır
4. **Admin panel** - Metrics ve monitoring için

## 🐛 Sorun Giderme

### Widget görünmüyor
- Backend çalışıyor mu? → `http://localhost:5003/health`
- Browser console'da hata var mı?

### "AI service unavailable" hatası
- Backend çalışıyor mu?
- `/api/ai/status` endpoint'i yanıt veriyor mu?

### Yanıt gelmiyor
- Ollama kurulu mu? (opsiyonel)
- Rate limit aşıldı mı?
- Quota doldu mu?

## 📚 Detaylı Dokümantasyon

- **Kullanım Kılavuzu**: `AI_CHAT_KULLANIM.md`
- **Teknik Dokümantasyon**: `x-ear/apps/api/ai/README.md`
- **API Docs**: `http://localhost:5003/docs#/AI%20Chat`

## 🎉 Başarıyla Tamamlandı!

AI Chat özelliği kullanıma hazır. Sağ alt köşedeki mavi butona tıklayarak deneyebilirsiniz!
