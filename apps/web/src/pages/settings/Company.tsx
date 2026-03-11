import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Building2,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle,
  Image as ImageIcon,
  FileSignature,
  Stamp,
  Loader2,
} from 'lucide-react';
import { Button, Input, Textarea, Autocomplete } from '@x-ear/ui-web';
import type { AutocompleteOption } from '@x-ear/ui-web';
import citiesData from '../../data/cities.json';
import toast from 'react-hot-toast';
import { companyService, CompanyInfo } from '../../services/company.service';
import { useAuthStore } from '../../stores/authStore';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';
type CityData = {
  name: string;
  districts: string[];
};

interface AssetUploadProps {
  type: 'logo' | 'stamp' | 'signature';
  label: string;
  description: string;
  currentUrl?: string;
  icon: React.ReactElement;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  isUploading: boolean;
  disabled?: boolean;
  compact?: boolean;
}

const AssetUpload: React.FC<AssetUploadProps> = ({
  label,
  description,
  currentUrl,
  icon,
  onUpload,
  onDelete,
  isUploading,
  disabled = false,
  compact = false,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let isCancelled = false;

    const loadPreview = async () => {
      if (!currentUrl) {
        setPreview(null);
        return;
      }

      try {
        const objectUrl = await companyService.getAssetObjectUrl(currentUrl);
        if (isCancelled) {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
          return;
        }

        revokedUrl = objectUrl || null;
        setPreview(objectUrl || null);
      } catch (error) {
        console.error(`Failed to load asset preview for ${label}:`, error);
        if (!isCancelled) {
          setPreview(null);
        }
      }
    };

    void loadPreview();

    return () => {
      isCancelled = true;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [currentUrl, label]);

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
    <div className={`bg-white dark:bg-gray-800 ${compact ? 'rounded-2xl p-3 sm:p-4' : 'rounded-3xl p-5 sm:p-6'} shadow-sm border border-gray-200 dark:border-gray-700 premium-shadow transition-all hover:shadow-md`}>
      <div className={`flex items-center gap-3 ${compact ? 'mb-3' : 'mb-5'}`}>
        <div className={`${compact ? 'p-2 rounded-xl' : 'p-3 rounded-2xl'} bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400`}>
          {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: compact ? 'w-5 h-5' : 'w-6 h-6' })}
        </div>
        <div>
          <h3 className={`${compact ? 'text-sm' : 'text-base sm:text-lg'} font-bold text-gray-900 dark:text-white`}>{label}</h3>
          <p className={`${compact ? 'text-[11px]' : 'text-xs sm:text-sm'} text-gray-500 dark:text-gray-400`}>{description}</p>
        </div>
      </div>

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {preview ? (
        <div className="relative group overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700">
          <img
            src={preview}
            alt={label}
            className={`w-full ${compact ? 'h-28 sm:h-32 p-3' : 'h-44 sm:h-48 p-4'} object-contain bg-gray-50/50 dark:bg-gray-900/50`}
          />
          {!disabled && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all backdrop-blur-[2px] flex items-center justify-center gap-3">
              <Button
                onClick={handleClick}
                variant="secondary"
                className="p-3 rounded-xl !w-auto !h-auto bg-white/90 hover:bg-white shadow-xl"
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-indigo-600" />
                )}
              </Button>
              <Button
                onClick={handleDelete}
                variant="danger"
                className="p-3 rounded-xl !w-auto !h-auto bg-red-500 hover:bg-red-600 border-none shadow-xl"
                disabled={isUploading}
              >
                <Trash2 className="w-5 h-5 text-white" />
              </Button>
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
            border-2 border-dashed rounded-2xl ${compact ? 'p-6' : 'p-10'} text-center transition-all duration-300
            ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
            ${isDragging
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/30 ring-4 ring-indigo-500/10'
              : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
            }
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isUploading ? (
            <Loader2 className={`${compact ? 'w-9 h-9' : 'w-12 h-12'} mx-auto text-indigo-500 animate-spin`} />
          ) : (
            <div className={`bg-gray-100 dark:bg-gray-800/80 ${compact ? 'w-12 h-12 rounded-xl mb-3' : 'w-16 h-16 rounded-2xl mb-4'} flex items-center justify-center mx-auto group-hover:scale-110 transition-transform`}>
              <Upload className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} text-gray-400`} />
            </div>
          )}
          <p className={`${compact ? 'text-xs' : 'text-sm'} font-semibold text-gray-700 dark:text-gray-300`}>
            {isDragging ? 'Hemen Bırakın' : 'Görsel Seçin veya Sürükleyin'}
          </p>
          <p className={`${compact ? 'text-[10px]' : 'text-xs'} text-gray-500 mt-2`}>Maximum 5MB • PNG, JPG, WEBP</p>
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
  // const [companyData, setCompanyData] = useState<TenantCompanyResponse | null>(null);
  const [formData, setFormData] = useState<CompanyInfo>({});
  const [hasChanges, setHasChanges] = useState(false);

  // City options for dropdown
  const cityOptions = useMemo<AutocompleteOption[]>(() => {
    return citiesData.cities.map(city => ({
      id: city.name,
      value: city.name,
      label: city.name
    }));
  }, []);

  // District options based on selected city
  const districtOptions = useMemo<AutocompleteOption[]>(() => {
    if (!formData.city) return [];
    const selectedCity = citiesData.cities.find((c: CityData) => c.name === formData.city);
    if (!selectedCity) return [];
    return selectedCity.districts.map((district: string) => ({
      id: district,
      value: district,
      label: district
    }));
  }, [formData.city]);

  // CRITICAL FIX: Check if user can edit (tenant_admin OR impersonating tenant)
  // When admin impersonates tenant, they should have full edit rights
  const isTenantAdmin =
    user?.role === 'tenant_admin' ||
    user?.role === 'super_admin' ||
    user?.isImpersonatingTenant === true;

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      setLoading(true);
      const data = await companyService.getCompanyInfo();
      // setCompanyData(data);
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
      console.log('💾 Saving company info:', formData);
      const updated = await companyService.updateCompanyInfo(formData);
      console.log('✅ Company info saved:', updated);
      // setCompanyData(updated);
      setFormData(updated.companyInfo || {});
      setHasChanges(false);
      toast.success('Firma bilgileri kaydedildi');
    } catch (error: unknown) {
      console.error('❌ Failed to save company info:', error);
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
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30 -z-10" />
        </div>
        <p className="text-gray-500 animate-pulse font-medium">Firma Bilgileri Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="pb-24 sm:pb-0 space-y-8">
      {/* Dynamic Save Action Bar */}
      {hasChanges && isTenantAdmin && (
        <>
          {/* Desktop Sticky Header */}
          <div className="hidden sm:flex justify-between items-center p-4 sticky top-0 z-[60] glass-morphism rounded-2xl mb-6 shadow-xl border border-white/20 dark:border-white/5 backdrop-blur-xl">
            <div className="flex items-center gap-3 pl-2">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow-lg ring-4 ring-indigo-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">Kaydedilmemiş Değişiklikler</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Yaptığınız değişiklikler henüz kaydedilmedi.</p>
              </div>
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              variant="primary"
              className="flex items-center premium-gradient hover:scale-[1.02] active:scale-[0.98] transition-all px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 border-none"
            >
              {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </Button>
          </div>

          {/* Mobile Bottom Floating Bar */}
          <div className="sm:hidden fixed bottom-6 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div className="bg-gray-900/90 dark:bg-gray-800/95 backdrop-blur-xl rounded-3xl p-4 shadow-2xl shadow-black/40 border border-white/10">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">Değişiklikleri Kaydet</p>
                  <p className="text-gray-400 text-[10px]">Unutmadan firma bilgilerini güncelleyin.</p>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  loading={saving}
                  variant="primary"
                  className="flex-shrink-0 !w-auto h-12 px-6 rounded-2xl premium-gradient border-none font-bold text-sm shadow-xl"
                >
                  {saving ? '...' : 'Kaydet'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {!isTenantAdmin && (
        <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl flex items-start gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-2xl">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="font-bold text-amber-900 dark:text-amber-100 text-base">Görüntüleme Modu</p>
            <p className="text-sm text-amber-700/80 dark:text-amber-300/80 mt-1">
              Bu sayfadaki bilgileri düzenleme yetkiniz bulunmamaktadır.
            </p>
          </div>
        </div>
      )}

      {/* Company Assets Section */}
      <section className="space-y-6">
        <div className="flex items-end justify-between px-2">
          <div>
            <h2 className="text-2xl font-black text-indigo-900 dark:text-indigo-100 tracking-tight">Fatura Görselleri</h2>
            <p className="text-indigo-700/70 dark:text-indigo-300/70 font-medium">Logonuz, imzanız ve kaşeniz fatura tasarımında yer alır.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <AssetUpload
            type="logo"
            label="Firma Logosu"
            description="Faturanın üst kısmında konumlanır"
            currentUrl={formData.logoUrl}
            icon={<ImageIcon />}
            onUpload={(file) => handleAssetUpload('logo', file)}
            onDelete={() => handleAssetDelete('logo')}
            isUploading={uploadingAsset === 'logo'}
            disabled={!isTenantAdmin}
            compact
          />
          <AssetUpload
            type="stamp"
            label="Resmi Kaşe"
            description="E-Fatura alt onayı için gereklidir"
            currentUrl={formData.stampUrl}
            icon={<Stamp />}
            onUpload={(file) => handleAssetUpload('stamp', file)}
            onDelete={() => handleAssetDelete('stamp')}
            isUploading={uploadingAsset === 'stamp'}
            disabled={!isTenantAdmin}
            compact
          />
          <AssetUpload
            type="signature"
            label="Yetkili İmzası"
            description="Kaşe ile birlikte faturada görünür"
            currentUrl={formData.signatureUrl}
            icon={<FileSignature />}
            onUpload={(file) => handleAssetUpload('signature', file)}
            onDelete={() => handleAssetDelete('signature')}
            isUploading={uploadingAsset === 'signature'}
            disabled={!isTenantAdmin}
            compact
          />
        </div>
      </section>

      {/* Company Info Form - Professional Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Temel Bilgiler Card */}
        <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden premium-shadow flex flex-col">
          <div className="p-8 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-indigo-900 dark:text-indigo-100 tracking-tight">Kurumsal Kimlik</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Unvan ve vergi mükellefiyeti</p>
              </div>
            </div>
          </div>
          <div className="p-8 space-y-8 flex-1">
            <Input
              label="Resmi Firma Unvanı"
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={!isTenantAdmin}
              placeholder="Tam ticari unvanınızı girin"
              fullWidth
              className="rounded-2xl h-14 bg-gray-50/50 border-gray-200 dark:bg-gray-900/50 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Vergi Numarası (VKN)"
                type="text"
                value={formData.taxId || ''}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                disabled={!isTenantAdmin}
                placeholder="10 Haneli VKN"
                fullWidth
                className="rounded-2xl h-14 bg-gray-50/50 border-gray-200 dark:bg-gray-900/50 transition-all font-medium"
              />
              <Input
                label="Vergi Dairesi"
                type="text"
                value={formData.taxOffice || ''}
                onChange={(e) => handleInputChange('taxOffice', e.target.value)}
                disabled={!isTenantAdmin}
                placeholder="Daire ismini yazın"
                fullWidth
                className="rounded-2xl h-14 bg-gray-50/50 border-gray-200 dark:bg-gray-900/50 transition-all font-medium"
              />
            </div>
          </div>
        </div>

        {/* İletişim Bilgileri Card */}
        <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden premium-shadow flex flex-col">
          <div className="p-8 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/20">
                <FileSignature className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-sky-900 dark:text-sky-100 tracking-tight">İletişim Kanalları</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Müşteri ve resmi kurum iletişim bilgileri</p>
              </div>
            </div>
          </div>
          <div className="p-8 space-y-6 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Telefon Numarası"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!isTenantAdmin}
                placeholder="+90 212 --- -- --"
                fullWidth
                className="rounded-2xl h-14 bg-gray-50/50 border-gray-200 dark:bg-gray-900/50 font-medium"
              />
              <Input
                label="Faks Numarası"
                type="tel"
                value={formData.fax || ''}
                onChange={(e) => handleInputChange('fax', e.target.value)}
                disabled={!isTenantAdmin}
                placeholder="+90 212 --- -- --"
                fullWidth
                className="rounded-2xl h-14 bg-gray-50/50 border-gray-200 dark:bg-gray-900/50 font-medium"
              />
            </div>

            <Input
              label="Resmi E-Posta Adresi"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={!isTenantAdmin}
              placeholder="kurumsal@firma.com"
              fullWidth
              className="rounded-2xl h-14 bg-gray-50/50 border-gray-200 dark:bg-gray-900/50 font-medium"
            />

            <Input
              label="Web Sitesi"
              type="url"
              value={formData.website || ''}
              onChange={(e) => handleInputChange('website', e.target.value)}
              disabled={!isTenantAdmin}
              placeholder="https://www.firmaniz.com"
              fullWidth
              className="rounded-2xl h-14 bg-gray-50/50 border-gray-200 dark:bg-gray-900/50 font-medium"
            />
          </div>
        </div>

        {/* Adres Bilgileri Card - Full Width Span */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden premium-shadow">
          <div className="p-8 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-xl font-black text-cyan-900 dark:text-cyan-100 tracking-tight">Merkez Adres</h3>
            <p className="text-sm text-cyan-700/70 dark:text-cyan-300/70 font-medium">Operasyon merkezi ve yasal adres detayları</p>
          </div>
          <div className="p-8 space-y-8">
            <Textarea
              label="Açık Adres"
              value={formData.address || ''}
              onChange={(e) => handleInputChange('address', e.target.value)}
              disabled={!isTenantAdmin}
              rows={3}
              placeholder="Mahalle, Sokak, No, Kat/Daire bilgilerini detaylıca girin..."
              fullWidth
              className="rounded-2xl bg-gray-50/50 border-gray-200 dark:bg-gray-900/50 focus:ring-4 focus:ring-indigo-500/10 font-medium"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Autocomplete
                label="İl"
                options={cityOptions}
                value={cityOptions.find(c => c.value === formData.city) || null}
                onChange={(option) => {
                  handleInputChange('city', option?.value || '');
                  setFormData(prev => ({ ...prev, district: '' }));
                }}
                placeholder="Şehir Seç"
                allowClear
                className="rounded-2xl h-14"
                disabled={!isTenantAdmin}
              />
              <Autocomplete
                label="İlçe"
                options={districtOptions}
                value={districtOptions.find((d) => d.value === formData.district) || null}
                onChange={(option) => handleInputChange('district', option?.value || '')}
                placeholder={formData.city ? 'İlçe Seç' : 'Önce İl Seçin'}
                className="rounded-2xl h-14"
                disabled={!isTenantAdmin || !formData.city}
                allowClear
              />
              <Input
                label="Posta Kodu"
                type="text"
                value={formData.postalCode || ''}
                onChange={(e) => handleInputChange('postalCode', e.target.value)}
                disabled={!isTenantAdmin}
                placeholder="34000"
                fullWidth
                className="rounded-2xl h-14 bg-gray-50/50 border-gray-200 dark:bg-gray-900/50 font-medium"
              />
            </div>
          </div>
        </div>

        {/* SGK & Finansal Bilgiler Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-8">
          {/* SGK Card */}
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-indigo-100 dark:border-indigo-900/50 overflow-hidden premium-shadow ring-1 ring-indigo-500/10">
            <div className="p-8 bg-indigo-50/50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/50">
              <h3 className="text-xl font-black text-indigo-900 dark:text-indigo-100 tracking-tight">SGK Regülasyon</h3>
              <p className="text-sm text-indigo-700/70 dark:text-indigo-300/70 font-medium">Medula faturası ve kurum onayı için gerekli</p>
            </div>
            <div className="p-8 space-y-8">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 ml-1">İşletme Tipi</label>
                <select
                  data-allow-raw="true"
                  value={formData.companyType || ''}
                  onChange={(e) => handleInputChange('companyType', e.target.value)}
                  disabled={!isTenantAdmin}
                  className="w-full h-14 px-5 border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none outline-none"
                >
                  <option value="">İşletme Tipini Belirleyin</option>
                  <option value="hearing_center">İşitme Merkezi</option>
                  <option value="pharmacy">Eczane</option>
                  <option value="hospital">Hastane</option>
                  <option value="optical">Optik</option>
                  <option value="medical">Medikal</option>
                  <option value="other">Diğer Ticari İşletme</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Input
                  label="SGK Mükellef Kodu"
                  type="text"
                  value={formData.sgkMukellefKodu || ''}
                  onChange={(e) => handleInputChange('sgkMukellefKodu', e.target.value)}
                  disabled={!isTenantAdmin}
                  placeholder="Resmi SGK Kodunuz"
                  fullWidth
                  className="rounded-2xl h-14 bg-gray-50/50 border-gray-200 dark:bg-gray-900/50 font-medium"
                />
                <Input
                  label="SGK Mükellef Adı (Kısa Unvan)"
                  type="text"
                  value={formData.sgkMukellefAdi || ''}
                  onChange={(e) => handleInputChange('sgkMukellefAdi', e.target.value)}
                  disabled={!isTenantAdmin}
                  placeholder="Faturalarda görünecek isim"
                  fullWidth
                  className="rounded-2xl h-14 bg-gray-50/50 border-gray-200 dark:bg-gray-900/50 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Banka Card */}
          <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-sm border border-emerald-100 dark:border-emerald-900/50 overflow-hidden premium-shadow ring-1 ring-emerald-500/10">
            <div className="p-8 bg-emerald-50/50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/50">
              <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100 tracking-tight">Finansal Transfer</h3>
              <p className="text-sm text-emerald-700/70 dark:text-emerald-300/70 font-medium">Havaleler için resmi banka hesap bilgileriniz</p>
            </div>
            <div className="p-8 space-y-8">
              <Input
                label="Merkez Banka Adı"
                type="text"
                value={formData.bankName || ''}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                disabled={!isTenantAdmin}
                placeholder="Örn: Garanti BBVA, Ziraat Bankası"
                fullWidth
                className="rounded-2xl h-14 bg-gray-50/50 border-gray-200 dark:bg-gray-900/50 font-medium"
              />

              <Input
                label="Resmi IBAN Adresi"
                type="text"
                value={formData.iban || ''}
                onChange={(e) => handleInputChange('iban', e.target.value)}
                disabled={!isTenantAdmin}
                placeholder="TR 00 --- --- ---"
                fullWidth
                className="rounded-2xl h-14 bg-gray-50/50 border-gray-200 dark:bg-gray-900/50 font-bold font-mono tracking-wider"
              />

              <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-200 font-bold leading-tight">
                  Bu hesap bilgileri düzenlediğiniz faturaların üzerinde otomatik olarak yer alır.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Segment */}
        {hasChanges && isTenantAdmin && (
          <div className="lg:col-span-2 mt-4 text-center">
            <Button
              onClick={handleSave}
              disabled={saving}
              loading={saving}
              variant="success"
              className="w-full sm:w-2/3 h-16 rounded-3xl premium-gradient border-none font-black text-lg shadow-2xl shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
            >
              Değişiklikleri Güvenle Kaydet
            </Button>
          </div>
        )}
      </div>

      {/* Language / Region Setting */}
      <footer className="mt-12 bg-gray-900 dark:bg-gray-950 rounded-[2.5rem] p-10 flex flex-col sm:flex-row items-center justify-between gap-8 text-white shadow-2xl">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-black mb-2">Bölgesel Ayarlar</h2>
          <p className="text-gray-400 font-medium font-medium">Uygulama dilini buradan güncelleyebilirsiniz.</p>
        </div>
        <div className="bg-white/10 backdrop-blur-md p-2 rounded-[2rem] w-full sm:w-auto">
          <LanguageSwitcher className="!justify-center" />
        </div>
      </footer>
    </div>
  );
}
