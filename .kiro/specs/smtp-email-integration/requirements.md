# Requirements Document: SMTP Email Integration

## Introduction

This document specifies the requirements for implementing a comprehensive SMTP-based email integration system for the X-Ear CRM platform. The system will enable tenant-specific email configuration, automated email sending for critical business scenarios, audit logging, and administrative management through the Admin Panel. The implementation must maintain strict tenant isolation, security best practices, and fail-safe operation.

## Glossary

- **Email_Service**: The backend service responsible for sending emails via SMTP
- **SMTP_Config_Service**: Service managing tenant-specific SMTP configurations
- **Email_Template_Service**: Service handling Jinja2 template rendering for emails
- **Admin_Panel**: React-based administrative interface for managing email settings
- **Tenant**: An isolated customer organization within the multi-tenant system
- **Background_Task**: Asynchronous task execution using FastAPI BackgroundTasks or Celery
- **Encryption_Service**: Service handling AES-256-GCM encryption for sensitive data
- **Email_Log**: Audit trail record of all email sending attempts
- **AI_Layer**: Isolated AI module that may trigger email notifications
- **Orval_Pipeline**: OpenAPI → Pydantic → Orval code generation workflow
- **ResponseEnvelope**: Standard API response wrapper containing success, data, error, meta, requestId, timestamp

## Requirements

### Requirement 1: SMTP Configuration Management

**User Story:** As a tenant administrator, I want to configure tenant-specific SMTP settings, so that emails are sent from our organization's email server with proper branding.

#### Acceptance Criteria

1. WHEN an administrator saves SMTP configuration, THE System SHALL encrypt the SMTP password using AES-256-GCM before storing in the database
2. WHEN an administrator retrieves SMTP configuration, THE System SHALL decrypt the password only when explicitly requested with proper authorization
3. WHEN a tenant has no SMTP configuration, THE System SHALL use global fallback configuration from environment variables
4. THE System SHALL store SMTP configurations with tenant_id isolation in the tenant_smtp_config table
5. WHEN SMTP configuration is updated, THE System SHALL validate the configuration by attempting a test connection
6. THE System SHALL support the following SMTP parameters: host, port, username, password, from_email, from_name, use_tls, use_ssl, timeout
7. WHEN multiple SMTP configurations exist for a tenant, THE System SHALL use the most recently created active configuration

### Requirement 2: Secure Password Encryption

**User Story:** As a security officer, I want SMTP passwords encrypted at rest, so that credentials are protected from unauthorized access.

#### Acceptance Criteria

1. THE Encryption_Service SHALL use AES-256-GCM encryption algorithm for all SMTP passwords
2. THE System SHALL read encryption key from SMTP_ENCRYPTION_KEY environment variable
3. WHEN encryption key is missing, THE System SHALL raise a configuration error and prevent application startup
4. WHEN encrypting a password, THE Encryption_Service SHALL generate a unique nonce for each encryption operation
5. WHEN decrypting a password, THE Encryption_Service SHALL validate the authentication tag before returning plaintext
6. IF decryption fails due to invalid authentication tag, THEN THE System SHALL log the security event and raise an exception

### Requirement 3: Asynchronous Email Sending

**User Story:** As a developer, I want emails sent asynchronously in background tasks, so that API responses are not delayed by SMTP operations.

#### Acceptance Criteria

1. WHEN an email send request is received, THE Email_Service SHALL queue the operation as a background task
2. THE Background_Task SHALL explicitly set tenant context using the @tenant_task decorator
3. WHEN sending an email, THE Email_Service SHALL support both plain text and HTML multipart messages
4. THE Email_Service SHALL use async SMTP operations to prevent blocking
5. WHEN a background task completes, THE System SHALL clear tenant context to prevent context leaks
6. THE System SHALL process email sending with maximum 30 second timeout per attempt

### Requirement 4: Retry Logic with Exponential Backoff

**User Story:** As a system administrator, I want failed email sends automatically retried, so that transient network issues do not result in lost communications.

#### Acceptance Criteria

1. WHEN an email send fails with a retryable error, THE Email_Service SHALL retry the operation up to 3 times
2. THE Email_Service SHALL use exponential backoff with delays of 2 seconds, 4 seconds, and 8 seconds between retries
3. THE System SHALL consider the following errors as retryable: connection timeout, connection refused, temporary SMTP errors (4xx codes)
4. THE System SHALL consider the following errors as non-retryable: authentication failure, invalid recipient, permanent SMTP errors (5xx codes)
5. WHEN maximum retries are exhausted, THE Email_Service SHALL mark the email as failed in the audit log
6. WHEN a retry succeeds, THE Email_Service SHALL log the successful attempt with retry count

