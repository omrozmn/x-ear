import React, { useState } from 'react';
import { useParams, useNavigate } from '@tanstack/react-router';
import { Phone, MessageCircle, MoreVertical, Calendar, Package, FileText, User } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { usePatient } from '@/hooks/patient/usePatient';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';

type Tab = 'general' | 'appointments' | 'devices' | 'sales';

export const MobilePatientDetailPage: React.FC = () => {
    const { patientId } = useParams({ strict: false }) as { patientId?: string };
    const navigate = useNavigate();
    const { patient, isLoading } = usePatient(patientId);
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const { triggerSelection } = useHaptic();

    if (isLoading || !patient) {
        return (
            <MobileLayout>
                <MobileHeader title="Hasta Detayı" />
                <div className="flex justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                </div>
            </MobileLayout>
        );
    }

    const handleCall = () => window.location.href = `tel:${patient.phone}`;
    const handleMessage = () => window.location.href = `sms:${patient.phone}`;

    const tabs = [
        { id: 'general', label: 'Genel', icon: <User className="h-4 w-4" /> },
        { id: 'appointments', label: 'Randevu', icon: <Calendar className="h-4 w-4" /> },
        { id: 'devices', label: 'Cihaz', icon: <Package className="h-4 w-4" /> },
        { id: 'sales', label: 'Finans', icon: <FileText className="h-4 w-4" /> },
    ];

    return (
        <MobileLayout>
            <MobileHeader
                title={`${patient.firstName} ${patient.lastName}`}
                actions={
                    <button className="p-2 text-gray-600">
                        <MoreVertical className="h-5 w-5" />
                    </button>
                }
            />

            {/* Profile Summary */}
            <div className="bg-white p-4 border-b border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center">
                        <User className="h-8 w-8 text-gray-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{patient.firstName} {patient.lastName}</h2>
                        <p className="text-sm text-gray-500">{patient.phone || 'Telefon yok'}</p>
                        <div className="flex gap-2 mt-1">
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                {patient.status || 'Aktif'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleCall}
                        className="flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 rounded-lg font-medium active:bg-green-100 transition-colors"
                    >
                        <Phone className="h-4 w-4" />
                        Ara
                    </button>
                    <button
                        onClick={handleMessage}
                        className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 rounded-lg font-medium active:bg-blue-100 transition-colors"
                    >
                        <MessageCircle className="h-4 w-4" />
                        Mesaj
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="sticky top-14 bg-white border-b border-gray-100 z-20 flex overflow-x-auto hide-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id as Tab);
                            triggerSelection();
                        }}
                        className={cn(
                            "flex items-center gap-2 px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                            activeTab === tab.id
                                ? "border-primary-600 text-primary-600"
                                : "border-transparent text-gray-600"
                        )}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 bg-gray-50 min-h-[50vh]">
                {activeTab === 'general' && (
                    <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-semibold text-gray-900 mb-3">İletişim Bilgileri</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-500">Telefon</label>
                                    <p className="text-sm font-medium">{patient.phone || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">E-posta</label>
                                    <p className="text-sm font-medium">{patient.email || '-'}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">TC Kimlik No</label>
                                    <p className="text-sm font-medium">{patient.tcNumber || '-'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-semibold text-gray-900 mb-3">Sistem Bilgileri</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-500">Kayıt Tarihi</label>
                                    <p className="text-sm font-medium">
                                        {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString() : '-'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'appointments' && (
                    <div className="text-center py-10 text-gray-500 text-sm">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        Randevu geçmişi yakında eklenecek
                    </div>
                )}

                {/* Other tabs placeholders */}
                {(activeTab === 'devices' || activeTab === 'sales') && (
                    <div className="text-center py-10 text-gray-500 text-sm">
                        Bu bölüm yapım aşamasında
                    </div>
                )}
            </div>
        </MobileLayout>
    );
};
