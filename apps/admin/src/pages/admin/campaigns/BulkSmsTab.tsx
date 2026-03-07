import React, { useMemo, useRef, useState } from 'react';
import { Button, Card, DatePicker, Select, Textarea } from '@x-ear/ui-web';
import toast from 'react-hot-toast';
import {
    AlertTriangle,
    Calculator,
    CheckCircle,
    CreditCard,
    Download,
    Eye,
    FileSpreadsheet,
    Loader2,
    MessageSquare,
    Plus,
    Send,
    UploadCloud,
    Users,
    X
} from 'lucide-react';
import * as XLSX from 'xlsx';

type AudienceMode = 'filters' | 'excel';

type AudienceFilters = {
    status?: 'PENDING' | 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'SUSPENDED';
    plan?: string;
    dateStart?: string;
    dateEnd?: string;
};

type ExcelPreview = {
    headers: (string | number)[];
    rows: (string | number | undefined)[][];
    totalRows: number;
    validPhoneCount: number;
    fileName: string;
};

// Dynamic fields for SMS personalization (tenant-focused)
const DYNAMIC_FIELDS = [
    { key: '{{ABONE_ADI}}', label: 'Abone Adı', description: 'Tenant adı' },
    { key: '{{TELEFON}}', label: 'Telefon', description: 'Telefon numarası' },
    { key: '{{EMAIL}}', label: 'E-posta', description: 'E-posta adresi' },
    { key: '{{PAKET}}', label: 'Paket', description: 'Mevcut paket adı' },
    { key: '{{SEHIR}}', label: 'Şehir', description: 'Şehir' }
];

const statusOptions = [
    { value: 'PENDING', label: 'Kayıt Tamamlamamış' },
    { value: 'TRIAL', label: 'Deneme Sürümü' },
    { value: 'ACTIVE', label: 'Aktif' },
    { value: 'CANCELLED', label: 'İptal Edilmiş' },
    { value: 'SUSPENDED', label: 'Askıya Alınmış' }
];

const planOptions = [
    { value: 'starter', label: 'Starter' },
    { value: 'pro', label: 'Pro' },
    { value: 'enterprise', label: 'Enterprise' }
];

const SMS_SEGMENT_LENGTH = 155;

interface BulkSmsTabProps {
    creditBalance: number;
    creditLoading?: boolean;
}