### Requirement 5: Comprehensive Audit Logging

**User Story:** As a compliance officer, I want all email sending attempts logged, so that we can audit communications and troubleshoot delivery issues.

#### Acceptance Criteria

1. THE System SHALL create an email_log record for every email send attempt
2. THE Email_Log SHALL include: tenant_id, recipient, subject, status (sent/failed/bounced), sent_at, error_message, retry_count, template_name
3. WHEN an email is successfully sent, THE System SHALL store status as "sent" with timestamp
4. WHEN an email fails after all retries, THE System SHALL store status as "failed" with error details
5. THE System SHALL retain successful email logs for 90 days
6. THE System SHALL retain failed email logs for 1 year
7. THE System SHALL enforce tenant isolation on email_log queries

### Requirement 6: Template Engine with Jinja2

**User Story:** As a content manager, I want to use email templates with dynamic variables, so that emails are consistent and maintainable.

#### Acceptance Criteria

1. THE Email_Template_Service SHALL use Jinja2 as the template rendering engine
2. THE System SHALL support both HTML and plain text templates for each scenario
3. WHEN rendering a template, THE Email_Template_Service SHALL provide a base layout with header and footer
4. THE System SHALL store templates in the file system under templates/email/ directory structure
5. WHEN a template variable is missing, THE Email_Template_Service SHALL raise a validation error before sending
6. THE System SHALL support the following template scenarios: password_reset, user_invite, email_verification, invoice_created, system_error
7. WHEN rendering templates, THE System SHALL escape user-provided content to prevent XSS attacks

### Requirement 7: Multi-Language Support

**User Story:** As an international user, I want to receive emails in my preferred language, so that communications are clear and professional.

#### Acceptance Criteria

1. THE System SHALL support Turkish (TR) and English (EN) languages for email templates
2. WHEN determining email language, THE System SHALL use the recipient's preferred_language from their user profile
3. IF preferred_language is not set, THEN THE System SHALL use the tenant's default language
4. IF tenant default language is not set, THEN THE System SHALL use Turkish (TR) as fallback
5. THE System SHALL organize templates by language code in subdirectories (templates/email/tr/, templates/email/en/)
6. WHEN a template does not exist for the requested language, THE System SHALL fall back to Turkish template

### Requirement 8: Admin Panel SMTP Configuration Interface

**User Story:** As a tenant administrator, I want to manage SMTP settings through the Admin Panel, so that I can configure email without technical assistance.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display an "E-posta" page under "Entegrasyonlar" section
2. THE Admin_Panel SHALL provide a form with fields: Host, Port, Username, Password, From Email, From Name, TLS/SSL toggle, Timeout
3. WHEN the password field is displayed, THE Admin_Panel SHALL mask the password value
4. THE Admin_Panel SHALL provide a "Test Mail Gönder" button that sends a test email to the administrator's email
5. WHEN the test email succeeds, THE Admin_Panel SHALL display a success message
6. WHEN the test email fails, THE Admin_Panel SHALL display the error message from the backend
7. THE Admin_Panel SHALL validate all required fields before submission
8. THE Admin_Panel SHALL use ONLY Orval-generated hooks for all API calls (NO manual axios or fetch)
9. THE Admin_Panel SHALL use components from @x-ear/ui-web package (NO raw HTML inputs or buttons)
10. THE Admin_Panel SHALL inject Idempotency-Key headers automatically via apiClient mutator
11. THE Admin_Panel SHALL handle loading states, error states, and success states for all operations

### Requirement 9: Email Logs Viewing Interface

**User Story:** As a tenant administrator, I want to view email sending history, so that I can verify communications and troubleshoot delivery issues.

#### Acceptance Criteria

1. THE Admin_Panel SHALL display an email logs table with pagination
2. THE Email_Logs_Table SHALL display: recipient, subject, status, sent_at, error_message, template_name
3. THE Admin_Panel SHALL provide filters for: status (sent/failed), date range, recipient email
4. WHEN viewing email logs, THE System SHALL only display logs for the current tenant
5. THE Admin_Panel SHALL support pagination with configurable page size (10, 25, 50, 100 records)
6. THE Admin_Panel SHALL display error messages in a readable format with expandable details
7. THE Admin_Panel SHALL use ONLY Orval-generated hooks (NO manual axios or fetch)
8. THE Admin_Panel SHALL use Table component from @x-ear/ui-web package
9. THE Admin_Panel SHALL use TanStack Query for server state management (via Orval hooks)
10. THE Admin_Panel SHALL NOT use raw HTML elements (table, tr, td) - MUST use UI library components

