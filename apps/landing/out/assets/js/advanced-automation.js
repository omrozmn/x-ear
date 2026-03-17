/**
 * Advanced Automation Rules - Real automation execution system
 */

class AdvancedAutomationRules {
    constructor() {
        this.activeRules = [];
        this.executionLog = [];
        this.smsTemplates = {};
        this.init();
    }

    init() {
        this.loadSMSTemplates();
        this.loadActiveRules();
        this.bindEvents();
        this.startRuleEngine();
    }

    loadSMSTemplates() {
        this.smsTemplates = {
            no_show_reschedule: "Merhaba {name}, bugünkü randevunuzu kaçırdınız. Yeni randevu için: {reschedule_link}",
            trial_followup: "Merhaba {name}, işitme cihazı deneme süreciniz nasıl gidiyor? Finansman seçenekleri için 1'i tuşlayın.",
            control_reminder: "{device_model} cihazınızın kontrol randevusu yarın saat {time}. Onaylamak için: {confirm_link}",
            battery_renewal: "Merhaba {name}, yıllık pil raporunuz yaklaşıyor. Randevu için: {booking_link}",
            payment_overdue: "Hatırlatma: {amount} tutarında geciken ödemeniz bulunmaktadır. Güvenli ödeme: {payment_link}",
            device_renewal: "5 yıl önce aldığınız işitme cihazınız için yenileme zamanı! Yeni teknolojiler: {catalog_link}",
            high_priority_followup: "Merhaba {name}, size özel bir teklif hazırladık. Detaylar için bizi arayın: 0212 XXX XXXX"
        };
    }

    loadActiveRules() {
        this.activeRules = [
            {
                id: 'no_show_recovery',
                name: 'Randevu Kaçırma Takibi',
                priority: 'high',
                enabled: true,
                triggers: ['appointment.no_show'],
                conditions: [],
                actions: [
                    { type: 'add_tag', params: { tag: 'no_show' } },
                    { type: 'create_task', params: { 
                        assignee: 'reception', 
                        title: 'Randevu kaçıran hasta ile iletişim',
                        priority: 'medium',
                        dueDate: '+1d'
                    }},
                    { type: 'send_sms', params: { 
                        template: 'no_show_reschedule',
                        delay: '2h'
                    }},
                    { type: 'add_to_segment', params: { segment: 'no_show' } }
                ]
            },
            {
                id: 'trial_price_no_sale',
                name: 'Deneme+Fiyat Verildi Takibi',
                priority: 'high',
                enabled: true,
                triggers: ['patient.updated'],
                conditions: [
                    { field: 'deviceTrial', operator: 'equals', value: true },
                    { field: 'priceGiven', operator: 'equals', value: true },
                    { field: 'purchased', operator: 'equals', value: false },
                    { field: 'trialDate', operator: 'older_than', value: '7d' }
                ],
                actions: [
                    { type: 'add_tag', params: { tag: 'high_priority' } },
                    { type: 'create_task', params: { 
                        assignee: 'sales', 
                        title: 'Yüksek öncelikli takip - deneme yapıldı, satış yapılmadı',
                        priority: 'high',
                        dueDate: '+2d'
                    }},
                    { type: 'schedule_sms', params: { 
                        template: 'trial_followup',
                        delay: '+1d'
                    }},
                    { type: 'add_to_segment', params: { segment: 'tried_not_purchased' } }
                ]
            },
            {
                id: 'post_purchase_controls',
                name: 'Satış Sonrası Kontroller',
                priority: 'medium',
                enabled: true,
                triggers: ['sale.completed'],
                conditions: [],
                actions: [
                    { type: 'schedule_appointments', params: { 
                        intervals: [30, 90, 180], // days
                        type: 'control_visit'
                    }},
                    { type: 'schedule_sms_series', params: { 
                        template: 'control_reminder',
                        schedule: [29, 89, 179] // 1 day before each appointment
                    }},
                    { type: 'create_sgk_report', params: {} }
                ]
            },
            {
                id: 'battery_renewal_reminder',
                name: 'Pil Raporu Yenileme',
                priority: 'medium',
                enabled: true,
                triggers: ['battery.renewal.due'],
                conditions: [],
                actions: [
                    { type: 'add_tag', params: { tag: 'battery_due' } },
                    { type: 'create_task', params: { 
                        assignee: 'clinic', 
                        title: 'Pil raporu yenileme işlemi',
                        priority: 'medium',
                        dueDate: '+7d'
                    }},
                    { type: 'send_sms', params: { 
                        template: 'battery_renewal'
                    }}
                ]
            },
            {
                id: 'overdue_payment_recovery',
                name: 'Geciken Ödeme Takibi',
                priority: 'high',
                enabled: true,
                triggers: ['payment.overdue'],
                conditions: [],
                actions: [
                    { type: 'add_tag', params: { tag: 'overdue_payment' } },
                    { type: 'send_sms', params: { 
                        template: 'payment_overdue'
                    }},
                    { type: 'create_task', params: { 
                        assignee: 'finance', 
                        title: 'Geciken ödeme takibi',
                        priority: 'high',
                        dueDate: '+1d'
                    }},
                    { type: 'schedule_escalation', params: { 
                        delay: '+3d',
                        action: 'phone_call_required'
                    }}
                ]
            },
            {
                id: 'device_renewal_campaign',
                name: '5 Yıllık Cihaz Yenileme',
                priority: 'medium',
                enabled: true,
                triggers: ['device.renewal.due'],
                conditions: [],
                actions: [
                    { type: 'create_task', params: { 
                        assignee: 'sales', 
                        title: 'Cihaz yenileme fırsatı',
                        priority: 'medium',
                        dueDate: '+7d'
                    }},
                    { type: 'send_sms_series', params: { 
                        templates: ['device_renewal', 'high_priority_followup'],
                        intervals: [0, 7] // immediately, then after 7 days
                    }},
                    { type: 'add_to_segment', params: { segment: 'renewal_candidate' } }
                ]
            }
        ];
    }

