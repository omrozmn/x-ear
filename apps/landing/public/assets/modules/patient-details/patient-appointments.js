class PatientAppointmentsComponent {
    constructor(apiClient) {
        this.apiClient = apiClient;
        this.appointments = [];
    }

    // Normalize appointment objects to canonical shape
    normalizeAppointments(appointments) {
        if (!Array.isArray(appointments)) return [];
        return appointments.map(a => {
            const ap = Object.assign({}, a);
            // Ensure date is ISO date string without time when possible
            if (ap.date && ap.date.indexOf && ap.date.indexOf('T') !== -1) {
                ap.date = ap.date.split('T')[0];
            }
            // Map legacy field names
            ap.id = ap.id || ap.appointmentId || ap.appId || '';
            ap.time = ap.time || ap.appTime || ap.appointmentTime || '';
            ap.type = ap.type || ap.appointmentType || 'consultation';
            ap.status = ap.status || ap.appStatus || 'SCHEDULED';
            ap.notes = ap.notes || ap.note || ap.description || '';
            return ap;
        });
    }

    /**
     * Async render: fetch appointments via DomainManager/legacyBridge or API and then render
     * @param {string} patientId
     */
    async renderAsync(patientId) {
        let appointments = [];
        try {
            if (typeof window !== 'undefined') {
                // Prefer domainManager patient data
                if (window.domainManager && typeof window.domainManager.getPatient === 'function') {
                    const patient = await window.domainManager.getPatient(patientId);
                    if (patient && Array.isArray(patient.appointments) && patient.appointments.length > 0) {
                        appointments = patient.appointments;
                    }
                }
                // legacyBridge fallback
                if ((!appointments || appointments.length === 0) && window.legacyBridge && typeof window.legacyBridge.getPatients === 'function') {
                    const list = await Promise.resolve(window.legacyBridge.getPatients());
                    const p = list && list.find(pp => pp.id === patientId);
                    if (p && Array.isArray(p.appointments)) appointments = p.appointments;
                }
            }
        } catch (dmErr) {
            console.warn('PatientAppointmentsComponent: domain lookup failed', dmErr);
        }

        // If still no appointments, call API
        if (!appointments || appointments.length === 0) {
            try {
                if (this.apiClient && typeof this.apiClient.getAppointments === 'function') {
                    appointments = await this.apiClient.getAppointments(patientId);
                } else if (this.apiClient) {
                    const res = await this.apiClient.get(`/api/appointments?patient_id=${encodeURIComponent(patientId)}`);
                    appointments = (res && (res.data || res.appointments || res)) || [];
                }
            } catch (apiErr) {
                console.warn('PatientAppointmentsComponent: API fetch failed', apiErr);
                appointments = [];
            }
        }

        appointments = this.normalizeAppointments(appointments || []);
        this.appointments = appointments;

        // Build a minimal patientData shape for rendering
        const patientData = { id: patientId, appointments: appointments };
        return this.render(patientData);
    }

    async render(patientData) {
        // Ensure appointments normalized
        patientData.appointments = this.normalizeAppointments(patientData.appointments || []);
        const patientId = patientData.id;

        try {
            // If appointments weren't preloaded, attempt API load
            if (!patientData.appointments || patientData.appointments.length === 0) {
                if (this.apiClient && typeof this.apiClient.getAppointments === 'function') {
                    this.appointments = await this.apiClient.getAppointments(patientId);
                } else if (this.apiClient) {
                    const res = await this.apiClient.get(`/api/appointments?patient_id=${encodeURIComponent(patientId)}`);
                    this.appointments = (res && (res.data || res.appointments || res)) || [];
                }
            } else {
                this.appointments = patientData.appointments;
            }

            // Normalize again to be safe
            this.appointments = this.normalizeAppointments(this.appointments || []);

            return this.renderAppointmentsTable(patientData);
        } catch (error) {
            console.error('Error loading appointments:', error);
            return this.renderErrorState();
        }
    }

    getSampleAppointments(patientId) {
        const now = new Date();
        return [
            {
                id: 'apt_001',
                date: now.toISOString().split('T')[0],
                time: '10:00',
                type: 'consultation',
                status: 'SCHEDULED',
                notes: 'İlk muayene randevusu'
            },
            {
                id: 'apt_002',
                date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                time: '14:30',
                type: 'followup',
                status: 'confirmed',
                notes: 'Cihaz ayar kontrolü'
            }
        ];
    }

    renderAppointmentsTable(patientData) {
        const patientId = patientData.id;

        return `
            <div class="appointments-section">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-xl font-semibold text-gray-900">Randevular</h3>
                    <button onclick="addAppointment('${patientId}')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
                        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                        </svg>
                        Randevu Ekle
                    </button>
                </div>

                ${this.appointments.length === 0 ? this.renderEmptyState() : this.renderAppointmentsList(patientId)}
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="text-center py-12">
                <div class="text-gray-400 mb-4">
                    <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Henüz randevu bulunmuyor</h3>
                <p class="text-gray-500 mb-4">Bu hasta için yeni bir randevu oluşturun.</p>
                <button onclick="addAppointment()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                    İlk Randevuyu Oluştur
                </button>
            </div>
        `;
    }

    renderAppointmentsList(patientId) {
        return `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Saat</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notlar</th>
                                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${this.appointments.map(appointment => this.renderAppointmentRow(appointment)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderAppointmentRow(appointment) {
        const statusClass = this.getStatusClass(appointment.status);
        const statusText = this.getStatusText(appointment.status);
        const typeText = this.getTypeText(appointment.type);

        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${this.formatDate(appointment.date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${appointment.time}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${typeText}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                    ${appointment.notes || '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="editAppointment('${appointment.id}')" class="text-blue-600 hover:text-blue-900 mr-2">Düzenle</button>
                    <button onclick="cancelAppointment('${appointment.id}')" class="text-red-600 hover:text-red-900">İptal</button>
                </td>
            </tr>
        `;
    }

    getStatusClass(status) {
        // Handle both uppercase and lowercase status values
        const normalizedStatus = status?.toLowerCase();
        switch (normalizedStatus) {
            case 'scheduled': return 'bg-yellow-100 text-yellow-800';
            case 'confirmed': return 'bg-blue-100 text-blue-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            case 'no_show': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    getStatusText(status) {
        // Handle both uppercase and lowercase status values
        const normalizedStatus = status?.toLowerCase();
        switch (normalizedStatus) {
            case 'scheduled': return 'Planlandı';
            case 'confirmed': return 'Onaylandı';
            case 'completed': return 'Tamamlandı';
            case 'cancelled': return 'İptal Edildi';
            case 'no_show': return 'Gelmedi';
            default: return status;
        }
    }

    getTypeText(type) {
        switch (type) {
            case 'consultation': return 'Muayene';
            case 'followup': return 'Kontrol';
            case 'hearing_test': return 'İşitme Testi';
            case 'device_fitting': return 'Cihaz Uyumu';
            case 'maintenance': return 'Bakım';
            default: return type;
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    renderErrorState() {
        return `
            <div class="text-center py-12">
                <div class="text-red-500 mb-4">
                    <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Randevular yüklenirken hata oluştu</h3>
                <p class="text-gray-500 mb-4">Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.</p>
                <button onclick="loadAppointments()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                    Tekrar Dene
                </button>
            </div>
        `;
    }
}

// Global functions for appointment management (matching legacy functionality)
window.addAppointment = function(patientId) {
    alert('Randevu ekleme özelliği yakında eklenecek. Patient ID: ' + patientId);
};

window.editAppointment = function(appointmentId) {
    alert('Randevu düzenleme özelliği yakında eklenecek. Appointment ID: ' + appointmentId);
};

window.cancelAppointment = function(appointmentId) {
    if (confirm('Bu randevuyu iptal etmek istediğinizden emin misiniz?')) {
        alert('Randevu iptal edildi. Appointment ID: ' + appointmentId);
    }
};

window.loadAppointments = function() {
    // Reload the current tab
    const currentTab = document.querySelector('.tab-button.active');
    if (currentTab) {
        currentTab.click();
    }
};