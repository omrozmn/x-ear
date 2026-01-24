import { useState, useEffect, useRef } from 'react';
import { MessageLoader2, CheckCircle, AlertCircle, X, FileText, Upload, Trash2, Eye, CreditCard, ExternalLink } from 'lucide-react';
import {
    useListSmConfig,
    useListSmHeaders,
    useListSmCredit,
    useCreateSmDocumentUpload,
    useDeleteSmDocument,
    useCreateSmDocumentSubmit,
    useCreateSmHeaders,
    getListSmConfigQueryKey,
    getListSmHeadersQueryKey,
    getListSmCreditQueryKey
} from '@/api/client/sms-integration.client';
// @ts-expect-error - Generated schema types may have import issues
import type { SMSHeaderRequestRead } from '@/api/generated/schemas';
import { Button, Input, Select, useToastHelpers } from '@x-ear/ui-web';
import * as Tabs from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuthStore } from '@/stores/authStore';
import { customInstance } from '@/api/orval-mutator';
import { PosSettings } from './PosSettings';

interface SmsDocument {
    type: string;
    filename: string;
    status: 'uploaded' | 'sent' | 'revision_requested' | 'approved';
    url?: string;
}

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
    const [previewDoc, setPreviewDoc] = useState<{ type: string; url: string; filename: string } | null>(null);
    const [showContractExample, setShowContractExample] = useState(false);
    const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { success: showSuccessToast, error: showErrorToast } = useToastHelpers();
    const uploadInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
    const { token } = useAuthStore();

    const { data: configData, isLoading: configLoading, refetch: refetchConfig } = useListSmConfig({ query: { queryKey: getListSmConfigQueryKey(), enabled: !!token } });
    const { data: creditData } = useListSmCredit({ query: { queryKey: getListSmCreditQueryKey(), enabled: !!token } });
    const { data: headersData, refetch: refetchHeaders } = useListSmHeaders({ query: { queryKey: getListSmHeadersQueryKey(), enabled: !!token } });

    const { mutateAsync: uploadDocument } = useCreateSmDocumentUpload();
    const { mutateAsync: deleteDocument } = useDeleteSmDocument();
    const { mutateAsync: submitDocuments } = useCreateSmDocumentSubmit();
    const { mutateAsync: requestHeader } = useCreateSmHeaders();

    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [uploadedDocs, setUploadedDocs] = useState<Array<{ type: string; status?: string; id?: string }>>([]);
    const [documentsSubmitted, setDocumentsSubmitted] = useState(false);
    const [allDocumentsApproved, setAllDocumentsApproved] = useState(false);
    const [newHeader, setNewHeader] = useState('');
    const [newHeaderType, setNewHeaderType] = useState('company_title');
    const [headerDocument, setHeaderDocument] = useState<File | null>(null);
    const headerDocInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (configData && configData.data) {
            const payload = configData.data;
            // documents is unknown[] in schema, cast to local SmsDocument type
            const docs = Array.isArray(payload.documents)
                ? (payload.documents as unknown as SmsDocument[])
                : [];
            setUploadedDocs(docs);
            setDocumentsSubmitted(payload.documentsSubmitted || false);
            setAllDocumentsApproved(payload.allDocumentsApproved || false);
        }
    }, [configData]);

    const allDocsUploaded = REQUIRED_DOCUMENTS.every(doc => uploadedDocs.some(d => d.type === doc.id));
    const hasRevisionRequested = uploadedDocs.some(d => d.status === 'revision_requested');
    const canUpload = (docType: string) => {
        if (!documentsSubmitted) return true;
        const doc = uploadedDocs.find(d => d.type === docType);
        return doc?.status === 'revision_requested';
    };

    const handleFileUpload = async (file: File, docType: string) => {
        if (!canUpload(docType)) return;
        setIsUploading(true);
        try {
            await uploadDocument({ data: { file }, params: { document_type: docType } });
            showSuccessToast('Belge yüklendi');
            refetchConfig();
        } catch (error: unknown) {
            const errorObj = error as { response?: { data?: { error?: { message?: string } | string } } };
            const errorData = errorObj?.response?.data?.error;
            let msg = 'Yükleme başarısız';
            if (typeof errorData === 'string') {
                msg = errorData;
            } else if (errorData && typeof errorData === 'object' && 'message' in errorData && typeof errorData.message === 'string') {
                msg = errorData.message;
            }
            showErrorToast(msg);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteDocument = async (docType: string) => {
        setDeleteConfirmDoc(null);
        setIsDeleting(true);
        try {
            await deleteDocument({ documentType: docType });
            showSuccessToast('Belge silindi');
            refetchConfig();
        } catch (error: unknown) {
            const errorObj = error as { response?: { data?: { error?: { message?: string } | string } } };
            const errorData = errorObj?.response?.data?.error;
            let msg = 'Silme başarısız';
            if (typeof errorData === 'string') {
                msg = errorData;
            } else if (errorData && typeof errorData === 'object' && 'message' in errorData && typeof errorData.message === 'string') {
                msg = errorData.message;
            }
            showErrorToast(msg);
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePreviewDocument = async (docType: string) => {
        const doc = uploadedDocs.find(d => d.type === docType);
        if (!doc) return;
        try {
            // Document download/preview endpoint
            const response = await customInstance<{ data: { url: string }, url?: string }>({
                url: `/api/sms/documents/${docType}/download`,
                method: 'GET'
            });

            const previewUrl = response?.data?.url || response?.url;
            const docFilename = (doc as { filename?: string }).filename || 'document';
            if (previewUrl) {
                setPreviewDoc({ type: docType, url: previewUrl, filename: docFilename });
            } else {
                showErrorToast('Önizleme URL\'i alınamadı');
            }
        } catch (error) {
            showErrorToast('Önizleme açılamadı');
        }
    };

    const handleSubmitDocuments = async () => {
        if (!allDocsUploaded) return;
        setIsSubmitting(true);
        try {
            // Submit documents (schema requires document_type, using 'all' as it triggers full submission)
            await submitDocuments({ data: { document_type: 'all' } });
            showSuccessToast('Belgeler gönderildi');
            setDocumentsSubmitted(true);
            refetchConfig();
        } catch (error: unknown) {
            const errorObj = error as { response?: { data?: { error?: { message?: string } | string } } };
            const errorData = errorObj?.response?.data?.error;
            let msg = 'Gönderim başarısız';
            if (typeof errorData === 'string') {
                msg = errorData;
            } else if (errorData && typeof errorData === 'object' && 'message' in errorData && typeof errorData.message === 'string') {
                msg = errorData.message;
            }
            showErrorToast(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestHeader = async () => {
        if (!newHeader) return showErrorToast('Başlık giriniz');
        if (newHeader.length > 11) return showErrorToast('Başlık en fazla 11 karakter olabilir');
        try {
            // Note: The generated API expects documents as strings (filenames).
            const documents: string[] = [];
            if (headerDocument) documents.push(headerDocument.name);

            await requestHeader({
                data: {
                    headerText: newHeader,
                    headerType: newHeaderType as 'company_title' | 'trademark' | 'domain' | 'other',
                    documents
                }
            });

            showSuccessToast('Başlık talebi oluşturuldu');
            setNewHeader('');
            setNewHeaderType('company_title');
            setHeaderDocument(null);
            if (headerDocInputRef.current) headerDocInputRef.current.value = '';
            refetchHeaders();
        } catch (error: unknown) {
            const errorObj = error as { response?: { data?: { error?: { message?: string } | string } } };
            const errorData = errorObj?.response?.data?.error;
            let msg = 'Talep oluşturulamadı';
            if (typeof errorData === 'string') {
                msg = errorData;
            } else if (errorData && typeof errorData === 'object' && 'message' in errorData && typeof errorData.message === 'string') {
                msg = errorData.message;
            }
            showErrorToast(msg);
        }
    };

    const getUploadedDoc = (docType: string) => uploadedDocs.find(d => d.type === docType);
    const getDocStatusBadge = (doc: { type: string; status?: string; id?: string } | undefined) => {
        if (!doc) return null;
        const status = doc.status || 'uploaded';
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            uploaded: { bg: 'bg-blue-100 dark:bg-blue-800', text: 'text-blue-800 dark:text-blue-100', label: 'Yüklendi' },
            sent: { bg: 'bg-yellow-100 dark:bg-yellow-800', text: 'text-yellow-800 dark:text-yellow-100', label: 'Gönderildi' },
            revision_requested: { bg: 'bg-orange-100 dark:bg-orange-800', text: 'text-orange-800 dark:text-orange-100', label: 'Revizyon İstendi' },
            approved: { bg: 'bg-green-100 dark:bg-green-800', text: 'text-green-800 dark:text-green-100', label: 'Onaylandı' }
        };
        const badge = badges[status] || badges.uploaded;
        return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>;
    };

    const headers = Array.isArray(headersData?.data)
        ? (headersData?.data as SMSHeaderRequestRead[])
        : [];

    const credit = creditData?.data /* as SmsCreditRead - inferred automatically if available */;

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Entegrasyonlar</h1>
                <p className="text-gray-500 dark:text-gray-400">Üçüncü parti servis entegrasyon ayarları</p>
            </div>
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                    <Tabs.Trigger value="sms" className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'sms' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" />SMS Entegrasyonu</div>
                    </Tabs.Trigger>
                    <Tabs.Trigger value="pos" className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'pos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <div className="flex items-center gap-2"><CreditCard className="w-4 h-4" />Online Ödeme (POS)</div>
                    </Tabs.Trigger>
                </Tabs.List>
                <Tabs.Content value="sms" className="space-y-6">
                    {configLoading ? (
                        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
                    ) : (
                        <>
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 px-6 py-4 rounded-xl border border-indigo-200 dark:border-indigo-800">
                                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Kalan SMS Kredisi</div>
                                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{credit?.balance?.toLocaleString() || '0'}</div>
                            </div>
                            {documentsSubmitted && !allDocumentsApproved && (
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                    <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                                        <CheckCircle className="w-5 h-5" />
                                        <p className="font-medium">Belgeleriniz gönderildi. SMS kullanımınız açıldığında bilgilendirileceksiniz.</p>
                                    </div>
                                </div>
                            )}
                            {hasRevisionRequested && (
                                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                                        <AlertCircle className="w-5 h-5" />
                                        <p className="font-medium">Bazı belgeler için revizyon istendi. Lütfen ilgili belgeleri tekrar yükleyin.</p>
                                    </div>
                                </div>
                            )}
                            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                                <div className="flex gap-4">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setSmsSubTab('docs')}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none transition-colors ${smsSubTab === 'docs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Başvuru Belgeleri
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => setSmsSubTab('headers')}
                                        disabled={!allDocumentsApproved}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 rounded-none transition-colors ${smsSubTab === 'headers' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                    >
                                        SMS Başlıkları {!allDocumentsApproved && <span className="ml-1 text-xs">(Kilitli)</span>}
                                    </Button>
                                </div>
                            </div>

                            {smsSubTab === 'docs' && (
                                <div className="space-y-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">SMS Başvuru Belgeleri</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">SMS hizmeti kullanabilmek için aşağıdaki belgeleri yüklemeniz gerekmektedir.</p>
                                        <div className="space-y-4">
                                            {REQUIRED_DOCUMENTS.map((doc) => {
                                                const uploaded = getUploadedDoc(doc.id);
                                                const canUploadThis = canUpload(doc.id);
                                                const isDisabled = documentsSubmitted && !canUploadThis;
                                                return (
                                                    <div key={doc.id} className={`flex items-center justify-between p-4 rounded-lg border ${uploaded ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'} ${isDisabled ? 'opacity-60' : ''}`}>
                                                        <div className="flex items-center gap-3">
                                                            <FileText className={`w-5 h-5 ${uploaded ? 'text-green-600' : 'text-gray-400'}`} />
                                                            <div>
                                                                <div className="font-medium text-gray-900 dark:text-white">{doc.label}</div>
                                                                {uploaded && (
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-xs text-gray-500">{(uploaded as { filename?: string }).filename || 'document'}</span>
                                                                        {getDocStatusBadge(uploaded)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {doc.hasExample && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setShowContractExample(true)}
                                                                    className="p-2 text-blue-600"
                                                                    title="Örnek Sözleşme"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            {uploaded && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handlePreviewDocument(doc.id)}
                                                                        className="p-2 text-gray-600"
                                                                        title="Önizle"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                    </Button>
                                                                    {canUploadThis && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => setDeleteConfirmDoc(doc.id)}
                                                                            className="p-2 text-red-600"
                                                                            disabled={isDeleting}
                                                                            title="Sil"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            )}
                                                            {!uploaded || canUploadThis ? (
                                                                <Button
                                                                    variant="primary"
                                                                    size="sm"
                                                                    disabled={isUploading || isDisabled}
                                                                    className="relative overflow-hidden"
                                                                >
                                                                    <Upload className="w-4 h-4 mr-2" />
                                                                    {uploaded ? 'Değiştir' : 'Yükle'}
                                                                    <input
                                                                        type="file"
                                                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                                                        accept=".pdf,.jpg,.jpeg,.png"
                                                                        disabled={isUploading || isDisabled}
                                                                        ref={(el) => { uploadInputsRef.current[doc.id] = el; }}
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) handleFileUpload(file, doc.id);
                                                                            e.target.value = '';
                                                                        }}
                                                                    />
                                                                </Button>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {allDocsUploaded && !documentsSubmitted && (
                                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                                <Button onClick={handleSubmitDocuments} disabled={isSubmitting} className="w-full">
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                                    Belgeleri Gönder
                                                </Button>
                                            </div>
                                        )}
                                        {documentsSubmitted && !hasRevisionRequested && (
                                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                                <Button disabled className="w-full bg-gray-400 cursor-not-allowed">
                                                    <CheckCircle className="w-4 h-4 mr-2" />Belgeler Gönderildi
                                                </Button>
                                            </div>
                                        )}
                                        {hasRevisionRequested && (
                                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                                <Button onClick={handleSubmitDocuments} disabled={isSubmitting} className="w-full">
                                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                                    Belgeleri Tekrar Gönder
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {smsSubTab === 'headers' && allDocumentsApproved && (
                                <div className="space-y-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">SMS Başlıkları</h3>
                                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Yeni Başlık Talebi</h4>
                                            <div className="flex gap-3">
                                                <Input
                                                    type="text"
                                                    value={newHeader}
                                                    onChange={(e) => setNewHeader(e.target.value)}
                                                    placeholder="Başlık (max 11 karakter)"
                                                    maxLength={11}
                                                    className="flex-1"
                                                />
                                                <Select
                                                    value={newHeaderType}
                                                    onChange={(e) => setNewHeaderType(e.target.value)}
                                                    options={HEADER_TYPES}
                                                    className="min-w-[200px]"
                                                />
                                                <Button onClick={handleRequestHeader}>Talep Oluştur</Button>
                                            </div>
                                            {newHeaderType !== 'company_title' && (
                                                <div className="mt-3">
                                                    <label className="text-sm text-gray-600 dark:text-gray-400">Destekleyici Belge</label>
                                                    <input type="file" ref={headerDocInputRef} onChange={(e) => setHeaderDocument(e.target.files?.[0] || null)} className="mt-1 block w-full text-sm" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            {headers.length === 0 ? (
                                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">Henüz SMS başlığı bulunmuyor.</p>
                                            ) : (
                                                headers.map((h) => (
                                                    <div key={h.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                                                        <div>
                                                            <div className="font-medium text-gray-900 dark:text-white">{h.headerText}</div>
                                                            <div className="text-xs text-gray-500">{HEADER_TYPES.find(t => t.value === h.headerType)?.label}</div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${h.status === 'approved' ? 'bg-green-100 text-green-800' : h.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                                {h.status === 'approved' ? 'Onaylandı' : h.status === 'rejected' ? 'Reddedildi' : 'Beklemede'}
                                                            </span>
                                                            {h.isDefault && <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs font-medium">Varsayılan</span>}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </Tabs.Content>
                <Tabs.Content value="pos"><PosSettings /></Tabs.Content>
            </Tabs.Root>

            <Dialog.Root open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-xl z-50 w-[90vw] max-w-4xl h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">Belge Önizleme: {previewDoc?.filename}</Dialog.Title>
                            <Dialog.Close asChild>
                                <Button variant="ghost" size="sm" className="p-2">
                                    <X className="w-5 h-5" />
                                </Button>
                            </Dialog.Close>
                        </div>
                        <div className="flex-1 p-4 overflow-auto">
                            {previewDoc?.url && <iframe src={previewDoc.url} className="w-full h-full border-0 rounded-lg" title="Document Preview" />}
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
            <Dialog.Root open={showContractExample} onOpenChange={setShowContractExample}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-xl z-50 w-[90vw] max-w-4xl h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">Örnek Sözleşme</Dialog.Title>
                            <Dialog.Close asChild>
                                <Button variant="ghost" size="sm" className="p-2">
                                    <X className="w-5 h-5" />
                                </Button>
                            </Dialog.Close>
                        </div>
                        <div className="flex-1 p-4 overflow-auto">
                            <iframe src="/vatansms_contract_example.pdf" className="w-full h-full border-0 rounded-lg" title="Contract Example" />
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
            <Dialog.Root open={!!deleteConfirmDoc} onOpenChange={() => setDeleteConfirmDoc(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-xl z-50 w-full max-w-md p-6">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Belgeyi Sil</Dialog.Title>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">Bu belgeyi silmek istediğinizden emin misiniz?</p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setDeleteConfirmDoc(null)}>İptal</Button>
                            <Button variant="danger" onClick={() => deleteConfirmDoc && handleDeleteDocument(deleteConfirmDoc)}>Sil</Button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
