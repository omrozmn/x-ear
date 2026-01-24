import { Input, Select, DatePicker } from '@x-ear/ui-web';
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
    // Payment details toggle - reserved for future feature
    // const [showPaymentDetails, setShowPaymentDetails] = useState(false);

    const handleChange = (field: keyof SGKInvoiceData, value: string | number | boolean) => {
        // Update the field
        onChange({
            ...sgkData,
            [field]: value
        });

        // If year or month changed, and both present, auto-calc period start/end
        if (field === 'periodYear' || field === 'periodMonth') {
            const year = field === 'periodYear' ? value : sgkData.periodYear;
            const month = field === 'periodMonth' ? value : sgkData.periodMonth;
            if (year && month) {
                const monthIndex = parseInt(String(month), 10) - 1; // 0-based
                const start = new Date(Number(year), monthIndex, 1);
                const end = new Date(Number(year), monthIndex + 1, 0);
                const formatLocalISO = (d: Date) => {
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    return `${yyyy}-${mm}-${dd}`;
                };
                const startStr = formatLocalISO(start);
                const endStr = formatLocalISO(end);
                onChange({
                    ...sgkData,
                    periodYear: String(year),
                    periodMonth: String(month),
                    periodStartDate: startStr,
                    periodEndDate: endStr
                });
            }
        }
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

            <div className="space-y-6">
                {/* İlave Fatura Bilgileri - KRİTİK YENİ BÖLÜM */}
                <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <h4 className="text-md font-medium text-gray-900 mb-4">İlave Fatura Bilgileri *</h4>

                    <div className="space-y-4">
                        <div>
                            <Select
                                label="İlave Fatura Bilgisi Tipi"
                                value={additionalInfo}
                                onChange={(e) => handleChange('additionalInfo', e.target.value)}
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

                        <>
                            <div>
                                <DatePicker
                                    label="Dönem Başlangıç Tarihi"
                                    value={sgkData.periodStartDate ? ((): Date | null => {
                                        const parts = String(sgkData.periodStartDate).split('-');
                                        if (parts.length === 3) return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                        return null;
                                    })() : null}
                                    onChange={(date) => {
                                        if (!date) return handleChange('periodStartDate', '');
                                        const yyyy = date.getFullYear();
                                        const mm = String(date.getMonth() + 1).padStart(2, '0');
                                        const dd = String(date.getDate()).padStart(2, '0');
                                        handleChange('periodStartDate', `${yyyy}-${mm}-${dd}`);
                                    }}
                                    onMonthYearChange={(y, m) => {
                                        const start = new Date(y, m, 1);
                                        const end = new Date(y, m + 1, 0);
                                        const formatLocalISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                        handleChange('periodStartDate', formatLocalISO(start));
                                        handleChange('periodEndDate', formatLocalISO(end));
                                    }}
                                    placeholder="Tarih seçin"
                                    fullWidth
                                />
                            </div>

                            <div>
                                <DatePicker
                                    label="Dönem Bitiş Tarihi"
                                    value={sgkData.periodEndDate ? ((): Date | null => {
                                        const parts = String(sgkData.periodEndDate).split('-');
                                        if (parts.length === 3) return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                                        return null;
                                    })() : null}
                                    onChange={(date) => {
                                        if (!date) return handleChange('periodEndDate', '');
                                        const yyyy = date.getFullYear();
                                        const mm = String(date.getMonth() + 1).padStart(2, '0');
                                        const dd = String(date.getDate()).padStart(2, '0');
                                        handleChange('periodEndDate', `${yyyy}-${mm}-${dd}`);
                                    }}
                                    onMonthYearChange={(y, m) => {
                                        const start = new Date(y, m, 1);
                                        const end = new Date(y, m + 1, 0);
                                        const formatLocalISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                                        handleChange('periodStartDate', formatLocalISO(start));
                                        handleChange('periodEndDate', formatLocalISO(end));
                                    }}
                                    placeholder="Tarih seçin"
                                    fullWidth
                                />
                            </div>
                        </>
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

                {/* Payment section removed as per UX changes */}

                {/* Uyarı kaldırıldı per UX isteği */}
            </div>
        </div>
    );
}