    bindEvents() {
        // Listen for all automation trigger events
        document.addEventListener('appointmentNoShow', (e) => {
            this.executeRulesForTrigger('appointment.no_show', e.detail);
        });

        document.addEventListener('patientUpdated', (e) => {
            this.executeRulesForTrigger('patient.updated', e.detail);
        });

        document.addEventListener('saleCompleted', (e) => {
            this.executeRulesForTrigger('sale.completed', e.detail);
        });

        document.addEventListener('battery.renewal.due', (e) => {
            this.executeRulesForTrigger('battery.renewal.due', e.detail);
        });

        document.addEventListener('device.renewal.due', (e) => {
            this.executeRulesForTrigger('device.renewal.due', e.detail);
        });

        // Check for overdue payments daily
        setInterval(() => {
            this.checkOverduePayments();
        }, 24 * 60 * 60 * 1000);
    }

    startRuleEngine() {
        // Start periodic checks every hour
        setInterval(() => {
            this.runPeriodicChecks();
        }, 60 * 60 * 1000);

        // Initial run
        setTimeout(() => {
            this.runPeriodicChecks();
        }, 5000);
    }

    executeRulesForTrigger(triggerName, eventData) {
        const applicableRules = this.activeRules.filter(rule => 
            rule.enabled && rule.triggers.includes(triggerName)
        );

        applicableRules.forEach(rule => {
            this.executeRule(rule, eventData);
        });
    }

    async executeRule(rule, eventData) {
        try {
            // Check if conditions are met
            if (!this.evaluateConditions(rule.conditions, eventData)) {
                return;
            }

            console.log(`Executing automation rule: ${rule.name}`, eventData);

            // Execute each action in sequence
            for (const action of rule.actions) {
                await this.executeAction(action, eventData, rule);
            }

            // Log successful execution
            this.logExecution(rule, eventData, 'success');

        } catch (error) {
            console.error(`Error executing rule ${rule.id}:`, error);
            this.logExecution(rule, eventData, 'error', error.message);
        }
    }

    evaluateConditions(conditions, data) {
        if (!conditions || conditions.length === 0) return true;

        return conditions.every(condition => {
            const value = this.getNestedValue(data, condition.field);
            return this.evaluateCondition(value, condition.operator, condition.value);
        });
    }

