# OpenAPI Birleştirme Planı

## 📋 Özet

Bu döküman, iki ayrı OpenAPI dosyasının (`/x-ear/openapi.yaml` ve `/x-ear/apps/openapi.yaml`) tek dosyada birleştirilmesi planını detaylı şekilde açıklamaktadır.

### Mevcut Durum

| Dosya | Endpoint Sayısı | Kullanım |
|-------|-----------------|----------|
| `/x-ear/openapi.yaml` (ROOT) | 157 | Orval tarafından kullanılıyor, Frontend buna bağımlı |
| `/x-ear/apps/openapi.yaml` | 286 | Backend auto-generated |

### Endpoint Dağılımı

| Kategori | Sayı |
|----------|------|
| **Sadece ROOT'ta (korunmalı)** | 63 |
| **Sadece APPS'te (eklenmeli)** | 176 |
| **Her ikisinde de ortak** | 94 |

---

## 🎯 Hedefler

1. ✅ Tek `openapi.yaml` dosyası kullan (ROOT dosyası)
2. ✅ Frontend'in beklediği tüm operationId'leri koru
3. ✅ Backend'deki yeni endpoint'leri ekle
4. ❌ Manuel ekleme SADECE dış API'ler için (birfatura, vatansms vb.)
5. ✅ Auto-generation mekanizmasını düzelt

---

## 📁 Değiştirilecek Dosyalar

### 1. Ana Dosyalar

| Dosya | Aksiyon | Açıklama |
|-------|---------|----------|
| `/x-ear/openapi.yaml` | **GÜNCELLE** | Apps'teki eksik endpoint'ler eklenmeli |
| `/x-ear/apps/openapi.yaml` | **SİL/DEVRE DIŞI** | Artık kullanılmayacak |
| `/x-ear/apps/backend/scripts/generate_openapi.py` | **GÜNCELLE** | ROOT dosyasına yazsın |
| `/x-ear/apps/update_openapi.py` | **GÜNCELLE/SİL** | Artık gerekli olmayabilir |

### 2. Yapılandırma Dosyaları

| Dosya | Aksiyon | Açıklama |
|-------|---------|----------|
| `/x-ear/apps/web/orval.config.mjs` | **KONTROL** | Zaten ROOT'u kullanıyor ✅ |

---

## 📝 Korunması Gereken Endpoint'ler (Sadece ROOT'ta - 63 adet)

Bu endpoint'ler frontend tarafından kullanılıyor ve operationId'leri değişmemeli:

```
addons_list_active
appointments_get_appointments
branches_get_branches
campaigns_create_campaign
campaigns_get_campaigns
campaigns_send_campaign
dashboard_get_dashboard_data
devices_create_device_category
devices_get_device_brands
devices_get_devices
inventory_create_inventory_item
inventory_get_categories
inventory_get_inventory_item
inventory_get_inventory_items
inventory_update_inventory_item
invoices_generate_invoice_pdf
invoices_get_invoice
invoices_send_to_gib
notifications_list_notifications
notifications_mark_notification_read
notifications_notification_stats
ocr_process_document
patient_subresources_add_patient_hearing_test
patient_subresources_create_patient_ereceipt
patient_subresources_create_patient_note
patient_subresources_delete_patient_ereceipt
patient_subresources_delete_patient_hearing_test
patient_subresources_delete_patient_note
patients_get_patient
patients_get_patients
patients_update_patient
sales_create_sale
sales_create_sale_invoice
sales_delete_sale
sales_generate_sale_invoice_pdf
sales_get_sale
sales_get_sale_invoice
sales_list_sales
sales_update_sale
sms_create_audience
sms_create_header
sms_get_audiences
sms_get_config
sms_get_credit
sms_get_headers
sms_get_packages
sms_update_config
sms_upload_audience
subscriptions_get_current          ⚠️ KRİTİK: apps'te subscriptions_get_subscription olarak var
suppliers_get_suppliers
suppliers_update_supplier
tenant_users_delete
tenant_users_invite
tenant_users_list
timeline_add_timeline_event
timeline_delete_timeline_event
timeline_get_patient_timeline
timeline_log_patient_activity
update_settings
users_get_current_user
users_get_user
users_list_users
users_update_user
```

