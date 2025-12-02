import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Upload, 
  Trash2, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Image as ImageIcon,
  FileSignature,
  Stamp,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { companyService, CompanyInfo, TenantCompanyResponse } from '../../services/company.service';
import { useAuthStore } from '../../stores/authStore';

interface AssetUploadProps {
  type: 'logo' | 'stamp' | 'signature';
  label: string;
  description: string;
  currentUrl?: string;
  icon: React.ReactNode;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  isUploading: boolean;
  disabled?: boolean;
}

const AssetUpload: React.FC<AssetUploadProps> = ({
  type,
  label,
  description,
  currentUrl,
  icon,
  onUpload,
  onDelete,
  isUploading,
  disabled = false,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUrl) {
      setPreview(companyService.getAssetUrl(currentUrl) || null);
    } else {
      setPreview(null);
    }
  }, [currentUrl]);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Sadece resim dosyaları yükleyebilirsiniz');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalıdır');
      return;
    }
    
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    await onUpload(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`${label} silinsin mi?`)) {
      await onDelete();
      setPreview(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">{label}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt={label}
            className="w-full h-40 object-contain bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
          />
          {!disabled && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-4">
              <button
                onClick={handleClick}
                className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-gray-700 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-gray-700" />
                )}
              </button>
              <button
                onClick={handleDelete}
                className="p-2 bg-white rounded-full hover:bg-red-100 transition-colors"
                disabled={isUploading}
              >
                <Trash2 className="w-5 h-5 text-red-600" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
            ${isDragging 
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
              : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500'
            }
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isUploading ? (
            <Loader2 className="w-10 h-10 mx-auto text-indigo-500 animate-spin" />
          ) : (
            <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isDragging ? 'Dosyayı bırakın...' : 'Dosya yüklemek için tıklayın veya sürükleyin'}
          </p>
          <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF (max 5MB)</p>
        </div>
      )}
    </div>
  );
};

