import React, { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { Phone, MessageCircle, Package, FileText, User, StickyNote, FolderOpen, Stethoscope, Clock } from 'lucide-react';
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
import { PartyHearingTestsTab } from '@/components/parties/PartyHearingTestsTab';
import { PartyTimelineTab } from '@/components/parties/PartyTimelineTab';
import { PartyOverviewTab } from '@/components/parties/PartyOverviewTab';

type Tab = 'overview' | 'notes' | 'documents' | 'devices' | 'sales' | 'hearing-tests' | 'timeline';

export const MobilePartyDetailPage: React.FC = () => {
    const { partyId } = useParams({ strict: false }) as { partyId?: string };
    const { party, isLoading } = useParty(partyId);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
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
        { id: 'overview', label: 'Genel', icon: <User className="h-4 w-4" /> },
        { id: 'sales', label: 'Satışlar', icon: <FileText className="h-4 w-4" /> },
        { id: 'hearing-tests', label: 'İşitme Testleri', icon: <Stethoscope className="h-4 w-4" /> },
        { id: 'devices', label: 'Cihaz', icon: <Package className="h-4 w-4" /> },
        { id: 'notes', label: 'Notlar', icon: <StickyNote className="h-4 w-4" /> },
        { id: 'documents', label: 'Belgeler', icon: <FolderOpen className="h-4 w-4" /> },
        { id: 'timeline', label: 'Zaman Çizelgesi', icon: <Clock className="h-4 w-4" /> },
    ];

    return (
        <MobileLayout>
            <MobileHeader
                title={`${party.firstName} ${party.lastName}`}
            />

            {/* Profile Summary */}
            <div className="bg-white dark:bg-gray-900 p-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{party.firstName} {party.lastName}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{party.phone || 'Telefon yok'}</p>
                        <div className="flex gap-2 mt-1">
                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs px-2 py-0.5 rounded-full font-medium">
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
                        className="flex items-center justify-center gap-2 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-2xl font-medium active:bg-green-100 dark:active:bg-green-900/40 transition-colors hover:bg-green-100 dark:hover:bg-green-900/30"
                    >
                        <Phone className="h-4 w-4" />
                        Ara
                    </Button>
                    <Button
                        onClick={handleMessage}
                        variant="ghost"
                        className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-2xl font-medium active:bg-blue-100 dark:active:bg-blue-900/40 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    >
                        <MessageCircle className="h-4 w-4" />
                        Mesaj
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="sticky top-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 z-20 overflow-x-auto hide-scrollbar scroll-smooth px-1">
                <div className="flex flex-nowrap min-w-max">
                {tabs.map((tab) => (
                    <Button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id as Tab);
                            triggerSelection();
                        }}
                        variant="ghost"
                        className={cn(
                            "flex-shrink-0 flex items-center gap-1 px-3 py-2 my-1 mx-0.5 text-[12px] font-medium whitespace-nowrap rounded-lg transition-all border border-transparent shadow-none",
                            activeTab === tab.id
                                ? "!bg-blue-600 hover:!bg-blue-700 border-blue-600 !text-white shadow-sm"
                                : "bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </Button>
                ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="p-4 bg-gray-50 dark:bg-gray-950 min-h-[50vh]">
                {activeTab === 'overview' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-2 overflow-hidden">
                        <PartyOverviewTab party={party} />
                    </div>
                )}

                {activeTab === 'notes' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-2 overflow-hidden">
                        <PartyNotesTab party={party} />
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-2 overflow-hidden">
                        <PartyDocumentsTab partyId={party.id!} party={party} />
                    </div>
                )}

                {activeTab === 'devices' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <PartyDevicesTab party={party} />
                    </div>
                )}

                {activeTab === 'sales' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <PartySalesTab party={party} />
                    </div>
                )}

                {activeTab === 'hearing-tests' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <PartyHearingTestsTab partyId={party.id!} />
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                        <PartyTimelineTab party={party} />
                    </div>
                )}
            </div>
        </MobileLayout>
    );
};
