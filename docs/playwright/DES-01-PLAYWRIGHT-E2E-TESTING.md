# DES-01: Playwright E2E Testing Design

**Tarih**: 2026-02-03  
**Durum**: APPROVED  
**İlgili REQ**: REQ-01-PLAYWRIGHT-E2E-TESTING.md  
**Öncelik**: P0 (Critical)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CI/CD Pipeline (GitHub Actions)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  P0 Tests    │  │  P1 Tests    │  │  P2-P3 Tests │          │
│  │  (55 tests)  │  │  (85 tests)  │  │  (60 tests)  │          │
│  │  ~35 min     │  │  ~50 min     │  │  ~35 min     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Playwright Test Runner                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Test Execution (4 parallel workers)                     │  │
│  │  - Browser automation (Chromium/Firefox/WebKit)          │  │
│  │  - Screenshot/Video/Trace capture                        │  │
│  │  - Network interception                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Test Helpers & Utilities                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Auth   │  │   Wait   │  │  Party   │  │   Sale   │       │
│  │ Helpers  │  │ Helpers  │  │ Helpers  │  │ Helpers  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Application Under Test                       │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │  Frontend (React)    │  │  Backend (FastAPI)   │            │
│  │  localhost:8080      │  │  localhost:5003      │            │
│  └──────────────────────┘  └──────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
x-ear/
├── tests/
│   ├── e2e/
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   ├── logout.spec.ts
│   │   │   └── permissions.spec.ts
│   │   ├── party/
│   │   │   ├── party-crud.spec.ts
│   │   │   ├── party-search.spec.ts
│   │   │   └── party-bulk.spec.ts
│   │   ├── sale/
│   │   │   ├── sale-modal.spec.ts
│   │   │   ├── sale-device-assignment.spec.ts
│   │   │   └── sale-cash-register.spec.ts
│   │   ├── payment/
│   │   ├── appointment/
│   │   ├── communication/
│   │   └── settings/
│   ├── helpers/
│   │   ├── auth.ts
│   │   ├── wait.ts
│   │   ├── party.ts
│   │   ├── sale.ts
│   │   └── assertions.ts
│   ├── fixtures/
│   │   ├── users.ts
│   │   ├── parties.ts
│   │   └── devices.ts
│   └── config/
│       └── playwright.config.ts
├── docs/
│   └── playwright/
│       ├── REQ-01-PLAYWRIGHT-E2E-TESTING.md
│       ├── DES-01-PLAYWRIGHT-E2E-TESTING.md
│       └── tests/
└── playwright-report/
```