### Requirement 10: Manual Email Sending Interface

**User Story:** As a tenant administrator, I want to manually send emails to users, so that I can communicate important information outside of automated scenarios.

#### Acceptance Criteria

1. THE Admin_Panel SHALL provide a "Mail Gönder" page for manual email composition
2. THE Admin_Panel SHALL allow recipient selection by individual user or role-based groups
3. THE Admin_Panel SHALL provide a rich text editor for email body composition
4. THE Admin_Panel SHALL allow optional template selection for pre-formatted content
5. THE Admin_Panel SHALL provide an email preview before sending
6. WHEN sending manual emails, THE System SHALL validate recipient email addresses
7. THE Admin_Panel SHALL display sending progress and confirmation upon completion

### Requirement 11: Password Reset Email Scenario

**User Story:** As a user who forgot my password, I want to receive a password reset email, so that I can regain access to my account.

#### Acceptance Criteria

1. WHEN a password reset is requested, THE System SHALL send an email using the password_reset template
2. THE Email SHALL include a unique, time-limited reset token valid for 1 hour
3. THE Email SHALL include a reset link pointing to the appropriate frontend application
4. THE Email SHALL be sent in the user's preferred language
5. WHEN the email fails to send, THE System SHALL log the failure but not expose the error to the requester

### Requirement 12: User Invitation Email Scenario

**User Story:** As a tenant administrator, I want to send invitation emails to new users, so that they can join the system with proper onboarding.

#### Acceptance Criteria

1. WHEN a new user is invited, THE System SHALL send an email using the user_invite template
2. THE Email SHALL include the inviter's name and organization name
3. THE Email SHALL include a unique invitation token valid for 7 days
4. THE Email SHALL include a registration link with the invitation token
5. THE Email SHALL explain the user's assigned role and permissions

### Requirement 13: Email Verification Scenario

**User Story:** As a new user, I want to receive an email verification link, so that I can confirm my email address and activate my account.

#### Acceptance Criteria

1. WHEN a user registers or changes their email, THE System SHALL send an email using the email_verification template
2. THE Email SHALL include a unique verification token valid for 24 hours
3. THE Email SHALL include a verification link that confirms the email address
4. WHEN the verification link is clicked, THE System SHALL mark the email as verified
5. IF the token is expired, THEN THE System SHALL allow the user to request a new verification email

### Requirement 14: Invoice Created Email Scenario

**User Story:** As a customer, I want to receive an email when an invoice is created, so that I am notified of charges and can review the invoice.

#### Acceptance Criteria

1. WHEN an invoice is created, THE System SHALL send an email using the invoice_created template
2. THE Email SHALL include invoice number, amount, due date, and payment status
3. THE Email SHALL include a link to view the invoice in the web application
4. THE Email SHALL include payment instructions if the invoice is unpaid
5. THE Email SHALL be sent to the party's primary email address

### Requirement 15: System Error Notification Scenario

**User Story:** As a system administrator, I want to receive emails for critical system errors, so that I can respond quickly to issues.

#### Acceptance Criteria

1. WHEN a critical system error occurs, THE System SHALL send an email using the system_error template to all administrators
2. THE Email SHALL include error type, timestamp, affected tenant, and stack trace summary
3. THE Email SHALL include a link to the admin panel error logs
4. THE System SHALL rate-limit error emails to prevent flooding (maximum 10 per hour per error type)
5. THE Email SHALL be sent even if tenant-specific SMTP configuration is unavailable (using global fallback)

### Requirement 16: AI Layer Email Integration via Tool API

**User Story:** As an AI system user, I want to receive email notifications for AI proposals and executions, so that I can review and approve AI actions.

#### Acceptance Criteria

1. WHEN an AI proposal is created, THE AI_Layer SHALL request email notification via Tool API (not direct Email_Service access)
2. THE Tool_API SHALL validate AI email request permissions and quotas before forwarding to Email_Service
3. WHEN an AI execution requires approval, THE Tool_API SHALL send approval email request to Email_Service
4. WHEN an AI action completes, THE Tool_API SHALL send summary email request to Email_Service
5. WHEN AI quota is exceeded, THE Tool_API SHALL send alert email to tenant administrators
6. IF email sending fails for AI notifications, THEN THE AI_Layer SHALL continue operation without interruption (fail-safe)
7. THE System SHALL log AI email requests and outcomes for administrative review
8. THE AI_Layer SHALL NEVER directly access Email_Service, SMTP configuration, or core business logic

