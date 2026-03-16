import {
  BarChart,
  Calendar,
  DollarSign,
  FileText,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  Shield,
  ShoppingCart,
  Briefcase,
  Users
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PermissionBlockDefinition {
  key: string;
  label: string;
  description?: string;
  permissions: string[];
}

export interface PermissionTabDefinition {
  key: string;
  label: string;
  description?: string;
  permissions: string[];
  blocks?: PermissionBlockDefinition[];
}

export interface PermissionPageDefinition {
  key: string;
  category: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  permissions: string[];
  tabs?: PermissionTabDefinition[];
}

const block = (
  key: string,
  label: string,
  permissions: string[],
  description?: string
): PermissionBlockDefinition => ({
  key,
  label,
  description,
  permissions,
});

const tab = (
  pageKey: string,
  key: string,
  label: string,
  blocks: PermissionBlockDefinition[],
  description?: string,
  permissions: string[] = [`${pageKey}.${key}.view`]
): PermissionTabDefinition => ({
  key,
  label,
  description,
  permissions,
  blocks,
});

export const PERMISSION_PAGE_REGISTRY: PermissionPageDefinition[] = [
  {
    key: 'dashboard',
    category: 'dashboard',
    label: 'Dashboard',
    description: 'Ana ekran, özet kartlar ve günlük görünüm',
    icon: LayoutDashboard,
    permissions: ['dashboard.view', 'dashboard.analytics'],
    tabs: [
      tab('dashboard', 'overview', 'Genel Görünüm', [
        block('summary', 'KPI Kartları', ['dashboard.overview.summary.view']),
        block('agenda', 'Günlük Akış', ['dashboard.overview.agenda.view']),
        block('performance', 'Performans Göstergeleri', ['dashboard.overview.performance.view']),
      ], 'Ana dashboard içeriği', ['dashboard.view', 'dashboard.analytics']),
    ],
  },
  {
    key: 'parties',
    category: 'parties',
    label: 'Hastalar',
    description: 'Hasta listesi, hasta detayı ve takip alanları',
    icon: Users,
    permissions: ['parties.view', 'parties.create', 'parties.edit', 'parties.delete'],
    tabs: [
      tab('parties', 'list', 'Hasta Listesi', [
        block('filters', 'Arama ve Filtreler', ['parties.list.filters.view']),
        block('table', 'Hasta Tablosu', ['parties.list.table.view']),
        block('bulk_actions', 'Toplu İşlemler', ['parties.list.bulk_actions.view']),
        block('contact_sensitive', 'Telefon ve E-posta', ['sensitive.parties.list.contact.view']),
        block('identity_sensitive', 'Kimlik Bilgileri', ['sensitive.parties.list.identity.view']),
      ], 'Hasta listeleme ekranı', ['parties.view', 'parties.create']),
      tab('parties', 'detail', 'Hasta Detayı', [
        block('general', 'Genel Bilgiler', ['parties.detail.general.view']),
        block('hearing_tests', 'İşitme Testleri', ['parties.detail.hearing_tests.view']),
        block('devices', 'Cihazlar', ['parties.detail.devices.view']),
        block('sales', 'Satışlar', ['parties.detail.sales.view']),
        block('appointments', 'Randevular', ['parties.detail.appointments.view']),
        block('documents', 'Belgeler', ['parties.detail.documents.view']),
        block('timeline', 'Zaman Çizelgesi', ['parties.detail.timeline.view']),
        block('notes', 'Notlar', ['parties.detail.notes.view']),
        block('sgk', 'SGK', ['parties.detail.sgk.view']),
        block('contact_sensitive', 'Telefon ve E-posta', ['sensitive.parties.detail.contact.view']),
        block('identity_sensitive', 'Kimlik ve T.C. Bilgileri', ['sensitive.parties.detail.identity.view']),
        block('notes_sensitive', 'Özel Not Detayları', ['sensitive.parties.detail.notes.view']),
        block('sgk_sensitive', 'SGK Hassas Bilgileri', ['sensitive.parties.detail.sgk.view']),
      ], 'Hasta detay ekranı', ['parties.detail.view', 'parties.edit', 'parties.delete']),
    ],
  },
  {
    key: 'appointments',
    category: 'appointments',
    label: 'Randevular',
    description: 'Takvim, randevu listesi ve oluşturma akışları',
    icon: Calendar,
    permissions: ['appointments.view', 'appointments.create', 'appointments.edit', 'appointments.delete'],
    tabs: [
      tab('appointments', 'calendar', 'Takvim', [
        block('stats', 'KPI Kartları', ['appointments.calendar.stats.view']),
        block('calendar', 'Takvim Görünümü', ['appointments.calendar.calendar.view']),
      ], 'Takvim bazlı randevu görünümü', ['appointments.view']),
      tab('appointments', 'list', 'Randevu Listesi', [
        block('table', 'Randevu Tablosu', ['appointments.list.table.view']),
        block('filters', 'Liste Filtreleri', ['appointments.list.filters.view']),
      ], 'Liste bazlı randevu görünümü', ['appointments.list.view']),
      tab('appointments', 'create', 'Randevu İşlemleri', [
        block('create_modal', 'Yeni Randevu Modalı', ['appointments.create.modal.view']),
        block('actions', 'Oluştur / Düzenle / Sil', ['appointments.create.actions.view']),
      ], 'Randevu oluşturma ve düzenleme akışları', ['appointments.create', 'appointments.edit', 'appointments.delete']),
    ],
  },
  {
    key: 'sales',
    category: 'sales',
    label: 'Satışlar',
    description: 'Satış listesi, filtreler, dışa aktarım ve manuel kayıtlar',
    icon: ShoppingCart,
    permissions: ['sales.view', 'sales.create', 'sales.edit', 'sales.delete', 'sales.approve'],
    tabs: [
      tab('sales', 'list', 'Satış Listesi', [
        block('summary', 'KPI Kartları', ['sales.list.summary.view']),
        block('filters', 'Filtreler', ['sales.list.filters.view']),
        block('table', 'Satış Tablosu', ['sales.list.table.view']),
        block('export', 'Dışa Aktarım', ['sales.list.export.view']),
        block('financial_sensitive', 'Tutar ve Tahsilat Bilgileri', ['sensitive.sales.list.amounts.view']),
        block('profit_sensitive', 'Karlılık ve Marj Bilgileri', ['sensitive.sales.list.profit.view']),
      ], 'Satış ana ekranı', ['sales.view']),
      tab('sales', 'manual', 'Manuel Satış / Kasa', [
        block('cashflow_modal', 'Nakit Akışı Modalı', ['sales.manual.cashflow_modal.view']),
        block('new_record', 'Yeni Manuel Kayıt', ['sales.manual.new_record.view']),
        block('financial_sensitive', 'Kasa Tutar Detayları', ['sensitive.sales.manual.amounts.view']),
      ], 'Manuel satış ve kasa kaydı akışları', ['sales.create', 'sales.edit']),
    ],
  },
  {
    key: 'finance',
    category: 'finance',
    label: 'Finans',
    description: 'Tahsilatlar, ödeme kayıtları ve finans özetleri',
    icon: DollarSign,
    permissions: ['finance.view', 'finance.payments', 'finance.refunds', 'finance.reports', 'finance.cash_register'],
    tabs: [
      tab('finance', 'payments', 'Ödeme Takibi', [
        block('summary', 'KPI Kartları', ['finance.payments.summary.view']),
        block('filters', 'Arama ve Tarih Filtreleri', ['finance.payments.filters.view']),
        block('table', 'Ödeme Tablosu', ['finance.payments.table.view']),
        block('export', 'Dışa Aktarım', ['finance.payments.export.view']),
        block('collection_sensitive', 'Tahsilat ve Bakiye Detayları', ['sensitive.finance.payments.collection.view']),
      ], 'Ödeme kayıtları ekranı', ['finance.view', 'finance.payments']),
      tab('finance', 'cash_register', 'Kasa ve Raporlar', [
        block('cash_register', 'Kasa İşlemleri', ['finance.cash_register.panel.view']),
        block('reports', 'Finans Raporları', ['finance.reports.panel.view']),
        block('financial_sensitive', 'Kasa Tutar ve Hareket Detayları', ['sensitive.finance.cash_register.amounts.view']),
      ], 'Kasa ve finans raporları', ['finance.cash_register', 'finance.reports']),
    ],
  },
  {
    key: 'invoices',
    category: 'invoices',
    label: 'Faturalar',
    description: 'Fatura listesi, durum takibi ve belge işlemleri',
    icon: FileText,
    permissions: ['invoices.view', 'invoices.create', 'invoices.send', 'invoices.cancel'],
    tabs: [
      tab('invoices', 'outgoing', 'Giden Faturalar', [
        block('summary', 'KPI Kartları', ['invoices.outgoing.summary.view']),
        block('filters', 'Arama ve Filtreler', ['invoices.outgoing.filters.view']),
        block('table', 'Fatura Tablosu', ['invoices.outgoing.table.view']),
      ], 'Fatura listeleme ekranı', ['invoices.view']),
      tab('invoices', 'status', 'Durum ve Loglar', [
        block('status_modal', 'Durum Modalı', ['invoices.status.modal.view']),
        block('provider_status', 'Servis Sağlayıcı Durumu', ['invoices.status.provider.view']),
      ], 'Fatura durum detayları', ['invoices.status.view']),
      tab('invoices', 'documents', 'Belge İşlemleri', [
        block('preview', 'Belge Önizleme', ['invoices.documents.preview.view']),
        block('download', 'PDF / XML İndirme', ['invoices.documents.download.view']),
        block('send_cancel', 'Gönder / İptal İşlemleri', ['invoices.documents.actions.view']),
      ], 'Fatura belge aksiyonları', ['invoices.create', 'invoices.send', 'invoices.cancel']),
    ],
  },
  {
    key: 'inventory',
    category: 'inventory',
    label: 'Stok',
    description: 'Envanter, ürün yönetimi ve içe/dışa aktarma',
    icon: Package,
    permissions: ['inventory.view', 'inventory.manage'],
    tabs: [
      tab('inventory', 'overview', 'Stok Özeti', [
        block('stats', 'KPI Kartları', ['inventory.overview.stats.view']),
        block('filters', 'Gelişmiş Filtreler', ['inventory.overview.filters.view']),
        block('list', 'Envanter Listesi', ['inventory.overview.list.view']),
        block('cost_sensitive', 'Maliyet Bilgileri', ['sensitive.inventory.overview.cost.view']),
      ], 'Ana envanter ekranı', ['inventory.view']),
      tab('inventory', 'operations', 'Ürün İşlemleri', [
        block('create_edit', 'Yeni / Düzenle Modalı', ['inventory.operations.form.view']),
        block('import_export', 'İçe / Dışa Aktar', ['inventory.operations.transfer.view']),
        block('delete', 'Silme İşlemi', ['inventory.operations.delete.view']),
        block('cost_sensitive', 'Maliyet ve Alış Bilgileri', ['sensitive.inventory.operations.cost.view']),
      ], 'Envanter işlem akışları', ['inventory.manage']),
    ],
  },
  {
    key: 'campaigns',
    category: 'campaigns',
    label: 'Kampanyalar',
    description: 'Kampanya ve SMS akışları',
    icon: Megaphone,
    permissions: ['campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.delete', 'campaigns.send_sms'],
    tabs: [
      tab('campaigns', 'list', 'Kampanya Listesi', [
        block('table', 'Kampanya Tablosu', ['campaigns.list.table.view']),
        block('filters', 'Filtreler', ['campaigns.list.filters.view']),
      ], 'Kampanya listesi', ['campaigns.view']),
      tab('campaigns', 'actions', 'Kampanya İşlemleri', [
        block('editor', 'Kampanya Düzenleyici', ['campaigns.actions.editor.view']),
        block('sms', 'SMS Gönderimi', ['campaigns.actions.sms.view']),
      ], 'Kampanya düzenleme ve gönderim', ['campaigns.create', 'campaigns.edit', 'campaigns.send_sms']),
    ],
  },
  {
    key: 'personnel',
    category: 'personnel',
    label: 'Personel Yonetimi',
    description: 'Personel karti, izin, evrak ve prim takibi',
    icon: Briefcase,
    permissions: ['personnel.view', 'personnel.manage', 'personnel.leave.manage', 'personnel.documents.manage', 'personnel.premium.manage'],
    tabs: [
      tab('personnel', 'employees', 'Personel Kayitlari', [
        block('list', 'Personel Listesi', ['personnel.employees.list.view']),
        block('actions', 'Olustur / Duzenle', ['personnel.employees.actions.view']),
      ], 'Personel kartlari ve bagli bilgiler', ['personnel.view', 'personnel.manage']),
      tab('personnel', 'leave', 'Izin Yonetimi', [
        block('requests', 'Izin Talepleri', ['personnel.leave.requests.view']),
        block('balances', 'Hak Edis ve Bakiyeler', ['personnel.leave.balances.view']),
      ], 'Izin talep ve onay surecleri', ['personnel.leave.manage']),
      tab('personnel', 'documents', 'Evrak Yonetimi', [
        block('library', 'Evrak Listesi', ['personnel.documents.library.view']),
        block('compliance', 'Eksik / Suresi Dolan Evraklar', ['personnel.documents.compliance.view']),
      ], 'Ozluk evraklari ve belge uygunluk takibi', ['personnel.documents.manage']),
      tab('personnel', 'premium', 'Prim Takibi', [
        block('rules', 'Prim Kurallari', ['personnel.premium.rules.view']),
        block('periods', 'Donemsel Prim Kayitlari', ['personnel.premium.periods.view']),
      ], 'Bordroya giden prim girdileri', ['personnel.premium.manage']),
    ],
  },
  {
    key: 'sgk',
    category: 'sgk',
    label: 'SGK',
    description: 'SGK belge, yükleme, indirme ve iş akışı ekranları',
    icon: Shield,
    permissions: ['sgk.view', 'sgk.create', 'sgk.upload'],
    tabs: [
      tab('sgk', 'documents', 'Belgeler', [
        block('document_list', 'Belge Listesi', ['sgk.documents.list.view']),
        block('document_actions', 'Belge İşlemleri', ['sgk.documents.actions.view']),
        block('identity_sensitive', 'Hasta ve Kimlik Detayları', ['sensitive.sgk.documents.identity.view']),
      ], 'SGK belge ekranı', ['sgk.view']),
      tab('sgk', 'upload', 'Belge Yükle', [
        block('upload_panel', 'Yükleme Paneli', ['sgk.upload.panel.view']),
      ], 'Yeni SGK belge yükleme', ['sgk.upload']),
      tab('sgk', 'downloads', 'Belge İndir', [
        block('download_page', 'İndirme Sayfası', ['sgk.downloads.page.view']),
      ], 'SGK belge indirme ekranı', ['sgk.downloads.view']),
      tab('sgk', 'workflow', 'İş Akışı', [
        block('workflow_panel', 'İş Akışı Paneli', ['sgk.workflow.panel.view']),
      ], 'SGK iş akışı takibi', ['sgk.workflow.view']),
      tab('sgk', 'stats', 'İstatistikler', [
        block('stats_cards', 'KPI Kartları', ['sgk.stats.cards.view']),
      ], 'SGK özet istatistikleri', ['sgk.stats.view']),
    ],
  },
  {
    key: 'team',
    category: 'team',
    label: 'Ekip Yönetimi',
    description: 'Üyeler, şubeler ve rol izinleri',
    icon: Users,
    permissions: ['team.view', 'team.create', 'team.edit', 'team.delete', 'team.permissions', 'settings.branches'],
    tabs: [
      tab('team', 'members', 'Ekip Üyeleri', [
        block('list', 'Üye Listesi', ['team.members.list.view']),
        block('actions', 'Oluştur / Düzenle / Sil', ['team.members.actions.view']),
      ], 'Ekip üyesi listeleme ve düzenleme', ['team.view', 'team.create', 'team.edit', 'team.delete']),
      tab('team', 'branches', 'Şubeler', [
        block('list', 'Şube Listesi', ['team.branches.list.view']),
        block('actions', 'Şube İşlemleri', ['team.branches.actions.view']),
      ], 'Şube tanımları ve erişim atamaları', ['settings.branches']),
      tab('team', 'permissions', 'Rol İzinleri', [
        block('pages', 'Sayfa Yetkileri', ['team.permissions.pages.view']),
        block('tabs', 'Sekme Yetkileri', ['team.permissions.tabs.view']),
        block('blocks', 'Blok Yetkileri', ['team.permissions.blocks.view']),
      ], 'Rollerin erişimlerini yönetir', ['team.permissions']),
    ],
  },
  {
    key: 'settings',
    category: 'settings',
    label: 'Ayarlar',
    description: 'Firma, entegrasyon ve sistem ayarları',
    icon: Settings,
    permissions: ['settings.view', 'settings.edit', 'settings.integrations'],
    tabs: [
      tab('settings', 'company', 'Firma Bilgileri', [
        block('profile', 'Firma Profil Bilgileri', ['settings.company.profile.view']),
        block('branding', 'Logo ve Marka Ayarları', ['settings.company.branding.view']),
      ], 'Firma bilgileri ayarları', ['settings.view', 'settings.edit']),
      tab('settings', 'integration', 'Entegrasyonlar', [
        block('services', 'Servis Bağlantıları', ['settings.integration.services.view']),
        block('credentials', 'Anahtar ve Kimlik Bilgileri', ['settings.integration.credentials.view']),
      ], 'Entegrasyon ayarları', ['settings.integrations']),
      tab('settings', 'team', 'Ekip Yönetimi', [
        block('members', 'Ekip Üyeleri Ayarları', ['settings.team.members.view']),
        block('roles', 'Rol ve Şube Ayarları', ['settings.team.roles.view']),
      ], 'Ekip yönetimi ayarları', ['team.view', 'team.permissions']),
      tab('settings', 'parties', 'Hasta Ayarları', [
        block('segments', 'Segment ve Etiket Ayarları', ['settings.parties.segments.view']),
        block('forms', 'Hasta Form Ayarları', ['settings.parties.forms.view']),
      ], 'Hasta yönetimi ayarları', ['settings.view']),
      tab('settings', 'sgk', 'SGK & Satış Ayarları', [
        block('sgk', 'SGK Konfigürasyonu', ['settings.sgk.config.view']),
        block('sales', 'Satış Süreç Ayarları', ['settings.sgk.sales.view']),
      ], 'SGK ve satış ayarları', ['settings.view']),
      tab('settings', 'subscription', 'Abonelik', [
        block('plan', 'Paket Bilgileri', ['settings.subscription.plan.view']),
        block('billing', 'Faturalama ve Limitler', ['settings.subscription.billing.view']),
      ], 'Abonelik ve plan ayarları', ['settings.view']),
    ],
  },
  {
    key: 'reports',
    category: 'reports',
    label: 'Raporlar',
    description: 'Sayfa, sekme ve blok seviyesinde rapor erişimleri',
    icon: BarChart,
    permissions: ['reports.view', 'reports.export'],
    tabs: [
      {
        key: 'overview',
        label: 'Genel Bakış',
        description: 'Ana KPI ve özet dağılımlar',
        permissions: ['reports.overview.view'],
        blocks: [
          block('kpis', 'KPI Kartları', ['reports.overview.kpis.view']),
          block('patients', 'Hasta İstatistikleri', ['reports.overview.patients.view']),
          block('payments', 'Ödeme Yöntemleri', ['reports.overview.payments.view']),
          block('financial_sensitive', 'Finansal KPI Detayları', ['sensitive.reports.overview.financials.view'])
        ]
      },
      {
        key: 'sales',
        label: 'Satış Raporları',
        description: 'Gelir trendi ve satış tabloları',
        permissions: ['reports.sales.view'],
        blocks: [
          block('trend', 'Gelir Trendi', ['reports.sales.trend.view']),
          block('products', 'Marka Bazlı Satışlar', ['reports.sales.products.view']),
          block('financial_sensitive', 'Ciro, Marj ve Karlılık', ['sensitive.reports.sales.financials.view'])
        ]
      },
      {
        key: 'parties',
        label: 'Hasta Raporları',
        description: 'Segment, kaynak ve randevu kırılımları',
        permissions: ['reports.parties.view'],
        blocks: [
          block('summary', 'KPI Kartları', ['reports.parties.summary.view']),
          block('segments', 'Hasta Segmentleri', ['reports.parties.segments.view']),
          block('acquisition', 'Hasta Kaynakları', ['reports.parties.acquisition.view']),
          block('appointments', 'Randevu Sonuçları', ['reports.parties.appointments.view']),
          block('age_distribution', 'Yaş Dağılımı', ['reports.parties.age_distribution.view']),
          block('patient_sensitive', 'İletişim ve Kimlik Dağılımları', ['sensitive.reports.parties.identity.view'])
        ]
      },
      {
        key: 'promissory',
        label: 'Senet Raporları',
        description: 'Senet özetleri, grafikler ve listeler',
        permissions: ['reports.promissory.view'],
        blocks: [
          block('summary', 'KPI Kartları', ['reports.promissory.summary.view']),
          block('monthly_counts', 'Aylık Senet Sayısı', ['reports.promissory.monthly_counts.view']),
          block('monthly_collections', 'Aylık Senet Tahsilatı', ['reports.promissory.monthly_collections.view']),
          block('by_patient', 'Hasta Bazlı Senet Özeti', ['reports.promissory.by_patient.view']),
          block('list', 'Senet Listesi', ['reports.promissory.list.view']),
          block('financial_sensitive', 'Tutar ve Tahsilat Detayları', ['sensitive.reports.promissory.financials.view'])
        ]
      },
      {
        key: 'remaining',
        label: 'Kalan Ödemeler',
        description: 'Tahsilat ve kasa özetleri',
        permissions: ['reports.remaining.view'],
        blocks: [
          block('cashflow', 'Kasa Özeti', ['reports.remaining.cashflow.view']),
          block('summary', 'Tahsilat Özeti', ['reports.remaining.summary.view']),
          block('table', 'Kalan Ödemeler Tablosu', ['reports.remaining.table.view']),
          block('financial_sensitive', 'Finansal Detaylar', ['sensitive.reports.remaining.financials.view'])
        ]
      },
      {
        key: 'pos_movements',
        label: 'POS Hareketleri',
        description: 'POS başarısı ve hareket tablosu',
        permissions: ['reports.pos_movements.view'],
        blocks: [
          block('summary', 'KPI Kartları', ['reports.pos_movements.summary.view']),
          block('table', 'POS Hareketleri Tablosu', ['reports.pos_movements.table.view']),
          block('financial_sensitive', 'Tutar ve Komisyon Detayları', ['sensitive.reports.pos_movements.financials.view'])
        ]
      },
      {
        key: 'report_tracking',
        label: 'Rapor Takibi',
        description: 'Rapor ve teslim durum takibi',
        permissions: ['reports.report_tracking.view'],
        blocks: [
          block('table', 'Takip Tablosu', ['reports.report_tracking.table.view']),
          block('detail', 'Detay Modalı', ['reports.report_tracking.detail.view']),
          block('patient_sensitive', 'Hasta ve Satış Detayları', ['sensitive.reports.report_tracking.details.view'])
        ]
      },
      {
        key: 'activity',
        label: 'İşlem Dökümü',
        description: 'Aktivite kayıtları ve detay modalı',
        permissions: ['reports.activity.view', 'activity_logs.view'],
        blocks: [
          block('table', 'Kayıt Tablosu', ['reports.activity.table.view']),
          block('detail', 'Detay Modalı', ['reports.activity.detail.view']),
          block('sensitive_data', 'Log Detay Verisi', ['sensitive.reports.activity.details.view'])
        ]
      }
    ]
  }
];

export const PERMISSION_PAGE_REGISTRY_MAP = Object.fromEntries(
  PERMISSION_PAGE_REGISTRY.map((page) => [page.key, page])
);
