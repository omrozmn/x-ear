import React, { useState } from 'react';
import {
    useListAdminProductionOrders,
    useUpdateAdminProductionOrderStatus,
    type ListAdminProductionOrdersParams,
    type OrderStatusUpdate,
    type SchemasBaseResponseEnvelope,
} from '@/lib/api-client';
import { unwrapArray } from '@/lib/orval-response';
import {
    Truck,
    CheckCircle,
    Clock,
    Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';

interface ProductionOrderView {
    id: string;
    orderNumber: string;
    tenantId: string;
    productType: string;
    status: string;
    manufacturer?: string;
    estimatedDeliveryDate?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getOrders(data: SchemasBaseResponseEnvelope | undefined): ProductionOrderView[] {
    return unwrapArray<Record<string, unknown>>(data)
        .filter(isRecord)
        .map((order) => ({
            id: typeof order.id === 'string' ? order.id : '',
            orderNumber: typeof order.orderNumber === 'string' ? order.orderNumber : '-',
            tenantId: typeof order.tenantId === 'string' ? order.tenantId : '-',
            productType: typeof order.productType === 'string' ? order.productType : '-',
            status: typeof order.status === 'string' ? order.status : 'new',
            manufacturer: typeof order.manufacturer === 'string' ? order.manufacturer : undefined,
            estimatedDeliveryDate: typeof order.estimatedDeliveryDate === 'string' ? order.estimatedDeliveryDate : undefined,
        }))
        .filter((order) => order.id);
}

const AdminProductionPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const params: ListAdminProductionOrdersParams | undefined = statusFilter ? { status: statusFilter } : undefined;

    const { data: ordersData, isLoading, refetch } = useListAdminProductionOrders(params);
    const updateStatusMutation = useUpdateAdminProductionOrderStatus();

    const orders = getOrders(ordersData).filter((order) => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [order.orderNumber, order.tenantId, order.productType, order.manufacturer || '', order.status]
            .some((value) => (value || '').toLowerCase().includes(query));
    });

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            const payload: OrderStatusUpdate = { status: newStatus };
            await updateStatusMutation.mutateAsync({ orderId: id, data: payload });
            toast.success('Sipariş durumu güncellendi');
            refetch();
        } catch {
            toast.error('Güncelleme başarısız');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'delivered':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-3 h-3 mr-1" /> Teslim Edildi</span>;
            case 'shipped':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><Truck className="w-3 h-3 mr-1" /> Kargoda</span>;
            case 'quality_check':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"><CheckCircle className="w-3 h-3 mr-1" /> Kalite Kontrol</span>;
            case 'in_production':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><Clock className="w-3 h-3 mr-1" /> Üretimde</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Yeni Sipariş</span>;
        }
    };

    const columns = [
        {
            key: 'orderNumber',
            header: 'Sipariş No',
            sortable: true,
            sortKey: 'orderNumber',
            sortValue: (order: ProductionOrderView) => `${order.orderNumber} ${order.tenantId}`,
            render: (order: ProductionOrderView) => (
                <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{order.orderNumber}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{order.tenantId.substring(0, 8)}...</div>
                </div>
            )
        },
        {
            key: 'productType',
            header: 'Ürün Tipi',
            mobileHidden: true,
            sortable: true,
            sortKey: 'productType',
            sortValue: (order: ProductionOrderView) => order.productType,
            render: (order: ProductionOrderView) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    {order.productType === 'mold' ? 'Kulak Kalıbı' :
                        order.productType === 'filter' ? 'Filtre' : order.productType}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Durum',
            sortable: true,
            sortKey: 'status',
            sortValue: (order: ProductionOrderView) => order.status,
            render: (order: ProductionOrderView) => getStatusBadge(order.status)
        },
        {
            key: 'manufacturer',
            header: 'Üretici',
            mobileHidden: true,
            sortable: true,
            sortKey: 'manufacturer',
            sortValue: (order: ProductionOrderView) => order.manufacturer || '',
            render: (order: ProductionOrderView) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">{order.manufacturer || '-'}</span>
            )
        },
        {
            key: 'estimatedDeliveryDate',
            header: 'Tahmini Teslim',
            mobileHidden: true,
            sortable: true,
            sortKey: 'estimatedDeliveryDate',
            sortValue: (order: ProductionOrderView) => order.estimatedDeliveryDate || '',
            render: (order: ProductionOrderView) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString('tr-TR') : '-'}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'İşlemler',
            render: (order: ProductionOrderView) => (
                <select
                    value={order.status}
                    onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                    disabled={updateStatusMutation.isPending}
                    className="text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white touch-feedback"
                >
                    <option value="new">Yeni</option>
                    <option value="in_production">Üretimde</option>
                    <option value="quality_check">Kalite Kontrol</option>
                    <option value="shipped">Kargoda</option>
                    <option value="delivered">Teslim Edildi</option>
                </select>
            )
        }
    ];

    return (
        <div className={isMobile ? 'p-4 pb-safe max-w-7xl mx-auto' : 'p-6 max-w-7xl mx-auto'}>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                        Üretim Yönetimi
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Kulak kalıbı ve filtre üretim takibi</p>
                </div>
                {!isMobile && (
                    <div className="flex space-x-3">
                        <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Sipariş No Ara"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="block rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="">Tüm Durumlar</option>
                            <option value="new">Yeni</option>
                            <option value="in_production">Üretimde</option>
                            <option value="quality_check">Kalite Kontrol</option>
                            <option value="shipped">Kargoda</option>
                            <option value="delivered">Teslim Edildi</option>
                        </select>
                    </div>
                )}
            </div>

            {isMobile && (
                <div className="mb-4">
                    <div className="relative rounded-md shadow-sm mb-3">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Sipariş No Ara"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="">Tüm Durumlar</option>
                        <option value="new">Yeni</option>
                        <option value="in_production">Üretimde</option>
                        <option value="quality_check">Kalite Kontrol</option>
                        <option value="shipped">Kargoda</option>
                        <option value="delivered">Teslim Edildi</option>
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
                        data={orders}
                        columns={columns}
                        keyExtractor={(order) => order.id}
                        emptyMessage="Sipariş bulunamadı"
                    />
                )}
            </div>
        </div>
    );
};

export default AdminProductionPage;
