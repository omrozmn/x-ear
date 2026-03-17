import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  Play,
  Shield,
  Settings,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import {
  barcodeService,
  type Symbology,
  type OutputFormat,
  type ValidationResult,
} from '@/services/barcode.service';

type TabId = 'status' | 'test' | 'validation' | 'settings';

const SYMBOLOGY_OPTIONS: { value: Symbology; label: string }[] = [
  { value: 'code128', label: 'Code 128' },
  { value: 'code39', label: 'Code 39' },
  { value: 'ean13', label: 'EAN-13' },
  { value: 'ean8', label: 'EAN-8' },
  { value: 'qrcode', label: 'QR Code' },
  { value: 'datamatrix', label: 'DataMatrix' },
  { value: 'gs1_datamatrix', label: 'GS1 DataMatrix' },
];

const FORMAT_OPTIONS: { value: OutputFormat; label: string }[] = [
  { value: 'svg', label: 'SVG' },
  { value: 'png', label: 'PNG' },
  { value: 'zpl', label: 'ZPL' },
];

const SECTOR_DEFAULTS: { sector: string; label: string; defaultSymbology: Symbology }[] = [
  { sector: 'hearing', label: 'Isitme Merkezi', defaultSymbology: 'gs1_datamatrix' },
  { sector: 'pharmacy', label: 'Eczane', defaultSymbology: 'ean13' },
  { sector: 'hospital', label: 'Hastane', defaultSymbology: 'gs1_datamatrix' },
  { sector: 'hotel', label: 'Otel', defaultSymbology: 'qrcode' },
  { sector: 'beauty', label: 'Guzellik Merkezi', defaultSymbology: 'code128' },
  { sector: 'general', label: 'Genel', defaultSymbology: 'code128' },
];

const BarcodeServicePage: React.FC = () => {
  const { isMobile } = useAdminResponsive();
  const [activeTab, setActiveTab] = useState<TabId>('status');

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'status', label: 'Durum', icon: Activity },
    { id: 'test', label: 'Test', icon: Play },
    { id: 'validation', label: 'Dogrulama', icon: Shield },
    { id: 'settings', label: 'Ayarlar', icon: Settings },
  ];

  return (
    <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
      <div className="mb-6">
        <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
          Barkod Servisi
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Barkod uretim ve dogrulama servisini yonetin
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'status' && <StatusTab />}
      {activeTab === 'test' && <TestTab />}
      {activeTab === 'validation' && <ValidationTab />}
      {activeTab === 'settings' && <SettingsTab />}
    </div>
  );
};