---

## ➕ Eklenmesi Gereken Endpoint'ler (Sadece APPS'te - 176 adet)

### Activity Logs (6 endpoint)
```
activity_logs_admin_get_activity_logs
activity_logs_admin_get_activity_stats
activity_logs_admin_get_filter_options
activity_logs_get_activity_log_detail
activity_logs_get_filter_options
```

### Admin Endpoints (68 endpoint)
```
admin_addons_create_addon
admin_addons_delete_addon
admin_admin_login
admin_analytics_get_admin_analytics
admin_api_keys_create_api_key
admin_api_keys_init_db
admin_api_keys_revoke_api_key
admin_appointments_get_all_appointments
admin_birfatura_get_invoices
admin_birfatura_get_logs
admin_birfatura_get_stats
admin_create_ticket_response
admin_dashboard_get_dashboard_metrics
admin_debug_available_roles
admin_debug_page_permissions
admin_debug_switch_role
admin_get_admin_users
admin_get_all_tenant_users
admin_integrations_init_db
admin_integrations_update_birfatura_config
admin_integrations_update_vatan_sms_config
admin_inventory_get_all_inventory
admin_invoices_create_admin_invoice
admin_invoices_get_admin_invoice
admin_invoices_get_invoice_pdf
admin_invoices_record_payment
admin_marketplaces_create_integration
admin_marketplaces_init_db
admin_marketplaces_sync_integration
admin_notifications_create_template
admin_notifications_delete_template
admin_notifications_get_notifications
admin_notifications_init_db
admin_notifications_send_notification
admin_patch_features
admin_patients_get_all_patients
admin_plans_create_plan
admin_plans_delete_plan
admin_production_get_orders
admin_production_init_db
admin_production_update_order_status
admin_roles_create_admin_role
admin_roles_delete_admin_role
admin_roles_get_admin_permissions
admin_roles_get_admin_user_detail
admin_roles_get_admin_users_with_roles
admin_roles_get_my_admin_permissions
admin_roles_update_admin_role_permissions
admin_roles_update_admin_user_roles
admin_scan_queue_get_scan_queue
admin_scan_queue_init_db
admin_scan_queue_retry_scan
admin_settings_clear_cache
admin_settings_init_db
admin_settings_trigger_backup
admin_settings_update_settings
admin_tenants_add_tenant_addon
admin_tenants_create_tenant
admin_tenants_create_tenant_user
admin_tenants_delete_tenant
admin_tenants_subscribe_tenant
admin_tenants_update_tenant_status
admin_tenants_update_tenant_user
admin_tickets_create_admin_ticket
admin_tickets_update_admin_ticket
admin_update_admin_ticket
admin_update_any_tenant_user
```

### Addons (1 endpoint)
```
addons_get_addons
```

### Auth (5 endpoint)
```
auth_forgot_password
auth_login
auth_refresh
auth_send_verification_otp
auth_verify_otp
```

### Birfatura (11 endpoint) ⚠️ DIŞ API
```
birfatura_bp_birfatura_inbox_file
birfatura_bp_birfatura_inbox_list
birfatura_bp_out_document_download_by_uuid
birfatura_bp_out_get_inbox_documents
birfatura_bp_out_get_inbox_documents_with_detail
birfatura_bp_out_preview_document_return_pdf
birfatura_bp_out_receive_document
birfatura_bp_out_send_basic_invoice_from_model
birfatura_bp_out_send_document
birfatura_bp_send_basic_invoice
birfatura_bp_send_document
```

### Branches (2 endpoint)
```
branches_create_branch
branches_delete_branch
```

### Cash Records (2 endpoint)
```
cash_records_create_cash_record
cash_records_delete_cash_record
```

### Checkout (2 endpoint)
```
checkout_confirm_payment
checkout_create_checkout_session
```

### Communications (4 endpoint)
```
communications_communication_stats
communications_create_communication_history
communications_send_email
communications_send_sms
```

### Config (1 endpoint)
```
config_get_config
```

### Dashboard (2 endpoint)
```
dashboard_get_dashboard
dashboard_patient_distribution
```