### Requirement 17: API Endpoints for SMTP Management

**User Story:** As a frontend developer, I want well-defined API endpoints for SMTP management, so that I can build the Admin Panel interface.

#### Acceptance Criteria

1. THE System SHALL provide POST /admin/integrations/smtp/config endpoint to save SMTP configuration
2. THE System SHALL provide GET /admin/integrations/smtp/config endpoint to retrieve SMTP configuration
3. THE System SHALL provide POST /admin/integrations/smtp/test endpoint to send a test email
4. THE System SHALL provide GET /admin/integrations/smtp/logs endpoint to retrieve email logs with pagination
5. THE System SHALL provide POST /admin/emails/send endpoint to send manual emails
6. ALL endpoints SHALL return responses wrapped in ResponseEnvelope[T]
7. ALL endpoints SHALL use camelCase for JSON field names via Pydantic alias_generator
8. ALL endpoints SHALL define explicit operationId for Orval code generation

### Requirement 18: Tenant Security and Isolation

**User Story:** As a security architect, I want strict tenant isolation for email operations, so that tenants cannot access or send emails on behalf of other tenants.

#### Acceptance Criteria

1. THE System SHALL enforce tenant_id filtering on all SMTP configuration queries
2. THE System SHALL enforce tenant_id filtering on all email log queries
3. WHEN sending emails in background tasks, THE System SHALL use @tenant_task decorator to maintain tenant context
4. THE System SHALL validate that the authenticated user's tenant matches the requested tenant for all operations
5. IF tenant validation fails, THEN THE System SHALL return 404 (not 403) to prevent existence disclosure
6. THE System SHALL clear tenant context after each background task completion

### Requirement 19: Idempotency for Email Sending

**User Story:** As a developer, I want email sending operations to be idempotent, so that duplicate requests do not result in multiple emails.

#### Acceptance Criteria

1. WHEN a POST request includes an Idempotency-Key header, THE System SHALL check for duplicate operations
2. IF an operation with the same Idempotency-Key was completed within 24 hours, THEN THE System SHALL return the cached response
3. THE System SHALL store idempotency keys with tenant_id scope
4. THE System SHALL automatically expire idempotency records after 24 hours
5. THE Admin_Panel SHALL automatically inject Idempotency-Key headers via the apiClient mutator

### Requirement 20: Database Schema for Email System

**User Story:** As a database administrator, I want properly designed tables for email system data, so that the system is scalable and maintainable.

#### Acceptance Criteria

1. THE System SHALL create a tenant_smtp_config table with columns: id, tenant_id, host, port, username, encrypted_password, from_email, from_name, use_tls, use_ssl, timeout, is_active, created_at, updated_at
2. THE System SHALL create an email_log table with columns: id, tenant_id, recipient, subject, body_preview, status, sent_at, error_message, retry_count, template_name, scenario, created_at
3. THE System SHALL create an email_template table with columns: id, name, language_code, subject_template, html_template, text_template, variables_schema, created_at, updated_at
4. ALL tables SHALL include tenant_id for multi-tenancy support
5. THE System SHALL create indexes on: tenant_smtp_config(tenant_id, is_active), email_log(tenant_id, status, sent_at), email_template(name, language_code)
6. THE System SHALL use Alembic migrations to create and modify database schema

### Requirement 21: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when email operations fail, so that I can understand and resolve issues.

#### Acceptance Criteria

1. WHEN SMTP authentication fails, THE System SHALL return error message "SMTP authentication failed. Please check username and password."
2. WHEN SMTP connection fails, THE System SHALL return error message "Cannot connect to SMTP server. Please check host and port."
3. WHEN recipient email is invalid, THE System SHALL return error message "Invalid recipient email address."
4. WHEN template rendering fails, THE System SHALL return error message "Email template error: [specific error]"
5. WHEN encryption key is missing, THE System SHALL return error message "Email system configuration error. Please contact administrator."
6. ALL error responses SHALL use ResponseEnvelope with success=false and populated error field

### Requirement 22: SMTP Configuration Validation

**User Story:** As a tenant administrator, I want SMTP configuration validated before saving, so that I don't save invalid settings.

#### Acceptance Criteria

1. WHEN saving SMTP configuration, THE System SHALL validate that host is a valid hostname or IP address
2. WHEN saving SMTP configuration, THE System SHALL validate that port is between 1 and 65535
3. WHEN saving SMTP configuration, THE System SHALL validate that from_email is a valid email address format
4. WHEN saving SMTP configuration, THE System SHALL validate that timeout is between 5 and 120 seconds
5. WHEN use_ssl is true, THE System SHALL validate that port is typically 465
6. WHEN use_tls is true, THE System SHALL validate that port is typically 587 or 25
7. THE System SHALL attempt a test connection before marking configuration as active

