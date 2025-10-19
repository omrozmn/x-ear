import React from 'react';

interface PatientTimelineTabProps {
  patient: Patient;
  onPatientUpdate?: (patient: Patient) => void;
}

export const PatientTimelineTab: React.FC<PatientTimelineTabProps> = ({ patient, onPatientUpdate: _onPatientUpdate }) => {
  // Collect events from patient data
  const events = [];

  // Registration event
  if (patient.createdAt) {
    events.push({
      id: 'registration',
      type: 'registration',
      title: 'Hasta Kaydı Oluşturuldu',
      description: 'Hasta sistemde kayıt edildi',
      date: patient.createdAt,
      icon: '👤'
    });
  }

  // Notes events
  if (patient.notes) {
    patient.notes.forEach((note, index) => {
      events.push({
        id: `note-${index}`,
        type: 'note',
        title: 'Not Eklendi',
        description: note.content?.substring(0, 100) + (note.content?.length > 100 ? '...' : ''),
        date: note.createdAt,
        icon: '📝'
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
        description: `${appointment.type} - ${appointment.status}`,
        date: appointment.date,
        icon: '📅'
      });
    });
  }

  // Device events
  if (patient.assignedDevices) {
    patient.assignedDevices.forEach((device, index) => {
      events.push({
        id: `device-${index}`,
        type: 'device',
        title: device.status === 'trial' ? 'Cihaz Denemesi' : 'Cihaz Ataması',
        description: `${device.brand} ${device.model} - ${device.ear === 'right' ? 'Sağ' : 'Sol'} Kulak`,
        date: device.assignedDate,
        icon: '🔊'
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
        description: `₺${sale.amount} - ${sale.paymentMethod}`,
        date: sale.date,
        icon: '💰'
      });
    });
  }

  // Document events
  if (patient.documents) {
    patient.documents.forEach((doc, index) => {
      events.push({
        id: `document-${index}`,
        type: 'document',
        title: 'Belge Yüklendi',
        description: doc.name,
        date: doc.uploadDate,
        icon: '📄'
      });
    });
  }

  // SMS events
  if (patient.smsHistory) {
    patient.smsHistory.forEach((sms, index) => {
      events.push({
        id: `sms-${index}`,
        type: 'sms',
        title: 'SMS Gönderildi',
        description: sms.content?.substring(0, 50) + (sms.content?.length > 50 ? '...' : ''),
        date: sms.sentAt,
        icon: '📱'
      });
    });
  }

  // SGK events
  if (patient.sgkInfo) {
    events.push({
      id: 'sgk-update',
      type: 'sgk',
      title: 'SGK Bilgileri Güncellendi',
      description: `Durum: ${patient.sgkInfo.status}`,
      date: patient.sgkInfo.lastUpdated,
      icon: '🏥'
    });
  }

  // Sales events
  if (patient.sales) {
    patient.sales.forEach((sale, index) => {
      events.push({
        id: `sale-${index}`,
        type: 'sale',
        title: 'Satış Yapıldı',
        description: `${sale.productName} - ₺${sale.amount}`,
        date: sale.date,
        icon: '🛒'
      });
    });
  }

  // Label change events
  if (patient.labelHistory) {
    patient.labelHistory.forEach((labelChange, index) => {
      events.push({
        id: `label-${index}`,
        type: 'label',
        title: 'Etiket Değiştirildi',
        description: `${labelChange.oldLabel || 'Yok'} → ${labelChange.newLabel}`,
        date: labelChange.changedAt,
        icon: '🏷️'
      });
    });
  }

  // E-receipt events
  if (patient.ereceipts) {
    patient.ereceipts.forEach((receipt, index) => {
      events.push({
        id: `ereceipt-${index}`,
        type: 'ereceipt',
        title: 'E-Reçete Kaydedildi',
        description: `Reçete #${receipt.number}`,
        date: receipt.createdAt,
        icon: '💊'
      });
    });
  }

  // Profile update events
  if (patient.profileUpdates) {
    patient.profileUpdates.forEach((update, index) => {
      events.push({
        id: `profile-${index}`,
        type: 'profile',
        title: 'Profil Güncellendi',
        description: update.field + ' alanı değiştirildi',
        date: update.updatedAt,
        icon: '✏️'
      });
    });
  }

  // Sort events by date (newest first)
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const date = new Date(event.date).toLocaleDateString('tr-TR');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {});

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Hasta Geçmişi</h3>

      {Object.keys(groupedEvents).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date} className="relative">
              {/* Date Header */}
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 w-3 h-3 bg-blue-600 rounded-full"></div>
                <div className="ml-4">
                  <h4 className="text-sm font-medium text-gray-900">{date}</h4>
                </div>
              </div>

              {/* Events for this date */}
              <div className="ml-7 space-y-4">
                {dayEvents.map((event) => (
                  <div key={event.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm">
                        {event.icon}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h5 className="text-sm font-medium text-gray-900">{event.title}</h5>
                        <span className="text-xs text-gray-500">
                          {new Date(event.date).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>Henüz hasta geçmişi bulunmamaktadır.</p>
        </div>
      )}
    </div>
  );
};