    evaluateCondition(actualValue, operator, expectedValue) {
        switch (operator) {
            case 'equals':
                return actualValue === expectedValue;
            case 'not_equals':
                return actualValue !== expectedValue;
            case 'greater_than':
                return actualValue > expectedValue;
            case 'less_than':
                return actualValue < expectedValue;
            case 'contains':
                return String(actualValue).includes(String(expectedValue));
            case 'older_than':
                if (!actualValue) return false;
                const ageMs = Date.now() - new Date(actualValue).getTime();
                const expectedMs = this.parseDuration(expectedValue);
                return ageMs > expectedMs;
            default:
                return false;
        }
    }

    async executeAction(action, eventData, rule) {
        const patient = eventData.patient;
        
        switch (action.type) {
            case 'add_tag':
                await this.addTag(patient, action.params.tag);
                break;
            
            case 'create_task':
                await this.createTask(patient, action.params);
                break;
            
            case 'send_sms':
                await this.sendSMS(patient, action.params);
                break;
            
            case 'schedule_sms':
                await this.scheduleSMS(patient, action.params);
                break;
            
            case 'add_to_segment':
                await this.addToSegment(patient, action.params.segment);
                break;
            
            case 'schedule_appointments':
                await this.scheduleAppointments(patient, action.params);
                break;
            
            case 'create_sgk_report':
                await this.createSGKReport(patient, eventData.device);
                break;
            
            case 'send_sms_series':
                await this.sendSMSSeries(patient, action.params);
                break;
            
            default:
                console.warn(`Unknown action type: ${action.type}`);
        }
    }

    // Action implementations
    async addTag(patient, tag) {
        // Ensure tags is an array
        if (!Array.isArray(patient.tags)) {
            if (typeof patient.tags === 'string') {
                try {
                    patient.tags = JSON.parse(patient.tags);
                    if (!Array.isArray(patient.tags)) {
                        patient.tags = [];
                    }
                } catch(e) {
                    patient.tags = [];
                }
            } else if (!patient.tags) {
                patient.tags = [];
            } else {
                patient.tags = [];
            }
        }
        
        if (!patient.tags.includes(tag)) {
            patient.tags.push(tag);
            PatientManager.updatePatient(patient.id, { tags: patient.tags });
            console.log(`Added tag "${tag}" to patient ${patient.name}`);
        }
    }

    async createTask(patient, params) {
        const dueDate = this.calculateDate(params.dueDate);
        
        const task = {
            id: Utils.generateId(),
            title: params.title,
            description: params.description || `Otomasyon kuralı ile oluşturuldu: ${patient.name}`,
            patientId: patient.id,
            patientName: patient.name,
            assignee: params.assignee || 'admin',
            priority: params.priority || 'medium',
            dueDate: dueDate,
            status: 'pending',
            createdAt: new Date().toISOString(),
            automated: true
        };

        NotificationManager.add({
            title: task.title,
            message: `${patient.name} için görev oluşturuldu`,
            type: 'task',
            data: task
        });

        console.log(`Created task for patient ${patient.name}: ${task.title}`);
    }

    async sendSMS(patient, params) {
        if (!patient.phone) {
            console.warn(`No phone number for patient ${patient.name}`);
            return;
        }

        const template = this.smsTemplates[params.template];
        if (!template) {
            console.warn(`SMS template not found: ${params.template}`);
            return;
        }

        const message = this.replacePlaceholders(template, patient, params);
        
        // Simulate SMS sending (in real app, integrate with SMS gateway)
        console.log(`Sending SMS to ${patient.name} (${patient.phone}): ${message}`);
        
        // Log SMS in patient record
        if (!patient.smsLog) patient.smsLog = [];
        patient.smsLog.push({
            date: new Date().toISOString(),
            template: params.template,
            message: message,
            automated: true
        });
        
        PatientManager.updatePatient(patient.id, { smsLog: patient.smsLog });
        
        Utils.showToast(`SMS gönderildi: ${patient.name}`, 'success');
    }

