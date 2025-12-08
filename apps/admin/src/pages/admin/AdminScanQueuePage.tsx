import React, { useState } from 'react';
import {
    useGetScanQueue,
    useRetryScan
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

const AdminScanQueuePage: React.FC = () => {
    const [statusFilter, setStatusFilter] = useState('');

    const { data: queueData, isLoading, refetch } = useGetScanQueue(
        statusFilter ? { status: statusFilter } : undefined
    );
    const retryMutation = useRetryScan();

    const queueItems = (queueData as any)?.data || [];

    const handleRetry = async (id: string) => {
        try {
            await retryMutation.mutateAsync({ id });
            toast.success('İşlem tekrar kuyruğa alındı');
            refetch();
        } catch (error) {
            toast.error('Tekrar deneme başarısız');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" /> Tamamlandı</span>;
            case 'processing':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> İşleniyor</span>;
            case 'failed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" /> Hata</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"><Clock className="w-3 h-3 mr-1" /> Bekliyor</span>;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">3D Tarama Kuyruğu</h1>
                    <p className="text-gray-500">Kulak taraması işleme durumu ve yönetimi</p>
                </div>
                <div className="flex space-x-3">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                        <option value="">Tümü</option>
                        <option value="pending">Bekleyen</option>
                        <option value="processing">İşlenen</option>
                        <option value="completed">Tamamlanan</option>
                        <option value="failed">Hatalı</option>
                    </select>
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Yenile
                    </button>
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID / Tenant</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Öncelik</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Detaylar</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Süre</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Yükleniyor...</td>
                            </tr>
                        ) : queueItems.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Kuyrukta işlem yok</td>
                            </tr>
                        ) : (
                            queueItems.map((item: any) => (
                                <tr key={item.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{item.id}</div>
                                        <div className="text-xs text-gray-500 font-mono">{item.tenantId.substring(0, 8)}...</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(item.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`text-xs font-medium ${item.priority === 'high' ? 'text-red-600' :
                                            item.priority === 'low' ? 'text-gray-500' : 'text-blue-600'
                                            }`}>
                                            {item.priority.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">Polygon: {item.polygonCount || '-'}</div>
                                        {item.errorMessage && (
                                            <div className="text-xs text-red-600 mt-1 flex items-center">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                {item.errorMessage}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.renderTimeMs ? `${(item.renderTimeMs / 1000).toFixed(2)}s` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {item.status === 'failed' && (
                                            <button
                                                onClick={() => handleRetry(item.id)}
                                                className="text-primary-600 hover:text-primary-900 inline-flex items-center"
                                            >
                                                <Play className="w-4 h-4 mr-1" />
                                                Tekrar Dene
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminScanQueuePage;
