/**
 * Modern DatePicker Component for X-Ear CRM
 * Provides a beautiful, accessible date picker with validation
 */

class ModernDatePicker {
    constructor(options = {}) {
        this.options = {
            locale: 'tr-TR',
            maxDate: new Date(), // Default to today as max date
            minDate: null,
            theme: 'blue',
            allowFutureDates: false,
            showWeekNumbers: false,
            firstDayOfWeek: 1, // Monday
            ...options
        };
        
        this.currentDate = new Date();
        this.selectedDate = null;
        this.isOpen = false;
        this.targetInput = null;
        this.pickerElement = null;
        
        this.init();
    }

    init() {
        this.createPickerElement();
        this.attachEvents();
        this.injectStyles();
    }

    createPickerElement() {
        this.pickerElement = document.createElement('div');
        this.pickerElement.className = 'modern-datepicker';
        this.pickerElement.innerHTML = this.getPickerHTML();
        document.body.appendChild(this.pickerElement);
    }

    getPickerHTML() {
        return `
            <div class="datepicker-overlay" style="display: none;">
                <div class="datepicker-container">
                    <div class="datepicker-header">
                        <button class="datepicker-nav-btn" data-action="prev-year">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M8.354 6.646a.5.5 0 0 0-.708 0L4.5 9.793l-.646-.647a.5.5 0 0 0-.708.708L4.793 11.5a.5.5 0 0 0 .707 0l4-4a.5.5 0 0 0 0-.708z"/>
                                <path fill-rule="evenodd" d="M8.354 2.646a.5.5 0 0 0-.708 0L4.5 5.793l-.646-.647a.5.5 0 0 0-.708.708L4.793 7.5a.5.5 0 0 0 .707 0l4-4a.5.5 0 0 0 0-.708z"/>
                            </svg>
                        </button>
                        <button class="datepicker-nav-btn" data-action="prev-month">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"/>
                            </svg>
                        </button>
                        <div class="datepicker-title">
                            <button class="datepicker-month-year-btn" data-action="select-month">
                                <span class="datepicker-month"></span>
                            </button>
                            <button class="datepicker-month-year-btn" data-action="select-year">
                                <span class="datepicker-year"></span>
                            </button>
                        </div>
                        <button class="datepicker-nav-btn" data-action="next-month">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                            </svg>
                        </button>
                        <button class="datepicker-nav-btn" data-action="next-year">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path fill-rule="evenodd" d="M4.646 14.354a.5.5 0 0 1 0-.708L7.793 10.5 4.646 7.354a.5.5 0 1 1 .708-.708L8.207 9.5l3.147 3.146a.5.5 0 0 1-.708.708L7.5 10.207l-2.854 2.853a.5.5 0 0 1-.708 0z"/>
                                <path fill-rule="evenodd" d="M4.646 10.354a.5.5 0 0 1 0-.708L7.793 6.5 4.646 3.354a.5.5 0 1 1 .708-.708L8.207 5.5l3.147 3.146a.5.5 0 0 1-.708.708L7.5 6.207l-2.854 2.853a.5.5 0 0 1-.708 0z"/>
                            </svg>
                        </button>
                    </div>
                    <div class="datepicker-calendar">
                        <div class="datepicker-weekdays"></div>
                        <div class="datepicker-days"></div>
                    </div>
                    <div class="datepicker-footer">
                        <button class="datepicker-btn datepicker-btn-today" data-action="today">Bugün</button>
                        <button class="datepicker-btn datepicker-btn-clear" data-action="clear">Temizle</button>
                        <button class="datepicker-btn datepicker-btn-close" data-action="close">Kapat</button>
                    </div>
                </div>
            </div>
        `;
    }