### Inventory (8 endpoint)
```
inventory_advanced_search
inventory_bulk_upload_inventory
inventory_create_brand
inventory_get_all_inventory
inventory_get_brands_old
inventory_get_categories_old
inventory_get_features
inventory_get_units
```

### Invoices (14 endpoint)
```
invoices_actions_copy_invoice
invoices_actions_copy_invoice_cancel
invoices_actions_issue_invoice
invoices_actions_serve_invoice_pdf
invoices_actions_serve_shipping_pdf
invoices_add_to_print_queue
invoices_batch_generate_invoices
invoices_bulk_upload_invoices
invoices_create_invoice_template
invoices_generate_sale_invoice_pdf
invoices_get_patient_invoices
invoices_get_sale_invoice
invoices_send_invoice_to_gib
invoices_update_invoice_gib_status
invoices_upload_invoice_xml
```

### Misc (3 endpoint)
```
get_pricing_settings
metrics
patch_settings
```

### Notifications (1 endpoint)
```
notifications_set_user_notification_settings
```

### OCR (2 endpoint)
```
ocr_create_job
ocr_debug_ner
```

### Payments (3 endpoint)
```
payments_create_payment_record
payments_get_patient_payment_records
payments_update_payment_record
```

### Permissions (6 endpoint)
```
permission_admin_check_endpoint_permission
permission_admin_get_permission_coverage
permission_admin_get_permission_map
permissions_create_permission
permissions_get_my_permissions
permissions_update_role_permissions
```

### Plans (3 endpoint)
```
plans_create_plan
plans_get_admin_plans
plans_update_plan
```

### Proformas (4 endpoint)
```
proformas_convert_proforma_to_sale
proformas_create_proforma
proformas_get_patient_proformas
proformas_get_proforma
```

### Replacements (5 endpoint)
```
replacements_create_patient_replacement
replacements_create_return_invoice
replacements_get_replacement
replacements_patch_replacement_status
replacements_send_invoice_to_gib
```

### Reports (5 endpoint) ⚠️ YENİ EKLENEN
```
reports_report_cashflow_summary
reports_report_promissory_notes
reports_report_promissory_notes_by_patient
reports_report_promissory_notes_list
reports_report_remaining_payments
```

### Roles (4 endpoint)
```
roles_add_permission_to_role
roles_create_role
roles_delete_role
roles_remove_permission_from_role
```

### Sales (8 endpoint)
```
sales_create_product_sale
sales_create_sales_log
sales_get_sales
sales_pay_installment
sales_recalc_sales
sales_record_sale_payment
sales_update_device_assignment
sales_update_sale_partial
```

### SGK (7 endpoint)
```
sgk_create_sgk_workflow
sgk_get_sgk_workflow
sgk_query_e_receipt
sgk_query_patient_rights
sgk_seed_test_patients
sgk_update_sgk_workflow
sgk_upload_and_process_files
```

### SMS Integration (2 endpoint)
```
sms_integration_delete_sms_document
sms_integration_download_sms_document
```

### Subscriptions (2 endpoint) ⚠️ İSİM FARKI
```
subscriptions_get_subscription        → ROOT'ta subscriptions_get_current olarak var
subscriptions_register_and_subscribe
subscriptions_subscribe
```

### Suppliers (2 endpoint)
```
suppliers_bulk_upload_suppliers
suppliers_search_suppliers
```

### Tenant Users (5 endpoint)
```
tenant_users_delete_tenant_asset
tenant_users_invite_tenant_user
tenant_users_serve_tenant_asset
tenant_users_update_tenant_company
tenant_users_update_tenant_user
```

### Unified Cash (2 endpoint)
```
unified_cash_get_cash_summary
unified_cash_get_unified_cash_records
```

### Upload (2 endpoint)
```
upload_delete_file
upload_get_presigned_upload_url
```

---

## ⚠️ OperationId İsim Çakışmaları

Dikkat edilmesi gereken isim farklılıkları:

| ROOT'taki İsim | APPS'teki İsim | Durum |
|----------------|----------------|-------|
| `subscriptions_get_current` | `subscriptions_get_subscription` | ROOT'taki korunmalı |
| `patients_get_patients` | `patients_list_patients` (yok) | ROOT'taki korunmalı |
| `inventory_get_inventory_items` | `inventory_get_all_inventory` | İkisi farklı endpoint olabilir |

