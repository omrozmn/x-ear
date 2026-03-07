/**
 * Modern TimePicker Component for X-Ear CRM
 * Google Calendar style time picker
 */

class ModernTimePicker {
    constructor(options = {}) {
        this.options = {
            format: '24', // 12 or 24 hour format
            step: 15, // minutes step (15, 30, etc.)
            minTime: '08:00',
            maxTime: '18:00',
            defaultTime: '09:00',
            ...options
        };
        
        this.isOpen = false;
        this.targetInput = null;
        this.pickerElement = null;
        this.selectedTime = null;
        
        this.init();
    }

    init() {
        this.createPickerElement();
        this.attachEvents();
        this.injectStyles();
    }

    createPickerElement() {
        this.pickerElement = document.createElement('div');
        this.pickerElement.className = 'modern-timepicker';
        this.pickerElement.innerHTML = this.getPickerHTML();
        document.body.appendChild(this.pickerElement);
    }

    getPickerHTML() {
        return `
            <div class="timepicker-overlay" style="display: none;">
                <div class="timepicker-container">
                    <div class="timepicker-header">
                        <h3 class="timepicker-title">Saat Seçin</h3>
                        <button class="timepicker-close" data-action="close">
                            <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="timepicker-content">
                        <div class="timepicker-display">
                            <div class="time-display">
                                <span class="hour-display">09</span>
                                <span class="separator">:</span>
                                <span class="minute-display">00</span>
                            </div>
                        </div>
                        <div class="timepicker-controls">
                            <div class="time-column">
                                <div class="time-column-header">Saat</div>
                                <div class="time-list hours-list" id="hours-list"></div>
                            </div>
                            <div class="time-column">
                                <div class="time-column-header">Dakika</div>
                                <div class="time-list minutes-list" id="minutes-list"></div>
                            </div>
                        </div>
                    </div>
                    <div class="timepicker-footer">
                        <button class="timepicker-btn timepicker-btn-now" data-action="now">Şimdi</button>
                        <button class="timepicker-btn timepicker-btn-clear" data-action="clear">Temizle</button>
                        <button class="timepicker-btn timepicker-btn-ok" data-action="ok">Tamam</button>
                    </div>
                </div>
            </div>
        `;
    }

