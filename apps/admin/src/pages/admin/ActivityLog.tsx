import React, { useState } from 'react';
import {
    Activity,
    Search,
    Loader2,
    Filter
} from 'lucide-react';
import { Input, Select } from '@x-ear/ui-web';
import { useGetApiActivityLogs } from '../../lib/api-client';
import Pagination from '../../components/ui/Pagination';

export default function ActivityLogPage() {
    const [filters, setFilters] = useState({
        user_id: '',
        entity_type: '',
        entity_id: ''
    });
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const { data: logsData, isLoading } = useGetApiActivityLogs({
        ...filters,
        page,
        limit
    } as any);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Aktivite Logları</h1>
                    <p className="text-gray-500">Sistem üzerindeki tüm kullanıcı hareketleri</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Kullanıcı ID</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                className="pl-9"
                                placeholder="User ID ara..."
                                value={filters.user_id}
                                onChange={(e) => setFilters({ ...filters, user_id: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Varlık Tipi</label>
                        <Input
                            placeholder="Örn: campaign, sms_header"
                            value={filters.entity_type}
                            onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Varlık ID</label>
                        <Input
                            placeholder="Entity ID ara..."
                            value={filters.entity_id}
                            onChange={(e) => setFilters({ ...filters, entity_id: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : (
                    <>
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Tarih</th>
                                    <th className="px-6 py-3 font-medium">Kullanıcı</th>
                                    <th className="px-6 py-3 font-medium">Aksiyon</th>
                                    <th className="px-6 py-3 font-medium">Varlık</th>
                                    <th className="px-6 py-3 font-medium">Detaylar</th>
                                    <th className="px-6 py-3 font-medium">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {logsData?.data?.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleString('tr-TR')}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-indigo-600">{log.userId}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{log.action}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <span className="bg-gray-100 px-2 py-1 rounded text-xs mr-2">{log.entityType}</span>
                                            <span className="font-mono text-xs text-gray-400">{log.entityId?.substring(0, 8)}...</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={log.details}>
                                            {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-400 font-mono">{log.ipAddress}</td>
                                    </tr>
                                ))}
                                {logsData?.data?.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            Kayıt bulunamadı.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <Pagination
                            currentPage={page}
                            totalPages={(logsData as any)?.pagination?.totalPages || 1}
                            totalItems={(logsData as any)?.pagination?.total || 0}
                            itemsPerPage={limit}
                            onPageChange={setPage}
                            onItemsPerPageChange={setLimit}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
