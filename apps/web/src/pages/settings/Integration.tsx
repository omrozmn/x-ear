import React, { useState, useEffect, useRef } from 'react';
import {
    MessageSquare,
    Loader2,
    CheckCircle,
    AlertCircle,
    Plus,
    X,
    FileText,
    ExternalLink,
    Upload,
    Download,
    Trash2,
    Eye,
    Info,
    CreditCard
} from 'lucide-react';
import {
    useSmsGetConfig,
    useSmsGetHeaders,
    useSmsIntegrationRequestSmsHeader,
  useSmsIntegrationGetSmsCredit,
    smsDownloadDocument,
    smsUploadDocument,
    smsDeleteDocument
} from '@/api/generated';
import { Button, Input, Select, useToastHelpers } from '@x-ear/ui-web';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuthStore } from '@/stores/authStore';

import { PosSettings } from './PosSettings';

const REQUIRED_DOCUMENTS = [
    { id: 'contract', label: 'Sözleşme', hasExample: true },
    { id: 'id_card', label: 'Kimlik Fotokopisi veya Resmi', hasExample: false },
    { id: 'residence', label: 'E-devlet İkametgah Belgesi (PDF)', hasExample: false },
    { id: 'tax_plate', label: 'Vergi Levhası', hasExample: false },
    { id: 'activity_cert', label: 'Faaliyet Belgesi (veya Oda Sicil, Ruhsat, Marka Sicil)', hasExample: false },
    { id: 'signature_circular', label: 'İmza Sirküleri / İmza Beyannamesi', hasExample: false }
];

const HEADER_TYPES = [
    { value: 'company_title', label: 'Firma Unvanı (belge gerektirmez)' },
    { value: 'trademark', label: 'Marka Tescili (belge gerekli)' },
    { value: 'domain', label: 'Alan Adı (belge gerekli)' },
    { value: 'other', label: 'Diğer (belge gerekli)' }
];

