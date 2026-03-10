import React, { useState } from 'react';
import { Upload, FileText, Eye, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';

interface ExampleDocument {
    id: string;
    label: string;
    filename: string;
    path: string;
    description: string;
}

const EXAMPLE_DOCUMENTS: ExampleDocument[] = [
    {
        id: 'contract-example',
        label: 'Boş Sözleşme Şablonu',
        filename: 'contract-example.pdf',
        path: '/documents/sms/contract-example.pdf',
        description: 'Kullanıcıların dolduracağı boş sözleşme şablonu'
    },
    {
        id: 'contract-filled',
        label: 'Dolu Sözleşme Örneği',
        filename: 'contract-filled.pdf',
        path: '/documents/sms/contract-filled.pdf',
        description: 'Nasıl doldurulacağını gösteren örnek sözleşme'
    },
    {
        id: 'id-card-example',
        label: 'Kimlik Fotokopisi Örneği',
        filename: 'id-card-example.jpg',
        path: '/documents/sms/id-card-example.jpg',
        description: 'Kimlik fotokopisi nasıl olmalı örneği'
    },
    {
        id: 'residence-example',
        label: 'İkametgah Belgesi Örneği',
        filename: 'residence-example.pdf',
        path: '/documents/sms/residence-example.pdf',
        description: 'E-devlet ikametgah belgesi örneği'
    },
    {
        id: 'tax-plate-example',
        label: 'Vergi Levhası Örneği',
        filename: 'tax-plate-example.pdf',
        path: '/documents/sms/tax-plate-example.pdf',
        description: 'Vergi levhası belgesi örneği'
    },
    {
        id: 'activity-cert-example',
        label: 'Faaliyet Belgesi Örneği',
        filename: 'activity-cert-example.pdf',
        path: '/documents/sms/activity-cert-example.pdf',
        description: 'Faaliyet belgesi örneği'
    },
    {
        id: 'signature-example',
        label: 'İmza Sirküleri Örneği',
        filename: 'signature-example.pdf',
        path: '/documents/sms/signature-example.pdf',
        description: 'İmza sirküleri belgesi örneği'
    }
];

export default function ExampleDocuments() {
    const { isMobile } = useAdminResponsive();
    const [previewDoc, setPreviewDoc] = useState<ExampleDocument | null>(null);
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

    const checkFileExists = async (path: string): Promise<boolean> => {
        try {
            const response = await fetch(path, { method: 'HEAD' });
            return response.ok;
        } catch {
            return false;
        }
    };

    const handleFileUpload = async (file: File, doc: ExampleDocument) => {
        setUploadingDoc(doc.id);
        
        try {
            // In a real implementation, this would upload to the server
            // For now, we'll show instructions to manually place the file
            toast.success(
                `Dosyayı şu konuma yerleştirin: x-ear/apps/web/public${doc.path}`,
                { duration: 8000 }
            );
            
            // TODO: Implement actual file upload to server
            // This would require a backend endpoint to handle public document uploads
            
        } catch (error) {
            toast.error('Yükleme başarısız');
        } finally {
            setUploadingDoc(null);
        }
    };

    const handlePreview = async (doc: ExampleDocument) => {
        const exists = await checkFileExists(doc.path);
        if (!exists) {
            toast.error('Dosya bulunamadı. Lütfen önce dosyayı yükleyin.');
            return;
        }
        setPreviewDoc(doc);
    };

    const handleDownload = async (doc: ExampleDocument) => {
        const exists = await checkFileExists(doc.path);
        if (!exists) {
            toast.error('Dosya bulunamadı');
            return;
        }
        
        // Open in new tab for download
        window.open(doc.path, '_blank');
    };

    const columns = [
        {
            key: 'label',
            header: 'Belge',
            render: (doc: ExampleDocument) => (
                <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-3" />
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{doc.label}</div>
                </div>
            )
        },
        {
            key: 'filename',
            header: 'Dosya Adı',
            mobileHidden: true,
            render: (doc: ExampleDocument) => (
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                    {doc.filename}
                </code>
            )
        },
        {
            key: 'description',
            header: 'Açıklama',
            mobileHidden: true,
            render: (doc: ExampleDocument) => (
                <div className="text-sm text-gray-500 dark:text-gray-400">{doc.description}</div>
            )
        },
        {
            key: 'status',
            header: 'Durum',
            render: (doc: ExampleDocument) => <ExampleDocumentStatus doc={doc} />
        },
        {
            key: 'actions',
            header: 'İşlemler',
            render: (doc: ExampleDocument) => (
                <ExampleDocumentActions
                    doc={doc}
                    uploadingDoc={uploadingDoc}
                    onUpload={handleFileUpload}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                />
            )
        }
    ];

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6 max-w-6xl mx-auto'}>
            <div className="mb-6">
                <h1 className={`font-bold text-gray-900 dark:text-white mb-2 ${isMobile ? 'text-xl' : 'text-2xl'}`}>Örnek Belgeler</h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Kullanıcılara gösterilecek örnek belgeleri yönetin
                </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                        <p className="font-medium mb-1">Dosya Yükleme Talimatları</p>
                        <p>
                            Örnek belgeleri yüklemek için dosyaları <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">x-ear/apps/web/public/documents/sms/</code> klasörüne manuel olarak yerleştirmeniz gerekmektedir.
                        </p>
                        {!isMobile && (
                            <p className="mt-2">
                                Dosya adları aşağıdaki tabloda belirtilen isimlerle eşleşmelidir.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <ResponsiveTable
                    data={EXAMPLE_DOCUMENTS}
                    columns={columns}
                    keyExtractor={(doc) => doc.id}
                    emptyMessage="Örnek belge bulunamadı."
                />
            </div>

            {/* Preview Modal */}
            {previewDoc && (
                <Dialog.Root open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[90]" />
                        <Dialog.Content className={`fixed ${isMobile ? 'inset-0' : 'left-[50%] top-[50%] max-h-[90vh] w-[90vw] max-w-4xl translate-x-[-50%] translate-y-[-50%]'} rounded-2xl bg-white dark:bg-gray-800 shadow-2xl focus:outline-none z-[100] flex flex-col`}>
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                                <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {previewDoc.label}
                                </Dialog.Title>
                                <Dialog.Close className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl touch-feedback">
                                    <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                </Dialog.Close>
                            </div>
                            <div className="flex-1 p-4 overflow-auto">
                                <iframe
                                    src={previewDoc.path}
                                    className={`w-full h-full border-0 rounded-2xl ${isMobile ? 'min-h-[calc(100vh-120px)]' : 'min-h-[600px]'}`}
                                    title="Document Preview"
                                />
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            )}
        </div>
    );
}

// Status component
function ExampleDocumentStatus({ doc }: { doc: ExampleDocument }) {
    const [fileExists, setFileExists] = useState<boolean | null>(null);

    React.useEffect(() => {
        fetch(doc.path, { method: 'HEAD' })
            .then(response => setFileExists(response.ok))
            .catch(() => setFileExists(false));
    }, [doc.path]);

    if (fileExists === null) {
        return (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                Kontrol ediliyor...
            </span>
        );
    }
    
    return fileExists ? (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            Mevcut
        </span>
    ) : (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
            Eksik
        </span>
    );
}

// Actions component
function ExampleDocumentActions({ doc, uploadingDoc, onUpload, onPreview, onDownload }: {
    doc: ExampleDocument;
    uploadingDoc: string | null;
    onUpload: (file: File, doc: ExampleDocument) => void;
    onPreview: (doc: ExampleDocument) => void;
    onDownload: (doc: ExampleDocument) => void;
}) {
    const [fileExists, setFileExists] = useState<boolean | null>(null);

    React.useEffect(() => {
        fetch(doc.path, { method: 'HEAD' })
            .then(response => setFileExists(response.ok))
            .catch(() => setFileExists(false));
    }, [doc.path]);

    return (
        <div className="flex items-center justify-end gap-2">
            {fileExists && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); onPreview(doc); }}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-2xl transition-colors touch-feedback"
                        title="Önizle"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDownload(doc); }}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors touch-feedback"
                        title="İndir"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                </>
            )}
            <label className="cursor-pointer p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-2xl transition-colors touch-feedback">
                <Upload className="w-4 h-4" />
                <input
                    type="file"
                    className="hidden"
                    accept={doc.filename.endsWith('.pdf') ? '.pdf' : '.jpg,.jpeg,.png'}
                    disabled={uploadingDoc === doc.id}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUpload(file, doc);
                        e.target.value = '';
                    }}
                />
            </label>
        </div>
    );
}
