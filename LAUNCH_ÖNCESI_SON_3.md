# 🚀 LAUNCH ÖNCESİ SON 3 KRİTİK GÖREV

**Tarih:** 23 Aralık 2025, 18:06  
**Hedef:** Production'a çıkmadan önce mutlaka yapılması gerekenler

---

## 1. 🔐 GÜVENLİK VE KİMLİK DOĞRULAMA

### A. Admin Panel Authentication
- [ ] Admin login JWT token expiry check (şu an varsayılan mı?)
- [ ] Admin refresh token mekanizması test et
- [ ] `/api/admin/auth/me` endpoint var mı, yoksa ekle
- [ ] Admin logout düzgün token temizliyor mu?
- [ ] Admin session timeout ayarları production-ready mi?

### B. Password Security
- [ ] Admin şifre karmaşıklık kuralları (min 8 char, büyük/küçük/rakam?)
- [ ] Şifre değiştirme akışı var mı?
- [ ] Rate limiting admin login endpoint'inde (brute force koruması)
- [ ] Account lockout mekanizması (5 failed attempt sonrası)

### C. CORS ve API Security
- [ ] Production CORS ayarları (sadece allowed origins)
- [ ] API rate limiting production'da aktif
- [ ] SQL injection koruması (parametrized queries)
- [ ] XSS koruması (input sanitization)

**Aksiyonlar:**
```python
# backend/app.py
# 1. JWT expiry ayarla
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# 2. Rate limiting ekle
from flask_limiter import Limiter
limiter = Limiter(app, key_func=get_remote_address)
@admin_bp.route('/auth/login')
@limiter.limit("5 per minute")
def admin_login():
    ...

# 3. Production CORS
if os.getenv('ENV') == 'production':
    CORS(app, origins=['https://admin.xear.com'])
```

---

## 2. 📊 PRODUCTION VERİTABANI VE PERFORMANS

### A. Database Migration & Backup
- [ ] Production PostgreSQL connection string hazır mı?
- [ ] Alembic migrations test edildi mi?
- [ ] Otomatik backup stratejisi var mı? (günlük/haftalık)
- [ ] Database indexes önemli query'ler için eklendi mi?
  - `tenants.subdomain` (UNIQUE INDEX)
  - `users.email` (INDEX)
  - `patients.tc_no` (INDEX)
  - `appointments.scheduled_at` (INDEX)

### B. Environment Variables
- [ ] `.env.production` dosyası hazır
- [ ] SECRET_KEY production için strong random değer
- [ ] DATABASE_URL production PostgreSQL
- [ ] REDIS_URL production Redis
- [ ] S3_BUCKET_NAME production bucket
- [ ] PAYTR_MERCHANT_ID / MERCHANT_KEY production values
- [ ] SMS_API credentials production

**Production .env örneği:**
```bash
ENV=production
SECRET_KEY=<50+ char random string>
DATABASE_URL=postgresql://user:pass@host:5432/xear_prod
REDIS_URL=redis://prod-redis:6379/0
S3_BUCKET_NAME=xear-production
PAYTR_MERCHANT_ID=prod_merchant
PAYTR_MERCHANT_KEY=prod_key
PAYTR_MERCHANT_SALT=prod_salt
ALLOWED_ORIGINS=https://admin.xear.com,https://app.xear.com
```

### C. Performance Optimization
- [ ] Static assets CDN'e yüklendi mi? (CSS, JS, images)
- [ ] Gzip compression aktif
- [ ] Database connection pooling ayarlandı mı?
- [ ] Redis caching strategy hazır
- [ ] Slow query logging aktif (>1s queries)

**Aksiyonlar:**
```python
# SQLAlchemy connection pooling
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'max_overflow': 20,
    'pool_pre_ping': True,
    'pool_recycle': 3600
}

# Gzip
from flask_compress import Compress
Compress(app)
```

---

## 3. 🐛 MONITORING, LOGGING VE ERROR HANDLING

### A. Error Tracking
- [ ] Sentry integration (production error tracking)
- [ ] Structured logging (JSON format)
- [ ] Log rotation ayarlandı (max 100MB, 10 files)
- [ ] Critical errors Slack/Email notification
- [ ] User-facing error messages generic (güvenlik için)

### B. Application Monitoring
- [ ] Health check endpoint (`/api/health`)
- [ ] Metrics endpoint (`/api/metrics`) - Prometheus format?
- [ ] Uptime monitoring (pingdom/uptimerobot)
- [ ] Database connection health check
- [ ] Redis connection health check
- [ ] S3 connection health check

### C. Frontend Error Boundaries
- [ ] React Error Boundary tüm route'larda
- [ ] Frontend error logging (Sentry Browser)
- [ ] Network error retry logic
- [ ] Fallback UI'lar boş/error states için
- [ ] Loading states tüm async işlemlerde

**Aksiyonlar:**
```python
# Sentry
import sentry_sdk
sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    environment='production',
    traces_sample_rate=0.1
)

# Health check
@app.route('/api/health')
def health_check():
    checks = {
        'db': check_db_connection(),
        'redis': check_redis_connection(),
        's3': check_s3_connection()
    }
    return jsonify({
        'status': 'healthy' if all(checks.values()) else 'degraded',
        'checks': checks
    }), 200 if all(checks.values()) else 503
```

```typescript
// Frontend Error Boundary
import { ErrorBoundary } from 'react-error-boundary'
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 0.1
})

// Wrap app
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <App />
</ErrorBoundary>
```

---

## 📋 PRE-LAUNCH CHECKLIST

### Kritik Kontroller (Mutlaka)
- [ ] Tüm admin panel sayfaları production'da veri gösteriyor
- [ ] Login/logout flow çalışıyor
- [ ] Payment flow test edildi (sandbox)
- [ ] Email notifications çalışıyor
- [ ] SMS gönderimi test edildi
- [ ] File upload/download çalışıyor (S3)
- [ ] PDF generation çalışıyor (invoices)
- [ ] Database backups otomatik

### Security Checklist
- [ ] Şifreler hash'lenmiş (bcrypt/scrypt)
- [ ] SQL injection vulnerable yok
- [ ] XSS vulnerable yok
- [ ] CSRF protection aktif
- [ ] HTTPS zorlamalı
- [ ] Sensitive data loglanmıyor

### Performance Checklist  
- [ ] API response time <500ms (ortalama)
- [ ] Frontend load time <3s
- [ ] Database queries optimize
- [ ] Images compressed ve optimized
- [ ] Cache stratejisi aktif

---

## 🚀 DEPLOYMENT STRATEJISI

1. **Staging Deploy** (test.xear.com)
   - Production benzeri environment
   - Full regression test
   - Load testing

2. **Production Deploy**
   - Blue-green deployment (zero downtime)
   - Database migration run
   - Health checks pass
   - Rollback plan hazır

3. **Post-Deploy Monitoring**
   - İlk 24 saat yakın takip
   - Error rate monitoring
   - Performance metrics
   - User feedback

---

## 🎯 SONUÇ

**Bu 3 kritik alan tamamlanmadan production'a ÇIKMA:**

1. ✅ **GÜVENLİK:** JWT, rate limiting, CORS, password rules
2. ✅ **DATABASE:** PostgreSQL, backups, migrations, env vars
3. ✅ **MONITORING:** Sentry, health checks, logging, error handling

**Tahmini süre:** 4-6 saat  
**Öncelik sırası:** Güvenlik → Database → Monitoring

---

İhtiyaç olduğunda bu checklist'i kullan ve her maddeyi tek tek tamamla!
