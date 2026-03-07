import React, { useState } from 'react';
import {
    useListAdminBirfaturaStats,
    useListAdminBirfaturaInvoices,
    useListAdminBirfaturaLogs
} from '@/lib/api-client';
import {
    FileText,
    ArrowUpRight,
    ArrowDownLeft,
    AlertTriangle,
    CheckCircle,
    Clock,
    RefreshCw,
    Search
} from 'lucide-react';
import Pagination from '../../components/ui/Pagination';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';

const AdminBirFaturaPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming' | 'logs'>('outgoing');
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');

    const { data: statsData } = useListAdminBirfaturaStats({});

    const { data: invoicesData, isLoading: invoicesLoading } = useListAdminBirfaturaInvoices({
        page,
        limit: 20,
        direction: activeTab === 'logs' ? undefined : activeTab,
        status: statusFilter || undefined
    }, { query: { enabled: activeTab !== 'logs' } });

    const { data: logsData, isLoading: logsLoading } = useListAdminBirfaturaLogs({
        page,
        limit: 20
    }, { query: { enabled: activeTab === 'logs' } });

    const stats = (statsData as any)?.data;
    const invoices = (invoicesData as any)?.invoices || (invoicesData as any)?.data?.invoices || [];
    const logs = (logsData as any)?.logs || (logsData as any)?.data?.logs || [];
    const pagination = activeTab === 'logs' ? ((logsData as any)?.pagination || (logsData as any)?.data?.pagination) : ((invoicesData as any)?.pagination || (invoicesData as any)?.data?.pagination);

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6 max-w-7xl mx-auto'}>
            <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-center'} mb-8`}>
                <div>
                    <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>E-Fatura / BirFatura Yönetimi</h1>
                    <p className="text-gray-500 dark:text-gray-400">Fatura entegrasyon durumu ve kuyruk yönetimi</p>
                </div>
                <div className="flex space-x-2">
                    <button className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg touch-feedback">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className={`grid gap-4 mb-8 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'}`}>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>Giden Faturalar</span>
                        <ArrowUpRight className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>{stats?.totalOutgoing || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {stats?.outgoing?.pending || 0} Bekleyen, {stats?.outgoing?.rejected || 0} Hatalı
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>Gelen Faturalar</span>
                        <ArrowDownLeft className="w-4 h-4 text-green-500" />
                    </div>
                    <div className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>{stats?.totalIncoming || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Son 7 gün
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>Hatalı İşlemler</span>
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <div className={`font-bold text-red-600 dark:text-red-400 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                        {(stats?.outgoing?.rejected || 0) + (stats?.outgoing?.error || 0)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Müdahale gerektirir
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-gray-500 dark:text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>Kuyruk Durumu</span>
                        <Clock className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className={`font-bold text-orange-600 dark:text-orange-400 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                        {stats?.outgoing?.draft || 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Gönderilmeyi bekleyen
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className={`border-b border-gray-200 dark:border-gray-700 ${isMobile ? 'px-4 py-3' : 'px-6 py-4'} flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between'}`}>
                    <div className={`flex ${isMobile ? 'w-full overflow-x-auto' : 'space-x-6'}`}>
                        <button
                            onClick={() => { setActiveTab('outgoing'); setPage(1); }}
                            className={`pb-4 -mb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-feedback ${activeTab === 'outgoing'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Giden Faturalar
                        </button>
                        <button
                            onClick={() => { setActiveTab('incoming'); setPage(1); }}
                            className={`pb-4 -mb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-feedback ${activeTab === 'incoming'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Gelen Faturalar
                        </button>
                        <button
                            onClick={() => { setActiveTab('logs'); setPage(1); }}
                            className={`pb-4 -mb-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap touch-feedback ${activeTab === 'logs'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Entegrasyon Logları
                        </button>
                    </div>

                    {activeTab !== 'logs' && (
                        <div className={`flex items-center ${isMobile ? 'w-full' : 'space-x-2'}`}>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={`text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500 ${isMobile ? 'w-full' : ''}`}
                            >
                                <option value="">Tüm Durumlar</option>
                                <option value="draft">Taslak</option>
                                <option value="pending">Bekliyor</option>
                                <option value="approved">Onaylandı</option>
                                <option value="rejected">Reddedildi</option>
                                <option value="error">Hatalı</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className={isMobile ? '' : 'overflow-x-auto'}>
                    {activeTab === 'logs' ? (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Tarih</th>
                                    <th className="px-6 py-3 font-medium">İşlem</th>
                                    <th className="px-6 py-3 font-medium">Kullanıcı</th>
                                    <th className="px-6 py-3 font-medium">Mesaj</th>
                                    <th className="px-6 py-3 font-medium">Detay</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {logsLoading ? (
                                    <tr><td colSpan={5} className="p-8 text-center">Yükleniyor...</td></tr>
                                ) : logs.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(log.createdAt).toLocaleString('tr-TR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900">{log.userName || 'Sistem'}</td>
                                        <td className="px-6 py-4 text-gray-600">{log.message}</td>
                                        <td className="px-6 py-4">
                                            <button className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                                Görüntüle
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Fatura No</th>
                                    <th className="px-6 py-3 font-medium">Tarih</th>
                                    <th className="px-6 py-3 font-medium">
                                        {activeTab === 'outgoing' ? 'Alıcı' : 'Gönderici'}
                                    </th>
                                    <th className="px-6 py-3 font-medium">Tutar</th>
                                    <th className="px-6 py-3 font-medium">Durum</th>
                                    <th className="px-6 py-3 font-medium">ETTN</th>
                                    <th className="px-6 py-3 font-medium">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {invoicesLoading ? (
                                    <tr><td colSpan={7} className="p-8 text-center">Yükleniyor...</td></tr>
                                ) : invoices.map((inv: any) => (
                                    <tr key={inv.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {inv.invoiceNumber || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-6 py-4 text-gray-700">
                                            {activeTab === 'outgoing'
                                                ? (inv.patientName || inv.receiverName || '-')
                                                : (inv.senderName || '-')}
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: inv.currency || 'TRY' }).format(inv.totalAmount || inv.devicePrice || 0)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(inv.edocumentStatus === 'approved' || inv.status === 'RECEIVED') ? 'bg-green-100 text-green-800' :
                                                (inv.edocumentStatus === 'rejected' || inv.status === 'error') ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {activeTab === 'outgoing' ? inv.edocumentStatus : inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono text-gray-500">
                                            {inv.ettn || inv.birfaturaUuid || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                                                Detay
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {pagination && (
                    <Pagination
                        currentPage={page}
                        totalPages={pagination.totalPages}
                        totalItems={pagination.total}
                        itemsPerPage={pagination.limit}
                        onPageChange={setPage}
                    />
                )}
            </div>
        </div>
    );
};

export default AdminBirFaturaPage;
