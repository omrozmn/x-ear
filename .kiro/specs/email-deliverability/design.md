# Design Document: Email Deliverability & Anti-Spam Enhancement

## Overview

This design document specifies the technical architecture for enhancing the SMTP Email Integration system with production-grade deliverability features. The enhancements ensure emails reach recipient inboxes (not spam folders) and maintain sender reputation through DNS authentication, rate limiting, content filtering, and bounce handling.

### Key Design Goals

1. **Inbox Delivery**: 95%+ deliverability rate to Gmail/Outlook/Yahoo inboxes
2. **Reputation Protection**: Maintain clean IP and domain reputation
3. **Compliance**: CAN-SPAM Act, GDPR, SOC 2 compliance
4. **Fail-Safe**: Graceful degradation when optional features unavailable
5. **Observability**: Real-time metrics and alerts for reputation issues
6. **AI Safety**: Strict controls on AI-generated email content

### Technology Stack

- **DNS Libraries**: dnspython (SPF/DKIM/DMARC validation)
- **DKIM Signing**: dkimpy (cryptographic email signing)
- **Rate Limiting**: Redis (distributed counters) or PostgreSQL (fallback)
- **Spam Detection**: Custom rule engine + keyword matching
- **Monitoring**: Prometheus metrics + structured logging

## Architecture

### Enhanced Email Sending Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Email Send Request                            │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              1. Blacklist Check                                  │
│  - Check email_bounce table for is_blacklisted=true             │
│  - Reject if blacklisted                                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              2. Rate Limit Check                                 │
│  - Check warm-up phase (days since first email)                 │
│  - Enforce tenant hourly limit                                   │
│  - Enforce global hourly/daily limits                            │
│  - Return 429 if exceeded                                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              3. Unsubscribe Check                                │
│  - Check email_unsubscribe table                                 │
│  - Skip if recipient unsubscribed from scenario                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              4. Template Rendering                               │
│  - Render subject, HTML, text                                    │
│  - Inject unsubscribe link if promotional                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              5. Spam Filter Check                                │
│  - Scan for spam keywords                                        │
│  - Calculate spam score                                          │
│  - Reject if score >= 10                                         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              6. DKIM Signing                                     │
│  - Load DKIM private key                                         │
│  - Sign email with DKIM-Signature header                         │
│  - Log warning if key missing (degraded mode)                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              7. SMTP Send                                        │
│  - Connect to SMTP server                                        │
│  - Send multipart message                                        │
│  - Handle bounces (parse SMTP codes)                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              8. Audit Logging                                    │
│  - Update email_log (status, spam_score, dkim_signed)           │
│  - Track deliverability metrics                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema Changes

### New Tables

#### email_bounce
```sql
CREATE TABLE email_bounce (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    email_log_id VARCHAR(36) NOT NULL REFERENCES email_log(id),
    recipient VARCHAR(255) NOT NULL,
    bounce_type VARCHAR(20) NOT NULL,  -- hard, soft, block
    bounce_reason TEXT,
    smtp_code INTEGER,
    bounce_count INTEGER DEFAULT 1,
    first_bounce_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_bounce_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_blacklisted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_bounce_recipient (tenant_id, recipient),
    INDEX idx_bounce_blacklist (tenant_id, is_blacklisted)
);
```

#### email_unsubscribe
```sql
CREATE TABLE email_unsubscribe (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    recipient VARCHAR(255) NOT NULL,
    scenario VARCHAR(100),  -- NULL = all scenarios
    unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unsubscribe_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_unsubscribe_recipient (tenant_id, recipient, scenario),
    UNIQUE INDEX idx_unsubscribe_token (unsubscribe_token)
);
```

#### dmarc_report
```sql
CREATE TABLE dmarc_report (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    report_id VARCHAR(255) NOT NULL,  -- From DMARC report
    source_ip VARCHAR(45) NOT NULL,
    count INTEGER NOT NULL,
    disposition VARCHAR(20),  -- none, quarantine, reject
    dkim_result VARCHAR(20),  -- pass, fail
    spf_result VARCHAR(20),   -- pass, fail
    report_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_dmarc_date (tenant_id, report_date),
    INDEX idx_dmarc_failures (tenant_id, dkim_result, spf_result)
);
```

