import React, { useState } from 'react';
import { DatePicker, DataTable } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';
import { useListInventoryMovements, getListInventoryMovementsQueryKey } from '@/api/client/inventory.client';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ArrowUpRight, ArrowDownLeft, Calendar, User } from 'lucide-react';
interface StockMovement {
    id: string;
    movementType?: string;
    quantity?: number;
    serialNumber?: string;
    partyId?: string;
    partyName?: string;
    prescriptionStatus?: string;
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
    const { data: movementsResponseRaw, isLoading } = useListInventoryMovements(
        inventoryId || '', // item_id as path parameter
        {},
        {
            query: {
                queryKey: getListInventoryMovementsQueryKey(inventoryId || '', {}),
                enabled: !!inventoryId
            }
        }
    );

    // Cast to expected paginated response structure
    const movementsResponse = movementsResponseRaw as { data: StockMovement[]; meta: { total: number } } | undefined;
    const movements = movementsResponse?.data || [];

    const getMovementIcon = (quantity: number) => {
        if (quantity > 0) return <ArrowDownLeft className="w-4 h-4 text-success" />;
        return <ArrowUpRight className="w-4 h-4 text-destructive" />;
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
            'uts_alma': 'UTS Alma',
            'uts_verme': 'UTS Verme',
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

        if (!partyName) {
            if (type === 'uts_alma') return 'UTS alma bildirimi ile eklendi';
            if (type === 'uts_verme') return 'UTS verme bildirimi ile çıktı';
            return '-';
        }

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
            <div className="text-center py-12 bg-muted rounded-2xl">
                <p className="text-muted-foreground">Henüz stok hareketi bulunmuyor.</p>
            </div>
        );
    }

    const columns: Column<StockMovement>[] = [
        {
            key: 'createdAt',
            title: 'Tarih',
            render: (_: unknown, record: StockMovement) => (
                <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {record.createdAt ? formatDate(record.createdAt) : '-'}
                </div>
            )
        },
        {
            key: 'movementType',
            title: 'İşlem',
            render: (_: unknown, record: StockMovement) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap
                    ${(record.quantity ?? 0) > 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-red-800'}`}>
                    {getMovementLabel(record.movementType ?? 'unknown')}
                </span>
            )
        },
        {
            key: 'quantity',
            title: 'Miktar',
            render: (_: unknown, record: StockMovement) => (
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {getMovementIcon(record.quantity ?? 0)}
                    <span className={(record.quantity ?? 0) > 0 ? 'text-success' : 'text-destructive'}>
                        {(record.quantity ?? 0) > 0 ? '+' : ''}{record.quantity ?? 0}
                    </span>
                </div>
            )
        },
        {
            key: 'serialNumber',
            title: 'Seri No',
            render: (_: unknown, record: StockMovement) => (
                <span className="text-sm text-muted-foreground font-mono">{record.serialNumber || '-'}</span>
            )
        },
        {
            key: 'partyName',
            title: 'Açıklama',
            render: (_: unknown, record: StockMovement) => (
                <span className="text-sm text-muted-foreground">{getMovementDescription(record)}</span>
            )
        },
        {
            key: 'prescriptionStatus',
            title: 'Reçete',
            render: (_: unknown, record: StockMovement) => {
                if (!record.prescriptionStatus) return <span className="text-sm text-muted-foreground">-</span>;
                const statusLabels: Record<string, { label: string; className: string }> = {
                    'raporlu': { label: 'Raporlu', className: 'bg-success/10 text-success' },
                    'raporsuz': { label: 'Raporsuz', className: 'bg-muted text-foreground' },
                    'bekleniyor': { label: 'Bekliyor', className: 'bg-warning/10 text-yellow-800' },
                };
                const info = statusLabels[record.prescriptionStatus] || { label: record.prescriptionStatus, className: 'bg-primary/10 text-blue-800' };
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${info.className}`}>
                        {info.label}
                    </span>
                );
            }
        },
        {
            key: 'createdBy',
            title: 'Kullanıcı',
            render: (_: unknown, record: StockMovement) => (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {record.createdBy || 'System'}
                </div>
            )
        },
    ];

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 p-4 bg-muted rounded-2xl border border-border items-end">
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
                    <button data-allow-raw="true"
                        onClick={() => {
                            setStartDate('');
                            setEndDate('');
                            setPage(1);
                        }}
                        className="px-4 py-2 text-sm font-medium text-destructive bg-card border border-red-300 rounded-xl hover:bg-destructive/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 h-[38px] mb-[2px]"
                    >
                        Filtreyi Temizle
                    </button>
                )}
            </div>

            <DataTable<StockMovement>
                    data={movements}
                    columns={columns}
                    rowKey="id"
                    emptyText="Stok hareketi bulunamadı"
                    striped
                    hoverable
                    size="medium"
                    pagination={movementsResponse?.meta?.total ? {
                        current: page,
                        pageSize: 20,
                        total: movementsResponse.meta.total,
                        onChange: (p: number) => setPage(p)
                    } : undefined}
                />
        </div>
    );
};
