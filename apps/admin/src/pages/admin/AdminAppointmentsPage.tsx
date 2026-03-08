import React, { useState } from 'react';
import { useListAdminAppointments } from '@/lib/api-client';
import type { AppointmentListResponse, AppointmentRead } from '@/api/generated/schemas';
import {
    CalendarIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';
import { useAdminResponsive } from '@/hooks';
import { ResponsiveTable } from '@/components/responsive';

interface PaginationInfo {
    total: number;
    totalPages: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getAppointments(data: AppointmentListResponse | undefined): AppointmentRead[] {
    const responseData = data?.data;
    if (!isRecord(responseData) || !Array.isArray(responseData.appointments)) {
        return [];
    }

    return responseData.appointments.filter((appointment): appointment is AppointmentRead => isRecord(appointment) && typeof appointment.id === 'string');
}

function getPagination(data: AppointmentListResponse | undefined): PaginationInfo | null {
    const responseData = data?.data;
    if (!isRecord(responseData) || !isRecord(responseData.pagination)) {
        return null;
    }

    return {
        total: typeof responseData.pagination.total === 'number' ? responseData.pagination.total : 0,
        totalPages: typeof responseData.pagination.totalPages === 'number' ? responseData.pagination.totalPages : 0,
    };
}

const AdminAppointmentsPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');

    const { data: appointmentsData, isLoading, refetch } = useListAdminAppointments({
        page,
        limit: 10,
        search,
        status: statusFilter || undefined
    });

    const appointments = getAppointments(appointmentsData);
    const pagination = getPagination(appointmentsData);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Tamamlandı</span>;
            case 'SCHEDULED':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Planlandı</span>;
            case 'CANCELLED':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">İptal</span>;
            case 'NO_SHOW':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">Gelmedi</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{status}</span>;
        }
    };

    const columns = [
        {
            key: 'date',
            header: 'Tarih / Saat',
            sortable: true,
            render: (appt: AppointmentRead) => (
                <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(appt.date).toLocaleDateString('tr-TR')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {appt.time} ({appt.duration ?? 0} dk)
                    </div>
                </div>
            )
        },
        {
            key: 'patient',
            header: 'Hasta',
            sortable: true,
            sortKey: 'patientName',
            render: (appt: AppointmentRead) => (
                <div className="text-sm font-medium text-gray-900 dark:text-white">{appt.partyName || '-'}</div>
            )
        },
        {
            key: 'type',
            header: 'Tip',
            mobileHidden: true,
            sortable: true,
            render: (appt: AppointmentRead) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">{appt.type || appt.appointmentType || '-'}</span>
            )
        },
        {
            key: 'tenant',
            header: 'Şube / Tenant',
            mobileHidden: true,
            sortable: true,
            sortKey: 'tenantName',
            render: (appt: AppointmentRead) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">{appt.tenantName || appt.tenantId}</span>
            )
        },
        {
            key: 'status',
            header: 'Durum',
            sortable: true,
            render: (appt: AppointmentRead) => getStatusBadge(appt.status || '-')
        }
    ];

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                        Global Randevu Yönetimi
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Tüm abonelerdeki randevuları görüntüleyin ve yönetin
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
                <div className="relative rounded-md shadow-sm max-w-md flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white pl-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Hasta adı veya telefon ile ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center space-x-2">
                    <FunnelIcon className="h-5 w-5 text-gray-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    >
                        <option value="">Tüm Durumlar</option>
                        <option value="SCHEDULED">Planlandı</option>
                        <option value="COMPLETED">Tamamlandı</option>
                        <option value="CANCELLED">İptal</option>
                        <option value="NO_SHOW">Gelmedi</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-6 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Yükleniyor...</p>
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                        <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <p className="mt-2">Randevu bulunamadı</p>
                    </div>
                ) : (
                    <ResponsiveTable
                        data={appointments}
                        columns={columns}
                        keyExtractor={(appt: AppointmentRead) => appt.id}
                        emptyMessage="Randevu bulunamadı"
                    />
                )}

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setPage(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 touch-feedback"
                            >
                                Önceki
                            </button>
                            <button
                                onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                                disabled={page === pagination.totalPages}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 touch-feedback"
                            >
                                Sonraki
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                    Toplam <span className="font-medium">{pagination.total}</span> kayıttan <span className="font-medium">{(page - 1) * 10 + 1}</span> - <span className="font-medium">{Math.min(page * 10, pagination.total)}</span> arası gösteriliyor
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                    >
                                        Önceki
                                    </button>
                                    <button
                                        onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                                        disabled={page === pagination.totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                    >
                                        Sonraki
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAppointmentsPage;
