import React, { useState, useEffect } from 'react';
import { Shield, Plus, Trash2, Save, Loader2, AlertCircle } from 'lucide-react';
import { customInstance } from '@/api/orval-mutator';
import toast from 'react-hot-toast';
import { extractErrorMessage } from '@/utils/error-utils';

interface SgkScheme {
  name: string;
  coverage_amount: number;
  max_amount: number;
}

interface SgkSettings {
  default_scheme: string;
  schemes: Record<string, Omit<SgkScheme, 'name'>>;
}

const DEFAULT_SCHEMES: SgkScheme[] = [
  { name: 'over18_working', coverage_amount: 4239.2, max_amount: 10000 },
  { name: 'under18', coverage_amount: 5000, max_amount: 10000 },
  { name: 'standard', coverage_amount: 0, max_amount: 0 },
];

export default function SgkSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SgkSettings>({
    default_scheme: 'over18_working',
    schemes: {},
  });
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
        setSettings(sgkSettings);
        
        // Extract custom schemes (not in default list)
        const custom: SgkScheme[] = [];
        Object.entries(sgkSettings.schemes).forEach(([name, config]) => {
          if (!DEFAULT_SCHEMES.find(s => s.name === name)) {
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

      // Merge default and custom schemes
      const allSchemes: Record<string, Omit<SgkScheme, 'name'>> = {};
      
      DEFAULT_SCHEMES.forEach(scheme => {
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
          default_scheme: settings.default_scheme,
          schemes: allSchemes,
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
      ...customSchemes,
      { name: '', coverage_amount: 0, max_amount: 0 },
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

  const updateDefaultScheme = (field: keyof Omit<SgkScheme, 'name'>, schemeName: string, value: number) => {
    const scheme = DEFAULT_SCHEMES.find(s => s.name === schemeName);
    if (scheme) {
      scheme[field] = value;
      setSettings({ ...settings });
    }
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <Shield className="w-7 h-7 text-indigo-600" />
          SGK Ödeme Ayarları
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          SGK destek şemalarını ve ödeme tutarlarını yönetin
        </p>
      </div>

      {/* Default Scheme Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Varsayılan Şema
        </h2>
        <select
          data-allow-raw="true"
          value={settings.default_scheme}
          onChange={(e) => setSettings({ ...settings, default_scheme: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          {DEFAULT_SCHEMES.map(scheme => (
            <option key={scheme.name} value={scheme.name}>
              {scheme.name}
            </option>
          ))}
          {customSchemes.map(scheme => (
            <option key={scheme.name} value={scheme.name}>
              {scheme.name}
            </option>
          ))}
        </select>
      </div>

      {/* Default Schemes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Standart Şemalar
        </h2>
        <div className="space-y-4">
          {DEFAULT_SCHEMES.map((scheme) => (
            <div key={scheme.name} className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Şema Adı
                </label>
                <input
                  data-allow-raw="true"
                  type="text"
                  value={scheme.name}
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
                  onChange={(e) => updateDefaultScheme('coverage_amount', scheme.name, parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maksimum Tutar (₺)
                </label>
                <input
                  data-allow-raw="true"
                  type="number"
                  step="0.01"
                  value={scheme.max_amount}
                  onChange={(e) => updateDefaultScheme('max_amount', scheme.name, parseFloat(e.target.value) || 0)}
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
          <button
            data-allow-raw="true"
            onClick={addCustomScheme}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Yeni Şema Ekle
          </button>
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
              <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl">
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
                    onChange={(e) => updateCustomScheme(index, 'coverage_amount', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Maksimum Tutar (₺)
                  </label>
                  <input
                    data-allow-raw="true"
                    type="number"
                    step="0.01"
                    value={scheme.max_amount}
                    onChange={(e) => updateCustomScheme(index, 'max_amount', parseFloat(e.target.value) || 0)}
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

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          data-allow-raw="true"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Kaydet
            </>
          )}
        </button>
      </div>
    </div>
  );
}