    injectStyles() {
        if (document.getElementById('modern-datepicker-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'modern-datepicker-styles';
        styles.textContent = `
            .modern-datepicker .datepicker-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(2px);
            }

            .modern-datepicker .datepicker-container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                padding: 20px;
                min-width: 320px;
                max-width: 400px;
                animation: datepicker-fade-in 0.2s ease-out;
            }

            @keyframes datepicker-fade-in {
                from {
                    opacity: 0;
                    transform: scale(0.95) translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            .modern-datepicker .datepicker-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 1px solid #e5e7eb;
            }

            .modern-datepicker .datepicker-nav-btn {
                width: 32px;
                height: 32px;
                border: none;
                background: #f3f4f6;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: #6b7280;
                transition: all 0.2s;
            }

            .modern-datepicker .datepicker-nav-btn:hover {
                background: #2563eb;
                color: white;
                transform: scale(1.05);
            }

            .modern-datepicker .datepicker-nav-btn:disabled {
                opacity: 0.3;
                cursor: not-allowed;
                transform: none;
            }

            .modern-datepicker .datepicker-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
                color: #111827;
                font-size: 16px;
            }

            .modern-datepicker .datepicker-month-year-btn {
                background: none;
                border: none;
                font-weight: 600;
                color: #111827;
                font-size: 16px;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 6px;
                transition: all 0.2s;
            }

            .modern-datepicker .datepicker-month-year-btn:hover {
                background: #f3f4f6;
                color: #2563eb;
            }

            .modern-datepicker .datepicker-calendar {
                margin-bottom: 20px;
            }

            .modern-datepicker .datepicker-weekdays {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 4px;
                margin-bottom: 8px;
            }

            .modern-datepicker .datepicker-weekday {
                text-align: center;
                padding: 8px 4px;
                font-size: 12px;
                font-weight: 600;
                color: #6b7280;
                text-transform: uppercase;
            }

            .modern-datepicker .datepicker-days {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                gap: 4px;
            }

            .modern-datepicker .datepicker-day {
                aspect-ratio: 1;
                border: none;
                background: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                color: #374151;
                transition: all 0.15s;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .modern-datepicker .datepicker-day:hover {
                background: #dbeafe;
                color: #2563eb;
                transform: scale(1.05);
            }

            .modern-datepicker .datepicker-day.other-month {
                color: #d1d5db;
            }

            .modern-datepicker .datepicker-day.selected {
                background: #2563eb;
                color: white;
                box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
            }

            .modern-datepicker .datepicker-day.today {
                background: #fef3c7;
                color: #d97706;
                font-weight: 700;
            }

            .modern-datepicker .datepicker-day.today.selected {
                background: #2563eb;
                color: white;
            }

            .modern-datepicker .datepicker-day.disabled {
                color: #d1d5db;
                cursor: not-allowed;
                opacity: 0.5;
            }

            .modern-datepicker .datepicker-day.disabled:hover {
                background: none;
                transform: none;
            }

            .modern-datepicker .datepicker-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 8px;
                padding-top: 15px;
                border-top: 1px solid #e5e7eb;
            }

            .modern-datepicker .datepicker-btn {
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }

            .modern-datepicker .datepicker-btn-today {
                background: #10b981;
                color: white;
            }

            .modern-datepicker .datepicker-btn-today:hover {
                background: #059669;
                transform: translateY(-1px);
            }

            .modern-datepicker .datepicker-btn-clear {
                background: #ef4444;
                color: white;
            }

            .modern-datepicker .datepicker-btn-clear:hover {
                background: #dc2626;
                transform: translateY(-1px);
            }

            .modern-datepicker .datepicker-btn-close {
                background: #6b7280;
                color: white;
            }

            .modern-datepicker .datepicker-btn-close:hover {
                background: #4b5563;
                transform: translateY(-1px);
            }

            /* Input styling */
            .datepicker-input {
                position: relative;
            }

            .datepicker-input input[type="date"] {
                padding-right: 40px;
            }

            .datepicker-input::after {
                content: "📅";
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                pointer-events: none;
                font-size: 16px;
            }

            /* Responsive */
            @media (max-width: 640px) {
                .modern-datepicker .datepicker-container {
                    margin: 20px;
                    min-width: auto;
                    width: calc(100% - 40px);
                }
            }
        `;
        document.head.appendChild(styles);
    }

    attachEvents() {
        // Click events for navigation and day selection
        // Use closest() to handle clicks on nested elements (SVGs, spans, etc.)
        this.pickerElement.addEventListener('click', (e) => {
            try {
                const actionEl = e.target.closest('[data-action]');
                if (actionEl) {
                    const action = actionEl.dataset.action;
                    if (action) {
                        this.handleAction(action, e);
                        return;
                    }
                }

                const dayEl = e.target.closest('.datepicker-day');
                if (dayEl && !dayEl.classList.contains('disabled')) {
                    this.selectDate(dayEl);
                }
            } catch (err) {
                console.error('DatePicker click handler error:', err);
            }
        });

        // Close on overlay click
        this.pickerElement.querySelector('.datepicker-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('datepicker-overlay')) {
                this.close();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isOpen) {
                if (e.key === 'Escape') {
                    this.close();
                }
            }
        });
    }

