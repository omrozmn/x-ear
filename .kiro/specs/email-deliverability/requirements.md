# Requirements Document: Email Deliverability & Anti-Spam Enhancement

## Introduction

This document specifies requirements for enhancing the SMTP Email Integration system with production-grade deliverability features. The system must prevent emails from being marked as spam/junk by Gmail, Outlook, and Yahoo, while maintaining domain and IP reputation through proper authentication, rate limiting, content filtering, and bounce handling.

**Critical Context:** This is NOT a "nice-to-have" feature set. These are mandatory requirements for production email systems. Without these, emails WILL be marked as spam, IPs WILL be blacklisted, and the system WILL fail in production.

## Glossary

- **SPF (Sender Policy Framework)**: DNS record authorizing which IPs can send email for a domain
- **DKIM (DomainKeys Identified Mail)**: Cryptographic signature proving email authenticity
- **DMARC (Domain-based Message Authentication)**: Policy defining how to handle SPF/DKIM failures
- **Hard Bounce**: Permanent delivery failure (invalid email, domain doesn't exist)
- **Soft Bounce**: Temporary delivery failure (mailbox full, server down)
- **IP Warm-up**: Gradual increase in sending volume to build reputation
- **Spam Score**: Numerical value indicating likelihood of being spam (higher = worse)
- **Deliverability Rate**: Percentage of emails reaching inbox (not spam/bounce)

## Requirements

### Requirement 1: SPF DNS Authentication

**User Story:** As a system administrator, I want SPF records configured for all sending domains, so that Gmail/Outlook/Yahoo accept our emails as legitimate.

#### Acceptance Criteria

1. THE System SHALL validate that SPF DNS record exists for from_email domain before allowing SMTP configuration save
2. WHEN SPF record is missing, THE System SHALL return error: "SPF record not found for {domain}. Add DNS TXT record: v=spf1 ip4:{server_ip} ~all"
3. THE System SHALL check if SMTP server IP is authorized in SPF record
4. THE System SHALL provide SPF record template in admin panel with actual server IP
5. THE System SHALL log SPF validation failures for monitoring
6. THE System SHALL support both single IP and include: mechanisms in SPF validation

### Requirement 2: DKIM Email Signing

**User Story:** As a security officer, I want all outgoing emails cryptographically signed with DKIM, so that recipients can verify email authenticity and prevent spoofing.

#### Acceptance Criteria

1. THE System SHALL generate 2048-bit RSA DKIM key pair on first deployment
2. THE System SHALL store DKIM private key in environment variable DKIM_PRIVATE_KEY
3. THE System SHALL sign all outgoing emails with DKIM-Signature header
4. THE DKIM signature SHALL include headers: From, To, Subject, Date, Message-ID
5. THE System SHALL use selector "default" for DKIM DNS record
6. THE System SHALL provide DKIM public key in DNS TXT record format in admin panel
7. WHEN DKIM private key is missing, THE System SHALL log warning and send email without signature (degraded mode)
8. THE System SHALL validate DKIM signature before sending (self-test)

### Requirement 3: DMARC Policy Configuration

**User Story:** As a security architect, I want DMARC policy configured, so that phishing attempts using our domain are blocked and we receive reports on authentication failures.

#### Acceptance Criteria

1. THE System SHALL validate that DMARC DNS record exists for from_email domain
2. THE System SHALL recommend DMARC policy: "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@{domain}; pct=100; adkim=s; aspf=s"
3. THE System SHALL provide DMARC record template in admin panel
4. THE System SHALL support processing DMARC aggregate reports (XML format)
5. THE System SHALL alert administrators when DMARC failure rate exceeds 5%
6. THE System SHALL store DMARC report data in dmarc_reports table

### Requirement 4: IP Warm-up Policy

**User Story:** As a system administrator, I want automatic IP warm-up enforcement, so that our new sending IP builds reputation gradually and avoids instant blacklisting.

#### Acceptance Criteria

1. THE System SHALL track warm-up start date (first email sent timestamp)
2. THE System SHALL enforce 14-day warm-up schedule with progressive limits
3. THE System SHALL enforce daily limits: Day 1-2: 50, Day 3-4: 100, Day 5-6: 250, Day 7-8: 500, Day 9-10: 1000, Day 11-12: 2000, Day 13-14: 5000, Day 15+: 10000
4. THE System SHALL enforce hourly limits proportional to daily limits
5. THE System SHALL enforce tenant-specific limits during warm-up
6. DURING warm-up days 1-2, THE System SHALL only allow transactional emails (password_reset, email_verification, user_invite)
7. THE System SHALL display current warm-up phase and limits in admin panel
8. THE System SHALL log rate limit violations for monitoring

### Requirement 5: Rate Limiting

**User Story:** As a system administrator, I want multi-level rate limiting, so that no single tenant can abuse the system and damage our IP reputation.

#### Acceptance Criteria

1. THE System SHALL enforce tenant hourly limit (default: 100 emails/hour/tenant)
2. THE System SHALL enforce global hourly limit (default: 1000 emails/hour)
3. THE System SHALL enforce global daily limit (default: 10000 emails/day)
4. THE System SHALL return 429 Too Many Requests when rate limit exceeded
5. THE System SHALL include Retry-After header in 429 response
6. THE System SHALL store rate limit counters in Redis or database with TTL
7. THE System SHALL allow rate limit configuration per tenant (premium tenants can have higher limits)
8. THE System SHALL alert administrators when global rate limit is consistently hit

### Requirement 6: Bounce Handling

**User Story:** As a deliverability manager, I want automatic bounce detection and recipient blacklisting, so that we stop sending to invalid addresses and maintain low bounce rate.

#### Acceptance Criteria

1. THE System SHALL classify bounces as: hard (permanent), soft (temporary), block (spam filter)
2. THE System SHALL track bounce count per recipient in email_bounce table
3. THE System SHALL auto-blacklist recipients after 3 hard bounces
4. THE System SHALL check recipient blacklist before queueing email
5. WHEN recipient is blacklisted, THE System SHALL return error: "Recipient blacklisted due to repeated bounces"
6. THE System SHALL parse SMTP error codes: 550/551/553/554 = hard, 421/450/451/452 = soft
7. THE System SHALL update email_log.status to "bounced" for all bounce types
8. THE System SHALL provide bounce management UI in admin panel (view bounces, manually unblacklist)
9. THE System SHALL alert when bounce rate exceeds 5% over 24 hours

### Requirement 7: Spam Content Filter

**User Story:** As a content manager, I want automatic spam keyword detection, so that emails with spam triggers are blocked before sending and damaging reputation.

#### Acceptance Criteria

1. THE System SHALL maintain list of 50+ spam trigger keywords (English + Turkish)
2. THE System SHALL scan subject and body for spam keywords before sending
3. THE System SHALL calculate spam score based on: keyword count, ALL CAPS, excessive punctuation, HTML/text ratio, link density
4. WHEN spam score >= 10, THE System SHALL reject email with error: "Email rejected by spam filter: {warnings}"
5. THE System SHALL log spam filter rejections for review
6. THE System SHALL check for suspicious patterns: URL shorteners, image-only emails, excessive links
7. THE System SHALL provide spam score preview in admin panel test email feature
8. THE System SHALL allow administrators to override spam filter for specific scenarios (with audit log)

### Requirement 8: Unsubscribe Link Requirement

**User Story:** As a compliance officer, I want mandatory unsubscribe links in all non-transactional emails, so that we comply with CAN-SPAM Act and reduce spam complaints.

#### Acceptance Criteria

1. THE System SHALL classify email scenarios as transactional or promotional
2. THE System SHALL automatically inject unsubscribe link in promotional email footers
3. THE unsubscribe link SHALL be: "https://app.x-ear.com/unsubscribe?token={encrypted_token}"
4. THE System SHALL provide unsubscribe endpoint: POST /api/unsubscribe
5. THE System SHALL store unsubscribe preferences in email_unsubscribe table
6. THE System SHALL check unsubscribe list before sending promotional emails
7. THE System SHALL honor unsubscribe requests within 10 business days (CAN-SPAM requirement)
8. THE System SHALL provide unsubscribe management UI in admin panel

### Requirement 9: AI-Generated Email Safety

**User Story:** As a risk manager, I want strict controls on AI-generated emails, so that AI cannot send spam, phishing, or inappropriate content that damages reputation.

#### Acceptance Criteria

1. THE System SHALL classify AI email requests by risk level: LOW, MEDIUM, HIGH, CRITICAL
2. THE System SHALL require human approval for HIGH and CRITICAL risk AI emails
3. THE System SHALL block AI-generated emails containing: financial offers, urgent action requests, external links, attachments
4. THE System SHALL enforce stricter rate limits for AI emails: max 10/hour/tenant during warm-up
5. THE System SHALL log all AI email requests with action_plan_hash for audit
6. THE System SHALL track AI email metrics: send rate, spam score, bounce rate, complaint rate
7. WHEN AI email metrics degrade, THE System SHALL automatically disable AI email sending
8. THE System SHALL provide AI email approval queue in admin panel

### Requirement 10: Deliverability Monitoring

**User Story:** As a system administrator, I want real-time deliverability metrics, so that I can detect and respond to reputation issues before they escalate.

#### Acceptance Criteria

1. THE System SHALL track metrics: sent count, bounce rate, spam complaint rate, deliverability rate
2. THE System SHALL calculate deliverability rate: (sent - bounced - spam) / sent * 100
3. THE System SHALL alert when bounce rate > 5% over 1 hour
4. THE System SHALL alert when spam complaint rate > 0.1% over 1 hour
5. THE System SHALL alert when deliverability rate < 95% over 1 hour
6. THE System SHALL provide deliverability dashboard in admin panel
7. THE System SHALL export deliverability metrics to monitoring system (Prometheus/Grafana)
8. THE System SHALL store daily deliverability snapshots for trend analysis

### Requirement 11: DNS Configuration Validation

**User Story:** As a system administrator, I want automated DNS validation, so that I can verify SPF/DKIM/DMARC records are correctly configured before going live.

#### Acceptance Criteria

1. THE System SHALL provide DNS validation tool in admin panel
2. THE System SHALL check SPF record exists and includes server IP
3. THE System SHALL check DKIM record exists and matches public key
4. THE System SHALL check DMARC record exists and has valid policy
5. THE System SHALL display validation results with pass/fail status
6. THE System SHALL provide fix instructions for each failed check
7. THE System SHALL prevent SMTP config activation until DNS validation passes
8. THE System SHALL re-validate DNS records every 24 hours

### Requirement 12: Complaint Handling

**User Story:** As a deliverability manager, I want spam complaint tracking, so that I can identify problematic content and senders before reputation is damaged.

#### Acceptance Criteria

1. THE System SHALL support Feedback Loop (FBL) integration with major providers
2. THE System SHALL parse complaint reports from Gmail/Outlook/Yahoo
3. THE System SHALL store complaints in email_complaint table
4. THE System SHALL auto-unsubscribe recipients who mark emails as spam
5. THE System SHALL alert when complaint rate > 0.1% over 24 hours
6. THE System SHALL identify high-complaint scenarios and templates
7. THE System SHALL provide complaint management UI in admin panel

## Phase 1 MVP Scope (Production Blockers)

The following requirements MUST be implemented before production:
- Requirement 1: SPF DNS Authentication
- Requirement 2: DKIM Email Signing
- Requirement 3: DMARC Policy Configuration
- Requirement 4: IP Warm-up Policy
- Requirement 5: Rate Limiting
- Requirement 6: Bounce Handling
- Requirement 7: Spam Content Filter
- Requirement 8: Unsubscribe Link Requirement
- Requirement 9: AI-Generated Email Safety

## Phase 2 Scope

The following requirements can be deferred to Phase 2:
- Requirement 10: Deliverability Monitoring (basic version in Phase 1)
- Requirement 11: DNS Configuration Validation (manual validation in Phase 1)
- Requirement 12: Complaint Handling (FBL integration)

## Non-Functional Requirements

### Performance
- DNS validation must complete within 5 seconds
- Rate limit check must complete within 50ms
- Spam filter analysis must complete within 100ms

### Security
- DKIM private keys must be stored encrypted
- Unsubscribe tokens must be cryptographically signed
- Bounce/complaint data must be tenant-isolated

### Compliance
- CAN-SPAM Act compliance (unsubscribe within 10 days)
- GDPR compliance (data retention, right to be forgotten)
- SOC 2 compliance (audit logging, access controls)