---

## 🔧 Uygulama Adımları

### ÖNERİLEN ÇÖZÜM: Merge + Script Düzeltme

#### Adım 1: Yedekleme
```bash
cp /x-ear/openapi.yaml /x-ear/openapi.yaml.backup
```

#### Adım 2: apps/openapi.yaml'daki Eksik Endpoint'leri ROOT'a Taşı (Manuel veya Python Script)

Aşağıdaki 176 endpoint'in path ve schema tanımları ROOT'a eklenmeli.

#### Adım 3: `apps/update_openapi.py`'yi ROOT'a yönlendir

```python
# Değişiklik:
openapi_path = '/Users/omerozmen/Desktop/x-ear web app/x-ear/openapi.yaml'
```

#### Adım 4: apps/openapi.yaml'ı Sil/Deprecate

```bash
rm /x-ear/apps/openapi.yaml
# veya: .gitignore'a ekle
```

#### Adım 5: Orval Regenerate

```bash
cd apps/web
npm run gen:api
```

#### Adım 6: Test

```bash
npm run type-check
npm run build
```

---

## ✅ Doğrulama Kontrol Listesi

- [ ] Tüm 63 korunması gereken endpoint ROOT'ta var
- [ ] Tüm 176 yeni endpoint ROOT'a eklendi
- [ ] OperationId'ler frontend beklentisiyle uyumlu
- [ ] Orval başarıyla generate etti
- [ ] TypeScript type-check geçti
- [ ] Frontend build başarılı
- [ ] Backend hala çalışıyor
- [ ] `subscriptions_get_current` hook'u çalışıyor

---

## 🚨 Risk Analizi

### Yüksek Risk
- ❌ Frontend operationId değişikliği → Hook isimleri değişir → BREAK

### Orta Risk
- ⚠️ Schema çakışmaları → Dikkatlice merge edilmeli

### Düşük Risk
- ✅ Yeni endpoint ekleme → Mevcut kodu bozmaz

---

## 📊 İstatistikler

| Metrik | Değer |
|--------|-------|
| Toplam benzersiz endpoint | 333 |
| Korunacak (ROOT) | 63 |
| Eklenecek (APPS) | 176 |
| Zaten ortak | 94 |
| Frontend-critical operationId | 63 |

---

## 🔄 Mevcut Script Analizi

### `/x-ear/apps/backend/scripts/generate_openapi.py`
- **Ne yapıyor:** Flask app route'larından otomatik OpenAPI spec üretiyor
- **Nereye yazıyor:** `openapi.generated.yaml` (karşılaştırma için)
- **Problem:** ROOT dosyasını güncellemek yerine ayrı dosya oluşturuyor

### `/x-ear/apps/update_openapi.py`
- **Ne yapıyor:** `apps/openapi.yaml`'a manuel schema ve path ekliyor
- **Nereye yazıyor:** `/x-ear/apps/openapi.yaml` (YANLIŞ)
- **Problem:** ROOT dosyasını değil apps dosyasını güncelliyor

### Alternatif Yaklaşım: Script Güncelleme

`update_openapi.py` script'ini şu şekilde güncelleyebiliriz:

```python
# Eski
openapi_path = '/Users/omerozmen/Desktop/x-ear web app/x-ear/apps/openapi.yaml'

# Yeni
openapi_path = '/Users/omerozmen/Desktop/x-ear web app/x-ear/openapi.yaml'
```

Bu yaklaşım:
- ✅ Manuel merge gerektirmez
- ✅ Frontend operationId'lerini korur
- ✅ Yeni endpoint'leri otomatik ekler
- ✅ Minimal değişiklik (sadece path değiştir)

---

## 📅 Sonraki Adımlar

1. Bu dökümanı incele ve onayla
2. Hangi yaklaşımı tercih ettiğini belirt (manuel merge vs script güncelleme)
3. Değişiklikleri uygula
4. Test et
5. Commit & Push

---

*Bu döküman: 2025-01-XX tarihinde oluşturuldu*
*Son güncelleme: Otomatik*
