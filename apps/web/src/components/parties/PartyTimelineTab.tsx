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
  RefreshCw,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Party } from '@/types/party';
import { usePartyTimeline } from '@/hooks/party/usePartyTimeline';

interface PartyTimelineTabProps {
  party: Party;
  onPartyUpdate?: (party: Party) => void;
}

export const PartyTimelineTab: React.FC<PartyTimelineTabProps> = ({ party }) => {
  const { success: showSuccessToast, error: showErrorToast } = useToastHelpers();
  
  // Use backend timeline API
  const { timeline: backendTimeline, loading, error, fetchTimeline } = usePartyTimeline(party.id);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  // Use backend timeline data
  const allEvents = useMemo(() => {
    if (loading || !backendTimeline) return [];
    
    return (backendTimeline || []).map(event => ({
      id: event.id,
      type: event.eventType as any,
      title: event.title,
      description: event.description || '',
      date: event.timestamp || event.createdAt,
      icon: event.icon || '📝',
      priority: 'medium' as const,
      category: event.category || 'General',
      metadata: event.details || event.metadata
    }));
  }, [backendTimeline, loading]);

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
      await fetchTimeline();
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



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Hasta Geçmişi</h3>
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
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Başlangıç Tarihi
                  </label>
                  <Input
                    type="date"
                    value={dateRange?.start || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value, end: prev?.end || '' }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
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
      {loading ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600 animate-spin" />
              <p className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">Yükleniyor...</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="text-center py-8">
            <div className="text-red-500">
              <p className="text-lg font-medium mb-2">Hata oluştu</p>
              <p className="text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : Object.keys(groupedEvents).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date} className="relative">
              {/* Date Header */}
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-3 h-3 bg-blue-600 rounded-full"></div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{date}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{dayEvents.length} olay</p>
                </div>
              </div>

              {/* Events for this date */}
              <div className="ml-7 space-y-4">
                {dayEvents.map((event) => (
                  <Card key={event.id} className="border-l-4 border-l-blue-500 dark:bg-gray-800 dark:border-gray-700">
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
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white">{event.title}</h5>
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
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{event.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatTime(event.date)}
                              </span>
                            </div>

                            {/* Expanded metadata */}
                            {expandedEvents.has(event.id) && event.metadata && (
                              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                <h6 className="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">Detaylar</h6>
                                <div className="space-y-1">
                                  {Object.entries(event.metadata).map(([key, value]) => {
                                    const keyMapping: Record<string, string> = {
                                      author: 'Ekleyen',
                                      type: 'Tür',
                                      isPrivate: 'Gizli Not',
                                      serialNumber: 'Seri No',
                                      price: 'Fiyat',
                                      status: 'Durum',
                                      notes: 'Notlar',
                                      description: 'Açıklama',
                                      paymentMethod: 'Ödeme Yöntemi',
                                      amount: 'Tutar',
                                      currency: 'Para Birimi',
                                      priority: 'Öncelik',
                                      category: 'Kategori'
                                    };

                                    // Format boolean values
                                    let displayValue = String(value);
                                    if (typeof value === 'boolean') {
                                      displayValue = value ? 'Evet' : 'Hayır';
                                    }

                                    return (
                                      <div key={key} className="flex justify-between text-xs">
                                        <span className="text-gray-500 dark:text-gray-400">{keyMapping[key] || key}:</span>
                                        <span className="text-gray-700 dark:text-gray-300">{displayValue}</span>
                                      </div>
                                    );
                                  })}
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
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="text-center py-8">
            <div className="text-gray-500 dark:text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium mb-2 text-gray-900 dark:text-gray-100">Olay bulunamadı</p>
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