import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, DatePicker, Select, Textarea, useToastHelpers, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
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
    UploadCloud,
    Users,
    X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
    useListBranches,
    useListPartyCount,
    useListParties,
    getListBranchesQueryKey,
    getListPartiesQueryKey,
    getListPartyCountQueryKey,
    useListSmHeaders,
    getListSmHeadersQueryKey
} from '@/api/client/branches.client';
import type { ListPartiesParams, BranchRead, SmsHeaderRequestRead, PartyRead } from '@/api/generated/schemas';
import { unwrapArray } from '@/utils/response-unwrap';

import { useAuthStore } from '@/stores/authStore';

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

const SMS_SEGMENT_LENGTH = 155;

interface BulkSmsTabProps {
    creditBalance: number;
    creditLoading?: boolean;
}

export const BulkSmsTab: React.FC<BulkSmsTabProps> = ({ creditBalance }) => {
    const { t } = useTranslation('campaigns');
    const [audienceFilters, setAudienceFilters] = useState<AudienceFilters>({ status: 'active' });
    const [mode, setMode] = useState<AudienceMode>('filters');
    const [message, setMessage] = useState('');
    const [selectedHeader, setSelectedHeader] = useState('');
    const [excelPreview, setExcelPreview] = useState<ExcelPreview | null>(null);
    const [excelError, setExcelError] = useState<string | null>(null);
    const [excelLoading, setExcelLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { success: showSuccessToast, error: showErrorToast, warning: showWarningToast } = useToastHelpers();
    const { token } = useAuthStore();

    // Dynamic fields for SMS personalization
    const DYNAMIC_FIELDS = [
        { key: '{{AD}}', label: t('variables.patient_name'), description: t('variables.patient_name') },
        { key: '{{SOYAD}}', label: t('variables.patient_surname'), description: t('variables.patient_surname') },
        { key: '{{TELEFON}}', label: t('variables.phone'), description: t('variables.phone') },
        { key: '{{SUBE}}', label: t('variables.branch'), description: t('variables.branch') },
        { key: '{{FIRMA_ADI}}', label: t('variables.companyName'), description: t('variables.companyName') },
        { key: '{{FIRMA_TELEFONU}}', label: t('variables.companyPhone'), description: t('variables.companyPhone') }
    ];

    const segmentOptions = [
        { value: 'NEW', label: t('sms.segments.NEW') },
        { value: 'TRIAL', label: t('sms.segments.TRIAL') },
        { value: 'PURCHASED', label: t('sms.segments.PURCHASED') },
        { value: 'CONTROL', label: t('sms.segments.CONTROL') },
        { value: 'RENEWAL', label: t('sms.segments.RENEWAL') },
        { value: 'EXISTING', label: t('sms.segments.EXISTING') },
        { value: 'VIP', label: t('sms.segments.VIP') }
    ];

    const acquisitionOptions = [
        { value: 'advertisement', label: t('sms.acquisition.advertisement') },
        { value: 'referral', label: t('sms.acquisition.referral') },
        { value: 'social-media', label: t('sms.acquisition.social-media') },
        { value: 'walk-in', label: t('sms.acquisition.walk-in') },
        { value: 'online', label: t('sms.acquisition.online') },
        { value: 'other', label: t('sms.acquisition.other') }
    ];

    const { data: branchesData, isLoading: branchesLoading, isError: branchesError } = useListBranches(
        undefined,
        { query: { queryKey: getListBranchesQueryKey(), refetchOnWindowFocus: false, enabled: !!token } }
    );

    // Get SMS headers for sender selection
    const { data: headersData, isLoading: headersLoading, isError: headersError } = useListSmHeaders({
        query: { queryKey: getListSmHeadersQueryKey(), refetchOnWindowFocus: false, enabled: !!token }
    });

    const branchOptions = useMemo(() => {
        const items = unwrapArray<BranchRead>(branchesData);

        return items
            .filter((branch): branch is BranchRead => Boolean(branch?.id))
            .map((branch) => ({ value: branch.id, label: branch.name ?? t('sms.filters.branchDefault') }));
    }, [branchesData, t]);

    // Parse SMS headers and filter only approved ones
    const headerOptions = useMemo(() => {
        const headersRaw = unwrapArray<SmsHeaderRequestRead>(headersData);
        // Only return approved headers
        return headersRaw
            .filter(h => h.status === 'approved')
            .map((h) => ({
                value: h.id || h.headerText || '',
                label: h.headerText || '',
                isDefault: h.isDefault
            }));
    }, [headersData]);

    // Set default header when headers are loaded
    React.useEffect(() => {
        if (headerOptions.length > 0 && !selectedHeader) {
            const defaultHeader = headerOptions.find(h => h.isDefault);
            if (defaultHeader) {
                setSelectedHeader(defaultHeader.value);
            } else if (headerOptions.length === 1) {
                // If only one header, select it automatically
                setSelectedHeader(headerOptions[0].value);
            }
        }
    }, [headerOptions, selectedHeader]);

    // Fetch first party for preview
    const { data: partiesData /*, isLoading: partiesLoading, isError: partiesError */ } = useListParties(
        { page: 1, per_page: 1 },
        { query: { queryKey: getListPartiesQueryKey({ page: 1, per_page: 1 }), enabled: mode === 'filters' && !!token, refetchOnWindowFocus: false } }
    );

    // Handle different response structures for first party
    let firstParty: PartyRead | null = null;
    const items = unwrapArray<PartyRead>(partiesData);
    if (items.length > 0) {
        firstParty = items[0];
    }

    const normalizedParams = useMemo<ListPartiesParams>(() => {
        const params: ListPartiesParams & { segment?: string } = {};
        if (audienceFilters.status) params.status = audienceFilters.status;
        if (audienceFilters.segment) params.segment = audienceFilters.segment;
        // Note: acquisition_type, branch_id, date_start, date_end are not supported by the current API
        // These filters are applied client-side or need backend extension
        return params;
    }, [audienceFilters]);

    const partiesCountQuery = useListPartyCount(
        mode === 'filters' ? normalizedParams : undefined,
        {
            query: {
                queryKey: getListPartyCountQueryKey(mode === 'filters' ? normalizedParams : undefined),
                enabled: mode === 'filters',
                refetchOnWindowFocus: false
            }
        }
    );
    const { isLoading: countLoading } = partiesCountQuery;

    const filterRecipientCount = (partiesCountQuery.data as { count?: number })?.count ?? 0;
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
                setExcelError(t('sms.excel.phoneColumnNotFound'));
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
            setExcelError(t('sms.excel.readError'));
            setExcelPreview(null);
        } finally {
            setExcelLoading(false);
            event.target.value = '';
        }
    };

    const handleCampaignCreate = () => {
        if (recipients === 0) {
            showWarningToast(t('sms.bulk.noAudienceSelected'), t('sms.bulk.noAudienceSelectedDesc'));
            return;
        }
        if (smsSegments === 0) {
            showWarningToast(t('sms.bulk.messageEmpty'), t('sms.bulk.messageEmptyDesc'));
            return;
        }
        if (!creditEnough) {
            showErrorToast(t('sms.bulk.insufficientCredits'), t('sms.bulk.insufficientCreditsDesc'));
            return;
        }

        showSuccessToast(t('sms.bulk.campaignReady'), t('sms.bulk.campaignReadyDesc', { count: recipients, credits: creditsNeeded.toLocaleString('tr-TR') }));
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

        if (mode === 'filters' && firstParty) {
            preview = preview
                .replace(/\{\{AD\}\}/g, firstParty.firstName || 'Ad')
                .replace(/\{\{SOYAD\}\}/g, firstParty.lastName || 'Soyad')
                .replace(/\{\{TELEFON\}\}/g, firstParty.phone || '05XX XXX XX XX')
                .replace(/\{\{SUBE\}\}/g, t('sms.filters.branchDefault'))
                .replace(/\{\{FIRMA_ADI\}\}/g, 'X-Ear')
                .replace(/\{\{FIRMA_TELEFONU\}\}/g, '0850 XXX XX XX');
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
                .replace(/\{\{TELEFON\}\}/g, phone)
                .replace(/\{\{SUBE\}\}/g, t('sms.filters.branchDefault'))
                .replace(/\{\{FIRMA_ADI\}\}/g, 'X-Ear')
                .replace(/\{\{FIRMA_TELEFONU\}\}/g, '0850 XXX XX XX');
        } else {
            // Default placeholders
            preview = preview
                .replace(/\{\{AD\}\}/g, 'Ahmet')
                .replace(/\{\{SOYAD\}\}/g, 'Yilmaz')
                .replace(/\{\{TELEFON\}\}/g, '0532 123 45 67')
                .replace(/\{\{SUBE\}\}/g, 'Merkez')
                .replace(/\{\{FIRMA_ADI\}\}/g, 'X-Ear')
                .replace(/\{\{FIRMA_TELEFONU\}\}/g, '0850 XXX XX XX');
        }

        return preview;
    }, [message, mode, firstParty, excelPreview, t]);

    const formatNumber = (value: number) => value.toLocaleString('tr-TR');

    const renderFilters = () => (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                    <label className="text-xs font-semibold text-muted-foreground">{t('sms.filters.status')}</label>
                    <Select
                        value={audienceFilters.status || ''}
                        onChange={(event) => setAudienceFilters((prev) => ({
                            ...prev,
                            status: event.target.value ? (event.target.value as 'active' | 'passive') : undefined
                        }))}
                        options={[
                            { value: '', label: t('sms.filters.all') },
                            { value: 'active', label: t('sms.filters.active') },
                            { value: 'passive', label: t('sms.filters.passive') }
                        ]}
                        fullWidth
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground">{t('sms.filters.segment')}</label>
                    <Select
                        value={audienceFilters.segment || ''}
                        onChange={(event) => setAudienceFilters((prev) => ({
                            ...prev,
                            segment: event.target.value || undefined
                        }))}
                        options={[{ value: '', label: t('sms.filters.all') }, ...segmentOptions]}
                        fullWidth
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground">{t('sms.filters.acquisitionType')}</label>
                    <Select
                        value={audienceFilters.acquisitionType || ''}
                        onChange={(event) => setAudienceFilters((prev) => ({
                            ...prev,
                            acquisitionType: event.target.value || undefined
                        }))}
                        options={[{ value: '', label: t('sms.filters.all') }, ...acquisitionOptions]}
                        fullWidth
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground">{t('sms.filters.branch')}</label>
                    <Select
                        value={audienceFilters.branchId || ''}
                        onChange={(event) => setAudienceFilters((prev) => ({
                            ...prev,
                            branchId: event.target.value || undefined
                        }))}
                        options={branchesLoading
                            ? [{ value: '', label: t('sms.filters.branchesLoading') }]
                            : branchesError
                                ? [{ value: '', label: t('sms.filters.branchError') }]
                                : [{ value: '', label: t('sms.filters.all') }, ...branchOptions]
                        }
                        fullWidth
                        disabled={branchesLoading}
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground">{t('sms.filters.senderHeader')}</label>
                    <Select
                        value={selectedHeader}
                        onChange={(event) => setSelectedHeader(event.target.value)}
                        options={headersLoading
                            ? [{ value: '', label: t('sms.filters.headersLoading') }]
                            : headersError
                                ? [{ value: '', label: t('sms.filters.headerError') }]
                                : [{ value: '', label: t('sms.filters.headerDefault') }, ...headerOptions]
                        }
                        fullWidth
                        disabled={headersLoading}
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground">{t('sms.filters.startDate')}</label>
                    <DatePicker
                        value={audienceFilters.dateStart ? new Date(audienceFilters.dateStart) : null}
                        onChange={(date) => setAudienceFilters((prev) => ({
                            ...prev,
                            dateStart: date ? date.toISOString().split('T')[0] : undefined
                        }))}
                        placeholder={t('sms.filters.datePlaceholder')}
                        fullWidth
                    />
                </div>
                <div>
                    <label className="text-xs font-semibold text-muted-foreground">{t('sms.filters.endDate')}</label>
                    <DatePicker
                        value={audienceFilters.dateEnd ? new Date(audienceFilters.dateEnd) : null}
                        onChange={(date) => setAudienceFilters((prev) => ({
                            ...prev,
                            dateEnd: date ? date.toISOString().split('T')[0] : undefined
                        }))}
                        placeholder={t('sms.filters.datePlaceholder')}
                        fullWidth
                    />
                </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                    {partiesCountQuery.isFetching || countLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                            {t('sms.bulk.calculatingRecipients')}
                        </>
                    ) : (
                        <>
                            {t('sms.bulk.filteredRecipientCount')}
                            <span className="font-semibold">{formatNumber(filterRecipientCount)}</span>
                        </>
                    )}
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleFiltersReset}>
                        {t('sms.bulk.clear')}
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => setMode('filters')}>
                        {t('sms.bulk.applyFilter')}
                    </Button>
                </div>
            </div>
            {partiesCountQuery.isError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {t('sms.bulk.audienceCountError')}
                </p>
            )}
        </>
    );

    const renderExcelArea = () => (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-muted-foreground">{t('sms.excel.uploadInstruction')}</p>
                <Button variant="secondary" size="sm" className="flex items-center gap-1" onClick={handleTemplateDownload}>
                    <Download className="w-4 h-4" /> {t('sms.excel.sampleExcel')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <UploadCloud className="w-4 h-4" /> {t('sms.excel.uploadFile')}
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
            <div className="rounded-2xl border border-dashed border-border p-4 space-y-2 text-sm bg-white dark:bg-gray-800">
                <ul className="list-disc pl-5 text-muted-foreground text-xs space-y-1">
                    <li>{t('sms.excel.phoneColumnRequired')}</li>
                    <li>{t('sms.excel.previewRows')}</li>
                    <li>{t('sms.excel.validPhoneCredit')}</li>
                </ul>
                {excelLoading && (
                    <p className="text-indigo-600 text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> {t('sms.excel.analyzing')}
                    </p>
                )}
                {excelError && (
                    <p className="text-destructive text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" /> {excelError}
                    </p>
                )}
                {excelPreview && (
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between text-foreground">
                            <span>{t('sms.excel.rowCount')}</span>
                            <span className="font-medium">{formatNumber(excelPreview.totalRows)}</span>
                        </div>
                        <div className="flex items-center justify-between text-foreground">
                            <span>{t('sms.excel.phoneRecordCount')}</span>
                            <span className="font-medium">{formatNumber(excelPreview.validPhoneCount)}</span>
                        </div>
                    </div>
                )}
            </div>
            {excelPreview && (() => {
                const excelColumns: Column<{ _idx: number; _row: (string | number | undefined)[] }>[] = excelPreview.headers.map((header, index) => ({
                    key: `col_${index}`,
                    title: String(header || `${t('sms.excel.columnPrefix')} ${index + 1}`),
                    render: (_, item) => String(item._row[index] ?? ''),
                }));
                const excelRows = excelPreview.rows.map((row, index) => ({ _idx: index, _row: row }));

                return (
                    <DataTable<{ _idx: number; _row: (string | number | undefined)[] }>
                        data={excelRows}
                        columns={excelColumns}
                        rowKey="_idx"
                        emptyText={t('sms.bulk.excelPreviewEmpty')}
                    />
                );
            })()}
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Top Row: Hedef Kaynagi + Kredi Ozeti */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hedef Kaynagi Card - 2/3 width */}
                <Card className="p-6 space-y-5 lg:col-span-2 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">{t('sms.bulk.targetSource')}</p>
                                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                                    {mode === 'filters' ? t('sms.bulk.patientFilters') : t('sms.bulk.excelList')}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant={mode === 'filters' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setMode('filters')}
                                >
                                    {t('sms.bulk.list')}
                                </Button>
                                <Button
                                    variant={mode === 'excel' ? 'primary' : 'ghost'}
                                    size="sm"
                                    onClick={() => setMode('excel')}
                                >
                                    {t('sms.bulk.excel')}
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-muted-foreground">{t('sms.bulk.recipientCount')}</p>
                                <p className="text-3xl font-semibold text-gray-900 dark:text-white">
                                    {recipients ? formatNumber(recipients) : '-'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {mode === 'filters' ? t('sms.bulk.filteredPatients') : t('sms.bulk.rowsWithPhone')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{t('sms.bulk.sourceDetail')}</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {mode === 'filters'
                                        ? `${Object.keys(normalizedParams).length === 0 ? t('sms.bulk.allPatients') : t('sms.bulk.customFilters')}`
                                        : excelPreview?.fileName || t('sms.bulk.noFileSelected')}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        {mode === 'filters' ? (
                            <>
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <Users className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> {t('sms.bulk.audiences')}
                                </div>
                                {renderFilters()}
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <FileSpreadsheet className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> {t('sms.bulk.excelList')}
                                </div>
                                {renderExcelArea()}
                            </>
                        )}
                    </div>
                </Card>

                {/* Kredi Ozeti Card - 1/3 width */}
                <Card className="p-6 space-y-4 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('sms.credit.summary')}</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('sms.credit.totalRecipients')}</span>
                            <span className="font-semibold dark:text-gray-200">{recipients ? formatNumber(recipients) : '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('sms.credit.smsPerPerson')}</span>
                            <span className="font-semibold dark:text-gray-200">{smsSegments || '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('sms.credit.requiredCredits')}</span>
                            <span className="font-semibold dark:text-gray-200">{creditsNeeded ? formatNumber(creditsNeeded) : '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('sms.credit.availableCredits')}</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatNumber(creditBalance)}</span>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl ${creditEnough ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
                            {creditEnough ? (
                                <CheckCircle className="w-4 h-4" />
                            ) : (
                                <AlertTriangle className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">
                                {creditEnough ? t('sms.credit.creditSufficient') : t('sms.credit.missing', { count: formatNumber(Math.abs(creditDelta)) })}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* SMS Mesaji Card - Full Width */}
            <Card className="p-6 space-y-4 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                        <div>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('sms.message.smsMessage')}</p>
                            <p className="text-sm text-muted-foreground">{t('sms.message.writeMessage')}</p>
                        </div>
                    </div>
                    {creditEnough && message.trim() ? (
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                    ) : (
                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                    )}
                </div>

                {/* Dynamic Fields */}
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{t('variables.dynamicFields')}</p>
                    <div className="flex flex-wrap gap-2">
                        {DYNAMIC_FIELDS.map((field) => (
                            <button
                                data-allow-raw="true"
                                key={field.key}
                                type="button"
                                onClick={() => insertDynamicField(field.key)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                                title={field.description}
                            >
                                <Plus className="w-3 h-3" />
                                {field.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Message Textarea - Full Width */}
                <div className="space-y-2">
                    <Textarea
                        ref={textareaRef}
                        className="w-full min-h-[200px] resize-none"
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder={t('sms.message.placeholder')}
                    />
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            {t('sms.message.charsPerSms', { chars: message.length, sms: smsSegments || 0 })}
                        </p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowPreview(true)}
                            disabled={!message.trim()}
                            className="flex items-center gap-1"
                        >
                            <Eye className="w-4 h-4" />
                            {t('sms.message.previewBtn')}
                        </Button>
                    </div>
                </div>

                <Button
                    variant="primary"
                    className="w-full flex items-center justify-center gap-2"
                    disabled={!creditEnough || recipients === 0 || smsSegments === 0}
                    onClick={handleCampaignCreate}
                >
                    <Calculator className="w-4 h-4" /> {t('sms.bulk.startCampaign')}
                </Button>
            </Card>

            {/* Preview Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('sms.preview.title')}</h3>
                            <button
                                data-allow-raw="true"
                                onClick={() => setShowPreview(false)}
                                className="p-1 rounded-2xl hover:bg-muted dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="bg-muted rounded-2xl p-4">
                                <p className="text-xs text-muted-foreground mb-2">
                                    {mode === 'filters' && firstParty
                                        ? t('sms.preview.firstPatient', { name: `${firstParty.firstName} ${firstParty.lastName}` })
                                        : mode === 'excel' && excelPreview
                                            ? t('sms.preview.excelFirstRecord')
                                            : t('sms.preview.sampleData')}
                                </p>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-border">
                                    <p className="text-sm text-foreground whitespace-pre-wrap">{getPreviewMessage}</p>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p>{t('sms.preview.charCount', { count: getPreviewMessage.length })}</p>
                                <p>{t('sms.preview.smsCount', { count: Math.max(1, Math.ceil(getPreviewMessage.length / SMS_SEGMENT_LENGTH)) })}</p>
                            </div>
                        </div>
                        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                            <Button
                                variant="primary"
                                className="w-full"
                                onClick={() => setShowPreview(false)}
                            >
                                {t('sms.preview.ok')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkSmsTab;
