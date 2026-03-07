/**
 * Automation Engine - Handles automated workflows and business logic
 */

class AutomationEngine {
    constructor() {
        this.rules = new Map();
        this.triggers = new Map();
        this.actions = new Map();
        this.activeWorkflows = new Map();
        this.eventQueue = [];
        this.isProcessing = false;
        this.init();
    }

    init() {
        this.registerDefaultTriggers();
        this.registerDefaultActions();
        this.loadAutomationRules();
        this.bindEvents();
        this.startPeriodicChecks();
    }

    // Event binding for manual triggers
    bindEvents() {
        // Listen for patient events
        document.addEventListener('patientCreated', (e) => {
            this.processEvent('patient.created', e.detail);
        });

        document.addEventListener('patientUpdated', (e) => {
            this.processEvent('patient.updated', e.detail);
        });

        // Listen for appointment events
        document.addEventListener('appointmentCreated', (e) => {
            this.processEvent('appointment.created', e.detail);
        });

        document.addEventListener('appointmentCompleted', (e) => {
            this.processEvent('appointment.completed', e.detail);
        });

        document.addEventListener('appointmentCancelled', (e) => {
            this.processEvent('appointment.cancelled', e.detail);
        });

        document.addEventListener('appointmentNoShow', (e) => {
            this.processEvent('appointment.no_show', e.detail);
        });

        // Listen for device trial events
        document.addEventListener('deviceTrialStarted', (e) => {
            this.processEvent('device.trial.started', e.detail);
        });

        document.addEventListener('deviceTrialCompleted', (e) => {
            this.processEvent('device.trial.completed', e.detail);
        });

        // Listen for sales events
        document.addEventListener('saleCompleted', (e) => {
            this.processEvent('sale.completed', e.detail);
        });

        // Listen for SGK events
        document.addEventListener('sgkReportCreated', (e) => {
            this.processEvent('sgk.report.created', e.detail);
        });

        document.addEventListener('sgkReportStatusChanged', (e) => {
            this.processEvent('sgk.report.status_changed', e.detail);
        });

        // Start periodic checks for time-based triggers
        this.startPeriodicChecks();

        document.addEventListener('deviceTrialCompleted', (e) => {
            this.processEvent('device.trial.completed', e.detail);
        });

        // Listen for SGK events
        document.addEventListener('sgkReportSubmitted', (e) => {
            this.processEvent('sgk.report.submitted', e.detail);
        });

        document.addEventListener('sgkReportApproved', (e) => {
            this.processEvent('sgk.report.approved', e.detail);
        });
    }

    // Start periodic automation checks
    startPeriodicChecks() {
        // Check every 5 minutes for time-based triggers
        setInterval(() => {
            this.checkTimeBasedTriggers();
        }, 5 * 60 * 1000);

        // Check for no-shows every minute
        setInterval(() => {
            this.checkForNoShows();
        }, 60 * 1000);

        // Daily digest at 8:30 AM
        this.scheduleDailyDigest();
    }

    // Check for appointments that should be marked as no-shows
    checkForNoShows() {
        const now = new Date();
        const appointments = AppState.appointments || [];
        
        appointments.forEach(appointment => {
            if (appointment.status === 'scheduled') {
                const appointmentTime = new Date(`${appointment.date} ${appointment.time}`);
                const minutesPast = (now - appointmentTime) / (1000 * 60);
                
                if (minutesPast > 15) {
                    // Mark as no-show and trigger automation
                    appointment.status = 'NO_SHOW';
                    AppointmentManager.updateAppointment(appointment.id, { status: 'NO_SHOW' });
                    
                    // Trigger no-show automation
                    const patient = PatientManager.getPatient(appointment.patientId);
                    if (patient) {
                        document.dispatchEvent(new CustomEvent('appointmentNoShow', {
                            detail: { patient, appointment }
                        }));
                    }
                }
            }
        });
    }