    handleAction(action, event) {
        event.preventDefault();
        
        switch (action) {
            case 'prev-month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                this.render();
                break;
            case 'next-month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                this.render();
                break;
            case 'prev-year':
                this.currentDate.setFullYear(this.currentDate.getFullYear() - 1);
                this.render();
                break;
            case 'next-year':
                this.currentDate.setFullYear(this.currentDate.getFullYear() + 1);
                this.render();
                break;
            case 'select-month':
                this.showMonthPicker();
                break;
            case 'select-year':
                this.showYearPicker();
                break;
            case 'today':
                const today = new Date();
                if (this.isDateAllowed(today)) {
                    this.selectDateValue(today);
                    this.close();
                }
                break;
            case 'clear':
                this.clearDate();
                break;
            case 'close':
                this.close();
                break;
        }
    }

    selectDate(dayElement) {
        const day = parseInt(dayElement.textContent);
        const month = this.currentDate.getMonth();
        const year = this.currentDate.getFullYear();
        
        let selectedDate = new Date(year, month, day);
        
        // Handle other month days
        if (dayElement.classList.contains('other-month')) {
            if (day > 15) {
                // Previous month
                selectedDate = new Date(year, month - 1, day);
            } else {
                // Next month
                selectedDate = new Date(year, month + 1, day);
            }
        }
        
        if (this.isDateAllowed(selectedDate)) {
            this.selectDateValue(selectedDate);
            this.close();
        }
    }

