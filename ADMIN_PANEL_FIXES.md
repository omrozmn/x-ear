# Admin Panel Fix List

## Durum Tablosu (curl ile test edildi)

| # | Sayfa | Endpoint | HTTP | Veri | Durum |
|---|-------|----------|------|------|-------|
| 1 | Kullanıcılar | /api/admin/users | 200 | 10 user | ✅ ÇALIŞIYOR |
| 2 | Tüm Kullanıcılar | /api/admin/users/all | 200 | 10 user | ✅ ÇALIŞIYOR |
| 3 | Aboneler (Tenants) | /api/admin/tenants | 200 | 9 tenant | ✅ ÇALIŞIYOR |
| 4 | Randevular | /api/admin/appointments | 200 | 0 | ⚠️ Admin endpoint'te veri yok - cross-tenant sorgu gerekli |
| 5 | Kampanyalar | /api/admin/campaigns | 200 | 10 | ✅ ÇALIŞIYOR |
| 6 | Destek Talepleri | /api/admin/tickets | 200 | 8 | ✅ ÇALIŞIYOR |
| 7 | Faturalar | /api/admin/invoices | 200 | 0 | ⚠️ Fatura verisi yok DB'de |
| 8 | Blog Yönetimi | /api/admin/blog/ | 200 | 5 post | ✅ ÇALIŞIYOR |
| 9 | Eklentiler | /api/admin/addons | 200 | 25 | ✅ ÇALIŞIYOR |
| 10 | Planlar | /api/admin/plans | 200 | 27 | ✅ ÇALIŞIYOR |
| 11 | Hastalar/Müşteriler | /api/admin/parties | 200 | 10 | ✅ ÇALIŞIYOR |
| 12 | Tedarikçiler | /api/admin/suppliers | 200 | 4 | ✅ ÇALIŞIYOR |
| 13 | Affiliates | /api/affiliates/list | 200 | 3 | ✅ ÇALIŞIYOR |
| 14 | Aktivite Logları | /api/audit | 200 | 20+ | ✅ ÇALIŞIYOR |
| 15 | Bildirimler | /api/admin/notifications | 200 | 10 | ✅ ÇALIŞIYOR |
| 16 | OCR Kuyruğu | /api/admin/scan-queue | 200 | 0 | ⚠️ İşlenen OCR yok - beklenen |
| 17 | Stok/Envanter | /api/inventory | 200 | 0 | ⚠️ Tenant-scoped, admin endpoint gerekli |
| 18 | Satışlar | /api/sales | 200 | 0 | ⚠️ Tenant-scoped, admin endpoint gerekli |
| 19 | Cihazlar | /api/devices | 200 | 0 | ⚠️ Tenant-scoped, admin endpoint gerekli |

## Kullanıcının İstekleri

1. ✅ Kullanıcılar sayfası - VERİ GELİYOR (10 user)
2. ✅ Personel sayısı - admin/users/all'dan geliyor (10)
3. ⚠️ Her abonenin personeli - tenant bazlı filtreleme kontrol edilmeli
4. ✅ Affiliates - 3 kayıt geliyor
5. ⚠️ Randevular - admin endpoint'te cross-tenant query gerekli
6. ⚠️ Cihaz ve stok - tenant-scoped, admin endpoint gerekli
7. 🔧 SMS kampanya → "Kampanyalar" başlığı + email ekleme
8. ⚠️ Pazaryerleri - endpoint kontrol edilmeli
9. 🔧 Bildirimler - platform gereklilikleri incelenmeli
10. ⚠️ Faturalar - veri sorunu
11. ⚠️ OCR kuyruğu - beklenen boş
12. 🔧 Aktivite logları - Türkçe + human readable
13. ✅ Blog yönetimi - 5 post geliyor
14. 🔧 AI yönetimi - QA gerekli
15. 🔧 Barkod/etiket/yazıcılar - inceleme gerekli
16. 🔧 Destek - web app'te talep oluşturma eksik
