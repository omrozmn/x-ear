# Implementation Plan: Email Deliverability & Anti-Spam Enhancement

## Overview

This implementation plan adds production-grade deliverability features to the existing SMTP Email Integration system. Each task builds on the existing codebase and includes validation through property-based and integration tests.

**Critical Context:** These are NOT optional features. Without these, the email system WILL fail in production with spam flags and blacklists.

## Tasks

### Phase 1: DNS Authentication (🔴 PRODUCTION BLOCKER)

- [x] 1. Implement SPF DNS validation
  - Install dnspython dependency
  - Create DNSValidationService class
  - Implement validate_spf() method with DNS TXT record lookup
  - Check if server IP is authorized in SPF record
  - Return validation result with fix instructions
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 1.1 Write property test for SPF validation
    - **Property 26: SPF Authorization Check**
    - **Validates: Requirements 1.1, 1.3**

  - [x] 1.2 Integrate SPF validation into SMTP config save
    - Add SPF check in SMTPConfigService.create_or_update_config()
    - Return 400 error if SPF validation fails
    - Log SPF validation results
    - _Requirements: 1.1, 1.2, 1.5_

- [x] 2. Implement DKIM email signing
  - Install dkimpy dependency
  - Create DKIMSigningService class
  - Implement generate_keypair() for 2048-bit RSA keys
  - Implement sign_email() method with DKIM-Signature header
  - Store DKIM private key in DKIM_PRIVATE_KEY environment variable
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 2.1 Write property test for DKIM signature validity
    - **Property 27: DKIM Signature Validity**
    - **Validates: Requirements 2.3, 2.8**

  - [x] 2.2 Integrate DKIM signing into email sending
    - Add DKIM signing in EmailService._send_smtp()
    - Sign headers: From, To, Subject, Date, Message-ID
    - Use selector "default" for DNS record
    - Log warning if DKIM key missing (degraded mode)
    - Update email_log.dkim_signed = True
    - _Requirements: 2.3, 2.4, 2.5, 2.7, 2.8_

- [x] 3. Implement DMARC policy validation
  - Add validate_dmarc() method to DNSValidationService
  - Check DMARC TXT record exists at _dmarc.{domain}
  - Parse DMARC policy (p=quarantine/reject/none)
  - Validate policy format and required fields
  - _Requirements: 3.1, 3.2, 3.3_

  - [x] 3.1 Create DMARC report processing service
    - Create DMARCReportService class
    - Implement process_aggregate_report() for XML parsing
    - Store report data in dmarc_report table
    - Alert when failure rate > 5%
    - _Requirements: 3.4, 3.5, 3.6_

- [x] 4. Add DNS setup instructions to admin panel
  - Create DNS validation UI component
  - Display SPF, DKIM, DMARC record templates
  - Show validation status (pass/fail) for each record
  - Provide copy-to-clipboard for DNS records
  - Show fix instructions for failed validations
  - _Requirements: 1.4, 2.6, 3.2_

### Phase 2: Rate Limiting & Warm-up (🔴 PRODUCTION BLOCKER)

- [x] 5. Implement IP warm-up policy
  - Create RateLimitService class
  - Define WarmupPhase enum with 14-day schedule
  - Implement get_current_warmup_phase() based on first email date
  - Track warmup_start_date in system config or email_log
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 5.1 Write property test for rate limit enforcement
    - **Property 28: Rate Limit Enforcement**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5**

  - [x] 5.2 Implement rate limit counters
    - Add _count_emails_last_hour() method
    - Add _count_emails_last_24h() method
    - Use database queries with created_at filtering
    - Consider Redis for performance (optional)
    - _Requirements: 5.1, 5.2, 5.3, 5.6_

  - [x] 5.3 Integrate rate limiting into email queueing
    - Add rate limit check in EmailService.queue_email()
    - Check tenant hourly limit
    - Check global hourly limit
    - Check global daily limit
    - Return 429 Too Many Requests if exceeded
    - Include Retry-After header in response
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 5.4 Add warm-up phase dashboard to admin panel
    - Display current warm-up phase
    - Show current limits (daily, hourly, tenant)
    - Show days remaining in warm-up
    - Show current usage vs limits
    - _Requirements: 4.7, 5.8_

