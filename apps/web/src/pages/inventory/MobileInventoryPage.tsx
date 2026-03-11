import React, { useState, useEffect, useCallback } from 'react';
import { Package, Search, Filter, ScanLine, Tag, CheckSquare, Square, X, Trash2, Edit } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { inventoryService } from '@/services/inventory.service';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { toast } from 'react-hot-toast';
import { Modal, Button } from '@x-ear/ui-web';
import { InventoryForm } from '@/components/inventory/InventoryForm';
import { useNewActionStore } from '@/stores/newActionStore';
import type { InventoryItem as InventoryFormItem } from '@/types/inventory';

interface InventoryItem {
    id: string;
    name: string;
    brand?: string;
    model?: string;
    price: number;
    availableInventory?: number;
    available_inventory?: number;
    imageUrl?: string;
    category?: string | { name: string };
}

export const MobileInventoryPage: React.FC = () => {
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchValue, setSearchValue] = useState('');
    const { triggerSelection } = useHaptic();
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
        triggerSelection();
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === items.length && items.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(item => item.id)));
        }
        triggerSelection();
    };

    const handleCancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
        triggerSelection();
    };
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const { triggered, resetNewAction } = useNewActionStore();

    useEffect(() => {
        if (triggered) {
            setIsAddModalOpen(true);
            resetNewAction();
        }
    }, [triggered, resetNewAction]);

    const loadInventory = useCallback(async () => {
        try {
            setLoading(true);
            if (!searchValue) {
                // Determine if we should force refresh from API
                const allItems = await inventoryService.getAllItems();
                setItems(allItems);
            } else {
                // Use searchItems method correctly based on Service definition
                const result = await inventoryService.searchItems({
                    search: searchValue,
                    maxResults: 50,
                    enableFuzzySearch: true
                });
                setItems(result.items || []);
            }
        } catch (error) {
            console.error('Failed to load inventory:', error);
            // If search fails, try fallback to getting all items
            try {
                const allItems = await inventoryService.getAllItems();
                setItems(allItems);
            } catch (e) {
                console.error('Fallback failed', e);
            }
        } finally {
            setLoading(false);
        }
    }, [searchValue]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            loadInventory();
        }, 500);
        return () => clearTimeout(timer);
    }, [loadInventory]);

    const handleRefresh = async () => {
        await loadInventory();
    };

    const handleScan = () => {
        triggerSelection();
        toast.success('Kamera ile tarama özelliği hazırlanıyor');
    };

    return (
        <MobileLayout>
            <MobileHeader
                title={isSelectionMode ? `${selectedIds.size} Seçilen` : "Envanter"}
                showBack={false}
                actions={
                    <div className="flex items-center gap-1">
                        {isSelectionMode ? (
                            <>
                                <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="px-2 py-1 h-auto text-sm text-blue-600 font-medium">
                                    {selectedIds.size === items.length && items.length > 0 ? 'Hiçbiri' : 'Tümünü Seç'}
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

            {/* Search & Scan Bar */}
            <div className="px-4 pb-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-14 z-20">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <input
                            data-allow-raw="true"
                            type="text"
                            placeholder="Ürün, marka, model ara..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white dark:focus:bg-gray-700 transition-all border border-transparent focus:border-primary-100 dark:focus:border-primary-900 dark:text-white dark:placeholder-gray-400"
                        />
                    </div>
                    <button
                        data-allow-raw="true"
                        onClick={handleScan}
                        className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-600 dark:text-gray-300 active:bg-gray-100 dark:active:bg-gray-700 transition-colors border border-transparent"
                    >
                        <ScanLine className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <PullToRefresh onRefresh={handleRefresh}>
                <div className="p-4 space-y-3 min-h-[calc(100vh-140px)] bg-gray-50 dark:bg-gray-900">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400" />
                        </div>
                    ) : items.length > 0 ? (
                        items.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => {
                                    triggerSelection();
                                    if (isSelectionMode) {
                                        toggleSelect(item.id);
                                    } else {
                                        setSelectedItem(item);
                                    }
                                }}
                                className={cn(
                                    "p-4 rounded-xl border shadow-sm active:scale-[0.99] transition-all relative overflow-hidden",
                                    selectedIds.has(item.id)
                                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-500"
                                        : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
                                )}
                            >
                                {isSelectionMode && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        {selectedIds.has(item.id) ? (
                                            <CheckSquare className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        ) : (
                                            <Square className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                                        )}
                                    </div>
                                )}
                                <div className={cn("flex gap-4 transition-all", isSelectionMode && "pr-8")}>
                                    <div className="h-16 w-16 bg-gray-50 dark:bg-gray-700 rounded-2xl flex items-center justify-center flex-shrink-0">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover rounded-2xl" />
                                        ) : (
                                            <Package className="h-8 w-8 text-gray-300 dark:text-gray-500" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate pr-2">
                                                {item.name}
                                            </h3>
                                            <p className="font-bold text-gray-900 dark:text-white">
                                                {formatCurrency(item.price)}
                                            </p>
                                        </div>

                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                            {item.brand} {item.model}
                                        </p>

                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "text-xs px-2 py-0.5 rounded-xl font-medium flex items-center gap-1",
                                                (item.availableInventory || item.available_inventory || 0) > 0 ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                            )}>
                                                <Tag className="h-3 w-3" />
                                                Stok: {item.availableInventory || item.available_inventory || 0}
                                            </div>

                                            {item.category && (
                                                <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-xl">
                                                    {typeof item.category === 'string' ? item.category : item.category.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
                                <Package className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Ürün Bulunamadı</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                                Arama kriterlerinize uygun ürün yok.
                            </p>
                        </div>
                    )}
                </div>
            </PullToRefresh>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && isSelectionMode && (
                <div className="fixed bottom-24 left-4 right-4 z-40 bg-gray-900 dark:bg-gray-800 rounded-2xl shadow-xl px-4 py-3 flex items-center justify-between pointer-events-auto transition-transform">
                    <span className="text-sm font-medium text-white">{selectedIds.size} Ürün</span>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800 dark:hover:bg-gray-700 h-8 px-3 rounded-xl border border-gray-700">
                            <Edit className="w-4 h-4 mr-1.5" /> Düzenle
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-gray-800 dark:hover:bg-gray-700 h-8 px-3 rounded-xl border border-gray-700">
                            <Trash2 className="w-4 h-4 mr-1.5" /> Sil
                        </Button>
                    </div>
                </div>
            )}

            {!isSelectionMode && (
                <FloatingActionButton
                    onClick={() => setIsAddModalOpen(true)}
                />
            )}

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Yeni Ürün Ekle"
                size="xl"
            >
                <InventoryForm
                    onSave={() => {
                        setIsAddModalOpen(false);
                        handleRefresh();
                    }}
                    onCancel={() => setIsAddModalOpen(false)}
                />
            </Modal>

            <Modal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                title="Ürün Detayı"
                size="xl"
            >
                {selectedItem && (
                    <InventoryForm
                        item={selectedItem as unknown as InventoryFormItem}
                        onSave={() => {
                            setSelectedItem(null);
                            handleRefresh();
                        }}
                        onCancel={() => setSelectedItem(null)}
                    />
                )}
            </Modal>
        </MobileLayout>
    );
};
