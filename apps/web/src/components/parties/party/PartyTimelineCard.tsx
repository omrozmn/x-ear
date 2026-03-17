import React from 'react';
import { TimelineEvent } from '../../../hooks/party/usePartyTimeline';
import {
  Calendar,
  User,
  FileText,
  Smartphone,
  DollarSign,
  Stethoscope,
  CreditCard,
  MessageSquare,
  Activity
} from 'lucide-react';

interface PartyTimelineCardProps {
  event: TimelineEvent;
  onEventClick?: (event: TimelineEvent) => void;
}

export const PartyTimelineCard: React.FC<PartyTimelineCardProps> = ({
  event,
  onEventClick
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'appointment':
        return <Calendar className="w-4 h-4" />;
      case 'sale':
        return <DollarSign className="w-4 h-4" />;
      case 'device_assignment':
        return <Smartphone className="w-4 h-4" />;
      case 'note':
        return <MessageSquare className="w-4 h-4" />;
      case 'test':
      case 'hearing_test':
        return <Stethoscope className="w-4 h-4" />;
      case 'payment':
        return <CreditCard className="w-4 h-4" />;
      case 'document':
        return <FileText className="w-4 h-4" />;
      case 'activity':
        return <Activity className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'appointment':
        return 'bg-primary/10 text-blue-800';
      case 'sale':
        return 'bg-success/10 text-success';
      case 'device_assignment':
        return 'bg-purple-100 text-purple-800';
      case 'note':
        return 'bg-warning/10 text-yellow-800';
      case 'test':
      case 'hearing_test':
        return 'bg-destructive/10 text-red-800';
      case 'payment':
        return 'bg-indigo-100 text-indigo-800';
      case 'document':
        return 'bg-cyan-100 text-cyan-800';
      case 'activity':
        return 'bg-muted text-foreground';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const getEventTypeText = (eventType: string) => {
    switch (eventType) {
      case 'appointment':
        return 'Randevu';
      case 'sale':
        return 'Satış';
      case 'device_assignment':
        return 'Cihaz Atama';
      case 'note':
        return 'Not';
      case 'test':
      case 'hearing_test':
        return 'İşitme Testi';
      case 'payment':
        return 'Ödeme';
      case 'document':
        return 'Belge';
      case 'activity':
        return 'Aktivite';
      default:
        return eventType;
    }
  };

  const getSourceBadge = (source?: string) => {
    if (!source) return null;
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground ml-2">
        {source === 'activity_log' ? 'Log' : 'Manuel'}
      </span>
    );
  };

  return (
    <div
      className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onEventClick?.(event)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEventClick?.(event);
        }
      }}
      aria-label={`Olay: ${event.title} - ${getEventTypeText(event.eventType)}`}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-full ${getEventTypeColor(event.eventType)}`}>
          {getEventIcon(event.eventType)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium text-foreground truncate">
              {event.title}
            </h4>
            <div className="flex items-center">
              {getSourceBadge(event.source)}
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${getEventTypeColor(event.eventType)}`}>
                {getEventTypeText(event.eventType)}
              </span>
            </div>
          </div>

          {event.description && (
            <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
              {event.description}
            </p>
          )}

          {event.details && Object.keys(event.details).length > 0 && (
            <div className="text-xs text-muted-foreground mb-2">
              {Object.entries(event.details).slice(0, 2).map(([key, value]) => (
                <div key={key} className="inline-block mr-3">
                  <span className="font-medium">{key}:</span> {value ? String(value) : 'N/A'}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" aria-hidden="true" />
              {formatDate(event.eventDate)}
            </div>

            <div className="flex items-center space-x-3">
              {event.category && (
                <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  {event.category}
                </span>
              )}
              {event.user && (
                <div className="flex items-center">
                  <User className="w-3 h-3 mr-1" aria-hidden="true" />
                  {event.user}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};