"""
Static permission catalog for product-defined page, tab and block permissions.
This keeps the UI permission tree stable even if role/permission rows are reset.
"""


def _entry(name: str, description: str) -> dict[str, str]:
    return {"name": name, "description": description}


def _tab(page_label: str, tab_label: str, permission_name: str) -> dict[str, str]:
    return _entry(permission_name, f"{page_label} > {tab_label} sekmesini görüntüleyebilir")


def _block(page_label: str, tab_label: str, block_label: str, permission_name: str) -> dict[str, str]:
    return _entry(permission_name, f"{page_label} > {tab_label} > {block_label} alanını görüntüleyebilir")


STATIC_PERMISSION_CATALOG = [
    _entry("dashboard.view", "Dashboard sayfasını görüntüleyebilir"),
    _entry("dashboard.analytics", "Dashboard analizlerini görüntüleyebilir"),

    _entry("parties.view", "Hastalar sayfasını görüntüleyebilir"),
    _entry("parties.create", "Hastalar sayfasında kayıt oluşturabilir"),
    _entry("parties.edit", "Hastalar sayfasında kayıt düzenleyebilir"),
    _entry("parties.delete", "Hastalar sayfasında kayıt silebilir"),

    _entry("appointments.view", "Randevular sayfasını görüntüleyebilir"),
    _entry("appointments.create", "Randevular sayfasında kayıt oluşturabilir"),
    _entry("appointments.edit", "Randevular sayfasında kayıt düzenleyebilir"),
    _entry("appointments.delete", "Randevular sayfasında kayıt silebilir"),

    _entry("sales.view", "Satışlar sayfasını görüntüleyebilir"),
    _entry("sales.create", "Satışlar sayfasında kayıt oluşturabilir"),
    _entry("sales.edit", "Satışlar sayfasında kayıt düzenleyebilir"),
    _entry("sales.delete", "Satışlar sayfasında kayıt silebilir"),
    _entry("sales.approve", "Satışları onaylayabilir"),

    _entry("finance.view", "Finans sayfasını görüntüleyebilir"),
    _entry("finance.payments", "Finans > ödemeleri görüntüleyebilir"),
    _entry("finance.refunds", "Finans > iadeleri görüntüleyebilir"),
    _entry("finance.reports", "Finans > raporları görüntüleyebilir"),
    _entry("finance.cash_register", "Finans > kasa işlemlerini görüntüleyebilir"),

    _entry("invoices.view", "Faturalar sayfasını görüntüleyebilir"),
    _entry("invoices.create", "Fatura oluşturabilir"),
    _entry("invoices.send", "Fatura gönderebilir"),
    _entry("invoices.cancel", "Fatura iptal edebilir"),

    _entry("devices.view", "Cihazlar sayfasını görüntüleyebilir"),
    _entry("devices.create", "Cihaz oluşturabilir"),
    _entry("devices.edit", "Cihaz düzenleyebilir"),
    _entry("devices.delete", "Cihaz silebilir"),
    _entry("devices.assign", "Cihaz atayabilir"),

    _entry("inventory.view", "Stok sayfasını görüntüleyebilir"),
    _entry("inventory.manage", "Stok işlemlerini yönetebilir"),

    _entry("campaigns.view", "Kampanyalar sayfasını görüntüleyebilir"),
    _entry("campaigns.create", "Kampanya oluşturabilir"),
    _entry("campaigns.edit", "Kampanya düzenleyebilir"),
    _entry("campaigns.delete", "Kampanya silebilir"),
    _entry("campaigns.send_sms", "Kampanya SMS gönderimi yapabilir"),

    _entry("sgk.view", "SGK sayfasını görüntüleyebilir"),
    _entry("sgk.create", "SGK kaydı oluşturabilir"),
    _entry("sgk.upload", "SGK belgesi yükleyebilir"),

    _entry("team.view", "Ekip Yönetimi sayfasını görüntüleyebilir"),
    _entry("team.create", "Ekip kaydı oluşturabilir"),
    _entry("team.edit", "Ekip kaydı düzenleyebilir"),
    _entry("team.delete", "Ekip kaydı silebilir"),
    _entry("team.permissions", "Rol izinlerini yönetebilir"),
    _entry("settings.branches", "Şube ayarlarını yönetebilir"),

    _entry("settings.view", "Ayarlar sayfasını görüntüleyebilir"),
    _entry("settings.edit", "Ayarları düzenleyebilir"),
    _entry("settings.integrations", "Entegrasyon ayarlarını yönetebilir"),

    _entry("reports.view", "Raporlar sayfasını görüntüleyebilir"),
    _entry("reports.export", "Raporları dışa aktarabilir"),

    _entry("sensitive.parties.list.contact.view", "Hasta listesinde telefon ve e-posta bilgisini görüntüleyebilir"),
    _entry("sensitive.parties.list.identity.view", "Hasta listesinde kimlik bilgilerini görüntüleyebilir"),
    _entry("sensitive.parties.detail.contact.view", "Hasta detayında telefon ve e-posta bilgisini görüntüleyebilir"),
    _entry("sensitive.parties.detail.identity.view", "Hasta detayında kimlik ve T.C. bilgisini görüntüleyebilir"),
    _entry("sensitive.parties.detail.notes.view", "Hasta detayında özel notları görüntüleyebilir"),
    _entry("sensitive.parties.detail.sgk.view", "Hasta detayında SGK hassas bilgilerini görüntüleyebilir"),
    _entry("sensitive.sales.list.amounts.view", "Satış listesinde tutar ve tahsilat bilgisini görüntüleyebilir"),
    _entry("sensitive.sales.list.profit.view", "Satış listesinde karlılık ve marj bilgisini görüntüleyebilir"),
    _entry("sensitive.sales.manual.amounts.view", "Manuel satış ve kasa ekranında tutar detaylarını görüntüleyebilir"),
    _entry("sensitive.finance.payments.collection.view", "Finans ödemelerinde tahsilat ve bakiye detaylarını görüntüleyebilir"),
    _entry("sensitive.finance.cash_register.amounts.view", "Kasa ve finans raporlarında tutar detaylarını görüntüleyebilir"),
    _entry("sensitive.inventory.overview.cost.view", "Stok özetinde maliyet bilgilerini görüntüleyebilir"),
    _entry("sensitive.inventory.operations.cost.view", "Stok işlemlerinde maliyet ve alış bilgilerini görüntüleyebilir"),
    _entry("sensitive.sgk.documents.identity.view", "SGK belgelerinde hasta ve kimlik detaylarını görüntüleyebilir"),
    _entry("sensitive.reports.overview.financials.view", "Raporlar > Genel Bakış finansal KPI detaylarını görüntüleyebilir"),
    _entry("sensitive.reports.sales.financials.view", "Raporlar > Satış Raporları ciro ve karlılık detaylarını görüntüleyebilir"),
    _entry("sensitive.reports.parties.identity.view", "Raporlar > Hasta Raporları kimlik ve iletişim dağılımlarını görüntüleyebilir"),
    _entry("sensitive.reports.promissory.financials.view", "Raporlar > Senet Raporları tutar ve tahsilat detaylarını görüntüleyebilir"),
    _entry("sensitive.reports.remaining.financials.view", "Raporlar > Kalan Ödemeler finansal detaylarını görüntüleyebilir"),
    _entry("sensitive.reports.pos_movements.financials.view", "Raporlar > POS Hareketleri tutar ve komisyon detaylarını görüntüleyebilir"),
    _entry("sensitive.reports.report_tracking.details.view", "Raporlar > Rapor Takibi hasta ve satış detaylarını görüntüleyebilir"),
    _entry("sensitive.reports.activity.details.view", "Raporlar > İşlem Dökümü detay verisini görüntüleyebilir"),

    _tab("Dashboard", "Genel Görünüm", "dashboard.view"),
    _block("Dashboard", "Genel Görünüm", "KPI Kartları", "dashboard.overview.summary.view"),
    _block("Dashboard", "Genel Görünüm", "Günlük Akış", "dashboard.overview.agenda.view"),
    _block("Dashboard", "Genel Görünüm", "Performans Göstergeleri", "dashboard.overview.performance.view"),

    _tab("Hastalar", "Hasta Detayı", "parties.detail.view"),
    _tab("Hastalar", "Hasta Listesi", "parties.list.view"),
    _block("Hastalar", "Hasta Listesi", "Arama ve Filtreler", "parties.list.filters.view"),
    _block("Hastalar", "Hasta Listesi", "Hasta Tablosu", "parties.list.table.view"),
    _block("Hastalar", "Hasta Listesi", "Toplu İşlemler", "parties.list.bulk_actions.view"),
    _block("Hastalar", "Hasta Listesi", "Telefon ve E-posta", "sensitive.parties.list.contact.view"),
    _block("Hastalar", "Hasta Listesi", "Kimlik Bilgileri", "sensitive.parties.list.identity.view"),
    _block("Hastalar", "Hasta Detayı", "Genel Bilgiler", "parties.detail.general.view"),
    _block("Hastalar", "Hasta Detayı", "İşitme Testleri", "parties.detail.hearing_tests.view"),
    _block("Hastalar", "Hasta Detayı", "Cihazlar", "parties.detail.devices.view"),
    _block("Hastalar", "Hasta Detayı", "Satışlar", "parties.detail.sales.view"),
    _block("Hastalar", "Hasta Detayı", "Randevular", "parties.detail.appointments.view"),
    _block("Hastalar", "Hasta Detayı", "Belgeler", "parties.detail.documents.view"),
    _block("Hastalar", "Hasta Detayı", "Zaman Çizelgesi", "parties.detail.timeline.view"),
    _block("Hastalar", "Hasta Detayı", "Notlar", "parties.detail.notes.view"),
    _block("Hastalar", "Hasta Detayı", "SGK", "parties.detail.sgk.view"),
    _block("Hastalar", "Hasta Detayı", "Telefon ve E-posta", "sensitive.parties.detail.contact.view"),
    _block("Hastalar", "Hasta Detayı", "Kimlik ve T.C. Bilgileri", "sensitive.parties.detail.identity.view"),
    _block("Hastalar", "Hasta Detayı", "Özel Not Detayları", "sensitive.parties.detail.notes.view"),
    _block("Hastalar", "Hasta Detayı", "SGK Hassas Bilgileri", "sensitive.parties.detail.sgk.view"),

    _tab("Randevular", "Takvim", "appointments.calendar.view"),
    _tab("Randevular", "Randevu Listesi", "appointments.list.view"),
    _tab("Randevular", "Randevu İşlemleri", "appointments.create.view"),
    _block("Randevular", "Takvim", "KPI Kartları", "appointments.calendar.stats.view"),
    _block("Randevular", "Takvim", "Takvim Görünümü", "appointments.calendar.calendar.view"),
    _block("Randevular", "Randevu Listesi", "Randevu Tablosu", "appointments.list.table.view"),
    _block("Randevular", "Randevu Listesi", "Liste Filtreleri", "appointments.list.filters.view"),
    _block("Randevular", "Randevu İşlemleri", "Yeni Randevu Modalı", "appointments.create.modal.view"),
    _block("Randevular", "Randevu İşlemleri", "Oluştur / Düzenle / Sil", "appointments.create.actions.view"),

    _tab("Satışlar", "Satış Listesi", "sales.list.view"),
    _tab("Satışlar", "Manuel Satış / Kasa", "sales.manual.view"),
    _block("Satışlar", "Satış Listesi", "KPI Kartları", "sales.list.summary.view"),
    _block("Satışlar", "Satış Listesi", "Filtreler", "sales.list.filters.view"),
    _block("Satışlar", "Satış Listesi", "Satış Tablosu", "sales.list.table.view"),
    _block("Satışlar", "Satış Listesi", "Dışa Aktarım", "sales.list.export.view"),
    _block("Satışlar", "Satış Listesi", "Tutar ve Tahsilat Bilgileri", "sensitive.sales.list.amounts.view"),
    _block("Satışlar", "Satış Listesi", "Karlılık ve Marj Bilgileri", "sensitive.sales.list.profit.view"),
    _block("Satışlar", "Manuel Satış / Kasa", "Nakit Akışı Modalı", "sales.manual.cashflow_modal.view"),
    _block("Satışlar", "Manuel Satış / Kasa", "Yeni Manuel Kayıt", "sales.manual.new_record.view"),
    _block("Satışlar", "Manuel Satış / Kasa", "Kasa Tutar Detayları", "sensitive.sales.manual.amounts.view"),

    _tab("Finans", "Ödeme Takibi", "finance.payments.view"),
    _tab("Finans", "Kasa ve Raporlar", "finance.cash_register.view"),
    _block("Finans", "Ödeme Takibi", "KPI Kartları", "finance.payments.summary.view"),
    _block("Finans", "Ödeme Takibi", "Arama ve Tarih Filtreleri", "finance.payments.filters.view"),
    _block("Finans", "Ödeme Takibi", "Ödeme Tablosu", "finance.payments.table.view"),
    _block("Finans", "Ödeme Takibi", "Dışa Aktarım", "finance.payments.export.view"),
    _block("Finans", "Ödeme Takibi", "Tahsilat ve Bakiye Detayları", "sensitive.finance.payments.collection.view"),
    _block("Finans", "Kasa ve Raporlar", "Kasa İşlemleri", "finance.cash_register.panel.view"),
    _block("Finans", "Kasa ve Raporlar", "Finans Raporları", "finance.reports.panel.view"),
    _block("Finans", "Kasa ve Raporlar", "Kasa Tutar ve Hareket Detayları", "sensitive.finance.cash_register.amounts.view"),

    _tab("Faturalar", "Giden Faturalar", "invoices.outgoing.view"),
    _tab("Faturalar", "Durum ve Loglar", "invoices.status.view"),
    _tab("Faturalar", "Belge İşlemleri", "invoices.documents.view"),
    _block("Faturalar", "Giden Faturalar", "KPI Kartları", "invoices.outgoing.summary.view"),
    _block("Faturalar", "Giden Faturalar", "Arama ve Filtreler", "invoices.outgoing.filters.view"),
    _block("Faturalar", "Giden Faturalar", "Fatura Tablosu", "invoices.outgoing.table.view"),
    _block("Faturalar", "Durum ve Loglar", "Durum Modalı", "invoices.status.modal.view"),
    _block("Faturalar", "Durum ve Loglar", "Servis Sağlayıcı Durumu", "invoices.status.provider.view"),
    _block("Faturalar", "Belge İşlemleri", "Belge Önizleme", "invoices.documents.preview.view"),
    _block("Faturalar", "Belge İşlemleri", "PDF / XML İndirme", "invoices.documents.download.view"),
    _block("Faturalar", "Belge İşlemleri", "Gönder / İptal İşlemleri", "invoices.documents.actions.view"),

    _tab("Cihazlar", "Cihaz Listesi", "devices.catalog.view"),
    _tab("Cihazlar", "Atama ve Teslim", "devices.assignments.view"),
    _block("Cihazlar", "Cihaz Listesi", "Cihaz Tablosu", "devices.catalog.table.view"),
    _block("Cihazlar", "Cihaz Listesi", "Filtreler", "devices.catalog.filters.view"),
    _block("Cihazlar", "Atama ve Teslim", "Atama İşlemleri", "devices.assignments.panel.view"),
    _block("Cihazlar", "Atama ve Teslim", "Teslim Süreçleri", "devices.delivery.panel.view"),

    _tab("Stok", "Stok Özeti", "inventory.overview.view"),
    _tab("Stok", "Ürün İşlemleri", "inventory.operations.view"),
    _block("Stok", "Stok Özeti", "KPI Kartları", "inventory.overview.stats.view"),
    _block("Stok", "Stok Özeti", "Gelişmiş Filtreler", "inventory.overview.filters.view"),
    _block("Stok", "Stok Özeti", "Envanter Listesi", "inventory.overview.list.view"),
    _block("Stok", "Stok Özeti", "Maliyet Bilgileri", "sensitive.inventory.overview.cost.view"),
    _block("Stok", "Ürün İşlemleri", "Yeni / Düzenle Modalı", "inventory.operations.form.view"),
    _block("Stok", "Ürün İşlemleri", "İçe / Dışa Aktar", "inventory.operations.transfer.view"),
    _block("Stok", "Ürün İşlemleri", "Silme İşlemi", "inventory.operations.delete.view"),
    _block("Stok", "Ürün İşlemleri", "Maliyet ve Alış Bilgileri", "sensitive.inventory.operations.cost.view"),

    _tab("Kampanyalar", "Kampanya Listesi", "campaigns.list.view"),
    _tab("Kampanyalar", "Kampanya İşlemleri", "campaigns.actions.view"),
    _block("Kampanyalar", "Kampanya Listesi", "Kampanya Tablosu", "campaigns.list.table.view"),
    _block("Kampanyalar", "Kampanya Listesi", "Filtreler", "campaigns.list.filters.view"),
    _block("Kampanyalar", "Kampanya İşlemleri", "Kampanya Düzenleyici", "campaigns.actions.editor.view"),
    _block("Kampanyalar", "Kampanya İşlemleri", "SMS Gönderimi", "campaigns.actions.sms.view"),

    _tab("Personel Yönetimi", "Personel Kayıtları", "personnel.employees.view"),
    _tab("Personel Yönetimi", "İzin Yönetimi", "personnel.leave.view"),
    _tab("Personel Yönetimi", "Evrak Yönetimi", "personnel.documents.view"),
    _tab("Personel Yönetimi", "Prim Takibi", "personnel.premium.view"),
    _block("Personel Yönetimi", "Personel Kayıtları", "Personel Listesi", "personnel.employees.list.view"),
    _block("Personel Yönetimi", "Personel Kayıtları", "Kayıt İşlemleri", "personnel.employees.actions.view"),
    _block("Personel Yönetimi", "İzin Yönetimi", "İzin Talepleri", "personnel.leave.requests.view"),
    _block("Personel Yönetimi", "İzin Yönetimi", "Hak Ediş ve Bakiye", "personnel.leave.balances.view"),
    _block("Personel Yönetimi", "Evrak Yönetimi", "Evrak Listesi", "personnel.documents.library.view"),
    _block("Personel Yönetimi", "Evrak Yönetimi", "Eksik Evrak Takibi", "personnel.documents.compliance.view"),
    _block("Personel Yönetimi", "Prim Takibi", "Prim Kuralları", "personnel.premium.rules.view"),
    _block("Personel Yönetimi", "Prim Takibi", "Dönemsel Prim Kayıtları", "personnel.premium.periods.view"),

    _tab("SGK", "Belgeler", "sgk.documents.view"),
    _tab("SGK", "Belge Yükle", "sgk.upload.view"),
    _tab("SGK", "Belge İndir", "sgk.downloads.view"),
    _tab("SGK", "İş Akışı", "sgk.workflow.view"),
    _tab("SGK", "İstatistikler", "sgk.stats.view"),
    _block("SGK", "Belgeler", "Belge Listesi", "sgk.documents.list.view"),
    _block("SGK", "Belgeler", "Belge İşlemleri", "sgk.documents.actions.view"),
    _block("SGK", "Belgeler", "Hasta ve Kimlik Detayları", "sensitive.sgk.documents.identity.view"),
    _block("SGK", "Belge Yükle", "Yükleme Paneli", "sgk.upload.panel.view"),
    _block("SGK", "Belge İndir", "İndirme Sayfası", "sgk.downloads.page.view"),
    _block("SGK", "İş Akışı", "İş Akışı Paneli", "sgk.workflow.panel.view"),
    _block("SGK", "İstatistikler", "KPI Kartları", "sgk.stats.cards.view"),

    _tab("Ekip Yönetimi", "Ekip Üyeleri", "team.members.view"),
    _tab("Ekip Yönetimi", "Şubeler", "team.branches.view"),
    _tab("Ekip Yönetimi", "Rol İzinleri", "team.permissions.view"),
    _block("Ekip Yönetimi", "Ekip Üyeleri", "Üye Listesi", "team.members.list.view"),
    _block("Ekip Yönetimi", "Ekip Üyeleri", "Oluştur / Düzenle / Sil", "team.members.actions.view"),
    _block("Ekip Yönetimi", "Şubeler", "Şube Listesi", "team.branches.list.view"),
    _block("Ekip Yönetimi", "Şubeler", "Şube İşlemleri", "team.branches.actions.view"),
    _block("Ekip Yönetimi", "Rol İzinleri", "Sayfa Yetkileri", "team.permissions.pages.view"),
    _block("Ekip Yönetimi", "Rol İzinleri", "Sekme Yetkileri", "team.permissions.tabs.view"),
    _block("Ekip Yönetimi", "Rol İzinleri", "Blok Yetkileri", "team.permissions.blocks.view"),

    _tab("Ayarlar", "Firma Bilgileri", "settings.company.view"),
    _tab("Ayarlar", "Entegrasyonlar", "settings.integration.view"),
    _tab("Ayarlar", "Ekip Yönetimi", "settings.team.view"),
    _tab("Ayarlar", "Hasta Ayarları", "settings.parties.view"),
    _tab("Ayarlar", "SGK & Satış Ayarları", "settings.sgk.view"),
    _tab("Ayarlar", "Abonelik", "settings.subscription.view"),
    _block("Ayarlar", "Firma Bilgileri", "Firma Profil Bilgileri", "settings.company.profile.view"),
    _block("Ayarlar", "Firma Bilgileri", "Logo ve Marka Ayarları", "settings.company.branding.view"),
    _block("Ayarlar", "Entegrasyonlar", "Servis Bağlantıları", "settings.integration.services.view"),
    _block("Ayarlar", "Entegrasyonlar", "Anahtar ve Kimlik Bilgileri", "settings.integration.credentials.view"),
    _block("Ayarlar", "Ekip Yönetimi", "Ekip Üyeleri Ayarları", "settings.team.members.view"),
    _block("Ayarlar", "Ekip Yönetimi", "Rol ve Şube Ayarları", "settings.team.roles.view"),
    _block("Ayarlar", "Hasta Ayarları", "Segment ve Etiket Ayarları", "settings.parties.segments.view"),
    _block("Ayarlar", "Hasta Ayarları", "Hasta Form Ayarları", "settings.parties.forms.view"),
    _block("Ayarlar", "SGK & Satış Ayarları", "SGK Konfigürasyonu", "settings.sgk.config.view"),
    _block("Ayarlar", "SGK & Satış Ayarları", "Satış Süreç Ayarları", "settings.sgk.sales.view"),
    _block("Ayarlar", "Abonelik", "Paket Bilgileri", "settings.subscription.plan.view"),
    _block("Ayarlar", "Abonelik", "Faturalama ve Limitler", "settings.subscription.billing.view"),

    _tab("Raporlar", "Genel Bakış", "reports.overview.view"),
    _block("Raporlar", "Genel Bakış", "KPI Kartları", "reports.overview.kpis.view"),
    _block("Raporlar", "Genel Bakış", "Hasta İstatistikleri", "reports.overview.patients.view"),
    _block("Raporlar", "Genel Bakış", "Ödeme Yöntemleri", "reports.overview.payments.view"),
    _block("Raporlar", "Genel Bakış", "Finansal KPI Detayları", "sensitive.reports.overview.financials.view"),
    _tab("Raporlar", "Satış Raporları", "reports.sales.view"),
    _block("Raporlar", "Satış Raporları", "Gelir Trendi", "reports.sales.trend.view"),
    _block("Raporlar", "Satış Raporları", "Marka Bazlı Satışlar", "reports.sales.products.view"),
    _block("Raporlar", "Satış Raporları", "Ciro, Marj ve Karlılık", "sensitive.reports.sales.financials.view"),
    _tab("Raporlar", "Hasta Raporları", "reports.parties.view"),
    _block("Raporlar", "Hasta Raporları", "KPI Kartları", "reports.parties.summary.view"),
    _block("Raporlar", "Hasta Raporları", "Hasta Segmentleri", "reports.parties.segments.view"),
    _block("Raporlar", "Hasta Raporları", "Hasta Kaynakları", "reports.parties.acquisition.view"),
    _block("Raporlar", "Hasta Raporları", "Randevu Sonuçları", "reports.parties.appointments.view"),
    _block("Raporlar", "Hasta Raporları", "Yaş Dağılımı", "reports.parties.age_distribution.view"),
    _block("Raporlar", "Hasta Raporları", "İletişim ve Kimlik Dağılımları", "sensitive.reports.parties.identity.view"),
    _tab("Raporlar", "Senet Raporları", "reports.promissory.view"),
    _block("Raporlar", "Senet Raporları", "KPI Kartları", "reports.promissory.summary.view"),
    _block("Raporlar", "Senet Raporları", "Aylık Senet Sayısı", "reports.promissory.monthly_counts.view"),
    _block("Raporlar", "Senet Raporları", "Aylık Senet Tahsilatı", "reports.promissory.monthly_collections.view"),
    _block("Raporlar", "Senet Raporları", "Hasta Bazlı Senet Özeti", "reports.promissory.by_patient.view"),
    _block("Raporlar", "Senet Raporları", "Senet Listesi", "reports.promissory.list.view"),
    _block("Raporlar", "Senet Raporları", "Tutar ve Tahsilat Detayları", "sensitive.reports.promissory.financials.view"),
    _tab("Raporlar", "Kalan Ödemeler", "reports.remaining.view"),
    _block("Raporlar", "Kalan Ödemeler", "Kasa Özeti", "reports.remaining.cashflow.view"),
    _block("Raporlar", "Kalan Ödemeler", "Tahsilat Özeti", "reports.remaining.summary.view"),
    _block("Raporlar", "Kalan Ödemeler", "Kalan Ödemeler Tablosu", "reports.remaining.table.view"),
    _block("Raporlar", "Kalan Ödemeler", "Finansal Detaylar", "sensitive.reports.remaining.financials.view"),
    _tab("Raporlar", "POS Hareketleri", "reports.pos_movements.view"),
    _block("Raporlar", "POS Hareketleri", "KPI Kartları", "reports.pos_movements.summary.view"),
    _block("Raporlar", "POS Hareketleri", "POS Hareketleri Tablosu", "reports.pos_movements.table.view"),
    _block("Raporlar", "POS Hareketleri", "Tutar ve Komisyon Detayları", "sensitive.reports.pos_movements.financials.view"),
    _tab("Raporlar", "Rapor Takibi", "reports.report_tracking.view"),
    _block("Raporlar", "Rapor Takibi", "Takip Tablosu", "reports.report_tracking.table.view"),
    _block("Raporlar", "Rapor Takibi", "Detay Modalı", "reports.report_tracking.detail.view"),
    _block("Raporlar", "Rapor Takibi", "Hasta ve Satış Detayları", "sensitive.reports.report_tracking.details.view"),
    _tab("Raporlar", "İşlem Dökümü", "reports.activity.view"),
    _entry("activity_logs.view", "İşlem dökümü kayıtlarını görüntüleyebilir"),
    _block("Raporlar", "İşlem Dökümü", "Kayıt Tablosu", "reports.activity.table.view"),
    _block("Raporlar", "İşlem Dökümü", "Detay Modalı", "reports.activity.detail.view"),
    _block("Raporlar", "İşlem Dökümü", "Log Detay Verisi", "sensitive.reports.activity.details.view"),
]

STATIC_PERMISSION_MAP = {item["name"]: item for item in STATIC_PERMISSION_CATALOG}
STATIC_PERMISSION_NAMES = set(STATIC_PERMISSION_MAP)


# ============================================================================
# Sector-based permission filtering
# ============================================================================

# Permission prefixes that are hearing-sector-only
_HEARING_ONLY_PREFIXES = (
    "devices.",
    "sgk.",
    "parties.detail.hearing_tests.",
    "parties.detail.sgk.",
    "sensitive.sgk.",
)


def get_permissions_for_sector(sector: str) -> list[dict[str, str]]:
    """
    Return permissions applicable to a given sector.
    Hearing-only permissions are excluded for non-hearing sectors.
    """
    if sector == "hearing":
        return list(STATIC_PERMISSION_CATALOG)

    return [
        p for p in STATIC_PERMISSION_CATALOG
        if not any(p["name"].startswith(prefix) for prefix in _HEARING_ONLY_PREFIXES)
    ]


def get_permission_names_for_sector(sector: str) -> set[str]:
    """Return set of permission names applicable to a sector."""
    return {p["name"] for p in get_permissions_for_sector(sector)}