    injectStyles() {
        if (document.getElementById('modern-timepicker-styles')) return;
        
        const styles = document.createElement('style');
        styles.id = 'modern-timepicker-styles';
        styles.textContent = `
            .modern-timepicker .timepicker-overlay {
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

            .modern-timepicker .timepicker-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                min-width: 320px;
                max-width: 400px;
                animation: timepicker-fade-in 0.2s ease-out;
                overflow: hidden;
            }

            @keyframes timepicker-fade-in {
                from {
                    opacity: 0;
                    transform: scale(0.95) translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            .modern-timepicker .timepicker-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 24px 16px;
                border-bottom: 1px solid #e5e7eb;
                background: #f8fafc;
            }

            .modern-timepicker .timepicker-title {
                font-size: 18px;
                font-weight: 600;
                color: #111827;
                margin: 0;
            }

            .modern-timepicker .timepicker-close {
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

            .modern-timepicker .timepicker-close:hover {
                background: #ef4444;
                color: white;
                transform: scale(1.05);
            }

            .modern-timepicker .timepicker-content {
                padding: 24px;
            }

            .modern-timepicker .timepicker-display {
                text-align: center;
                margin-bottom: 24px;
            }

            .modern-timepicker .time-display {
                display: inline-flex;
                align-items: center;
                background: #f3f4f6;
                border-radius: 12px;
                padding: 16px 24px;
                font-size: 32px;
                font-weight: 700;
                color: #2563eb;
                font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
            }

            .modern-timepicker .separator {
                margin: 0 8px;
                color: #6b7280;
            }

            .modern-timepicker .timepicker-controls {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
            }

            .modern-timepicker .time-column {
                display: flex;
                flex-direction: column;
            }

            .modern-timepicker .time-column-header {
                font-size: 14px;
                font-weight: 600;
                color: #6b7280;
                text-align: center;
                margin-bottom: 12px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .modern-timepicker .time-list {
                max-height: 200px;
                overflow-y: auto;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                background: #fafafa;
            }

            .modern-timepicker .time-list::-webkit-scrollbar {
                width: 6px;
            }

            .modern-timepicker .time-list::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }

            .modern-timepicker .time-list::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 3px;
            }

            .modern-timepicker .time-list::-webkit-scrollbar-thumb:hover {
                background: #a1a1a1;
            }

            .modern-timepicker .time-item {
                padding: 12px 16px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                color: #374151;
                transition: all 0.15s;
                border-bottom: 1px solid #f3f4f6;
                text-align: center;
                font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
            }

            .modern-timepicker .time-item:last-child {
                border-bottom: none;
            }

            .modern-timepicker .time-item:hover {
                background: #dbeafe;
                color: #2563eb;
            }

            .modern-timepicker .time-item.selected {
                background: #2563eb;
                color: white;
                font-weight: 700;
            }

            .modern-timepicker .time-item.disabled {
                color: #d1d5db;
                cursor: not-allowed;
                opacity: 0.5;
            }

            .modern-timepicker .time-item.disabled:hover {
                background: none;
                color: #d1d5db;
            }

            .modern-timepicker .timepicker-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
                padding: 16px 24px;
                border-top: 1px solid #e5e7eb;
                background: #f8fafc;
            }

            .modern-timepicker .timepicker-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                flex: 1;
            }

            .modern-timepicker .timepicker-btn-now {
                background: #10b981;
                color: white;
            }

            .modern-timepicker .timepicker-btn-now:hover {
                background: #059669;
                transform: translateY(-1px);
            }

            .modern-timepicker .timepicker-btn-clear {
                background: #ef4444;
                color: white;
            }

            .modern-timepicker .timepicker-btn-clear:hover {
                background: #dc2626;
                transform: translateY(-1px);
            }

            .modern-timepicker .timepicker-btn-ok {
                background: #2563eb;
                color: white;
            }

            .modern-timepicker .timepicker-btn-ok:hover {
                background: #1d4ed8;
                transform: translateY(-1px);
            }

            /* Responsive */
            @media (max-width: 640px) {
                .modern-timepicker .timepicker-container {
                    margin: 20px;
                    min-width: auto;
                    width: calc(100% - 40px);
                }
                
                .modern-timepicker .time-display {
                    font-size: 28px;
                    padding: 12px 20px;
                }
                
                .modern-timepicker .time-list {
                    max-height: 150px;
                }
            }
        `;
        document.head.appendChild(styles);
    }

