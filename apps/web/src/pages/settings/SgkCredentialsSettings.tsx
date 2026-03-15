import { useState, useEffect, useCallback } from 'react';
import { Shield, Loader2, Save, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { customInstance } from '@/api/orval-mutator';
import { SettingsSectionHeader } from '../../components/layout/SettingsSectionHeader';
import { Button, Input, useToastHelpers } from '@x-ear/ui-web';
import { extractErrorMessage } from '@/utils/error-utils';

interface SgkCredentialsData {
  tesisKodu: string | null;
  hasTesisSifresi: boolean;
  mesulMudurTc: string | null;
  hasMesulMudurSifresi: boolean;
}

interface SgkCredsForm {
  tesisKodu: string;
  tesisSifresi: string;
  mesulMudurTc: string;
  mesulMudurSifresi: string;
}

export default function SgkCredentialsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stored, setStored] = useState<SgkCredentialsData | null>(null);
  const [form, setForm] = useState<SgkCredsForm>({
    tesisKodu: '',
    tesisSifresi: '',
    mesulMudurTc: '',
    mesulMudurSifresi: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    tesisSifresi: false,
    mesulMudurSifresi: false,
  });
  const { success: showSuccess, error: showError } = useToastHelpers();

  const loadCredentials = useCallback(async () => {
    try {
      setLoading(true);
      const res = await customInstance<{ data: SgkCredentialsData }>({
        url: '/api/sgk-credentials',
        method: 'GET',
      });
      const data = res.data;
      setStored(data);
      setForm(prev => ({
        ...prev,
        tesisKodu: data.tesisKodu ?? '',
        mesulMudurTc: data.mesulMudurTc ?? '',
        // Don't overwrite password fields — they're never returned
      }));
    } catch (err) {
      showError('SGK bilgileri yüklenemedi: ' + extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload: Record<string, string> = {};
      if (form.tesisKodu) payload.tesisKodu = form.tesisKodu;
      if (form.tesisSifresi) payload.tesisSifresi = form.tesisSifresi;
      if (form.mesulMudurTc) payload.mesulMudurTc = form.mesulMudurTc;
      if (form.mesulMudurSifresi) payload.mesulMudurSifresi = form.mesulMudurSifresi;

      const res = await customInstance<{ data: SgkCredentialsData }>({
        url: '/api/sgk-credentials',
        method: 'PUT',
        data: payload,
      });
      setStored(res.data);
      // Clear password fields after save
      setForm(prev => ({ ...prev, tesisSifresi: '', mesulMudurSifresi: '' }));
      showSuccess('SGK giriş bilgileri kaydedildi');
    } catch (err) {
      showError('Kayıt hatası: ' + extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <SettingsSectionHeader
        title="SGK Giriş Bilgileri"
        description="SGK Medikal Merkez portalına giriş bilgilerinizi güvenli şekilde saklayın. Şifreler AES-256-GCM ile şifrelenir."
        icon={<Shield className="w-6 h-6" />}
      />

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-5">
        {/* Tesis Kodu */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tesis Kodu
          </label>
          <Input
            value={form.tesisKodu}
            onChange={(e) => setForm(prev => ({ ...prev, tesisKodu: e.target.value }))}
            placeholder="SGK tesis kodu"
          />
        </div>

        {/* Tesis Şifresi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tesis Şifresi
            {stored?.hasTesisSifresi && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" /> Kayıtlı
              </span>
            )}
          </label>
          <div className="relative">
            <Input
              type={showPasswords.tesisSifresi ? 'text' : 'password'}
              value={form.tesisSifresi}
              onChange={(e) => setForm(prev => ({ ...prev, tesisSifresi: e.target.value }))}
              placeholder={stored?.hasTesisSifresi ? '••••••••  (değiştirmek için yeni şifre girin)' : 'Tesis şifresini girin'}
            />
            <button
              data-allow-raw="true"
              type="button"
              onClick={() => setShowPasswords(p => ({ ...p, tesisSifresi: !p.tesisSifresi }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords.tesisSifresi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mesul Müdür TC */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mesul Müdür TC Kimlik No
            {stored?.mesulMudurTc && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" /> Kayıtlı
              </span>
            )}
          </label>
          <Input
            type="password"
            value={form.mesulMudurTc}
            onChange={(e) => setForm(prev => ({ ...prev, mesulMudurTc: e.target.value }))}
            placeholder={stored?.mesulMudurTc ? '••••••••••• (şifreli saklanıyor)' : 'TC kimlik numarası'}
            maxLength={11}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            🔒 TC kimlik numarası AES-256-GCM ile şifrelenerek saklanır
          </p>
        </div>

        {/* Mesul Müdür Şifresi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mesul Müdür Şifresi
            {stored?.hasMesulMudurSifresi && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" /> Kayıtlı
              </span>
            )}
          </label>
          <div className="relative">
            <Input
              type={showPasswords.mesulMudurSifresi ? 'text' : 'password'}
              value={form.mesulMudurSifresi}
              onChange={(e) => setForm(prev => ({ ...prev, mesulMudurSifresi: e.target.value }))}
              placeholder={stored?.hasMesulMudurSifresi ? '••••••••  (değiştirmek için yeni şifre girin)' : 'Mesul müdür şifresini girin'}
            />
            <button
              data-allow-raw="true"
              type="button"
              onClick={() => setShowPasswords(p => ({ ...p, mesulMudurSifresi: !p.mesulMudurSifresi }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPasswords.mesulMudurSifresi ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Security Note */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            🛡️ <strong>Güvenlik:</strong> Tüm şifreler ve TC kimlik numaraları
            AES-256-GCM algoritması ile şifrelenir. Bu algoritma yalnızca kuantum
            bilgisayarlar tarafından kırılabilir (Grover algoritması ile etkin anahtar
            uzunluğu 128-bit'e düşer — hâlâ güvenli).
          </p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Kaydet
          </Button>
        </div>
      </div>
    </div>
  );
}
