import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    DocumentIcon,
    ArrowUpTrayIcon,
    TrashIcon,
    ArrowDownTrayIcon,
    XMarkIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import {
    useListUploadFiles,
    useCreateUploadPresigned,
    useCreateOcrProcess,
    useDeleteUploadFiles,
    type DeleteUploadFilesParams,
    type OcrProcessResponseResult,
    type ResponseEnvelopeFileListResponse,
    type ResponseEnvelopeOcrProcessResponse,
    type ResponseEnvelopePresignedUploadResponse,
} from '@/lib/api-client';
import toast from 'react-hot-toast';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { unwrapData } from '@/lib/orval-response';
import Pagination from '@/components/ui/Pagination';

interface UploadedFile {
    key: string;
    filename: string;
    size: number;
    lastModified?: string;
    url: string;
}

interface OcrEntity {
    text: string;
}

interface OcrMedicalTerm {
    term: string;
}

interface OcrClassification {
    type?: string;
    confidence?: number;
}

interface OcrPatientInfo {
    name?: string;
}

interface OcrResultView extends OcrProcessResponseResult {
    entities?: OcrEntity[];
    patient_info?: OcrPatientInfo;
    classification?: OcrClassification;
    medical_terms?: OcrMedicalTerm[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getFiles(data: ResponseEnvelopeFileListResponse | undefined): UploadedFile[] {
    const payload = unwrapData<unknown>(data);
    const files = Array.isArray(payload)
        ? payload
        : isRecord(payload) && Array.isArray(payload.files)
            ? payload.files
            : isRecord(payload) && Array.isArray(payload.items)
                ? payload.items
                : [];
    if (!Array.isArray(files)) {
        return [];
    }

    return files
        .filter(isRecord)
        .map((file) => ({
            key: typeof file.key === 'string' ? file.key : '',
            filename: typeof file.filename === 'string' ? file.filename : '',
            size: typeof file.size === 'number' ? file.size : 0,
            lastModified: typeof file.last_modified === 'string' ? file.last_modified : undefined,
            url: typeof file.url === 'string' ? file.url : '',
        }))
        .filter((file) => file.key && file.url);
}

function getPresignedUpload(data: ResponseEnvelopePresignedUploadResponse): { url: string; fields: Record<string, string> } | null {
    const payload = unwrapData<Record<string, unknown>>(data);
    if (!payload) {
        return null;
    }

    return {
        url: typeof payload.url === 'string' ? payload.url : '',
        fields: Object.entries(isRecord(payload.fields) ? payload.fields : {}).reduce<Record<string, string>>((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
        }, {}),
    };
}

function getOcrResult(data: ResponseEnvelopeOcrProcessResponse): OcrResultView | null {
    const payload = unwrapData<Record<string, unknown>>(data);
    const result = isRecord(payload?.result) ? payload.result : payload;
    if (!isRecord(result)) {
        return null;
    }

    const entities = Array.isArray(result.entities)
        ? result.entities
            .filter(isRecord)
            .map((entity) => ({ text: typeof entity.text === 'string' ? entity.text : '' }))
            .filter((entity) => entity.text)
        : undefined;
    const patientInfo = isRecord(result.patient_info)
        ? { name: typeof result.patient_info.name === 'string' ? result.patient_info.name : undefined }
        : undefined;
    const classification = isRecord(result.classification)
        ? {
            type: typeof result.classification.type === 'string' ? result.classification.type : undefined,
            confidence: typeof result.classification.confidence === 'number' ? result.classification.confidence : undefined,
        }
        : undefined;
    const medicalTerms = Array.isArray(result.medical_terms)
        ? result.medical_terms
            .filter(isRecord)
            .map((term) => ({ term: typeof term.term === 'string' ? term.term : '' }))
            .filter((term) => term.term)
        : undefined;

    return {
        ...result,
        entities,
        patient_info: patientInfo,
        classification,
        medical_terms: medicalTerms,
    };
}

const FileManager: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [currentFolder, setCurrentFolder] = useState('uploads');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [selectedFileKeys, setSelectedFileKeys] = useState<string[]>([]);
    const [ocrResult, setOcrResult] = useState<OcrResultView | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // Fetch files
    const { data: filesData, isLoading } = useListUploadFiles({ folder: currentFolder });
    const files = getFiles(filesData);
    const filteredFiles = files.filter((file) => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [file.filename, file.key].some((value) => value.toLowerCase().includes(query));
    });
    const paginatedFiles = filteredFiles.slice((page - 1) * limit, page * limit);