export const BulkSmsTab: React.FC<BulkSmsTabProps> = ({ creditBalance }) => {
    const [audienceFilters, setAudienceFilters] = useState<AudienceFilters>({ status: 'ACTIVE' });
    const [mode, setMode] = useState<AudienceMode>('filters');
    const [message, setMessage] = useState('');
    const [excelPreview, setExcelPreview] = useState<ExcelPreview | null>(null);
    const [excelError, setExcelError] = useState<string | null>(null);
    const [excelLoading, setExcelLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // TODO: Fetch tenant count from API based on filters
    const filterRecipientCount = 0;
    const countLoading = false;

    const excelRecipientCount = excelPreview?.validPhoneCount ?? 0;
    const recipients = mode === 'filters' ? filterRecipientCount : excelRecipientCount;

    const smsSegments = message.trim().length > 0
        ? Math.max(1, Math.ceil(message.length / SMS_SEGMENT_LENGTH))
        : 0;
    const creditsNeeded = recipients * smsSegments;
    const creditDelta = creditBalance - creditsNeeded;
    const creditEnough = creditsNeeded === 0 ? true : creditDelta >= 0;

    const handleTemplateDownload = () => {
        const link = document.createElement('a');
        link.href = '/campaign-template.xlsx';
        link.download = 'Tenant_SMS_Ornek.xlsx';
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setExcelLoading(true);
        setExcelError(null);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            const rows = XLSX.utils.sheet_to_json<(string | number | undefined)[]>(worksheet, {
                header: 1,
                defval: ''
            });
            const headers = (rows[0] || []).map((value) => (typeof value === 'string' ? value : String(value)));
            const dataRows = rows.slice(1);
            const phoneColumnIndex = headers.findIndex((header) =>
                header.toString().toLowerCase().includes('telefon') || header.toString().toLowerCase().includes('phone')
            );

            if (phoneColumnIndex === -1) {
                setExcelError('Telefon sütunu bulunamadı. Lütfen "Telefon" başlıklı bir sütun ekleyin.');
            }

            const validPhoneCount = phoneColumnIndex === -1
                ? 0
                : dataRows.filter((row) => {
                    const phone = row[phoneColumnIndex];
                    if (typeof phone === 'number') return phone.toString().length >= 10;
                    if (typeof phone === 'string') return phone.replace(/\D/g, '').length >= 10;
                    return false;
                }).length;

            setExcelPreview({
                headers,
                rows: dataRows.slice(0, 8),
                totalRows: dataRows.length,
                validPhoneCount,
                fileName: file.name
            });
            setMode('excel');
        } catch (error) {
            console.error('Excel parse error', error);
            setExcelError('Excel dosyası okunamadı. Lütfen dosya formatını kontrol edin.');
            setExcelPreview(null);
        } finally {
            setExcelLoading(false);
            event.target.value = '';
        }
    };

    const handleCampaignCreate = () => {
        if (recipients === 0) {
            toast.error('Hedef kitle seçilmedi. Lütfen filtrelerden veya Excel dosyasından en az bir alıcı belirleyin.');
            return;
        }
        if (smsSegments === 0) {
            toast.error('Mesaj metni eksik. SMS gönderimi yapmadan önce bir mesaj yazmalısınız.');
            return;
        }
        if (!creditEnough) {
            toast.error('Yetersiz SMS kredisi. Lütfen kredi satın alın veya alıcı sayısını azaltın.');
            return;
        }

        toast.success(`Kampanya hazır: ${recipients} alıcı için ${creditsNeeded.toLocaleString('tr-TR')} kredi kullanımı hesaplandı.`);
    };

    const handleFiltersReset = () => {
        setAudienceFilters({ status: 'ACTIVE' });
    };

    const insertDynamicField = (fieldKey: string) => {
        const textarea = textareaRef.current;
        if (!textarea) {
            setMessage((prev) => prev + fieldKey);
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newMessage = message.slice(0, start) + fieldKey + message.slice(end);
        setMessage(newMessage);

        setTimeout(() => {
            textarea.focus();
            const newPos = start + fieldKey.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    const getPreviewMessage = useMemo(() => {
        if (!message) return '';

        let preview = message;

        if (mode === 'excel' && excelPreview && excelPreview.rows.length > 0) {
            const firstRow = excelPreview.rows[0];
            const headers = excelPreview.headers.map((h) => String(h).toLowerCase());

            const nameIdx = headers.findIndex((h) => h.includes('ad') || h.includes('abone'));
            const phoneIdx = headers.findIndex((h) => h.includes('telefon') || h.includes('phone'));

            const name = nameIdx >= 0 ? String(firstRow[nameIdx] || 'Örnek Klinik') : 'Örnek Klinik';
            const phone = phoneIdx >= 0 ? String(firstRow[phoneIdx] || '05XX XXX XX XX') : '05XX XXX XX XX';

            preview = preview
                .replace(/\{\{ABONE_ADI\}\}/g, name)
                .replace(/\{\{TELEFON\}\}/g, phone)
                .replace(/\{\{EMAIL\}\}/g, 'ornek@klinik.com')
                .replace(/\{\{PAKET\}\}/g, 'Pro Plan')
                .replace(/\{\{SEHIR\}\}/g, 'İstanbul');
        } else {
            preview = preview
                .replace(/\{\{ABONE_ADI\}\}/g, 'Örnek Klinik')
                .replace(/\{\{TELEFON\}\}/g, '0532 123 45 67')
                .replace(/\{\{EMAIL\}\}/g, 'ornek@klinik.com')
                .replace(/\{\{PAKET\}\}/g, 'Pro Plan')
                .replace(/\{\{SEHIR\}\}/g, 'İstanbul');
        }

        return preview;
    }, [message, mode, excelPreview]);

    const formatNumber = (value: number) => value.toLocaleString('tr-TR');

    const renderFilters = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Durum</label>
                    <Select
                        value={audienceFilters.status || ''}
                        onChange={(event) => setAudienceFilters((prev) => ({
                            ...prev,
                            status: event.target.value ? (event.target.value as any) : undefined
                        }))}
                        options={[
                            { value: '', label: 'Tümü' },
                            ...statusOptions
                        ]}
                        fullWidth
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Paket</label>
                    <Select
                        value={audienceFilters.plan || ''}
                        onChange={(event) => setAudienceFilters((prev) => ({
                            ...prev,
                            plan: event.target.value || undefined
                        }))}
                        options={[{ value: '', label: 'Tümü' }, ...planOptions]}
                        fullWidth
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Başlangıç Tarihi</label>
                    <DatePicker
                        value={audienceFilters.dateStart ? new Date(audienceFilters.dateStart) : null}
                        onChange={(date) => setAudienceFilters((prev) => ({
                            ...prev,
                            dateStart: date ? date.toISOString().split('T')[0] : undefined
                        }))}
                        placeholder="YYYY-AA-GG"
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Bitiş Tarihi</label>
                    <DatePicker
                        value={audienceFilters.dateEnd ? new Date(audienceFilters.dateEnd) : null}
                        onChange={(date) => setAudienceFilters((prev) => ({
                            ...prev,
                            dateEnd: date ? date.toISOString().split('T')[0] : undefined
                        }))}
                        placeholder="YYYY-AA-GG"
                    />
                </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    {countLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                            Alıcı sayısı hesaplanıyor...
                        </>
                    ) : (
                        <>
                            Filtrelenen alıcı sayısı:
                            <span className="font-semibold">{formatNumber(filterRecipientCount)}</span>
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleFiltersReset}>
                        Temizle
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => setMode('filters')}>
                        Filtreyi uygula
                    </Button>
                </div>
            </div>
        </>
    );

    const renderExcelArea = () => (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Telefon sütunu içeren Excel dosyasını yükleyin.</p>
                <Button variant="secondary" size="sm" className="flex items-center gap-1" onClick={handleTemplateDownload}>
                    <Download className="w-4 h-4" /> Örnek Excel
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <UploadCloud className="w-4 h-4" /> Dosya Yükle
                </Button>
                <input
                    data-allow-raw="true"
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                />
            </div>
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 space-y-2 text-sm bg-white dark:bg-gray-800">
                <ul className="list-disc pl-5 text-gray-500 dark:text-gray-400 text-xs space-y-1">
                    <li>"Telefon" başlıklı sütun zorunludur.</li>
                    <li>Önizleme ilk 8 satırı gösterir.</li>
                    <li>Geçerli telefonların sayısı kredi hesabına eklenir.</li>
                </ul>
                {excelLoading && (
                    <p className="text-indigo-600 text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Dosya analiz ediliyor...
                    </p>
                )}
                {excelError && (
                    <p className="text-red-600 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> {excelError}
                    </p>
                )}
                {excelPreview && (
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                            <span>Satır sayısı</span>
                            <span className="font-medium">{formatNumber(excelPreview.totalRows)}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                            <span>Telefonu olan kayıt</span>
                            <span className="font-medium">{formatNumber(excelPreview.validPhoneCount)}</span>
                        </div>
                    </div>
                )}
            </div>
            {excelPreview && (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400">
                            <tr>
                                {excelPreview.headers.map((header, index) => (
                                    <th key={`${header}-${index}`} className="px-3 py-2 text-left font-medium">
                                        {header || `Sütun ${index + 1}`}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {excelPreview.rows.map((row, rowIndex) => (
                                <tr key={rowIndex} className="text-gray-700 dark:text-gray-300">
                                    {excelPreview.headers.map((_, colIndex) => (
                                        <td key={colIndex} className="px-3 py-2">
                                            {row[colIndex] ?? ''}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Top Row: Hedef Kaynağı + Kredi Özeti */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hedef Kaynağı Card - 2/3 width */}
                <Card className="p-6 space-y-5 lg:col-span-2 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Hedef Kaynağı</p>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {mode === 'filters' ? 'Tenant Filtreleri' : 'Excel Listesi'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant={mode === 'filters' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setMode('filters')}
                                >
                                    Liste
                                </Button>
                                <Button
                                    variant={mode === 'excel' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setMode('excel')}
                                >
                                    Excel
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Alıcı Sayısı</p>
                                <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                                    {recipients ? formatNumber(recipients) : '-'}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                    {mode === 'filters' ? 'Filtrelenen tenant\'lar' : 'Telefonu bulunan satırlar'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Kaynak Detayı</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {mode === 'filters'
                                        ? `${Object.keys(audienceFilters).length === 0 ? 'Tüm tenant\'lar' : 'Özel filtreler'}`
                                        : excelPreview?.fileName || 'Dosya seçilmedi'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {mode === 'filters' ? (
                            <>
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Hedef Kitleler
                                </div>
                                {renderFilters()}
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    <FileSpreadsheet className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Excel Listesi
                                </div>
                                {renderExcelArea()}
                            </>
                        )}
                    </div>
                </Card>

                {/* Kredi Özeti Card - 1/3 width */}
                <Card className="p-6 space-y-4 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">Kredi Özeti</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Toplam Alıcı</span>
                            <span className="font-semibold dark:text-gray-200">{recipients ? formatNumber(recipients) : '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">SMS / Kişi</span>
                            <span className="font-semibold dark:text-gray-200">{smsSegments || '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Gerekli Kredi</span>
                            <span className="font-semibold dark:text-gray-200">{creditsNeeded ? formatNumber(creditsNeeded) : '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Mevcut Kredi</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatNumber(creditBalance)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Kalan Kredi</span>
                            <span className={`font-semibold ${creditDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {creditsNeeded > 0 ? formatNumber(creditDelta) : '-'}
                            </span>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${creditEnough ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {creditEnough ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                <AlertTriangle className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">
                                {creditEnough ? 'Kredi yeterli' : 'Yetersiz kredi'}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Message Card */}
            <Card className="p-6 space-y-4 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                        <div>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">SMS Mesajı</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Göndermek istediğiniz mesajı yazın</p>
                        </div>
                    </div>
                    <Calculator className="w-6 h-6 text-gray-400" />
                </div>

                {/* Dynamic Fields */}
                <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Dinamik Alanlar</p>
                    <div className="flex flex-wrap gap-2">
                        {DYNAMIC_FIELDS.map((field) => (
                            <button
                                data-allow-raw="true"
                                key={field.key}
                                type="button"
                                onClick={() => insertDynamicField(field.key)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                title={field.description}
                            >
                                <Plus className="w-3 h-3" />
                                {field.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <Textarea
                        ref={textareaRef}
                        className="w-full min-h-[200px] resize-none"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder="SMS mesajınızı buraya yazın...

Örnek: Sayın {{ABONE_ADI}}, X-Ear CRM sisteminde yeni özellikler sizleri bekliyor!"
                    />
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {message.length} karakter / {smsSegments} SMS
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPreview(true)}
                            disabled={!message.trim()}
                            className="flex items-center gap-1"
                        >
                            <Eye className="w-4 h-4" />
                            Önizle
                        </Button>
                    </div>
                </div>

                <Button
                    variant="primary"
                    className="w-full flex items-center justify-center gap-2"
                    disabled={!creditEnough || recipients === 0 || smsSegments === 0}
                    onClick={handleCampaignCreate}
                >
                    <Send className="w-4 h-4" />
                    Kampanya Oluştur ({recipients} alıcı)
                </Button>
            </Card>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SMS Önizleme</h3>
                            <button
                                data-allow-raw="true"
                                onClick={() => setShowPreview(false)}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                                <p className="text-xs text-gray-500 dark:text-gray-300 mb-2">
                                    Örnek Alıcı: {mode === 'filters' ? 'Örnek Klinik' : excelPreview?.rows[0]?.[0] || 'Örnek Klinik'}
                                </p>
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-600">
                                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{getPreviewMessage}</p>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                <p>Karakter sayısı: {getPreviewMessage.length}</p>
                                <p>SMS sayısı: {Math.max(1, Math.ceil(getPreviewMessage.length / SMS_SEGMENT_LENGTH))}</p>
                                <p>Toplam alıcı: {recipients}</p>
                                <p>Toplam kredi: {recipients * Math.max(1, Math.ceil(getPreviewMessage.length / SMS_SEGMENT_LENGTH))}</p>
                            </div>
                        </div>
                        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                            <Button
                                variant="primary"
                                className="w-full"
                                onClick={() => setShowPreview(false)}
                            >
                                Tamam
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkSmsTab;