    // Check for time-based automation triggers
    checkTimeBasedTriggers() {
        const patients = AppState.patients || [];
        const now = new Date();

        patients.forEach(patient => {
            // Check for battery renewals
            if (patient.batteryReportDue) {
                const dueDate = new Date(patient.batteryReportDue);
                const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                
                if (daysUntil <= 30 && daysUntil > 0 && !patient.batteryRenewalReminderSent) {
                    this.processEvent('battery.renewal.due', { patient });
                    patient.batteryRenewalReminderSent = true;
                    PatientManager.updatePatient(patient.id, { batteryRenewalReminderSent: true });
                }
            }

            // Check for 5-year device renewals
            if (patient.devices && patient.devices.length > 0) {
                patient.devices.forEach(device => {
                    if (device.purchaseDate) {
                        const purchaseDate = new Date(device.purchaseDate);
                        const yearsSince = (now - purchaseDate) / (1000 * 60 * 60 * 24 * 365);
                        
                        if (yearsSince >= 4.8 && !device.renewalCampaignSent) { // 4.8 years = 58.4 months
                            this.processEvent('device.renewal.due', { patient, device });
                            device.renewalCampaignSent = true;
                            PatientManager.updateDevice(patient.id, device.id, { renewalCampaignSent: true });
                        }
                    }
                });
            }

            // Check for trial follow-ups
            if (patient.deviceTrial && patient.priceGiven && !patient.purchased) {
                const trialDate = new Date(patient.trialDate);
                const daysSince = (now - trialDate) / (1000 * 60 * 60 * 24);
                
                if (daysSince >= 7 && !patient.trialFollowupSent) {
                    this.processEvent('trial.followup.due', { patient });
                    patient.trialFollowupSent = true;
                    PatientManager.updatePatient(patient.id, { trialFollowupSent: true });
                }
            }
        });
    }

    // Schedule daily digest
    scheduleDailyDigest() {
        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(8, 30, 0, 0);
        
        // If it's past 8:30 today, schedule for tomorrow
        if (now > scheduledTime) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        
        const timeUntilDigest = scheduledTime - now;
        
        setTimeout(() => {
            this.generateDailyDigest();
            // Schedule for next day
            setInterval(() => {
                this.generateDailyDigest();
            }, 24 * 60 * 60 * 1000);
        }, timeUntilDigest);
    }

    // Generate daily operational digest
    generateDailyDigest() {
        const digest = {
            date: new Date().toISOString().split('T')[0],
            todaysAppointments: AppointmentManager.getAppointments({ 
                date: new Date().toISOString().split('T')[0] 
            }),
            overduePayments: this.getOverduePayments(),
            criticalInventory: this.getCriticalInventory(),
            pendingSGK: this.getPendingSGKReports(),
            priorityFollowups: PrioritySystem.getHighPriorityPatients()
        };

        // Create notification for management
        NotificationManager.add({
            title: 'Daily Operational Digest',
            message: `${digest.todaysAppointments.length} appointments today, ${digest.overduePayments.length} overdue payments`,
            type: 'digest',
            data: digest
        });

        Utils.showToast('Daily digest generated', 'info');
    }

    // Helper methods for daily digest
    getOverduePayments() {
        const patients = AppState.patients || [];
        return patients.filter(patient => 
            patient.overdueAmount && patient.overdueAmount > 0
        );
    }

    getCriticalInventory() {
        const inventory = AppState.inventory || [];
        return inventory.filter(item => 
            item.available <= (item.criticalLevel || 2)
        );
    }

    getPendingSGKReports() {
        const patients = AppState.patients || [];
        return patients.filter(patient => 
            patient.sgkStatus && patient.sgkStatus !== 'paid'
        );
    }