    async scheduleSMS(patient, params) {
        const delay = this.parseDuration(params.delay);
        const sendTime = new Date(Date.now() + delay);
        
        setTimeout(() => {
            this.sendSMS(patient, params);
        }, delay);
        
        console.log(`Scheduled SMS for ${patient.name} at ${sendTime.toLocaleString()}`);
    }

    async addToSegment(patient, segment) {
        if (!patient.segments) patient.segments = [];
        if (!patient.segments.includes(segment)) {
            patient.segments.push(segment);
            PatientManager.updatePatient(patient.id, { segments: patient.segments });
            console.log(`Added patient ${patient.name} to segment: ${segment}`);
        }
    }

    async scheduleAppointments(patient, params) {
        const intervals = params.intervals || [30, 90, 180];
        const baseDate = new Date();
        
        intervals.forEach(days => {
            const appointmentDate = new Date(baseDate);
            appointmentDate.setDate(appointmentDate.getDate() + days);
            
            const appointment = {
                patientId: patient.id,
                patientName: patient.name,
                date: appointmentDate.toISOString().split('T')[0],
                time: '09:00', // Default morning appointment
                type: params.type || 'control_visit',
                status: 'scheduled',
                automated: true,
                notes: `${days} günlük kontrol randevusu (otomatik)`
            };
            
            AppointmentManager.addAppointment(appointment);
            console.log(`Scheduled ${days}-day control appointment for ${patient.name}`);
        });
    }

    async createSGKReport(patient, device) {
        if (window.sgkAutomation) {
            sgkAutomation.handleDevicePurchase({ patient, device });
        }
    }

    async sendSMSSeries(patient, params) {
        const templates = params.templates || [];
        const intervals = params.intervals || [0];
        
        templates.forEach((template, index) => {
            const delay = intervals[index] || 0;
            const delayMs = delay * 24 * 60 * 60 * 1000; // Convert days to milliseconds
            
            setTimeout(() => {
                this.sendSMS(patient, { template });
            }, delayMs);
        });
    }

    // Helper methods
    replacePlaceholders(template, patient, params = {}) {
        let message = template;
        
        // Patient placeholders
        message = message.replace(/{name}/g, patient.name);
        message = message.replace(/{phone}/g, patient.phone || '');
        
        // Device placeholders
        if (patient.devices && patient.devices.length > 0) {
            const latestDevice = patient.devices[patient.devices.length - 1];
            message = message.replace(/{device_model}/g, latestDevice.model || 'İşitme Cihazı');
        }
        
        // Amount placeholders
        if (patient.overdueAmount) {
            message = message.replace(/{amount}/g, Utils.formatCurrency(patient.overdueAmount));
        }
        
        // Link placeholders
        const baseUrl = window.location.origin;
        message = message.replace(/{reschedule_link}/g, `${baseUrl}/appointments.html?patient=${patient.id}&reschedule=true`);
        message = message.replace(/{booking_link}/g, `${baseUrl}/appointments.html?patient=${patient.id}&type=battery_renewal`);
        message = message.replace(/{payment_link}/g, `${baseUrl}/payments.html?patient=${patient.id}`);
        message = message.replace(/{catalog_link}/g, `${baseUrl}/inventory.html?category=hearing-aids`);
        message = message.replace(/{confirm_link}/g, `${baseUrl}/appointments.html?confirm=true`);
        
        return message;
    }

    parseDuration(duration) {
        const match = duration.match(/^([+]?)(\d+)([hdw])$/);
        if (!match) return 0;
        
        const [, sign, amount, unit] = match;
        const multipliers = { h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000, w: 7 * 24 * 60 * 60 * 1000 };
        
        return parseInt(amount) * multipliers[unit];
    }

