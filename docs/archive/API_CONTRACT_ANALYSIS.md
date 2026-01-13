# 🔌 Multi-App API Contract Analysis Report

**Generated:** 2026-01-11 00:23:49

---

## 📊 Executive Summary

| Metric | Count |
|--------|-------|
| Backend Endpoints | 467 |
| Orval-Generated Endpoints | 461 |
| ⚠️ Orval endpoints NOT in backend | 18 |
| 📋 Backend endpoints NOT in Orval | 9 |
| Files using Orval functions | 43 |
| Direct API calls (non-Orval) | 67 |
| 🔍 Potential breakage points | 110 |

---

## 🚨 Critical: Orval Endpoints Missing in Backend

> [!CAUTION]
> These endpoints are defined in Orval-generated code (across apps) but don't have matching backend routes!
> Frontend calls to these will return 404 errors.

| App | Method | Endpoint | Orval Module | Function |
|-----|--------|----------|--------------|----------|
| admin | GET | `/api/tenant/assets/access.tenant_id}/${filename}` | tenant-users | `getTenantAsset` |
| admin | GET | `/health` | health | `healthCheckHealthGet` |
| admin | GET | `/readiness` | health | `readinessCheckReadinessGet` |
| admin | GET | `/readiness` | health | `?` |
| admin | GET | `/readiness` | health | `?` |
| admin | GET | `/readiness` | health | `?` |
| landing | GET | `/api/tenant/assets/access.tenant_id}/${filename}` | tenant-users | `getTenantAsset` |
| landing | GET | `/health` | health | `healthCheckHealthGet` |
| landing | GET | `/readiness` | health | `readinessCheckReadinessGet` |
| landing | GET | `/readiness` | health | `?` |
| landing | GET | `/readiness` | health | `?` |
| landing | GET | `/readiness` | health | `?` |
| web | GET | `/api/tenant/assets/access.tenant_id}/${filename}` | tenant-users | `getTenantAsset` |
| web | GET | `/health` | health | `healthCheckHealthGet` |
| web | GET | `/readiness` | health | `readinessCheckReadinessGet` |
| web | GET | `/readiness` | health | `?` |
| web | GET | `/readiness` | health | `?` |
| web | GET | `/readiness` | health | `?` |

---

## 📋 Backend Endpoints Not in Orval

> [!WARNING]
> These backend endpoints don't have Orval-generated hooks in ANY app.
> You may need to regenerate Orval for the relevant app.

<details>
<summary>Click to expand (9 endpoints)</summary>

| Method | Path | Router | Function |
|--------|------|--------|----------|
| GET | `/api/__internal/openapi-schema-registry` | devices | `unknown` |
| POST | `/api/admin/campaigns/` | admin_campaigns | `create_campaign` |
| PUT | `/api/admin/campaigns/{campaign_id}` | admin_campaigns | `update_campaign` |
| DELETE | `/api/admin/campaigns/{campaign_id}` | admin_campaigns | `delete_campaign` |
| GET | `/api/admin/campaigns/{campaign_id}` | admin_campaigns | `get_campaign` |
| POST | `/api/orders/` | orders | `create_order` |
| POST | `/api/orders/init-db` | orders | `init_db` |
| GET | `/api/orders/{order_id}` | orders | `get_order` |
| GET | `/api/tenant/assets/{access.tenant_id}/{filename}` | tenant_users | `get_tenant_asset` |

</details>

---

## 🔧 Direct API Calls (Consider Migrating to Orval)

> [!NOTE]
> These files use direct `fetch` or `apiClient` calls instead of Orval hooks.
> Consider migrating to Orval for type safety.

### App: `admin`

#### `pages/admin/tenants/UsersTab.tsx`
- Line 56: `UNKNOWN /api/admin/tenants/${tenantId}/users`
- Line 89: `UNKNOWN /api/admin/tenants/${tenantId}/users`
- Line 189: `UNKNOWN /api/admin/tenants/${tenantId}/users`

#### `pages/admin/tenants/IntegrationsTab.tsx`
- Line 49: `GET /api/admin/tenants/${tenant.id}/sms-config`
- Line 49: `UNKNOWN /api/admin/tenants/${tenant.id}/sms-config`