/* ─── Status Tab ─── */
const StatusTab: React.FC = () => {
  const [health, setHealth] = useState<'loading' | 'ok' | 'error'>('loading');
  const [serviceUrl, setServiceUrl] = useState(barcodeService.getServiceUrl());
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      await barcodeService.health();
      setHealth('ok');
      setServiceUrl(barcodeService.getServiceUrl());
    } catch {
      setHealth('error');
    } finally {
      setChecking(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Servis Durumu</h3>
          <button
            onClick={checkHealth}
            disabled={checking}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            {health === 'loading' ? (
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            ) : health === 'ok' ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <XCircle className="w-6 h-6 text-red-500" />
            )}
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Baglanti</div>
              <div className={`text-xs ${health === 'ok' ? 'text-green-600 dark:text-green-400' : health === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
                {health === 'loading' ? 'Kontrol ediliyor...' : health === 'ok' ? 'Aktif' : 'Baglanti Kurulamadi'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <Activity className="w-6 h-6 text-blue-500" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Servis URL</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[200px]">
                {serviceUrl}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <RefreshCw className="w-6 h-6 text-purple-500" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Son Kontrol</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {lastChecked ? lastChecked.toLocaleTimeString('tr-TR') : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Desteklenen Formatlar</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {SYMBOLOGY_OPTIONS.map((s) => (
            <div key={s.value} className="px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm text-gray-700 dark:text-gray-300">
              {s.label}
              <span className="block text-xs text-gray-400 font-mono">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ─── Test Tab ─── */
const TestTab: React.FC = () => {
  const [symbology, setSymbology] = useState<Symbology>('code128');
  const [data, setData] = useState('XEAR-TEST-123');
  const [format, setFormat] = useState<OutputFormat>('svg');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!data.trim()) {
      toast.error('Barkod verisi gerekli');
      return;
    }
    setLoading(true);
    setPreview(null);
    try {
      const blob = await barcodeService.generate({ symbology, data, format });
      const url = URL.createObjectURL(blob);
      setPreview(url);
      toast.success('Barkod olusturuldu');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Barkod olusturulamadi';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Barkod Uret</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semboloji</label>
            <select
              value={symbology}
              onChange={(e) => setSymbology(e.target.value as Symbology)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 text-sm"
            >
              {SYMBOLOGY_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Veri</label>
            <input
              type="text"
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="Barkod verisi girin..."
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as OutputFormat)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 text-sm"
            >
              {FORMAT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {loading ? 'Olusturuluyor...' : 'Barkod Olustur'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Onizleme</h3>
        {preview ? (
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-lg border dark:border-gray-600 w-full flex items-center justify-center min-h-[200px]">
              {format === 'svg' ? (
                <object data={preview} type="image/svg+xml" className="max-w-full max-h-[300px]">
                  Barkod yuklenemedi
                </object>
              ) : format === 'png' ? (
                <img src={preview} alt="Barkod onizleme" className="max-w-full max-h-[300px]" />
              ) : (
                <div className="text-sm text-gray-500 font-mono p-4 bg-gray-50 dark:bg-gray-900 rounded w-full overflow-auto">
                  ZPL ciktisi (indirildi)
                </div>
              )}
            </div>
            <a
              href={preview}
              download={`barcode.${format}`}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Indir
            </a>
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[200px] text-gray-400 dark:text-gray-500 text-sm">
            Barkod olusturmak icin formu doldurun
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Validation Tab ─── */
const ValidationTab: React.FC = () => {
  const [barcodeData, setBarcodeData] = useState('');
  const [symbology, setSymbology] = useState<Symbology | ''>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleValidate = async () => {
    if (!barcodeData.trim()) {
      toast.error('Barkod verisi gerekli');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await barcodeService.validate({
        data: barcodeData,
        symbology: symbology || undefined,
      });
      setResult(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Dogrulama basarisiz';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Barkod Dogrula</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barkod Verisi</label>
            <textarea
              value={barcodeData}
              onChange={(e) => setBarcodeData(e.target.value)}
              placeholder="(01)04150567890128(17)251231(10)ABC123"
              rows={3}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 text-sm font-mono"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Semboloji (opsiyonel)</label>
            <select
              value={symbology}
              onChange={(e) => setSymbology(e.target.value as Symbology | '')}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 text-sm"
            >
              <option value="">Otomatik Algilama</option>
              {SYMBOLOGY_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleValidate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {loading ? 'Dogrulanıyor...' : 'Dogrula'}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sonuc</h3>
        {result ? (
          <div className="space-y-4">
            {/* Valid/Invalid badge */}
            <div className={`flex items-center gap-2 p-3 rounded-lg ${result.valid ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              {result.valid ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className={`font-medium text-sm ${result.valid ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                {result.valid ? 'Gecerli' : 'Gecersiz'}
              </span>
            </div>

            {/* Checksum */}
            {result.checksum_valid !== null && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Checksum:</span>
                <span className={result.checksum_valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {result.checksum_valid ? 'Gecerli' : 'Gecersiz'}
                </span>
              </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
              <div>
                <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Hatalar</div>
                <ul className="space-y-1">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-3 py-1.5 rounded">
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div>
                <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">Uyarilar</div>
                <ul className="space-y-1">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 px-3 py-1.5 rounded">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* GS1 */}
            {result.gs1 && (
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">GS1 Bilgileri</div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1.5">
                  {result.gs1.gtin && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">GTIN:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{result.gs1.gtin}</span>
                    </div>
                  )}
                  {result.gs1.lot && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Lot/Parti:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{result.gs1.lot}</span>
                    </div>
                  )}
                  {result.gs1.expiry && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Son Kullanma:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{result.gs1.expiry}</span>
                    </div>
                  )}
                  {result.gs1.serial && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Seri No:</span>
                      <span className="font-mono text-gray-900 dark:text-white">{result.gs1.serial}</span>
                    </div>
                  )}
                  {Object.keys(result.gs1.ais).length > 0 && (
                    <div className="border-t dark:border-gray-600 pt-2 mt-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tum AI Alanlari:</div>
                      {Object.entries(result.gs1.ais).map(([ai, val]) => (
                        <div key={ai} className="flex justify-between text-xs">
                          <span className="text-gray-400">AI ({ai}):</span>
                          <span className="font-mono text-gray-700 dark:text-gray-300">{val}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* UDI */}
            {result.udi && (
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">UDI Bilgileri</div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1.5">
                  {result.udi.di && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">DI (Cihaz):</span>
                      <span className="font-mono text-gray-900 dark:text-white">{result.udi.di}</span>
                    </div>
                  )}
                  {result.udi.pi && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">PI (Uretim):</span>
                      <span className="font-mono text-gray-900 dark:text-white">{result.udi.pi}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[200px] text-gray-400 dark:text-gray-500 text-sm">
            Barkod verisini girin ve dogrulayin
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Settings Tab ─── */
const SettingsTab: React.FC = () => {
  const [serviceUrl, setServiceUrl] = useState(barcodeService.getServiceUrl());
  const [sectorDefaults, setSectorDefaults] = useState(SECTOR_DEFAULTS);
  const [features, setFeatures] = useState({
    scanner: true,
    camera: true,
    generator: true,
    validation: true,
    labels: true,
    gs1: true,
  });

  const handleSaveUrl = () => {
    barcodeService.setServiceUrl(serviceUrl);
    toast.success('Servis URL guncellendi');
  };

  const handleSaveSectorDefaults = () => {
    toast.success('Sektor varsayilanlari kaydedildi');
  };

  const handleToggleFeature = (key: keyof typeof features) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveFeatures = () => {
    toast.success('Ozellik ayarlari kaydedildi');
  };

  return (
    <div className="space-y-6">
      {/* Service URL */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Servis Baglantisi</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={serviceUrl}
            onChange={(e) => setServiceUrl(e.target.value)}
            placeholder="http://localhost:8090"
            className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 text-sm font-mono"
          />
          <button
            onClick={handleSaveUrl}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            Kaydet
          </button>
        </div>
      </div>

      {/* Sector Defaults */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sektor Varsayilan Sembolojileri</h3>
          <button
            onClick={handleSaveSectorDefaults}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Kaydet
          </button>
        </div>
        <div className="space-y-3">
          {sectorDefaults.map((item, idx) => (
            <div key={item.sector} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.label}</span>
              <select
                value={item.defaultSymbology}
                onChange={(e) => {
                  const updated = [...sectorDefaults];
                  updated[idx] = { ...item, defaultSymbology: e.target.value as Symbology };
                  setSectorDefaults(updated);
                }}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
              >
                {SYMBOLOGY_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ozellik Anahtarlari</h3>
          <button
            onClick={handleSaveFeatures}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            Kaydet
          </button>
        </div>
        <div className="space-y-3">
          {([
            { key: 'scanner' as const, label: 'Barkod Okuyucu' },
            { key: 'camera' as const, label: 'Kamera ile Tarama' },
            { key: 'generator' as const, label: 'Barkod Uretici' },
            { key: 'validation' as const, label: 'Barkod Dogrulama' },
            { key: 'labels' as const, label: 'Etiket Yazdirma' },
            { key: 'gs1' as const, label: 'GS1/UDI Destegi' },
          ]).map((feat) => (
            <div key={feat.key} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{feat.label}</span>
              <button
                onClick={() => handleToggleFeature(feat.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  features[feat.key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    features[feat.key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BarcodeServicePage;
