# IP Warm-up & Rate Limit Policy

## 🎯 Amaç

Yeni SMTP IP'sinin Gmail, Outlook, Yahoo tarafından güvenilir sender olarak tanınması için 14 günlük kademeli volume artışı.

## 📊 14 Günlük Warm-up Schedule

| Gün | Günlük Limit | Saatlik Limit | Tenant Limit | İzin Verilen Senaryolar | Notlar |
|-----|--------------|---------------|--------------|-------------------------|--------|
| **1-2** | 50 | 10 | 5 | password_reset, email_verification, user_invite | Sadece kritik transactional |
| **3-4** | 100 | 20 | 10 | password_reset, email_verification, user_invite | Transactional devam |
| **5-6** | 250 | 40 | 25 | + invoice_created | Invoice notification ekle |
| **7-8** | 500 | 80 | 50 | Tüm senaryolar | System error ekle |
| **9-10** | 1000 | 150 | 100 | Tüm senaryolar | Normal operasyon başlangıcı |
| **11-12** | 2000 | 300 | 200 | Tüm senaryolar | - |
| **13-14** | 5000 | 500 | 500 | Tüm senaryolar | - |
| **15+** | 10000 | 1000 | 1000 | Tüm senaryolar | Full production capacity |

## 🚫 Warm-up Kuralları

### Gün 1-2: Ultra Conservative
- **SADECE** transactional email'ler
- **YASAK:** Promotional, bulk, AI-generated
- **Hedef:** Zero bounce, zero complaint
- **Monitoring:** Her email manuel review

### Gün 3-4: Conservative
- Transactional devam
- **YASAK:** Promotional, bulk, AI-generated
- **Hedef:** Bounce rate < 1%

### Gün 5-6: Gradual Expansion
- Invoice notification ekle
- **YASAK:** Promotional, bulk
- **AI email:** Max 5/hour (LOW risk only)
- **Hedef:** Bounce rate < 2%

### Gün 7-8: Normal Operations Start
- Tüm transactional senaryolar aktif
- **AI email:** Max 10/hour (LOW + MEDIUM)
- **YASAK:** Bulk promotional
- **Hedef:** Bounce rate < 3%

### Gün 9-14: Ramp Up
- Kademeli artış
- **AI email:** Max 20/hour (approval required for HIGH)
- Promotional email test edilebilir (küçük gruplar)
- **Hedef:** Bounce rate < 3%, complaint rate < 0.1%

### Gün 15+: Production
- Full capacity
- Tüm özellikler aktif
- **Hedef:** Deliverability rate > 95%

## 📈 Rate Limit Enforcement

### Tenant-Level Limits
```python
# Warm-up phase'e göre dinamik
Phase 1-2:   5 email/hour/tenant
Phase 3-4:   10 email/hour/tenant
Phase 5-6:   25 email/hour/tenant
Phase 7-8:   50 email/hour/tenant
Phase 9-10:  100 email/hour/tenant
Phase 11-12: 200 email/hour/tenant
Phase 13-14: 500 email/hour/tenant
Production:  1000 email/hour/tenant
```

### Global Limits
```python
# Tüm tenantlar toplamı
Phase 1-2:   10 email/hour
Phase 3-4:   20 email/hour
Phase 5-6:   40 email/hour
Phase 7-8:   80 email/hour
Phase 9-10:  150 email/hour
Phase 11-12: 300 email/hour
Phase 13-14: 500 email/hour
Production:  1000 email/hour
```

### Daily Limits
```python
# 24 saatlik toplam
Phase 1-2:   50 email/day
Phase 3-4:   100 email/day
Phase 5-6:   250 email/day
Phase 7-8:   500 email/day
Phase 9-10:  1000 email/day
Phase 11-12: 2000 email/day
Phase 13-14: 5000 email/day
Production:  10000 email/day
```

## 🤖 AI Email Özel Kuralları

### Risk-Based Limits

| Risk Level | Warm-up (Gün 1-8) | Warm-up (Gün 9-14) | Production |
|------------|-------------------|---------------------|------------|
| **LOW** | 5/hour | 10/hour | 50/hour |
| **MEDIUM** | YASAK | 5/hour | 20/hour |
| **HIGH** | YASAK | YASAK + Approval | 10/hour + Approval |
| **CRITICAL** | YASAK | YASAK + Approval | 5/hour + Approval |

### Yasaklanan Senaryolar (Warm-up)

**Gün 1-8:**
- ❌ Promotional emails
- ❌ Bulk campaigns
- ❌ AI-generated content (MEDIUM+ risk)
- ❌ External links
- ❌ Attachments

**Gün 9-14:**
- ❌ Bulk campaigns (>100 recipients)
- ❌ AI-generated HIGH/CRITICAL without approval
- ❌ Suspicious content (spam keywords)

### Human Approval Şartları

**ZORUNLU Approval:**
- HIGH risk AI emails (her zaman)
- CRITICAL risk AI emails (her zaman)
- Bulk campaigns (>100 recipients)
- External links in AI content
- Financial offers
- Urgent action requests

**Approval Süreci:**
1. AI email request → risk classification
2. HIGH/CRITICAL → approval queue
3. Admin review (content, recipient, timing)
4. Approve → send, Reject → log + notify
5. Timeout: 24 hours → auto-reject

## 📊 İzlenecek Metrikler

