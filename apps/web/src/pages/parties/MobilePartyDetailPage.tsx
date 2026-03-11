import React, { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Phone, MessageCircle, Package, FileText, User, StickyNote, FolderOpen } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { useParty } from '@/hooks/party/useParty';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import { Button } from '@x-ear/ui-web';
import { PartyDevicesTab } from '@/components/parties/PartyDevicesTab';
import PartySalesTab from '@/components/parties/PartySalesTab';
import { PartyNotesTab } from '@/components/parties/PartyNotesTab';
import { PartyDocumentsTab } from '@/components/parties/PartyDocumentsTab';

type Tab = 'notes' | 'documents' | 'devices' | 'sales';

export const MobilePartyDetailPage: React.FC = () => {
    const { partyId } = useParams({ strict: false }) as { partyId?: string };
    const { party, isLoading } = useParty(partyId);
    const [activeTab, setActiveTab] = useState<Tab>('sales');
    const { triggerSelection } = useHaptic();

    if (isLoading || !party) {
        return (
            <MobileLayout>
                <MobileHeader title="Hasta Detayı" />
                <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
            </MobileLayout>
        );
    }

    const handleCall = () => window.location.href = `tel:${party.phone}`;
    const handleMessage = () => window.location.href = `sms:${party.phone}`;

    const tabs = [
        { id: 'sales', label: 'Satışlar', icon: <FileText className="h-4 w-4" /> },
        { id: 'devices', label: 'Cihaz', icon: <Package className="h-4 w-4" /> },
        { id: 'notes', label: 'Notlar', icon: <StickyNote className="h-4 w-4" /> },
        { id: 'documents', label: 'Belgeler', icon: <FolderOpen className="h-4 w-4" /> },
    ];

    return (
        <MobileLayout>
            <MobileHeader
                title={`${party.firstName} ${party.lastName}`}
            />

            {/* Profile Summary */}
            <div className="bg-white p-4 border-b border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{party.firstName} {party.lastName}</h2>
                        <p className="text-sm text-gray-500">{party.phone || 'Telefon yok'}</p>
                        <div className="flex gap-2 mt-1">
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                {party.status || 'Aktif'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        onClick={handleCall}
                        variant="ghost"
                        className="flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 rounded-2xl font-medium active:bg-green-100 transition-colors"
                    >
                        <Phone className="h-4 w-4" />
                        Ara
                    </Button>
                    <Button
                        onClick={handleMessage}
                        variant="ghost"
                        className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 rounded-2xl font-medium active:bg-blue-100 transition-colors"
                    >
                        <MessageCircle className="h-4 w-4" />
                        Mesaj
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="sticky top-14 bg-white border-b border-gray-100 z-20 flex overflow-x-auto hide-scrollbar scroll-smooth px-2">
                {tabs.map((tab) => (
                    <Button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id as Tab);
                            triggerSelection();
                        }}
                        variant="ghost"
                        className={cn(
                            "flex items-center justify-center gap-1.5 px-4 py-2.5 my-1.5 mx-1 text-[13px] font-medium whitespace-nowrap rounded-lg transition-all border border-transparent shadow-none",
                            activeTab === tab.id
                                ? "bg-gray-900 border-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm"
                                : "bg-transparent text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </Button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 bg-gray-50 min-h-[50vh]">
                {activeTab === 'notes' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-hidden">
                        <PartyNotesTab party={party} />
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 overflow-hidden">
                        <PartyDocumentsTab partyId={party.id!} />
                    </div>
                )}

                {activeTab === 'devices' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <PartyDevicesTab party={party} />
                    </div>
                )}

                {activeTab === 'sales' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <PartySalesTab party={party} />
                    </div>
                )}
            </div>
        </MobileLayout>
    );
};