### Phase 3: Bounce Handling (🔴 PRODUCTION BLOCKER)

- [-] 6. Create bounce tracking database schema
  - Create email_bounce table migration
  - Add columns: id, tenant_id, email_log_id, recipient, bounce_type, bounce_reason, smtp_code, bounce_count, first_bounce_at, last_bounce_at, is_blacklisted, created_at
  - Add indexes on (tenant_id, recipient) and (tenant_id, is_blacklisted)
  - _Requirements: 6.2, 6.3_

  - [x] 6.1 Implement bounce handler service
    - Create BounceHandlerService class
    - Implement process_bounce() method
    - Implement classify_bounce() for hard/soft/block classification
    - Auto-blacklist after 3 hard bounces
    - Update email_log.status = "bounced"
    - _Requirements: 6.1, 6.2, 6.3, 6.6, 6.7_

  - [x] 6.2 Write property test for bounce blacklist
    - **Property 29: Bounce Blacklist Enforcement**
    - **Validates: Requirements 6.3, 6.4, 6.5**

  - [-] 6.3 Integrate bounce handling into email sending
    - Add blacklist check in EmailService.queue_email()
    - Reject if recipient is blacklisted
    - Parse SMTP error codes in send_email_task()
    - Call bounce_handler.process_bounce() on SMTP errors
    - _Requirements: 6.4, 6.5, 6.6, 6.7_

  - [ ] 6.4 Add bounce management UI to admin panel
    - Create bounce list page
    - Display bounce count, type, last bounce date
    - Add filter by bounce type and blacklist status
    - Add manual unblacklist action
    - Show bounce rate alert if > 5%
    - _Requirements: 6.8, 6.9_

### Phase 4: Spam Content Filter (🔴 PRODUCTION BLOCKER)

- [ ] 7. Implement spam keyword filter
  - Create SpamFilterService class
  - Define SPAM_KEYWORDS list (50+ English + Turkish)
  - Implement check_spam_keywords() method
  - Implement check_html_text_ratio() method
  - Implement check_link_density() method
  - _Requirements: 7.1, 7.2, 7.6_

  - [ ] 7.1 Implement spam score calculation
    - Implement analyze_content() method
    - Calculate score based on: keywords, ALL CAPS, punctuation, HTML/text ratio, links
    - Return spam score, risk level, warnings
    - Define score thresholds: <5=LOW, 5-9=MEDIUM, 10-14=HIGH, 15+=CRITICAL
    - _Requirements: 7.3, 7.4_

  - [ ] 7.2 Write property test for spam score calculation
    - **Property 30: Spam Score Calculation**
    - **Validates: Requirements 7.3, 7.4**

  - [ ] 7.3 Integrate spam filter into email sending
    - Add spam filter check in EmailService.send_email_task()
    - Run analysis after template rendering
    - Reject if spam score >= 10
    - Log spam filter rejections
    - Update email_log.spam_score
    - _Requirements: 7.4, 7.5_

  - [ ] 7.4 Add spam score preview to admin panel
    - Add spam score display in test email feature
    - Show warnings and risk level
    - Allow admin override with audit log
    - _Requirements: 7.7, 7.8_

### Phase 5: Unsubscribe Management (🔴 PRODUCTION BLOCKER)

