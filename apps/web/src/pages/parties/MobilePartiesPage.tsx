import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, Filter, X, Download, Tags } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { PartyCard } from '@/components/mobile/PartyCard';
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton';
import { useParties, useCreateParty } from '@/hooks/useParties';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import type { PartyRead } from '@/api/generated';
import type { Party } from '@/types/party';
import { useHaptic } from '@/hooks/useHaptic';
import { Input, Button } from '@x-ear/ui-web';
import { PartyFormModal } from '@/components/parties/PartyFormModal';
import { useNewActionStore } from '@/stores/newActionStore';

export const MobilePartiesPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchValue, setSearchValue] = useState('');
    const { data, isLoading, refetch } = useParties();
    const parties = data?.parties || [];
    const { triggerSelection } = useHaptic();
    const createPartyMutation = useCreateParty();

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [showNewPartyModal, setShowNewPartyModal] = useState(false);

    const { triggered, resetNewAction } = useNewActionStore();

    useEffect(() => {
        if (triggered) {
            setShowNewPartyModal(true);
            resetNewAction();
        }
    }, [triggered, resetNewAction]);

    const toggleSelect = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
        triggerSelection();
    };

    const handleRefresh = async () => {
        window.location.reload();
    };

    const filteredParties = parties.filter((party: PartyRead) => {
        if (!searchValue) return true;
        const searchLower = searchValue.toLowerCase();
        return (
            (party.firstName || '').toLowerCase().includes(searchLower) ||
            (party.lastName || '').toLowerCase().includes(searchLower) ||
            (party.phone || '').toLowerCase().includes(searchLower)
        );
    });

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredParties.length && filteredParties.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredParties.map((p: PartyRead) => Number(p.id))));
        }
        triggerSelection();
    };

    const handleCancelSelection = () => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
        triggerSelection();
    };

    const handleCall = (phone: string) => {
        window.location.href = `tel:${phone}`;
    };

    const handleMessage = (phone: string) => {
        window.location.href = `sms:${phone}`;
    };

    return (
        <MobileLayout className="bg-gray-50">
            <div className="sticky top-0 z-30 bg-white">
                <MobileHeader
                    title={isSelectionMode ? `${selectedIds.size} Seçilen` : "Hastalar"}
                    showBack={false}
                    className="border-none"
                    actions={
                        <div className="flex items-center gap-1">
                            {isSelectionMode ? (
                                <>
                                    <Button variant="ghost" size="sm" onClick={toggleSelectAll} className="px-2 py-1 h-auto text-sm text-blue-600 font-medium">
                                        {selectedIds.size === filteredParties.length && filteredParties.length > 0 ? 'Hiçbiri' : 'Tümünü Seç'}
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

                {/* Search Bar */}
                <div className="px-4 pb-4 bg-white border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Hasta ara..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all"
                        />
                    </div>
                </div>
            </div>

            <PullToRefresh onRefresh={handleRefresh}>
                <div className="p-4 space-y-3 min-h-[calc(100vh-140px)]">
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                        </div>
                    ) : filteredParties.length > 0 ? (
                        filteredParties.map((party: PartyRead) => (
                            <PartyCard
                                key={party.id}
                                party={party}
                                onClick={() => {
                                    if (isSelectionMode) {
                                        toggleSelect(Number(party.id));
                                    } else {
                                        navigate({
                                            to: '/parties/$partyId',
                                            params: { partyId: String(party.id) }
                                        });
                                    }
                                }}
                                onCall={handleCall}
                                onMessage={handleMessage}
                                isSelectionMode={isSelectionMode}
                                isSelected={selectedIds.has(Number(party.id))}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            {searchValue ? 'Sonuç bulunamadı' : 'Hasta kaydı yok'}
                        </div>
                    )}
                </div>
            </PullToRefresh>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && isSelectionMode && (
                <div className="fixed bottom-24 left-4 right-4 z-40 bg-gray-900 dark:bg-gray-800 rounded-2xl shadow-xl px-4 py-3 flex items-center justify-between pointer-events-auto transition-transform">
                    <span className="text-sm font-medium text-white">{selectedIds.size} Hasta</span>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800 dark:hover:bg-gray-700 h-8 px-3 rounded-xl border border-gray-700">
                            <Download className="w-4 h-4 mr-1.5" /> Dışa Aktar
                        </Button>
                        <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800 dark:hover:bg-gray-700 h-8 px-3 rounded-xl border border-gray-700">
                            <Tags className="w-4 h-4 mr-1.5" /> Etiketle
                        </Button>
                    </div>
                </div>
            )}

            {!isSelectionMode && (
                <FloatingActionButton
                    onClick={() => setShowNewPartyModal(true)}
                />
            )}

            <PartyFormModal
                isOpen={showNewPartyModal}
                onClose={() => setShowNewPartyModal(false)}
                onSubmit={async (formData) => {
                    try {
                        const createdParty = await createPartyMutation.mutateAsync(formData as Omit<Party, 'id' | 'createdAt' | 'updatedAt'>);
                        setShowNewPartyModal(false);
                        await refetch();
                        return createdParty as PartyRead;
                    } catch {
                        // error handled by mutation
                        return null;
                    }
                }}
                isLoading={createPartyMutation.isPending}
            />
        </MobileLayout>
    );
};
