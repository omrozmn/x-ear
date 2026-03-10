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
import Pagination from '@/components/ui/Pagination';
import { extractPagination, isRecord, unwrapData } from '@/lib/orval-response';

interface ExtendedAppointment extends AppointmentRead {
    patientName?: string;
    tenant_name?: string;
}

interface PaginationInfo {
    total: number;
    totalPages: number;
}

function getAppointments(data: AppointmentListResponse | undefined): ExtendedAppointment[] {
    const payload = unwrapData(data);
    if (!isRecord(payload) || !Array.isArray(payload.appointments)) {
        return [];
    }

    return payload.appointments.filter((appointment): appointment is ExtendedAppointment => isRecord(appointment) && typeof appointment.id === 'string');
}

function getPagination(data: AppointmentListResponse | undefined): PaginationInfo | null {
    const pagination = extractPagination(data);
    if (!pagination) {
        return null;
    }

    return {
        total: pagination.total ?? 0,
        totalPages: pagination.totalPages ?? 1,
    };
}

const AdminAppointmentsPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [statusFilter, setStatusFilter] = useState('');

    const { data: appointmentsData, isLoading, refetch } = useListAdminAppointments({
        page,
        limit,
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
            sortValue: (appt: ExtendedAppointment) => `${appt.date || ''} ${appt.time || ''}`,
            render: (appt: ExtendedAppointment) => (
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
            sortValue: (appt: ExtendedAppointment) => appt.partyName || appt.patientName || '',
            render: (appt: ExtendedAppointment) => (
                <div className="text-sm font-medium text-gray-900 dark:text-white">{appt.partyName || appt.patientName || '-'}</div>
            )
        },
        {
            key: 'type',
            header: 'Tip',
            mobileHidden: true,
            sortable: true,
            sortValue: (appt: ExtendedAppointment) => appt.type || appt.appointmentType || '',
            render: (appt: ExtendedAppointment) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">{appt.type || appt.appointmentType || '-'}</span>
            )
        },
        {
            key: 'tenant',
            header: 'Şube / Tenant',
            mobileHidden: true,
            sortable: true,
            sortKey: 'tenantName',
            sortValue: (appt: ExtendedAppointment) => appt.tenantName || appt.tenant_name || appt.tenantId || '',
            render: (appt: ExtendedAppointment) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">{appt.tenantName || appt.tenant_name || appt.tenantId || '-'}</span>
            )
        },
        {
            key: 'status',
            header: 'Durum',
            sortable: true,
            sortValue: (appt: ExtendedAppointment) => appt.status || '',
            render: (appt: ExtendedAppointment) => getStatusBadge(appt.status || '-')
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
                <div className="relative rounded-xl shadow-sm max-w-md flex-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white pl-10 focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        placeholder="Hasta adı veya telefon ile ara..."
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
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        className="block w-full rounded-xl border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white py-2 pl-3 pr-10 text-base focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
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
            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden">
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
                            keyExtractor={(appt: ExtendedAppointment) => appt.id}
                            emptyMessage="Randevu bulunamadı"
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

export default AdminAppointmentsPage;