### Requirement 23: Template Variable Validation

**User Story:** As a developer, I want template variables validated before sending, so that emails are not sent with missing or incorrect data.

#### Acceptance Criteria

1. THE Email_Template_Service SHALL define required variables for each template scenario
2. WHEN rendering a template, THE System SHALL validate that all required variables are provided
3. IF a required variable is missing, THEN THE System SHALL raise a validation error with the variable name
4. THE System SHALL validate variable types match expected types (string, date, number, etc.)
5. THE System SHALL provide default values for optional variables
6. THE System SHALL sanitize all user-provided variables to prevent template injection attacks

### Requirement 24: Performance and Scalability

**User Story:** As a system architect, I want the email system to handle high volumes efficiently, so that the system scales with business growth.

#### Acceptance Criteria

1. THE System SHALL process email sending in background tasks to avoid blocking API responses
2. THE System SHALL support concurrent email sending with proper connection pooling
3. THE System SHALL limit concurrent SMTP connections to 10 per tenant
4. THE System SHALL queue emails when SMTP server is unavailable and retry later
5. THE System SHALL complete email log queries within 500ms for pages up to 100 records
6. THE System SHALL support sending up to 1000 emails per hour per tenant (Phase 1 limit)

### Requirement 25: Template Source of Truth

**User Story:** As a developer, I want a single source of truth for email templates, so that template management is clear and maintainable.

#### Acceptance Criteria

1. THE System SHALL store all email templates in the file system under templates/email/ directory (git-versioned)
2. THE System SHALL NOT store templates in the database (email_template table is for Phase 2 admin-editable templates)
3. WHEN the application starts, THE System SHALL validate that all required template files exist
4. THE System SHALL version templates through git commits, not database migrations
5. WHEN deploying, THE System SHALL include template files in the deployment package
6. THE System SHALL treat filesystem templates as the canonical source of truth for Phase 1

### Requirement 26: Tool API Integration for AI Layer

**User Story:** As an AI system architect, I want AI email requests to go through Tool API, so that AI layer remains completely isolated from core business logic.

#### Acceptance Criteria

1. THE System SHALL provide a Tool API endpoint for AI email notification requests
2. THE Tool_API SHALL validate AI requests against permission allowlist before processing
3. THE Tool_API SHALL enforce quota limits on AI email requests (e.g., max 100 per hour per tenant)
4. THE Tool_API SHALL log all AI email requests with action_plan_hash for audit
5. THE Tool_API SHALL return success/failure to AI layer without exposing Email_Service internals
6. THE AI_Layer SHALL NEVER import or directly call Email_Service, SMTPConfigService, or any core services
7. IF Tool API email request fails, THEN THE System SHALL log failure but not cascade error to AI layer

### Requirement 27: Monitoring and Observability

**User Story:** As a DevOps engineer, I want comprehensive logging and metrics for the email system, so that I can monitor health and troubleshoot issues.

#### Acceptance Criteria

1. THE System SHALL log all SMTP operations with structured JSON format
2. THE System SHALL include requestId in all email-related log entries
3. THE System SHALL mask sensitive data (passwords, email content) in logs
4. THE System SHALL emit metrics for: emails sent, emails failed, retry count, send duration
5. THE System SHALL log SMTP connection pool statistics
6. THE System SHALL alert administrators when email failure rate exceeds 10% over 1 hour

## Phase 1 MVP Scope

The following requirements are included in Phase 1 (MVP):
- Requirements 1-9: Core SMTP configuration and email sending
- Requirements 11-15: Critical email scenarios (password reset, invite, verification, invoice, system error)
- Requirements 17-18: API endpoints and tenant security
- Requirements 20-23: Database schema and validation
- Requirement 25: Basic monitoring

## Phase 2 Scope

The following requirements are deferred to Phase 2:
- Requirement 10: Manual email sending interface (advanced features)
- Requirement 16: AI Layer integration (depends on AI Layer maturity)
- Requirement 24: Advanced performance optimizations
- Additional email scenarios: appointment reminders, payment notifications, subscription expiry, device delivery, SGK approval status

## Phase 3 Scope

The following requirements are deferred to Phase 3:
- AI-generated email content with approval gates
- Email analytics (open rate, click rate)
- Segmentation engine for targeted campaigns
- MJML templates for advanced responsive design
- Unsubscribe management
- Bounce handling and email reputation monitoring
