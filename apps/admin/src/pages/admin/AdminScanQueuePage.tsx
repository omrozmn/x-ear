import React, { useState } from 'react';
import {
    useListAdminScanQueue,
    useCreateAdminScanQueueRetry
} from '@/lib/api-client';
import {
    RefreshCw,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Play
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';

const AdminScanQueuePage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [statusFilter, setStatusFilter] = useState('');

    const { data: queueData, isLoading, refetch } = useListAdminScanQueue(
        statusFilter ? { status: statusFilter } : undefined
    );
    const retryMutation = useCreateAdminScanQueueRetry();

    const queueItems = (queueData as any)?.data || [];

    const handleRetry = async (id: string) => {
        try {
            await retryMutation.mutateAsync({ scanId: id });
            toast.success('İşlem tekrar kuyruğa alındı');
            refetch();
        } catch (error) {
            toast.error('Tekrar deneme başarısız');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Tamamlandı</span>;
            case 'processing':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> İşleniyor</span>;
            case 'failed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="w-3 h-3 mr-1" /> Hata</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"><Clock className="w-3 h-3 mr-1" /> Bekliyor</span>;
        }
    };

    const columns = [
        {
            key: 'id',
            header: 'ID / Tenant',
            render: (item: any) => (
                <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{item.id}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{item.tenantId.substring(0, 8)}...</div>
                </div>
            )
        },
        {
            key: 'status',
            header: 'Durum',
            render: (item: any) => getStatusBadge(item.status)
        },
        {
            key: 'priority',
            header: 'Öncelik',
            mobileHidden: true,
            render: (item: any) => (
                <span className={`text-xs font-medium ${
                    item.priority === 'high' ? 'text-red-600 dark:text-red-400' :
                    item.priority === 'low' ? 'text-gray-500 dark:text-gray-400' : 'text-blue-600 dark:text-blue-400'
                }`}>
                    {item.priority.toUpperCase()}
                </span>
            )
        },
        {
            key: 'details',
            header: 'Detaylar',
            mobileHidden: true,
            render: (item: any) => (
                <div>
                    <div className="text-sm text-gray-900 dark:text-white">Polygon: {item.polygonCount || '-'}</div>
                    {item.errorMessage && (
                        <div className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {item.errorMessage}
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'renderTimeMs',
            header: 'Süre',
            mobileHidden: true,
            render: (item: any) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {item.renderTimeMs ? `${(item.renderTimeMs / 1000).toFixed(2)}s` : '-'}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'İşlemler',
            render: (item: any) => (
                item.status === 'failed' ? (
                    <button
                        onClick={() => handleRetry(item.id)}
                        className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 inline-flex items-center touch-feedback"
                    >
                        <Play className="w-4 h-4 mr-1" />
                        {!isMobile && 'Tekrar Dene'}
                    </button>
                ) : null
            )
        }
    ];

    return (
        <div className={isMobile ? 'p-4 pb-safe max-w-7xl mx-auto' : 'p-6 max-w-7xl mx-auto'}>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                        3D Tarama Kuyruğu
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Kulak taraması işleme durumu ve yönetimi</p>
                </div>
                <div className="flex space-x-3">
                    {!isMobile && (
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="block rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">Tümü</option>
                            <option value="pending">Bekleyen</option>
                            <option value="processing">İşlenen</option>
                            <option value="completed">Tamamlanan</option>
                            <option value="failed">Hatalı</option>
                        </select>
                    )}
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 touch-feedback"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {!isMobile && 'Yenile'}
                    </button>
                </div>
            </div>

            {isMobile && (
                <div className="mb-4">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="">Tümü</option>
                        <option value="pending">Bekleyen</option>
                        <option value="processing">İşlenen</option>
                        <option value="completed">Tamamlanan</option>
                        <option value="failed">Hatalı</option>
                    </select>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Yükleniyor...</p>
                    </div>
                ) : (
                    <ResponsiveTable
                        data={queueItems}
                        columns={columns}
                        keyExtractor={(item: any) => item.id}
                        emptyMessage="Kuyrukta işlem yok"
                    />
                )}
            </div>
        </div>
    );
};

export default AdminScanQueuePage;
