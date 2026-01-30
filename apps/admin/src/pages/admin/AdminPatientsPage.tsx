import React, { useState } from 'react';
import { useListAdminParties } from '@/lib/api-client';
import {
    UserIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import Pagination from '@/components/ui/Pagination';
import { PartyRead } from '@/api/generated/schemas';

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

    // Date formatter helper
    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '-';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '-';
            return date.toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return '-';
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Global Hasta Yönetimi</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Tüm abonelerdeki hastaları görüntüleyin ve yönetin
                    </p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                    title="Listeyi Yenile"
                >
                    <ArrowPathIcon className="h-5 w-5" />
                </button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative rounded-md shadow-sm max-w-md">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        placeholder="Ad, Soyad, TC veya Telefon ile ara..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1); // Reset to page 1 on search
                        }}
                    />
                </div>
            </div>

            {/* List */}
            <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-4 text-sm text-gray-500">Hastalar yükleniyor...</p>
                    </div>
                ) : patients.length === 0 ? (
                    <div className="p-16 text-center text-gray-500 flex flex-col items-center">
                        <div className="bg-gray-100 p-4 rounded-full mb-4">
                            <UserIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Hasta bulunamadı</h3>
                        <p className="mt-1 text-sm text-gray-500">Arama kriterlerinize uygun hasta kaydı bulunmuyor.</p>
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="mt-4 text-sm text-blue-600 hover:text-blue-500 font-medium"
                            >
                                Aramayı Temizle
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hasta</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TC Kimlik</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şube / Tenant</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kayıt Tarihi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {patients.map((patient) => {
                                        // Handle camelCase vs snake_case explicitly
                                        const firstName = patient.firstName || patient.first_name || '';
                                        const lastName = patient.lastName || patient.last_name || '';
                                        const email = patient.email || '';
                                        // Correct property for TC is tcNumber
                                        const tcKimlik = patient.tcNumber || patient.tc_number || (patient as any).identity_number || '-';
                                        const phone = patient.phone || '-';
                                        const tenantName = patient.tenantName || (patient as any).tenant_name || '-';
                                        const branchName = patient.branchName || (patient as any).branch_name || '-';
                                        const createdAt = patient.createdAt || (patient as any).created_at;

                                        return (
                                            <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="flex-shrink-0 h-10 w-10">
                                                            <span className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                                                                {(firstName?.[0] || '').toUpperCase()}{(lastName?.[0] || '').toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-medium text-gray-900">{firstName} {lastName}</div>
                                                            {email && <div className="text-sm text-gray-500">{email}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                                    {tcKimlik}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {phone}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-700">{tenantName}</span>
                                                        {branchName !== '-' && <span className="text-xs text-gray-400">{branchName}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {formatDate(createdAt as string)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
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
