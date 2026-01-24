# Email Deliverability - Quick Start Guide

## 🚀 Hızlı Başlangıç (5 Dakika)

### 1. Spec Dosyalarını İncele

```bash
cd x-ear/.kiro/specs/email-deliverability/

# Özet rapor (önce bunu oku)
cat DELIVERABILITY_AUDIT_SUMMARY.md

# Detaylı requirements
cat requirements.md

# Teknik tasarım
cat design.md

# Task listesi (implementation için)
cat tasks.md

# Warm-up policy
cat WARMUP_POLICY.md
```

### 2. DNS Kayıtlarını Hazırla (Paralel Çalışabilir)

**DKIM Key Pair Oluştur:**
```bash
# Backend sunucuda çalıştır
openssl genrsa -out dkim_private.pem 2048
openssl rsa -in dkim_private.pem -pubout -out dkim_public.pem

# Public key'i DNS formatına çevir
cat dkim_public.pem | grep -v "BEGIN\|END" | tr -d '\n'
# Çıktıyı kopyala, DNS'e ekleyeceksin
```

**DNS Kayıtlarını Ekle:**
```bash
# 1. SPF Record (TXT)
x-ear.com. IN TXT "v=spf1 ip4:YOUR_SERVER_IP ~all"

# 2. DKIM Record (TXT)
default._domainkey.x-ear.com. IN TXT "v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY"

# 3. DMARC Record (TXT)
_dmarc.x-ear.com. IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@x-ear.com; pct=100; adkim=s; aspf=s"
```

**DNS Doğrulama:**
```bash
# SPF check
dig +short TXT x-ear.com | grep spf1

# DKIM check
dig +short TXT default._domainkey.x-ear.com | grep DKIM1

# DMARC check
dig +short TXT _dmarc.x-ear.com | grep DMARC1
```

### 3. Environment Variables Ekle

```bash
# .env dosyasına ekle
DKIM_PRIVATE_KEY="$(cat dkim_private.pem | base64 -w 0)"
DKIM_SELECTOR=default
WARMUP_START_DATE=2025-01-24
WARMUP_ENABLED=true
RATE_LIMIT_TENANT_HOURLY=100
RATE_LIMIT_GLOBAL_HOURLY=1000
RATE_LIMIT_GLOBAL_DAILY=10000
```

### 4. Dependencies Yükle

```bash
cd x-ear/apps/api/

# requirements.txt'e ekle
echo "dnspython==2.4.2" >> requirements.txt
echo "dkimpy==1.1.5" >> requirements.txt

# Yükle
pip install -r requirements.txt
```

### 5. Task Listesini Aç ve Başla

```bash
# Kiro'da aç
code x-ear/.kiro/specs/email-deliverability/tasks.md

# Veya Kiro'ya söyle:
# "email-deliverability spec'ini execute et, task 1'den başla"
```

## 📋 Implementation Sırası

### Week 1: DNS Authentication + Rate Limiting (🔴 Critical)

**Day 1-2: SPF Validation**
- Task 1: DNSValidationService.validate_spf()
- Task 1.1: Property test
- Task 1.2: SMTP config integration
- **Test:** `dig TXT x-ear.com` → SPF record görünmeli

**Day 3-4: DKIM Signing**
- Task 2: DKIMSigningService
- Task 2.1: Property test
- Task 2.2: Email service integration
- **Test:** Email header'da `DKIM-Signature:` görünmeli

**Day 5: DMARC + Rate Limiting**
- Task 3: DMARC validation
- Task 5: RateLimitService
- Task 5.1-5.3: Rate limit integration
- **Test:** Burst send → 429 response

### Week 2: Bounce + Spam + Unsubscribe (🔴 Critical)

**Day 6-7: Bounce Handling**
- Task 6: email_bounce table migration
- Task 6.1: BounceHandlerService
- Task 6.2-6.3: Integration + tests
- **Test:** Simulate bounce → verify blacklist

**Day 8-9: Spam Filter**
- Task 7: SpamFilterService
- Task 7.1-7.3: Spam score + integration
- **Test:** Spam content → verify rejection

**Day 10: Unsubscribe**
- Task 8: email_unsubscribe table
- Task 8.1-8.5: UnsubscribeService + integration
- **Test:** Click unsubscribe → verify skip

### Week 3: AI Safety + Testing (🔴 Critical)

**Day 11-12: AI Email Safety**
- Task 9: AIEmailSafetyService
- Task 9.1-9.5: Risk classification + approval
- **Test:** HIGH risk → verify approval required

**Day 13-14: Integration Testing**
- Task 12: End-to-end tests
- Task 13: Manual deliverability tests
- **Test:** Send to Gmail/Outlook/Yahoo → verify inbox

**Day 15-16: Production Deployment**
- Task 14: Production readiness checklist
- Deploy with warm-up start date
- Monitor metrics daily

## 🎯 Success Criteria

### Technical Validation

**DNS Records:**
```bash
# SPF pass
dig +short TXT x-ear.com | grep "v=spf1"

# DKIM pass
dig +short TXT default._domainkey.x-ear.com | grep "v=DKIM1"

# DMARC pass
dig +short TXT _dmarc.x-ear.com | grep "v=DMARC1"
```

**Email Headers:**
```
Authentication-Results: mx.google.com;
       dkim=pass header.i=@x-ear.com header.s=default;
       spf=pass smtp.mailfrom=x-ear.com;
       dmarc=pass (p=QUARANTINE sp=QUARANTINE dis=NONE) header.from=x-ear.com
```

