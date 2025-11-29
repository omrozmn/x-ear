// X-Ear CRM - SMS Gateway Integration
class SMSGatewayManager {
    constructor() {
        this.providers = {
            'turktelekom': {
                name: 'Türk Telekom',
                apiUrl: 'https://api.ttmessage.com',
                supports: ['single', 'bulk', 'scheduled'],
                maxLength: 160,
                encoding: 'GSM7'
            },
            'turkcell': {
                name: 'Turkcell',
                apiUrl: 'https://api.turkcellmessage.com',
                supports: ['single', 'bulk', 'scheduled', 'template'],
                maxLength: 160,
                encoding: 'GSM7'
            },
            'vodafone': {
                name: 'Vodafone',
                apiUrl: 'https://api.vodafonemessage.com',
                supports: ['single', 'bulk'],
                maxLength: 160,
                encoding: 'GSM7'
            },
            'netgsm': {
                name: 'NetGSM',
                apiUrl: 'https://api.netgsm.com.tr',
                supports: ['single', 'bulk', 'scheduled', 'delivery'],
                maxLength: 160,
                encoding: 'GSM7'
            },
            'iletimerkezi': {
                name: 'İletimerkezi',
                apiUrl: 'https://api.iletimerkezi.com',
                supports: ['single', 'bulk', 'scheduled', 'template', 'delivery'],
                maxLength: 160,
                encoding: 'GSM7'
            }
        };
        
        this.messageQueue = [];
        this.deliveryTracking = new Map();
        this.rateLimits = new Map();
        this.init();
    }

    init() {
        this.loadConfiguration();
        this.setupMessageQueue();
        this.startDeliveryTracking();
    }

    loadConfiguration() {
        this.config = Storage.load('sms_gateway_config') || {
            provider: 'netgsm',
            credentials: {},
            settings: {
                enableDeliveryTracking: true,
                maxRetries: 3,
                retryDelay: 5000,
                rateLimit: 100, // messages per minute
                defaultSender: 'X-EAR'
            }
        };
    }

    saveConfiguration(config) {
        this.config = { ...this.config, ...config };
        Storage.save('sms_gateway_config', this.config);
    }

    // Configure SMS provider
    configureProvider(provider, credentials, settings = {}) {
        if (!this.providers[provider]) {
            throw new Error(`Desteklenmeyen SMS sağlayıcısı: ${provider}`);
        }

        this.saveConfiguration({
            provider,
            credentials,
            settings: { ...this.config.settings, ...settings }
        });

        Utils.showToast(`${this.providers[provider].name} yapılandırıldı`, 'success');
    }

    // Send single SMS
    async sendSMS(phoneNumber, message, options = {}) {
        try {
            // Validate phone number
            const cleanPhone = this.cleanPhoneNumber(phoneNumber);
            if (!this.validatePhoneNumber(cleanPhone)) {
                throw new Error('Geçersiz telefon numarası');
            }

            // Validate message
            if (!message || message.trim().length === 0) {
                throw new Error('Mesaj boş olamaz');
            }

            // Check rate limits
            await this.checkRateLimit();

            // Prepare message
            const smsData = {
                id: 'sms-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                to: cleanPhone,
                message: message.trim(),
                sender: options.sender || this.config.settings.defaultSender,
                scheduledAt: options.scheduledAt || null,
                priority: options.priority || 'normal',
                template: options.template || null,
                patientId: options.patientId || null,
                campaignId: options.campaignId || null,
                createdAt: new Date().toISOString(),
                status: 'pending'
            };

            // Add to queue
            this.messageQueue.push(smsData);

            // Process immediately if not scheduled
            if (!smsData.scheduledAt) {
                await this.processMessage(smsData);
            }

            return smsData;

        } catch (error) {
            console.error('SMS gönderme hatası:', error);
            throw error;
        }
    }

