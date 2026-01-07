import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { FloatingActionButton } from '@/components/mobile/FloatingActionButton';
import { useAppointments } from '@/hooks/useAppointments';
import { AppointmentModal } from '@/components/appointments';
import { format, addDays, subDays, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';

export const MobileAppointmentsPage: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { appointments, loading } = useAppointments();
    const { triggerSelection } = useHaptic();

    // Filter appointments for selected date
    const dailyAppointments = (appointments || []).filter((apt: any) =>
        isSameDay(new Date(apt.startTime), selectedDate)
    ).sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const handlePrevDay = () => {
        setSelectedDate(prev => subDays(prev, 1));
        triggerSelection();
    };

    const handleNextDay = () => {
        setSelectedDate(prev => addDays(prev, 1));
        triggerSelection();
    };

    const handleToday = () => {
        setSelectedDate(new Date());
        triggerSelection();
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'confirmed': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
            case 'cancelled': return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
            case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
            default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
        }
    };

    return (
        <MobileLayout>
            <MobileHeader
                title="Ajanda"
                showBack={false}
                actions={
                    <button onClick={handleToday} className="text-primary-600 text-sm font-medium px-2">
                        Bugün
                    </button>
                }
            />

            {/* Date Navigation */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4 sticky top-14 z-20 shadow-sm">
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-1">
                    <button onClick={handlePrevDay} className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm transition-all text-gray-600 dark:text-gray-400">
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="flex flex-col items-center">
                        <span className="text-base font-semibold text-gray-900 dark:text-white">
                            {format(selectedDate, 'd MMMM yyyy', { locale: tr })}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {format(selectedDate, 'EEEE', { locale: tr })}
                        </span>
                    </div>

                    <button onClick={handleNextDay} className="p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm transition-all text-gray-600 dark:text-gray-400">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Timeline Content */}
            <div className="p-4 pb-24 min-h-[calc(100vh-180px)] bg-gray-50 dark:bg-gray-950">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400" />
                    </div>
                ) : dailyAppointments.length > 0 ? (
                    <div className="space-y-4">
                        {dailyAppointments.map((apt: any) => {
                            const start = new Date(apt.startTime);
                            const end = new Date(apt.endTime);

                            return (
                                <div key={apt.id} className="flex gap-4">
                                    {/* Time Column */}
                                    <div className="flex flex-col items-center min-w-[3.5rem] pt-1 pt-1.5">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {format(start, 'HH:mm')}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {format(end, 'HH:mm')}
                                        </span>
                                        <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-800 mt-2 rounded-full" />
                                    </div>

                                    {/* Card */}
                                    <div className={cn(
                                        "flex-1 p-4 rounded-xl border border-l-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 active:scale-[0.98] transition-transform",
                                        getStatusColor(apt.status).replace('text-', 'border-l-') // Dynamic border color
                                    )}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate pr-2">
                                                {apt.patientName || apt.title || 'İsimsiz Randevu'}
                                            </h3>
                                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide", getStatusColor(apt.status))}>
                                                {apt.status === 'confirmed' ? 'Onaylı' :
                                                    apt.status === 'pending' ? 'Bekliyor' :
                                                        apt.status === 'cancelled' ? 'İptal' :
                                                            apt.status === 'completed' ? 'Tamamlandı' : apt.status}
                                            </span>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <User className="h-3.5 w-3.5" />
                                                <span>{apt.patientName || 'Hasta seçilmedi'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>{apt.duration || 30} dakika</span>
                                            </div>
                                            {apt.notes && (
                                                <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-lg">
                                                    <span className="italic line-clamp-2">{apt.notes}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-sm mb-4">
                            <CalendarIcon className="h-8 w-8 text-gray-300 dark:text-gray-500" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Randevu Yok</h3>
                        <p className="text-gray-500 text-sm mt-1 max-w-[200px]">
                            Bu tarih için planlanmış bir randevu bulunmuyor.
                        </p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="mt-6 text-primary-600 font-medium text-sm hover:underline"
                        >
                            + Yeni Randevu Oluştur
                        </button>
                    </div>
                )}
            </div>

            <FloatingActionButton
                onClick={() => setShowCreateModal(true)}
            />

            {/* Appointment Modal */}
            <AppointmentModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                mode="create"
                initialDate={selectedDate.toISOString()} // Pass selected date string
            />
        </MobileLayout>
    );
};