    // Get presigned URL mutation
    const { mutateAsync: getPresignedUrl } = useCreateUploadPresigned();

    // OCR mutation
    const { mutateAsync: processOcr, isPending: isOcrPending } = useCreateOcrProcess();

    // Delete mutation
    const { mutateAsync: deleteFile } = useDeleteUploadFiles();

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
            const uploadData = getPresignedUpload(presignedData);
            if (!uploadData) {
                throw new Error('Presigned upload response is missing');
            }

            // 2. Upload to S3
            const formData = new FormData();
            // Add fields first (policy, signature, etc.)
            Object.entries(uploadData.fields).forEach(([key, value]) => {
                formData.append(key, value);
            });
            // Add file last
            formData.append('file', file);

            // Use fetch for presigned POST to S3 (avoid central API instance since this posts to external URL)
            await fetch(uploadData.url, {
                method: 'POST',
                body: formData
            });

            toast.success('Dosya yüklendi', { id: toastId });
            queryClient.invalidateQueries({ queryKey: ['/api/upload/files'] });
            setPage(1);
        } catch (error) {
            console.error(error);
            toast.error('Dosya yüklenemedi', { id: toastId });
        }
    };

    const handleOcr = async (fileUrl: string) => {
        const toastId = toast.loading('OCR analizi yapılıyor...');
        try {
            const response = await processOcr({
                data: {
                    imagePath: fileUrl,
                    autoCrop: true
                }
            });

            const data = getOcrResult(response);
            if (!data) {
                throw new Error('OCR response is missing result data');
            }

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
            const deleteParams: DeleteUploadFilesParams = { key };
            await deleteFile({ params: deleteParams });
            toast.success('Dosya silindi', { id: toastId });
            setSelectedFileKeys((prev) => prev.filter((item) => item !== key));
            queryClient.invalidateQueries({ queryKey: ['/api/upload/files'] });
        } catch (error) {
            console.error(error);
            toast.error('Dosya silinemedi', { id: toastId });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedFileKeys.length === 0) {
            toast.error('Secili dosya yok');
            return;
        }

        if (!window.confirm(`${selectedFileKeys.length} dosya silinsin mi?`)) {
            return;
        }

        const toastId = toast.loading('Secili dosyalar siliniyor...');
        try {
            await Promise.all(
                selectedFileKeys.map((key) => {
                    const deleteParams: DeleteUploadFilesParams = { key };
                    return deleteFile({ params: deleteParams });
                })
            );
            toast.success('Secili dosyalar silindi', { id: toastId });
            setSelectedFileKeys([]);
            queryClient.invalidateQueries({ queryKey: ['/api/upload/files'] });
        } catch (error) {
            console.error(error);
            toast.error('Toplu silme tamamlanamadi', { id: toastId });
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
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
            {/* OCR Result Modal */}
            {isModalOpen && ocrResult && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
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
                                        {ocrResult.entities?.map((entity) => entity.text).join('\n')}
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
                                                <p className="text-sm">{ocrResult.classification.type} (%{Math.round((ocrResult.classification.confidence ?? 0) * 100)})</p>
                                            </div>
                                        )}
                                        {ocrResult.medical_terms && ocrResult.medical_terms.length > 0 && (
                                            <div className="bg-green-50 p-3 rounded border border-green-100">
                                                <span className="text-xs font-bold text-green-700 uppercase">Tıbbi Terimler</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {ocrResult.medical_terms.map((term, idx) => (
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
                                className="px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>Dosya Yöneticisi</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Dosyalarınızı yönetin ve paylaşın
                    </p>
                </div>
                <div>
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 touch-feedback">
                        <ArrowUpTrayIcon className="-ml-1 mr-2 h-5 w-5" />
                        {!isMobile && 'Dosya Yükle'}
                        <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </label>
                </div>
            </div>

            {/* Folder Navigation (Simple for now) */}
            <div className={`mb-6 flex ${isMobile ? 'flex-col space-y-2' : 'space-x-2'}`}>
                <button
                    onClick={() => {
                        setCurrentFolder('uploads');
                        setPage(1);
                        setSelectedFileKeys([]);
                    }}
                    type="button"
                    className={`px-3 py-1 rounded-xl text-sm touch-feedback ${currentFolder === 'uploads' ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                    Genel
                </button>
                <button
                    onClick={() => {
                        setCurrentFolder('invoices');
                        setPage(1);
                        setSelectedFileKeys([]);
                    }}
                    type="button"
                    className={`px-3 py-1 rounded-xl text-sm touch-feedback ${currentFolder === 'invoices' ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                    Faturalar
                </button>
                <button
                    onClick={() => {
                        setCurrentFolder('documents');
                        setPage(1);
                        setSelectedFileKeys([]);
                    }}
                    type="button"
                    className={`px-3 py-1 rounded-xl text-sm touch-feedback ${currentFolder === 'documents' ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                >
                    Belgeler
                </button>
            </div>

            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="relative w-full max-w-md">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Dosya adi veya anahtar ara..."
                        className="block w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-primary-700">
                        {selectedFileKeys.length} dosya secildi
                    </span>
                    <button
                        type="button"
                        onClick={() => setSelectedFileKeys(paginatedFiles.map((file) => file.key))}
                        className="rounded-xl border border-primary-200 bg-white px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
                    >
                        Tumunu sec
                    </button>
                    <button
                        type="button"
                        onClick={() => setSelectedFileKeys([])}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        Secimi temizle
                    </button>
                    <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                    >
                        Secilenleri sil
                    </button>
                </div>
            </div>

            {/* File List */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Dosyalar yükleniyor...</p>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                        <DocumentIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <p className="mt-2">Bu klasörde dosya yok</p>
                    </div>
                ) : (
                    <>
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedFiles.map((file) => (
                            <li key={file.key} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedFileKeys.includes(file.key)}
                                        onChange={() => {
                                            setSelectedFileKeys((prev) => (
                                                prev.includes(file.key)
                                                    ? prev.filter((key) => key !== file.key)
                                                    : [...prev, file.key]
                                            ));
                                        }}
                                        className="mr-3 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <DocumentIcon className="h-8 w-8 text-gray-400 dark:text-gray-500 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{file.filename}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatSize(file.size)} • {file.lastModified ? new Date(file.lastModified).toLocaleDateString() : '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleOcr(file.url)}
                                        className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors touch-feedback"
                                        title="OCR Analizi"
                                        disabled={isOcrPending}
                                    >
                                        <span className="text-xs font-bold px-1">OCR</span>
                                    </button>
                                    <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 touch-feedback"
                                        title="İndir / Görüntüle"
                                    >
                                        <ArrowDownTrayIcon className="h-5 w-5" />
                                    </a>
                                    <button
                                        onClick={() => handleDelete(file.key)}
                                        className="p-2 text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors touch-feedback"
                                        title="Sil"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                        <Pagination
                            currentPage={page}
                            totalPages={Math.max(1, Math.ceil(filteredFiles.length / limit))}
                            totalItems={filteredFiles.length}
                            itemsPerPage={limit}
                            onPageChange={setPage}
                            onItemsPerPageChange={(nextLimit) => {
                                setLimit(nextLimit);
                                setPage(1);
                            }}
                        />
                    </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default FileManager;
