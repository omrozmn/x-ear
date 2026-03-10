import React, { useState } from 'react';
import { useListAdminInventory } from '@/lib/api-client';
import type { DeviceRead, ResponseEnvelopeListDeviceRead } from '@/api/generated/schemas';
import {
    CubeIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';
import { useAdminResponsive } from '@/hooks';
import { ResponsiveTable } from '@/components/responsive';
import Pagination from '@/components/ui/Pagination';
import { extractPagination, isRecord, unwrapArray } from '@/lib/orval-response';

interface PaginationInfo {
    total: number;
    totalPages: number;
}

interface AdminInventoryItem extends DeviceRead {
    tenantName?: string;
    serialNumberLeft?: string;
    serialNumberRight?: string;
}

function getInventoryItems(data: ResponseEnvelopeListDeviceRead | undefined): AdminInventoryItem[] {
    return unwrapArray<AdminInventoryItem>(data).filter((item): item is AdminInventoryItem => isRecord(item) && typeof item.id === 'string');
}

function getPagination(data: ResponseEnvelopeListDeviceRead | undefined): PaginationInfo | null {
    const pagination = extractPagination(data);
    if (!pagination) {
        return null;
    }

    return {
        total: pagination.total ?? 0,
        totalPages: pagination.totalPages ?? 1,
    };
}

const AdminInventoryPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    const { data: inventoryData, isLoading, refetch } = useListAdminInventory({
        page,
        limit,
        search,
        status: statusFilter || undefined,
        category: categoryFilter || undefined
    });

    const inventory = getInventoryItems(inventoryData);
    const pagination = getPagination(inventoryData);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'IN_STOCK':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Stokta</span>;
            case 'ASSIGNED':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Atandı</span>;
            case 'TRIAL':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Deneme</span>;
            case 'DEFECTIVE':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Arızalı</span>;
            case 'LOST':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Kayıp</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{status}</span>;
        }
    };

    const columns = [
        {
            key: 'device',
            header: 'Cihaz / Ürün',
            sortable: true,
            sortKey: 'brand',
            sortValue: (item: AdminInventoryItem) => `${item.brand || ''} ${item.model || ''} ${item.name || ''}`.trim(),
            render: (item: AdminInventoryItem) => (
                <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{item.brand} {item.model || ''}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{item.name} - {item.ear || '-'}</div>
                </div>
            )
        },
        {
            key: 'serialNumber',
            header: 'Seri No',
            sortable: true,
            sortValue: (item: AdminInventoryItem) => item.serialNumber || item.serialNumberLeft || item.serialNumberRight || '',
            render: (item: AdminInventoryItem) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {item.serialNumber || item.serialNumberLeft || item.serialNumberRight || '-'}
                </span>
            )
        },
        {
            key: 'category',
            header: 'Kategori',
            mobileHidden: true,
            sortable: true,
            sortValue: (item: AdminInventoryItem) => item.category || '',
            render: (item: AdminInventoryItem) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">{item.category || '-'}</span>
            )
        },
        {
            key: 'tenant',
            header: 'Şube / Tenant',
            mobileHidden: true,
            sortable: true,
            sortKey: 'tenantName',
            sortValue: (item: AdminInventoryItem) => item.tenantName || item.tenantId || '',
            render: (item: AdminInventoryItem) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">{item.tenantName || item.tenantId || '-'}</span>
            )
        },
        {
            key: 'status',
            header: 'Durum',
            sortable: true,
            sortValue: (item: AdminInventoryItem) => item.status || '',
            render: (item: AdminInventoryItem) => getStatusBadge(item.status || '-')
        }
    ];

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                        Global Cihaz & Stok Yönetimi
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Tüm abonelerdeki cihaz ve stokları görüntüleyin
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
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="relative rounded-xl shadow-sm max-w-md flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white pl-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Marka, Model veya Seri No ile ara..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <FunnelIcon className="h-5 w-5 text-gray-400" />
                    <select
                        value={categoryFilter}
                        onChange={(e) => {
                            setCategoryFilter(e.target.value);
                            setPage(1);
                        }}
                        className="block w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    >
                        <option value="">Tüm Kategoriler</option>
                        <option value="HEARING_AID">İşitme Cihazı</option>
                        <option value="BATTERY">Pil</option>
                        <option value="ACCESSORY">Aksesuar</option>
                        <option value="MAINTENANCE">Bakım</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className="block w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    >
                        <option value="">Tüm Durumlar</option>
                        <option value="IN_STOCK">Stokta</option>
                        <option value="ASSIGNED">Atandı</option>
                        <option value="TRIAL">Deneme</option>
                        <option value="DEFECTIVE">Arızalı</option>
                        <option value="LOST">Kayıp</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Yükleniyor...</p>
                    </div>
                ) : inventory.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                        <CubeIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <p className="mt-2">Kayıt bulunamadı</p>
                    </div>
                ) : (
                    <ResponsiveTable
                        data={inventory}
                        columns={columns}
                        keyExtractor={(item: AdminInventoryItem) => item.id}
                        emptyMessage="Kayıt bulunamadı"
                    />
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
                        <Pagination
                            currentPage={page}
                            totalPages={pagination.totalPages}
                            totalItems={pagination.total}
                            itemsPerPage={limit}
                            onPageChange={setPage}
                            onItemsPerPageChange={(nextLimit) => {
                                setLimit(nextLimit);
                                setPage(1);
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminInventoryPage;
