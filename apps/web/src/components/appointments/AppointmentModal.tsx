import { Button } from '@x-ear/ui-web';
import React, { useState } from 'react';
import { Appointment, AppointmentStatus } from '../../types/appointment';
import { useAppointments } from '../../hooks/useAppointments';
import { AppointmentForm } from './AppointmentForm';
import { useTranslation } from 'react-i18next';

interface AppointmentModalProps {
  appointment?: Appointment;
  isOpen: boolean;
  onClose: () => void;
  mode?: 'view' | 'edit' | 'create';
  partyId?: string;
  initialDate?: string;
  initialTime?: string;
  quickAppointmentData?: { date: string; time: string } | null;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  appointment,
  isOpen,
  onClose,
  mode = 'view',
  partyId,
  initialDate,
  initialTime
}) => {
  const { updateAppointment, deleteAppointment, updating, deleting } = useAppointments();
  const [currentMode, setCurrentMode] = useState(mode);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { t } = useTranslation(['appointments', 'common']);

  // Keep internal currentMode in sync when parent changes the `mode` prop
  React.useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  if (!isOpen) return null;

  const getStatusColor = (status: AppointmentStatus): string => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      no_show: 'bg-orange-100 text-orange-800',
      rescheduled: 'bg-yellow-100 text-yellow-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: AppointmentStatus): string => {
    return t(`status.${status}`);
  };

  const getTypeLabel = (type: string): string => {
    return t(`types.${type}`);
  };

  const formatDate = (date: string): string => {
    return new Date(date).toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string): string => {
    return time.substring(0, 5); // HH:MM format
  };

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    if (!appointment) return;

    try {
      await updateAppointment(appointment.id, { status: newStatus });
      // Modal will be updated via the hook's state management
    } catch (error) {
      console.error('Failed to update appointment status:', error);
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;

    try {
      await deleteAppointment(appointment.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete appointment:', error);
    }
  };

  const handleSave = () => {
    if (currentMode === 'create') {
      onClose();
    } else {
      setCurrentMode('view');
    }
    // The appointment will be updated via the hook's state management
  };

  const handleCancel = () => {
    if (currentMode === 'create') {
      onClose();
    } else {
      setCurrentMode('view');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Background overlay */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative bg-white dark:bg-slate-800 rounded-lg text-left shadow-xl transform transition-all sm:max-w-2xl sm:w-full max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 px-4 py-3 border-b border-gray-200 dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              {currentMode === 'create' && t('modal.title_create')}
              {currentMode === 'edit' && t('modal.title_edit')}
              {currentMode === 'view' && t('modal.title_view')}
            </h3>
            <Button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              variant='default'>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Content - Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {currentMode === 'view' && appointment ? (
            <div className="space-y-6">
              {/* Party Info */}
              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">{t('modal.patient_info')}</h4>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{appointment.partyName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">ID: {appointment.partyId}</p>
              </div>

              {/* Appointment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modal.date')}</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(appointment.date)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modal.time')}</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{formatTime(appointment.time)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modal.duration')}</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{appointment.duration} dakika</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modal.type')}</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{getTypeLabel(appointment.type)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modal.status')}</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(appointment.status)}`}>
                    {getStatusLabel(appointment.status)}
                  </span>
                </div>
                {appointment.clinician && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modal.doctor')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{appointment.clinician}</p>
                  </div>
                )}
                {appointment.location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modal.location')}</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{appointment.location}</p>
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modal.title')}</label>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{appointment.title}</p>
              </div>

              {/* Notes */}
              {appointment.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modal.notes')}</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{appointment.notes}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>{t('modal.created_at')}: {new Date(appointment.createdAt).toLocaleString('tr-TR')}</p>
                {appointment.updatedAt !== appointment.createdAt && (
                  <p>{t('modal.updated_at')}: {new Date(appointment.updatedAt).toLocaleString('tr-TR')}</p>
                )}
              </div>

              {/* Quick Status Actions */}
              {!['completed', 'cancelled'].includes(appointment.status) && (
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{t('modal.quick_actions')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {appointment.status !== 'confirmed' && (
                      <Button
                        onClick={() => handleStatusChange('confirmed')}
                        disabled={updating}
                        className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
                        variant='default'>
                        {t('modal.actions.confirm')}
                      </Button>
                    )}
                    <Button
                      onClick={() => handleStatusChange('completed')}
                      disabled={updating}
                      className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                      variant='default'>
                      {t('modal.actions.complete')}
                    </Button>
                    <Button
                      onClick={() => handleStatusChange('no_show')}
                      disabled={updating}
                      className="px-3 py-1 text-xs font-medium text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 rounded-full hover:bg-orange-200 dark:hover:bg-orange-900/50 disabled:opacity-50"
                      variant='default'>
                      {t('modal.actions.no_show')}
                    </Button>
                    <Button
                      onClick={() => handleStatusChange('rescheduled')}
                      disabled={updating}
                      className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full hover:bg-yellow-200 dark:hover:bg-yellow-900/50 disabled:opacity-50"
                      variant='default'>
                      {t('modal.actions.reschedule')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <AppointmentForm
              appointment={currentMode === 'edit' ? appointment : undefined}
              partyId={partyId}
              initialDate={initialDate}
              initialTime={initialTime}
              mode={currentMode === 'create' ? 'create' : 'edit'}
              onSave={handleSave}
              onCancel={handleCancel}
              className="h-full"
            />
          )}
        </div>

        {/* Footer Actions for View Mode */}
        {currentMode === 'view' && appointment && (
          <div className="bg-gray-50 dark:bg-slate-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 dark:border-slate-600 flex-shrink-0">
            <Button
              onClick={() => setCurrentMode('edit')}
              variant='primary'>
              {t('list.actions.edit')}
            </Button>
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-3 sm:mt-0 sm:mr-3 text-red-700 hover:bg-red-50"
              variant='outline'>
              {t('list.actions.delete')}
            </Button>
            <Button
              onClick={onClose}
              className="mt-3 sm:mt-0 sm:mr-3"
              variant='outline'>
              {t('modal.actions.close')}
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {t('modal.delete_title')}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {t('modal.delete_confirm')}
                      </p>
                      {appointment && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                          <p className="text-sm font-medium text-gray-900">{appointment.partyName}</p>
                          <p className="text-sm text-gray-600">{formatDate(appointment.date)} - {formatTime(appointment.time)}</p>
                          <p className="text-sm text-gray-600">{appointment.title}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  variant='default'>
                  {deleting ? t('modal.actions.deleting') : t('modal.actions.delete')}
                </Button>
                <Button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
                  variant='default'>
                  {t('cancel', { ns: 'common' })}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};