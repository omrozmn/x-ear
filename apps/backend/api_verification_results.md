# API Verification Results

**Generated**: 2026-01-04T14:45:21.115336

## Summary
- **Total Endpoints**: 469
- **200-299 OK**: 38
- **4xx Client Errors**: 427
- **5xx Server Errors**: 4

## Details

| Method | Path | Status | Indicator | Details |
|--------|------|--------|-----------|--------|
| **POST** | `/api/EFatura/Cancel/<invoice_id>` | 401 | ⚠️ | `{"success": false, "requestId": "17aa4625-26ca-405` |
| **POST** | `/api/EFatura/Create` | 401 | ⚠️ | `{"success": false, "requestId": "83a11ca4-23b3-430` |
| **POST** | `/api/EFatura/Retry/<invoice_id>` | 401 | ⚠️ | `{"success": false, "requestId": "c07e5a27-3364-4d9` |
| **POST** | `/api/EFatura/sendBasicInvoice` | 401 | ⚠️ | `{"success": false, "requestId": "e0671118-0e77-4ef` |
| **POST** | `/api/EFatura/sendDocument` | 401 | ⚠️ | `{"success": false, "requestId": "13ce69be-2ff4-490` |
| **POST** | `/api/OutEBelgeV2/SendBasicInvoiceFromModel` | 401 | ⚠️ | `{"success": false, "requestId": "e397fb96-759d-4ee` |
| **POST** | `/api/OutEBelgeV2/SendDocument` | 401 | ⚠️ | `{"success": false, "requestId": "5fa65923-cd62-44b` |
| **GET** | `/api/activity-logs` | 401 | ⚠️ | `{"success": false, "requestId": "de3abac2-8cc1-489` |
| **POST** | `/api/activity-logs` | 201 | ✅ | `{"data": {"action": "test.action", "branchId": nul` |
| **GET** | `/api/activity-logs/<log_id>` | 401 | ⚠️ | `{"success": false, "requestId": "757ebfac-d456-455` |
| **GET** | `/api/activity-logs/filter-options` | 401 | ⚠️ | `{"success": false, "requestId": "61aa5cdf-6dd1-41f` |
| **GET** | `/api/activity-logs/stats` | 401 | ⚠️ | `{"success": false, "requestId": "9da4a8e6-2666-4c2` |
| **GET** | `/api/addons` | 200 | ✅ | `{"data": [{"addon_type": "FLAT_FEE", "created_at":` |
| **GET** | `/api/admin/activity-logs` | 401 | ⚠️ | `{"success": false, "requestId": "577d5160-f770-40f` |
| **GET** | `/api/admin/activity-logs/filter-options` | 401 | ⚠️ | `{"success": false, "requestId": "eda3099f-95c6-4fc` |
| **GET** | `/api/admin/activity-logs/stats` | 401 | ⚠️ | `{"success": false, "requestId": "edc6c14e-e259-4d7` |
| **GET** | `/api/admin/addons` | 401 | ⚠️ | `{"success": false, "requestId": "7577b4c8-a9d8-4b1` |
| **POST** | `/api/admin/addons` | 401 | ⚠️ | `{"success": false, "requestId": "b5244120-6849-45c` |
| **DELETE** | `/api/admin/addons/<addon_id>` | 401 | ⚠️ | `{"success": false, "requestId": "c7cd3dc1-62c5-41b` |
| **GET** | `/api/admin/addons/<addon_id>` | 401 | ⚠️ | `{"success": false, "requestId": "e79c1f6d-4029-49e` |
| **PUT** | `/api/admin/addons/<addon_id>` | 401 | ⚠️ | `{"success": false, "requestId": "c742227c-fd7d-424` |
| **GET** | `/api/admin/admin-users` | 401 | ⚠️ | `{"success": false, "requestId": "3f1d288b-9314-435` |
| **GET** | `/api/admin/admin-users/<user_id>` | 401 | ⚠️ | `{"success": false, "requestId": "a1e5c57c-dcd8-456` |
| **PUT** | `/api/admin/admin-users/<user_id>/roles` | 401 | ⚠️ | `{"success": false, "requestId": "7a29c12d-9c1a-4f0` |
| **GET** | `/api/admin/analytics` | 401 | ⚠️ | `{"success": false, "requestId": "2188f393-b966-481` |
| **GET** | `/api/admin/api-keys` | 401 | ⚠️ | `{"success": false, "requestId": "e6e59e74-2cf8-4b7` |
| **POST** | `/api/admin/api-keys` | 401 | ⚠️ | `{"success": false, "requestId": "8bcbc3c6-40c9-427` |
| **DELETE** | `/api/admin/api-keys/<key_id>` | 401 | ⚠️ | `{"success": false, "requestId": "0a0cbd81-c021-47d` |
| **POST** | `/api/admin/api-keys/init-db` | 401 | ⚠️ | `{"success": false, "requestId": "72403422-4423-438` |
| **GET** | `/api/admin/appointments` | 401 | ⚠️ | `{"success": false, "requestId": "163ad026-3c55-4cb` |
| **POST** | `/api/admin/auth/login` | 400 | ⚠️ | `{"error": {"code": "MISSING_CREDENTIALS", "message` |
| **GET** | `/api/admin/birfatura/invoices` | 401 | ⚠️ | `{"success": false, "requestId": "c7cfc8af-2c8c-482` |
| **GET** | `/api/admin/birfatura/logs` | 401 | ⚠️ | `{"success": false, "requestId": "ade7bd01-6cd1-4ef` |
| **GET** | `/api/admin/birfatura/stats` | 401 | ⚠️ | `{"success": false, "requestId": "9d30a99a-9f13-4f2` |
| **GET** | `/api/admin/campaigns` | 401 | ⚠️ | `{"success": false, "requestId": "aab96a85-7504-40f` |
| **POST** | `/api/admin/campaigns` | 401 | ⚠️ | `{"success": false, "requestId": "64d8a42b-9a41-49e` |
| **DELETE** | `/api/admin/campaigns/<string:id>` | 401 | ⚠️ | `{"success": false, "requestId": "3a8a41a6-65de-4e1` |
| **GET** | `/api/admin/campaigns/<string:id>` | 401 | ⚠️ | `{"success": false, "requestId": "a0b7e3f2-3ed3-4b8` |
| **PUT** | `/api/admin/campaigns/<string:id>` | 401 | ⚠️ | `{"success": false, "requestId": "bf80e811-6665-470` |
| **GET** | `/api/admin/dashboard/` | 401 | ⚠️ | `{"success": false, "requestId": "123d651d-f139-486` |
| **GET** | `/api/admin/debug/available-roles` | 401 | ⚠️ | `{"success": false, "requestId": "79287efb-a2c6-453` |
| **POST** | `/api/admin/debug/exit-impersonation` | 401 | ⚠️ | `{"success": false, "requestId": "5fcdc3bc-f283-4d8` |
| **GET** | `/api/admin/debug/page-permissions/<page_key>` | 401 | ⚠️ | `{"success": false, "requestId": "576bc4bd-9137-481` |
| **POST** | `/api/admin/debug/switch-role` | 401 | ⚠️ | `{"success": false, "requestId": "225ac158-bff2-498` |
| **POST** | `/api/admin/debug/switch-tenant` | 401 | ⚠️ | `{"success": false, "requestId": "af769eb2-a596-4c8` |
| **GET** | `/api/admin/features` | 401 | ⚠️ | `{"success": false, "requestId": "5cd4d233-63e8-413` |
| **PATCH** | `/api/admin/features` | 401 | ⚠️ | `{"success": false, "requestId": "9444c122-2cd5-4dc` |
| **GET** | `/api/admin/integrations/birfatura/config` | 401 | ⚠️ | `{"success": false, "requestId": "b274b9a6-cf63-474` |
| **PUT** | `/api/admin/integrations/birfatura/config` | 401 | ⚠️ | `{"success": false, "requestId": "a8ca90b4-61df-400` |
| **POST** | `/api/admin/integrations/init-db` | 401 | ⚠️ | `{"success": false, "requestId": "ef2415e1-3a5f-405` |
| **GET** | `/api/admin/integrations/vatan-sms/config` | 401 | ⚠️ | `{"success": false, "requestId": "049c2c7f-15bc-49a` |
| **PUT** | `/api/admin/integrations/vatan-sms/config` | 401 | ⚠️ | `{"success": false, "requestId": "c1451f29-8f35-478` |
| **GET** | `/api/admin/inventory` | 401 | ⚠️ | `{"success": false, "requestId": "2b9a8fe9-2844-4f5` |
| **GET** | `/api/admin/invoices` | 401 | ⚠️ | `{"success": false, "requestId": "f94bc135-3f24-495` |
| **POST** | `/api/admin/invoices` | 401 | ⚠️ | `{"success": false, "requestId": "f9e07f86-d4c4-442` |
| **GET** | `/api/admin/invoices/<id>` | 401 | ⚠️ | `{"success": false, "requestId": "6ab68324-edc4-4bd` |
| **POST** | `/api/admin/invoices/<id>/payment` | 401 | ⚠️ | `{"success": false, "requestId": "aab9632c-577e-40e` |
| **GET** | `/api/admin/invoices/<id>/pdf` | 401 | ⚠️ | `{"success": false, "requestId": "95cae4b2-07dd-418` |
| **POST** | `/api/admin/marketplaces/init-db` | 401 | ⚠️ | `{"success": false, "requestId": "73a0c381-110a-46c` |
| **GET** | `/api/admin/marketplaces/integrations` | 401 | ⚠️ | `{"success": false, "requestId": "77809719-4596-4bd` |
| **POST** | `/api/admin/marketplaces/integrations` | 401 | ⚠️ | `{"success": false, "requestId": "e4e87eec-ad52-473` |
| **POST** | `/api/admin/marketplaces/integrations/<id>/sync` | 401 | ⚠️ | `{"success": false, "requestId": "aa9d63b3-512a-42b` |
| **GET** | `/api/admin/my-permissions` | 401 | ⚠️ | `{"success": false, "requestId": "b4b66736-d4a8-41d` |
| **GET** | `/api/admin/notifications` | 401 | ⚠️ | `{"success": false, "requestId": "f29c84cb-22b0-459` |
| **POST** | `/api/admin/notifications/init-db` | 401 | ⚠️ | `{"success": false, "requestId": "d441af96-d5d2-484` |
| **POST** | `/api/admin/notifications/send` | 401 | ⚠️ | `{"success": false, "requestId": "8b4d53f1-6b93-447` |
| **GET** | `/api/admin/notifications/templates` | 401 | ⚠️ | `{"success": false, "requestId": "a8bb321e-4368-425` |
| **POST** | `/api/admin/notifications/templates` | 401 | ⚠️ | `{"success": false, "requestId": "4b1c2015-e71b-426` |
| **DELETE** | `/api/admin/notifications/templates/<template_id>` | 401 | ⚠️ | `{"success": false, "requestId": "35862444-0c20-4c4` |
| **PUT** | `/api/admin/notifications/templates/<template_id>` | 401 | ⚠️ | `{"success": false, "requestId": "132c0a35-cde0-4b8` |
| **GET** | `/api/admin/patients` | 401 | ⚠️ | `{"success": false, "requestId": "0ea876fb-bae7-4c4` |
| **GET** | `/api/admin/patients/<patient_id>` | 401 | ⚠️ | `{"success": false, "requestId": "a6833763-9fde-416` |
| **GET** | `/api/admin/patients/<patient_id>/devices` | 401 | ⚠️ | `{"success": false, "requestId": "3e34137f-11b8-4a0` |
| **GET** | `/api/admin/patients/<patient_id>/documents` | 401 | ⚠️ | `{"success": false, "requestId": "b7bc656f-2118-4d5` |
| **GET** | `/api/admin/patients/<patient_id>/sales` | 401 | ⚠️ | `{"success": false, "requestId": "ab634c28-b5ee-4ce` |
| **GET** | `/api/admin/patients/<patient_id>/timeline` | 401 | ⚠️ | `{"success": false, "requestId": "4f6c5cee-a489-464` |
| **GET** | `/api/admin/payments/pos/transactions` | 401 | ⚠️ | `{"success": false, "requestId": "ca1ced2b-da7f-48b` |
| **GET** | `/api/admin/permissions` | 401 | ⚠️ | `{"success": false, "requestId": "1c55e09e-8d3b-468` |
| **GET** | `/api/admin/permissions/check/<path:endpoint_path>` | 401 | ⚠️ | `{"success": false, "requestId": "86cec9ba-c0b4-410` |
| **GET** | `/api/admin/permissions/coverage` | 401 | ⚠️ | `{"success": false, "requestId": "23b79b06-951c-49f` |
| **GET** | `/api/admin/permissions/map` | 401 | ⚠️ | `{"success": false, "requestId": "4138ebab-03d4-486` |
| **GET** | `/api/admin/plans` | 401 | ⚠️ | `{"success": false, "requestId": "76e2c991-ae58-43f` |
| **POST** | `/api/admin/plans` | 401 | ⚠️ | `{"success": false, "requestId": "495e096e-3296-4b6` |
| **DELETE** | `/api/admin/plans/<plan_id>` | 401 | ⚠️ | `{"success": false, "requestId": "c9069b80-cdd5-4c6` |
| **GET** | `/api/admin/plans/<plan_id>` | 401 | ⚠️ | `{"success": false, "requestId": "48ee9e4c-2934-4e4` |
| **PUT** | `/api/admin/plans/<plan_id>` | 401 | ⚠️ | `{"success": false, "requestId": "77a2d235-4efa-4a7` |
| **POST** | `/api/admin/production/init-db` | 401 | ⚠️ | `{"success": false, "requestId": "13a90049-f53f-46d` |
| **GET** | `/api/admin/production/orders` | 401 | ⚠️ | `{"success": false, "requestId": "9da6c448-959a-402` |
| **PUT** | `/api/admin/production/orders/<id>/status` | 401 | ⚠️ | `{"success": false, "requestId": "ce524877-5ea5-488` |
| **GET** | `/api/admin/roles` | 401 | ⚠️ | `{"success": false, "requestId": "f8172d3d-8740-482` |
| **POST** | `/api/admin/roles` | 401 | ⚠️ | `{"success": false, "requestId": "d05e8577-c94c-450` |
| **DELETE** | `/api/admin/roles/<role_id>` | 401 | ⚠️ | `{"success": false, "requestId": "7dbdc3e4-b3d7-4bc` |
| **GET** | `/api/admin/roles/<role_id>` | 401 | ⚠️ | `{"success": false, "requestId": "6ef833c5-dbf3-44e` |
| **PUT** | `/api/admin/roles/<role_id>` | 401 | ⚠️ | `{"success": false, "requestId": "65f640a2-5223-4fb` |
| **GET** | `/api/admin/roles/<role_id>/permissions` | 401 | ⚠️ | `{"success": false, "requestId": "238a12d0-33be-4a1` |
| **PUT** | `/api/admin/roles/<role_id>/permissions` | 401 | ⚠️ | `{"success": false, "requestId": "c1aa70f0-a98e-46f` |
| **GET** | `/api/admin/scan-queue` | 401 | ⚠️ | `{"success": false, "requestId": "7d316539-79fc-4ec` |
| **POST** | `/api/admin/scan-queue/<id>/retry` | 401 | ⚠️ | `{"success": false, "requestId": "577ac1af-f74f-45a` |
| **POST** | `/api/admin/scan-queue/init-db` | 401 | ⚠️ | `{"success": false, "requestId": "58b6bdf4-9283-4bd` |
| **GET** | `/api/admin/settings` | 401 | ⚠️ | `{"success": false, "requestId": "f01252f1-aba4-4e4` |
| **POST** | `/api/admin/settings` | 401 | ⚠️ | `{"success": false, "requestId": "8e752ce2-54d2-4ac` |
| **POST** | `/api/admin/settings/backup` | 401 | ⚠️ | `{"success": false, "requestId": "9f20729b-7d42-42d` |
| **POST** | `/api/admin/settings/cache/clear` | 401 | ⚠️ | `{"success": false, "requestId": "f46bbe60-3edb-43d` |
| **POST** | `/api/admin/settings/init-db` | 401 | ⚠️ | `{"success": false, "requestId": "ab3587f1-a759-43e` |
| **GET** | `/api/admin/sms/headers` | 401 | ⚠️ | `{"success": false, "requestId": "5f99ae3c-b03d-4ee` |
| **PUT** | `/api/admin/sms/headers/<header_id>/status` | 401 | ⚠️ | `{"success": false, "requestId": "a4f1ce0d-4ca0-4d5` |
| **GET** | `/api/admin/sms/packages` | 401 | ⚠️ | `{"success": false, "requestId": "d216a4b9-a210-4d2` |
| **GET** | `/api/admin/sms/packages` | 401 | ⚠️ | `{"success": false, "requestId": "aebd216a-7a02-49d` |
| **POST** | `/api/admin/sms/packages` | 401 | ⚠️ | `{"success": false, "requestId": "41fe107c-8469-4c2` |
| **POST** | `/api/admin/sms/packages` | 401 | ⚠️ | `{"success": false, "requestId": "29be7881-ecef-4b3` |
| **PUT** | `/api/admin/sms/packages/<package_id>` | 401 | ⚠️ | `{"success": false, "requestId": "acc665e9-09ba-4b8` |
| **PUT** | `/api/admin/sms/packages/<pkg_id>` | 401 | ⚠️ | `{"success": false, "requestId": "648d2c74-0ecd-404` |
| **GET** | `/api/admin/suppliers` | 401 | ⚠️ | `{"success": false, "requestId": "d4e8cb2a-4358-46e` |
| **POST** | `/api/admin/suppliers` | 401 | ⚠️ | `{"success": false, "requestId": "36824b53-1c07-498` |
| **DELETE** | `/api/admin/suppliers/<int:id>` | 401 | ⚠️ | `{"success": false, "requestId": "49a4c8f6-36f9-4a8` |
| **GET** | `/api/admin/suppliers/<int:id>` | 401 | ⚠️ | `{"success": false, "requestId": "4113a81e-5fa7-48b` |
| **PUT** | `/api/admin/suppliers/<int:id>` | 401 | ⚠️ | `{"success": false, "requestId": "ad2c3522-9281-45e` |
| **GET** | `/api/admin/tenants` | 401 | ⚠️ | `{"success": false, "requestId": "4fa303d3-f8d3-40b` |
| **POST** | `/api/admin/tenants` | 401 | ⚠️ | `{"success": false, "requestId": "22997eb7-05bd-4c3` |
| **DELETE** | `/api/admin/tenants/<tenant_id>` | 401 | ⚠️ | `{"success": false, "requestId": "1c3cd93e-0c21-471` |
| **GET** | `/api/admin/tenants/<tenant_id>` | 401 | ⚠️ | `{"success": false, "requestId": "ea46bbf2-ae88-4f7` |
| **PUT** | `/api/admin/tenants/<tenant_id>` | 401 | ⚠️ | `{"success": false, "requestId": "e9e371e2-6173-4d5` |
| **DELETE** | `/api/admin/tenants/<tenant_id>/addons` | 401 | ⚠️ | `{"success": false, "requestId": "f668d93a-af7c-45e` |
| **POST** | `/api/admin/tenants/<tenant_id>/addons` | 401 | ⚠️ | `{"success": false, "requestId": "593415fc-9ee3-459` |
| **GET** | `/api/admin/tenants/<tenant_id>/sms-config` | 401 | ⚠️ | `{"success": false, "requestId": "5f39e857-6648-407` |
| **GET** | `/api/admin/tenants/<tenant_id>/sms-documents` | 401 | ⚠️ | `{"success": false, "requestId": "cefba28f-fe59-47d` |
| **GET** | `/api/admin/tenants/<tenant_id>/sms-documents/<document_type>/download` | 401 | ⚠️ | `{"success": false, "requestId": "ec08351d-5fe7-4b8` |
| **PUT** | `/api/admin/tenants/<tenant_id>/sms-documents/<document_type>/status` | 401 | ⚠️ | `{"success": false, "requestId": "d4bf02ab-4ebf-46b` |
| **POST** | `/api/admin/tenants/<tenant_id>/sms-documents/send-email` | 401 | ⚠️ | `{"success": false, "requestId": "9d997408-7cc8-45d` |
| **PUT** | `/api/admin/tenants/<tenant_id>/status` | 401 | ⚠️ | `{"success": false, "requestId": "f01fc255-721a-49a` |
| **POST** | `/api/admin/tenants/<tenant_id>/subscribe` | 401 | ⚠️ | `{"success": false, "requestId": "ff7d5459-1fe6-4aa` |
| **GET** | `/api/admin/tenants/<tenant_id>/users` | 401 | ⚠️ | `{"success": false, "requestId": "7361aceb-b587-44f` |
| **POST** | `/api/admin/tenants/<tenant_id>/users` | 401 | ⚠️ | `{"success": false, "requestId": "0b9f2ca1-2f80-4ed` |
| **PUT** | `/api/admin/tenants/<tenant_id>/users/<user_id>` | 401 | ⚠️ | `{"success": false, "requestId": "54c98a99-89f8-4e7` |
| **GET** | `/api/admin/tickets` | 401 | ⚠️ | `{"success": false, "requestId": "4c791798-9586-472` |
| **GET** | `/api/admin/tickets` | 401 | ⚠️ | `{"success": false, "requestId": "7d905009-2504-431` |
| **POST** | `/api/admin/tickets` | 401 | ⚠️ | `{"success": false, "requestId": "2926bffa-bd4f-41f` |
| **POST** | `/api/admin/tickets` | 401 | ⚠️ | `{"success": false, "requestId": "272e13ee-9e31-4c4` |
| **PUT** | `/api/admin/tickets/<id>` | 401 | ⚠️ | `{"success": false, "requestId": "5bf5329d-8197-491` |
| **PUT** | `/api/admin/tickets/<ticket_id>` | 401 | ⚠️ | `{"success": false, "requestId": "1cae7275-362f-410` |
| **POST** | `/api/admin/tickets/<ticket_id>/responses` | 401 | ⚠️ | `{"success": false, "requestId": "e8fb23d3-00c4-436` |
| **GET** | `/api/admin/users` | 401 | ⚠️ | `{"success": false, "requestId": "7c9fb4a0-eb15-4c7` |
| **POST** | `/api/admin/users` | 401 | ⚠️ | `{"success": false, "requestId": "621ff9e5-9ba4-4cc` |
| **GET** | `/api/admin/users/all` | 401 | ⚠️ | `{"success": false, "requestId": "c8a33e12-961c-4c1` |
| **PUT** | `/api/admin/users/all/<user_id>` | 401 | ⚠️ | `{"success": false, "requestId": "5f869bf6-08c7-4a4` |
| **POST** | `/api/affiliate` | 400 | ⚠️ | `{"error": "Email and password are required", "succ` |
| **PATCH** | `/api/affiliate/<int:affiliate_id>` | 200 | ✅ | `{"success": true, "requestId": "71245ab7-e345-4816` |
| **GET** | `/api/affiliate/<int:affiliate_id>/commissions` | 200 | ✅ | `{"success": true, "requestId": "529de10e-aba2-41e4` |
| **GET** | `/api/affiliate/<int:affiliate_id>/details` | 200 | ✅ | `{"data": {"account_holder_name": null, "code": "65` |
| **PATCH** | `/api/affiliate/<int:affiliate_id>/toggle-status` | 200 | ✅ | `{"data": {"id": 1, "is_active": false, "message": ` |
| **GET** | `/api/affiliate/list` | 200 | ✅ | `{"success": true, "requestId": "b364a1b5-6f52-4897` |
| **POST** | `/api/affiliate/login` | 400 | ⚠️ | `{"error": "email and password required", "success"` |
| **GET** | `/api/affiliate/lookup` | 400 | ⚠️ | `{"error": "Code required", "success": false, "requ` |
| **GET** | `/api/affiliate/me` | 400 | ⚠️ | `{"error": "affiliate_id required", "success": fals` |
| **POST** | `/api/affiliate/register` | 400 | ⚠️ | `{"error": "email and password required", "success"` |
| **GET** | `/api/affiliates/check/<code>` | 404 | ⚠️ | `{"message": "Affiliate not found", "success": fals` |
| **GET** | `/api/appointments` | 401 | ⚠️ | `{"success": false, "requestId": "2fffeadb-45ba-42e` |
| **POST** | `/api/appointments` | 401 | ⚠️ | `{"success": false, "requestId": "db114992-14c1-48c` |
| **DELETE** | `/api/appointments/<appointment_id>` | 401 | ⚠️ | `{"success": false, "requestId": "97530dd6-13dc-481` |
| **GET** | `/api/appointments/<appointment_id>` | 401 | ⚠️ | `{"success": false, "requestId": "e43f418c-2371-483` |
| **PATCH** | `/api/appointments/<appointment_id>` | 401 | ⚠️ | `{"success": false, "requestId": "6b65d704-0838-478` |
| **PUT** | `/api/appointments/<appointment_id>` | 401 | ⚠️ | `{"success": false, "requestId": "bee737e4-58e4-4c6` |
| **POST** | `/api/appointments/<appointment_id>/cancel` | 401 | ⚠️ | `{"success": false, "requestId": "097bb400-8190-496` |
| **POST** | `/api/appointments/<appointment_id>/complete` | 401 | ⚠️ | `{"success": false, "requestId": "dd98fdec-f956-4e7` |
| **POST** | `/api/appointments/<appointment_id>/reschedule` | 401 | ⚠️ | `{"success": false, "requestId": "59c3d491-4af5-432` |
| **GET** | `/api/appointments/availability` | 401 | ⚠️ | `{"success": false, "requestId": "47e78178-8ccc-41d` |
| **GET** | `/api/appointments/list` | 401 | ⚠️ | `{"success": false, "requestId": "08b2e68a-fefe-40a` |
| **POST** | `/api/auth/forgot-password` | 400 | ⚠️ | `{"error": "CAPTCHA required", "success": false, "r` |
| **POST** | `/api/auth/login` | 401 | ⚠️ | `{"error": "Invalid credentials", "success": false,` |
| **POST** | `/api/auth/lookup-phone` | 400 | ⚠️ | `{"error": "Identifier required", "success": false,` |
| **POST** | `/api/auth/refresh` | 401 | ⚠️ | `{"success": false, "requestId": "25a238bd-12a2-4b5` |
| **POST** | `/api/auth/reset-password` | 400 | ⚠️ | `{"error": "Invalid or expired OTP", "success": fal` |
| **POST** | `/api/auth/send-verification-otp` | 401 | ⚠️ | `{"success": false, "requestId": "04184eba-17f7-4e1` |
| **POST** | `/api/auth/set-password` | 401 | ⚠️ | `{"success": false, "requestId": "b698ac72-bdf0-471` |
| **POST** | `/api/auth/verify-otp` | 400 | ⚠️ | `{"error": "Identifier/Token and OTP required", "su` |
| **POST** | `/api/automation/backup` | 200 | ✅ | `{"jobId": "backup_job_04012026144520", "message": ` |
| **GET** | `/api/automation/logs` | 200 | ✅ | `{"data": [{"id": "log_001", "level": "info", "mess` |
| **POST** | `/api/automation/sgk/process` | 200 | ✅ | `{"jobId": "sgk_job_04012026_144520", "message": "S` |
| **GET** | `/api/automation/status` | 200 | ✅ | `{"automation": {"backup": {"lastBackupSize": "2.5G` |
| **POST** | `/api/birfatura/sync-invoices` | 401 | ⚠️ | `{"success": false, "requestId": "dcc2c1e1-d86c-4a4` |
| **GET** | `/api/branches` | 401 | ⚠️ | `{"success": false, "requestId": "8bafb47e-3e38-40d` |
| **POST** | `/api/branches` | 401 | ⚠️ | `{"success": false, "requestId": "93217ba1-648a-4df` |
| **DELETE** | `/api/branches/<branch_id>` | 401 | ⚠️ | `{"success": false, "requestId": "f20662b3-98c9-4fd` |
| **PUT** | `/api/branches/<branch_id>` | 401 | ⚠️ | `{"success": false, "requestId": "d3100a8d-469a-4a6` |
| **GET** | `/api/campaigns` | 401 | ⚠️ | `{"success": false, "requestId": "f1574b73-ca8b-4c6` |
| **POST** | `/api/campaigns` | 401 | ⚠️ | `{"success": false, "requestId": "853eced9-f47f-408` |
| **POST** | `/api/campaigns/<campaign_id>/send` | 401 | ⚠️ | `{"success": false, "requestId": "f11931bf-0150-4d4` |
| **GET** | `/api/cash-records` | 401 | ⚠️ | `{"success": false, "requestId": "76a871f1-a36d-492` |
| **POST** | `/api/cash-records` | 401 | ⚠️ | `{"success": false, "requestId": "c8f95c6f-c91a-4f2` |
| **DELETE** | `/api/cash-records/<record_id>` | 401 | ⚠️ | `{"success": false, "requestId": "be2dc5df-504d-42d` |
| **POST** | `/api/checkout/confirm` | 404 | ⚠️ | `{"message": "Payment not found", "success": false,` |
| **POST** | `/api/checkout/session` | 400 | ⚠️ | `{"message": "Missing required fields", "success": ` |
| **GET** | `/api/communications/history` | 200 | ✅ | `{"data": [], "meta": {"page": 1, "perPage": 20, "t` |
| **POST** | `/api/communications/history` | 400 | ⚠️ | `{"error": "Missing required field: patientId", "su` |
| **GET** | `/api/communications/messages` | 200 | ✅ | `{"data": [], "meta": {"page": 1, "perPage": 20, "t` |
| **POST** | `/api/communications/messages/send-email` | 400 | ⚠️ | `{"error": "Missing required field: toEmail", "succ` |
| **POST** | `/api/communications/messages/send-sms` | 400 | ⚠️ | `{"error": "Missing required field: phoneNumber", "` |
| **GET** | `/api/communications/stats` | 200 | ✅ | `{"data": {"email": {"failed": 0, "sent": 0, "succe` |
| **GET** | `/api/communications/templates` | 200 | ✅ | `{"data": [], "meta": {"page": 1, "perPage": 20, "t` |
| **POST** | `/api/communications/templates` | 400 | ⚠️ | `{"error": "Missing required field: templateType", ` |
| **DELETE** | `/api/communications/templates/<template_id>` | 404 | ⚠️ | `{"error": "Template not found", "success": false, ` |
| **GET** | `/api/communications/templates/<template_id>` | 404 | ⚠️ | `{"error": "Template not found", "success": false, ` |
| **PUT** | `/api/communications/templates/<template_id>` | 404 | ⚠️ | `{"error": "Template not found", "success": false, ` |
| **GET** | `/api/config` | 200 | ✅ | `{"data": {"adminPanelUrl": "/admin-panel/"}, "succ` |
| **GET** | `/api/config/turnstile` | 200 | ✅ | `{"siteKey": "0x4AAAAAAA1234567890ABCDEF", "success` |
| **GET** | `/api/dashboard` | 401 | ⚠️ | `{"success": false, "requestId": "0f063acb-5dee-46e` |
| **GET** | `/api/dashboard/charts/patient-distribution` | 401 | ⚠️ | `{"success": false, "requestId": "ae172c97-a9e8-472` |
| **GET** | `/api/dashboard/charts/patient-trends` | 401 | ⚠️ | `{"success": false, "requestId": "d2241805-4a07-45c` |
| **GET** | `/api/dashboard/charts/revenue-trends` | 401 | ⚠️ | `{"success": false, "requestId": "f1cf0034-8c70-4e5` |
| **GET** | `/api/dashboard/kpis` | 401 | ⚠️ | `{"success": false, "requestId": "035a298f-370f-4ba` |
| **GET** | `/api/dashboard/recent-activity` | 401 | ⚠️ | `{"success": false, "requestId": "e84672e3-9d13-4f5` |
| **PATCH** | `/api/device-assignments/<assignment_id>` | 404 | ⚠️ | `{"error": "Device assignment not found", "success"` |
| **POST** | `/api/device-assignments/<assignment_id>/return-loaner` | 401 | ⚠️ | `{"success": false, "requestId": "054d97d7-8110-4ea` |
| **GET** | `/api/devices` | 401 | ⚠️ | `{"success": false, "requestId": "cd755764-fafd-477` |
| **POST** | `/api/devices` | 401 | ⚠️ | `{"success": false, "requestId": "5b911644-7deb-474` |
| **DELETE** | `/api/devices/<device_id>` | 401 | ⚠️ | `{"success": false, "requestId": "e048779b-ae67-4c5` |
| **GET** | `/api/devices/<device_id>` | 401 | ⚠️ | `{"success": false, "requestId": "96dda4a4-6d0e-401` |
| **PATCH** | `/api/devices/<device_id>` | 401 | ⚠️ | `{"success": false, "requestId": "5bd02b1d-4880-483` |
| **PUT** | `/api/devices/<device_id>` | 401 | ⚠️ | `{"success": false, "requestId": "72e3a2ed-d428-4a1` |
| **POST** | `/api/devices/<device_id>/stock-update` | 401 | ⚠️ | `{"success": false, "requestId": "b4272290-327e-4e9` |
| **GET** | `/api/devices/brands` | 401 | ⚠️ | `{"success": false, "requestId": "0cd3c29a-51af-4d3` |
| **POST** | `/api/devices/brands` | 401 | ⚠️ | `{"success": false, "requestId": "973d63de-7854-44b` |
| **GET** | `/api/devices/categories` | 401 | ⚠️ | `{"success": false, "requestId": "7ee58b98-4cf6-4d8` |
| **GET** | `/api/devices/low-stock` | 401 | ⚠️ | `{"success": false, "requestId": "6d5fbc50-0db8-4d6` |
| **GET** | `/api/health` | 200 | ✅ | `{"database_connected": true, "db_read_ok": true, "` |
| **GET** | `/api/inventory` | 401 | ⚠️ | `{"success": false, "requestId": "cdcaa145-f918-4e5` |
| **POST** | `/api/inventory` | 401 | ⚠️ | `{"success": false, "requestId": "3f8c6dcd-8c45-448` |
| **DELETE** | `/api/inventory/<item_id>` | 401 | ⚠️ | `{"success": false, "requestId": "20bacbcc-fb9e-4af` |
| **GET** | `/api/inventory/<item_id>` | 401 | ⚠️ | `{"success": false, "requestId": "bab63905-2f3f-4de` |
| **PATCH** | `/api/inventory/<item_id>` | 401 | ⚠️ | `{"success": false, "requestId": "5a85eecc-87fb-45d` |
| **PUT** | `/api/inventory/<item_id>` | 401 | ⚠️ | `{"success": false, "requestId": "57d735f0-1e12-45e` |
| **GET** | `/api/inventory/<item_id>/activity` | 401 | ⚠️ | `{"success": false, "requestId": "1fdf20c9-3e17-4ea` |
| **GET** | `/api/inventory/<item_id>/movements` | 401 | ⚠️ | `{"success": false, "requestId": "9fb8ab94-2cae-44c` |
| **POST** | `/api/inventory/<item_id>/serials` | 401 | ⚠️ | `{"success": false, "requestId": "2ed3c558-57bc-468` |
| **GET** | `/api/inventory/brands` | 401 | ⚠️ | `{"success": false, "requestId": "d7c7c4ce-0f53-4e8` |
| **POST** | `/api/inventory/brands` | 401 | ⚠️ | `{"success": false, "requestId": "d0b5722f-e112-495` |
| **POST** | `/api/inventory/bulk_upload` | 401 | ⚠️ | `{"success": false, "requestId": "e11ac17c-33f1-478` |
| **GET** | `/api/inventory/categories` | 401 | ⚠️ | `{"success": false, "requestId": "75efc08d-9ca0-44a` |
| **POST** | `/api/inventory/categories` | 401 | ⚠️ | `{"success": false, "requestId": "4f2ebbbe-3ace-4ad` |
| **GET** | `/api/inventory/low-stock` | 401 | ⚠️ | `{"success": false, "requestId": "2f7eeff4-3ff9-47d` |
| **GET** | `/api/inventory/search` | 401 | ⚠️ | `{"success": false, "requestId": "c0c9c187-8d6b-4ef` |
| **GET** | `/api/inventory/stats` | 401 | ⚠️ | `{"success": false, "requestId": "18c5f7d3-4498-42b` |
| **GET** | `/api/inventory/units` | 401 | ⚠️ | `{"success": false, "requestId": "48f4681c-4494-49e` |
| **GET** | `/api/invoices` | 401 | ⚠️ | `{"success": false, "requestId": "581f601e-1687-467` |
| **POST** | `/api/invoices` | 401 | ⚠️ | `{"success": false, "requestId": "1cd0bea8-f171-49b` |
| **GET** | `/api/invoices/<int:invoice_id>` | 401 | ⚠️ | `{"success": false, "requestId": "b6690685-f01c-4de` |
| **POST** | `/api/invoices/<int:invoice_id>/copy` | 500 | ❌ | `{"error": "(sqlite3.IntegrityError) NOT NULL const` |
| **POST** | `/api/invoices/<int:invoice_id>/copy-cancel` | 500 | ❌ | `{"error": "(sqlite3.IntegrityError) NOT NULL const` |
| **POST** | `/api/invoices/<int:invoice_id>/issue` | 500 | ❌ | `{"error": "(sqlite3.IntegrityError) NOT NULL const` |
| **GET** | `/api/invoices/<int:invoice_id>/pdf` | 404 | ⚠️ | `{"error": "Example PDF not available", "success": ` |
| **GET** | `/api/invoices/<int:invoice_id>/shipping-pdf` | 404 | ⚠️ | `{"error": "Shipping PDF not available", "success":` |
| **POST** | `/api/invoices/batch-generate` | 401 | ⚠️ | `{"success": false, "requestId": "a81dde22-148d-47a` |
| **POST** | `/api/invoices/bulk_upload` | 401 | ⚠️ | `{"success": false, "requestId": "b5f6772e-6cf4-442` |
| **GET** | `/api/invoices/print-queue` | 401 | ⚠️ | `{"success": false, "requestId": "640e090e-87ba-4d4` |
| **POST** | `/api/invoices/print-queue` | 401 | ⚠️ | `{"success": false, "requestId": "3127f76f-bb3e-428` |
| **GET** | `/api/invoices/templates` | 401 | ⚠️ | `{"success": false, "requestId": "5fe92782-f331-409` |
| **POST** | `/api/invoices/templates` | 401 | ⚠️ | `{"success": false, "requestId": "83af1173-7a24-457` |
| **GET** | `/api/notifications` | 400 | ⚠️ | `{"error": "user_id required", "success": false, "r` |
| **POST** | `/api/notifications` | 500 | ❌ | `{"error": "(sqlite3.IntegrityError) NOT NULL const` |
| **DELETE** | `/api/notifications/<notification_id>` | 404 | ⚠️ | `{"error": "Notification not found", "success": fal` |
| **PUT** | `/api/notifications/<notification_id>/read` | 404 | ⚠️ | `{"error": "Notification not found", "success": fal` |
| **GET** | `/api/notifications/settings` | 400 | ⚠️ | `{"error": "user_id required", "success": false, "r` |
| **PUT** | `/api/notifications/settings` | 400 | ⚠️ | `{"error": "userId and preferences required", "succ` |
| **GET** | `/api/notifications/stats` | 400 | ⚠️ | `{"error": "user_id required", "success": false, "r` |
| **POST** | `/api/ocr/debug_ner` | 401 | ⚠️ | `{"success": false, "requestId": "e7c15e0b-89fe-462` |
| **POST** | `/api/ocr/entities` | 401 | ⚠️ | `{"success": false, "requestId": "1991e79e-64d8-4b2` |
| **POST** | `/api/ocr/extract_patient` | 401 | ⚠️ | `{"success": false, "requestId": "30d62503-062f-407` |
| **GET** | `/api/ocr/health` | 200 | ✅ | `{"data": {"database_connected": true, "hf_ner_avai` |
| **POST** | `/api/ocr/init-db` | 401 | ⚠️ | `{"success": false, "requestId": "20b7093a-b788-40b` |
| **POST** | `/api/ocr/initialize` | 401 | ⚠️ | `{"success": false, "requestId": "bca7eaf2-311f-4cb` |
| **GET** | `/api/ocr/jobs` | 401 | ⚠️ | `{"success": false, "requestId": "ecc3b6a5-e1e4-440` |
| **POST** | `/api/ocr/jobs` | 401 | ⚠️ | `{"success": false, "requestId": "882d3392-845f-460` |
| **POST** | `/api/ocr/process` | 401 | ⚠️ | `{"success": false, "requestId": "70809685-44b3-450` |
| **POST** | `/api/ocr/process` | 401 | ⚠️ | `{"success": false, "requestId": "98dd762a-da59-49a` |
| **POST** | `/api/ocr/similarity` | 401 | ⚠️ | `{"success": false, "requestId": "a4888432-d0ff-4a4` |
| **GET** | `/api/openapi.yaml` | 404 | ⚠️ | `{"error": "OpenAPI contract not available", "succe` |
| **GET** | `/api/patients` | 401 | ⚠️ | `{"success": false, "requestId": "b394b0be-0102-454` |
| **POST** | `/api/patients` | 401 | ⚠️ | `{"success": false, "requestId": "257c3229-6940-415` |
| **DELETE** | `/api/patients/<patient_id>` | 401 | ⚠️ | `{"success": false, "requestId": "808fa144-a676-46c` |
| **GET** | `/api/patients/<patient_id>` | 401 | ⚠️ | `{"success": false, "requestId": "10a728dc-0f06-4b0` |
| **PATCH** | `/api/patients/<patient_id>` | 401 | ⚠️ | `{"success": false, "requestId": "050a8f3a-2ff6-431` |
| **PUT** | `/api/patients/<patient_id>` | 401 | ⚠️ | `{"success": false, "requestId": "ea969f74-b1aa-431` |
| **POST** | `/api/patients/<patient_id>/activities` | 404 | ⚠️ | `{"error": "Patient not found", "success": false, "` |
| **GET** | `/api/patients/<patient_id>/appointments` | 404 | ⚠️ | `{"error": "Patient not found", "success": false, "` |
| **POST** | `/api/patients/<patient_id>/assign-devices-extended` | 400 | ⚠️ | `{"error": "At least one device assignment required` |
| **GET** | `/api/patients/<patient_id>/devices` | 401 | ⚠️ | `{"success": false, "requestId": "3d80fa1e-e985-49a` |
| **GET** | `/api/patients/<patient_id>/devices` | 401 | ⚠️ | `{"success": false, "requestId": "c69a2c73-e4dc-451` |
| **GET** | `/api/patients/<patient_id>/documents` | 404 | ⚠️ | `{"error": "Patient not found", "success": false, "` |
| **POST** | `/api/patients/<patient_id>/documents` | 404 | ⚠️ | `{"error": "Patient not found", "success": false, "` |
| **DELETE** | `/api/patients/<patient_id>/documents/<document_id>` | 404 | ⚠️ | `{"error": "Patient not found", "success": false, "` |
| **GET** | `/api/patients/<patient_id>/documents/<document_id>` | 404 | ⚠️ | `{"error": "Patient not found", "success": false, "` |
| **GET** | `/api/patients/<patient_id>/ereceipts` | 404 | ⚠️ | `{"success": false, "requestId": "5c4cc488-2941-41c` |
| **POST** | `/api/patients/<patient_id>/ereceipts` | 201 | ✅ | `{"message": "E-receipt created", "success": true, ` |
| **POST** | `/api/patients/<patient_id>/ereceipts` | 201 | ✅ | `{"message": "E-receipt created", "success": true, ` |
| **DELETE** | `/api/patients/<patient_id>/ereceipts/<ereceipt_id>` | 404 | ⚠️ | `{"success": false, "requestId": "da106459-fa0d-488` |
| **PUT** | `/api/patients/<patient_id>/ereceipts/<ereceipt_id>` | 404 | ⚠️ | `{"success": false, "requestId": "78978c7d-b73d-494` |
| **GET** | `/api/patients/<patient_id>/hearing-tests` | 404 | ⚠️ | `{"success": false, "requestId": "734c3558-f370-461` |
| **POST** | `/api/patients/<patient_id>/hearing-tests` | 404 | ⚠️ | `{"success": false, "requestId": "b09e218a-3e1a-433` |
| **DELETE** | `/api/patients/<patient_id>/hearing-tests/<test_id>` | 404 | ⚠️ | `{"success": false, "requestId": "cf01eee9-309e-4f8` |
| **PUT** | `/api/patients/<patient_id>/hearing-tests/<test_id>` | 404 | ⚠️ | `{"success": false, "requestId": "4e92d972-1e32-403` |
| **GET** | `/api/patients/<patient_id>/invoices` | 401 | ⚠️ | `{"success": false, "requestId": "692fef48-2159-4ee` |
| **GET** | `/api/patients/<patient_id>/notes` | 404 | ⚠️ | `{"success": false, "requestId": "9c71dcec-f913-44b` |
| **POST** | `/api/patients/<patient_id>/notes` | 404 | ⚠️ | `{"success": false, "requestId": "ec71876d-4c9f-4ba` |
| **DELETE** | `/api/patients/<patient_id>/notes/<note_id>` | 404 | ⚠️ | `{"success": false, "requestId": "c7197556-91f2-416` |
| **PUT** | `/api/patients/<patient_id>/notes/<note_id>` | 404 | ⚠️ | `{"success": false, "requestId": "2d5efaa7-bccd-451` |
| **GET** | `/api/patients/<patient_id>/payment-records` | 401 | ⚠️ | `{"success": false, "requestId": "9fd9b3ed-b7ee-4a6` |
| **POST** | `/api/patients/<patient_id>/product-sales` | 401 | ⚠️ | `{"success": false, "requestId": "ea83d97e-df2a-472` |
| **GET** | `/api/patients/<patient_id>/promissory-notes` | 401 | ⚠️ | `{"success": false, "requestId": "91c78122-7491-458` |
| **GET** | `/api/patients/<patient_id>/replacements` | 401 | ⚠️ | `{"success": false, "requestId": "4d2acc07-e824-41a` |
| **POST** | `/api/patients/<patient_id>/replacements` | 401 | ⚠️ | `{"success": false, "requestId": "0611559f-5ce2-488` |
| **GET** | `/api/patients/<patient_id>/sales` | 401 | ⚠️ | `{"success": false, "requestId": "dbe607fd-c0bb-4ec` |
| **GET** | `/api/patients/<patient_id>/sales` | 401 | ⚠️ | `{"success": false, "requestId": "7711a211-ec05-480` |
| **PATCH** | `/api/patients/<patient_id>/sales/<sale_id>` | 401 | ⚠️ | `{"success": false, "requestId": "4b03e9da-740e-4cb` |
| **GET** | `/api/patients/<patient_id>/sgk-documents` | 404 | ⚠️ | `{"error": "Patient not found", "success": false, "` |
| **GET** | `/api/patients/<patient_id>/timeline` | 404 | ⚠️ | `{"error": "Patient not found", "success": false, "` |
| **POST** | `/api/patients/<patient_id>/timeline` | 404 | ⚠️ | `{"error": "Patient not found", "success": false, "` |
| **DELETE** | `/api/patients/<patient_id>/timeline/<event_id>` | 404 | ⚠️ | `{"error": "Patient not found", "success": false, "` |
| **POST** | `/api/patients/bulk_upload` | 401 | ⚠️ | `{"success": false, "requestId": "f1125080-db56-4c5` |
| **GET** | `/api/patients/count` | 401 | ⚠️ | `{"success": false, "requestId": "200009af-c550-435` |
| **GET** | `/api/patients/export` | 401 | ⚠️ | `{"success": false, "requestId": "7625c61e-5e5d-4d0` |
| **GET** | `/api/patients/search` | 401 | ⚠️ | `{"success": false, "requestId": "966553fb-41ee-40a` |
| **POST** | `/api/payment-records` | 401 | ⚠️ | `{"success": false, "requestId": "13ca140b-077c-4be` |
| **PATCH** | `/api/payment-records/<record_id>` | 401 | ⚠️ | `{"success": false, "requestId": "5f8f728e-c4f4-400` |
| **POST** | `/api/payments/pos/paytr/callback` | 200 | ✅ | `OK` |
| **GET** | `/api/payments/pos/paytr/config` | 401 | ⚠️ | `{"success": false, "requestId": "0f2f549e-925b-461` |
| **PUT** | `/api/payments/pos/paytr/config` | 401 | ⚠️ | `{"success": false, "requestId": "d53294bb-4a8d-423` |
| **POST** | `/api/payments/pos/paytr/initiate` | 401 | ⚠️ | `{"success": false, "requestId": "78853017-1547-458` |
| **GET** | `/api/payments/pos/transactions` | 401 | ⚠️ | `{"success": false, "requestId": "27770f6b-ba4f-49b` |
| **GET** | `/api/permissions` | 401 | ⚠️ | `{"success": false, "requestId": "a8ce9dfb-eded-41e` |
| **POST** | `/api/permissions` | 401 | ⚠️ | `{"success": false, "requestId": "95346d04-f82c-4b0` |
| **GET** | `/api/permissions/my` | 401 | ⚠️ | `{"success": false, "requestId": "91dbcab2-e64d-42b` |
| **GET** | `/api/permissions/role/<role_name>` | 401 | ⚠️ | `{"success": false, "requestId": "f7300911-1a96-4c8` |
| **PUT** | `/api/permissions/role/<role_name>` | 401 | ⚠️ | `{"success": false, "requestId": "daab8a7f-6c26-428` |
| **GET** | `/api/plans` | 200 | ✅ | `{"data": [{"billing_interval": "MONTHLY", "created` |
| **POST** | `/api/plans` | 401 | ⚠️ | `{"success": false, "requestId": "b47e2849-7005-42d` |
| **PUT** | `/api/plans/<plan_id>` | 401 | ⚠️ | `{"success": false, "requestId": "f42a755d-baed-415` |
| **GET** | `/api/plans/admin` | 401 | ⚠️ | `{"success": false, "requestId": "cb7893bd-5944-45b` |
| **POST** | `/api/pos/commission/calculate` | 401 | ⚠️ | `{"success": false, "requestId": "4ea274eb-5dbc-40f` |
| **POST** | `/api/pos/commission/installment-options` | 401 | ⚠️ | `{"success": false, "requestId": "68e7854f-3369-4c7` |
| **GET** | `/api/pos/commission/rates` | 401 | ⚠️ | `{"success": false, "requestId": "918c8ca7-000a-483` |
| **GET** | `/api/pos/commission/rates/system` | 401 | ⚠️ | `{"success": false, "requestId": "fdafd8ff-8184-497` |
| **PUT** | `/api/pos/commission/rates/system` | 401 | ⚠️ | `{"success": false, "requestId": "53c58eb9-5590-422` |
| **GET** | `/api/pos/commission/rates/tenant/<tenant_id>` | 401 | ⚠️ | `{"success": false, "requestId": "59e116db-3770-4db` |
| **PUT** | `/api/pos/commission/rates/tenant/<tenant_id>` | 401 | ⚠️ | `{"success": false, "requestId": "56187bba-c8f5-465` |
| **POST** | `/api/pricing-preview` | 200 | ✅ | `{"pricing": {"patient_responsible_amount": 0.0, "p` |
| **DELETE** | `/api/product-suppliers/<int:ps_id>` | 401 | ⚠️ | `{"success": false, "requestId": "352e0720-b5ec-467` |
| **PUT** | `/api/product-suppliers/<int:ps_id>` | 401 | ⚠️ | `{"success": false, "requestId": "5af3f566-a921-432` |
| **GET** | `/api/products/<product_id>/suppliers` | 401 | ⚠️ | `{"success": false, "requestId": "86e203ce-4f95-4ae` |
| **POST** | `/api/products/<product_id>/suppliers` | 401 | ⚠️ | `{"success": false, "requestId": "cf302b29-282c-44e` |
| **POST** | `/api/promissory-notes` | 401 | ⚠️ | `{"success": false, "requestId": "59a1cc84-f9dd-466` |
| **PATCH** | `/api/promissory-notes/<note_id>` | 401 | ⚠️ | `{"success": false, "requestId": "70dbd895-9558-450` |
| **POST** | `/api/promissory-notes/<note_id>/collect` | 401 | ⚠️ | `{"success": false, "requestId": "f6a9e687-a724-472` |
| **POST** | `/api/register-phone` | 400 | ⚠️ | `{"message": "Phone required", "success": false, "r` |
| **GET** | `/api/replacements/<replacement_id>` | 401 | ⚠️ | `{"success": false, "requestId": "b7093f6f-d1a4-499` |
| **POST** | `/api/replacements/<replacement_id>/invoice` | 401 | ⚠️ | `{"success": false, "requestId": "9ca7803b-788a-413` |
| **PATCH** | `/api/replacements/<replacement_id>/status` | 401 | ⚠️ | `{"success": false, "requestId": "207e9062-7c97-40b` |
| **GET** | `/api/reports/appointments` | 401 | ⚠️ | `{"success": false, "requestId": "c95b56b4-fa8b-451` |
| **GET** | `/api/reports/campaigns` | 401 | ⚠️ | `{"success": false, "requestId": "8f79003a-5387-421` |
| **GET** | `/api/reports/cashflow-summary` | 401 | ⚠️ | `{"success": false, "requestId": "26059842-9ee0-473` |
| **GET** | `/api/reports/financial` | 401 | ⚠️ | `{"success": false, "requestId": "be125b7c-fe21-4e3` |
| **GET** | `/api/reports/overview` | 401 | ⚠️ | `{"success": false, "requestId": "b5f367d2-0668-468` |
| **GET** | `/api/reports/patients` | 401 | ⚠️ | `{"success": false, "requestId": "a45c6b6e-0f6b-465` |
| **GET** | `/api/reports/pos-movements` | 401 | ⚠️ | `{"success": false, "requestId": "b173d94c-6441-4d1` |
| **GET** | `/api/reports/promissory-notes` | 401 | ⚠️ | `{"success": false, "requestId": "cb0e1a87-8ae1-401` |
| **GET** | `/api/reports/promissory-notes/by-patient` | 401 | ⚠️ | `{"success": false, "requestId": "620914ab-a361-4f1` |
| **GET** | `/api/reports/promissory-notes/list` | 401 | ⚠️ | `{"success": false, "requestId": "e92dbd2d-ee4c-4de` |
| **GET** | `/api/reports/remaining-payments` | 401 | ⚠️ | `{"success": false, "requestId": "a9c004d1-3146-4e1` |
| **GET** | `/api/reports/revenue` | 401 | ⚠️ | `{"success": false, "requestId": "43b81251-25b0-476` |
| **POST** | `/api/return-invoices/<invoice_id>/send-to-gib` | 401 | ⚠️ | `{"success": false, "requestId": "dd5092f3-ed81-419` |
| **GET** | `/api/roles` | 401 | ⚠️ | `{"success": false, "requestId": "58d9ac01-41ea-456` |
| **POST** | `/api/roles` | 401 | ⚠️ | `{"success": false, "requestId": "d1653f90-1db5-4ab` |
| **DELETE** | `/api/roles/<role_id>` | 401 | ⚠️ | `{"success": false, "requestId": "6d4802e9-f1c0-4ae` |
| **PUT** | `/api/roles/<role_id>` | 401 | ⚠️ | `{"success": false, "requestId": "fdab0de0-c54e-46a` |
| **POST** | `/api/roles/<role_id>/permissions` | 401 | ⚠️ | `{"success": false, "requestId": "15d89500-8ded-473` |
| **DELETE** | `/api/roles/<role_id>/permissions/<permission_id>` | 401 | ⚠️ | `{"success": false, "requestId": "a8eb288c-f9cf-427` |
| **GET** | `/api/sales` | 401 | ⚠️ | `{"success": false, "requestId": "b15dc980-184d-440` |
| **POST** | `/api/sales` | 401 | ⚠️ | `{"success": false, "requestId": "32b395ea-f58e-4aa` |
| **PATCH** | `/api/sales/<sale_id>` | 401 | ⚠️ | `{"success": false, "requestId": "62224218-c7a0-464` |
| **PUT** | `/api/sales/<sale_id>` | 401 | ⚠️ | `{"success": false, "requestId": "06d18581-c9cd-42b` |
| **POST** | `/api/sales/<sale_id>/installments/<installment_id>/pay` | 404 | ⚠️ | `{"error": "Sale not found", "success": false, "req` |
| **POST** | `/api/sales/<sale_id>/invoice` | 401 | ⚠️ | `{"success": false, "requestId": "6777fbaf-ac57-4e2` |
| **GET** | `/api/sales/<sale_id>/payment-plan` | 404 | ⚠️ | `{"error": "Sale not found", "success": false, "req` |
| **POST** | `/api/sales/<sale_id>/payment-plan` | 401 | ⚠️ | `{"success": false, "requestId": "dfe8a5a0-b037-49c` |
| **GET** | `/api/sales/<sale_id>/payments` | 404 | ⚠️ | `{"error": "Sale not found", "success": false, "req` |
| **POST** | `/api/sales/<sale_id>/payments` | 404 | ⚠️ | `{"error": "Sale not found", "success": false, "req` |
| **GET** | `/api/sales/<sale_id>/promissory-notes` | 401 | ⚠️ | `{"success": false, "requestId": "ce4f195b-ccb6-454` |
| **POST** | `/api/sales/logs` | 401 | ⚠️ | `{"success": false, "requestId": "1010140d-e41e-4c4` |
| **POST** | `/api/sales/recalc` | 200 | ✅ | `{"errors": [], "processed": 0, "success": true, "t` |
| **GET** | `/api/settings` | 200 | ✅ | `{"settings": {"company": {"address": "Atat\u00fcrk` |
| **PATCH** | `/api/settings` | 401 | ⚠️ | `{"success": false, "requestId": "62b3bce0-91c0-443` |
| **POST** | `/api/settings` | 200 | ✅ | `{"settings": {"company": {"address": "Atat\u00fcrk` |
| **PUT** | `/api/settings` | 400 | ⚠️ | `{"error": "Missing settings_id parameter", "succes` |
| **GET** | `/api/settings/pricing` | 200 | ✅ | `{"data": {}, "success": true, "timestamp": "2026-0` |
| **GET** | `/api/sgk/documents` | 200 | ✅ | `{"count": 0, "documents": [], "success": true, "ti` |
| **POST** | `/api/sgk/documents` | 400 | ⚠️ | `{"error": "Missing required field: patientId", "su` |
| **DELETE** | `/api/sgk/documents/<document_id>` | 404 | ⚠️ | `{"error": "SGK document model not available", "suc` |
| **GET** | `/api/sgk/documents/<document_id>` | 404 | ⚠️ | `{"error": "SGK document model not available", "suc` |
| **POST** | `/api/sgk/e-receipt/query` | 400 | ⚠️ | `{"error": "E-re\u00e7ete numaras\u0131 gerekli", "` |
| **GET** | `/api/sgk/e-receipts/<receipt_id>/download-patient-form` | 200 | ✅ | `Dummy PDF Content` |
| **POST** | `/api/sgk/patient-rights/query` | 400 | ⚠️ | `{"error": "TC numaras\u0131 gerekli", "success": f` |
| **POST** | `/api/sgk/seed-test-patients` | 400 | ⚠️ | `{"error": "Images directory not found: /Users/omer` |
| **POST** | `/api/sgk/upload` | 400 | ⚠️ | `{"error": "No files provided. Use form field name ` |
| **GET** | `/api/sgk/workflow/<workflow_id>` | 200 | ✅ | `{"data": {"createdAt": "2024-01-10T09:00:00Z", "cu` |
| **PUT** | `/api/sgk/workflow/<workflow_id>/update` | 400 | ⚠️ | `{"error": "Step ID ve status gerekli", "success": ` |
| **POST** | `/api/sgk/workflow/create` | 404 | ⚠️ | `{"error": "Hasta bulunamad\u0131", "success": fals` |
| **PUT** | `/api/sgk/workflows/<workflow_id>/status` | 200 | ✅ | `{"message": "Status updated", "success": true, "re` |
| **GET** | `/api/sms-packages` | 200 | ✅ | `{"data": [{"created_at": "2026-01-01T20:33:28.5177` |
| **GET** | `/api/sms/audiences` | 401 | ⚠️ | `{"success": false, "requestId": "0df66f98-c875-44d` |
| **POST** | `/api/sms/audiences` | 401 | ⚠️ | `{"success": false, "requestId": "953e9e75-998b-402` |
| **POST** | `/api/sms/audiences/upload` | 401 | ⚠️ | `{"success": false, "requestId": "ce9b9666-f8b0-497` |
| **GET** | `/api/sms/config` | 401 | ⚠️ | `{"success": false, "requestId": "3b87a29a-debd-410` |
| **PUT** | `/api/sms/config` | 401 | ⚠️ | `{"success": false, "requestId": "597f9c33-7ffe-4c4` |
| **GET** | `/api/sms/credit` | 401 | ⚠️ | `{"success": false, "requestId": "f834e304-dba1-474` |
| **DELETE** | `/api/sms/documents/<document_type>` | 401 | ⚠️ | `{"success": false, "requestId": "7358cafa-320b-44a` |
| **GET** | `/api/sms/documents/<document_type>/download` | 401 | ⚠️ | `{"success": false, "requestId": "72a9f176-c45f-451` |
| **GET** | `/api/sms/documents/file/<path:filepath>` | 404 | ⚠️ | `{"error": {"code": "NOT_FOUND", "message": "File n` |
| **POST** | `/api/sms/documents/submit` | 401 | ⚠️ | `{"success": false, "requestId": "c22c318e-37f6-493` |
| **POST** | `/api/sms/documents/upload` | 401 | ⚠️ | `{"success": false, "requestId": "68d3a1a8-be49-48a` |
| **GET** | `/api/sms/headers` | 401 | ⚠️ | `{"success": false, "requestId": "c99722f5-59ce-447` |
| **POST** | `/api/sms/headers` | 401 | ⚠️ | `{"success": false, "requestId": "43ad89bc-c9c6-473` |
| **PUT** | `/api/sms/headers/<header_id>/set-default` | 401 | ⚠️ | `{"success": false, "requestId": "ce0234c8-d5af-404` |
| **GET** | `/api/sms/monitoring` | 401 | ⚠️ | `{"error": "Unauthorized", "success": false, "reque` |
| **GET** | `/api/sms/packages` | 200 | ✅ | `{"data": [{"createdAt": "2026-01-01T20:33:28.51776` |
| **POST** | `/api/subscriptions/complete-signup` | 401 | ⚠️ | `{"success": false, "requestId": "dc32c496-2956-4d1` |
| **GET** | `/api/subscriptions/current` | 401 | ⚠️ | `{"success": false, "requestId": "2299d0db-eb41-491` |
| **POST** | `/api/subscriptions/register-and-subscribe` | 400 | ⚠️ | `{"error": {"code": "MISSING_FIELDS", "message": "M` |
| **POST** | `/api/subscriptions/subscribe` | 401 | ⚠️ | `{"success": false, "requestId": "07977f76-226c-4b3` |
| **GET** | `/api/suppliers` | 401 | ⚠️ | `{"success": false, "requestId": "28dc3804-2ea5-421` |
| **POST** | `/api/suppliers` | 401 | ⚠️ | `{"success": false, "requestId": "55588e47-f42b-4a2` |
| **DELETE** | `/api/suppliers/<int:supplier_id>` | 401 | ⚠️ | `{"success": false, "requestId": "38130257-99c6-4d6` |
| **GET** | `/api/suppliers/<int:supplier_id>` | 401 | ⚠️ | `{"success": false, "requestId": "e1c75923-47dd-4b8` |
| **PUT** | `/api/suppliers/<int:supplier_id>` | 401 | ⚠️ | `{"success": false, "requestId": "9e29ddaf-49b9-4d4` |
| **GET** | `/api/suppliers/<int:supplier_id>/invoices` | 401 | ⚠️ | `{"success": false, "requestId": "c2e041e9-11b4-430` |
| **GET** | `/api/suppliers/<int:supplier_id>/products` | 401 | ⚠️ | `{"success": false, "requestId": "1b8471a6-843a-46e` |
| **GET** | `/api/suppliers/search` | 401 | ⚠️ | `{"success": false, "requestId": "ba072045-6983-42b` |
| **GET** | `/api/suppliers/stats` | 401 | ⚠️ | `{"success": false, "requestId": "0ed8f8d5-624e-4e7` |
| **GET** | `/api/suppliers/suggested` | 401 | ⚠️ | `{"success": false, "requestId": "3ebeccd9-7c90-418` |
| **DELETE** | `/api/suppliers/suggested/<int:suggested_id>` | 401 | ⚠️ | `{"success": false, "requestId": "8d53e83c-5403-47e` |
| **POST** | `/api/suppliers/suggested/<int:suggested_id>/accept` | 401 | ⚠️ | `{"success": false, "requestId": "85fc7188-2bdb-49e` |
| **GET** | `/api/tenant/assets/<tenant_id>/<filename>` | 401 | ⚠️ | `{"success": false, "requestId": "06f76d56-e3bd-4a1` |
| **GET** | `/api/tenant/company` | 401 | ⚠️ | `{"success": false, "requestId": "130a8c96-0aff-480` |
| **PUT** | `/api/tenant/company` | 401 | ⚠️ | `{"success": false, "requestId": "c86bdce3-9b59-453` |
| **GET** | `/api/tenant/company/assets/<asset_type>/url` | 401 | ⚠️ | `{"success": false, "requestId": "1f9ddb65-809e-4f8` |
| **DELETE** | `/api/tenant/company/upload/<asset_type>` | 401 | ⚠️ | `{"success": false, "requestId": "e130802f-7197-4c2` |
| **POST** | `/api/tenant/company/upload/<asset_type>` | 401 | ⚠️ | `{"success": false, "requestId": "1677672a-0dd5-4c0` |
| **GET** | `/api/tenant/users` | 401 | ⚠️ | `{"success": false, "requestId": "6293e5a8-2cf5-4e5` |
| **POST** | `/api/tenant/users` | 401 | ⚠️ | `{"success": false, "requestId": "54bcfb97-54a1-44e` |
| **DELETE** | `/api/tenant/users/<user_id>` | 401 | ⚠️ | `{"success": false, "requestId": "d5515911-d142-449` |
| **PUT** | `/api/tenant/users/<user_id>` | 401 | ⚠️ | `{"success": false, "requestId": "9927715c-9471-431` |
| **GET** | `/api/timeline` | 200 | ✅ | `{"data": [{"description": "", "entityId": null, "e` |
| **GET** | `/api/unified-cash-records` | 200 | ✅ | `{"data": [{"amount": 21871.33, "category": "sale",` |
| **GET** | `/api/unified-cash-records/summary` | 200 | ✅ | `{"endDate": "2026-02-01T14:45:21.043815", "period"` |
| **DELETE** | `/api/upload/files` | 401 | ⚠️ | `{"success": false, "requestId": "4b2b86ef-bb51-49f` |
| **GET** | `/api/upload/files` | 401 | ⚠️ | `{"success": false, "requestId": "9721211d-26f0-4d0` |
| **POST** | `/api/upload/presigned` | 401 | ⚠️ | `{"success": false, "requestId": "ff1314ce-a474-496` |
| **GET** | `/api/users` | 401 | ⚠️ | `{"success": false, "requestId": "6b50fc1b-1be3-451` |
| **POST** | `/api/users` | 401 | ⚠️ | `{"success": false, "requestId": "a5ee7141-42cf-4ef` |
| **DELETE** | `/api/users/<user_id>` | 401 | ⚠️ | `{"success": false, "requestId": "2af7c2fe-e30c-410` |
| **PUT** | `/api/users/<user_id>` | 401 | ⚠️ | `{"success": false, "requestId": "1041de54-fea2-431` |
| **GET** | `/api/users/me` | 401 | ⚠️ | `{"success": false, "requestId": "f5835c35-7bdf-495` |
| **PUT** | `/api/users/me` | 401 | ⚠️ | `{"success": false, "requestId": "eecf2b69-046e-4ce` |
| **POST** | `/api/users/me/password` | 401 | ⚠️ | `{"success": false, "requestId": "705c5c3e-a96c-403` |
| **GET** | `/api/uts/jobs/<job_id>` | 401 | ⚠️ | `{"success": false, "requestId": "d269a498-8ee1-4b9` |
| **POST** | `/api/uts/jobs/<job_id>/cancel` | 401 | ⚠️ | `{"success": false, "requestId": "4240a2d3-5258-420` |
| **GET** | `/api/uts/registrations` | 401 | ⚠️ | `{"success": false, "requestId": "a4815793-47a6-44b` |
| **POST** | `/api/uts/registrations/bulk` | 401 | ⚠️ | `{"success": false, "requestId": "700dbcb3-8f29-464` |
| **POST** | `/api/verify-registration-otp` | 400 | ⚠️ | `{"message": "OTP kodu ge\u00e7ersiz veya s\u00fcre` |
| **GET** | `/metrics` | 200 | ✅ | `# HELP python_gc_objects_collected_total Objects c` |
| **GET** | `/swagger.html` | 404 | ⚠️ | `{"error": "Swagger UI not available", "success": f` |
