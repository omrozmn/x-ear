import React, { useState, useMemo } from 'react';
import { usePatientTimeline } from '../hooks/patient/usePatientTimeline';
import { PatientTimelineCard } from './patient/PatientTimelineCard';
import { LoadingSkeleton } from './common/LoadingSkeleton';
import { ErrorBoundary } from './common/ErrorBoundary';
import { Activity, AlertCircle, Calendar, User, DollarSign, Search, Filter } from 'lucide-react';

interface PatientTimelineTabProps {
  patientId: string;
  tabCount?: number;
}

export const PatientTimelineTab: React.FC<PatientTimelineTabProps> = ({
  patientId,
  tabCount
}) => {
  const { timeline, isLoading: timelineLoading, error: timelineError } = usePatientTimeline(patientId);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

  // Filter and search logic
  const filteredTimeline = useMemo(() => {
    let filtered = timeline;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.eventType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.details?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Event type filter
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(event => event.eventType === eventTypeFilter);
    }

    // Date range filter
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(event => event.timestamp && new Date(event.timestamp) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(event => event.timestamp && new Date(event.timestamp) <= endDate);
    }

    return filtered;
  }, [timeline, searchTerm, eventTypeFilter, dateRange]);

  if (timelineLoading) {
    return (
      <div className="p-6" role="status" aria-label="Zaman çizelgesi yükleniyor">
        <LoadingSkeleton lines={4} className="mb-4" />
        <div className="space-y-4">
          <div className="h-24 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-24 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-24 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (timelineError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" role="alert">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400" aria-hidden="true" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Zaman çizelgesi yüklenirken hata oluştu</h3>
              <p className="mt-1 text-sm text-red-700">
                {typeof timelineError === 'string' ? timelineError : timelineError.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleEventClick = (event: any) => {
    // TODO: Implement event detail modal or navigation
    console.log('Event clicked:', event);
  };

  // Sort timeline by date (newest first)
  const sortedTimeline = [...filteredTimeline].sort((a, b) =>
    new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()
  );

  // Calculate statistics
  const eventTypeCounts = timeline.reduce((acc, event) => {
    acc[event.eventType] = (acc[event.eventType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const recentEvents = timeline.filter(event =>
    new Date(event.eventDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Activity className="w-5 h-5 mr-2" aria-hidden="true" />
          Zaman Çizelgesi {tabCount !== undefined && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {tabCount}
            </span>
          )}
        </h3>
        {timeline.length > 0 && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Son 30 Gün</p>
            <p className="text-lg font-semibold text-blue-600">{recentEvents} olay</p>
          </div>
        )}
      </div>

      {timeline.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Activity className="w-5 h-5 text-blue-500 mr-2" />
              <div>
                <p className="text-sm text-blue-600">Toplam Olay</p>
                <p className="text-lg font-semibold text-blue-900">{timeline.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm text-green-600">Son 30 Gün</p>
                <p className="text-lg font-semibold text-green-900">{recentEvents}</p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <User className="w-5 h-5 text-purple-500 mr-2" />
              <div>
                <p className="text-sm text-purple-600">Randevu</p>
                <p className="text-lg font-semibold text-purple-900">{eventTypeCounts['appointment'] || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-orange-500 mr-2" />
              <div>
                <p className="text-sm text-orange-600">Satış</p>
                <p className="text-lg font-semibold text-orange-900">{eventTypeCounts['sale'] || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Olay ara..."
            className="block w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tüm Olay Türleri</option>
            <option value="appointment">Randevu</option>
            <option value="sale">Satış</option>
            <option value="device_assignment">Cihaz Atama</option>
            <option value="note">Not</option>
            <option value="document">Doküman</option>
          </select>
          <input
            type="date"
            placeholder="Başlangıç tarihi"
            className="px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          />
          <input
            type="date"
            placeholder="Bitiş tarihi"
            className="px-3 py-2 text-sm border rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          />
        </div>
      </div>

      {filteredTimeline.length === 0 ? (
        <div className="text-center py-12" role="status">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {timeline.length === 0 ? 'Henüz olay yok' : 'Filtreye uygun olay bulunamadı'}
          </h3>
          <p className="text-gray-500">
            {timeline.length === 0
              ? 'Bu hastayla ilgili henüz hiçbir olay kaydedilmemiş.'
              : 'Arama kriterlerinizi değiştirerek daha fazla sonuç görebilirsiniz.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4" role="list" aria-label="Hasta zaman çizelgesi">
          {sortedTimeline.map((event) => (
            <div key={event.id} role="listitem">
              <PatientTimelineCard
                event={event}
                onEventClick={handleEventClick}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};