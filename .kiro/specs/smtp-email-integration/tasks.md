# Implementation Plan: SMTP Email Integration

## Overview

This implementation plan breaks down the SMTP Email Integration feature into discrete, incremental coding tasks. Each task builds on previous work and includes validation through tests. The plan follows the Requirements-First workflow with comprehensive property-based testing.

**Phase 1 MVP Scope**: Core SMTP configuration, email sending with retry logic, audit logging, admin panel interface, and 5 critical email scenarios (password reset, user invite, email verification, invoice created, system error).

## Tasks

- [x] 1. Set up database schema and models
  - Create Alembic migration for tenant_smtp_config, email_log, email_template tables
  - Implement TenantSMTPConfig, EmailLog, EmailTemplate SQLAlchemy models
  - Add indexes for tenant_id, status, sent_at fields
  - Add foreign key relationships to Tenant model
  - _Requirements: 1.4, 5.1, 5.2, 20.1, 20.2, 20.3, 20.5_

- [x] 1.1 Write property test for tenant isolation on models
  - **Property 3: Tenant Isolation for SMTP Configurations**
  - **Property 4: Tenant Isolation for Email Logs**
  - **Validates: Requirements 1.4, 5.7, 18.1, 18.2**

- [x] 2. Implement EncryptionService
  - Create EncryptionService class with Fernet (AES-256-GCM)
  - Implement encrypt_password() method
  - Implement decrypt_password() method with authentication tag validation
  - Add configuration error handling for missing SMTP_ENCRYPTION_KEY
  - Add security event logging for decryption failures
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.1 Write property test for encryption round-trip
  - **Property 1: Encryption Round-Trip Consistency**
  - **Validates: Requirements 1.1, 2.1, 2.5**

- [x] 2.2 Write property test for encryption uniqueness
  - **Property 2: Encryption Uniqueness**
  - **Validates: Requirements 2.4**

- [x] 2.3 Write unit tests for EncryptionService edge cases
  - Test missing encryption key raises ConfigurationError
  - Test tampered ciphertext raises SecurityException
  - Test decryption failure logging

- [x] 3. Implement SMTPConfigService
  - Create SMTPConfigService class with DB and EncryptionService dependencies
  - Implement create_or_update_config() with password encryption
  - Implement get_active_config() with tenant filtering
  - Implement get_config_with_decrypted_password() for email sending
  - Implement _get_global_fallback_config() from environment variables
  - Implement validate_config() for SMTP field validation
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7_

- [x] 3.1 Write property test for most recent active config selection
  - **Property 5: Most Recent Active Configuration Selection**
  - **Validates: Requirements 1.7**

- [x] 3.2 Write unit tests for SMTPConfigService
  - Test fallback to global config when no tenant config
  - Test validation rejects invalid email format
  - Test validation warns about SSL/TLS port mismatch
  - Test password encryption before storage

- [-] 4. Create email template files and EmailTemplateService
  - Create templates/email/ directory structure (tr/ subdirectories)
  - Create base.html and base.txt layouts
  - Create password_reset templates (HTML, text, meta.json)
  - Create user_invite templates (HTML, text, meta.json)
  - Create email_verification templates (HTML, text, meta.json)
  - Create invoice_created templates (HTML, text, meta.json)
  - Create system_error templates (HTML, text, meta.json)
  - Create smtp_test templates (HTML, text, meta.json)
  - Implement EmailTemplateService with Jinja2
  - Implement render_template() with variable validation
  - Implement _resolve_language() with fallback chain
  - Implement _validate_variables() against required variables schema
  - Add XSS prevention (autoescape enabled)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 25.1, 25.2, 25.3, 25.4, 25.5, 25.6_

- [x] 4.1 Write property test for template rendering completeness
  - **Property 15: Template Rendering Completeness**
  - **Validates: Requirements 6.2**

- [x] 4.2 Write property test for missing variable validation
  - **Property 17: Missing Variable Validation**
  - **Validates: Requirements 6.5, 23.2**

- [x] 4.3 Write property test for XSS prevention
  - **Property 18: XSS Prevention in Templates**
  - **Validates: Requirements 6.7**

- [x] 4.4 Write property test for language fallback chain
  - **Property 19: Language Fallback Chain**
  - **Validates: Requirements 7.2, 7.3, 7.4, 7.6**

- [x] 4.5 Write property test for template injection prevention
  - **Property 25: Template Injection Prevention**
  - **Validates: Requirements 23.6**

- [x] 4.6 Write unit tests for EmailTemplateService
  - Test base layout inclusion in rendered HTML
  - Test variable type validation
  - Test optional variable defaults
  - Test all 6 scenarios render successfully

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement EmailService with async sending and retry logic
  - Create EmailService class with dependencies
  - Implement queue_email() for creating email_log entry
  - Implement send_email_task() as @tenant_task decorated async method
  - Implement retry logic with exponential backoff (2s, 4s, 8s)
  - Implement _send_smtp() with aiosmtplib for multipart messages
  - Implement _update_email_log() for audit logging
  - Implement test_connection() for SMTP validation
  - Add error classification (retryable vs non-retryable)
  - Add fresh DB session handling in background task
  - Add tenant context cleanup after task completion
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.7_

