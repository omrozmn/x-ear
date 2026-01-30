import { useState } from 'react';
import { Upload, Trash2, FileText, Eye, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';

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

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Örnek Belgeler</h1>
                <p className="text-gray-500">
                    Kullanıcılara gösterilecek örnek belgeleri yönetin
                </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                        <p className="font-medium mb-1">Dosya Yükleme Talimatları</p>
                        <p>
                            Örnek belgeleri yüklemek için dosyaları <code className="bg-yellow-100 px-1 rounded">x-ear/apps/web/public/documents/sms/</code> klasörüne manuel olarak yerleştirmeniz gerekmektedir.
                        </p>
                        <p className="mt-2">
                            Dosya adları aşağıdaki tabloda belirtilen isimlerle eşleşmelidir.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Belge
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Dosya Adı
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Açıklama
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Durum
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                İşlemler
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {EXAMPLE_DOCUMENTS.map((doc) => (
                            <ExampleDocumentRow
                                key={doc.id}
                                doc={doc}
                                uploadingDoc={uploadingDoc}
                                onUpload={handleFileUpload}
                                onPreview={handlePreview}
                                onDownload={handleDownload}
                            />
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Preview Modal */}
            {previewDoc && (
                <Dialog.Root open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[90]" />
                        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[90vh] w-[90vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-2xl focus:outline-none z-[100] flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b">
                                <Dialog.Title className="text-lg font-semibold text-gray-900">
                                    {previewDoc.label}
                                </Dialog.Title>
                                <Dialog.Close className="p-2 hover:bg-gray-100 rounded-lg">
                                    <XMarkIcon className="h-5 w-5" />
                                </Dialog.Close>
                            </div>
                            <div className="flex-1 p-4 overflow-auto">
                                <iframe
                                    src={previewDoc.path}
                                    className="w-full h-full border-0 rounded-lg min-h-[600px]"
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

interface ExampleDocumentRowProps {
    doc: ExampleDocument;
    uploadingDoc: string | null;
    onUpload: (file: File, doc: ExampleDocument) => void;
    onPreview: (doc: ExampleDocument) => void;
    onDownload: (doc: ExampleDocument) => void;
}

function ExampleDocumentRow({ doc, uploadingDoc, onUpload, onPreview, onDownload }: ExampleDocumentRowProps) {
    const [fileExists, setFileExists] = useState<boolean | null>(null);

    // Check if file exists on mount
    useState(() => {
        fetch(doc.path, { method: 'HEAD' })
            .then(response => setFileExists(response.ok))
            .catch(() => setFileExists(false));
    });

    return (
        <tr>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <div className="text-sm font-medium text-gray-900">{doc.label}</div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                    {doc.filename}
                </code>
            </td>
            <td className="px-6 py-4">
                <div className="text-sm text-gray-500">{doc.description}</div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                {fileExists === null ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Kontrol ediliyor...
                    </span>
                ) : fileExists ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        Mevcut
                    </span>
                ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                        Eksik
                    </span>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                    {fileExists && (
                        <>
                            <button
                                onClick={() => onPreview(doc)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Önizle"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onDownload(doc)}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="İndir"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </>
                    )}
                    <label className="cursor-pointer p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
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
            </td>
        </tr>
    );
}
