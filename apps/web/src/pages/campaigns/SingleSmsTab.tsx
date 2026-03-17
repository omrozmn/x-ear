import React, { useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, Textarea, Input, useToastHelpers, Select } from '@x-ear/ui-web';
import {
    AlertTriangle,
    CheckCircle,
    CreditCard,
    Eye,
    Loader2,
    MessageSquare,
    Phone,
    Plus,
    Send,
    User,
    X
} from 'lucide-react';
import {
    useListSmHeaders,
    getListSmHeadersQueryKey,
    useCreateCommunicationMessageSendSms,
} from '@/api/client/sms.client';
import type { SmsHeaderRequestRead } from '@/api/generated/schemas';
import { useAuthStore } from '@/stores/authStore';
import { unwrapArray } from '@/utils/response-unwrap';

const SMS_SEGMENT_LENGTH = 155;

interface SingleSmsTabProps {
    creditBalance: number;
    creditLoading: boolean;
}

export const SingleSmsTab: React.FC<SingleSmsTabProps> = ({ creditBalance }) => {
    const { t } = useTranslation('campaigns');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [message, setMessage] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [selectedHeader, setSelectedHeader] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const { success: showSuccessToast, error: showErrorToast, warning: showWarningToast } = useToastHelpers();
    const { token } = useAuthStore();

    // Dynamic fields for SMS personalization
    const DYNAMIC_FIELDS = [
        { key: '{{AD}}', label: t('variables.patient_name'), description: t('variables.patient_name') },
        { key: '{{SOYAD}}', label: t('variables.patient_surname'), description: t('variables.patient_surname') },
        { key: '{{FIRMA_ADI}}', label: t('variables.companyName'), description: t('variables.companyName') },
        { key: '{{FIRMA_TELEFONU}}', label: t('variables.companyPhone'), description: t('variables.companyPhone') }
    ];

    // Get SMS headers for sender selection - only fetch if authenticated
    const { data: headersData, isLoading: headersLoading, isError: headersError } = useListSmHeaders(
        { query: { queryKey: getListSmHeadersQueryKey(), enabled: !!token } }
    );

    // Mutation for sending SMS
    const { mutateAsync: createCommunicationMessageSendSms } = useCreateCommunicationMessageSendSms();

    // Parse SMS headers and filter only approved ones
    const headersRaw = unwrapArray<SmsHeaderRequestRead>(headersData);
    const headers = headersRaw.filter(h => h.status === 'approved');

    // Set default header when headers are loaded
    React.useEffect(() => {
        if (headers.length > 0 && !selectedHeader) {
            const defaultHeader = headers.find(h => h.isDefault);
            if (defaultHeader) {
                setSelectedHeader(defaultHeader.id || defaultHeader.headerText || '');
            } else if (headers.length === 1) {
                // If only one header, select it automatically
                setSelectedHeader(headers[0].id || headers[0].headerText || '');
            }
        }
    }, [headers, selectedHeader]);

    const smsSegments = message.trim().length > 0
        ? Math.max(1, Math.ceil(message.length / SMS_SEGMENT_LENGTH))
        : 0;

    const creditsNeeded = smsSegments;
    const creditEnough = creditsNeeded === 0 ? true : creditBalance >= creditsNeeded;

    const formatNumber = (value: number) => value.toLocaleString('tr-TR');

    // Validate phone number (Turkish format)
    const isValidPhone = useMemo(() => {
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        return cleanPhone.length >= 10 && cleanPhone.length <= 12;
    }, [phoneNumber]);

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
        const name = recipientName || 'Ahmet';
        const nameParts = name.split(' ');
        const firstName = nameParts[0] || 'Ahmet';
        const lastName = nameParts.slice(1).join(' ') || 'Yilmaz';

        preview = preview
            .replace(/\{\{AD\}\}/g, firstName)
            .replace(/\{\{SOYAD\}\}/g, lastName)
            .replace(/\{\{FIRMA_ADI\}\}/g, 'X-Ear')
            .replace(/\{\{FIRMA_TELEFONU\}\}/g, '0850 XXX XX XX');

        return preview;
    }, [message, recipientName]);

    const handleSendSms = async () => {
        if (!isValidPhone) {
            showWarningToast(t('sms.single.invalidPhoneWarning'), t('sms.single.invalidPhoneWarningDesc'));
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

        setIsSending(true);
        try {
            await createCommunicationMessageSendSms({
                data: {
                    phoneNumber: phoneNumber,
                    message: message,
                    // Note: recipientName is used for preview but not sent to API as SendSMS schema does not include it
                    // Note: headerId is currently not supported in SendSMS schema
                }
            });

            showSuccessToast(t('sms.single.sentSuccess'), t('sms.single.sentSuccessDesc', { phone: phoneNumber }));

            // Reset form
            setPhoneNumber('');
            setRecipientName('');
            setMessage('');
        } catch (error) {
            console.error('SMS sending failed:', error);
            showErrorToast(t('sms.single.sendError'), t('sms.single.sendErrorDesc'));
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Row - Recipient Info & Credit Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recipient Card */}
                <Card className="p-6 space-y-5 lg:col-span-2 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Phone className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                        <div>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('sms.single.recipientInfo')}</p>
                            <p className="text-sm text-muted-foreground">{t('sms.single.recipientInfoDesc')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                                <Phone className="w-3 h-3" /> {t('sms.single.phoneRequired')}
                            </label>
                            <Input
                                type="tel"
                                placeholder="05XX XXX XX XX"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className={`w-full ${phoneNumber && !isValidPhone ? 'border-red-300 focus:border-red-500' : ''}`}
                            />
                            {phoneNumber && !isValidPhone && (
                                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    {t('sms.single.invalidPhone')}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-1">
                                <User className="w-3 h-3" /> {t('sms.single.recipientNameOptional')}
                            </label>
                            <Input
                                type="text"
                                placeholder={t('sms.single.recipientNamePlaceholder')}
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('sms.single.usedForDynamicFields')}
                            </p>
                        </div>

                        {headers.length > 0 && (
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                                    {t('sms.filters.senderHeader')}
                                </label>
                                <Select
                                    value={selectedHeader}
                                    onChange={(e) => setSelectedHeader(e.target.value)}
                                    options={headersLoading
                                        ? [{ value: '', label: t('sms.filters.headersLoading') }]
                                        : headersError
                                            ? [{ value: '', label: t('sms.filters.headerError') }]
                                            : [{ value: '', label: t('sms.filters.headerDefault') },
                                            ...headers.map((h) => ({
                                                value: h.id || h.headerText || '',
                                                label: h.headerText || ''
                                            }))]
                                    }
                                    fullWidth
                                    disabled={headersLoading}
                                />
                            </div>
                        )}
                    </div>
                </Card>

                {/* Credit Summary Card */}
                <Card className="p-6 space-y-4 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{t('sms.credit.summary')}</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('sms.credit.smsCount')}</span>
                            <span className="font-semibold dark:text-gray-200">{smsSegments || '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('sms.credit.requiredCredits')}</span>
                            <span className="font-semibold dark:text-gray-200">{creditsNeeded || '-'}</span>
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
                                {creditEnough ? t('sms.credit.creditSufficient') : t('sms.credit.creditInsufficient')}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Message Card - Full Width */}
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
                        placeholder={t('sms.message.singlePlaceholder')}
                    />
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            {t('sms.message.charsPerSms', { chars: message.length, sms: smsSegments })}
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
                    disabled={!creditEnough || !isValidPhone || smsSegments === 0 || isSending}
                    onClick={handleSendSms}
                >
                    {isSending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('sms.single.sendingText')}
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            {t('sms.single.sendSms')}
                        </>
                    )}
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
                                    {t('sms.single.recipientLabel')} {phoneNumber || '05XX XXX XX XX'}
                                    {recipientName && ` (${recipientName})`}
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

export default SingleSmsTab;