#### email_complaint
```sql
CREATE TABLE email_complaint (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    email_log_id VARCHAR(36) REFERENCES email_log(id),
    recipient VARCHAR(255) NOT NULL,
    complaint_type VARCHAR(50),  -- spam, abuse, fraud
    feedback_loop_provider VARCHAR(50),  -- gmail, outlook, yahoo
    complained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_complaint_recipient (tenant_id, recipient),
    INDEX idx_complaint_date (tenant_id, complained_at)
);
```

### Modified Tables

#### email_log (add columns)
```sql
ALTER TABLE email_log ADD COLUMN spam_score INTEGER DEFAULT 0;
ALTER TABLE email_log ADD COLUMN dkim_signed BOOLEAN DEFAULT FALSE;
ALTER TABLE email_log ADD COLUMN unsubscribe_token VARCHAR(255);
ALTER TABLE email_log ADD COLUMN is_promotional BOOLEAN DEFAULT FALSE;
```

## Correctness Properties

### Property 26: SPF Authorization Check
*For any* SMTP configuration, the sending server IP must be authorized in the domain's SPF record.

**Validates: Requirements 1.1, 1.3**

### Property 27: DKIM Signature Validity
*For any* email sent with DKIM signature, the signature must be cryptographically valid and verifiable.

**Validates: Requirements 2.3, 2.8**

### Property 28: Rate Limit Enforcement
*For any* email send request during warm-up, the system must enforce progressive daily limits and reject requests exceeding the current phase limit.

**Validates: Requirements 4.2, 4.3, 4.4, 4.5**

### Property 29: Bounce Blacklist Enforcement
*For any* recipient with 3+ hard bounces, the system must reject all future email attempts to that recipient.

**Validates: Requirements 6.3, 6.4, 6.5**

### Property 30: Spam Score Calculation
*For any* email content, the spam score must be deterministic and increase monotonically with spam indicators.

**Validates: Requirements 7.3, 7.4**

### Property 31: Unsubscribe Honor
*For any* recipient who unsubscribed, the system must not send promotional emails to that recipient.

**Validates: Requirements 8.5, 8.6, 8.7**

### Property 32: AI Email Approval Gate
*For any* AI-generated email with HIGH or CRITICAL risk level, the system must require human approval before sending.

**Validates: Requirements 9.2, 9.7**

## Service Implementations

### DNSValidationService
```python
class DNSValidationService:
    """Validate SPF, DKIM, DMARC DNS records."""
    
    def validate_spf(self, domain: str, server_ip: str) -> tuple[bool, str]:
        """Check SPF record authorizes server IP."""
        
    def validate_dkim(self, domain: str, selector: str, public_key: str) -> tuple[bool, str]:
        """Check DKIM DNS record matches public key."""
        
    def validate_dmarc(self, domain: str) -> tuple[bool, str]:
        """Check DMARC policy exists and is valid."""
        
    def get_dns_setup_instructions(self, domain: str, server_ip: str, dkim_public_key: str) -> dict:
        """Generate DNS record templates for admin panel."""
```

### DKIMSigningService
```python
class DKIMSigningService:
    """Sign outgoing emails with DKIM."""
    
    def sign_email(self, message: MIMEMultipart, domain: str) -> MIMEMultipart:
        """Add DKIM-Signature header to email."""
        
    def generate_keypair(self) -> tuple[str, str]:
        """Generate 2048-bit RSA key pair for DKIM."""
        
    def load_private_key(self, domain: str) -> bytes:
        """Load DKIM private key from environment or secrets."""
```

### RateLimitService
```python
class RateLimitService:
    """Enforce rate limits with IP warm-up awareness."""
    
    def check_rate_limit(self, tenant_id: str, scenario: str) -> tuple[bool, str]:
        """Check if email can be sent within current limits."""
        
    def get_current_warmup_phase(self) -> WarmupPhase:
        """Determine current warm-up phase based on days since start."""
        
    def increment_counter(self, tenant_id: str):
        """Increment rate limit counters (Redis or DB)."""
```

