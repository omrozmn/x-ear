import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Save, Loader2, AlertCircle, Settings2 } from 'lucide-react';
import { customInstance } from '@/api/orval-mutator';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-utils';
import { SettingsSectionHeader } from '../../components/layout/SettingsSectionHeader';

interface SgkScheme {
  name: string;
  coverage_amount: number;
  max_amount: number;
}

interface SgkSettings {
  schemes: Record<string, Omit<SgkScheme, 'name'>>;
  discount_before_sgk?: boolean;
  discount_includes_kdv?: boolean;
}

// Standard SGK age-based schemes with official amounts (per ear)
const STANDARD_SCHEMES: SgkScheme[] = [
  { name: 'over18_working', coverage_amount: 3391.36, max_amount: 10000 },
  { name: 'over18_retired', coverage_amount: 4239.20, max_amount: 10000 },
  { name: 'under4_parent_working', coverage_amount: 6104.44, max_amount: 10000 },
  { name: 'under4_parent_retired', coverage_amount: 7630.56, max_amount: 10000 },
  { name: 'age5_12_parent_working', coverage_amount: 5426.17, max_amount: 10000 },
  { name: 'age5_12_parent_retired', coverage_amount: 6782.72, max_amount: 10000 },
  { name: 'age13_18_parent_working', coverage_amount: 5087.04, max_amount: 10000 },
  { name: 'age13_18_parent_retired', coverage_amount: 6358.88, max_amount: 10000 },
];

const SCHEME_LABELS: Record<string, string> = {
  'over18_working': '18+ yaş, çalışan',
  'over18_retired': '18+ yaş, emekli',
  'under4_parent_working': '0-4 yaş, çalışan ebeveyn',
  'under4_parent_retired': '0-4 yaş, emekli ebeveyn',
  'age5_12_parent_working': '5-12 yaş, çalışan ebeveyn',
  'age5_12_parent_retired': '5-12 yaş, emekli ebeveyn',
  'age13_18_parent_working': '13-18 yaş, çalışan ebeveyn',
  'age13_18_parent_retired': '13-18 yaş, emekli ebeveyn',
};

