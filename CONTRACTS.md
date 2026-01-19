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
- Fixed Orval API client generation with proper tag structure
- Added AdminMarketplacesPage placeholder
- Fixed @tanstack/react-router-devtools dependency

## Contract Change Guidelines

When modifying API endpoints:
1. Update this file with breaking/non-breaking semantics
2. Update `api-contracts/` directory if applicable
3. Regenerate Orval client with `pnpm gen:api`