- [-] 8. Create unsubscribe database schema
  - Create email_unsubscribe table migration
  - Add columns: id, tenant_id, recipient, scenario, unsubscribed_at, unsubscribe_token, ip_address, user_agent, created_at
  - Add indexes on (tenant_id, recipient, scenario) and (unsubscribe_token)
  - Add unsubscribe_token, is_promotional columns to email_log
  - _Requirements: 8.2, 8.4, 8.5_

  - [x] 8.1 Implement unsubscribe service
    - Create UnsubscribeService class
    - Implement generate_unsubscribe_link() with cryptographic token
    - Implement process_unsubscribe() method
    - Implement is_unsubscribed() check
    - _Requirements: 8.3, 8.4, 8.5, 8.6_

  - [ ] 8.2 Write property test for unsubscribe honor
    - **Property 31: Unsubscribe Honor**
    - **Validates: Requirements 8.5, 8.6, 8.7**

  - [ ] 8.3 Integrate unsubscribe into email templates
    - Classify scenarios as transactional or promotional
    - Auto-inject unsubscribe link in promotional email footers
    - Generate unique token per email
    - Store token in email_log.unsubscribe_token
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 8.4 Create unsubscribe API endpoint
    - Create POST /api/unsubscribe endpoint (public, no auth)
    - Validate unsubscribe token
    - Store unsubscribe preference
    - Log IP address and user agent
    - Return success page
    - _Requirements: 8.4, 8.6_

  - [ ] 8.5 Add unsubscribe check to email queueing
    - Check unsubscribe list in EmailService.queue_email()
    - Skip email if recipient unsubscribed from scenario
    - Log skipped emails
    - _Requirements: 8.6, 8.7_

  - [ ] 8.6 Add unsubscribe management UI to admin panel
    - Create unsubscribe list page
    - Display recipient, scenario, unsubscribe date
    - Add filter by scenario and date range
    - _Requirements: 8.8_

### Phase 6: AI Email Safety (🔴 PRODUCTION BLOCKER)

- [ ] 9. Implement AI email risk classification
  - Create AIEmailSafetyService class
  - Implement classify_risk_level() method
  - Check for blocked patterns: financial offers, urgent actions, external links, attachments
  - Return risk level: LOW, MEDIUM, HIGH, CRITICAL
  - _Requirements: 9.1, 9.3_

  - [ ] 9.1 Write property test for AI approval gate
    - **Property 32: AI Email Approval Gate**
    - **Validates: Requirements 9.2, 9.7**

  - [ ] 9.2 Implement AI email approval workflow
    - Create email_approval table for pending approvals
    - Implement requires_approval() check
    - Queue HIGH/CRITICAL emails for approval
    - Block sending until approved
    - _Requirements: 9.2, 9.8_

  - [ ] 9.3 Integrate AI safety into Tool API
    - Add AI safety check in tool_api/email_notifications.py
    - Enforce stricter rate limits for AI emails (10/hour during warm-up)
    - Log all AI email requests with action_plan_hash
    - Track AI email metrics separately
    - _Requirements: 9.4, 9.5, 9.6_

  - [ ] 9.4 Add AI email approval UI to admin panel
    - Create approval queue page
    - Display pending AI emails with risk level
    - Show email content preview
    - Add approve/reject actions
    - _Requirements: 9.8_

  - [ ] 9.5 Implement AI email metrics tracking
    - Track AI email send rate, spam score, bounce rate
    - Alert when metrics degrade
    - Auto-disable AI email if metrics bad
    - _Requirements: 9.6, 9.7_

### Phase 7: Deliverability Monitoring

- [ ] 10. Implement deliverability metrics service
  - Create DeliverabilityMetricsService class
  - Calculate sent count, bounce rate, spam complaint rate, deliverability rate
  - Store daily snapshots in deliverability_metrics table
  - _Requirements: 10.1, 10.2, 10.7_

  - [ ] 10.1 Add deliverability alerts
    - Alert when bounce rate > 5% over 1 hour
    - Alert when spam complaint rate > 0.1% over 1 hour
    - Alert when deliverability rate < 95% over 1 hour
    - Send alerts to admin email and Slack
    - _Requirements: 10.3, 10.4, 10.5_

  - [ ] 10.2 Create deliverability dashboard
    - Display current deliverability rate
    - Show bounce rate, spam rate trends
    - Display warm-up progress
    - Show DNS validation status
    - _Requirements: 10.6_

  - [ ] 10.3 Export metrics to monitoring system
    - Add Prometheus metrics endpoint
    - Export: emails_sent_total, emails_bounced_total, emails_spam_total, deliverability_rate
    - Add Grafana dashboard template
    - _Requirements: 10.7_

