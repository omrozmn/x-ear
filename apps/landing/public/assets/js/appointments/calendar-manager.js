// Calendar Management Module
class CalendarManager {
    constructor() {
        this.currentView = 'month';
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
    }

    switchView(view) {
        this.currentView = view;

        // Update button states - iOS 26 style with clear active state
        document.querySelectorAll('[id$="ViewBtn"]').forEach(btn => {
            btn.className = 'flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-sm transition-all duration-200 active:scale-95';
        });

        // Highlight active button with iOS 26 style
        const activeBtn = document.getElementById(view + 'ViewBtn');
        if (activeBtn) {
            activeBtn.className = 'flex items-center px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white shadow-lg border border-blue-700 transition-all duration-200 active:scale-95';
        }

        // Show/hide content based on view
        const views = ['month', 'day', 'week', 'list'];
        views.forEach(v => {
            const content = document.getElementById(v + 'ViewContent');
            if (content) {
                content.classList.toggle('hidden', v !== view);
            }
        });

        // Update view-specific content
        if (view === 'day') {
            this.updateDayView();
        } else if (view === 'week') {
            this.updateWeekView();
        } else if (view === 'month') {
            this.generateCalendar();
        } else if (view === 'list') {
            this.updateListView();
        }
        
        // Add event listener for appointmentsFiltered to refresh views
        if (!this.eventListenerAdded) {
            document.addEventListener('appointmentsFiltered', () => {
                console.log('🔄 Refreshing calendar view due to appointmentsFiltered event');
                if (this.currentView === 'day') {
                    this.updateDayView();
                } else if (this.currentView === 'week') {
                    this.updateWeekView();
                } else if (this.currentView === 'month') {
                    this.generateCalendar();
                } else if (this.currentView === 'list') {
                    this.updateListView();
                }
            });
            this.eventListenerAdded = true;
        }
    }