- [x] 6.1 Write property test for async email queueing
  - **Property 6: Async Email Queueing**
  - **Validates: Requirements 3.1**

- [x] 6.2 Write property test for multipart message format
  - **Property 7: Multipart Message Format**
  - **Validates: Requirements 3.3**

- [x] 6.3 Write property test for tenant context cleanup
  - **Property 8: Tenant Context Cleanup**
  - **Validates: Requirements 3.5, 18.6**

- [-] 6.4 Write property test for retry behavior
  - **Property 9: Retry Behavior for Retryable Errors**
  - **Property 10: No Retry for Permanent Errors**
  - **Validates: Requirements 4.1, 4.3, 4.4, 4.5**

- [~] 6.5 Write property test for retry count logging
  - **Property 11: Retry Count Logging**
  - **Validates: Requirements 4.6**

- [~] 6.6 Write property test for audit log creation
  - **Property 12: Audit Log Creation**
  - **Property 13: Successful Send Logging**
  - **Property 14: Failed Send Logging**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [~] 6.7 Write unit tests for EmailService
  - Test exponential backoff delays (2s, 4s, 8s)
  - Test connection timeout handling
  - Test authentication failure (no retry)
  - Test multipart message structure

- [x] 7. Create Pydantic schemas for API contracts
  - Create SMTPConfigBase, SMTPConfigCreate, SMTPConfigUpdate, SMTPConfigResponse schemas
  - Create TestEmailRequest, TestEmailResponse schemas
  - Create SendEmailRequest, SendEmailResponse schemas
  - Create EmailLogResponse, EmailLogListRequest, EmailLogListResponse schemas
  - Use AppBaseModel with alias_generator=to_camel for all schemas
  - Add Field validators for email format, port range, timeout range
  - Ensure password field excluded from response schemas
  - _Requirements: 17.6, 17.7, 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 22.1, 22.2, 22.3, 22.4_

- [x] 7.1 Write unit tests for schema validation
  - Test invalid email format rejected
  - Test port range validation
  - Test password never in response schemas
  - Test camelCase field names in serialization

- [x] 8. Implement SMTP configuration API endpoints
  - Create routers/smtp_config.py router
  - Implement POST /admin/integrations/smtp/config (createOrUpdateSMTPConfig)
  - Implement GET /admin/integrations/smtp/config (getSMTPConfig)
  - Implement POST /admin/integrations/smtp/test (sendTestEmail)
  - Add require_access dependencies for permissions
  - Add ResponseEnvelope wrapping for all responses
  - Add explicit operationId for each endpoint
  - Add SMTP connection test before saving config
  - Add BackgroundTasks injection for test email
  - _Requirements: 1.5, 8.4, 8.5, 8.6, 17.1, 17.2, 17.3, 17.8, 22.7_

- [x] 8.1 Write integration tests for SMTP config endpoints
  - Test create config encrypts password
  - Test get config excludes password
  - Test cross-tenant access returns 404
  - Test invalid config returns 400 with error details
  - Test test email sends successfully

- [x] 8.2 Write property test for cross-tenant access prevention
  - **Property 20: Cross-Tenant Access Prevention**
  - **Validates: Requirements 18.4, 18.5**

- [x] 9. Implement email logs API endpoints
  - Create routers/email_logs.py router
  - Implement GET /admin/integrations/smtp/logs (getEmailLogs)
  - Implement POST /admin/emails/send (sendManualEmail)
  - Add pagination support (page, per_page, total, total_pages)
  - Add filtering support (status, recipient, date_from, date_to)
  - Add tenant isolation filtering
  - Add require_access dependencies
  - Add ResponseEnvelope wrapping
  - Add explicit operationId for each endpoint
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 17.4, 17.5, 17.8, 18.2_

- [x] 9.1 Write integration tests for email logs endpoints
  - Test pagination works correctly
  - Test filtering by status
  - Test filtering by date range
  - Test tenant isolation (only own logs visible)
  - Test manual email sending queues successfully

- [x] 10. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Update OpenAPI schema and regenerate Orval client
  - Add all new endpoints to OpenAPI schema
  - Ensure operationId matches router definitions
  - Ensure schemas use camelCase (via Pydantic alias_generator)
  - Run Orval code generation for admin target
  - Verify generated hooks in apps/admin/src/api/generated/
  - Verify apiClient mutator injects Idempotency-Key headers
  - _Requirements: 17.7, 17.8, 19.5_

- [x] 12. Implement Admin Panel SMTP configuration page
  - Create apps/admin/src/pages/Integrations/Email/SMTPConfig.tsx
  - Use Orval-generated useCreateOrUpdateSMTPConfig hook
  - Use Orval-generated useGetSMTPConfig hook
  - Use Orval-generated useSendTestEmail hook
  - Create form with @x-ear/ui-web components (Input, Button, Toggle, etc.)
  - Add form validation (Zod schema)
  - Add loading states for all operations
  - Add error handling with user-friendly messages
  - Add success notifications
  - Add "Test Mail Gönder" button with confirmation
  - Mask password field input
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11_