    // Send bulk SMS
    async sendBulkSMS(recipients, message, options = {}) {
        const results = [];
        const batchSize = 50; // Process in batches

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(
                batch.map(recipient => {
                    const phoneNumber = typeof recipient === 'string' ? recipient : recipient.phone;
                    const personalizedMessage = this.personalizeMessage(message, recipient);
                    return this.sendSMS(phoneNumber, personalizedMessage, {
                        ...options,
                        patientId: typeof recipient === 'object' ? recipient.id : null
                    });
                })
            );

            results.push(...batchResults);

            // Wait between batches to respect rate limits
            if (i + batchSize < recipients.length) {
                await this.delay(1000);
            }
        }

        return results;
    }

    // Process individual message
    async processMessage(smsData) {
        try {
            smsData.status = 'sending';
            this.updateMessageStatus(smsData);

            // Simulate API call to SMS provider
            const result = await this.callProviderAPI(smsData);
            
            smsData.status = 'sent';
            smsData.sentAt = new Date().toISOString();
            smsData.providerId = result.messageId;
            smsData.cost = result.cost || 0;

            // Start delivery tracking if enabled
            if (this.config.settings.enableDeliveryTracking) {
                this.startMessageTracking(smsData);
            }

            this.updateMessageStatus(smsData);
            this.logMessage(smsData, 'success');

            return smsData;

        } catch (error) {
            smsData.status = 'failed';
            smsData.error = error.message;
            smsData.failedAt = new Date().toISOString();
            
            this.updateMessageStatus(smsData);
            this.logMessage(smsData, 'error', error.message);

            // Retry logic
            if ((smsData.retryCount || 0) < this.config.settings.maxRetries) {
                setTimeout(() => {
                    smsData.retryCount = (smsData.retryCount || 0) + 1;
                    smsData.status = 'pending';
                    this.processMessage(smsData);
                }, this.config.settings.retryDelay);
            }

            throw error;
        }
    }

    // Mock API call to SMS provider
    async callProviderAPI(smsData) {
        const provider = this.providers[this.config.provider];
        
        // Simulate API delay
        await this.delay(Math.random() * 1000 + 500);

        // Simulate API response based on provider
        const success = Math.random() > 0.05; // 95% success rate
        
        if (!success) {
            throw new Error('SMS sağlayıcısından hata döndü');
        }

        return {
            messageId: 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
            cost: this.calculateCost(smsData.message),
            status: 'sent'
        };
    }

    // Message personalization
    personalizeMessage(template, recipient) {
        if (typeof recipient === 'string') {
            return template;
        }

        let message = template;
        
        // Replace placeholders
        const placeholders = {
            '{firstName}': recipient.firstName || '',
            '{lastName}': recipient.lastName || '',
            '{fullName}': `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim(),
            '{phone}': recipient.phone || '',
            '{tcNo}': recipient.tcNo || '',
            '{birthDate}': recipient.birthDate ? new Date(recipient.birthDate).toLocaleDateString('tr-TR') : '',
            '{city}': recipient.city || '',
            '{district}': recipient.district || '',
            '{address}': recipient.address || ''
        };

        Object.entries(placeholders).forEach(([placeholder, value]) => {
            message = message.replace(new RegExp(placeholder, 'g'), value);
        });

        return message;
    }

    // Phone number validation and cleaning
    cleanPhoneNumber(phone) {
        // Remove all non-digit characters
        const cleaned = phone.replace(/\D/g, '');
        
        // Handle Turkish phone numbers
        if (cleaned.startsWith('90')) {
            return cleaned;
        } else if (cleaned.startsWith('0')) {
            return '90' + cleaned.substring(1);
        } else if (cleaned.length === 10) {
            return '90' + cleaned;
        }
        
        return cleaned;
    }

    validatePhoneNumber(phone) {
        // Turkish mobile number validation
        const turkishMobileRegex = /^90(5[0-9]{9})$/;
        return turkishMobileRegex.test(phone);
    }

    // Rate limiting
    async checkRateLimit() {
        const now = Date.now();
        const windowSize = 60000; // 1 minute
        const limit = this.config.settings.rateLimit;
        
        if (!this.rateLimits.has('sms')) {
            this.rateLimits.set('sms', []);
        }
        
        const timestamps = this.rateLimits.get('sms');
        
        // Remove old timestamps
        while (timestamps.length > 0 && timestamps[0] < now - windowSize) {
            timestamps.shift();
        }
        
        if (timestamps.length >= limit) {
            const waitTime = timestamps[0] + windowSize - now;
            throw new Error(`Rate limit aşıldı. ${Math.ceil(waitTime / 1000)} saniye bekleyin.`);
        }
        
        timestamps.push(now);
    }

    // Cost calculation
    calculateCost(message) {
        const length = message.length;
        const segments = Math.ceil(length / 160);
        const costPerSegment = 0.05; // 5 kuruş per segment
        return segments * costPerSegment;
    }

    // Message tracking
    startMessageTracking(smsData) {
        this.deliveryTracking.set(smsData.id, {
            ...smsData,
            trackingStarted: new Date().toISOString(),
            lastChecked: new Date().toISOString()
        });
    }

    // Setup message queue processing
    setupMessageQueue() {
        setInterval(() => {
            this.processScheduledMessages();
        }, 30000); // Check every 30 seconds
    }

    processScheduledMessages() {
        const now = new Date();
        const scheduledMessages = this.messageQueue.filter(msg => 
            msg.status === 'pending' && 
            msg.scheduledAt && 
            new Date(msg.scheduledAt) <= now
        );

        scheduledMessages.forEach(msg => {
            this.processMessage(msg).catch(error => {
                console.error('Zamanlanmış mesaj hatası:', error);
            });
        });
    }

    // Start delivery tracking service
    startDeliveryTracking() {
        if (!this.config.settings.enableDeliveryTracking) return;

        setInterval(() => {
            this.checkDeliveryStatus();
        }, 60000); // Check every minute
    }

    async checkDeliveryStatus() {
        for (const [messageId, trackingData] of this.deliveryTracking) {
            try {
                // Simulate delivery status check
                const status = await this.getDeliveryStatus(trackingData.providerId);
                
                if (status !== trackingData.status) {
                    trackingData.status = status;
                    trackingData.lastChecked = new Date().toISOString();
                    
                    if (status === 'delivered') {
                        trackingData.deliveredAt = new Date().toISOString();
                    }
                    
                    this.updateMessageStatus(trackingData);
                }
                
                // Remove from tracking if final status reached
                if (['delivered', 'failed', 'expired'].includes(status)) {
                    this.deliveryTracking.delete(messageId);
                }
                
            } catch (error) {
                console.error('Delivery status check error:', error);
            }
        }
    }

    async getDeliveryStatus(providerId) {
        // Simulate delivery status API call
        await this.delay(100);
        
        const statuses = ['sent', 'delivered', 'failed'];
        const probabilities = [0.1, 0.85, 0.05]; // 85% delivered, 10% still sending, 5% failed
        
        let random = Math.random();
        for (let i = 0; i < statuses.length; i++) {
            random -= probabilities[i];
            if (random <= 0) {
                return statuses[i];
            }
        }
        
        return 'delivered';
    }

    // Message logging and storage
    updateMessageStatus(smsData) {
        // Update in queue
        const queueIndex = this.messageQueue.findIndex(msg => msg.id === smsData.id);
        if (queueIndex !== -1) {
            this.messageQueue[queueIndex] = smsData;
        }

        // Save to persistent storage
        this.saveMessageToHistory(smsData);

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('smsStatusUpdate', {
            detail: smsData
        }));
    }

    saveMessageToHistory(smsData) {
        const history = Storage.load('sms_history') || [];
        const existingIndex = history.findIndex(msg => msg.id === smsData.id);
        
        if (existingIndex !== -1) {
            history[existingIndex] = smsData;
        } else {
            history.push(smsData);
        }
        
        // Keep only last 1000 messages
        if (history.length > 1000) {
            history.splice(0, history.length - 1000);
        }
        
        Storage.save('sms_history', history);
    }

    logMessage(smsData, level, message = '') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            messageId: smsData.id,
            level,
            message,
            data: {
                to: smsData.to,
                status: smsData.status,
                provider: this.config.provider
            }
        };

        const logs = Storage.load('sms_logs') || [];
        logs.push(logEntry);
        
        // Keep only last 500 logs
        if (logs.length > 500) {
            logs.splice(0, logs.length - 500);
        }
        
        Storage.save('sms_logs', logs);
    }

    // Get message history and statistics
    getMessageHistory(filters = {}) {
        const history = Storage.load('sms_history') || [];
        
        let filtered = history;
        
        if (filters.patientId) {
            filtered = filtered.filter(msg => msg.patientId === filters.patientId);
        }
        
        if (filters.status) {
            filtered = filtered.filter(msg => msg.status === filters.status);
        }
        
        if (filters.dateFrom) {
            filtered = filtered.filter(msg => new Date(msg.createdAt) >= new Date(filters.dateFrom));
        }
        
        if (filters.dateTo) {
            filtered = filtered.filter(msg => new Date(msg.createdAt) <= new Date(filters.dateTo));
        }
        
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    getStatistics(period = 'month') {
        const history = Storage.load('sms_history') || [];
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(0);
        }
        
        const periodMessages = history.filter(msg => 
            new Date(msg.createdAt) >= startDate
        );
        
        const stats = {
            total: periodMessages.length,
            sent: periodMessages.filter(msg => msg.status === 'sent').length,
            delivered: periodMessages.filter(msg => msg.status === 'delivered').length,
            failed: periodMessages.filter(msg => msg.status === 'failed').length,
            pending: periodMessages.filter(msg => msg.status === 'pending').length,
            totalCost: periodMessages.reduce((sum, msg) => sum + (msg.cost || 0), 0),
            deliveryRate: 0,
            successRate: 0
        };
        
        if (stats.sent > 0) {
            stats.deliveryRate = (stats.delivered / stats.sent * 100).toFixed(1);
            stats.successRate = ((stats.sent + stats.delivered) / stats.total * 100).toFixed(1);
        }
        
        return stats;
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Template management
    getMessageTemplates() {
        return Storage.load('sms_templates') || [
            {
                id: 'appointment_reminder',
                name: 'Randevu Hatırlatması',
                content: 'Sayın {fullName}, {date} tarihinde saat {time} randevunuz bulunmaktadır. X-Ear Klinik',
                category: 'appointment'
            },
            {
                id: 'appointment_confirmation',
                name: 'Randevu Onayı',
                content: 'Randevunuz onaylanmıştır. Tarih: {date} Saat: {time}. X-Ear Klinik',
                category: 'appointment'
            },
            {
                id: 'battery_reminder',
                name: 'Pil Hatırlatması',
                content: 'Sayın {fullName}, işitme cihazınızın pil değişim zamanı yaklaştı. Klinikimizi arayınız. X-Ear Klinik',
                category: 'maintenance'
            },
            {
                id: 'device_renewal',
                name: 'Cihaz Yenileme',
                content: 'İşitme cihazınızın garanti süresi dolmak üzere. Yenileme için randevu alınız. X-Ear Klinik',
                category: 'renewal'
            }
        ];
    }

    saveMessageTemplate(template) {
        const templates = this.getMessageTemplates();
        const existingIndex = templates.findIndex(t => t.id === template.id);
        
        if (existingIndex !== -1) {
            templates[existingIndex] = template;
        } else {
            templates.push(template);
        }
        
        Storage.save('sms_templates', templates);
    }

    deleteMessageTemplate(templateId) {
        const templates = this.getMessageTemplates();
        const filtered = templates.filter(t => t.id !== templateId);
        Storage.save('sms_templates', filtered);
    }
}

// Initialize SMS Gateway Manager
window.smsGatewayManager = new SMSGatewayManager();