    generateCalendar() {
        const grid = document.getElementById('calendar-grid');
        const monthYear = document.getElementById('month-year');

        const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

        monthYear.textContent = `${months[this.currentMonth]} ${this.currentYear}`;

        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));

        grid.innerHTML = '';

        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);

            const dayElement = document.createElement('div');
            dayElement.className = `min-h-[120px] p-3 border border-gray-200 rounded-xl ${date.getMonth() !== this.currentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white hover:bg-blue-50 hover:border-blue-200 hover:shadow-md'} cursor-pointer transition-all duration-200 shadow-sm`;

            const dayNumber = document.createElement('div');
            dayNumber.className = 'text-sm font-medium mb-1';
            dayNumber.textContent = date.getDate();
            dayElement.appendChild(dayNumber);

            // Add click handler for day - always switch to day view in month view
            dayElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('draggable-appointment')) {
                    this.selectedDate = new Date(date);
                    this.switchView('day');
                }
            });

            this.addSampleAppointments(dayElement, date);
            this.makeDayDroppable(dayElement, date);

            grid.appendChild(dayElement);
        }
    }

    addSampleAppointments(dayElement, date) {
        // Get real appointments for this date
        const dateStr = window.appointmentData.formatDate(date);
        const dayAppointments = window.appointmentData.appointments.filter(apt =>
            apt.date === dateStr
        );

        if (dayAppointments.length > 0) {
            console.log(`📅 Rendering ${dayAppointments.length} appointments for ${dateStr}:`, dayAppointments);
        }

        dayAppointments.forEach(appointment => {
            const appointmentElement = document.createElement('div');
            appointmentElement.className = 'text-xs bg-blue-100 text-blue-800 p-1 rounded mb-1 draggable-appointment cursor-pointer hover:bg-blue-200 transition-colors';
            appointmentElement.draggable = true;

            // Get patient info with TC/Phone identifier
            const patientInfo = window.appointmentData.getPatientInfoById(appointment.patientId || appointment.patient_id);
            const shortName = patientInfo.name.split(' ').map(name => name.charAt(0)).join('. ') + '.';
            appointmentElement.textContent = `${shortName} ${appointment.time}`;
            appointmentElement.title = `${patientInfo.name} (${patientInfo.identifier}) - ${appointment.time}`;

            // Store appointment data for drag & drop
            appointmentElement.dataset.appointmentId = appointment.id;
            appointmentElement.dataset.originalDate = appointment.date;
            appointmentElement.dataset.time = appointment.time;

            appointmentElement.addEventListener('click', (e) => {
                e.stopPropagation();
                window.appointmentModal.openModal(patientInfo.name, appointment.time, appointment.type);
            });

            dayElement.appendChild(appointmentElement);
        });
    }

    makeDayDroppable(dayElement, date) {
        // Add calendar-day class and date data for drag & drop
        dayElement.classList.add('calendar-day');
        dayElement.dataset.date = window.appointmentData.formatDate(date || new Date());

        dayElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            dayElement.classList.add('bg-blue-50', 'border-blue-300');
        });

        dayElement.addEventListener('dragleave', (e) => {
            dayElement.classList.remove('bg-blue-50', 'border-blue-300');
        });

        dayElement.addEventListener('drop', (e) => {
            e.preventDefault();
            dayElement.classList.remove('bg-blue-50', 'border-blue-300');
            
            // Let the global drag & drop handler manage this
            console.log('📅 Drop event on calendar day:', dayElement.dataset.date);
        });
    }

    previousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.generateCalendar();
    }

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.generateCalendar();
    }

    previousWeek() {
        const currentWeekStart = new Date(this.selectedDate);
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        this.selectedDate = currentWeekStart;
        this.updateWeekView();
    }

    nextWeek() {
        const currentWeekStart = new Date(this.selectedDate);
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        this.selectedDate = currentWeekStart;
        this.updateWeekView();
    }

    previousDay() {
        this.selectedDate.setDate(this.selectedDate.getDate() - 1);
        this.updateDayView();
    }

    nextDay() {
        this.selectedDate.setDate(this.selectedDate.getDate() + 1);
        this.updateDayView();
    }

    updateDayView() {
        try {
            const dayContent = document.getElementById('dayViewContent');
            if (!dayContent) {
                console.error('Day view content element not found');
                return;
            }

            const dayDate = this.selectedDate.toLocaleDateString('tr-TR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Filter appointments for selected day using consistent date format
            const selectedDateStr = window.appointmentData.formatDate(this.selectedDate);
            const dayAppointments = window.appointmentData.appointments.filter(apt => {
                return apt.date === selectedDateStr;
            });
            
            console.log(`📅 Day view for ${selectedDateStr}: found ${dayAppointments.length} appointments`, dayAppointments);

            dayContent.innerHTML = `
                <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div class="p-4 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-4">
                                <div class="flex space-x-2">
                                    <button onclick="window.calendarManager.previousDay()" class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                                        </svg>
                                    </button>
                                    <button onclick="window.calendarManager.nextDay()" class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                                        </svg>
                                    </button>
                                </div>
                                <h3 class="text-lg font-semibold text-gray-900">${dayDate}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="day-schedule">
                        ${this.generateDaySchedule(dayAppointments)}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error updating day view:', error);
            window.utils.showToast('error', 'Error updating day view');
        }
    }

    generateDaySchedule(appointments) {
        let scheduleHTML = '';

        for (let hour = 8; hour <= 18; hour++) {
            const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
            const slotAppointments = appointments.filter(apt => apt.time === timeSlot);

            scheduleHTML += `
                <div class="time-slot-row flex border-b border-gray-100 hover:bg-gray-50" data-time="${timeSlot}">
                    <div class="time-label w-20 p-3 text-sm text-gray-500 font-medium border-r border-gray-200 bg-gray-50">
                        ${timeSlot}
                    </div>
                    <div class="appointment-area flex-1 p-3 min-h-[60px] cursor-pointer time-slot" 
                         data-time="${timeSlot}" 
                         data-date="${window.appointmentData.formatDate(this.selectedDate)}"
                         onclick="window.appointmentData.createAppointmentAtTime('${timeSlot}')">
                        ${slotAppointments.length > 0 ? 
                            slotAppointments.map(appointment => `
                                <div class="appointment-block bg-blue-100 border border-blue-300 rounded-md p-2 mb-2 hover:bg-blue-200 transition-colors draggable-appointment cursor-move" 
                                     draggable="true" 
                                     data-appointment-id="${appointment.id}" 
                                     data-time="${timeSlot}"
                                     onclick="event.stopPropagation(); window.appointmentModal.openModal('${(() => {
                                         const patientInfo = window.appointmentData.getPatientInfoById(appointment.patientId || appointment.patient_id);
                                         return patientInfo.name;
                                     })()}', '${appointment.time}', '${appointment.type}')">
                                    <div class="font-medium text-blue-900">${(() => {
                                        const patientInfo = window.appointmentData.getPatientInfoById(appointment.patientId || appointment.patient_id);
                                        return patientInfo.name;
                                    })()}</div>
                                    <div class="text-xs text-blue-600">${(() => {
                                        const patientInfo = window.appointmentData.getPatientInfoById(appointment.patientId || appointment.patient_id);
                                        return patientInfo.identifier;
                                    })()}</div>
                                    <div class="text-sm text-blue-700">${appointment.type}</div>
                                </div>
                            `).join('') : `
                            <div class="text-gray-400 text-sm">Boş slot - tıklayarak randevu ekleyin</div>
                        `}
                    </div>
                </div>
            `;
        }

        return scheduleHTML;
    }

    updateWeekView() {
        const weekGrid = document.getElementById('week-grid');
        const weekTitle = document.getElementById('week-title');

        // Generate time slots from 8:00 to 18:00
        const timeSlots = [];
        for (let hour = 8; hour <= 18; hour++) {
            timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
            if (hour < 18) {
                timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
            }
        }

        // Get week start date
        const weekStart = new Date(this.selectedDate);
        weekStart.setDate(this.selectedDate.getDate() - this.selectedDate.getDay() + 1); // Monday

        // Update week title
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        weekTitle.textContent = `${weekStart.toLocaleDateString('tr-TR', options)} - ${weekEnd.toLocaleDateString('tr-TR', options)}`;

        // Update week header with dynamic dates
        this.updateWeekHeader(weekStart);

        // Generate grid
        weekGrid.innerHTML = '';

        timeSlots.forEach(time => {
            // Time label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'text-xs font-medium text-gray-500 py-3 px-2 border-r border-gray-200 bg-gray-50';
            timeLabel.textContent = time;
            weekGrid.appendChild(timeLabel);

            // Day columns
            for (let day = 0; day < 7; day++) {
                const daySlot = document.createElement('div');
                daySlot.className = 'time-slot border-r border-b border-gray-100 p-1 min-h-[40px] relative hover:bg-gray-50 transition-colors';
                daySlot.dataset.time = time;
                daySlot.dataset.day = day;
                
                // Add date for current day slot
                const currentDay = new Date(weekStart);
                currentDay.setDate(weekStart.getDate() + day);
                daySlot.dataset.date = window.appointmentData.formatDate(currentDay);

                // Add real appointments
                const dayString = window.appointmentData.formatDate(currentDay);

                const dayAppointments = window.appointmentData.appointments.filter(apt =>
                    apt.date === dayString && apt.time === time
                );

                dayAppointments.forEach(appointment => {
                    const appointmentElement = document.createElement('div');
                    appointmentElement.className = 'appointment-slot bg-blue-100 border border-blue-300 rounded p-1 text-xs font-medium text-blue-800 cursor-pointer draggable-appointment mb-1';
                    appointmentElement.draggable = true;

                    // Get patient info with TC/Phone identifier
                    const patientInfo = window.appointmentData.getPatientInfoById(appointment.patientId || appointment.patient_id);
                    
                    // Map appointment type key to Turkish display value
                    const typeMapping = {
                        'consultation': 'Konsültasyon',
                        'hearing-test': 'İşitme Testi',
                        'device-trial': 'Cihaz Denemesi',
                        'follow-up': 'Kontrol'
                    };
                    const displayType = typeMapping[appointment.type] || appointment.type;
                    
                    appointmentElement.innerHTML = `
                        <div class="font-semibold text-sm">${patientInfo.name}</div>
                        <div class="text-xs text-blue-600">${patientInfo.identifier}</div>
                        <div class="text-xs text-blue-700 font-medium">${displayType}</div>
                    `;
                    appointmentElement.title = `${patientInfo.name} (${patientInfo.identifier}) - ${appointment.time} - ${displayType}`;
                    appointmentElement.addEventListener('click', (e) => {
                        e.stopPropagation();
                        window.appointmentModal.openModal(patientInfo.name, appointment.time, appointment.type);
                    });
                    
                    // Store appointment data for drag & drop
                    appointmentElement.dataset.appointmentId = appointment.id;
                    appointmentElement.dataset.time = time;
                    appointmentElement.dataset.day = day;
                    daySlot.appendChild(appointmentElement);
                });

                // Add click handler for creating new appointments
                daySlot.addEventListener('click', function () {
                    if (!this.querySelector('.appointment-slot')) {
                        const currentDay = new Date(weekStart);
                        currentDay.setDate(weekStart.getDate() + day);
                        const dateString = window.appointmentData.formatDate(currentDay);

                        if (window.appointmentModal) {
                            window.appointmentModal.openModal('', time, '', dateString);
                        }
                    }
                });

                weekGrid.appendChild(daySlot);
            }
        });

        this.updateCurrentTimeIndicator();
    }

    updateWeekHeader(weekStart) {
        const weekHeader = document.querySelector('.week-header');
        if (!weekHeader) return;

        const dayNames = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dayColumns = weekHeader.querySelectorAll('div:not(:first-child)');

        for (let i = 0; i < dayColumns.length && i < 7; i++) {
            const currentDay = new Date(weekStart);
            currentDay.setDate(weekStart.getDate() + i);

            const dayColumn = dayColumns[i];
            const dayName = dayColumn.querySelector('.text-sm');
            const dayNumber = dayColumn.querySelector('.text-lg');

            // Get correct day of week (0=Sunday, 1=Monday, etc.)
            const dayOfWeek = currentDay.getDay();
            // Convert to our array index (Monday=0, Sunday=6)
            const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

            if (dayName) dayName.textContent = dayNames[dayIndex];
            if (dayNumber) dayNumber.textContent = currentDay.getDate();

            // Add click handler to switch to day view
            dayColumn.style.cursor = 'pointer';
            dayColumn.onclick = () => {
                this.selectedDate = new Date(currentDay);
                this.switchView('day');
            };

            // Highlight today
            if (currentDay.toDateString() === today.toDateString()) {
                dayColumn.classList.add('text-blue-600', 'bg-blue-50');
            } else {
                dayColumn.classList.remove('text-blue-600', 'bg-blue-50');
            }
        }
    }

    updateCurrentTimeIndicator() {
        // Implementation for current time indicator
        const indicator = document.getElementById('current-time-indicator');
        if (indicator) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            if (currentHour >= 8 && currentHour <= 18) {
                const position = ((currentHour - 8) * 60 + currentMinute) / (11 * 60) * 100;
                indicator.style.top = `${position}%`;
                indicator.classList.remove('hidden');
            } else {
                indicator.classList.add('hidden');
            }
        }
    }

    updateListView() {
        const listContent = document.getElementById('listViewContent');

        if (window.appointmentData.filteredAppointments.length === 0) {
            listContent.innerHTML = `
                <div class="text-center py-12">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0h6m-6 0V7a1 1 0 00-1 1v9a1 1 0 001 1h8a1 1 0 001-1V8a1 1 0 00-1-1h-2"></path>
                    </svg>
                    <h3 class="mt-2 text-sm font-medium text-gray-900">Randevu bulunamadı</h3>
                    <p class="mt-1 text-sm text-gray-500">Seçilen filtrelere uygun randevu bulunmuyor.</p>
                </div>
            `;
            return;
        }

        const sortedAppointments = [...window.appointmentData.filteredAppointments].sort((a, b) => {
            const dateA = new Date(`${a.date} ${a.time}`);
            const dateB = new Date(`${b.date} ${b.time}`);
            return dateA - dateB;
        });

        listContent.innerHTML = `
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hasta</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih & Saat</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tür</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Şube</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Klinisyen</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${sortedAppointments.map(apt => `
                                <tr class="hover:bg-gray-50 ${window.appointmentData.isCompactView ? 'text-sm' : ''}">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        ${(() => {
                                            const patientInfo = window.appointmentData.getPatientInfoById(apt.patientId || apt.patient_id);
                                            return `
                                                <div class="font-medium text-gray-900">${patientInfo.name}</div>
                                                <div class="text-sm text-gray-500">${patientInfo.identifier}</div>
                                            `;
                                        })()}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-gray-900">${new Date(apt.date).toLocaleDateString('tr-TR')}</div>
                                        <div class="text-sm text-gray-500">${apt.time}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-gray-900">${apt.type}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-gray-900">${apt.branch}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-gray-900">${apt.clinician}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 py-1 text-xs font-medium rounded-full ${apt.status === 'Planlandı' ? 'bg-blue-100 text-blue-800' :
                apt.status === 'Onaylandı' ? 'bg-green-100 text-green-800' :
                    apt.status === 'Tamamlandı' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
            }">${apt.status}</span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onclick="window.appointmentModal.openModal('${apt.patient}', '${apt.time}', '${apt.type}')" class="text-blue-600 hover:text-blue-900 mr-3">Görüntüle</button>
                                        <button onclick="window.appointmentData.editAppointment(${apt.id})" class="text-green-600 hover:text-green-900 mr-3">Düzenle</button>
                                        <button onclick="window.appointmentData.deleteAppointment(${apt.id})" class="text-red-600 hover:text-red-900">Sil</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}

// Export for global use
window.CalendarManager = CalendarManager;