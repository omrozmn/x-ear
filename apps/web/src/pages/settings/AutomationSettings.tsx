import { useState, useEffect } from 'react';
import { Loader2, Zap, Package, Users, RefreshCw } from 'lucide-react';
import { customInstance } from '@/api/orval-mutator';
import toast from 'react-hot-toast';

interface AutomationSettings {
  autoAddSuppliers: boolean;
  autoAddInvoiceProducts: boolean;
  autoUpdateStock: boolean;
  autoReceiveUtsPending: boolean;
  autoAcceptUtsTransfers: boolean;
}

export function AutomationSettings() {
  const [settings, setSettings] = useState<AutomationSettings>({
      autoAddSuppliers: false,
      autoAddInvoiceProducts: false,
      autoUpdateStock: false,
      autoReceiveUtsPending: false,
      autoAcceptUtsTransfers: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const resp = await customInstance<{ data: Record<string, boolean> }>({
        url: '/api/settings/automation',
        method: 'GET',
      });
      const d = resp?.data;
      if (d) {
        setSettings({
          autoAddSuppliers: d.autoAddSuppliers ?? d.auto_add_suppliers ?? false,
          autoAddInvoiceProducts: d.autoAddInvoiceProducts ?? d.auto_add_invoice_products ?? false,
          autoUpdateStock: d.autoUpdateStock ?? d.auto_update_stock ?? false,
          autoReceiveUtsPending: d.autoReceiveUtsPending ?? d.auto_receive_uts_pending ?? false,
          autoAcceptUtsTransfers: d.autoAcceptUtsTransfers ?? d.auto_accept_uts_transfers ?? false,
        });
      }
    } catch {
      // Default settings are fine
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof AutomationSettings, value: boolean) => {
    const prev = settings[key];
    setSettings(s => ({ ...s, [key]: value }));
    setSaving(true);

    // Map camelCase keys to snake_case for the API
    const keyMap: Record<string, string> = {
      autoAddSuppliers: 'auto_add_suppliers',
      autoAddInvoiceProducts: 'auto_add_invoice_products',
      autoUpdateStock: 'auto_update_stock',
      autoReceiveUtsPending: 'auto_receive_uts_pending',
      autoAcceptUtsTransfers: 'auto_accept_uts_transfers',
    };

    try {
      await customInstance({
        url: '/api/settings/automation',
        method: 'PUT',
        data: { [keyMap[key]]: value },
      });
      toast.success(value ? 'Otomasyon aktifleştirildi' : 'Otomasyon devre dışı bırakıldı');
    } catch {
      setSettings(s => ({ ...s, [key]: prev }));
      toast.error('Ayar güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const toggles: Array<{
    key: keyof AutomationSettings;
    icon: typeof Users;
    title: string;
    description: string;
    color: string;
  }> = [
    {
      key: 'autoAddSuppliers',
      icon: Users,
      title: 'Önerilen Tedarikçileri Otomatik Ekle',
      description: 'GİB üzerinden gelen faturalardaki tedarikçiler otomatik olarak "Tedarikçilerim" listesine eklenir.',
      color: 'indigo',
    },
    {
      key: 'autoAddInvoiceProducts',
      icon: Package,
      title: 'Fatura Ürünlerini Otomatik Envantere Ekle',
      description: 'Gelen faturalardaki ürünler otomatik olarak envantere eklenir. Marka ve model bilgisi ürün adından otomatik ayrıştırılır.',
      color: 'emerald',
    },
    {
      key: 'autoUpdateStock',
      icon: RefreshCw,
      title: 'Stokları Otomatik Güncelle',
      description: 'Gelen faturalardaki ürünler envanterde zaten mevcutsa, stok miktarı faturadaki miktar kadar otomatik artırılır.',
      color: 'amber',
    },
    {
      key: 'autoReceiveUtsPending',
      icon: Package,
      title: 'Alma Bekleyenleri Otomatik Al',
      description: 'UTS alma bekleyenler listesine dusen seri no kayitlari icin alma bildirimi otomatik tetiklenir.',
      color: 'sky',
    },
    {
      key: 'autoAcceptUtsTransfers',
      icon: Zap,
      title: 'Gelen Verme Taleplerini Otomatik Onayla',
      description: 'UTS transfer taleplerinde kullanici yerine otomatik kabul / onay akisini hazirlar.',
      color: 'violet',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 px-6 py-4 rounded-xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-200">Otomasyon Ayarları</h3>
        </div>
        <p className="text-xs text-purple-700 dark:text-purple-300">
          Fatura senkronizasyonu sırasında otomatik olarak gerçekleştirilecek işlemleri yapılandırın.
        </p>
      </div>

      <div className="space-y-4">
        {toggles.map(({ key, icon: Icon, title, description, color }) => (
          <div
            key={key}
            className="flex items-start gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center`}>
              <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h4>
                <button
                  data-allow-raw="true"
                  type="button"
                  role="switch"
                  aria-checked={settings[key]}
                  disabled={saving}
                  onClick={() => updateSetting(key, !settings[key])}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${
                    settings[key] ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings[key] ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
