// Appointments Widget
class AppointmentsWidget {
    constructor(container) {
        this.container = container;
        this.appointments = [];
    }

    // Initialize the widget
    async init() {
        this.loadAppointments();
        this.render();
        this.attachEventListeners();
    }

    // Load appointments data
    loadAppointments() {
        // Get appointments from DataManager
        if (window.DataManager && window.DataManager.getAppointments) {
            this.appointments = window.DataManager.getAppointments();
        } else {
            // Fallback sample data
            this.appointments = [
                {
                    id: 1,
                    patientId: 1,
                    patientName: 'Ahmet Yılmaz',
                    date: '2024-01-15',
                    time: '10:00',
                    type: 'Kontrol',
                    status: 'confirmed',
                    notes: 'Düzenli kontrol'
                },
                {
                    id: 2,
                    patientId: 2,
                    patientName: 'Ayşe Kaya',
                    date: '2024-01-16',
                    time: '14:30',
                    type: 'Tedavi',
                    status: 'pending',
                    notes: 'İlk seans'
                }
            ];
        }
    }

    // Render the appointments widget
    render() {
        this.container.innerHTML = `
            <div class="appointments-widget">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold text-gray-800">Randevular</h3>
                    <button id="new-appointment-btn" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                        <i class="fas fa-plus mr-2"></i>Yeni Randevu
                    </button>
                </div>

                <div class="appointments-list space-y-3">
                    ${this.appointments.map(appointment => this.renderAppointment(appointment)).join('')}
                </div>

                ${this.appointments.length === 0 ? `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-calendar-times text-4xl mb-4"></i>
                        <p>Henüz randevu bulunmuyor</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Render a single appointment
    renderAppointment(appointment) {
        const statusClasses = {
            'confirmed': 'bg-green-100 text-green-800',
            'pending': 'bg-yellow-100 text-yellow-800',
            'cancelled': 'bg-red-100 text-red-800'
        };

        const statusText = {
            'confirmed': 'Onaylandı',
            'pending': 'Bekliyor',
            'cancelled': 'İptal Edildi'
        };

        return `
            <div class="appointment-card bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="font-medium text-gray-900">${appointment.patientName}</h4>
                        <p class="text-sm text-gray-600">${appointment.type}</p>
                    </div>
                    <span class="px-2 py-1 text-xs rounded-full ${statusClasses[appointment.status] || 'bg-gray-100 text-gray-800'}">
                        ${statusText[appointment.status] || 'Bilinmiyor'}
                    </span>
                </div>

                <div class="flex items-center text-sm text-gray-600 mb-2">
                    <i class="fas fa-calendar mr-2"></i>
                    <span>${this.formatDate(appointment.date)}</span>
                    <i class="fas fa-clock ml-4 mr-2"></i>
                    <span>${appointment.time}</span>
                </div>

                ${appointment.notes ? `
                    <p class="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        ${appointment.notes}
                    </p>
                ` : ''}

                <div class="flex justify-end space-x-2 mt-3">
                    <button class="edit-appointment-btn text-blue-600 hover:text-blue-800 text-sm" data-id="${appointment.id}">
                        <i class="fas fa-edit mr-1"></i>Düzenle
                    </button>
                    <button class="cancel-appointment-btn text-red-600 hover:text-red-800 text-sm" data-id="${appointment.id}">
                        <i class="fas fa-times mr-1"></i>İptal
                    </button>
                </div>
            </div>
        `;
    }

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    // Attach event listeners
    attachEventListeners() {
        // New appointment button
        const newBtn = this.container.querySelector('#new-appointment-btn');
        if (newBtn) {
            newBtn.addEventListener('click', () => this.showNewAppointmentForm());
        }

        // Edit buttons
        this.container.querySelectorAll('.edit-appointment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                this.editAppointment(id);
            });
        });

        // Cancel buttons
        this.container.querySelectorAll('.cancel-appointment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.currentTarget.dataset.id);
                this.cancelAppointment(id);
            });
        });
    }

    // Show new appointment form
    showNewAppointmentForm() {
        // This would typically show a modal or form
        alert('Yeni randevu oluşturma özelliği yakında eklenecek');
    }

    // Edit appointment
    editAppointment(id) {
        const appointment = this.appointments.find(a => a.id === id);
        if (appointment) {
            alert(`Randevu düzenleme: ${appointment.patientName} - ${appointment.date} ${appointment.time}`);
        }
    }

    // Cancel appointment
    cancelAppointment(id) {
        if (confirm('Bu randevuyu iptal etmek istediğinizden emin misiniz?')) {
            const appointment = this.appointments.find(a => a.id === id);
            if (appointment) {
                appointment.status = 'cancelled';
                this.render();
                this.attachEventListeners();

                // Update in DataManager if available
                if (window.DataManager && window.DataManager.updateAppointment) {
                    window.DataManager.updateAppointment(id, appointment);
                }
            }
        }
    }

    // Refresh appointments
    refresh() {
        this.loadAppointments();
        this.render();
        this.attachEventListeners();
    }
}

// Export for module loading
