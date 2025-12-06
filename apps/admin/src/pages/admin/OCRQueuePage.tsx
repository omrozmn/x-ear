import React, { useState } from 'react';
import { useListOCRJobs } from '@/lib/api-client';
import {
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    ArrowPathIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';

const OCRQueuePage: React.FC = () => {
    const [statusFilter, setStatusFilter] = useState<string>('');
    const { data: jobsData, isLoading, refetch } = useListOCRJobs({ status: statusFilter || undefined });

    const jobs = (jobsData as any)?.data || [];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircleIcon className="w-4 h-4 mr-1" /> Tamamlandı</span>;
            case 'processing':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" /> İşleniyor</span>;
            case 'failed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircleIcon className="w-4 h-4 mr-1" /> Hata</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><ClockIcon className="w-4 h-4 mr-1" /> Bekliyor</span>;
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">OCR İşlem Kuyruğu</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        SGK ve belge işleme durumlarını takip edin
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2 text-gray-400 hover:text-gray-600"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                </button>
            </div>

            {/* Filters */}
            <div className="mb-6 flex space-x-2">
                <button onClick={() => setStatusFilter('')} className={`px-3 py-1 rounded-md text-sm ${statusFilter === '' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-700'}`}>Tümü</button>
                <button onClick={() => setStatusFilter('pending')} className={`px-3 py-1 rounded-md text-sm ${statusFilter === 'pending' ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-700'}`}>Bekleyen</button>
                <button onClick={() => setStatusFilter('processing')} className={`px-3 py-1 rounded-md text-sm ${statusFilter === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>İşlenen</button>
                <button onClick={() => setStatusFilter('completed')} className={`px-3 py-1 rounded-md text-sm ${statusFilter === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>Tamamlanan</button>
                <button onClick={() => setStatusFilter('failed')} className={`px-3 py-1 rounded-md text-sm ${statusFilter === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>Hatalı</button>
            </div>

            {/* List */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">Yükleniyor...</p>
                    </div>
                ) : jobs.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2">İşlem kaydı bulunamadı</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosya</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hasta</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detay</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {jobs.map((job: any) => (
                                <tr key={job.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(job.created_at).toLocaleString('tr-TR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 max-w-xs truncate" title={job.file_path}>
                                        {job.file_path.split('/').pop()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {job.document_type}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {job.patient_name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(job.status)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                        {job.error_message ? <span className="text-red-600">{job.error_message}</span> : 'Başarılı'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default OCRQueuePage;