    attachEvents() {
        this.pickerElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const actionEl = e.target.closest('[data-action]');
            if (actionEl) {
                console.log('🕐 Action clicked:', actionEl.dataset.action);
                this.handleAction(actionEl.dataset.action, e);
                return;
            }

            const timeItem = e.target.closest('.time-item');
            if (timeItem && !timeItem.classList.contains('disabled')) {
                console.log('🕐 Time item clicked:', timeItem.dataset.time, timeItem.dataset.type);
                this.selectTime(timeItem);
            }
        });

        // Close on overlay click
        this.pickerElement.querySelector('.timepicker-overlay').addEventListener('click', (e) => {
            if (e.target.classList.contains('timepicker-overlay')) {
                this.close();
            }
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.isOpen) {
                if (e.key === 'Escape') {
                    this.close();
                } else if (e.key === 'Enter') {
                    this.handleAction('ok', e);
                }
            }
        });
    }

    handleAction(action, event) {
        event.preventDefault();
        
        switch (action) {
            case 'now':
                const now = new Date();
                let currentHour = now.getHours();
                let currentMinute = now.getMinutes();
                
                // Round to nearest step
                currentMinute = Math.round(currentMinute / this.options.step) * this.options.step;
                if (currentMinute >= 60) {
                    currentMinute = 0;
                    currentHour += 1;
                }
                
                const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
                if (this.isTimeAllowed(currentTime)) {
                    this.selectTimeValue(currentTime);
                } else {
                    // If current time is not allowed, use default time
                    this.selectTimeValue(this.options.defaultTime);
                }
                break;
            case 'clear':
                this.clearTime();
                break;
            case 'ok':
                if (this.selectedTime) {
                    this.close();
                }
                break;
            case 'close':
                this.close();
                break;
        }
    }

    selectTime(timeItem) {
        const time = timeItem.dataset.time;
        const type = timeItem.dataset.type;
        
        if (type === 'hour') {
            // Update hour part
            const currentMinute = this.selectedTime ? this.selectedTime.split(':')[1] : '00';
            this.selectTimeValue(`${time}:${currentMinute}`);
        } else if (type === 'minute') {
            // Update minute part
            const currentHour = this.selectedTime ? this.selectedTime.split(':')[0] : '09';
            const newTime = `${currentHour}:${time}`;
            if (this.isTimeAllowed(newTime)) {
                this.selectTimeValue(newTime);
            }
        }
    }

    selectTimeValue(time) {
        console.log('🕐 Selecting time:', time);
        this.selectedTime = time;
        if (this.targetInput) {
            this.targetInput.value = time;
            this.targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        this.updateDisplay();
        this.updateSelection();
    }

    clearTime() {
        this.selectedTime = null;
        if (this.targetInput) {
            this.targetInput.value = '';
            this.targetInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        this.close();
    }

    isTimeAllowed(time) {
        if (this.options.minTime && time < this.options.minTime) {
            return false;
        }
        if (this.options.maxTime && time > this.options.maxTime) {
            return false;
        }
        return true;
    }

    open(inputElement) {
        this.targetInput = inputElement;
        
        // Parse current value or use default
        if (inputElement.value && inputElement.value.match(/^\d{2}:\d{2}$/)) {
            this.selectedTime = inputElement.value;
        } else {
            this.selectedTime = this.options.defaultTime;
        }
        
        this.isOpen = true;
        this.render();
        this.pickerElement.querySelector('.timepicker-overlay').style.display = 'flex';
        
        // Scroll to selected time
        setTimeout(() => {
            this.scrollToSelected();
        }, 100);
    }

    close() {
        this.isOpen = false;
        this.pickerElement.querySelector('.timepicker-overlay').style.display = 'none';
    }

    render() {
        console.log('🕐 Rendering TimePicker with selected time:', this.selectedTime);
        this.renderTimeOptions();
        this.updateDisplay();
        this.updateSelection();
    }

    renderTimeOptions() {
        const hoursList = this.pickerElement.querySelector('#hours-list');
        const minutesList = this.pickerElement.querySelector('#minutes-list');
        
        if (!hoursList || !minutesList) {
            console.error('TimePicker: Could not find hours or minutes list elements');
            return;
        }
        
        // Generate hours (8-18 for appointments)
        const hours = [];
        for (let h = 8; h <= 18; h++) {
            const hour = String(h).padStart(2, '0');
            const testTime = `${hour}:00`;
            const isDisabled = !this.isTimeAllowed(testTime);
            hours.push(`
                <div class="time-item ${isDisabled ? 'disabled' : ''}" data-time="${hour}" data-type="hour">
                    ${hour}
                </div>
            `);
        }
        hoursList.innerHTML = hours.join('');
        
        // Generate minutes based on step
        const minutes = [];
        for (let m = 0; m < 60; m += this.options.step) {
            const minute = String(m).padStart(2, '0');
            minutes.push(`
                <div class="time-item" data-time="${minute}" data-type="minute">
                    ${minute}
                </div>
            `);
        }
        minutesList.innerHTML = minutes.join('');
        
        console.log(`🕐 Generated ${hours.length} hours and ${minutes.length} minutes`);
    }

    updateDisplay() {
        if (this.selectedTime) {
            const [hour, minute] = this.selectedTime.split(':');
            this.pickerElement.querySelector('.hour-display').textContent = hour;
            this.pickerElement.querySelector('.minute-display').textContent = minute;
        }
    }

    updateSelection() {
        // Clear previous selections
        this.pickerElement.querySelectorAll('.time-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        if (this.selectedTime) {
            const [hour, minute] = this.selectedTime.split(':');
            
            // Select hour
            const hourItem = this.pickerElement.querySelector(`[data-time="${hour}"][data-type="hour"]`);
            if (hourItem) {
                hourItem.classList.add('selected');
                console.log('🕐 Selected hour:', hour);
            }
            
            // Select minute
            const minuteItem = this.pickerElement.querySelector(`[data-time="${minute}"][data-type="minute"]`);
            if (minuteItem) {
                minuteItem.classList.add('selected');
                console.log('🕐 Selected minute:', minute);
            } else {
                console.warn('🕐 Minute item not found:', minute);
            }
        }
    }

    scrollToSelected() {
        const selectedHour = this.pickerElement.querySelector('.hours-list .selected');
        const selectedMinute = this.pickerElement.querySelector('.minutes-list .selected');
        
        if (selectedHour) {
            selectedHour.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        if (selectedMinute) {
            selectedMinute.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // Static method to initialize on time inputs
    static initializeInputs(selector = 'input[type="time"]', options = {}) {
        const timePicker = new ModernTimePicker(options);
        
        document.querySelectorAll(selector).forEach(input => {
            // Skip if already initialized to prevent duplicate event listeners
            if (input.dataset.timePickerInitialized === 'true') {
                return;
            }
            
            // Mark as initialized
            input.dataset.timePickerInitialized = 'true';
            
            // Convert time input to text input for better control
            if (input.type === 'time') {
                input.type = 'text';
                input.placeholder = 'HH:MM';
                input.readOnly = true; // Prevent manual typing
            }
            
            // Create event handlers that can be referenced for removal if needed
            const focusHandler = (e) => {
                e.preventDefault();
                timePicker.open(input);
            };
            
            const clickHandler = (e) => {
                e.preventDefault();
                timePicker.open(input);
            };
            
            const inputHandler = (e) => {
                let value = e.target.value;
                
                // Remove any non-numeric characters except :
                value = value.replace(/[^\\d:]/g, '');
                
                // Auto-add colon as user types
                if (value.length === 2 && !value.includes(':')) {
                    value = value + ':';
                }
                
                // Limit to HH:MM format length
                if (value.length > 5) {
                    value = value.substring(0, 5);
                }
                
                e.target.value = value;
            };
            
            const changeHandler = () => {
                if (input.value) {
                    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
                    if (!timeRegex.test(input.value) || !timePicker.isTimeAllowed(input.value)) {
                        input.classList.add('border-red-500');
                        
                        if (typeof window.utils !== 'undefined' && window.utils.showToast) {
                            window.utils.showToast('Geçersiz saat formatı (HH:MM)', 'error');
                        }
                        
                        input.value = '';
                    } else {
                        input.classList.remove('border-red-500');
                    }
                }
            };
            
            // Attach event listeners
            input.addEventListener('focus', focusHandler);
            input.addEventListener('click', clickHandler);
            input.addEventListener('input', inputHandler);
            input.addEventListener('change', changeHandler);
            
            // Store handlers for potential cleanup
            input._timePickerHandlers = {
                focus: focusHandler,
                click: clickHandler,
                input: inputHandler,
                change: changeHandler
            };
        });
        
        return timePicker;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernTimePicker;
} else {
    window.ModernTimePicker = ModernTimePicker;
}

console.log('🕐 Modern TimePicker initialized');