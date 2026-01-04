import { useState } from 'react';
import { CheckCircle, FileText, MessageSquare } from 'lucide-react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';
import toast from 'react-hot-toast';
import {
    useGetTenantSmsDocuments,
    useUpdateSmsDocumentStatus,
    useSendSmsDocumentsEmail
} from '@/lib/api-client';
import { adminApi } from '@/lib/apiMutator';

interface SmsDocumentsTabProps {
    tenantId: string;
    onUpdate: () => void;
}

const DOCUMENT_LABELS: Record<string, string> = {
    contract: 'Sözleşme',
    id_card: 'Kimlik Fotokopisi',
    residence: 'İkametgah Belgesi',
    tax_plate: 'Vergi Levhası',
    activity_cert: 'Faaliyet Belgesi',
    signature_circular: 'İmza Sirküleri'
};

export const SmsDocumentsTab = ({ tenantId, onUpdate }: SmsDocumentsTabProps) => {
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{ type: string; url: string; filename: string } | null>(null);

    const { data: documentsData, isLoading, refetch } = useGetTenantSmsDocuments(tenantId, {
        query: { enabled: !!tenantId }
    });

    const { mutateAsync: updateStatus } = useUpdateSmsDocumentStatus();
    const { mutateAsync: sendEmail } = useSendSmsDocumentsEmail();

    const documents = documentsData?.data?.documents || [];
    const documentsSubmitted = documentsData?.data?.documentsSubmitted || false;
    const allDocumentsApproved = documentsData?.data?.allDocumentsApproved || false;

    const handleApprove = async (docType: string) => {
        setActionLoading(docType);
        try {
            await updateStatus({
                id: tenantId,
                documentType: docType,
                data: { status: 'approved' }
            });
            toast.success('Belge onaylandı');
            await refetch();
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Onaylama başarısız');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRequestRevision = async (docType: string) => {
        const note = prompt('Revizyon notu (opsiyonel):');
        setActionLoading(docType);
        try {
            await updateStatus({
                id: tenantId,
                documentType: docType,
                data: { status: 'revision_requested', note: note || '' }
            });
            toast.success('Revizyon istendi');
            await refetch();
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'İşlem başarısız');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSendEmail = async () => {
        if (!window.confirm('Tüm belgeleri e-posta ile göndermek istediğinize emin misiniz?')) return;
        setActionLoading('send-email');
        try {
            await sendEmail({ id: tenantId });
            toast.success('E-posta gönderildi');
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'E-posta gönderilemedi');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePreview = (docType: string) => {
        const doc = documents.find((d: any) => d.type === docType) as any;
        if (!doc) return;

        // Admin uses different endpoint
        // Admin uses different endpoint
        adminApi<{ data: { url: string } }>({
            url: `/api/admin/tenants/${tenantId}/sms-documents/${docType}/download`,
            method: 'GET'
        })
            .then(data => {
                const previewUrl = (data as any)?.data?.url || (data as any)?.url;
                if (previewUrl) {
                    setPreviewDoc({ type: docType, url: previewUrl, filename: doc.filename || '' });
                } else {
                    toast.error('Önizleme URL\'i alınamadı');
                }
            })
            .catch((err) => {
                console.error('Preview error:', err);
                toast.error('Önizleme açılamadı');
            });
    };

    const getDocStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            uploaded: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Yüklendi' },
            sent: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Gönderildi' },
            revision_requested: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Revizyon İstendi' },
            approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Onaylandı' }
        };
        const badge = badges[status] || badges.uploaded;
        return <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>;
    };

    if (isLoading) {
        return <div className="p-6 text-center">Yükleniyor...</div>;
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-gray-500" />
                        SMS Başvuru Belgeleri
                    </h3>
                    {allDocumentsApproved && (
                        <button
                            onClick={handleSendEmail}
                            disabled={actionLoading === 'send-email'}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                            <FileText className="w-4 h-4 mr-1.5" />
                            {actionLoading === 'send-email' ? 'Gönderiliyor...' : 'Belgeleri E-posta ile Gönder'}
                        </button>
                    )}
                </div>

                {!documentsSubmitted ? (
                    <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>Henüz belge yüklenmemiş</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {documents.map((doc: any) => (
                            <div key={doc.type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">{DOCUMENT_LABELS[doc.type] || doc.type}</div>
                                    <div className="text-sm text-gray-500 mt-1">{doc.filename}</div>
                                    <div className="mt-2">{getDocStatusBadge(doc.status || 'uploaded')}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePreview(doc.type)}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        title="Önizle"
                                    >
                                        <FileText className="w-4 h-4" />
                                    </button>
                                    {doc.status !== 'approved' && (
                                        <button
                                            onClick={() => handleApprove(doc.type)}
                                            disabled={actionLoading === doc.type}
                                            className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded disabled:opacity-50"
                                        >
                                            {actionLoading === doc.type ? '...' : 'Onayla'}
                                        </button>
                                    )}
                                    {doc.status !== 'revision_requested' && (
                                        <button
                                            onClick={() => handleRequestRevision(doc.type)}
                                            disabled={actionLoading === doc.type}
                                            className="px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded disabled:opacity-50"
                                        >
                                            {actionLoading === doc.type ? '...' : 'Revizyon İste'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {allDocumentsApproved && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle className="w-5 h-5" />
                            <p className="font-medium">Tüm belgeler onaylandı. SMS Başlıkları sekmesi tenant için aktif.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewDoc && (
                <Dialog.Root open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[90]" />
                        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[90vh] w-[90vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-2xl focus:outline-none z-[100] flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b">
                                <Dialog.Title className="text-lg font-semibold text-gray-900">
                                    Belge Önizleme: {previewDoc.filename}
                                </Dialog.Title>
                                <Dialog.Close className="p-2 hover:bg-gray-100 rounded-lg">
                                    <XMarkIcon className="h-5 w-5" />
                                </Dialog.Close>
                            </div>
                            <div className="flex-1 p-4 overflow-auto">
                                <iframe src={previewDoc.url} className="w-full h-full border-0 rounded-lg min-h-[600px]" title="Document Preview" />
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            )}
        </div>
    );
};
