import React, { useMemo, useRef, useState } from 'react';
import { Button, Card, DatePicker, Select, Textarea, useToastHelpers } from '@x-ear/ui-web';
import {
    AlertTriangle,
    Calculator,
    CheckCircle,
    Download,
    Eye,
    FileSpreadsheet,
    Loader2,
    Megaphone,
    Plus,
    UploadCloud,
    Users,
    Wallet,
    X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
    useGetBranchesApiBranchesGet,
    useCountPatientsApiPatientsCountGet,
    useListPatientsApiPatientsGet,
    useGetSmsCreditApiSmsCreditGet,
    getGetBranchesQueryKey,
    getListPatientsQueryKey,
    getCountPatientsQueryKey
} from '@/api/generated';
import type { ListPatientsParams } from '@/api/generated/schemas';

type AudienceMode = 'filters' | 'excel';

type AudienceFilters = {
    status?: 'active' | 'passive';
    segment?: string;
    acquisitionType?: string;
    branchId?: string;
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

// Dynamic fields for SMS personalization
const DYNAMIC_FIELDS = [
    { key: '{{AD}}', label: 'Hasta Adı', description: 'Hastanın adı' },
    { key: '{{SOYAD}}', label: 'Hasta Soyadı', description: 'Hastanın soyadı' },
    { key: '{{AD_SOYAD}}', label: 'Ad Soyad', description: 'Tam isim' },
    { key: '{{TELEFON}}', label: 'Telefon', description: 'Telefon numarası' },
    { key: '{{SUBE}}', label: 'Şube', description: 'Bağlı olduğu şube' }
];

const segmentOptions = [
    { value: 'NEW', label: 'Yeni' },
    { value: 'TRIAL', label: 'Deneme' },
    { value: 'PURCHASED', label: 'Satın Alındı' },
    { value: 'CONTROL', label: 'Kontrol' },
    { value: 'RENEWAL', label: 'Yenileme' },
    { value: 'EXISTING', label: 'Mevcut' },
    { value: 'VIP', label: 'VIP' }
];

const acquisitionOptions = [
    { value: 'advertisement', label: 'Reklam' },
    { value: 'referral', label: 'Referans' },
    { value: 'social-media', label: 'Sosyal Medya' },
    { value: 'walk-in', label: 'Mağaza' },
    { value: 'online', label: 'Online' },
    { value: 'other', label: 'Diğer' }
];

const SMS_SEGMENT_LENGTH = 155;

const CampaignsPage: React.FC = () => {
    const [audienceFilters, setAudienceFilters] = useState<AudienceFilters>({ status: 'active' });
    const [mode, setMode] = useState<AudienceMode>('filters');
    const [message, setMessage] = useState('');
    const [excelPreview, setExcelPreview] = useState<ExcelPreview | null>(null);
    const [excelError, setExcelError] = useState<string | null>(null);
    const [excelLoading, setExcelLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { success: showSuccessToast, error: showErrorToast, warning: showWarningToast } = useToastHelpers();

    const { data: creditData, isFetching: creditLoading } = useGetSmsCreditApiSmsCreditGet();

    // Handle different response structures for credit balance
    let creditBalance = 0;
    if (creditData) {
        if (typeof creditData === 'number') {
            creditBalance = creditData;
        } else if ((creditData as any)?.balance !== undefined) {
            creditBalance = (creditData as any).balance;
        } else if ((creditData as any)?.data) {
            const innerData = (creditData as any).data;
            if (typeof innerData === 'number') {
                creditBalance = innerData;
            } else if (innerData?.balance !== undefined) {
                creditBalance = innerData.balance;
            } else if (innerData?.data?.balance !== undefined) {
                creditBalance = innerData.data.balance;
            }
        }
    }

    const { data: branchesData, isLoading: branchesLoading, isError: branchesError } = useGetBranchesApiBranchesGet({
        query: { queryKey: getGetBranchesQueryKey(), refetchOnWindowFocus: false }
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const branchOptions = useMemo(() => {
        const items: any[] = [];

        // Handle different response structures\n        if (branchesData) {\n            if (Array.isArray(branchesData)) {\n                items = branchesData;\n            } else if ((branchesData as any)?.data) {\n                const innerData = (branchesData as any).data;\n                if (Array.isArray(innerData)) {\n                    items = innerData;\n                } else if (innerData?.data && Array.isArray(innerData.data)) {\n                    items = innerData.data;\n                }\n            }\n        }

        return items
            .filter((branch): branch is { id: string; name?: string } => Boolean(branch?.id))
            .map((branch) => ({ value: branch.id, label: branch.name ?? '\u015eube' }));
    }, []);

    // Fetch first patient for preview
    const { data: patientsData, isLoading: patientsLoading, isError: patientsError } = useListPatientsApiPatientsGet(
        { page: 1, per_page: 1 },
        { query: { queryKey: getListPatientsQueryKey({ page: 1, per_page: 1 }), enabled: mode === 'filters', refetchOnWindowFocus: false } }
    );

    // Handle different response structures for first patient
    let firstPatient: any = null;
    if (patientsData) {
        if (Array.isArray(patientsData) && patientsData.length > 0) {
            firstPatient = patientsData[0];
        } else if ((patientsData as any)?.data) {
            const innerData = (patientsData as any).data;
            if (Array.isArray(innerData) && innerData.length > 0) {
                firstPatient = innerData[0];
            } else if (innerData?.data && Array.isArray(innerData.data) && innerData.data.length > 0) {
                firstPatient = innerData.data[0];
            }
        }
    }

    const normalizedParams = useMemo<ListPatientsParams>(() => {
        const params: ListPatientsParams = {};
        if (audienceFilters.status) params.status = audienceFilters.status;
        if (audienceFilters.segment) (params as any).segment = audienceFilters.segment;
        // Note: acquisition_type, branch_id, date_start, date_end are not supported by the current API
        // These filters are applied client-side or need backend extension
        return params;
    }, [audienceFilters]);

    const patientsCountQuery = useCountPatientsApiPatientsCountGet(
        mode === 'filters' ? normalizedParams : undefined,
        {
            query: {
                queryKey: getCountPatientsQueryKey(mode === 'filters' ? normalizedParams : undefined),
                enabled: mode === 'filters',
                refetchOnWindowFocus: false
            }
        }
    );
    const { isLoading: countLoading, isError: countError } = patientsCountQuery;

    const filterRecipientCount = (patientsCountQuery.data as any)?.count ?? 0;
    const excelRecipientCount = excelPreview?.validPhoneCount ?? 0;
    const recipients = (countLoading || countError) ? 0 : (mode === 'filters' ? filterRecipientCount : excelRecipientCount);

    const smsSegments = message.trim().length > 0
        ? Math.max(1, Math.ceil(message.length / SMS_SEGMENT_LENGTH))
        : 0;
    const creditsNeeded = recipients * smsSegments;
    const creditDelta = creditBalance - creditsNeeded;
    const creditEnough = creditsNeeded === 0 ? true : creditDelta >= 0;

    const handleTemplateDownload = () => {
        const link = document.createElement('a');
        link.href = '/campaign-template.xlsx';
        link.download = 'Numara_Mesaj_Ornek.xlsx';
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
            showWarningToast('Hedef kitle seçilmedi', 'Lütfen filtrelerden veya Excel dosyasından en az bir alıcı belirleyin.');
            return;
        }
        if (smsSegments === 0) {
            showWarningToast('Mesaj metni eksik', 'SMS gönderimi yapmadan önce bir mesaj yazmalısınız.');
            return;
        }
        if (!creditEnough) {
            showErrorToast('Yetersiz SMS kredisi', 'Lütfen kredi satın alın veya alıcı sayısını azaltın.');
            return;
        }

        showSuccessToast('Kampanya hazır', `${recipients} alıcı için ${creditsNeeded.toLocaleString('tr-TR')} kredi kullanımı hesaplandı.`);
    };

    const handleFiltersReset = () => {
        setAudienceFilters({ status: 'active' });
    };

    // Insert dynamic field at cursor position
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

        // Restore cursor position after the inserted field
        setTimeout(() => {
            textarea.focus();
            const newPos = start + fieldKey.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    };

    // Get preview message with dynamic fields replaced
    const getPreviewMessage = useMemo(() => {
        if (!message) return '';

        let preview = message;

        if (mode === 'filters' && firstPatient) {
            preview = preview
                .replace(/\{\{AD\}\}/g, firstPatient.firstName || 'Ad')
                .replace(/\{\{SOYAD\}\}/g, firstPatient.lastName || 'Soyad')
                .replace(/\{\{AD_SOYAD\}\}/g, `${firstPatient.firstName || 'Ad'} ${firstPatient.lastName || 'Soyad'}`)
                .replace(/\{\{TELEFON\}\}/g, firstPatient.phone || '05XX XXX XX XX')
                .replace(/\{\{SUBE\}\}/g, 'Şube');
        } else if (mode === 'excel' && excelPreview && excelPreview.rows.length > 0) {
            const firstRow = excelPreview.rows[0];
            const headers = excelPreview.headers.map((h) => String(h).toLowerCase());

            const nameIdx = headers.findIndex((h) => h.includes('ad') && !h.includes('soyad'));
            const surnameIdx = headers.findIndex((h) => h.includes('soyad'));
            const phoneIdx = headers.findIndex((h) => h.includes('telefon') || h.includes('phone'));

            const name = nameIdx >= 0 ? String(firstRow[nameIdx] || 'Ad') : 'Ad';
            const surname = surnameIdx >= 0 ? String(firstRow[surnameIdx] || 'Soyad') : 'Soyad';
            const phone = phoneIdx >= 0 ? String(firstRow[phoneIdx] || '05XX XXX XX XX') : '05XX XXX XX XX';

            preview = preview
                .replace(/\{\{AD\}\}/g, name)
                .replace(/\{\{SOYAD\}\}/g, surname)
                .replace(/\{\{AD_SOYAD\}\}/g, `${name} ${surname}`)
                .replace(/\{\{TELEFON\}\}/g, phone)
                .replace(/\{\{SUBE\}\}/g, 'Şube');
        } else {
            // Default placeholders
            preview = preview
                .replace(/\{\{AD\}\}/g, 'Ahmet')
                .replace(/\{\{SOYAD\}\}/g, 'Yılmaz')
                .replace(/\{\{AD_SOYAD\}\}/g, 'Ahmet Yılmaz')
                .replace(/\{\{TELEFON\}\}/g, '0532 123 45 67')
                .replace(/\{\{SUBE\}\}/g, 'Merkez Şube');
        }

        return preview;
    }, [message, mode, firstPatient, excelPreview]);

    const formatNumber = (value: number) => value.toLocaleString('tr-TR');

    const renderFilters = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Durum</label>
                    <Select
                        value={audienceFilters.status || ''}
                        onChange={(event) => setAudienceFilters((prev) => ({
                            ...prev,
                            status: event.target.value ? (event.target.value as 'active' | 'passive') : undefined
                        }))}
                        options={[
                            { value: '', label: 'Tümü' },
                            { value: 'active', label: 'Aktif' },
                            { value: 'passive', label: 'Pasif' }
                        ]}
                        fullWidth
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Segment</label>
                    <Select
                        value={audienceFilters.segment || ''}
                        onChange={(event) => setAudienceFilters((prev) => ({
                            ...prev,
                            segment: event.target.value || undefined
                        }))}
                        options={[{ value: '', label: 'Tümü' }, ...segmentOptions]}
                        fullWidth
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Kazanım Türü</label>
                    <Select
                        value={audienceFilters.acquisitionType || ''}
                        onChange={(event) => setAudienceFilters((prev) => ({
                            ...prev,
                            acquisitionType: event.target.value || undefined
                        }))}
                        options={[{ value: '', label: 'Tümü' }, ...acquisitionOptions]}
                        fullWidth
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Şube</label>
                    <Select
                        value={audienceFilters.branchId || ''}
                        onChange={(event) => setAudienceFilters((prev) => ({
                            ...prev,
                            branchId: event.target.value || undefined
                        }))}
                        options={branchesLoading
                            ? [{ value: '', label: 'Şubeler Yükleniyor...' }]
                            : branchesError
                                ? [{ value: '', label: 'Şube Hatası' }]
                                : [{ value: '', label: 'Tümü' }, ...branchOptions]
                        }
                        fullWidth
                        disabled={branchesLoading}
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
                        fullWidth
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
                        fullWidth
                    />
                </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    {patientsCountQuery.isFetching ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500 dark:text-indigo-400" />
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
            {patientsCountQuery.isError && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Hedef kitle sayısı alınamadı.
                </p>
            )}
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
                        <div className="flex items-center justify-between text-gray-700">
                            <span>Satır sayısı</span>
                            <span className="font-medium">{formatNumber(excelPreview.totalRows)}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-700">
                            <span>Telefonu olan kayıt</span>
                            <span className="font-medium">{formatNumber(excelPreview.validPhoneCount)}</span>
                        </div>
                    </div>
                )}
            </div>
            {excelPreview && (
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300">
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
                                <tr key={rowIndex} className="text-gray-700 dark:text-gray-300 lg:hover:bg-gray-50 dark:lg:hover:bg-gray-800">
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
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
                        <Megaphone className="w-4 h-4" /> SMS Kampanyaları
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Kampanya Oluştur</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Hedef kitleyi belirleyin, mesajı yazın ve kalan kredinize göre maliyeti görün.
                        </p>
                    </div>
                </div>
                <Card className="p-4 flex items-center gap-3 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/40 dark:to-gray-800 border border-indigo-100 dark:border-indigo-900/50 max-w-sm w-full">
                    <div className="p-2 rounded-full bg-white dark:bg-indigo-900 text-indigo-600 dark:text-indigo-200">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Kalan SMS Kredisi</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {creditLoading ? 'Yükleniyor...' : `${formatNumber(creditBalance)} kredi`}
                        </p>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 space-y-5">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Hedef Kaynağı</p>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {mode === 'filters' ? 'Hasta Filtreleri' : 'Excel Listesi'}
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
                                <p className="text-xs text-gray-400">
                                    {mode === 'filters' ? 'Filtrelenen hastalar' : 'Telefonu bulunan satırlar'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Kaynak Detayı</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {mode === 'filters'
                                        ? `${Object.keys(normalizedParams).length === 0 ? 'Tüm hastalar' : 'Özel filtreler'}`
                                        : excelPreview?.fileName || 'Dosya seçilmedi'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {mode === 'filters' ? (
                            <>
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    <Users className="w-4 h-4 text-indigo-500" /> Hedef Kitleler
                                </div>
                                {renderFilters()}
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                    <FileSpreadsheet className="w-4 h-4 text-indigo-500" /> Excel Listesi
                                </div>
                                {renderExcelArea()}
                            </>
                        )}
                    </div>
                </Card>

                <Card className="p-6 space-y-4 flex flex-col">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">SMS Mesajı</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">Metin ve Kredi</p>
                        </div>
                        {creditEnough ? (
                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                        ) : (
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                        )}
                    </div>

                    {/* Dynamic Fields */}
                    <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Dinamik Alanlar</p>
                        <div className="flex flex-wrap gap-2">
                            {DYNAMIC_FIELDS.map((field) => (
                                <button
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
                        <p className="text-xs text-gray-400">Tıklayarak mesaja dinamik alan ekleyin</p>
                    </div>

                    {/* Message Textarea - Full Height */}
                    <div className="flex-1 flex flex-col space-y-2">
                        <Textarea
                            ref={textareaRef}
                            className="flex-1 min-h-[180px] resize-none"
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder="Gönderilecek SMS metnini buraya yazın. Dinamik alanları kullanarak kişiselleştirilmiş mesajlar oluşturabilirsiniz.

Örnek: Sayın {{AD}} {{SOYAD}}, randevunuzu hatırlatmak isteriz."
                        />
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {smsSegments || 0} SMS / kişi ({message.length} karakter)
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPreview(true)}
                                disabled={!message.trim()}
                                className="flex items-center gap-1"
                            >
                                <Eye className="w-4 h-4" />
                                Mesajı Önizle
                            </Button>
                        </div>
                    </div>

                    {/* Credit Summary */}
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2 bg-gray-50 dark:bg-gray-800">
                        <div className="flex justify-between text-sm">
                            <span>Toplam alıcı</span>
                            <span className="font-semibold">{recipients ? formatNumber(recipients) : '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>SMS / kişi</span>
                            <span className="font-semibold">{smsSegments || '-'}</span>
                        </div>
                        <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-white">
                            <span>Toplam kredi</span>
                            <span>{creditsNeeded ? formatNumber(creditsNeeded) : '-'}</span>
                        </div>
                        <p className={`text-xs ${creditEnough ? 'text-emerald-600' : 'text-red-600'}`}>
                            {creditEnough
                                ? 'Kredi yeterli'
                                : `Eksik kredi: ${formatNumber(Math.abs(creditDelta))}`}
                        </p>
                    </div>

                    <Button
                        variant="primary"
                        className="w-full flex items-center justify-center gap-2"
                        disabled={!creditEnough || recipients === 0 || smsSegments === 0}
                        onClick={handleCampaignCreate}
                    >
                        <Calculator className="w-4 h-4" /> Kampanyayı Başlat
                    </Button>
                </Card>
            </div>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SMS Önizleme</h3>
                            <button
                                onClick={() => setShowPreview(false)}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    {mode === 'filters' && firstPatient
                                        ? `İlk hasta: ${firstPatient.firstName} ${firstPatient.lastName}`
                                        : mode === 'excel' && excelPreview
                                            ? 'Excel listesinden ilk kayıt'
                                            : 'Örnek verilerle'}
                                </p>
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm border border-gray-200 dark:border-gray-600">
                                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{getPreviewMessage}</p>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                <p>Karakter sayısı: {getPreviewMessage.length}</p>
                                <p>SMS sayısı: {Math.max(1, Math.ceil(getPreviewMessage.length / SMS_SEGMENT_LENGTH))}</p>
                            </div>
                        </div>
                        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
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

export default CampaignsPage;
