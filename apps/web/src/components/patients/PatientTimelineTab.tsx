import * as React from 'react';
const { useState, useMemo } = React;
import { Button, Input, Badge } from '@x-ear/ui-web';
import { Card, CardContent, CardHeader, CardTitle } from '@x-ear/ui-web';
import { useToastHelpers } from '@x-ear/ui-web';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Phone, 
  CreditCard, 
  Stethoscope,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Download
} from 'lucide-react';
import { Patient } from '@/types/patient';

interface TimelineEvent {
  id: string;
  type: 'registration' | 'note' | 'appointment' | 'device' | 'payment' | 'document' | 'sms' | 'sgk' | 'sale' | 'label' | 'ereceipt' | 'profile' | 'call';
  title: string;
  description: string;
  date: string;
  icon: string;
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  metadata?: Record<string, unknown>;
}

interface PatientTimelineTabProps {
  patient: Patient;
  onPatientUpdate?: (patient: Patient) => void;
}

export const PatientTimelineTab: React.FC<PatientTimelineTabProps> = ({ patient, onPatientUpdate: _onPatientUpdate }) => {
  const { success: showSuccessToast, error: showErrorToast } = useToastHelpers();
  
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Collect events from patient data
  const allEvents = useMemo(() => {
    const events: TimelineEvent[] = [];

    // Registration event
    if (patient.createdAt) {
      events.push({
        id: 'registration',
        type: 'registration',
        title: 'Hasta Kaydı Oluşturuldu',
        description: 'Hasta sistemde kayıt edildi',
        date: patient.createdAt,
        icon: '👤',
        priority: 'high',
        category: 'System'
      });
    }

    // Notes events
    if (patient.notes) {
      patient.notes.forEach((note, index) => {
        events.push({
          id: `note-${index}`,
          type: 'note',
          title: 'Not Eklendi',
          description: note.text?.substring(0, 100) + (note.text?.length > 100 ? '...' : ''),
          date: note.date,
          icon: '📝',
          priority: note.type === 'clinical' ? 'high' : 'medium',
          category: 'Clinical',
          metadata: { author: note.author, type: note.type, isPrivate: note.isPrivate }
        });
      });
    }

    // Appointment events
    if (patient.appointments) {
      patient.appointments.forEach((appointment, index) => {
        events.push({
          id: `appointment-${index}`,
          type: 'appointment',
          title: 'Randevu',
          description: `${appointment.status === 'scheduled' ? 'Planlandı' : appointment.status === 'completed' ? 'Tamamlandı' : 'İptal Edildi'}${appointment.note ? ` - ${appointment.note}` : ''}`,
          date: appointment.date,
          icon: '📅',
          priority: appointment.status === 'scheduled' ? 'high' : 'medium',
          category: 'Appointments'
        });
      });
    }

    // Device events
    if (patient.devices) {
      patient.devices.forEach((device, index) => {
        events.push({
          id: `device-${index}`,
          type: 'device',
          title: device.status === 'trial' ? 'Cihaz Denemesi' : 'Cihaz Ataması',
          description: `${device.brand} ${device.model} - ${device.side === 'right' ? 'Sağ' : device.side === 'left' ? 'Sol' : 'İki'} Kulak`,
          date: device.purchaseDate || patient.createdAt || '',
          icon: '🔊',
          priority: 'high',
          category: 'Devices',
          metadata: { serialNumber: device.serialNumber, type: device.type, price: device.price }
        });
      });
    }

    // Payment events
    if (patient.sales) {
      patient.sales.forEach((sale, index) => {
        events.push({
          id: `payment-${index}`,
          type: 'payment',
          title: 'Ödeme',
          description: `₺${sale.totalAmount} - ${sale.paymentMethod || 'Belirtilmemiş'}`,
          date: sale.saleDate || sale.createdAt || patient.createdAt || '',
          icon: '💰',
          priority: 'high',
          category: 'Financial'
        });
      });
    }

    // Communication events (SMS, calls, etc.)
    if (patient.communications) {
      patient.communications.forEach((comm, index) => {
        events.push({
          id: `comm-${index}`,
          type: comm.type as TimelineEvent['type'],
          title: `${comm.type.toUpperCase()} ${comm.direction === 'outbound' ? 'Gönderildi' : 'Alındı'}`,
          description: comm.content?.substring(0, 50) + (comm.content?.length > 50 ? '...' : ''),
          date: comm.timestamp || comm.date || '',
          icon: comm.type === 'sms' ? '📱' : comm.type === 'call' ? '📞' : '📧',
          priority: 'medium',
          category: 'Communication'
        });
      });
    }

    // SGK events
    if (patient.sgkWorkflow?.statusHistory) {
      patient.sgkWorkflow.statusHistory.forEach((status, index) => {
        events.push({
          id: `sgk-${index}`,
          type: 'sgk',
          title: 'SGK Durum Güncellendi',
          description: `Durum: ${status.status}${status.notes ? ` - ${status.notes}` : ''}`,
          date: status.timestamp,
          icon: '🏥',
          priority: 'high',
          category: 'SGK'
        });
      });
    }

    // E-receipt events
    if (patient.ereceiptHistory) {
      patient.ereceiptHistory.forEach((receipt, index) => {
        events.push({
          id: `ereceipt-${index}`,
          type: 'ereceipt',
          title: 'E-Reçete Kaydedildi',
          description: `Reçete #${receipt.receiptNumber} - ₺${receipt.totalAmount}`,
          date: receipt.date,
          icon: '💊',
          priority: 'medium',
          category: 'Medical'
        });
      });
    }

    // Reports events
    if (patient.reports) {
      patient.reports.forEach((report, index) => {
        events.push({
          id: `report-${index}`,
          type: 'document',
          title: 'Rapor Eklendi',
          description: `${report.title} - ${report.type}`,
          date: report.createdAt,
          icon: '📄',
          priority: report.type === 'medical' ? 'high' : 'medium',
          category: 'Medical'
        });
      });
    }

    return events;
  }, [patient]);

  // Filter events based on search and filters
  const filteredEvents = useMemo(() => {
    let filtered = allEvents;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Event type filter
    if (selectedEventTypes.length > 0) {
      filtered = filtered.filter(event => selectedEventTypes.includes(event.type));
    }

    // Date range filter
    if (dateRange) {
      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        return eventDate >= startDate && eventDate <= endDate;
      });
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allEvents, searchTerm, selectedEventTypes, dateRange]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    return filteredEvents.reduce((groups, event) => {
      const date = formatDate(event.date);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
      return groups;
    }, {} as Record<string, TimelineEvent[]>);
  }, [filteredEvents]);

  // Event type options for filter
  const eventTypeOptions = [
    { value: 'registration', label: 'Kayıt', icon: '👤' },
    { value: 'note', label: 'Notlar', icon: '📝' },
    { value: 'appointment', label: 'Randevular', icon: '📅' },
    { value: 'device', label: 'Cihazlar', icon: '🔊' },
    { value: 'payment', label: 'Ödemeler', icon: '💰' },
    { value: 'sms', label: 'SMS', icon: '📱' },
    { value: 'call', label: 'Aramalar', icon: '📞' },
    { value: 'sgk', label: 'SGK', icon: '🏥' },
    { value: 'ereceipt', label: 'E-Reçete', icon: '💊' },
    { value: 'document', label: 'Belgeler', icon: '📄' }
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Simulate refresh - in real app, this would refetch patient data
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSuccessToast('Timeline yenilendi');
    } catch (error) {
      showErrorToast('Timeline yenilenirken hata oluştu');
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return 'Tarih belirtilmemiş';
      }
      return date.toLocaleDateString('tr-TR');
    } catch {
      return 'Tarih belirtilmemiş';
    }
  };

  const formatTime = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Hasta Geçmişi</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-sm">
            {filteredEvents.length} olay
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Filtreler</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {isFilterOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Olaylarda ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Expandable filters */}
          {isFilterOpen && (
            <div className="space-y-4">
              {/* Event type filter */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Olay Türleri
                </label>
                <div className="flex flex-wrap gap-2">
                  {eventTypeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={selectedEventTypes.includes(option.value) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedEventTypes(prev => 
                          prev.includes(option.value)
                            ? prev.filter(t => t !== option.value)
                            : [...prev, option.value]
                        );
                      }}
                    >
                      <span className="mr-1">{option.icon}</span>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date range filter */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Başlangıç Tarihi
                  </label>
                  <Input
                    type="date"
                    value={dateRange?.start || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value, end: prev?.end || '' }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Bitiş Tarihi
                  </label>
                  <Input
                    type="date"
                    value={dateRange?.end || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value, start: prev?.start || '' }))}
                  />
                </div>
              </div>

              {/* Clear filters */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedEventTypes([]);
                  setDateRange(null);
                }}
              >
                Filtreleri Temizle
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      {Object.keys(groupedEvents).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date} className="relative">
              {/* Date Header */}
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-3 h-3 bg-blue-600 rounded-full"></div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-gray-900">{date}</h4>
                  <p className="text-xs text-gray-500">{dayEvents.length} olay</p>
                </div>
              </div>

              {/* Events for this date */}
              <div className="ml-7 space-y-4">
                {dayEvents.map((event) => (
                  <Card key={event.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                              {event.icon}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h5 className="text-sm font-medium text-gray-900">{event.title}</h5>
                              {event.priority && (
                                <Badge className={`text-xs ${getPriorityColor(event.priority)}`}>
                                  {event.priority}
                                </Badge>
                              )}
                              {event.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {event.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTime(event.date)}
                              </span>
                            </div>
                            
                            {/* Expanded metadata */}
                            {expandedEvents.has(event.id) && event.metadata && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                                <h6 className="text-xs font-medium text-gray-700 mb-2">Detaylar</h6>
                                <div className="space-y-1">
                                  {Object.entries(event.metadata).map(([key, value]) => (
                                    <div key={key} className="flex justify-between text-xs">
                                      <span className="text-gray-500 capitalize">{key}:</span>
                                      <span className="text-gray-700">{String(value)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center space-x-1 ml-2">
                          {event.metadata && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleEventExpansion(event.id)}
                            >
                              {expandedEvents.has(event.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">Olay bulunamadı</p>
              <p className="text-sm">
                {searchTerm || selectedEventTypes.length > 0 || dateRange
                  ? 'Filtrelerinizi değiştirmeyi deneyin'
                  : 'Henüz hasta geçmişi bulunmamaktadır'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};