    // Register default triggers
    registerDefaultTriggers() {
        // Patient-related triggers
        this.registerTrigger('patient.created', {
            name: 'Yeni Hasta Kaydı',
            description: 'Yeni hasta sisteme kaydedildiğinde tetiklenir',
            parameters: ['patient']
        });

        this.registerTrigger('patient.birthday', {
            name: 'Hasta Doğum Günü',
            description: 'Hastanın doğum günü geldiğinde tetiklenir',
            parameters: ['patient'],
            schedule: 'daily'
        });

        this.registerTrigger('patient.followup.due', {
            name: 'Takip Randevusu Zamanı',
            description: 'Hasta takip randevusu zamanı geldiğinde tetiklenir',
            parameters: ['patient', 'lastAppointment'],
            schedule: 'daily'
        });

        // Appointment-related triggers
        this.registerTrigger('appointment.reminder', {
            name: 'Randevu Hatırlatması',
            description: 'Randevu öncesi hatırlatma zamanı geldiğinde tetiklenir',
            parameters: ['appointment'],
            schedule: 'hourly'
        });

        this.registerTrigger('appointment.noshow', {
            name: 'Randevuya Gelmeme',
            description: 'Hasta randevuya gelmediğinde tetiklenir',
            parameters: ['appointment'],
            schedule: 'hourly'
        });

        // Device trial triggers
        this.registerTrigger('device.trial.reminder', {
            name: 'Cihaz Denemesi Hatırlatması',
            description: 'Cihaz denemesi süresi dolmadan önce hatırlatma',
            parameters: ['deviceTrial'],
            schedule: 'daily'
        });

        this.registerTrigger('device.trial.expired', {
            name: 'Cihaz Denemesi Süresi Doldu',
            description: 'Cihaz denemesi süresi dolduğunda tetiklenir',
            parameters: ['deviceTrial'],
            schedule: 'daily'
        });

        // Inventory triggers
        this.registerTrigger('inventory.low.inventory', {
            name: 'Düşük Stok Uyarısı',
            description: 'Ürün stoğu minimum seviyenin altına düştüğünde tetiklenir',
            parameters: ['inventoryItem'],
            schedule: 'daily'
        });

        // SGK triggers
        this.registerTrigger('sgk.report.deadline', {
            name: 'SGK Rapor Deadline',
            description: 'SGK raporu deadline yaklaştığında tetiklenir',
            parameters: ['sgkReport'],
            schedule: 'daily'
        });
    }

    // Register default actions
    registerDefaultActions() {
        // SMS actions
        this.registerAction('sms.send', {
            name: 'SMS Gönder',
            description: 'Hastaya SMS mesajı gönderir',
            parameters: ['recipient', 'message', 'template'],
            execute: this.sendSMS.bind(this)
        });

        this.registerAction('sms.send.bulk', {
            name: 'Toplu SMS Gönder',
            description: 'Birden fazla hastaya SMS gönderir',
            parameters: ['recipients', 'message', 'template'],
            execute: this.sendBulkSMS.bind(this)
        });

        // Email actions
        this.registerAction('email.send', {
            name: 'E-posta Gönder',
            description: 'Hastaya e-posta gönderir',
            parameters: ['recipient', 'subject', 'body', 'template'],
            execute: this.sendEmail.bind(this)
        });

        // Appointment actions
        this.registerAction('appointment.create', {
            name: 'Randevu Oluştur',
            description: 'Otomatik randevu oluşturur',
            parameters: ['patient', 'type', 'date', 'clinician'],
            execute: this.createAppointment.bind(this)
        });

        this.registerAction('appointment.reschedule', {
            name: 'Randevu Yeniden Planla',
            description: 'Randevuyu yeniden planlar',
            parameters: ['appointment', 'newDate'],
            execute: this.rescheduleAppointment.bind(this)
        });

        // Task actions
        this.registerAction('task.create', {
            name: 'Görev Oluştur',
            description: 'Personel için görev oluşturur',
            parameters: ['assignee', 'title', 'description', 'priority', 'dueDate'],
            execute: this.createTask.bind(this)
        });

        // Notification actions
        this.registerAction('notification.create', {
            name: 'Bildirim Oluştur',
            description: 'Sistem bildirimi oluşturur',
            parameters: ['recipient', 'title', 'message', 'type'],
            execute: this.createNotification.bind(this)
        });

        // Data actions
        this.registerAction('data.update', {
            name: 'Veri Güncelle',
            description: 'Hasta veya sistem verisini günceller',
            parameters: ['entity', 'field', 'value'],
            execute: this.updateData.bind(this)
        });

        // Workflow actions
        this.registerAction('workflow.start', {
            name: 'İş Akışı Başlat',
            description: 'Başka bir iş akışını başlatır',
            parameters: ['workflowId', 'context'],
            execute: this.startWorkflow.bind(this)
        });
    }

