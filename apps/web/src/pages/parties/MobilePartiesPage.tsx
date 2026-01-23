import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, Filter } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { PartyCard } from '@/components/mobile/PartyCard';
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton';
import { useParties } from '@/hooks/useParties';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';

export const MobilePartiesPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchValue, setSearchValue] = useState('');
    const { data, isLoading, error: _error } = useParties();
    const parties = data?.parties || [];

    const handleRefresh = async () => {
        window.location.reload();
    };

    const filteredParties = parties.filter((party: any) => {
        if (!searchValue) return true;
        const searchLower = searchValue.toLowerCase();
        return (
            (party.firstName || '').toLowerCase().includes(searchLower) ||
            (party.lastName || '').toLowerCase().includes(searchLower) ||
            (party.phone || '').toLowerCase().includes(searchLower)
        );
    });

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
                    title="Hastalar"
                    showBack={false}
                    className="border-none"
                    actions={
                        <button className="p-2 text-gray-600">
                            <Filter className="h-5 w-5" />
                        </button>
                    }
                />

                {/* Search Bar */}
                <div className="px-4 pb-4 bg-white border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
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
                        filteredParties.map((party: any) => (
                            <PartyCard
                                key={party.id}
                                party={party}
                                onClick={() => navigate({
                                    to: '/parties/$partyId',
                                    params: { partyId: String(party.id) }
                                })}
                                onCall={handleCall}
                                onMessage={handleMessage}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            {searchValue ? 'Sonuç bulunamadı' : 'Hasta kaydı yok'}
                        </div>
                    )}
                </div>
            </PullToRefresh>

            <FloatingActionButton
                onClick={() => {
                    // New Party Action - could trigger modal or navigate
                    // For now, assuming current desktop modal logic or navigate to new page
                    // We'll just log or alert as a placeholder if modal logic isn't extracted
                    console.log("Open New Party Modal");
                    // If there was a route for new party, we'd use it.
                    // But since the desktop uses a modal state `showNewPartyModal`,
                    // we might need to extract that context or create a dedicated mobile route '/parties/new'
                    // For now, let's keep it simple.
                }}
            />
        </MobileLayout>
    );
};
