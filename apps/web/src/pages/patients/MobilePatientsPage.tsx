import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Search, Plus, Filter, SortAsc } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { PatientCard } from '@/components/mobile/PatientCard';
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton';
import { usePatients } from '@/hooks/usePatients';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';

export const MobilePatientsPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchValue, setSearchValue] = useState('');
    const { data, isLoading, error } = usePatients();
    const patients = data?.patients || [];

    const handleRefresh = async () => {
        window.location.reload();
    };

    const filteredPatients = patients.filter((patient: any) => {
        if (!searchValue) return true;
        const searchLower = searchValue.toLowerCase();
        return (
            (patient.firstName || '').toLowerCase().includes(searchLower) ||
            (patient.lastName || '').toLowerCase().includes(searchLower) ||
            (patient.phone || '').toLowerCase().includes(searchLower)
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
                    ) : filteredPatients.length > 0 ? (
                        filteredPatients.map((patient: any) => (
                            <PatientCard
                                key={patient.id}
                                patient={patient}
                                onClick={() => navigate({
                                    to: '/patients/$patientId',
                                    params: { patientId: String(patient.id) }
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
                    // New Patient Action - could trigger modal or navigate
                    // For now, assuming current desktop modal logic or navigate to new page
                    // We'll just log or alert as a placeholder if modal logic isn't extracted
                    console.log("Open New Patient Modal");
                    // If there was a route for new patient, we'd use it.
                    // But since the desktop uses a modal state `showNewPatientModal`,
                    // we might need to extract that context or create a dedicated mobile route '/patients/new'
                    // For now, let's keep it simple.
                }}
            />
        </MobileLayout>
    );
};
