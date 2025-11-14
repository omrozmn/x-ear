import { Input, Select, Button } from '@x-ear/ui-web';
import { useState } from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import { SGKInvoiceData } from '../../types/invoice';

interface SGKInvoiceSectionProps {
    sgkData?: SGKInvoiceData;
    onChange: (data: SGKInvoiceData) => void;
    errors?: Record<string, string>;
}

// Aylar
const MONTHS = [
    { value: '', label: 'Seçiniz' },
    { value: '01', label: 'Ocak' },
    { value: '02', label: 'Şubat' },
    { value: '03', label: 'Mart' },
    { value: '04', label: 'Nisan' },
    { value: '05', label: 'Mayıs' },
    { value: '06', label: 'Haziran' },
    { value: '07', label: 'Temmuz' },
    { value: '08', label: 'Ağustos' },
    { value: '09', label: 'Eylül' },
    { value: '10', label: 'Ekim' },
    { value: '11', label: 'Kasım' },
    { value: '12', label: 'Aralık' }
];

// İlave Fatura Bilgileri
const ADDITIONAL_INFO_OPTIONS = [
    { value: 'E', label: 'Eczane' },
    { value: 'H', label: 'Hastane' },
    { value: 'O', label: 'Optik' },
    { value: 'M', label: 'Medikal' },
    { value: 'A', label: 'Abonelik' },
    { value: 'MH', label: 'Mal/Hizmet' },
    { value: 'D', label: 'Diğer' }
];