**mail-tester.com Score:**
- Target: 8+/10
- Must pass: SPF, DKIM, DMARC
- Must pass: No spam keywords
- Must pass: Unsubscribe link present

### Operational Validation

**Deliverability Rates:**
- Gmail inbox: 95%+
- Outlook inbox: 95%+
- Yahoo inbox: 90%+
- Bounce rate: < 3%
- Spam complaint rate: < 0.1%

**Monitoring:**
- Bounce rate alerts working
- Spam complaint alerts working
- Rate limit enforcement working
- Warm-up phase tracking working

## 🚨 Common Issues & Solutions

### Issue 1: SPF Validation Fails

**Symptom:** `dig TXT x-ear.com` returns no SPF record

**Solution:**
```bash
# Check DNS propagation (can take 24-48 hours)
dig @8.8.8.8 TXT x-ear.com

# Verify record format
# Correct: v=spf1 ip4:1.2.3.4 ~all
# Wrong: v=spf1 ip4:1.2.3.4 -all  (too strict)
```

### Issue 2: DKIM Signature Invalid

**Symptom:** Email headers show `dkim=fail`

**Solution:**
```bash
# Verify private key loaded correctly
echo $DKIM_PRIVATE_KEY | base64 -d | openssl rsa -check

# Verify public key in DNS matches
dig +short TXT default._domainkey.x-ear.com

# Check selector matches
# Code: selector=b'default'
# DNS: default._domainkey.x-ear.com
```

### Issue 3: Rate Limit Not Enforced

**Symptom:** Can send more emails than limit

**Solution:**
```python
# Check warm-up start date set
SELECT value FROM system_config WHERE key = 'warmup_start_date';

# Check rate limit service called
# Add logging in EmailService.queue_email():
logger.info(f"Rate limit check: {allowed}, {message}")

# Verify database queries working
SELECT COUNT(*) FROM email_log 
WHERE created_at >= NOW() - INTERVAL '1 hour';
```

### Issue 4: Emails Going to Spam

**Symptom:** Gmail/Outlook marks emails as spam

**Checklist:**
1. ✅ SPF pass? Check email headers
2. ✅ DKIM pass? Check email headers
3. ✅ DMARC pass? Check email headers
4. ✅ Spam score < 10? Check spam filter logs
5. ✅ Unsubscribe link present? Check email footer
6. ✅ Warm-up phase respected? Check current limits
7. ✅ Bounce rate < 5%? Check bounce dashboard
8. ✅ No spam keywords? Check content

**Debug:**
```bash
# Send test email to mail-tester.com
# Get detailed spam score report
# Fix issues one by one
```

### Issue 5: Bounce Rate High

**Symptom:** Bounce rate > 5%

**Solution:**
```sql
-- Identify bounce patterns
SELECT bounce_type, COUNT(*) 
FROM email_bounce 
GROUP BY bounce_type;

-- Check hard bounces
SELECT recipient, bounce_count, bounce_reason
FROM email_bounce 
WHERE bounce_type = 'hard' 
ORDER BY bounce_count DESC;

-- Verify blacklist working
SELECT COUNT(*) FROM email_bounce WHERE is_blacklisted = true;
```

## 📞 Support & Resources

### Documentation
- Requirements: `requirements.md`
- Design: `design.md`
- Tasks: `tasks.md`
- Warm-up Policy: `WARMUP_POLICY.md`
- Audit Summary: `DELIVERABILITY_AUDIT_SUMMARY.md`

### Testing Tools
- **mail-tester.com** - Spam score analysis
- **mxtoolbox.com** - Blacklist check, DNS validation
- **dmarcian.com** - DMARC report analysis
- **dkimvalidator.com** - DKIM signature validation

### Monitoring
- Bounce rate dashboard: `/admin/integrations/smtp/bounces`
- Deliverability metrics: `/admin/integrations/smtp/metrics`
- Warm-up progress: `/admin/integrations/smtp/warmup`
- DNS validation: `/admin/integrations/smtp/dns-validation`

### Emergency Contacts
- Bounce rate spike (>5%): STOP sending, investigate
- Spam complaints spike (>0.1%): STOP promotional, review content
- Blacklist detected: STOP all, submit delisting
- DKIM failures: Check private key, verify DNS

## ✅ Pre-Production Checklist

**Before Going Live:**
- [ ] All 14 tasks completed
- [ ] All property tests passing (100+ iterations each)
- [ ] All integration tests passing
- [ ] DNS records validated (SPF, DKIM, DMARC)
- [ ] DKIM private key stored securely
- [ ] Warm-up start date set
- [ ] Rate limits configured
- [ ] Bounce handling active
- [ ] Spam filter active
- [ ] Unsubscribe links working
- [ ] AI approval workflow active
- [ ] Monitoring alerts configured
- [ ] Admin panel dashboards working
- [ ] Manual deliverability tests passed (Gmail, Outlook, Yahoo)
- [ ] mail-tester.com score >= 8/10
- [ ] Team trained on warm-up process
- [ ] Emergency procedures documented

**First Week Monitoring:**
- [ ] Daily bounce rate check (target: <3%)
- [ ] Daily complaint rate check (target: <0.1%)
- [ ] Daily deliverability rate check (target: >95%)
- [ ] Daily blacklist check (mxtoolbox.com)
- [ ] Daily DKIM/SPF/DMARC pass rate check
- [ ] Daily warm-up phase verification
- [ ] Daily rate limit usage review

---

**Ready to start?** Open `tasks.md` and execute Task 1!