export default function SgkSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SgkSettings>({
    schemes: {},
    discount_before_sgk: false,
    discount_includes_kdv: true,
  });
  const [standardSchemes, setStandardSchemes] = useState<SgkScheme[]>(
    STANDARD_SCHEMES.map(s => ({ ...s }))
  );
  const [customSchemes, setCustomSchemes] = useState<SgkScheme[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await customInstance<{ data: { settings: { sgk?: SgkSettings } } }>({
        url: '/api/settings',
        method: 'GET',
      });

      const sgkSettings = response.data?.settings?.sgk;
      if (sgkSettings) {
        setSettings({
          schemes: sgkSettings.schemes || {},
          discount_before_sgk: sgkSettings.discount_before_sgk ?? false,
          discount_includes_kdv: sgkSettings.discount_includes_kdv ?? true,
        });
        
        const storedSchemes = sgkSettings.schemes || {};
        const standardNames = new Set(STANDARD_SCHEMES.map(s => s.name));
        
        // Update standard schemes with stored amounts (if any)
        setStandardSchemes(STANDARD_SCHEMES.map(s => {
          const stored = storedSchemes[s.name];
          return stored
            ? { name: s.name, coverage_amount: stored.coverage_amount, max_amount: stored.max_amount }
            : { ...s };
        }));
        
        // Extract custom schemes (not in standard list)
        const custom: SgkScheme[] = [];
        Object.entries(storedSchemes).forEach(([name, config]) => {
          if (!standardNames.has(name)) {
            custom.push({ name, ...config });
          }
        });
        setCustomSchemes(custom);
      }
    } catch (error) {
      toast.error('SGK ayarları yüklenemedi: ' + extractErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Merge standard and custom schemes
      const allSchemes: Record<string, Omit<SgkScheme, 'name'>> = {};
      
      standardSchemes.forEach(scheme => {
        allSchemes[scheme.name] = {
          coverage_amount: scheme.coverage_amount,
          max_amount: scheme.max_amount,
        };
      });

      customSchemes.forEach(scheme => {
        allSchemes[scheme.name] = {
          coverage_amount: scheme.coverage_amount,
          max_amount: scheme.max_amount,
        };
      });

      const payload = {
        sgk: {
          schemes: allSchemes,
          discount_before_sgk: settings.discount_before_sgk ?? false,
          discount_includes_kdv: settings.discount_includes_kdv ?? true,
        },
      };

      await customInstance({
        url: '/api/settings',
        method: 'PUT',
        data: payload,
      });

      toast.success('SGK ayarları kaydedildi');
    } catch (error) {
      toast.error('Kaydetme hatası: ' + extractErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const addCustomScheme = () => {
    setCustomSchemes([
      { name: '', coverage_amount: 0, max_amount: 0 },
      ...customSchemes,
    ]);
  };

  const removeCustomScheme = (index: number) => {
    setCustomSchemes(customSchemes.filter((_, i) => i !== index));
  };

  const updateCustomScheme = (index: number, field: keyof SgkScheme, value: string | number) => {
    const updated = [...customSchemes];
    updated[index] = { ...updated[index], [field]: value };
    setCustomSchemes(updated);
  };

  const updateStandardScheme = (field: keyof Omit<SgkScheme, 'name'>, schemeName: string, value: number) => {
    setStandardSchemes(prev => prev.map(s =>
      s.name === schemeName ? { ...s, [field]: value } : s
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <SettingsSectionHeader
        className="mb-8"
        title="SGK & Satış Ayarları"
        description="SGK destek şemalarını, ödeme tutarlarını ve fiyatlandırma formülünü yönetin"
        icon={<Shield className="w-6 h-6" />}
      />

      {/* Pricing Formula Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Fiyatlandırma Formülü
          </h2>
        </div>
        <div className="space-y-5">
          {/* SGK Priority Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                İndirim Önceliği
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {settings.discount_before_sgk
                  ? 'İndirim önce uygulanır, ardından SGK düşülür'
                  : 'SGK önce düşülür, ardından indirim uygulanır (varsayılan)'}
              </p>
            </div>
            <button
              data-allow-raw="true"
              type="button"
              role="switch"
              aria-checked={settings.discount_before_sgk}
              onClick={() => setSettings({ ...settings, discount_before_sgk: !settings.discount_before_sgk })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.discount_before_sgk ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.discount_before_sgk ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* KDV Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                KDV Dahil İndirim
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {settings.discount_includes_kdv
                  ? 'Yüzde indirim KDV dahil tutar üzerinden hesaplanır'
                  : 'Yüzde indirim KDV hariç tutar üzerinden hesaplanır (varsayılan)'}
              </p>
            </div>
            <button
              data-allow-raw="true"
              type="button"
              role="switch"
              aria-checked={settings.discount_includes_kdv}
              onClick={() => setSettings({ ...settings, discount_includes_kdv: !settings.discount_includes_kdv })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.discount_includes_kdv ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.discount_includes_kdv ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Standard Schemes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Standart SGK Şemaları
        </h2>
        <div className="space-y-4">
          {standardSchemes.map((scheme) => (
            <div key={scheme.name} className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Şema Adı
                </label>
                <input
                  data-allow-raw="true"
                  type="text"
                  value={SCHEME_LABELS[scheme.name] || scheme.name}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Destek Tutarı (₺)
                </label>
                <input
                  data-allow-raw="true"
                  type="number"
                  step="0.01"
                  value={scheme.coverage_amount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => updateStandardScheme('coverage_amount', scheme.name, parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Schemes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Özel Şemalar
          </h2>
          <div className="flex items-center gap-2">
            <button
              data-allow-raw="true"
              onClick={addCustomScheme}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni Şema Ekle
            </button>
            <button
              data-allow-raw="true"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-2xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Kaydet
            </button>
          </div>
        </div>

        {customSchemes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Henüz özel şema eklenmemiş</p>
            <p className="text-sm mt-1">Yukarıdaki butona tıklayarak yeni şema ekleyebilirsiniz</p>
          </div>
        ) : (
          <div className="space-y-4">
            {customSchemes.map((scheme, index) => (
              <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Şema Adı
                  </label>
                  <input
                    data-allow-raw="true"
                    type="text"
                    value={scheme.name}
                    onChange={(e) => updateCustomScheme(index, 'name', e.target.value)}
                    placeholder="ornek_sema"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Destek Tutarı (₺)
                  </label>
                  <input
                    data-allow-raw="true"
                    type="number"
                    step="0.01"
                    value={scheme.coverage_amount}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => updateCustomScheme(index, 'coverage_amount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    data-allow-raw="true"
                    onClick={() => removeCustomScheme(index)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


    </div>
  );
}
