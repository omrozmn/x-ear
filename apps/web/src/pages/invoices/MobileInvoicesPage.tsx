import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus, Filter, FileText, Search } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { invoiceService } from '@/services/invoice.service';
import { Invoice } from '@/types/invoice'; // Check import path
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';

export const MobileInvoicesPage: React.FC = () => {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchValue, setSearchValue] = useState('');
    const { triggerSelection } = useHaptic();

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
        const map: any = {
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
            <MobileHeader
                title="Faturalar"
                showBack={false}
                actions={
                    <button className="p-2 text-gray-600">
                        <Filter className="h-5 w-5" />
                    </button>
                }
            />

            {/* Search Bar */}
            <div className="px-4 pb-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-14 z-20">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
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
                                    // navigate({ to: `/invoices/${inv.id}` }); // Detail page if exists
                                    console.log('Open invoice detail', inv.id);
                                }}
                                className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.99] transition-transform"
                            >
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

            <FloatingActionButton
                onClick={() => navigate({ to: '/invoices/new' })}
            />
        </MobileLayout>
    );
};