    // Load automation rules from storage or default configuration
    loadAutomationRules() {
        const savedRules = localStorage.getItem('automationRules');
        if (savedRules) {
            const rules = JSON.parse(savedRules);
            rules.forEach(rule => this.addRule(rule));
        } else {
            this.loadDefaultRules();
        }
    }

    // Load default automation rules
    loadDefaultRules() {
        const defaultRules = [
            {
                id: 'welcome-new-patient',
                name: 'Yeni Hasta Hoş Geldin Mesajı',
                description: 'Yeni hastaya hoş geldin SMS\'i gönderir',
                trigger: 'patient.created',
                conditions: [],
                actions: [{
                    type: 'sms.send',
                    parameters: {
                        recipient: '{{patient.phone}}',
                        template: 'welcome_patient',
                        message: 'Merhaba {{patient.firstName}}, X-Ear Hearing Center ailesine hoş geldiniz! Randevu ve bilgi için: 0212 XXX XXXX'
                    }
                }],
                active: true
            },
            {
                id: 'appointment-reminder-24h',
                name: '24 Saat Randevu Hatırlatması',
                description: 'Randevudan 24 saat önce hatırlatma SMS\'i gönderir',
                trigger: 'appointment.reminder',
                conditions: [{
                    field: 'hoursUntilAppointment',
                    operator: 'equals',
                    value: 24
                }],
                actions: [{
                    type: 'sms.send',
                    parameters: {
                        recipient: '{{appointment.patient.phone}}',
                        template: 'appointment_reminder_24h',
                        message: 'Merhaba {{appointment.patient.firstName}}, yarın saat {{appointment.time}} randevunuz bulunmaktadır. X-Ear Hearing Center'
                    }
                }],
                active: true
            },
            {
                id: 'device-trial-reminder',
                name: 'Cihaz Denemesi Hatırlatması',
                description: 'Cihaz denemesi süresi dolmadan 3 gün önce hatırlatır',
                trigger: 'device.trial.reminder',
                conditions: [{
                    field: 'daysUntilExpiry',
                    operator: 'equals',
                    value: 3
                }],
                actions: [{
                    type: 'sms.send',
                    parameters: {
                        recipient: '{{deviceTrial.patient.phone}}',
                        template: 'device_trial_reminder',
                        message: 'Merhaba {{deviceTrial.patient.firstName}}, cihaz deneme süreniz 3 gün sonra sona erecektir. Değerlendirme randevusu için arayınız.'
                    }
                }],
                active: true
            },
            {
                id: 'birthday-greeting',
                name: 'Doğum Günü Tebriği',
                description: 'Hastanın doğum gününde tebrik mesajı gönderir',
                trigger: 'patient.birthday',
                conditions: [],
                actions: [{
                    type: 'sms.send',
                    parameters: {
                        recipient: '{{patient.phone}}',
                        template: 'birthday_greeting',
                        message: 'Doğum gününüz kutlu olsun {{patient.firstName}}! X-Ear Hearing Center olarak nice mutlu yıllar dileriz. 🎉'
                    }
                }],
                active: true
            },
            {
                id: 'low-inventory-alert',
                name: 'Düşük Stok Uyarısı',
                description: 'Stok düşük olan ürünler için personele bildirim gönderir',
                trigger: 'inventory.low.inventory',
                conditions: [],
                actions: [{
                    type: 'notification.create',
                    parameters: {
                        recipient: 'inventory_manager',
                        title: 'Düşük Stok Uyarısı',
                        message: '{{inventoryItem.name}} ürününün stoğu {{inventoryItem.inventory}} adet kalmıştır.',
                        type: 'warning'
                    }
                }],
                active: true
            },
            {
                id: 'followup-reminder',
                name: 'Takip Randevusu Hatırlatması',
                description: 'Son randevudan 3 ay sonra takip randevusu hatırlatması',
                trigger: 'patient.followup.due',
                conditions: [{
                    field: 'monthsSinceLastAppointment',
                    operator: 'greaterThanOrEqual',
                    value: 3
                }],
                actions: [{
                    type: 'sms.send',
                    parameters: {
                        recipient: '{{patient.phone}}',
                        template: 'followup_reminder',
                        message: 'Merhaba {{patient.firstName}}, işitme kontrolü için takip randevunuzun zamanı geldi. Randevu için arayınız: 0212 XXX XXXX'
                    }
                }],
                active: true
            }
        ];

        defaultRules.forEach(rule => this.addRule(rule));
        this.saveRules();
    }