### Phase 8: Complaint Handling (Phase 2)

- [ ] 11. Create complaint tracking schema
  - Create email_complaint table migration
  - Add columns: id, tenant_id, email_log_id, recipient, complaint_type, feedback_loop_provider, complained_at, created_at
  - _Requirements: 12.3_

  - [ ] 11.1 Implement complaint handler service
    - Create ComplaintHandlerService class
    - Parse FBL reports from Gmail/Outlook/Yahoo
    - Auto-unsubscribe complainers
    - Alert when complaint rate > 0.1%
    - _Requirements: 12.1, 12.2, 12.4, 12.5_

  - [ ] 11.2 Add complaint management UI
    - Display complaint list
    - Show complaint rate trends
    - Identify high-complaint scenarios
    - _Requirements: 12.6, 12.7_

### Phase 9: Final Integration & Testing

- [ ] 12. End-to-end integration testing
  - Test complete flow: SPF check → DKIM sign → rate limit → spam filter → send
  - Test bounce handling: simulate SMTP bounce → verify blacklist
  - Test unsubscribe: click link → verify preference → verify email skipped
  - Test AI approval: submit HIGH risk → verify approval required
  - Test warm-up: verify progressive limits enforced

- [ ] 13. Manual deliverability testing
  - Send test email to Gmail → verify inbox (not spam)
  - Send test email to Outlook → verify inbox
  - Send test email to Yahoo → verify inbox
  - Verify DKIM signature in email headers
  - Verify SPF pass in email headers
  - Verify DMARC pass in email headers
  - Use mail-tester.com to verify spam score < 3

- [ ] 14. Production readiness checklist
  - [ ] SPF DNS record configured
  - [ ] DKIM DNS record configured
  - [ ] DMARC DNS record configured
  - [ ] DKIM private key stored in environment
  - [ ] Warm-up start date initialized
  - [ ] Rate limits configured
  - [ ] Bounce handling active
  - [ ] Spam filter active
  - [ ] Unsubscribe links in templates
  - [ ] AI approval workflow active
  - [ ] Deliverability alerts configured
  - [ ] Admin panel DNS validation working
  - [ ] All property tests passing (100+ iterations each)
  - [ ] All integration tests passing
  - [ ] Manual deliverability tests passing

## Notes

- **CRITICAL**: Tasks 1-9 are production blockers. System CANNOT go live without these.
- Each task must include property-based tests with minimum 100 iterations
- DNS validation must be tested against real DNS servers (not mocked)
- DKIM signing must be tested with actual cryptographic operations (not mocked)
- Rate limiting must be tested with real database queries (not mocked)
- All tests must follow X-Ear CRM engineering rules (ResponseEnvelope, camelCase, tenant isolation)
- Warm-up schedule is non-negotiable - do not skip or shorten
- Spam filter thresholds are based on industry standards - do not relax
- AI email controls are mandatory - do not bypass or disable

## Dependencies

```txt
# Add to requirements.txt
dnspython==2.4.2
dkimpy==1.1.5
cryptography==41.0.7  # Already installed for encryption
```

## Environment Variables

```bash
# Add to .env
DKIM_PRIVATE_KEY=<base64-encoded-private-key>
DKIM_SELECTOR=default
WARMUP_START_DATE=2025-01-24  # Set on first production deployment
RATE_LIMIT_TENANT_HOURLY=100
RATE_LIMIT_GLOBAL_HOURLY=1000
RATE_LIMIT_GLOBAL_DAILY=10000
SPAM_FILTER_THRESHOLD=10
BOUNCE_BLACKLIST_THRESHOLD=3
```
