import React, { useState } from 'react';
import {
    useListOcrJobs,
    type OcrJobRead,
    type ResponseEnvelopeListOcrJobRead,
} from '@/lib/api-client';
import { unwrapArray } from '@/lib/orval-response';
import {
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';

function getJobs(data: ResponseEnvelopeListOcrJobRead | undefined): OcrJobRead[] {
    return unwrapArray<OcrJobRead>(data);
}

const OCRQueuePage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const { data: jobsData, isLoading, refetch } = useListOcrJobs({ status: statusFilter || undefined });

    const jobs = getJobs(jobsData).filter((job) => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [job.filePath, job.documentType, job.patientName || '', job.status, job.errorMessage || '']
            .some((value) => (value || '').toLowerCase().includes(query));
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircleIcon className="w-4 h-4 mr-1" /> Tamamlandı</span>;
            case 'processing':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" /> İşleniyor</span>;
            case 'failed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircleIcon className="w-4 h-4 mr-1" /> Hata</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"><ClockIcon className="w-4 h-4 mr-1" /> Bekliyor</span>;
        }
    };

    const columns = [
        {
            key: 'created_at',
            header: 'Tarih',
            sortable: true,
            sortKey: 'createdAt',
            sortValue: (job: OcrJobRead) => job.createdAt || '',
            render: (job: OcrJobRead) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {job.createdAt ? new Date(job.createdAt).toLocaleString('tr-TR') : '-'}
                </span>
            )
        },
        {
            key: 'file_path',
            header: 'Dosya',
            sortable: true,
            sortKey: 'filePath',
            sortValue: (job: OcrJobRead) => job.filePath || '',
            render: (job: OcrJobRead) => (
                <span className="text-sm font-medium text-gray-900 dark:text-white truncate" title={job.filePath}>
                    {job.filePath.split('/').pop()}
                </span>
            )
        },
        {
            key: 'document_type',
            header: 'Tip',
            mobileHidden: true,
            sortable: true,
            sortKey: 'documentType',
            sortValue: (job: OcrJobRead) => job.documentType || '',
            render: (job: OcrJobRead) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">{job.documentType}</span>
            )
        },
        {
            key: 'patient_name',
            header: 'Hasta',
            mobileHidden: true,
            sortable: true,
            sortKey: 'patientName',
            sortValue: (job: OcrJobRead) => job.patientName || '',
            render: (job: OcrJobRead) => (
                <span className="text-sm text-gray-900 dark:text-white">{job.patientName || '-'}</span>
            )
        },
        {
            key: 'status',
            header: 'Durum',
            sortable: true,
            sortKey: 'status',
            sortValue: (job: OcrJobRead) => job.status || '',
            render: (job: OcrJobRead) => getStatusBadge(job.status)
        },
        {
            key: 'error_message',
            header: 'Detay',
            mobileHidden: true,
            render: (job: OcrJobRead) => (
                <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {job.errorMessage ? <span className="text-red-600 dark:text-red-400">{job.errorMessage}</span> : 'Başarılı'}
                </span>
            )
        }
    ];

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                        OCR İşlem Kuyruğu
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        SGK ve belge işleme durumlarını takip edin
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-feedback"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                </button>
            </div>

            {/* Filters */}
            <div className={`mb-6 flex ${isMobile ? 'flex-col space-y-2' : 'space-x-2 items-center'}`}>
                <div className="relative flex-1 max-w-md">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Dosya, hasta, tip veya hata ara..."
                        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white pl-10 pr-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                </div>
                <button onClick={() => setStatusFilter('')} className={`px-3 py-1 rounded-md text-sm touch-feedback ${statusFilter === '' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>Tümü</button>
                <button onClick={() => setStatusFilter('pending')} className={`px-3 py-1 rounded-md text-sm touch-feedback ${statusFilter === 'pending' ? 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>Bekleyen</button>
                <button onClick={() => setStatusFilter('processing')} className={`px-3 py-1 rounded-md text-sm touch-feedback ${statusFilter === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>İşlenen</button>
                <button onClick={() => setStatusFilter('completed')} className={`px-3 py-1 rounded-md text-sm touch-feedback ${statusFilter === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>Tamamlanan</button>
                <button onClick={() => setStatusFilter('failed')} className={`px-3 py-1 rounded-md text-sm touch-feedback ${statusFilter === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>Hatalı</button>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Yükleniyor...</p>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <p className="mt-2">İşlem kaydı bulunamadı</p>
                    </div>
                ) : (
                    <ResponsiveTable
                        data={jobs}
                        columns={columns}
                        keyExtractor={(job) => job.id}
                        emptyMessage="İşlem kaydı bulunamadı"
                    />
                )}
            </div>
        </div>
    );
};

export default OCRQueuePage;