    // Register a new trigger
    registerTrigger(id, config) {
        this.triggers.set(id, config);
    }

    // Register a new action
    registerAction(id, config) {
        this.actions.set(id, config);
    }

    // Add a new automation rule
    addRule(rule) {
        if (!rule.id) {
            rule.id = Utils.generateId();
        }
        this.rules.set(rule.id, rule);
    }

    // Remove an automation rule
    removeRule(ruleId) {
        this.rules.delete(ruleId);
        this.saveRules();
    }

    // Update an automation rule
    updateRule(ruleId, updates) {
        const rule = this.rules.get(ruleId);
        if (rule) {
            Object.assign(rule, updates);
            this.saveRules();
        }
    }

    // Process an event through the automation engine
    processEvent(eventType, data) {
        this.eventQueue.push({ type: eventType, data, timestamp: Date.now() });
        if (!this.isProcessing) {
            this.processEventQueue();
        }
    }

    // Process the event queue
    async processEventQueue() {
        this.isProcessing = true;
        
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            await this.handleEvent(event);
        }
        
        this.isProcessing = false;
    }

    // Handle a single event
    async handleEvent(event) {
        const matchingRules = Array.from(this.rules.values())
            .filter(rule => rule.active && rule.trigger === event.type);

        for (const rule of matchingRules) {
            try {
                if (this.evaluateConditions(rule.conditions, event.data)) {
                    await this.executeActions(rule.actions, event.data);
                    this.logRuleExecution(rule, event, 'success');
                }
            } catch (error) {
                console.error(`Error executing rule ${rule.id}:`, error);
                this.logRuleExecution(rule, event, 'error', error.message);
            }
        }
    }

    // Evaluate rule conditions
    evaluateConditions(conditions, data) {
        if (!conditions || conditions.length === 0) {
            return true;
        }

        return conditions.every(condition => {
            const value = this.getNestedValue(data, condition.field);
            return this.evaluateCondition(value, condition.operator, condition.value);
        });
    }

    // Evaluate a single condition
    evaluateCondition(actualValue, operator, expectedValue) {
        switch (operator) {
            case 'equals':
                return actualValue === expectedValue;
            case 'notEquals':
                return actualValue !== expectedValue;
            case 'greaterThan':
                return actualValue > expectedValue;
            case 'greaterThanOrEqual':
                return actualValue >= expectedValue;
            case 'lessThan':
                return actualValue < expectedValue;
            case 'lessThanOrEqual':
                return actualValue <= expectedValue;
            case 'contains':
                return String(actualValue).includes(String(expectedValue));
            case 'notContains':
                return !String(actualValue).includes(String(expectedValue));
            case 'startsWith':
                return String(actualValue).startsWith(String(expectedValue));
            case 'endsWith':
                return String(actualValue).endsWith(String(expectedValue));
            case 'isEmpty':
                return !actualValue || actualValue === '';
            case 'isNotEmpty':
                return actualValue && actualValue !== '';
            default:
                return false;
        }
    }

    // Execute rule actions
    async executeActions(actions, data) {
        for (const action of actions) {
            const actionConfig = this.actions.get(action.type);
            if (actionConfig && actionConfig.execute) {
                const parameters = this.interpolateParameters(action.parameters, data);
                await actionConfig.execute(parameters);
            }
        }
    }

    // Interpolate template variables in parameters
    interpolateParameters(parameters, data) {
        const interpolated = {};
        
        for (const [key, value] of Object.entries(parameters)) {
            if (typeof value === 'string') {
                interpolated[key] = this.interpolateString(value, data);
            } else {
                interpolated[key] = value;
            }
        }
        
        return interpolated;
    }

    // Interpolate template variables in a string
    interpolateString(template, data) {
        return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
            const value = this.getNestedValue(data, path.trim());
            return value !== undefined ? value : match;
        });
    }

    // Get nested value from object using dot notation
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    // Action implementations
    async sendSMS(parameters) {
        console.log('Sending SMS:', parameters);
        // In a real implementation, this would integrate with an SMS service
        // For now, we'll simulate the SMS sending
        
        const smsLog = {
            id: Utils.generateId(),
            recipient: parameters.recipient,
            message: parameters.message,
            template: parameters.template,
            timestamp: new Date().toISOString(),
            status: 'sent',
            type: 'automation'
        };
        
        // Store SMS log
        this.logSMS(smsLog);
        
        // Show notification
        Utils.showToast(`SMS gönderildi: ${parameters.recipient}`, 'success');
        
        return smsLog;
    }

    async sendBulkSMS(parameters) {
        console.log('Sending bulk SMS:', parameters);
        const results = [];
        
        for (const recipient of parameters.recipients) {
            const result = await this.sendSMS({
                recipient: recipient,
                message: parameters.message,
                template: parameters.template
            });
            results.push(result);
        }
        
        return results;
    }

    async sendEmail(parameters) {
        console.log('Sending email:', parameters);
        // Email implementation would go here
        Utils.showToast(`E-posta gönderildi: ${parameters.recipient}`, 'success');
    }

    async createAppointment(parameters) {
        console.log('Creating appointment:', parameters);
        // Appointment creation implementation would go here
        Utils.showToast('Otomatik randevu oluşturuldu', 'success');
    }

    async rescheduleAppointment(parameters) {
        console.log('Rescheduling appointment:', parameters);
        // Appointment rescheduling implementation would go here
        Utils.showToast('Randevu yeniden planlandı', 'success');
    }

    async createTask(parameters) {
        console.log('Creating task:', parameters);
        // Task creation implementation would go here
        Utils.showToast('Görev oluşturuldu', 'success');
    }

    async createNotification(parameters) {
        console.log('Creating notification:', parameters);
        
        const notification = {
            id: Utils.generateId(),
            recipient: parameters.recipient,
            title: parameters.title,
            message: parameters.message,
            type: parameters.type || 'info',
            timestamp: new Date().toISOString(),
            read: false,
            source: 'automation'
        };
        
        // Store notification
        NotificationManager.add(notification);
        
        return notification;
    }

    async updateData(parameters) {
        console.log('Updating data:', parameters);
        // Data update implementation would go here
        Utils.showToast('Veri güncellendi', 'success');
    }

    async startWorkflow(parameters) {
        console.log('Starting workflow:', parameters);
        // Workflow starting implementation would go here
        Utils.showToast('İş akışı başlatıldı', 'success');
    }

    // Utility methods
    logSMS(smsLog) {
        const smsLogs = JSON.parse(localStorage.getItem('smsLogs') || '[]');
        smsLogs.push(smsLog);
        localStorage.setItem('smsLogs', JSON.stringify(smsLogs));
    }

    logRuleExecution(rule, event, status, error = null) {
        const log = {
            id: Utils.generateId(),
            ruleId: rule.id,
            ruleName: rule.name,
            eventType: event.type,
            status: status,
            error: error,
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - event.timestamp
        };
        
        const executionLogs = JSON.parse(localStorage.getItem('automationLogs') || '[]');
        executionLogs.push(log);
        
        // Keep only last 1000 logs
        if (executionLogs.length > 1000) {
            executionLogs.splice(0, executionLogs.length - 1000);
        }
        
        localStorage.setItem('automationLogs', JSON.stringify(executionLogs));
    }

    saveRules() {
        const rulesArray = Array.from(this.rules.values());
        localStorage.setItem('automationRules', JSON.stringify(rulesArray));
    }

    // Public API methods
    getRules() {
        return Array.from(this.rules.values());
    }

    getRule(ruleId) {
        return this.rules.get(ruleId);
    }

    getTriggers() {
        return Array.from(this.triggers.entries()).map(([id, config]) => ({ id, ...config }));
    }

    getActions() {
        return Array.from(this.actions.entries()).map(([id, config]) => ({ id, ...config }));
    }

    getExecutionLogs() {
        return JSON.parse(localStorage.getItem('automationLogs') || '[]');
    }

    getSMSLogs() {
        return JSON.parse(localStorage.getItem('smsLogs') || '[]');
    }

    // Start scheduled tasks (would be called by a scheduler)
    startScheduledTasks() {
        // Daily tasks
        setInterval(() => {
            this.runDailyTasks();
        }, 24 * 60 * 60 * 1000); // 24 hours

        // Hourly tasks
        setInterval(() => {
            this.runHourlyTasks();
        }, 60 * 60 * 1000); // 1 hour

        // Run initial tasks
        this.runDailyTasks();
        this.runHourlyTasks();
    }

    runDailyTasks() {
        // Check for birthdays
        this.checkBirthdays();
        
        // Check for follow-up appointments
        this.checkFollowUpDue();
        
        // Check device trial expiry
        this.checkDeviceTrialExpiry();
        
        // Check low inventory
        this.checkLowInventory();
        
        // Check SGK report deadlines
        this.checkSGKDeadlines();
    }

    runHourlyTasks() {
        // Check appointment reminders
        this.checkAppointmentReminders();
        
        // Check for no-shows
        this.checkNoShows();
    }

    // Scheduled task implementations
    checkBirthdays() {
        const today = new Date();
        const todayStr = `${today.getMonth() + 1}-${today.getDate()}`;
        
        if (window.sampleData?.patients) {
            window.sampleData.patients.forEach(patient => {
                if (patient.dateOfBirth) {
                    const birthDate = new Date(patient.dateOfBirth);
                    const birthStr = `${birthDate.getMonth() + 1}-${birthDate.getDate()}`;
                    
                    if (birthStr === todayStr) {
                        this.processEvent('patient.birthday', { patient });
                    }
                }
            });
        }
    }

    checkFollowUpDue() {
        // Implementation for checking follow-up appointments
        // This would check the last appointment date and determine if follow-up is due
    }

    checkDeviceTrialExpiry() {
        // Implementation for checking device trial expiry
        // This would check active device trials and their expiry dates
    }

    checkLowInventory() {
        if (window.sampleData?.inventory) {
            window.sampleData.inventory.forEach(item => {
                if (item.inventory <= item.minInventory) {
                    this.processEvent('inventory.low.inventory', { inventoryItem: item });
                }
            });
        }
    }

    checkSGKDeadlines() {
        // Implementation for checking SGK report deadlines
        // This would check pending SGK reports and their deadlines
    }

    checkAppointmentReminders() {
        // Implementation for checking appointment reminders
        // This would check upcoming appointments and send reminders
    }

    checkNoShows() {
        // Implementation for checking no-shows
        // This would check appointments that have passed without being marked as completed
    }
}

// Initialize Automation Engine
let automationEngine;
document.addEventListener('DOMContentLoaded', () => {
    automationEngine = new AutomationEngine();
    
    // Start scheduled tasks after a delay to ensure everything is loaded
    setTimeout(() => {
        automationEngine.startScheduledTasks();
    }, 5000);
});

// Export for global access
window.AutomationEngine = AutomationEngine;
window.automationEngine = automationEngine;