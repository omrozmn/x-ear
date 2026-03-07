import React, { useState } from 'react';
import { useListAdminParties } from '@/lib/api-client';
import {
    UserIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import Pagination from '@/components/ui/Pagination';
import { PartyRead } from '@/api/generated/schemas';
import { useAdminResponsive } from '@/hooks';
import { ResponsiveTable } from '@/components/responsive';

// Extended type to handle potentially missing properties in generated types vs runtime
interface ExtendedParty extends PartyRead {
    tenantName?: string;
    branchName?: string;
    // Fallbacks
    first_name?: string;
    last_name?: string;
    tc_number?: string;
    created_at?: string;
}

const AdminPatientsPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const { data: patientsData, isLoading, refetch } = useListAdminParties({
        page,
        limit,
        search: search || undefined
    });

    const patients = ((patientsData as any)?.parties || (patientsData as any)?.data?.parties || []) as ExtendedParty[];
    const pagination = (patientsData as any)?.pagination || (patientsData as any)?.data?.pagination;

    // Determine total pages safely
    const totalPages = pagination?.totalPages || Math.ceil((pagination?.total || 0) / limit) || 1;

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: isMobile ? 'short' : 'long',
                day: 'numeric',
                ...(isMobile ? {} : { hour: '2-digit', minute: '2-digit' })
            });
        } catch (e) {
            return '-';
        }
    };

    const columns = [
        {
            key: 'patient',
            header: 'Hasta',
            sortable: true,
            sortKey: 'firstName',
            render: (patient: ExtendedParty) => {
                const firstName = patient.firstName || patient.first_name || '';
                const lastName = patient.lastName || patient.last_name || '';
                const email = patient.email || '';
                return (
                    <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                            <span className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                                {(firstName?.[0] || '').toUpperCase()}{(lastName?.[0] || '').toUpperCase()}
                            </span>
                        </div>
                        <div className="ml-4 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{firstName} {lastName}</div>
                            {email && <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{email}</div>}
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'tc',
            header: 'TC Kimlik',
            mobileHidden: true,
            sortable: true,
            sortKey: 'tcNumber',
            render: (patient: ExtendedParty) => {
                const tcKimlik = patient.tcNumber || patient.tc_number || (patient as any).identity_number || '-';
                return <span className="text-sm text-gray-900 dark:text-white font-mono">{tcKimlik}</span>;
            }
        },
        {
            key: 'phone',
            header: 'Telefon',
            sortable: true,
            render: (patient: ExtendedParty) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">{patient.phone || '-'}</span>
            )
        },
        {
            key: 'tenant',
            header: 'Şube / Tenant',
            mobileHidden: true,
            sortable: true,
            sortKey: 'tenantName',
            render: (patient: ExtendedParty) => {
                const tenantName = patient.tenantName || (patient as any).tenant_name || '-';
                const branchName = patient.branchName || (patient as any).branch_name || '-';
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-700 dark:text-gray-300 text-sm">{tenantName}</span>
                        {branchName !== '-' && <span className="text-xs text-gray-400 dark:text-gray-500">{branchName}</span>}
                    </div>
                );
            }
        },
        {
            key: 'created',
            header: 'Kayıt Tarihi',
            mobileHidden: true,
            sortable: true,
            sortKey: 'createdAt',
            render: (patient: ExtendedParty) => {
                const createdAt = patient.createdAt || (patient as any).created_at;
                return <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(createdAt as string)}</span>;
            }
        }
    ];

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                    <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>Global Hasta Yönetimi</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Tüm abonelerdeki hastaları görüntüleyin ve yönetin
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 touch-feedback"
                    title="Listeyi Yenile"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                </button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        placeholder="Ad, Soyad, TC, Telefon veya Abone Adı ile ara..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {isLoading ? (
                    <div className={`${isMobile ? 'p-8' : 'p-12'} text-center`}>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Hastalar yükleniyor...</p>
                    </div>
                ) : patients.length === 0 ? (
                    <div className={`${isMobile ? 'p-8' : 'p-16'} text-center text-gray-500 dark:text-gray-400 flex flex-col items-center`}>
                        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full mb-4">
                            <UserIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className={`${isMobile ? 'text-base' : 'text-lg'} font-medium text-gray-900 dark:text-white`}>Hasta bulunamadı</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Arama kriterlerinize uygun hasta kaydı bulunmuyor.</p>
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium touch-feedback"
                            >
                                Aramayı Temizle
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <ResponsiveTable
                            data={patients}
                            columns={columns}
                            keyExtractor={(patient) => patient.id!}
                            emptyMessage="Hasta bulunamadı"
                        />

                        {/* Pagination */}
                        <div className={`bg-gray-50 dark:bg-gray-700/50 ${isMobile ? 'px-3 py-3' : 'px-4 py-3'} border-t border-gray-200 dark:border-gray-700 sm:px-6`}>
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                totalItems={pagination?.total || 0}
                                itemsPerPage={limit}
                                onPageChange={setPage}
                                onItemsPerPageChange={setLimit}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminPatientsPage;