export default function IntegrationSettings() {
    const [activeTab, setActiveTab] = useState('sms');
    const [smsSubTab, setSmsSubTab] = useState('docs');
    const [previewDoc, setPreviewDoc] = useState<{ type: string, url: string, filename: string } | null>(null);
    const [showContractExample, setShowContractExample] = useState(false);
    const { success: showSuccessToast, error: showErrorToast, info: showInfoToast } = useToastHelpers();
    const uploadInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

    const releasePreviewUrl = () => {
        if (previewDoc?.url) {
            URL.revokeObjectURL(previewDoc.url);
        }
    };

    const closePreview = () => {
        releasePreviewUrl();
        setPreviewDoc(null);
    };

    const { token } = useAuthStore();
    const { data: configData, isLoading: configLoading, refetch: refetchConfig } = useSmsGetConfig({
        query: { enabled: !!token }
    });
    const { data: creditData } = useSmsIntegrationGetSmsCredit({
        query: { enabled: !!token }
    });
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);

    const { data: headersData, isLoading: headersLoading, refetch: refetchHeaders } = useSmsGetHeaders({
        query: { enabled: !!token }
    });
    const requestHeaderMutation = useSmsIntegrationRequestSmsHeader();
    const [newHeader, setNewHeader] = useState('');
    const [newHeaderType, setNewHeaderType] = useState('company_title');

    useEffect(() => {
        if (configData?.data) {
            const payload = configData.data as { documents?: unknown };
            const documents = Array.isArray(payload.documents) ? (payload.documents as any[]) : [];
            setUploadedDocs(documents);
        }
    }, [configData]);

    useEffect(() => {
        return () => {
            releasePreviewUrl();
        };
    }, [previewDoc]);

    const handleFileUpload = async (file: File, docType: string) => {
        setIsUploading(true);
        try {
            await smsUploadDocument({
                file,
                documentType: docType
            } as any);

            showSuccessToast('Belge yüklendi');
            refetchConfig();
        } catch (error: any) {
            const message = error?.response?.data?.error || 'Yükleme başarısız';
            showErrorToast(message);
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteDocument = async (docType: string) => {
        if (!confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) return;

        setIsDeleting(true);
        try {
            await smsDeleteDocument(docType as any);
            showSuccessToast('Belge silindi');
            refetchConfig();
        } catch (error: any) {
            const message = error?.response?.data?.error || 'Silme başarısız';
            showErrorToast(message);
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePreviewDocument = async (docType: string) => {
        const doc = getUploadedDoc(docType);
        if (!doc) return;

        try {
            releasePreviewUrl();
            const response = await smsDownloadDocument(docType);
            const blobUrl = URL.createObjectURL(response as any);
            setPreviewDoc({
                type: docType,
                url: blobUrl,
                filename: doc.filename
            });
        } catch (error) {
            showErrorToast('Önizleme açılamadı');
            console.error(error);
        }
    };

    const handleRequestHeader = async () => {
        if (!newHeader) return showErrorToast('Başlık giriniz');
        if (newHeader.length > 11) return showErrorToast('Başlık en fazla 11 karakter olabilir');

        try {
            await requestHeaderMutation.mutateAsync({
                data: {
                    headerText: newHeader,
                    headerType: newHeaderType
                } as any
            });
            showSuccessToast('Başlık talebi oluşturuldu. Yönetici onayı bekleniyor.');
            setNewHeader('');
            setNewHeaderType('company_title');
            refetchHeaders();
        } catch (error) {
            showErrorToast('Talep oluşturulamadı');
            console.error(error);
        }
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            pending: <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">Onay Bekliyor</span>,
            approved: <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Onaylandı</span>,
            rejected: <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Reddedildi</span>
        };
        return badges[status as keyof typeof badges] || status;
    };

    const isDocumentUploaded = (docType: string) => {
        return uploadedDocs.some(d => d.type === docType);
    };

    const getUploadedDoc = (docType: string) => {
        return uploadedDocs.find(d => d.type === docType);
    };

    const headers = Array.isArray((headersData as any)?.data) ? (headersData as any).data : ((headersData as any)?.data?.data || []);
    const credit = (creditData as any)?.data?.data;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Entegrasyonlar</h1>
                <p className="text-gray-500 dark:text-gray-400">Üçüncü parti servis entegrasyon ayarları</p>
            </div>

            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                    <Tabs.Trigger
                        value="sms"
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sms'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            SMS Entegrasyonu
                        </div>
                    </Tabs.Trigger>
                    <Tabs.Trigger
                        value="pos"
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pos'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4" />
                            Online Ödeme (POS)
                        </div>
                    </Tabs.Trigger>
                </Tabs.List>

                {/* SMS Tab Content */}
                <Tabs.Content value="sms" className="space-y-6">
                    {configLoading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                        </div>
                    ) : (
                        <>

                            {/* SMS Credit Card */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 px-6 py-4 rounded-xl border border-indigo-200 dark:border-indigo-800">
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Kalan SMS Kredisi</div>
                                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                                    {credit?.balance?.toLocaleString() || '0'}
                                </div>
                            </div>

                            {/* SMS Sub-Tabs */}
                            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setSmsSubTab('docs')}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${smsSubTab === 'docs'
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Başvuru Belgeleri
                                    </button>
                                    <button
                                        onClick={() => setSmsSubTab('headers')}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${smsSubTab === 'headers'
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        SMS Başlıkları
                                    </button>
                                </div>
                            </div>

                            {/* SMS Documents Sub-Tab */}
                            {smsSubTab === 'docs' && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-start gap-3 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-blue-800 dark:text-blue-200">
                                            <p className="font-medium mb-1">SMS Sağlayıcısı Başvuru Belgeleri</p>
                                            <p>Belgeleri yükledikten sonra yönetici onayı beklemelisiniz. Onay sonrası belgeler otomatik olarak SMS sağlayıcısına iletilecektir.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {REQUIRED_DOCUMENTS.map((doc) => {
                                            const uploaded = getUploadedDoc(doc.id);
                                            return (
                                                <div key={doc.id} className={`p-4 rounded-lg border ${uploaded ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'}`}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3 flex-1">
                                                            {uploaded ? (
                                                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                            ) : (
                                                                <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <div className="font-medium text-gray-900 dark:text-white">{doc.label}</div>
                                                                {uploaded ? (
                                                                    <div className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-2">
                                                                        <span className="truncate max-w-[200px]" title={uploaded.filename}>{uploaded.filename}</span>
                                                                        <span className="text-gray-400">({(uploaded.size / 1024).toFixed(1)} KB)</span>
                                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">Yüklendi</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="text-xs text-gray-500 mt-1">Henüz yüklenmedi</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            {doc.hasExample && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setShowContractExample(true)}
                                                                    title="Örnek sözleşmeyi görüntüle"
                                                                >
                                                                    <Info className="w-4 h-4 text-blue-500" />
                                                                </Button>
                                                            )}
                                                            {uploaded && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handlePreviewDocument(doc.id)}
                                                                        title="Belgeyi önizle"
                                                                    >
                                                                        <Eye className="w-4 h-4 text-indigo-500" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleDeleteDocument(doc.id)}
                                                                        disabled={isDeleting}
                                                                        title="Belgeyi sil"
                                                                    >
                                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                            <input
                                                                ref={(node) => {
                                                                    uploadInputsRef.current[doc.id] = node;
                                                                }}
                                                                type="file"
                                                                className="hidden"
                                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) handleFileUpload(file, doc.id);
                                                                    e.target.value = '';
                                                                }}
                                                                disabled={isUploading}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant={uploaded ? "outline" : "primary"}
                                                                size="sm"
                                                                disabled={isUploading}
                                                                onClick={() => uploadInputsRef.current[doc.id]?.click()}
                                                            >
                                                                {isUploading ? (
                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                ) : (
                                                                    <Upload className="w-4 h-4 mr-2" />
                                                                )}
                                                                {uploaded ? 'Tekrar Yükle' : 'Yükle'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {uploadedDocs.length === REQUIRED_DOCUMENTS.length && (
                                        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                                                <CheckCircle className="w-5 h-5" />
                                                <p className="font-medium">Tüm belgeler yüklendi! Yönetici onayı bekleniyor.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* SMS Headers Sub-Tab */}
                            {smsSubTab === 'headers' && (
                                <>
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Yeni SMS Başlığı Talebi</h3>

                                        <div className="flex items-start gap-3 mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                            <p className="text-xs text-amber-800 dark:text-amber-200">
                                                BTK sadece sahipliği kanıtlanmış başlık kullanımına izin vermektedir.
                                                Firma unvanı dışındaki başlıklar için belge yüklemeniz gerekir.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Başlık Metni
                                                </label>
                                                <Input
                                                    value={newHeader}
                                                    onChange={(e) => setNewHeader(e.target.value.toUpperCase().slice(0, 11))}
                                                    placeholder="MAX 11 KARAKTER"
                                                    maxLength={11}
                                                />
                                                <p className="text-xs text-gray-500 mt-1">{newHeader.length}/11 karakter</p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Başlık Tipi
                                                </label>
                                                <Select
                                                    value={newHeaderType}
                                                    onChange={(e) => setNewHeaderType(e.target.value)}
                                                    options={HEADER_TYPES}
                                                    fullWidth
                                                />
                                            </div>
                                        </div>

                                        <Button
                                            onClick={handleRequestHeader}
                                            disabled={requestHeaderMutation.isPending || !newHeader}
                                        >
                                            {requestHeaderMutation.isPending ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Gönderiliyor...</>
                                            ) : (
                                                <><Plus className="w-4 h-4 mr-2" /> Başlık Talebi Oluştur</>
                                            )}
                                        </Button>
                                    </div>

                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Mevcut Başlıklarınız</h3>

                                        {headersLoading ? (
                                            <div className="flex justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                            </div>
                                        ) : headers.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                Henüz başlık talebiniz bulunmamaktadır
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {headers.map((header: any) => (
                                                    <div key={header.id ?? header.name} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                                        <div className="flex items-center gap-4">
                                                            <div className="font-mono font-bold text-lg text-gray-900 dark:text-white">
                                                                {header.name || header.headerText}
                                                            </div>
                                                            {header.headerType && (
                                                                <div className="text-sm text-gray-500">
                                                                    ({HEADER_TYPES.find(t => t.value === header.headerType)?.label || header.headerType})
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {getStatusBadge(header.status || 'pending')}
                                                            {header.status === 'rejected' && header.rejectionReason && (
                                                                <button
                                                                    className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                                                                    onClick={() => showErrorToast(header.rejectionReason)}
                                                                >
                                                                    <AlertCircle className="w-3 h-3" />
                                                                    Red Nedeni
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </Tabs.Content>

                {/* POS Tab Content */}
                <Tabs.Content value="pos" className="space-y-6">
                    <PosSettings />
                </Tabs.Content>
            </Tabs.Root>

            {/* Document Preview Modal */}
            <Dialog.Root open={!!previewDoc} onOpenChange={(open) => !open && closePreview()}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[9999]" />
                    <Dialog.Content
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 w-[95vw] md:w-[90vw] h-[85vh] md:h-[90vh] max-w-6xl z-[10000] flex flex-col shadow-2xl"
                        aria-describedby={undefined}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <Dialog.Title className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white truncate pr-4">
                                Belge Önizleme: {previewDoc?.filename}
                            </Dialog.Title>
                            <button
                                onClick={closePreview}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <Dialog.Description className="sr-only">
                            Yüklenen belgenin önizlemesi
                        </Dialog.Description>
                        <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden min-h-0">
                            {previewDoc && (
                                <iframe
                                    src={previewDoc.url}
                                    className="w-full h-full"
                                    title="Document Preview"
                                />
                            )}
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Contract Example Modal */}
            <Dialog.Root open={showContractExample} onOpenChange={setShowContractExample}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/60 z-[9999]" />
                    <Dialog.Content
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 w-[95vw] md:w-[90vw] h-[85vh] md:h-[90vh] max-w-6xl z-[10000] flex flex-col shadow-2xl"
                        aria-describedby={undefined}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <Dialog.Title className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                                Örnek Sözleşme
                            </Dialog.Title>
                            <button
                                onClick={() => setShowContractExample(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <Dialog.Description className="sr-only">
                            VatanSMS örnek sözleşme belgesi
                        </Dialog.Description>
                        <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden min-h-0">
                            <iframe
                                src="/vatansms_contract_example.pdf"
                                className="w-full h-full"
                                title="Contract Example"
                            />
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
