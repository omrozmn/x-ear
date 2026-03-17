
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Plus, Edit, X, Check, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button, Badge, Input, Textarea, Select, DatePicker } from '@x-ear/ui-web';
import { Party } from '../../types/party';
import { listPartyAppointments } from '@/api/client/parties.client';
import {
  createAppointment,
  createAppointmentCancel,
  createAppointmentComplete
} from '@/api/client/appointments.client';
import { formatDateForInput } from '@/utils/date';
import type {
  AppointmentRead,
  AppointmentCreate,
  ResponseEnvelopeListAppointmentRead
} from '@/api/generated/schemas';

interface PartyAppointmentsTabProps {
  party: Party;
  onPartyUpdate: (party: Party) => void;
}

export const PartyAppointmentsTab: React.FC<PartyAppointmentsTabProps> = ({ party }) => {
  const { t } = useTranslation(['parties_extra', 'patients', 'common']);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    search: ''
  });
  const [newAppointmentDate, setNewAppointmentDate] = useState<Date | null>(null);

  // Load appointments for this party
  const loadAppointments = useCallback(async () => {
    if (!party.id) return;

    setLoading(true);
    setError(null);

    try {
      // const params: AppointmentsGetAppointmentsParams = {
      // party_id: party.id,
      // page: 1,
      // per_page: 20
      // };

      const response: ResponseEnvelopeListAppointmentRead = await listPartyAppointments(party.id);

      // Handle response envelope or direct array
      const appointmentsData = response?.data || [];
      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
    } catch (err) {
      console.error('Error loading appointments:', err);
      setError('Randevular yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [party.id]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Filter appointments based on current filters
  const filteredAppointments = appointments.filter(appointment => {
    if (filters.status !== 'all' && appointment.status !== filters.status) {
      return false;
    }

    if (filters.search && !appointment.notes?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    return true;
  });

  const handleNewAppointment = async (appointmentData: AppointmentCreate) => {
    try {
      const createBody: AppointmentCreate = {
        ...appointmentData,
        // Ensure fields match schema
      };
      await createAppointment(createBody);
      await loadAppointments();
      window.dispatchEvent(new CustomEvent('dashboard:refresh'));
      window.dispatchEvent(new CustomEvent('party-timeline:refresh', {
        detail: { partyId: party.id }
      }));
      setShowBookingForm(false);
    } catch (err) {
      console.error('Error creating appointment:', err);
      setError('Randevu oluşturulurken hata oluştu');
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    // reason parameter removed - not used by API endpoint
    try {
      // Cancel endpoint might not body or might expect different structure. 
      // Checking generated code: createAppointmentCancel(appointmentId) takes no body?? 
      // Wait, generated code line 493 takes only appointmentId and signal. 
      // It does NOT take a body. So reason is lost or passed differently?
      // Assuming no body for now based on generated code.
      await createAppointmentCancel(appointmentId);
      await loadAppointments();
    } catch (err) {
      console.error('Error canceling appointment:', err);
      setError('Randevu iptal edilirken hata oluştu');
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    try {
      // Complete endpoint takes only appointmentId
      await createAppointmentComplete(appointmentId);
      await loadAppointments();
    } catch (err) {
      console.error('Error completing appointment:', err);
      setError('Randevu tamamlanırken hata oluştu');
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-primary/10 text-blue-800">Planlandı</Badge>;
      case 'confirmed':
        return <Badge className="bg-success/10 text-success">Onaylandı</Badge>;
      case 'completed':
        return <Badge className="bg-muted text-foreground">Tamamlandı</Badge>;
      case 'cancelled':
        return <Badge className="bg-destructive/10 text-red-800">İptal</Badge>;
      case 'no_show':
        return <Badge className="bg-orange-100 text-orange-800">Gelmedi</Badge>;
      default:
        return <Badge className="bg-muted text-foreground">Bilinmiyor</Badge>;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-primary" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Randevular yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-foreground">Randevular</h3>
          <p className="text-sm text-muted-foreground">
            {filteredAppointments.length} randevu bulundu
          </p>
        </div>
        <Button
          onClick={() => setShowBookingForm(true)}
          className="premium-gradient tactile-press text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Randevu
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card p-3 md:p-4 rounded-xl md:rounded-2xl shadow-sm border">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-foreground mb-1">Durum</label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              options={[
                { value: 'all', label: 'Tümü' },
                { value: 'scheduled', label: 'Planlandı' },
                { value: 'confirmed', label: 'Onaylandı' },
                { value: 'completed', label: 'Tamamlandı' },
                { value: 'cancelled', label: 'İptal' },
                { value: 'no_show', label: 'Gelmedi' }
              ]}
            />
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-foreground mb-1">Tarih</label>
            <DatePicker
              value={filters.dateRange === 'all' ? null : new Date(filters.dateRange)}
              onChange={(date) => setFilters(prev => ({ ...prev, dateRange: date ? formatDateForInput(date) : 'all' }))}
              placeholder="Tarih"
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs md:text-sm font-medium text-foreground mb-1">Arama</label>
            <Input
              type="text"
              placeholder="Notlarda ara..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/10 border border-red-200 rounded-xl p-4">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Appointments List */}
      <div className="space-y-4">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((appointment) => (
            <div key={appointment.id} className="bg-card border rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(appointment.status)}
                    <div>
                      <p className="font-medium text-foreground">
                        {appointment.date} - {appointment.time}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Süre: {appointment.duration || 30} dakika
                      </p>
                    </div>
                    {getStatusBadge(appointment.status)}
                  </div>

                  {appointment.appointmentType && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>Tür:</strong> {appointment.appointmentType}
                    </p>
                  )}

                  {appointment.clinicianId && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>Doktor:</strong> {appointment.clinicianId}
                    </p>
                  )}

                  {appointment.notes && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Notlar:</strong> {appointment.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {appointment.status === 'scheduled' && (
                    <>
                      <Button
                        onClick={() => appointment.id && handleConfirmAppointment(appointment.id)}
                        className="p-2 text-success hover:bg-success/10"
                        title="Tamamla"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => appointment.id && handleCancelAppointment(appointment.id)}
                        className="p-2 text-destructive hover:bg-destructive/10"
                        title="İptal Et"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    className="p-2 text-muted-foreground hover:bg-muted"
                    title="Düzenle"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>{filters.status !== 'all' || filters.dateRange !== 'all' ? 'Filtre kriterlerine uygun randevu bulunamadı.' : 'Henüz randevu bulunmamaktadır.'}</p>
          </div>
        )}
      </div>

      {/* New Appointment Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Yeni Randevu</h3>
              <Button
                onClick={() => setShowBookingForm(false)}
                className="p-1 text-muted-foreground hover:text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const appointmentData: AppointmentCreate = {
                partyId: party.id || '',
                date: newAppointmentDate ? formatDateForInput(newAppointmentDate) : '',
                time: formData.get('time') as string,
                duration: parseInt(formData.get('duration') as string) || 30,
                // appointmentType: (formData.get('type') as any) || 'General',
                notes: formData.get('notes') as string,
                status: 'scheduled'
              };
              handleNewAppointment(appointmentData);
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Tarih</label>
                  <DatePicker
                    value={newAppointmentDate}
                    onChange={setNewAppointmentDate}
                    required
                    fullWidth
                    placeholder="GG/AA/YYYY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Saat</label>
                  <Input type="time" name="time" required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Süre (dakika)</label>
                  <Input type="number" name="duration" defaultValue="30" min="15" max="180" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Randevu Türü</label>
                  <Input type="text" name="type" placeholder="Kontrol, Muayene, vb." />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Notlar</label>
                  <Textarea name="notes" rows={3} placeholder="Randevu notları..." />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  onClick={() => setShowBookingForm(false)}
                  className="px-4 py-2 text-foreground bg-muted hover:bg-accent rounded-xl"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="px-4 py-2 premium-gradient tactile-press text-white rounded-xl"
                >
                  Randevu Oluştur
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