export default function CompanySettings() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<TenantCompanyResponse | null>(null);
  const [formData, setFormData] = useState<CompanyInfo>({});
  const [hasChanges, setHasChanges] = useState(false);

  const isTenantAdmin = user?.role === 'tenant_admin';

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      setLoading(true);
      const data = await companyService.getCompanyInfo();
      setCompanyData(data);
      setFormData(data.companyInfo || {});
    } catch (error) {
      console.error('Failed to load company info:', error);
      toast.error('Firma bilgileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CompanyInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!isTenantAdmin) {
      toast.error('Sadece Tenant Admin firma bilgilerini güncelleyebilir');
      return;
    }

    try {
      setSaving(true);
      const updated = await companyService.updateCompanyInfo(formData);
      setCompanyData(updated);
      setFormData(updated.companyInfo || {});
      setHasChanges(false);
      toast.success('Firma bilgileri kaydedildi');
    } catch (error: unknown) {
      console.error('Failed to save company info:', error);
      const errorMessage = error instanceof Error ? error.message : 'Firma bilgileri kaydedilemedi';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleAssetUpload = async (type: 'logo' | 'stamp' | 'signature', file: File) => {
    if (!isTenantAdmin) {
      toast.error('Sadece Tenant Admin dosya yükleyebilir');
      return;
    }

    try {
      setUploadingAsset(type);
      const result = await companyService.uploadAsset(type, file);
      // Update local state with new URL
      setFormData(prev => ({ ...prev, [`${type}Url`]: result.url }));
      toast.success(`${type === 'logo' ? 'Logo' : type === 'stamp' ? 'Kaşe' : 'İmza'} yüklendi`);
    } catch (error: unknown) {
      console.error(`Failed to upload ${type}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Dosya yüklenemedi';
      toast.error(errorMessage);
    } finally {
      setUploadingAsset(null);
    }
  };

  const handleAssetDelete = async (type: 'logo' | 'stamp' | 'signature') => {
    if (!isTenantAdmin) {
      toast.error('Sadece Tenant Admin dosya silebilir');
      return;
    }

    try {
      setUploadingAsset(type);
      await companyService.deleteAsset(type);
      setFormData(prev => {
        const updated = { ...prev };
        delete updated[`${type}Url` as keyof CompanyInfo];
        return updated;
      });
      toast.success(`${type === 'logo' ? 'Logo' : type === 'stamp' ? 'Kaşe' : 'İmza'} silindi`);
    } catch (error: unknown) {
      console.error(`Failed to delete ${type}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Dosya silinemedi';
      toast.error(errorMessage);
    } finally {
      setUploadingAsset(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Building2 className="w-7 h-7 text-indigo-600" />
            Firma Ayarları
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Firma bilgilerinizi ve fatura görsellerini yönetin
          </p>
        </div>
        {hasChanges && isTenantAdmin && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        )}
      </div>

      {!isTenantAdmin && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Firma bilgilerini sadece Tenant Admin düzenleyebilir. Sadece görüntüleme modundasınız.
          </p>
        </div>
      )}

      {/* Company Assets Section */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Fatura Görselleri
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Bu görseller faturalarınızda ve PDF çıktılarında görüntülenecektir.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AssetUpload
            type="logo"
            label="Firma Logosu"
            description="Faturanın üst kısmında görünür"
            currentUrl={formData.logoUrl}
            icon={<ImageIcon className="w-5 h-5" />}
            onUpload={(file) => handleAssetUpload('logo', file)}
            onDelete={() => handleAssetDelete('logo')}
            isUploading={uploadingAsset === 'logo'}
          />
          <AssetUpload
            type="stamp"
            label="Kaşe"
            description="Faturanın alt kısmında görünür"
            currentUrl={formData.stampUrl}
            icon={<Stamp className="w-5 h-5" />}
            onUpload={(file) => handleAssetUpload('stamp', file)}
            onDelete={() => handleAssetDelete('stamp')}
            isUploading={uploadingAsset === 'stamp'}
          />
          <AssetUpload
            type="signature"
            label="İmza"
            description="Kaşe yanında görünür"
            currentUrl={formData.signatureUrl}
            icon={<FileSignature className="w-5 h-5" />}
            onUpload={(file) => handleAssetUpload('signature', file)}
            onDelete={() => handleAssetDelete('signature')}
            isUploading={uploadingAsset === 'signature'}
          />
        </div>
      </div>

      {/* Company Info Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Firma Bilgileri
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Temel Bilgiler
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Firma Unvanı
              </label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isTenantAdmin}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Örnek Firma Ltd. Şti."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  VKN / TCKN
                </label>
                <input
                  type="text"
                  value={formData.taxId || ''}
                  onChange={(e) => handleInputChange('taxId', e.target.value)}
                  disabled={!isTenantAdmin}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500"
                  placeholder="1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vergi Dairesi
                </label>
                <input
                  type="text"
                  value={formData.taxOffice || ''}
                  onChange={(e) => handleInputChange('taxOffice', e.target.value)}
                  disabled={!isTenantAdmin}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500"
                  placeholder="Kadıköy V.D."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adres
              </label>
              <textarea
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                disabled={!isTenantAdmin}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500"
                placeholder="Cadde No: 123, Kat: 4"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  İlçe
                </label>
                <input
                  type="text"
                  value={formData.district || ''}
                  onChange={(e) => handleInputChange('district', e.target.value)}
                  disabled={!isTenantAdmin}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500"
                  placeholder="Kadıköy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  İl
                </label>
                <input
                  type="text"
                  value={formData.city || ''}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  disabled={!isTenantAdmin}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500"
                  placeholder="İstanbul"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Posta Kodu
                </label>
                <input
                  type="text"
                  value={formData.postalCode || ''}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  disabled={!isTenantAdmin}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500"
                  placeholder="34000"
                />
              </div>
            </div>
          </div>

          {/* Contact & SGK Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              İletişim ve SGK Bilgileri
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={!isTenantAdmin}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500"
                  placeholder="0216 123 45 67"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Faks
                </label>
                <input
                  type="tel"
                  value={formData.fax || ''}
                  onChange={(e) => handleInputChange('fax', e.target.value)}
                  disabled={!isTenantAdmin}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500"
                  placeholder="0216 123 45 68"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                E-posta
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={!isTenantAdmin}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500"
                placeholder="info@firma.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Web Sitesi
              </label>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => handleInputChange('website', e.target.value)}
                disabled={!isTenantAdmin}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500"
                placeholder="https://www.firma.com"
              />
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-3">
                SGK Bilgileri
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SGK Mükellef Kodu
                  </label>
                  <input
                    type="text"
                    value={formData.sgkMukellefKodu || ''}
                    onChange={(e) => handleInputChange('sgkMukellefKodu', e.target.value)}
                    disabled={!isTenantAdmin}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500"
                    placeholder="1234567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SGK Mükellef Adı
                  </label>
                  <input
                    type="text"
                    value={formData.sgkMukellefAdi || ''}
                    onChange={(e) => handleInputChange('sgkMukellefAdi', e.target.value)}
                    disabled={!isTenantAdmin}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500"
                    placeholder="Firma SGK Adı"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-3">
                Banka Bilgileri
              </h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Banka Adı
                </label>
                <input
                  type="text"
                  value={formData.bankName || ''}
                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                  disabled={!isTenantAdmin}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500"
                  placeholder="Banka Adı"
                />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  IBAN
                </label>
                <input
                  type="text"
                  value={formData.iban || ''}
                  onChange={(e) => handleInputChange('iban', e.target.value)}
                  disabled={!isTenantAdmin}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed focus:ring-2 focus:ring-indigo-500 font-mono"
                  placeholder="TR00 0000 0000 0000 0000 0000 00"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button (bottom) */}
        {hasChanges && isTenantAdmin && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