### BounceHandlerService
```python
class BounceHandlerService:
    """Handle email bounces and maintain recipient blacklist."""
    
    def process_bounce(self, email_log_id: str, smtp_code: int, smtp_message: str):
        """Process bounce notification and update blacklist."""
        
    def is_blacklisted(self, recipient: str, tenant_id: str) -> bool:
        """Check if recipient is blacklisted."""
        
    def classify_bounce(self, smtp_code: int, message: str) -> str:
        """Classify bounce as hard, soft, or block."""
```

### SpamFilterService
```python
class SpamFilterService:
    """Analyze email content for spam indicators."""
    
    def analyze_content(self, subject: str, html_body: str, text_body: str) -> dict:
        """Calculate spam score and return warnings."""
        
    def check_spam_keywords(self, content: str) -> int:
        """Count spam trigger keywords."""
        
    def check_html_text_ratio(self, html: str, text: str) -> int:
        """Check if HTML/text ratio is suspicious."""
```

### UnsubscribeService
```python
class UnsubscribeService:
    """Manage email unsubscribe preferences."""
    
    def generate_unsubscribe_link(self, recipient: str, tenant_id: str, scenario: str) -> str:
        """Generate cryptographically signed unsubscribe link."""
        
    def process_unsubscribe(self, token: str, ip_address: str, user_agent: str):
        """Process unsubscribe request and update preferences."""
        
    def is_unsubscribed(self, recipient: str, tenant_id: str, scenario: str) -> bool:
        """Check if recipient unsubscribed from scenario."""
```

### AIEmailSafetyService
```python
class AIEmailSafetyService:
    """Enforce safety controls on AI-generated emails."""
    
    def classify_risk_level(self, content: str, scenario: str) -> str:
        """Classify AI email as LOW, MEDIUM, HIGH, CRITICAL."""
        
    def requires_approval(self, risk_level: str) -> bool:
        """Check if risk level requires human approval."""
        
    def check_blocked_patterns(self, content: str) -> list[str]:
        """Check for blocked patterns (financial offers, urgent actions, etc.)."""
```

## API Endpoints

### DNS Validation
```python
GET /admin/integrations/smtp/dns-validation
- Validate SPF, DKIM, DMARC records
- Return pass/fail status with fix instructions
```

### Bounce Management
```python
GET /admin/integrations/smtp/bounces
- List bounced recipients with bounce count
- Filter by bounce type, blacklist status

POST /admin/integrations/smtp/bounces/{recipient}/unblacklist
- Manually remove recipient from blacklist
```

### Unsubscribe
```python
POST /api/unsubscribe
- Process unsubscribe request from email link
- No authentication required (public endpoint)

GET /admin/integrations/smtp/unsubscribes
- List unsubscribed recipients
- Filter by scenario, date range
```

### Deliverability Metrics
```python
GET /admin/integrations/smtp/metrics
- Return deliverability metrics (sent, bounced, spam, rate)
- Support time range filtering
```

## Testing Strategy

### Property-Based Tests
- Property 26: SPF authorization (100+ random IPs)
- Property 27: DKIM signature validity (100+ random messages)
- Property 28: Rate limit enforcement (100+ random send patterns)
- Property 29: Bounce blacklist (100+ random bounce sequences)
- Property 30: Spam score calculation (100+ random content variations)
- Property 31: Unsubscribe honor (100+ random unsubscribe patterns)
- Property 32: AI approval gate (100+ random risk levels)

### Integration Tests
- End-to-end: SPF validation → DKIM signing → SMTP send
- Bounce handling: Simulate SMTP bounce → verify blacklist
- Rate limiting: Send burst → verify 429 response
- Spam filter: Send spam content → verify rejection
- Unsubscribe: Click link → verify preference stored

### Manual Testing Checklist
- Send test email to Gmail → verify inbox delivery (not spam)
- Send test email to Outlook → verify inbox delivery
- Send test email to Yahoo → verify inbox delivery
- Verify DKIM signature in email headers
- Verify SPF pass in email headers
- Verify DMARC pass in email headers