#### `pages/admin/tenants/SmsDocumentsTab.tsx`
- Line 99: `UNKNOWN /api/admin/tenants/${tenantId}/sms-documents/${docType}/down`


### App: `web`

#### `services/sgk.service.ts`
- Line 242: `UNKNOWN ,
      createdAt: new Date().toISOString(),
      updatedAt`
- Line 284: `UNKNOWN /api/sgk/documents/${id}`
- Line 316: `UNKNOWN /api/sgk/documents/${id}`
- _...and 5 more calls_

#### `services/inventory.service.ts`
- Line 136: `UNKNOWN /api/inventory/${id}`
- Line 191: `UNKNOWN /api/inventory/${id}`
- Line 194: `UNKNOWN 
      }
    });

    return updatedItem;
  }

  async delet`
- _...and 3 more calls_

#### `services/invoice.service.ts`
- Line 323: `UNKNOWN ,
      customerId: invoiceData.customerId,
      customerNa`
- Line 484: `UNKNOWN /api/invoices/${id}`
- Line 505: `UNKNOWN /api/invoices/${encodeURIComponent(id)}`
- _...and 3 more calls_

#### `services/appointment.service.ts`
- Line 71: `UNKNOWN  : ''),
        endTime: d.endTime || (d.date && d.time ? th`
- Line 206: `UNKNOWN );
    }

    // Update local storage
    this.appointments[`
- Line 221: `UNKNOWN /api/appointments/${id}`
- _...and 2 more calls_

#### `services/offline/patientOfflineSync.ts`
- Line 75: `UNKNOWN ;
    const patientWithSync: Patient & { syncStatus: 'synced`
- Line 117: `UNKNOWN /api/patients/${id}`
- Line 135: `UNKNOWN /api/patients/${id}`
- _...and 1 more calls_

> _...and 20 more files in web_

---

## ✅ Orval Usage Summary

| Application | Files Using Orval |
|-------------|-------------------|
| `admin` | 0 |
| `landing` | 0 |
| `web` | 43 |

---

## 🔍 Potential Frontend Breakage Points

These code patterns might be fragile if API response structure changes:

| File | Line | Pattern | Match |
|------|------|---------|-------|
| `web/services/patient.service.ts` | 190 | Direct id field access (check nullability) | `id` |
| `web/services/inventory.service.ts` | 84 | Assumes response.data.{field} exists | `response.data.data` |
| `web/services/inventory.service.ts` | 104 | Direct id field access (check nullability) | `id` |
| `web/services/sgkService.ts` | 2 | Direct id field access (check nullability) | `id` |
| `web/services/timeline.service.ts` | 79 | Direct id field access (check nullability) | `id` |
| `web/services/device-replacement.service.ts` | 87 | Iterates over potentially undefined array | `data.map` |
| `web/services/device-replacement.service.ts` | 260 | Direct id field access (check nullability) | `id` |
| `web/services/communicationOfflineSync.ts` | 6 | Direct id field access (check nullability) | `id` |
| `web/services/appointment.service.ts` | 65 | Iterates over potentially undefined array | `items.map` |
| `web/services/appointment.service.ts` | 66 | Direct id field access (check nullability) | `id` |
| `web/services/purchase.service.ts` | 82 | Iterates over potentially undefined array | `items.map` |
| `web/services/purchase.service.ts` | 35 | Direct id field access (check nullability) | `id` |
| `web/services/company.service.ts` | 31 | Direct id field access (check nullability) | `id` |
| `web/services/InvoiceTemplateService.ts` | 11 | Direct id field access (check nullability) | `id` |
| `web/services/branch.service.ts` | 4 | Direct id field access (check nullability) | `id` |
| `web/services/invoice.service.ts` | 373 | Iterates over potentially undefined array | `items?.map` |
| `web/services/invoice.service.ts` | 48 | Direct id field access (check nullability) | `id` |

---

## 💡 Recommendations

1. **🚨 Fix Critical Issues**: Any Orval endpoint not in backend will cause 404 errors
2. **📋 Regenerate Orval**: Run `npm run orval` for apps with missing endpoints
3. **🔧 Migrate Direct Calls**: Convert `fetch`/`apiClient` calls to Orval hooks for type safety
4. **🔍 Review Breakage Points**: Add null checks for fragile data access patterns

---

*Report generated by `scripts/analyze_api_contract.py`*