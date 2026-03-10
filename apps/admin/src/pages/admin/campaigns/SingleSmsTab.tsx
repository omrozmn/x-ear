import React, { useRef, useState, useMemo } from 'react';
import { Button, Card, Textarea, Input } from '@x-ear/ui-web';
import toast from 'react-hot-toast';
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

const SMS_SEGMENT_LENGTH = 155;

// Dynamic fields for SMS personalization (tenant-focused)
const DYNAMIC_FIELDS = [
    { key: '{{ABONE_ADI}}', label: 'Abone Adı', description: 'Tenant adı' },
    { key: '{{TELEFON}}', label: 'Telefon', description: 'Tenant telefon numarası' },
    { key: '{{EMAIL}}', label: 'E-posta', description: 'Tenant e-posta adresi' },
    { key: '{{PAKET}}', label: 'Paket', description: 'Mevcut paket adı' }
];

interface SingleSmsTabProps {
    creditBalance: number;
    creditLoading: boolean;
}

export const SingleSmsTab: React.FC<SingleSmsTabProps> = ({ creditBalance }) => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [message, setMessage] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        const name = recipientName || 'Örnek Klinik';

        preview = preview
            .replace(/\{\{ABONE_ADI\}\}/g, name)
            .replace(/\{\{TELEFON\}\}/g, phoneNumber || '05XX XXX XX XX')
            .replace(/\{\{EMAIL\}\}/g, 'ornek@klinik.com')
            .replace(/\{\{PAKET\}\}/g, 'Pro Plan');

        return preview;
    }, [message, recipientName, phoneNumber]);

    const handleSendSms = async () => {
        if (!isValidPhone) {
            toast.error('Geçersiz telefon numarası. Lütfen geçerli bir telefon numarası girin.');
            return;
        }
        if (smsSegments === 0) {
            toast.error('Mesaj metni eksik. SMS gönderimi yapmadan önce bir mesaj yazmalısınız.');
            return;
        }
        if (!creditEnough) {
            toast.error('Yetersiz SMS kredisi. Lütfen kredi satın alın.');
            return;
        }

        setIsSending(true);
        try {
            // TODO: Implement admin SMS sending API
            await new Promise(resolve => setTimeout(resolve, 1000));

            toast.success(`SMS başarıyla gönderildi: ${phoneNumber}`);

            // Reset form
            setPhoneNumber('');
            setRecipientName('');
            setMessage('');
        } catch (error) {
            console.error('SMS sending failed:', error);
            toast.error('SMS gönderilemedi. Lütfen tekrar deneyin.');
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
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">Alıcı Bilgileri</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">SMS göndermek istediğiniz tenant'ın bilgilerini girin</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1 mb-1">
                                <Phone className="w-3 h-3" /> Telefon Numarası *
                            </label>
                            <Input
                                type="tel"
                                placeholder="05XX XXX XX XX"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className={`w-full ${phoneNumber && !isValidPhone ? 'border-red-300 focus:border-red-500' : ''}`}
                            />
                            {phoneNumber && !isValidPhone && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Geçerli bir telefon numarası girin
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1 mb-1">
                                <User className="w-3 h-3" /> Abone Adı (Opsiyonel)
                            </label>
                            <Input
                                type="text"
                                placeholder="Abone adı"
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                className="w-full"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Dinamik alanlar için kullanılır
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Credit Summary Card */}
                <Card className="p-6 space-y-4 dark:bg-gray-800 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">Kredi Özeti</p>
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">SMS Sayısı</span>
                            <span className="font-semibold dark:text-gray-200">{smsSegments || '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Gerekli Kredi</span>
                            <span className="font-semibold dark:text-gray-200">{creditsNeeded || '-'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Mevcut Kredi</span>
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formatNumber(creditBalance)}</span>
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl ${creditEnough ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
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

            {/* Message Card - Full Width */}
            <Card className="p-6 space-y-4 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                        <div>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">SMS Mesajı</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Göndermek istediğiniz mesajı yazın</p>
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
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Dinamik Alanlar</p>
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
                        placeholder="SMS mesajınızı buraya yazın...

Örnek: Sayın {{ABONE_ADI}}, X-Ear CRM sistemine hoş geldiniz. Sorularınız için bize ulaşabilirsiniz."
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
                    disabled={!creditEnough || !isValidPhone || smsSegments === 0 || isSending}
                    onClick={handleSendSms}
                >
                    {isSending ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Gönderiliyor...
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            SMS Gönder
                        </>
                    )}
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
                                className="p-1 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4">
                                <p className="text-xs text-gray-500 dark:text-gray-300 mb-2">
                                    Alıcı: {phoneNumber || '05XX XXX XX XX'}
                                    {recipientName && ` (${recipientName})`}
                                </p>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 shadow-sm border border-gray-200 dark:border-gray-600">
                                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{getPreviewMessage}</p>
                                </div>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                <p>Karakter sayısı: {getPreviewMessage.length}</p>
                                <p>SMS sayısı: {Math.max(1, Math.ceil(getPreviewMessage.length / SMS_SEGMENT_LENGTH))}</p>
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

export default SingleSmsTab;
