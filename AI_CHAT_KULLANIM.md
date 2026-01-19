# AI Chat Kullanım Kılavuzu

## Genel Bakış

X-Ear CRM sistemine AI asistan özelliği eklenmiştir. Bu özellik, kullanıcıların doğal dilde sorular sormasına ve sistem üzerinde işlemler yapmasına olanak tanır.

## Özellikler

### ✅ Mevcut Özellikler

1. **Doğal Dil İşleme**: Kullanıcı mesajlarını anlama ve sınıflandırma
2. **Intent Classification**: Kullanıcının ne yapmak istediğini belirleme
3. **PII/PHI Maskeleme**: Hassas bilgilerin otomatik maskelenmesi
4. **Oturum Bazlı Konuşma**: Konuşma geçmişini takip etme
5. **Güvenlik Kontrolleri**: Kill switch, rate limiting, quota yönetimi

### 🔄 Fazlar (Phases)

AI Layer 3 fazda çalışır:

- **Phase A (Read-Only)**: Sadece öneriler, işlem yapılmaz (varsayılan)
- **Phase B (Proposal)**: Öneriler ve onay gerektiren işlemler
- **Phase C (Execution)**: Onaylanmış işlemlerin otomatik yürütülmesi

## Kullanım

### Frontend (Web App)

AI chat widget'ı web uygulamasının sağ alt köşesinde görünür:

1. **Widget'ı Açma**: Sağ alttaki mavi yuvarlak butona tıklayın
2. **Mesaj Gönderme**: Mesajınızı yazın ve Enter'a basın veya gönder butonuna tıklayın
3. **Yanıt Alma**: AI asistan mesajınızı analiz eder ve yanıt verir

#### Örnek Sorular

```
- "Bugün kaç randevum var?"
- "Son eklenen hastaları göster"
- "Bu ay kaç satış yaptık?"
- "Bekleyen ödemeleri listele"
```

### Backend API

AI endpoints `/api/ai/*` altında mevcuttur:

#### 1. Chat Endpoint

```bash
POST /api/ai/chat
Content-Type: application/json

{
  "prompt": "Bugün kaç randevum var?",
  "sessionId": "session_123",
  "context": {
    "conversationHistory": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "chat_abc123",
    "status": "success",
    "intent": {
      "intentType": "query_appointments",
      "confidence": 0.95,
      "entities": {
        "timeframe": "today"
      }
    },
    "response": "Bugün 5 randevunuz var.",
    "processingTimeMs": 234.5,
    "piiDetected": false,
    "phiDetected": false
  }
}
```

#### 2. Status Endpoint

```bash
GET /api/ai/status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "available": true,
    "phase": {
      "currentPhase": "A",
      "phaseName": "read_only",
      "executionAllowed": false,
      "proposalAllowed": false
    },
    "killSwitch": {
      "globalActive": false,
      "tenantActive": false,
      "capabilitiesDisabled": []
    },
    "model": {
      "provider": "local",
      "modelId": "qwen2.5-7b-instruct",
      "available": true
    }
  }
}
```

## Konfigürasyon

### Environment Variables

AI Layer aşağıdaki environment variable'lar ile yapılandırılır:

```bash
# AI Fazı (A=read_only, B=proposal, C=execution)
AI_PHASE=A

# AI Aktif/Pasif
AI_ENABLED=true

# Model Konfigürasyonu
AI_MODEL_PROVIDER=local
AI_MODEL_ID=qwen2.5-7b-instruct
AI_MODEL_BASE_URL=http://localhost:11434
AI_MODEL_TIMEOUT_SECONDS=30

# Rate Limiting
AI_RATE_LIMIT_PER_MINUTE=60
AI_RATE_LIMIT_PER_USER_PER_MINUTE=20

# Quota
AI_QUOTA_DEFAULT=1000
```

### Ollama Kurulumu (Local Model)

AI Layer varsayılan olarak Ollama ile çalışır:

1. **Ollama Kurulumu**:
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Model İndirme**:
   ```bash
   ollama pull qwen2.5:7b-instruct
   ```

3. **Ollama Başlatma**:
   ```bash
   ollama serve
   ```