    selectDateValue(date) {
        this.selectedDate = date;
        if (this.targetInput) {
            this.targetInput.value = this.formatDate(date);
            this.targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        this.render();
    }

    clearDate() {
        this.selectedDate = null;
        if (this.targetInput) {
            this.targetInput.value = '';
            this.targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        this.close();
    }

    isDateAllowed(date) {
        if (this.options.minDate && date < this.options.minDate) {
            return false;
        }
        if (this.options.maxDate && date > this.options.maxDate) {
            return false;
        }
        if (!this.options.allowFutureDates && date > new Date()) {
            return false;
        }
        return true;
    }

    formatDate(date) {
        // Format as dd/mm/yyyy
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    parseDate(dateString) {
        // Parse dd/mm/yyyy format
        if (!dateString) return null;
        
        // Handle both dd/mm/yyyy and yyyy-mm-dd formats
        if (dateString.includes('/')) {
            const [day, month, year] = dateString.split('/');
            return new Date(year, month - 1, day);
        } else if (dateString.includes('-')) {
            return new Date(dateString);
        }
        
        return null;
    }

    open(inputElement) {
        this.targetInput = inputElement;
        
        // Parse current value
        if (inputElement.value) {
            try {
                this.selectedDate = this.parseDate(inputElement.value);
                if (this.selectedDate) {
                    this.currentDate = new Date(this.selectedDate);
                }
            } catch (e) {
                this.selectedDate = null;
            }
        }
        
        this.isOpen = true;
        this.render();
        this.pickerElement.querySelector('.datepicker-overlay').style.display = 'flex';
        
        // Position the picker near the input
        this.positionPicker(inputElement);
    }

    close() {
        this.isOpen = false;
        this.pickerElement.querySelector('.datepicker-overlay').style.display = 'none';
    }

    positionPicker(inputElement) {
        // For mobile-first approach, we're using centered modal
        // Could be enhanced for desktop positioning relative to input
    }

    render() {
        this.renderHeader();
        this.renderWeekdays();
        this.renderDays();
        this.updateNavigationButtons();
    }

    renderHeader() {
        const monthNames = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        
        this.pickerElement.querySelector('.datepicker-month').textContent = 
            monthNames[this.currentDate.getMonth()];
        this.pickerElement.querySelector('.datepicker-year').textContent = 
            this.currentDate.getFullYear();
    }

    renderWeekdays() {
        const weekdays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        const weekdaysContainer = this.pickerElement.querySelector('.datepicker-weekdays');
        
        weekdaysContainer.innerHTML = weekdays.map(day => 
            `<div class="datepicker-weekday">${day}</div>`
        ).join('');
    }

    renderDays() {
        const daysContainer = this.pickerElement.querySelector('.datepicker-days');
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // First day of the month
        const firstDay = new Date(year, month, 1);
        // Last day of the month
        const lastDay = new Date(year, month + 1, 0);
        
        // Adjust for Monday as first day of week
        const startDate = new Date(firstDay);
        const dayOfWeek = (firstDay.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
        startDate.setDate(startDate.getDate() - dayOfWeek);
        
        const days = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('button');
            dayElement.className = 'datepicker-day';
            dayElement.textContent = date.getDate();
            
            // Add classes based on date properties
            if (date.getMonth() !== month) {
                dayElement.classList.add('other-month');
            }
            
            if (date.getTime() === today.getTime()) {
                dayElement.classList.add('today');
            }
            
            if (this.selectedDate && date.toDateString() === this.selectedDate.toDateString()) {
                dayElement.classList.add('selected');
            }
            
            if (!this.isDateAllowed(date)) {
                dayElement.classList.add('disabled');
            }
            
            days.push(dayElement.outerHTML);
        }
        
        daysContainer.innerHTML = days.join('');
    }

    updateNavigationButtons() {
        const prevMonth = this.pickerElement.querySelector('[data-action="prev-month"]');
        const nextMonth = this.pickerElement.querySelector('[data-action="next-month"]');
        const prevYear = this.pickerElement.querySelector('[data-action="prev-year"]');
        const nextYear = this.pickerElement.querySelector('[data-action="next-year"]');
        
        // Disable future navigation if future dates are not allowed
        if (!this.options.allowFutureDates) {
            const today = new Date();
            const currentMonth = this.currentDate.getMonth();
            const currentYear = this.currentDate.getFullYear();
            
            if (currentYear >= today.getFullYear() && currentMonth >= today.getMonth()) {
                nextMonth.disabled = true;
            } else {
                nextMonth.disabled = false;
            }
            
            if (currentYear >= today.getFullYear()) {
                nextYear.disabled = true;
            } else {
                nextYear.disabled = false;
            }
        }
    }

    showMonthPicker() {
        const monthNames = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];
        
        const monthOptions = monthNames.map((month, index) => 
            `<option value="${index}" ${index === this.currentDate.getMonth() ? 'selected' : ''}>${month}</option>`
        ).join('');
        
        const select = document.createElement('select');
        select.className = 'datepicker-month-select';
        select.innerHTML = monthOptions;
        select.style.cssText = `
            position: absolute;
            z-index: 10001;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 4px;
            font-size: 14px;
        `;
        
        const monthBtn = this.pickerElement.querySelector('[data-action="select-month"]');
        monthBtn.appendChild(select);
        select.focus();
        
        select.addEventListener('change', (e) => {
            this.currentDate.setMonth(parseInt(e.target.value));
            this.render();
            select.remove();
        });
        
        select.addEventListener('blur', () => {
            select.remove();
        });
    }

    showYearPicker() {
        const currentYear = this.currentDate.getFullYear();
        const startYear = currentYear - 10;
        const endYear = this.options.allowFutureDates ? currentYear + 10 : new Date().getFullYear();
        
        const yearOptions = [];
        for (let year = startYear; year <= endYear; year++) {
            yearOptions.push(`<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`);
        }
        
        const select = document.createElement('select');
        select.className = 'datepicker-year-select';
        select.innerHTML = yearOptions.join('');
        select.style.cssText = `
            position: absolute;
            z-index: 10001;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            padding: 4px;
            font-size: 14px;
        `;
        
        const yearBtn = this.pickerElement.querySelector('[data-action="select-year"]');
        yearBtn.appendChild(select);
        select.focus();
        
        select.addEventListener('change', (e) => {
            this.currentDate.setFullYear(parseInt(e.target.value));
            this.render();
            select.remove();
        });
        
        select.addEventListener('blur', () => {
            select.remove();
        });
    }

    // Static method to initialize on date inputs
    static initializeInputs(selector = 'input[type="date"]', options = {}) {
        const datePicker = new ModernDatePicker(options);
        
        document.querySelectorAll(selector).forEach(input => {
            // Convert date input to text input for better control over format
            if (input.type === 'date') {
                // Save the current value and convert format if needed
                const currentValue = input.value;
                input.type = 'text';
                input.placeholder = 'dd/mm/yyyy';
                
                // Convert existing ISO date values to dd/mm/yyyy format
                if (currentValue) {
                    const date = new Date(currentValue);
                    if (!isNaN(date.getTime())) {
                        input.value = datePicker.formatDate(date);
                    }
                }
            }
            
            // Add wrapper for styling
            if (!input.parentElement.classList.contains('datepicker-input')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'datepicker-input';
                input.parentElement.insertBefore(wrapper, input);
                wrapper.appendChild(input);
            }
            
            // Open picker on focus/click
            input.addEventListener('focus', () => {
                datePicker.open(input);
            });
            
            input.addEventListener('click', () => {
                datePicker.open(input);
            });
            
            // Validate and format on input
            input.addEventListener('input', (e) => {
                let value = e.target.value;
                
                // Remove any non-numeric characters except /
                value = value.replace(/[^\d\/]/g, '');
                
                // Auto-add slashes as user types
                if (value.length === 2 && !value.includes('/')) {
                    value = value + '/';
                } else if (value.length === 5 && value.split('/').length === 2) {
                    value = value + '/';
                }
                
                // Limit to dd/mm/yyyy format length
                if (value.length > 10) {
                    value = value.substring(0, 10);
                }
                
                e.target.value = value;
            });
            
            // Validate on change
            input.addEventListener('change', () => {
                if (input.value) {
                    const date = datePicker.parseDate(input.value);
                    if (!date || !datePicker.isDateAllowed(date)) {
                        input.classList.add('border-red-500');
                        
                        // Show error message
                        const errorMsg = !options.allowFutureDates && date && date > new Date() 
                            ? 'Gelecek tarih seçilemez' 
                            : 'Geçersiz tarih formatı (dd/mm/yyyy)';
                            
                        if (typeof Utils !== 'undefined' && Utils.showToast) {
                            Utils.showToast(errorMsg, 'error');
                        }
                        
                        input.value = '';
                    } else {
                        input.classList.remove('border-red-500');
                        // Reformat the date to ensure consistency
                        input.value = datePicker.formatDate(date);
                    }
                }
            });
            
            // Prevent manual typing when picker is open
            input.addEventListener('keydown', (e) => {
                if (datePicker.isOpen) {
                    if (e.key === 'Escape') {
                        datePicker.close();
                    }
                    // Allow backspace and delete
                    if (e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                        e.preventDefault();
                    }
                }
            });
        });
        
        return datePicker;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernDatePicker;
} else {
    window.ModernDatePicker = ModernDatePicker;
}

console.log('🎯 Modern DatePicker initialized');
