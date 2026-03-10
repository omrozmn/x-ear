import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Filter, FileText, Search, CheckSquare, Square, X, Download, Trash2 } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { invoiceService } from '@/services/invoice.service';
import { Invoice } from '@/types/invoice'; // Check import path
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { Input, Button } from '@x-ear/ui-web';

export const MobileInvoicesPage: React.FC = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchValue, setSearchValue] = useState('');
    const { triggerSelection } = useHaptic();

    // Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    const toggleSelect = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
        triggerSelection();
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredInvoices.map((inv) => Number(inv.id))));
        }
        triggerSelection();
    };

    const handleCancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
        triggerSelection();
    };

    const loadInvoices = useCallback(async () => {
        try {
            setLoading(true);
            const result = await invoiceService.getInvoices({});
            setInvoices(result.invoices || []);
        } catch (error) {
            console.error('Failed to load invoices:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInvoices();
    }, [loadInvoices]);

    const handleRefresh = async () => {
        await loadInvoices();
    };

    const filteredInvoices = invoices.filter(inv => {
        if (!searchValue) return true;
        const q = searchValue.toLowerCase();
        return (
            inv.invoiceNumber?.toLowerCase().includes(q) ||
            inv.partyName?.toLowerCase().includes(q)
        );
    });

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'paid': return 'text-green-600 bg-green-50 border-green-100';
            case 'overdue': return 'text-red-600 bg-red-50 border-red-100';
            case 'sent': return 'text-blue-600 bg-blue-50 border-blue-100';
            case 'draft': return 'text-gray-600 bg-gray-50 border-gray-100';
            default: return 'text-gray-600 bg-gray-50 border-gray-100';
        }
    };

    const getStatusLabel = (status: string) => {
        const map: Record<string, string> = {
            paid: 'Ödendi',
            overdue: 'Gecikmiş',
            sent: 'Gönderildi',
            draft: 'Taslak',
            cancelled: 'İptal'
        };
        return map[status?.toLowerCase()] || status;
    };

    return (
        <MobileLayout>
            <>
                <MobileHeader
                    title={isSelectionMode ? `${selectedIds.size} Seçilen` : "Faturalar"}
                    showBack={false}
                    actions={
                        <div className="flex items-center gap-1">
                            {isSelectionMode ? (
                                <>
                                    <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="px-2 py-1 h-auto text-sm text-blue-600 font-medium">
                                        {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0 ? 'Hiçbiri' : 'Tümünü Seç'}
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={handleCancelSelection} className="p-2 text-gray-600">
                                        <X className="h-5 w-5" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="ghost" size="sm" onClick={() => { setIsSelectionMode(true); triggerSelection(); }} className="px-2 py-1 h-auto text-sm text-blue-600 font-medium">
                                        Seç
                                    </Button>
                                    <Button variant="ghost" size="sm" className="p-2 text-gray-600">
                                        <Filter className="h-5 w-5" />
                                    </Button>
                                </>
                            )}
                        </div>
                    }
                />

                <div className="px-4 pb-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-14 z-20">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Fatura no veya hasta ara..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white dark:focus:bg-gray-800 dark:text-gray-100 transition-all border border-transparent focus:border-primary-100 dark:focus:border-gray-700"
                        />
                    </div>
                </div>

                <PullToRefresh onRefresh={handleRefresh}>
                    <div className="p-4 space-y-3 min-h-[calc(100vh-140px)] bg-gray-50 dark:bg-gray-950">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400" />
                            </div>
                        ) : filteredInvoices.length > 0 ? (
                            filteredInvoices.map((inv) => (
                                <div
                                    key={inv.id}
                                    onClick={() => {
                                        triggerSelection();
                                        if (isSelectionMode) {
                                            toggleSelect(Number(inv.id));
                                        } else {
                                            console.log('Open invoice detail', inv.id);
                                        }
                                    }}
                                    className={cn(
                                        "p-4 rounded-xl border shadow-sm active:scale-[0.99] transition-all relative overflow-hidden",
                                        selectedIds.has(Number(inv.id))
                                            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-500"
                                            : "bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800"
                                    )}
                                >
                                    {isSelectionMode && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            {selectedIds.has(Number(inv.id)) ? (
                                                <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                            ) : (
                                                <Square className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                                            )}
                                        </div>
                                    )}
                                    <div className={cn("transition-all", isSelectionMode && "pr-8")}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{inv.partyName}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{inv.invoiceNumber}</p>
                                                </div>
                                            </div>
                                            <span className={cn("text-[10px] px-2 py-1 rounded-full font-medium border", getStatusColor(inv.status))}>
                                                {getStatusLabel(inv.status)}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-end border-t border-gray-50 dark:border-gray-800 pt-3">
                                            <div>
                                                <p className="text-xs text-gray-400">Tarih</p>
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {inv.issueDate ? formatDate(inv.issueDate) : '-'}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-400">Tutar</p>
                                                <p className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {formatCurrency(inv.grandTotal || 0, inv.currency)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
                                    <FileText className="h-8 w-8 text-gray-300 dark:text-gray-500" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Fatura Bulunamadı</h3>
                                <p className="text-gray-500 text-sm mt-1">
                                    Kriterlere uygun fatura yok.
                                </p>
                            </div>
                        )}
                    </div>
                </PullToRefresh>

                {selectedIds.size > 0 && isSelectionMode && (
                    <div className="fixed bottom-24 left-4 right-4 z-40 bg-gray-900 dark:bg-gray-800 rounded-2xl shadow-xl px-4 py-3 flex items-center justify-between pointer-events-auto transition-transform">
                        <span className="text-sm font-medium text-white">{selectedIds.size} Fatura</span>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800 dark:hover:bg-gray-700 h-8 px-3 rounded-xl border border-gray-700">
                                <Download className="w-4 h-4 mr-1.5" /> İndir
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-gray-800 dark:hover:bg-gray-700 h-8 px-3 rounded-xl border border-gray-700">
                                <Trash2 className="w-4 h-4 mr-1.5" /> Sil
                            </Button>
                        </div>
                    </div>
                )}

                {!isSelectionMode && (
                    <FloatingActionButton
                        onClick={() => navigate({ to: '/invoices/new' })}
                    />
                )}
            </>
        </MobileLayout>
    );
};
