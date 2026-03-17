import { Button } from '@x-ear/ui-web';
import { useState } from 'react';
import { AppointmentList, AppointmentCalendar, AppointmentModal } from '../components/appointments';
import { useAppointments } from '../hooks/useAppointments';
import { useTranslation } from 'react-i18next';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';


type ViewMode = 'list' | 'calendar';

export function DesktopAppointmentsPage() {
  const { t } = useTranslation('appointments');

  const { error, stats } = useAppointments();
  const [viewMode /*, _setViewMode */] = useState<ViewMode>('calendar');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  // const [_filters, _setFilters] = useState<AppointmentFilters>({});

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleCreateAppointment = () => {
    setShowCreateModal(true);
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setSelectedDate(undefined);
  };

  const getStatsCards = () => {
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 border dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">{t('stats.total')}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 border dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">{t('stats.completed')}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.completed || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 border dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">{t('stats.pending')}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {(stats.scheduled || 0) + (stats.confirmed || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6 border dark:border-gray-700">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-muted-foreground">{t('stats.cancelled_no_show')}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {(stats.cancelled || 0) + (stats.no_show || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <DesktopPageHeader
          className="mb-8"
          title={t('page_title')}
          description={t('page_subtitle')}
          eyebrow={{ tr: 'Randevular', en: 'Appointments' }}
          actions={(
            <Button
              onClick={handleCreateAppointment}
              className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium shadow-sm focus:outline-none bg-primary text-primary-foreground"
              variant='default'>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('new_appointment')}
            </Button>
          )}
        />

        {/* Error State */}
        {error && (
          <div className="mb-6 bg-destructive/10 border border-red-200 dark:border-red-800 rounded-xl p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-400">{t('error_title')}</h3>
                <div className="mt-2 text-sm text-destructive">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {getStatsCards()}

        {/* View Mode Toggle removed (calendar controls are inside the calendar component) */}

        {/* Main Content */}
        <div className="space-y-6">
          {viewMode === 'calendar' ? (
            <AppointmentCalendar
              onDateClick={handleDateClick}
              className="w-full"
              showCreateButton={false}
            />
          ) : (
            <AppointmentList
              className="w-full"
            />
          )}
        </div>

        {/* Create Appointment Modal */}
        <AppointmentModal
          isOpen={showCreateModal}
          onClose={handleModalClose}
          mode="create"
          initialDate={selectedDate}
        />
      </div>
    </div>
  );
}
