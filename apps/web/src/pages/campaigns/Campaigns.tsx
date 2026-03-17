import React, { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, DatePicker, Select, Textarea, useToastHelpers, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
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
    useListBranches,
    useListPartyCount,
    getListBranchesQueryKey,
    getListPartyCountQueryKey
} from '@/api/client/branches.client';
import {
    useListParties,
    getListPartiesQueryKey,
} from '@/api/client/parties.client';
import { useListSmCredit } from '@/api/client/sms-integration.client';
import type { ListPartiesParams } from '@/api/generated/schemas';

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

const CampaignsPage: React.FC = () => {
    const { t } = useTranslation('campaigns');

    // Dynamic fields for SMS personalization
    const DYNAMIC_FIELDS = [
        { key: '{{AD}}', label: t('variables.patient_name'), description: t('variables.patient_name') },
        { key: '{{SOYAD}}', label: t('variables.patient_surname'), description: t('variables.patient_surname') },
        { key: '{{AD_SOYAD}}', label: t('variables.patient_full_name'), description: t('variables.patient_full_name') },
        { key: '{{TELEFON}}', label: t('variables.phone'), description: t('variables.phone') },
        { key: '{{SUBE}}', label: t('variables.branch'), description: t('variables.branch') }
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

    const { data: creditData, isFetching: creditLoading } = useListSmCredit();

    // Handle credit balance with strict type checking
    const creditBalance = useMemo(() => {
        if (!creditData) return 0;
        if (typeof creditData === 'object' && 'data' in creditData) {
            const data = (creditData as { data?: { balance?: number } }).data;
            return data?.balance ?? 0;
        }
        return 0;
    }, [creditData]);

    const { data: branchesData, isLoading: branchesLoading, isError: branchesError } = useListBranches(
        undefined,
        { query: { queryKey: getListBranchesQueryKey(), refetchOnWindowFocus: false } }
    );

    const branchOptions = useMemo(() => {
        const items: Array<{ id: string; name?: string }> = [];

        if (branchesData && typeof branchesData === 'object' && 'data' in branchesData) {
            const data = (branchesData as { data?: unknown }).data;
            if (Array.isArray(data)) {
                items.push(...data.map((item: unknown) => {
                    const branch = item as Record<string, unknown>;
                    return {
                        id: String(branch.id || ''),
                        name: branch.name ? String(branch.name) : undefined
                    };
                }).filter((branch) => Boolean(branch.id)));
            }
        }

        return items.map((branch) => ({ value: branch.id, label: branch.name ?? t('sms.filters.branchDefault') }));
    }, [branchesData, t]);

    // Fetch first party for preview
    const { data: partiesData } = useListParties(
        { page: 1, per_page: 1 },
        { query: { queryKey: getListPartiesQueryKey({ page: 1, per_page: 1 }), enabled: mode === 'filters', refetchOnWindowFocus: false } }
    );

    // Handle different response structures for first party
    let firstParty: { firstName?: string; lastName?: string; phone?: string } | null = null;
    if (partiesData && typeof partiesData === 'object' && 'data' in partiesData) {
        const data = (partiesData as { data?: unknown }).data;
        if (Array.isArray(data) && data.length > 0) {
            const party = data[0] as Record<string, unknown>;
            firstParty = {
                firstName: party.firstName ? String(party.firstName) : undefined,
                lastName: party.lastName ? String(party.lastName) : undefined,
                phone: party.phone ? String(party.phone) : undefined
            };
        }
    }

    const normalizedParams = useMemo<ListPartiesParams>(() => {
        const params: ListPartiesParams = {};
        if (audienceFilters.status) params.status = audienceFilters.status;
        if (audienceFilters.segment) {
            // @ts-expect-error - 'segment' might not be in ListPartiesParams definition yet, but backend supports it
            params.segment = audienceFilters.segment;
        }
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
    const { isLoading: countLoading, isError: countError } = partiesCountQuery;

    const filterRecipientCount = useMemo(() => {
        const data = partiesCountQuery.data;
        if (data && typeof data === 'object' && 'data' in data) {
            return (data as { data?: { count?: number } }).data?.count ?? 0;
        }
        return 0;
    }, [partiesCountQuery.data]);
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

        if (mode === 'filters' && firstParty) {
            preview = preview
                .replace(/\{\{AD\}\}/g, firstParty.firstName || 'Ad')
                .replace(/\{\{SOYAD\}\}/g, firstParty.lastName || 'Soyad')
                .replace(/\{\{AD_SOYAD\}\}/g, `${firstParty.firstName || 'Ad'} ${firstParty.lastName || 'Soyad'}`)
                .replace(/\{\{TELEFON\}\}/g, firstParty.phone || '05XX XXX XX XX')
                .replace(/\{\{SUBE\}\}/g, t('sms.filters.branchDefault'));
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
                .replace(/\{\{SUBE\}\}/g, t('sms.filters.branchDefault'));
        } else {
            // Default placeholders
            preview = preview
                .replace(/\{\{AD\}\}/g, 'Ahmet')
                .replace(/\{\{SOYAD\}\}/g, 'Yilmaz')
                .replace(/\{\{AD_SOYAD\}\}/g, 'Ahmet Yilmaz')
                .replace(/\{\{TELEFON\}\}/g, '0532 123 45 67')
                .replace(/\{\{SUBE\}\}/g, 'Merkez');
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
                    {partiesCountQuery.isFetching ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500 dark:text-indigo-400" />
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
                const excelCols = excelPreview.headers.map((hdr, ci): Column<{ _k: number; _row: (string | number | undefined)[] }> => ({
                    key: `c${ci}`,
                    title: String(hdr || `${t('sms.excel.columnPrefix')} ${ci + 1}`),
                    render: (_, item) => <span className="text-xs">{String(item._row[ci] ?? '')}</span>,
                }));
                const excelData = excelPreview.rows.map((_row, i) => ({ _k: i, _row }));
                return (
                    <div className="overflow-hidden rounded-2xl border border-border">
                        <DataTable<{ _k: number; _row: (string | number | undefined)[] }>
                            data={excelData}
                            columns={excelCols}
                            rowKey={(item) => item._k}
                            size="small"
                            responsive={false}
                        />
                    </div>
                );
            })()}
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
                        <Megaphone className="w-4 h-4" /> {t('sms.campaigns.title')}
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('sms.campaigns.createCampaign')}</h1>
                        <p className="text-sm text-muted-foreground">
                            {t('sms.campaigns.campaignDesc')}
                        </p>
                    </div>
                </div>
                <Card className="p-4 flex items-center gap-3 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-900/40 dark:to-gray-800 border border-indigo-100 dark:border-indigo-900/50 max-w-sm w-full">
                    <div className="p-2 rounded-full bg-white dark:bg-indigo-900 text-indigo-600 dark:text-indigo-200">
                        <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs uppercase text-muted-foreground">{t('sms.credit.remainingCredits')}</p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {creditLoading ? t('sms.credit.loading') : `${formatNumber(creditBalance)} ${t('sms.credit.creditUnit')}`}
                        </p>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 space-y-5">
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
                                    <Users className="w-4 h-4 text-indigo-500" /> {t('sms.bulk.audiences')}
                                </div>
                                {renderFilters()}
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <FileSpreadsheet className="w-4 h-4 text-indigo-500" /> {t('sms.bulk.excelList')}
                                </div>
                                {renderExcelArea()}
                            </>
                        )}
                    </div>
                </Card>

                <Card className="p-6 space-y-4 flex flex-col">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground">{t('sms.message.smsMessage')}</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('sms.message.textAndCredit')}</p>
                        </div>
                        {creditEnough ? (
                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                        ) : (
                            <AlertTriangle className="w-6 h-6 text-destructive" />
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
                        <p className="text-xs text-muted-foreground">{t('variables.clickToInsert')}</p>
                    </div>

                    {/* Message Textarea - Full Height */}
                    <div className="flex-1 flex flex-col space-y-2">
                        <Textarea
                            ref={textareaRef}
                            className="flex-1 min-h-[180px] resize-none"
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            placeholder={t('sms.message.placeholder')}
                        />
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                                {t('sms.message.smsPerPerson', { sms: smsSegments || 0, chars: message.length })}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPreview(true)}
                                disabled={!message.trim()}
                                className="flex items-center gap-1"
                            >
                                <Eye className="w-4 h-4" />
                                {t('sms.message.previewMessage')}
                            </Button>
                        </div>
                    </div>

                    {/* Credit Summary */}
                    <div className="rounded-2xl border border-border p-4 space-y-2 bg-gray-50 dark:bg-gray-800">
                        <div className="flex justify-between text-sm">
                            <span>{t('sms.credit.totalRecipients')}</span>
                            <span className="font-semibold">{recipients ? formatNumber(recipients) : '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span>{t('sms.credit.smsPerPerson')}</span>
                            <span className="font-semibold">{smsSegments || '-'}</span>
                        </div>
                        <div className="flex justify-between text-base font-semibold text-gray-900 dark:text-white">
                            <span>{t('sms.credit.totalCredits')}</span>
                            <span>{creditsNeeded ? formatNumber(creditsNeeded) : '-'}</span>
                        </div>
                        <p className={`text-xs ${creditEnough ? 'text-emerald-600' : 'text-destructive'}`}>
                            {creditEnough
                                ? t('sms.credit.creditSufficient')
                                : (t as (key: string, opts?: Record<string, unknown>) => string)('sms.credit.insufficientCredit', { count: formatNumber(Math.abs(creditDelta)) })}
                        </p>
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
            </div>

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
                        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
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

export default CampaignsPage;
