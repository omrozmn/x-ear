import { addTimelineEvent as addTimelineEventApi } from '@/api/generated/timeline/timeline';
import type { TimelineEventCreate } from '@/api/generated/schemas';
import { outbox } from '../utils/outbox';

export interface TimelineEventData {
  type: string;
  title: string;
  description?: string;
  details?: Record<string, any>;
  timestamp?: string;
  date?: string;
  time?: string;
  user?: string;
  icon?: string;
  color?: string;
  category?: string;
}

export interface TimelineServiceResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

/**
 * Timeline Service - Handles adding timeline events for patients
 * Replaces the global window.addTimelineEvent function with proper API integration
 */
class TimelineService {
  /**
   * Add a timeline event for a patient
   * @param patientId - The patient ID
   * @param eventData - The event data to add
   * @returns Promise with the result
   */
  async addTimelineEvent(patientId: string, eventData: TimelineEventData): Promise<TimelineServiceResponse> {
    try {
      // Prepare the request body according to the API schema
      const requestBody: TimelineEventCreate = {
        type: eventData.type,
        title: eventData.title,
        description: eventData.description,
        details: eventData.details,
        timestamp: eventData.timestamp || new Date().toISOString(),
        date: eventData.date,
        time: eventData.time,
        user: eventData.user || 'system',
        icon: eventData.icon || 'fa-circle',
        color: eventData.color || 'blue',
        category: eventData.category || 'general'
      };

      // Try to make the API call
      try {
        const response = await addTimelineEventApi(patientId, requestBody);

        return {
          success: true,
          data: response,
          timestamp: new Date().toISOString()
        };
      } catch (apiError) {
        console.warn('Timeline API unavailable, queuing for offline sync:', apiError);

        // Queue the operation for offline sync
        await outbox.addOperation({
          method: 'POST',
          endpoint: `/api/patients/${patientId}/timeline`,
          data: requestBody,
          priority: 'normal',
          headers: {
            'Idempotency-Key': `timeline-${patientId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }
        });

        return {
          success: true,
          data: { id: `temp-${Date.now()}`, ...requestBody },
          timestamp: new Date().toISOString()
        };
      }
    } catch (error) {
      console.error('Failed to add timeline event:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Add a device-related timeline event
   * @param patientId - The patient ID
   * @param eventType - The type of device event
   * @param details - Device-specific details
   */
  async addDeviceEvent(patientId: string, eventType: string, details: Record<string, any>): Promise<TimelineServiceResponse> {
    const eventTitles: Record<string, string> = {
      'device_assigned': 'Cihaz Atandı',
      'device_removed': 'Cihaz Kaldırıldı',
      'device_trial_started': 'Cihaz Denemesi Başlatıldı',
      'device_trial_extended': 'Cihaz Denemesi Uzatıldı',
      'device_trial_completed': 'Cihaz Denemesi Tamamlandı',
      'device_trial_cancelled': 'Cihaz Denemesi İptal Edildi',
      'device_maintenance_scheduled': 'Cihaz Bakımı Planlandı',
      'device_replacement': 'Cihaz Değiştirildi'
    };

    const eventData: TimelineEventData = {
      type: eventType,
      title: eventTitles[eventType] || 'Cihaz Olayı',
      description: this.generateDeviceDescription(eventType, details),
      details,
      icon: 'fa-headphones',
      color: 'green',
      category: 'device'
    };

    return this.addTimelineEvent(patientId, eventData);
  }

  /**
   * Add an appointment-related timeline event
   * @param patientId - The patient ID
   * @param eventType - The type of appointment event
   * @param details - Appointment-specific details
   */
  async addAppointmentEvent(patientId: string, eventType: string, details: Record<string, any>): Promise<TimelineServiceResponse> {
    const eventTitles: Record<string, string> = {
      'appointment_scheduled': 'Randevu Planlandı',
      'appointment_completed': 'Randevu Tamamlandı',
      'appointment_cancelled': 'Randevu İptal Edildi',
      'appointment_rescheduled': 'Randevu Yeniden Planlandı'
    };

    const eventData: TimelineEventData = {
      type: eventType,
      title: eventTitles[eventType] || 'Randevu Olayı',
      description: this.generateAppointmentDescription(eventType, details),
      details,
      icon: 'fa-calendar',
      color: 'blue',
      category: 'appointment'
    };

    return this.addTimelineEvent(patientId, eventData);
  }

  /**
   * Add a payment-related timeline event
   * @param patientId - The patient ID
   * @param eventType - The type of payment event
   * @param details - Payment-specific details
   */
  async addPaymentEvent(patientId: string, eventType: string, details: Record<string, any>): Promise<TimelineServiceResponse> {
    const eventTitles: Record<string, string> = {
      'payment_received': 'Ödeme Alındı',
      'payment_refunded': 'Ödeme İade Edildi',
      'invoice_created': 'Fatura Oluşturuldu'
    };

    const eventData: TimelineEventData = {
      type: eventType,
      title: eventTitles[eventType] || 'Ödeme Olayı',
      description: this.generatePaymentDescription(eventType, details),
      details,
      icon: 'fa-credit-card',
      color: 'yellow',
      category: 'payment'
    };

    return this.addTimelineEvent(patientId, eventData);
  }

  /**
   * Generate description for device events
   */
  private generateDeviceDescription(eventType: string, details: Record<string, any>): string {
    const deviceName = details.deviceName || details.brand || 'Cihaz';
    const ear = details.ear || details.side;
    const earText = ear === 'left' ? 'Sol kulak' : ear === 'right' ? 'Sağ kulak' : ear === 'both' ? 'İki kulak' : '';

    switch (eventType) {
      case 'device_assigned':
        return `${deviceName} ${earText ? `(${earText})` : ''} hastaya atandı${details.serialNumber ? ` - Seri No: ${details.serialNumber}` : ''}`;
      case 'device_removed':
        return `${deviceName} ${earText ? `(${earText})` : ''} hastadan kaldırıldı${details.reason ? ` - Sebep: ${details.reason}` : ''}`;
      case 'device_trial_started':
        return `${deviceName} ${earText ? `(${earText})` : ''} için deneme başlatıldı${details.trialDuration ? ` - Süre: ${details.trialDuration} gün` : ''}${details.netTrialPrice ? ` - Ücret: ₺${details.netTrialPrice}` : ''}`;
      case 'device_trial_extended':
        return `${deviceName} ${earText ? `(${earText})` : ''} denemesi uzatıldı${details.newEndDate ? ` - Yeni bitiş: ${details.newEndDate}` : ''}${details.reason ? ` - Sebep: ${details.reason}` : ''}`;
      case 'device_trial_completed':
        return `${deviceName} ${earText ? `(${earText})` : ''} denemesi tamamlandı${details.result ? ` - Sonuç: ${details.result}` : ''}${details.netPayable ? ` - Ödeme: ₺${details.netPayable}` : ''}`;
      case 'device_trial_cancelled':
        return `${deviceName} ${earText ? `(${earText})` : ''} denemesi iptal edildi${details.reason ? ` - Sebep: ${details.reason}` : ''}`;
      case 'device_maintenance_scheduled':
        return `${deviceName} ${earText ? `(${earText})` : ''} için bakım planlandı${details.maintenanceType ? ` - Tür: ${details.maintenanceType}` : ''}`;
      case 'device_replacement':
        return `${deviceName} ${earText ? `(${earText})` : ''} değiştirildi${details.reason ? ` - Sebep: ${details.reason}` : ''}`;
      default:
        return `${deviceName} ${earText ? `(${earText})` : ''} ile ilgili olay`;
    }
  }

  /**
   * Generate description for appointment events
   */
  private generateAppointmentDescription(eventType: string, details: Record<string, any>): string {
    const date = details.date ? new Date(details.date).toLocaleDateString('tr-TR') : '';
    const time = details.time || '';
    const type = details.type || details.appointmentType || '';

    switch (eventType) {
      case 'appointment_scheduled':
        return `${type ? `${type} randevusu` : 'Randevu'} planlandı${date ? ` - ${date}` : ''}${time ? ` ${time}` : ''}`;
      case 'appointment_completed':
        return `${type ? `${type} randevusu` : 'Randevu'} tamamlandı${details.notes ? ` - ${details.notes}` : ''}`;
      case 'appointment_cancelled':
        return `${type ? `${type} randevusu` : 'Randevu'} iptal edildi${details.reason ? ` - Sebep: ${details.reason}` : ''}`;
      case 'appointment_rescheduled':
        return `${type ? `${type} randevusu` : 'Randevu'} yeniden planlandı${date ? ` - Yeni tarih: ${date}` : ''}`;
      default:
        return `Randevu ile ilgili olay${date ? ` - ${date}` : ''}`;
    }
  }

  /**
   * Generate description for payment events
   */
  private generatePaymentDescription(eventType: string, details: Record<string, any>): string {
    const amount = details.amount ? `₺${details.amount}` : '';
    const method = details.paymentMethod || details.method || '';

    switch (eventType) {
      case 'payment_received':
        return `${amount ? `${amount} ` : ''}ödeme alındı${method ? ` - ${method}` : ''}`;
      case 'payment_refunded':
        return `${amount ? `${amount} ` : ''}ödeme iade edildi${details.reason ? ` - Sebep: ${details.reason}` : ''}`;
      case 'invoice_created':
        return `${amount ? `${amount} ` : ''}fatura oluşturuldu${details.invoiceNumber ? ` - No: ${details.invoiceNumber}` : ''}`;
      default:
        return `${amount ? `${amount} ` : ''}ödeme ile ilgili olay`;
    }
  }
}

// Export singleton instance
export const timelineService = new TimelineService();

// Export for backward compatibility with window.addTimelineEvent
export const addTimelineEvent = (patientId: string, eventType: string, details: Record<string, any>) => {
  return timelineService.addDeviceEvent(patientId, eventType, details);
};