4. **Test**:
   ```bash
   curl http://localhost:11434/api/tags
   ```

## Güvenlik

### Kill Switch

AI Layer'ı acil durumda kapatmak için:

```bash
POST /api/ai/admin/kill-switch
Content-Type: application/json

{
  "action": "activate",
  "scope": "global",
  "reason": "Acil durum - yüksek hata oranı"
}
```

### Rate Limiting

- **Tenant bazında**: 60 istek/dakika
- **Kullanıcı bazında**: 20 istek/dakika

### Quota Yönetimi

Her tenant için günlük quota limiti vardır (varsayılan: 1000 istek/gün).

## Monitoring

### Metrics Dashboard (Admin Panel)

Admin panelinde AI metrics dashboard mevcuttur:

- **Latency Metrikleri**: P50, P95, P99
- **Hata Oranları**: Error rate, timeout rate
- **Approval Metrikleri**: Onay süreleri, red oranları
- **Alertler**: SLA ihlalleri, eşik aşımları

### Metrics API

```bash
GET /api/ai/metrics?window_minutes=60
```

### Alerts API

```bash
GET /api/ai/alerts?severity=critical&acknowledged=false
```

## Troubleshooting

### AI Widget Görünmüyor

1. Backend'in çalıştığından emin olun: `http://localhost:5003/health`
2. AI'ın aktif olduğunu kontrol edin: `http://localhost:5003/api/ai/status`
3. Browser console'da hata var mı kontrol edin

### "AI service unavailable" Hatası

1. Ollama çalışıyor mu kontrol edin: `curl http://localhost:11434/api/tags`
2. `AI_ENABLED=true` olduğundan emin olun
3. Kill switch aktif mi kontrol edin: `/api/ai/status`

### "Rate limit exceeded" Hatası

Rate limit aşıldı. Birkaç dakika bekleyin veya rate limit ayarlarını artırın.

### "Quota exceeded" Hatası

Günlük quota doldu. Yarın tekrar deneyin veya admin'den quota artışı isteyin.

## Geliştirme

### Yeni Intent Ekleme

1. `x-ear/apps/api/ai/agents/intent_refiner.py` dosyasına yeni intent tipi ekleyin
2. `x-ear/apps/api/ai/prompts/` altına yeni prompt template ekleyin
3. Intent için tool mapping ekleyin

### Yeni Tool Ekleme

1. `x-ear/apps/api/ai/tools/` altına yeni tool dosyası oluşturun
2. Tool'u allowlist'e ekleyin: `x-ear/apps/api/ai/tools/allowlist.py`
3. Risk seviyesini belirleyin (low, medium, high, critical)

## Roadmap

### Yakında Gelecek Özellikler

- [ ] Sesli komut desteği
- [ ] Çoklu dil desteği (İngilizce, Almanca)
- [ ] Özel shortcut'lar
- [ ] Akıllı öneriler (proaktif)
- [ ] Raporlama ve analitik
- [ ] Workflow otomasyonu

### Phase B ve C Özellikleri

- [ ] Otomatik randevu oluşturma
- [ ] Toplu işlemler
- [ ] Veri düzeltme önerileri
- [ ] Akıllı fiyatlandırma önerileri

## Destek

Sorularınız için:
- **Teknik Dokümantasyon**: `x-ear/apps/api/ai/README.md`
- **API Dokümantasyonu**: `http://localhost:5003/docs#/AI%20Chat`
- **Metrics Dashboard**: Admin Panel → AI Metrics

## Güvenlik Notları

⚠️ **ÖNEMLİ**:
- AI yanıtları her zaman doğrulanmalıdır
- Kritik işlemler için manuel onay gereklidir
- PII/PHI verileri otomatik maskelenir
- Tüm AI işlemleri audit log'a kaydedilir
- Production'da Phase A (read-only) kullanılmalıdır

## Lisans ve Uyumluluk

- **Model**: Qwen 2.5 (Apache 2.0 License)
- **KVKK Uyumlu**: PII/PHI maskeleme aktif
- **GDPR Uyumlu**: Veri minimizasyonu ve şeffaflık
- **Audit Trail**: Tüm işlemler kayıt altında
