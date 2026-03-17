import React, { useState, useEffect } from 'react';
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
import { useNewActionStore } from '@/stores/newActionStore';

import { Appointment } from '@/types/appointment';

export const MobileAppointmentsPage: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showCreateModal, setShowCreateModal] = useState(false);
    const { appointments, loading } = useAppointments();
    const { triggerSelection } = useHaptic();

    const { triggered, resetNewAction } = useNewActionStore();

    useEffect(() => {
        if (triggered) {
            setShowCreateModal(true);
            resetNewAction();
        }
    }, [triggered, resetNewAction]);

    // Filter appointments for selected date
    const dailyAppointments = (appointments as Appointment[] || []).filter((apt) =>
        apt.startTime && isSameDay(new Date(apt.startTime), selectedDate)
    ).sort((a, b) => {
        const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
        const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
        return timeA - timeB;
    });

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
            case 'confirmed': return 'bg-success/10 text-success border-green-200 dark:border-green-800';
            case 'pending': return 'bg-warning/10 text-yellow-700 border-yellow-200 dark:text-yellow-400 dark:border-yellow-800';
            case 'cancelled': return 'bg-destructive/10 text-destructive border-red-200 dark:border-red-800';
            case 'completed': return 'bg-primary/10 text-primary border-blue-200 dark:border-blue-800';
            default: return 'bg-muted text-foreground border-border';
        }
    };

    return (
        <MobileLayout>
            <MobileHeader
                title="Ajanda"
                showBack={false}
                actions={
                    <button data-allow-raw="true" onClick={handleToday} className="text-primary-600 text-sm font-medium px-3 py-1.5 min-h-[44px] flex items-center">
                        Bugün
                    </button>
                }
            />

            {/* Date Navigation */}
            <div className="bg-white dark:bg-gray-900 border-b border-border p-4 sticky top-14 z-20 shadow-sm">
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-1">
                    <button data-allow-raw="true" onClick={handlePrevDay} className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-card dark:hover:bg-gray-700 hover:shadow-sm transition-all text-muted-foreground">
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div className="flex flex-col items-center">
                        <span className="text-base font-semibold text-gray-900 dark:text-white">
                            {format(selectedDate, 'd MMMM yyyy', { locale: tr })}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium">
                            {format(selectedDate, 'EEEE', { locale: tr })}
                        </span>
                    </div>

                    <button data-allow-raw="true" onClick={handleNextDay} className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl hover:bg-card dark:hover:bg-gray-700 hover:shadow-sm transition-all text-muted-foreground">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            {!loading && (
                <div className="px-4 pt-4 bg-gray-50 dark:bg-gray-950">
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { label: 'Toplam', value: (appointments as Appointment[] || []).filter(apt => apt.startTime && isSameDay(new Date(apt.startTime), selectedDate)).length, color: 'text-primary' },
                            { label: 'Tamamlanan', value: (appointments as Appointment[] || []).filter(apt => apt.startTime && isSameDay(new Date(apt.startTime), selectedDate) && apt.status === 'completed').length, color: 'text-success' },
                            { label: 'Bekleyen', value: (appointments as Appointment[] || []).filter(apt => apt.startTime && isSameDay(new Date(apt.startTime), selectedDate) && (apt.status as string) === 'pending').length, color: 'text-amber-600 dark:text-amber-400' },
                            { label: 'İptal', value: (appointments as Appointment[] || []).filter(apt => apt.startTime && isSameDay(new Date(apt.startTime), selectedDate) && apt.status === 'cancelled').length, color: 'text-destructive' },
                        ].map((stat, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-border">
                                <p className="text-xs text-muted-foreground">{stat.label}</p>
                                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Timeline Content */}
            <div className="p-4 pb-24 min-h-[calc(100vh-180px)] bg-gray-50 dark:bg-gray-950">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400" />
                    </div>
                ) : dailyAppointments.length > 0 ? (
                    <div className="space-y-4">
                        {dailyAppointments.map((apt) => {
                            const start = apt.startTime ? new Date(apt.startTime) : new Date();
                            const end = apt.endTime ? new Date(apt.endTime) : new Date();

                            return (
                                <div key={apt.id} className="flex gap-4">
                                    {/* Time Column */}
                                    <div className="flex flex-col items-center min-w-[3.5rem] pt-1 pt-1.5">
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                                            {format(start, 'HH:mm')}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {format(end, 'HH:mm')}
                                        </span>
                                        <div className="w-0.5 h-full bg-accent mt-2 rounded-full" />
                                    </div>

                                    {/* Card */}
                                    <div className={cn(
                                        "flex-1 p-4 rounded-xl border border-l-4 shadow-sm bg-white dark:bg-gray-900 dark:border-gray-800 active:scale-[0.98] transition-transform",
                                        getStatusColor(apt.status).replace('text-', 'border-l-') // Dynamic border color
                                    )}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold text-gray-900 dark:text-white truncate pr-2">
                                                {apt.partyName || apt.title || 'İsimsiz Randevu'}
                                            </h3>
                                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide", getStatusColor(apt.status))}>
                                                {apt.status === 'confirmed' ? 'Onaylı' :
                                                    (apt.status as string) === 'pending' ? 'Bekliyor' :
                                                        apt.status === 'cancelled' ? 'İptal' :
                                                            apt.status === 'completed' ? 'Tamamlandı' : apt.status}
                                            </span>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <User className="h-3.5 w-3.5" />
                                                <span>{apt.partyName || 'Hasta seçilmedi'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>{apt.duration || 30} dakika</span>
                                            </div>
                                            {apt.notes && (
                                                <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-2xl">
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
                            <CalendarIcon className="h-8 w-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Randevu Yok</h3>
                        <p className="text-muted-foreground text-sm mt-1 max-w-[200px]">
                            Bu tarih için planlanmış bir randevu bulunmuyor.
                        </p>
                        <button
                            data-allow-raw="true"
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
