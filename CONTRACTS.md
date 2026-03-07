# API Contracts

This document describes API contract changes for the x-ear platform.

## Current Version: 2.0.0

### Party-Role-Profile Migration (v2.0.0)

**Breaking Changes:**
- `/api/patients/*` endpoints renamed to `/api/parties/*`
- Response field `patients` renamed to `parties`

**Non-Breaking Changes:**
- Added `admin_marketplaces` router for future marketplace integrations
- Added case-insensitive TenantStatus enum handling
- Made TenantRead schema strict (product_code, status, max_users, current_users required)

### Admin Panel Stability Fixes

**Non-Breaking Changes:**
- Added AdminMarketplacesPage placeholder
- Added custom `require_affiliate` dependency for token validation

### Affiliate Security Improvements (v2.1.0)

**Breaking Changes:**
- Affiliate authentication now uses a dedicated `require_affiliate` dependency instead of generic auth.
- JWT tokens for affiliates now use `user.id` as `sub` (string-formatted) to match standard JWT conventions.
- Affiliate ID in path parameters is now strictly validated against token sub ID (returns 403 on mismatch).

**Non-Breaking Changes:**
- Added copy-to-clipboard visual feedback in affiliate panel.
- Enhanced login error UI with modern glow effects.

## Contract Change Guidelines

When modifying API endpoints:
1. Update this file with breaking/non-breaking semantics
2. Update `api-contracts/` directory if applicable
3. Regenerate Orval client with `pnpm gen:api`