export function SGKInvoiceSection({
    sgkData = {},
    onChange,
    errors = {}
}: SGKInvoiceSectionProps) {
    const [showPeriodDetails, setShowPeriodDetails] = useState(false);
    const [showPaymentDetails, setShowPaymentDetails] = useState(false);

    const handleChange = (field: keyof SGKInvoiceData, value: any) => {
        onChange({
            ...sgkData,
            [field]: value
        });
    };

    // Yıl listesi (son 5 yıl + gelecek 1 yıl)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i).map(year => ({
        value: year.toString(),
        label: year.toString()
    }));

    // İlave Fatura Bilgisi seçimine göre hangi alanların görüneceğini belirle
    const additionalInfo = sgkData.additionalInfo || 'E';
    const showMukellefFields = ['E', 'H', 'O', 'M'].includes(additionalInfo);
    const showAboneNo = additionalInfo === 'A';
    const showDosyaNo = ['E', 'H', 'O', 'M', 'A', 'MH'].includes(additionalInfo);

    return (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">SGK Faturası Özel Bilgileri</h3>
                <div className="flex items-center space-x-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                        SGK Faturası
                    </span>
                </div>
            </div>

            {/* Bilgilendirme */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                    <Info className="text-blue-400 mr-2 flex-shrink-0" size={18} />
                    <div>
                        <h4 className="text-sm font-medium text-blue-800 mb-1">
                            SGK Faturası Otomatik Ayarlar
                        </h4>
                        <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                            <li>Alıcı: Sosyal Güvenlik Kurumu (Otomatik)</li>
                            <li>Para Birimi: TRY (Zorunlu)</li>
                            <li>Vergi Dairesi: ÇANKAYA VERGİ DAİRESİ</li>
                            <li>Vergi No: 7750409379</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* İlave Fatura Bilgileri - KRİTİK YENİ BÖLÜM */}
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <h4 className="text-md font-medium text-gray-900 mb-4">İlave Fatura Bilgileri *</h4>

                    <div className="space-y-4">
                        <div>
                            <Select
                                label="İlave Fatura Bilgisi Tipi"
                                value={additionalInfo}
                                onChange={(e) => handleChange('additionalInfo', e.target.value as any)}
                                options={ADDITIONAL_INFO_OPTIONS}
                                error={errors.additionalInfo}
                                fullWidth
                                required
                            />
                            <p className="mt-1 text-sm text-gray-600">
                                Fatura türüne göre gerekli bilgileri seçiniz
                            </p>
                        </div>

                        {/* Mükellef Kodu ve Adı - E, H, O, M için */}
                        {showMukellefFields && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded border border-blue-200">
                                <div>
                                    <Input
                                        type="text"
                                        label="Mükellef Kodu"
                                        value={sgkData.mukellefKodu || ''}
                                        onChange={(e) => handleChange('mukellefKodu', e.target.value)}
                                        placeholder="Mükellef kodu"
                                        error={errors.mukellefKodu}
                                        fullWidth
                                        required
                                    />
                                </div>

                                <div>
                                    <Input
                                        type="text"
                                        label="Mükellef Adı"
                                        value={sgkData.mukellefAdi || ''}
                                        onChange={(e) => handleChange('mukellefAdi', e.target.value)}
                                        placeholder="Mükellef adı"
                                        error={errors.mukellefAdi}
                                        fullWidth
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Dosya No - E, H, O, M, A, MH için */}
                        {showDosyaNo && (
                            <div className="bg-white p-4 rounded border border-blue-200">
                                <Input
                                    type="text"
                                    label="Dosya No"
                                    value={sgkData.dosyaNo || ''}
                                    onChange={(e) => handleChange('dosyaNo', e.target.value)}
                                    placeholder="Dosya numarası"
                                    error={errors.dosyaNo}
                                    fullWidth
                                    required
                                />
                            </div>
                        )}

                        {/* Abone No - Sadece A için */}
                        {showAboneNo && (
                            <div className="bg-white p-4 rounded border border-blue-200">
                                <Input
                                    type="text"
                                    label="Abone No"
                                    value={sgkData.aboneNo || ''}
                                    onChange={(e) => handleChange('aboneNo', e.target.value)}
                                    placeholder="Abone numarası"
                                    error={errors.aboneNo}
                                    fullWidth
                                    required
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Dönem Bilgileri */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-gray-900">Dönem Bilgileri *</h4>
                        <Button
                            type="button"
                            onClick={() => setShowPeriodDetails(!showPeriodDetails)}
                            variant="default"
                            className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700"
                        >
                            {showPeriodDetails ? 'Gizle' : 'Detayları Göster'}
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Select
                                label="Dönem Yılı"
                                value={sgkData.periodYear || ''}
                                onChange={(e) => handleChange('periodYear', e.target.value)}
                                options={[{ value: '', label: 'Seçiniz' }, ...years]}
                                error={errors.periodYear}
                                fullWidth
                                required
                            />
                        </div>

                        <div>
                            <Select
                                label="Dönem Ayı"
                                value={sgkData.periodMonth || ''}
                                onChange={(e) => handleChange('periodMonth', e.target.value)}
                                options={MONTHS}
                                error={errors.periodMonth}
                                fullWidth
                                required
                            />
                        </div>

                        {showPeriodDetails && (
                            <>
                                <div>
                                    <Input
                                        type="date"
                                        label="Dönem Başlangıç Tarihi"
                                        value={sgkData.periodStartDate || ''}
                                        onChange={(e) => handleChange('periodStartDate', e.target.value)}
                                        error={errors.periodStartDate}
                                        fullWidth
                                    />
                                </div>

                                <div>
                                    <Input
                                        type="date"
                                        label="Dönem Bitiş Tarihi"
                                        value={sgkData.periodEndDate || ''}
                                        onChange={(e) => handleChange('periodEndDate', e.target.value)}
                                        error={errors.periodEndDate}
                                        fullWidth
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Tesis Bilgileri - GİZLENDİ */}
                <div className="hidden border border-gray-200 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Tesis Bilgileri</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Input
                                type="text"
                                label="Tesis Kodu"
                                value={sgkData.facilityCode || ''}
                                onChange={(e) => handleChange('facilityCode', e.target.value)}
                                placeholder="Örn: 16810012"
                                error={errors.facilityCode}
                                maxLength={8}
                                fullWidth
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                SGK tesis kodu (8 haneli, opsiyonel)
                            </p>
                        </div>

                        <div>
                            <Input
                                type="text"
                                label="Tesis Adı"
                                value={sgkData.facilityName || ''}
                                onChange={(e) => handleChange('facilityName', e.target.value)}
                                placeholder="Sağlık tesisi adı"
                                error={errors.facilityName}
                                fullWidth
                            />
                        </div>

                        <div>
                            <Input
                                type="text"
                                label="Kurum Kodu"
                                value={sgkData.sgkInstitutionCode || ''}
                                onChange={(e) => handleChange('sgkInstitutionCode', e.target.value)}
                                placeholder="SGK kurum kodu"
                                error={errors.sgkInstitutionCode}
                                fullWidth
                            />
                        </div>

                        <div>
                            <Input
                                type="text"
                                label="Şube Kodu"
                                value={sgkData.branchCode || ''}
                                onChange={(e) => handleChange('branchCode', e.target.value)}
                                placeholder="Şube kodu"
                                error={errors.branchCode}
                                fullWidth
                            />
                        </div>
                    </div>
                </div>

                {/* Referans Bilgileri - GİZLENDİ */}
                <div className="hidden border border-gray-200 rounded-lg p-4">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Referans Bilgileri</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Input
                                type="text"
                                label="Referans Numarası"
                                value={sgkData.referenceNumber || ''}
                                onChange={(e) => handleChange('referenceNumber', e.target.value)}
                                placeholder="REF-123456"
                                error={errors.referenceNumber}
                                fullWidth
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                SGK referans numarası
                            </p>
                        </div>

                        <div>
                            <Input
                                type="text"
                                label="Protokol Numarası"
                                value={sgkData.protocolNumber || ''}
                                onChange={(e) => handleChange('protocolNumber', e.target.value)}
                                placeholder="PROT-123456"
                                error={errors.protocolNumber}
                                fullWidth
                            />
                        </div>
                    </div>
                </div>

                {/* Ödeme Bilgileri */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-medium text-gray-900">Ödenecek Tutar Bilgileri</h4>
                        <Button
                            type="button"
                            onClick={() => setShowPaymentDetails(!showPaymentDetails)}
                            variant="default"
                            className="text-sm bg-green-100 hover:bg-green-200 text-green-700"
                        >
                            {showPaymentDetails ? 'Gizle' : 'Düzenle'}
                        </Button>
                    </div>

                    {showPaymentDetails && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Input
                                    type="number"
                                    label="Ödenecek Tutar (TL)"
                                    value={sgkData.paymentAmount || ''}
                                    onChange={(e) => handleChange('paymentAmount', parseFloat(e.target.value))}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    error={errors.paymentAmount}
                                    fullWidth
                                />
                            </div>

                            <div>
                                <Input
                                    type="date"
                                    label="Ödeme Tarihi"
                                    value={sgkData.paymentDate || ''}
                                    onChange={(e) => handleChange('paymentDate', e.target.value)}
                                    error={errors.paymentDate}
                                    fullWidth
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Input
                                    type="text"
                                    label="Ödeme Açıklaması"
                                    value={sgkData.paymentDescription || ''}
                                    onChange={(e) => handleChange('paymentDescription', e.target.value)}
                                    placeholder="Ödeme ile ilgili açıklama"
                                    error={errors.paymentDescription}
                                    fullWidth
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Uyarı */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <AlertTriangle className="text-amber-400 mr-2 flex-shrink-0" size={18} />
                        <div>
                            <h4 className="text-sm font-medium text-amber-800 mb-1">
                                Önemli Bilgilendirme
                            </h4>
                            <p className="text-sm text-amber-700">
                                SGK faturalarında dönem bilgileri ve ilave fatura bilgileri zorunludur.
                                Seçtiğiniz ilave fatura bilgisi tipine göre ilgili alanları doldurunuz.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