### Real-time Monitoring

**Critical Alerts (Immediate Action):**
- Bounce rate > 5% over 1 hour → STOP SENDING
- Spam complaint rate > 0.1% over 1 hour → STOP SENDING
- Deliverability rate < 90% over 1 hour → INVESTIGATE

**High Priority Alerts:**
- Bounce rate > 3% over 4 hours
- Spam complaint rate > 0.05% over 4 hours
- Rate limit hit consistently (>80% of limit)

**Medium Priority Alerts:**
- Bounce rate > 2% over 24 hours
- DKIM signature failures
- SPF validation failures

### Daily Review Metrics

**Must Track:**
- Total sent
- Bounce rate (hard vs soft)
- Spam complaint rate
- Deliverability rate
- Average spam score
- DKIM signature rate
- SPF pass rate
- DMARC pass rate

**AI Email Specific:**
- AI email count by risk level
- AI approval rate
- AI rejection rate
- AI email bounce rate
- AI email complaint rate

### Weekly Review Metrics

**Trend Analysis:**
- Deliverability rate trend
- Bounce rate trend
- Complaint rate trend
- Warm-up progress vs plan
- Tenant usage patterns
- High-risk tenant identification

## 🚨 Emergency Procedures

### Bounce Rate Spike (>5%)

**Immediate Actions:**
1. STOP all email sending
2. Check SMTP logs for error patterns
3. Verify DNS records (SPF, DKIM, DMARC)
4. Check blacklist status (mxtoolbox.com)
5. Review recent email content for spam triggers
6. Identify problematic recipients
7. Add to blacklist if hard bounces
8. Resume sending at 50% capacity

### Spam Complaint Spike (>0.1%)

**Immediate Actions:**
1. STOP promotional emails
2. Review complained email content
3. Check spam score of recent emails
4. Verify unsubscribe links working
5. Auto-unsubscribe complainers
6. Identify problematic scenarios/templates
7. Disable high-complaint scenarios
8. Resume after content review

### Blacklist Detection

**Immediate Actions:**
1. STOP all email sending
2. Identify blacklist (Spamhaus, Barracuda, etc.)
3. Check blacklist reason
4. Fix root cause (bounce rate, spam content, etc.)
5. Submit delisting request
6. Wait for delisting confirmation
7. Resume at Phase 1 warm-up (restart)

## 📝 Configuration

### Environment Variables

```bash
# Warm-up Configuration
WARMUP_START_DATE=2025-01-24  # Set on first production email
WARMUP_ENABLED=true
WARMUP_STRICT_MODE=true  # Reject emails exceeding limits

# Rate Limits (Production)
RATE_LIMIT_TENANT_HOURLY=1000
RATE_LIMIT_GLOBAL_HOURLY=1000
RATE_LIMIT_GLOBAL_DAILY=10000

# AI Email Limits
AI_EMAIL_LIMIT_LOW=50
AI_EMAIL_LIMIT_MEDIUM=20
AI_EMAIL_LIMIT_HIGH=10
AI_EMAIL_LIMIT_CRITICAL=5
AI_EMAIL_APPROVAL_REQUIRED=HIGH,CRITICAL

# Monitoring Thresholds
ALERT_BOUNCE_RATE_THRESHOLD=0.05  # 5%
ALERT_COMPLAINT_RATE_THRESHOLD=0.001  # 0.1%
ALERT_DELIVERABILITY_THRESHOLD=0.90  # 90%
```

### Database Tracking

```sql
-- Track warm-up start
INSERT INTO system_config (key, value) VALUES 
('warmup_start_date', '2025-01-24');

-- Track current phase
SELECT 
    DATEDIFF(NOW(), warmup_start_date) + 1 as days_since_start,
    CASE 
        WHEN DATEDIFF(NOW(), warmup_start_date) < 2 THEN 'PHASE_1'
        WHEN DATEDIFF(NOW(), warmup_start_date) < 4 THEN 'PHASE_2'
        -- ... etc
    END as current_phase
FROM system_config WHERE key = 'warmup_start_date';
```

## ✅ Pre-Production Checklist

**Before Starting Warm-up:**
- [ ] SPF DNS record configured and validated
- [ ] DKIM DNS record configured and validated
- [ ] DMARC DNS record configured and validated
- [ ] DKIM private key stored in environment
- [ ] Warm-up start date set in config
- [ ] Rate limit service implemented and tested
- [ ] Bounce handling active
- [ ] Spam filter active
- [ ] Unsubscribe links in templates
- [ ] AI approval workflow active
- [ ] Monitoring alerts configured
- [ ] Admin panel warm-up dashboard working
- [ ] Emergency procedures documented
- [ ] Team trained on warm-up process

**Daily Warm-up Checklist:**
- [ ] Check current phase and limits
- [ ] Review yesterday's metrics
- [ ] Check bounce rate (target: <3%)
- [ ] Check complaint rate (target: <0.1%)
- [ ] Check deliverability rate (target: >95%)
- [ ] Review blacklist status
- [ ] Check DKIM/SPF/DMARC pass rates
- [ ] Review AI email approvals
- [ ] Adjust limits if needed (conservative)
- [ ] Document any issues

---

**CRITICAL:** Bu policy'den sapma yapmak IP blacklist'e yol açar. Warm-up süreci kesintiye uğrarsa, baştan başlanmalıdır.
