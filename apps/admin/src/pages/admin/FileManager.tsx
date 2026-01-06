import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    FolderIcon,
    DocumentIcon,
    ArrowUpTrayIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { useListFiles, useGetPresignedUploadUrl, useProcessDocumentOcr, useDeleteFile } from '@/lib/api-client';
import toast from 'react-hot-toast';

const FileManager: React.FC = () => {
    const [currentFolder, setCurrentFolder] = useState('uploads');
    const [ocrResult, setOcrResult] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // Fetch files
    const { data: filesData, isLoading } = useListFiles({ folder: currentFolder });
    // Accessing nested data structure based on the API response schema
    const files = (filesData as any)?.data?.files || [];

    // Get presigned URL mutation
    const { mutateAsync: getPresignedUrl } = useGetPresignedUploadUrl();

    // OCR mutation
    const { mutateAsync: processOcr, isPending: isOcrPending } = useProcessDocumentOcr();

    // Delete mutation
    const { mutateAsync: deleteFile } = useDeleteFile();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const toastId = toast.loading('Dosya yükleniyor...');

        try {
            // 1. Get presigned URL
            const presignedData = await getPresignedUrl({
                data: {
                    filename: file.name,
                    folder: currentFolder,
                    content_type: file.type
                }
            });

            // Accessing nested data structure
            // The response structure is: response.data.data.url / fields
            const { url, fields } = ((presignedData as any).data as any).data;

            // 2. Upload to S3
            const formData = new FormData();
            // Add fields first (policy, signature, etc.)
            if (fields) {
                Object.entries(fields).forEach(([key, value]) => {
                    formData.append(key, value as string);
                });
            }
            // Add file last
            formData.append('file', file);

            // Use fetch for presigned POST to S3 (avoid central API instance since this posts to external URL)
            await fetch(url, {
                method: 'POST',
                body: formData
            });

            toast.success('Dosya yüklendi', { id: toastId });
            queryClient.invalidateQueries({ queryKey: ['/api/upload/files'] });
        } catch (error) {
            console.error(error);
            toast.error('Dosya yüklenemedi', { id: toastId });
        }
    };

    const handleOcr = async (fileUrl: string) => {
        const toastId = toast.loading('OCR analizi yapılıyor...');
        try {
            const result = await processOcr({
                data: {
                    image_path: fileUrl,
                    auto_crop: true
                }
            });

            // Handle both axios response and direct data response
            const responseData = result as any;
            const data = responseData.data?.result || responseData.result;

            setOcrResult(data);
            setIsModalOpen(true);
            toast.success('OCR tamamlandı', { id: toastId });
        } catch (error) {
            console.error(error);
            toast.error('OCR hatası', { id: toastId });
        }
    };

    const handleDelete = async (key: string) => {
        if (!window.confirm('Bu dosyayı silmek istediğinize emin misiniz?')) return;

        const toastId = toast.loading('Dosya siliniyor...');
        try {
            await deleteFile({ key } as any);
            toast.success('Dosya silindi', { id: toastId });
            queryClient.invalidateQueries({ queryKey: ['/api/upload/files'] });
        } catch (error) {
            console.error(error);
            toast.error('Dosya silinemedi', { id: toastId });
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="p-6 relative">
            {/* OCR Result Modal */}
            {isModalOpen && ocrResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-medium">OCR Sonuçları</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium mb-2">Çıkarılan Metin</h4>
                                    <div className="bg-gray-50 p-3 rounded text-sm font-mono whitespace-pre-wrap h-64 overflow-y-auto border">
                                        {ocrResult.entities?.map((e: any) => e.text).join('\n')}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-2">Analiz</h4>
                                    <div className="space-y-4">
                                        {ocrResult.patient_info && (
                                            <div className="bg-blue-50 p-3 rounded border border-blue-100">
                                                <span className="text-xs font-bold text-blue-700 uppercase">Hasta Bilgisi</span>
                                                <p className="text-sm">{ocrResult.patient_info.name}</p>
                                            </div>
                                        )}
                                        {ocrResult.classification && (
                                            <div className="bg-purple-50 p-3 rounded border border-purple-100">
                                                <span className="text-xs font-bold text-purple-700 uppercase">Belge Tipi</span>
                                                <p className="text-sm">{ocrResult.classification.type} (%{Math.round(ocrResult.classification.confidence * 100)})</p>
                                            </div>
                                        )}
                                        {ocrResult.medical_terms && ocrResult.medical_terms.length > 0 && (
                                            <div className="bg-green-50 p-3 rounded border border-green-100">
                                                <span className="text-xs font-bold text-green-700 uppercase">Tıbbi Terimler</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {ocrResult.medical_terms.map((term: any, idx: number) => (
                                                        <span key={idx} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                                            {term.term}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4">
                                <h4 className="font-medium mb-2">Ham JSON</h4>
                                <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
                                    {JSON.stringify(ocrResult, null, 2)}
                                </pre>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dosya Yöneticisi</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Dosyalarınızı yönetin ve paylaşın
                    </p>
                </div>
                <div>
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                        <ArrowUpTrayIcon className="-ml-1 mr-2 h-5 w-5" />
                        Dosya Yükle
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </label>
                </div>
            </div>

            {/* Folder Navigation (Simple for now) */}
            <div className="mb-6 flex space-x-2">
                <button
                    onClick={() => setCurrentFolder('uploads')}
                    className={`px-3 py-1 rounded-md text-sm ${currentFolder === 'uploads' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'}`}
                >
                    Genel
                </button>
                <button
                    onClick={() => setCurrentFolder('invoices')}
                    className={`px-3 py-1 rounded-md text-sm ${currentFolder === 'invoices' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'}`}
                >
                    Faturalar
                </button>
                <button
                    onClick={() => setCurrentFolder('documents')}
                    className={`px-3 py-1 rounded-md text-sm ${currentFolder === 'documents' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'}`}
                >
                    Belgeler
                </button>
            </div>

            {/* File List */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">Dosyalar yükleniyor...</p>
                    </div>
                ) : files.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2">Bu klasörde dosya yok</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {files.map((file: any) => (
                            <li key={file.key} className="px-6 py-4 hover:bg-gray-50 flex items-center justify-between">
                                <div className="flex items-center">
                                    <DocumentIcon className="h-8 w-8 text-gray-400 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{file.filename}</p>
                                        <p className="text-xs text-gray-500">
                                            {formatSize(file.size)} • {new Date(file.last_modified).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleOcr(file.url)}
                                        className="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                                        title="OCR Analizi"
                                        disabled={isOcrPending}
                                    >
                                        <span className="text-xs font-bold px-1">OCR</span>
                                    </button>
                                    <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-gray-400 hover:text-gray-600"
                                        title="İndir / Görüntüle"
                                    >
                                        <ArrowDownTrayIcon className="h-5 w-5" />
                                    </a>
                                    <button
                                        onClick={() => handleDelete(file.key)}
                                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        title="Sil"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default FileManager;
