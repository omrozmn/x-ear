// Drag and Drop Module
class DragDrop {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Global drag start event
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('draggable-appointment')) {
                e.target.classList.add('dragging');
                e.target.style.opacity = '0.5';
                
                // Store appointment data
                e.dataTransfer.setData('text/plain', e.target.textContent);
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        // Global drag end event
        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('draggable-appointment')) {
                e.target.classList.remove('dragging');
                e.target.style.opacity = '1';
            }
        });

        // Global drag over event
        document.addEventListener('dragover', (e) => {
            if (this.isValidDropTarget(e.target)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            }
        });

        // Global drop event
        document.addEventListener('drop', (e) => {
            if (this.isValidDropTarget(e.target)) {
                e.preventDefault();
                this.handleDrop(e);
            }
        });
    }

    isValidDropTarget(element) {
        return element.classList.contains('time-slot') || 
               element.classList.contains('calendar-day') ||
               element.classList.contains('appointment-area') ||
               element.closest('.time-slot') ||
               element.closest('.calendar-day') ||
               element.closest('.appointment-area');
    }

    handleDrop(e) {
        const draggedElement = document.querySelector('.dragging');
        if (!draggedElement) return;

        const dropTarget = e.target.closest('.time-slot, .calendar-day, .appointment-area') || e.target;
        
        // Remove dragging state
        draggedElement.classList.remove('dragging');
        draggedElement.style.opacity = '1';

        // Update appointment data first
        this.updateAppointmentLocation(draggedElement, dropTarget);

        // Clean up drag over states
        document.querySelectorAll('.drag-over, .bg-blue-50').forEach(el => {
            el.classList.remove('drag-over', 'bg-blue-50', 'border-blue-300');
        });

        window.utils.showToast('success', 'Randevu başarıyla taşındı');
    }

    attachAppointmentListeners(element) {
        // Make draggable
        element.draggable = true;
        
        // Add click listener
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Extract appointment info from element
            const text = element.textContent;
            const patientName = this.extractPatientName(text);
            const time = this.extractTime(text);
            const type = this.extractType(text);
            
            if (window.appointmentModal) {
                window.appointmentModal.openModal(patientName, time, type);
            }
        });

        // Add hover effects
        element.addEventListener('mouseenter', () => {
            element.style.transform = 'scale(1.02)';
            element.style.zIndex = '10';
        });

        element.addEventListener('mouseleave', () => {
            element.style.transform = '';
            element.style.zIndex = '';
        });
    }

    extractPatientName(text) {
        // Extract patient name from appointment text (e.g., "A. Y. 09:00")
        // Remove time pattern and clean up
        const timePattern = /\d{2}:\d{2}/g;
        const nameOnly = text.replace(timePattern, '').trim();
        return nameOnly || '';
    }

    extractTime(text) {
        // Extract time from appointment text (e.g., "A. Yılmaz 09:00")
        const match = text.match(/(\d{2}:\d{2})/);
        return match ? match[1] : '';
    }

    extractType(text) {
        // Try to extract appointment type from text or return default
        if (text.includes('İşitme')) return 'İşitme Testi';
        if (text.includes('Cihaz')) return 'Cihaz Denemesi';
        if (text.includes('Kontrol')) return 'Kontrol';
        return 'Konsültasyon';
    }

    updateAppointmentLocation(element, dropTarget) {
        // Get appointment ID from dragged element
        const appointmentId = element.dataset.appointmentId;
        if (!appointmentId) {
            console.warn('⚠️ No appointment ID found on dragged element');
            return;
        }

        // Find appointment in data store
        const appointment = window.appointmentData.appointments.find(apt => apt.id == appointmentId);
        if (!appointment) {
            console.warn('⚠️ Appointment not found in data store:', appointmentId);
            return;
        }

        // Get new time and date from drop target
        const newTime = dropTarget.dataset.time;
        const newDay = dropTarget.dataset.day;
        const newDate = dropTarget.dataset.date;

        console.log('📅 Updating appointment location:', {
            appointmentId,
            oldTime: appointment.time,
            oldDate: appointment.date,
            newTime,
            newDay,
            newDate
        });

        // Update time if available
        if (newTime) {
            appointment.time = newTime;
        }

        // Update date based on available information
        if (newDate) {
            // Direct date from drop target (month view)
            appointment.date = newDate;
        } else if (newDay !== undefined) {
            // Calculate date from day offset (week view)
            const weekStart = new Date(window.calendarManager.selectedDate);
            weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
            const calculatedDate = new Date(weekStart);
            calculatedDate.setDate(weekStart.getDate() + parseInt(newDay));
            appointment.date = window.appointmentData.formatDate(calculatedDate);
        }

        console.log('📅 Updated appointment:', appointment);

        // Save to storage and refresh views
        window.appointmentData.saveAppointmentToStorage(appointment).then(() => {
            // Refresh current view to show updated appointment
            setTimeout(() => {
                window.appointmentData.refreshCurrentView();
            }, 100);
        });
    }

    enableDragDropForElement(element) {
        element.draggable = true;
        element.classList.add('draggable-appointment');
        this.attachAppointmentListeners(element);
    }

    // Method to initialize drag and drop for existing appointments
    initializeExistingAppointments() {
        document.querySelectorAll('.appointment-slot, .draggable-appointment').forEach(element => {
            this.enableDragDropForElement(element);
        });
    }
}

// Export for global use
window.DragDrop = DragDrop;