    calculateDate(dateString) {
        if (!dateString) return new Date().toISOString().split('T')[0];
        
        const match = dateString.match(/^([+]?)(\d+)([hdw])$/);
        if (!match) return dateString;
        
        const [, sign, amount, unit] = match;
        const date = new Date();
        
        switch (unit) {
            case 'h':
                date.setHours(date.getHours() + parseInt(amount));
                break;
            case 'd':
                date.setDate(date.getDate() + parseInt(amount));
                break;
            case 'w':
                date.setDate(date.getDate() + (parseInt(amount) * 7));
                break;
        }
        
        return date.toISOString().split('T')[0];
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    logExecution(rule, data, status, error = null) {
        this.executionLog.push({
            ruleId: rule.id,
            ruleName: rule.name,
            timestamp: new Date().toISOString(),
            status,
            error,
            data: { patientId: data.patient?.id, patientName: data.patient?.name }
        });

        // Keep only last 1000 entries
        if (this.executionLog.length > 1000) {
            this.executionLog = this.executionLog.slice(-1000);
        }

        // Save to localStorage
        Storage.save('automationExecutionLog', this.executionLog);
    }

    // Periodic checks
    runPeriodicChecks() {
        this.checkTrialFollowups();
        this.checkBatteryRenewals();
        this.checkDeviceRenewals();
        PrioritySystem.updateAllPriorityScores();
        if (AppState?.settings?.features?.enableHighPriorityTagging) {
            PrioritySystem.autoTagHighPriorityPatients();
        }
    }

    checkTrialFollowups() {
        const patients = AppState.patients || [];
        patients.forEach(patient => {
            if (patient.deviceTrial && patient.priceGiven && !patient.purchased && !patient.trialFollowupSent) {
                const trialDate = new Date(patient.trialDate);
                const daysSince = (Date.now() - trialDate.getTime()) / (1000 * 60 * 60 * 24);
                
                if (daysSince >= 7) {
                    document.dispatchEvent(new CustomEvent('patientUpdated', {
                        detail: { patient, changes: { trialFollowupCheck: true } }
                    }));
                }
            }
        });
    }

    checkBatteryRenewals() {
        const patients = AppState.patients || [];
        patients.forEach(patient => {
            if (patient.batteryReportDue && !patient.batteryRenewalReminderSent) {
                const dueDate = new Date(patient.batteryReportDue);
                const daysUntil = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
                
                if (daysUntil <= 30 && daysUntil > 0) {
                    document.dispatchEvent(new CustomEvent('battery.renewal.due', {
                        detail: { patient }
                    }));
                }
            }
        });
    }

    checkDeviceRenewals() {
        const patients = AppState.patients || [];
        patients.forEach(patient => {
            if (patient.devices && patient.devices.length > 0) {
                patient.devices.forEach(device => {
                    if (device.purchaseDate && !device.renewalCampaignSent) {
                        const purchaseDate = new Date(device.purchaseDate);
                        const yearsSince = (Date.now() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
                        
                        if (yearsSince >= 4.8) { // 4.8 years = about 58 months
                            document.dispatchEvent(new CustomEvent('device.renewal.due', {
                                detail: { patient, device }
                            }));
                        }
                    }
                });
            }
        });
    }

    checkOverduePayments() {
        const patients = AppState.patients || [];
        patients.forEach(patient => {
            if (patient.overdueAmount && patient.overdueAmount > 0 && !patient.overdueReminderSent) {
                document.dispatchEvent(new CustomEvent('payment.overdue', {
                    detail: { patient }
                }));
                // Mark as sent to avoid spam
                PatientManager.updatePatient(patient.id, { overdueReminderSent: true });
            }
        });
    }

    // Public API
    getRuleExecutionLog() {
        return this.executionLog;
    }

    getActiveRules() {
        return this.activeRules;
    }

    enableRule(ruleId) {
        const rule = this.activeRules.find(r => r.id === ruleId);
        if (rule) {
            rule.enabled = true;
            Utils.showToast(`Otomasyon kuralı aktifleştirildi: ${rule.name}`, 'success');
        }
    }

    disableRule(ruleId) {
        const rule = this.activeRules.find(r => r.id === ruleId);
        if (rule) {
            rule.enabled = false;
            Utils.showToast(`Otomasyon kuralı devre dışı bırakıldı: ${rule.name}`, 'info');
        }
    }
}

// Initialize advanced automation
const advancedAutomation = new AdvancedAutomationRules();

// Export for global access
window.AdvancedAutomationRules = AdvancedAutomationRules;
window.advancedAutomation = advancedAutomation;