- [x] 12.1 Write integration tests for SMTP config page
  - Test form submission calls correct API
  - Test validation errors displayed
  - Test test email button triggers API call
  - Test success/error states rendered correctly

- [x] 13. Implement Admin Panel email logs page
  - Create apps/admin/src/pages/Integrations/Email/EmailLogs.tsx
  - Use Orval-generated useGetEmailLogs hook with pagination
  - Use @x-ear/ui-web Table component
  - Add pagination controls
  - Add status filter dropdown
  - Add recipient search input
  - Add date range picker
  - Add expandable error message details
  - Add loading skeleton while fetching
  - Add empty state when no logs
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10_

- [x] 13.1 Write integration tests for email logs page
  - Test table renders logs correctly
  - Test pagination works
  - Test filters update query
  - Test error messages expandable

- [x] 14. Add navigation and routing for email pages
  - Add "Entegrasyonlar" section to admin navigation
  - Add "E-posta" menu item under Entegrasyonlar
  - Add routes for /admin/integrations/email/config
  - Add routes for /admin/integrations/email/logs
  - Update admin router configuration
  - _Requirements: 8.1, 9.1_

- [x] 15. Implement email scenarios integration
  - Integrate password reset email into auth flow
  - Integrate user invite email into user creation flow
  - Integrate email verification into registration flow
  - Integrate invoice created email into invoice creation flow
  - Integrate system error email into error handling middleware
  - Add language detection from user profile
  - Add fallback to tenant default language
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5, 14.1, 14.2, 14.3, 14.4, 14.5, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [x] 15.1 Write integration tests for email scenarios
  - Test password reset triggers email
  - Test user invite triggers email
  - Test email verification triggers email
  - Test invoice creation triggers email
  - Test system error triggers admin email

- [-] 16. Implement Tool API endpoint for AI Layer integration
  - Create routers/tool_api/email_notifications.py
  - Implement POST /tool-api/email/notify endpoint
  - Add AI request validation (permission allowlist)
  - Add quota enforcement (max 100 per hour per tenant)
  - Add action_plan_hash logging for audit
  - Add fail-safe error handling (don't cascade to AI)
  - Ensure AI Layer NEVER directly imports Email_Service
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7_

- [~] 16.1 Write integration tests for Tool API email endpoint
  - Test AI request validated against allowlist
  - Test quota enforcement
  - Test failure doesn't cascade to AI layer
  - Test audit logging includes action_plan_hash

- [x] 17. Implement idempotency for email sending
  - Add idempotency_key column to email_log table (migration)
  - Implement idempotency check in email sending endpoints
  - Store idempotency keys with tenant_id scope
  - Return cached response for duplicate requests within 24 hours
  - Add automatic expiry for idempotency records (24 hours)
  - _Requirements: 19.1, 19.2, 19.3, 19.4_

- [x] 17.1 Write property test for idempotency
  - **Property 21: Idempotency Key Deduplication**
  - **Property 22: Tenant-Scoped Idempotency**
  - **Validates: Requirements 19.1, 19.2, 19.3**

- [~] 18. Add monitoring and observability
  - Add structured JSON logging for all email operations
  - Add requestId to all log entries
  - Mask PII (email addresses, passwords) in logs
  - Add metrics for emails sent, failed, retry count, send duration
  - Add alert for email failure rate > 10% over 1 hour
  - Add SMTP connection pool statistics logging
  - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5, 27.6_

- [~] 19. Final checkpoint - End-to-end testing
  - Test complete flow: Admin saves SMTP config → sends test email → views logs
  - Test password reset email flow end-to-end
  - Test user invite email flow end-to-end
  - Test email verification flow end-to-end
  - Test invoice created email flow end-to-end
  - Test system error notification flow end-to-end
  - Test retry logic with temporary SMTP failures
  - Test tenant isolation across all operations
  - Test AI Layer email requests via Tool API
  - Ensure all property tests pass (minimum 100 iterations each)
  - Ensure all unit tests pass
  - Ensure all integration tests pass
  - Ensure code coverage meets targets (Services: 90%, Routers: 85%, Models: 80%)

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties (minimum 100 iterations)
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Checkpoints ensure incremental validation
- All code must follow X-Ear CRM engineering rules (ResponseEnvelope, camelCase, tenant isolation, etc.)
- Frontend MUST use Orval hooks only (NO manual axios/fetch)
- Frontend MUST use @x-ear/ui-web components (NO raw HTML)
- AI Layer MUST use Tool API (NO direct Email_Service access)
- Templates stored in filesystem (git-versioned), NOT database
- BackgroundTasks managed by router, NOT service
- Fresh DB session in background tasks to prevent context leaks
