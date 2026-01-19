import React, { useState } from 'react';
import { DatePicker } from '@x-ear/ui-web';
import {useListInventoryMovements, getListInventoryMovementsQueryKey} from '@/api/client/inventory.client';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ArrowUpRight, ArrowDownLeft, Calendar, User, Search } from 'lucide-react';

interface StockMovement {
    id: string;
    movementType?: string;
    quantity?: number;
    serialNumber?: string;
    partyId?: string;
    partyName?: string;
    createdAt?: string;
    createdBy?: string;
}

interface InventoryMovementsTableProps {
    inventoryId?: string; // Optional: filter by specific item
}

export const InventoryMovementsTable: React.FC<InventoryMovementsTableProps> = ({ inventoryId }) => {
    const [page, setPage] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Use orval-generated hook with CORRECT endpoint (path param, not query)
    // Note: Backend supports startTime/endTime
    const { data: movementsResponseRaw, isLoading, error } = useListInventoryMovements(
        inventoryId || '', // item_id as path parameter
        {},
        {
            query: {
                queryKey: getListInventoryMovementsQueryKey(inventoryId || '', {}),
                enabled: !!inventoryId
            }
        }
    );

    // DEBUG: Log movements data to diagnose empty table issue
    console.log('🔍 [InventoryMovementsTable] inventoryId:', inventoryId);
    console.log('🔍 [InventoryMovementsTable] isLoading:', isLoading);
    console.log('🔍 [InventoryMovementsTable] error:', error);
    console.log('🔍 [InventoryMovementsTable] movementsResponseRaw:', JSON.stringify(movementsResponseRaw, null, 2));

    const movementsResponse = movementsResponseRaw as any; // Fix type inference
    const movements = movementsResponse?.data || [];
    console.log('🔍 [InventoryMovementsTable] movements array:', movements, 'length:', movements.length);


    const getMovementIcon = (type: string, quantity: number) => {
        if (quantity > 0) return <ArrowDownLeft className="w-4 h-4 text-green-600" />;
        return <ArrowUpRight className="w-4 h-4 text-red-600" />;
    };

    const getMovementLabel = (type: string) => {
        const labels: Record<string, string> = {
            'sale': 'Satış',
            'return': 'İade',
            'adjustment': 'Düzeltme',
            'purchase': 'Satın Alma',
            'production': 'Üretim',
            'loaner_out': 'Emanet Verildi',
            'loaner_return': 'Emanet İade',
            'manual_add': 'Manuel Eklendi',
        };
        return labels[type] || type;
    };

    const formatDate = (date: string) => {
        // Backend stores in UTC, convert to local timezone (Istanbul)
        const d = new Date(date);
        // If the date string doesn't have timezone info, treat it as UTC
        if (!date.includes('+') && !date.includes('Z')) {
            // Append Z to treat as UTC
            const utcDate = new Date(date + 'Z');
            return utcDate.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
        }
        return d.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
    };

    const getMovementDescription = (movement: StockMovement) => {
        const partyName = movement.partyName || movement.partyId;
        const type = movement.movementType || '';

        if (!partyName) return '-';

        if (type === 'sale' || type === 'delivery') {
            return `Hastaya çıktı: ${partyName}`;
        }
        if (type === 'loaner_out') {
            return `Emanet verildi: ${partyName}`;
        }
        if (type === 'loaner_return') {
            return `Emanet iade: ${partyName}`;
        }
        if (type === 'return') {
            return `İade: ${partyName}`;
        }

        return partyName;
    };

    if (isLoading) return <LoadingSkeleton lines={5} />;

    if (!movements || movements.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Henüz stok hareketi bulunmuyor.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 items-end">
                <div className="w-full sm:w-auto">
                    <DatePicker
                        label="Başlangıç Tarihi"
                        value={startDate ? new Date(startDate) : null}
                        onChange={(date: Date | null) => {
                            if (!date) {
                                setStartDate('');
                            } else {
                                const yyyy = date.getFullYear();
                                const mm = String(date.getMonth() + 1).padStart(2, '0');
                                const dd = String(date.getDate()).padStart(2, '0');
                                setStartDate(`${yyyy}-${mm}-${dd}`);
                            }
                            setPage(1);
                        }}
                        placeholder="Tarih seçin"
                    />
                </div>
                <div className="w-full sm:w-auto">
                    <DatePicker
                        label="Bitiş Tarihi"
                        value={endDate ? new Date(endDate) : null}
                        onChange={(date: Date | null) => {
                            if (!date) {
                                setEndDate('');
                            } else {
                                const yyyy = date.getFullYear();
                                const mm = String(date.getMonth() + 1).padStart(2, '0');
                                const dd = String(date.getDate()).padStart(2, '0');
                                setEndDate(`${yyyy}-${mm}-${dd}`);
                            }
                            setPage(1);
                        }}
                        placeholder="Tarih seçin"
                    />
                </div>
                {(startDate || endDate) && (
                    <button
                        onClick={() => {
                            setStartDate('');
                            setEndDate('');
                            setPage(1);
                        }}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 h-[38px] mb-[2px]"
                    >
                        Filtreyi Temizle
                    </button>
                )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Miktar</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seri No</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Açıklama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {movements.map((movement) => (
                            <tr key={movement.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        {movement.createdAt ? formatDate(movement.createdAt) : '-'}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap
                    ${(movement.quantity ?? 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {getMovementLabel(movement.movementType ?? 'unknown')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                                        {getMovementIcon(movement.movementType ?? 'unknown', movement.quantity ?? 0)}
                                        <span className={(movement.quantity ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}>
                                            {(movement.quantity ?? 0) > 0 ? '+' : ''}{movement.quantity ?? 0}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                    {movement.serialNumber || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {getMovementDescription(movement)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        {movement.createdBy || 'System'}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {movementsResponse?.data?.meta && (
                <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-lg sm:px-6">
                    <div className="flex items-center justify-between w-full sm:hidden">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${page === 1
                                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                : 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300'
                                }`}
                        >
                            Önceki
                        </button>
                        <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page * 20 >= (movementsResponse?.data?.meta?.total || 0)}
                            className={`relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium rounded-md ${page * 20 >= (movementsResponse?.data?.meta?.total || 0)
                                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                : 'text-gray-700 bg-white hover:bg-gray-50 border border-gray-300'
                                }`}
                        >
                            Sonraki
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Toplam <span className="font-medium">{movementsResponse?.data?.meta?.total}</span> sonuçtan{' '}
                                <span className="font-medium">{(page - 1) * 20 + 1}</span> -{' '}
                                <span className="font-medium">
                                    {Math.min(page * 20, movementsResponse?.data?.meta?.total || 0)}
                                </span>{' '}
                                arası gösteriliyor
                            </p>
                        </div>
                        <div>
                            <nav className="inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${page === 1
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="sr-only">Önceki</span>
                                    {/* ChevronLeft equivalent */}
                                    &larr; Önceki
                                </button>
                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={page * 20 >= (movementsResponse?.data?.meta?.total || 0)}
                                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${page * 20 >= (movementsResponse?.data?.meta?.total || 0)
                                        ? 'text-gray-300 cursor-not-allowed'
                                        : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                >
                                    Sonraki &rarr;
                                    <span className="sr-only">Sonraki</span>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
