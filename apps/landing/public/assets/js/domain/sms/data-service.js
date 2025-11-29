export class SmsDataService {
    constructor() {
        this.MESSAGES_KEY = 'sms_messages';
        this.TEMPLATES_KEY = 'sms_templates';
        this.CAMPAIGNS_KEY = 'sms_campaigns';
        this.SETTINGS_KEY = 'sms_settings';
        this.initializeDefaultData();
    }
    initializeDefaultData() {
        if (!localStorage.getItem(this.MESSAGES_KEY)) {
            this.createSampleMessages();
        }
        if (!localStorage.getItem(this.TEMPLATES_KEY)) {
            this.createSampleTemplates();
        }
        if (!localStorage.getItem(this.CAMPAIGNS_KEY)) {
            this.createSampleCampaigns();
        }
        if (!localStorage.getItem(this.SETTINGS_KEY)) {
            this.createDefaultSettings();
        }
    }
    createSampleMessages() {
        const sampleMessages = [
            {
                id: '1',
                patientId: '1',
                patientName: 'Ahmet Yılmaz',
                phoneNumber: '05551234567',
                message: 'Sayın Ahmet Yılmaz, yarınki randevunuzu hatırlatmak isteriz. X-Ear İşitme Merkezi - 14:00',
                templateId: '1',
                scheduledAt: '2024-01-16T13:00:00',
                sentAt: '2024-01-16T13:00:00',
                deliveredAt: '2024-01-16T13:00:15',
                status: 'delivered',
                messageType: 'appointment_reminder',
                createdAt: '2024-01-15T10:30:00'
            },
            {
                id: '2',
                patientId: '2',
                patientName: 'Ayşe Demir',
                phoneNumber: '05559876543',
                message: 'Sayın Ayşe Demir, işitme cihazınızın bakım zamanı geldi. Randevu için arayınız: 0212-555-0000',
                templateId: '2',
                sentAt: '2024-01-20T09:15:00',
                deliveredAt: '2024-01-20T09:15:22',
                status: 'delivered',
                messageType: 'automated',
                createdAt: '2024-01-20T09:15:00'
            },
            {
                id: '3',
                patientName: 'Mehmet Kaya',
                phoneNumber: '05558765432',
                message: 'X-Ear İşitme Merkezi\'nden özel indirim fırsatı! Bu ay %20 indirimle yeni işitme cihazları.',
                campaignId: '1',
                scheduledAt: '2024-01-25T10:00:00',
                status: 'scheduled',
                messageType: 'campaign',
                createdAt: '2024-01-24T16:00:00'
            },
            {
                id: '4',
                phoneNumber: '05554321098',
                message: 'Test mesajı - SMS servisinin çalıştığını kontrol etmek için.',
                status: 'draft',
                messageType: 'manual',
                createdAt: '2024-01-25T14:45:00'
            }
        ];
        localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(sampleMessages));
    }
    createSampleTemplates() {
        const sampleTemplates = [
            {
                id: '1',
                name: 'Randevu Hatırlatma',
                message: 'Sayın {patientName}, yarınki randevunuzu hatırlatmak isteriz. {clinicName} - {appointmentTime}',
                category: 'appointment',
                variables: ['{patientName}', '{clinicName}', '{appointmentTime}'],
                isActive: true,
                createdAt: '2024-01-01T00:00:00'
            },
            {
                id: '2',
                name: 'Bakım Hatırlatması',
                message: 'Sayın {patientName}, işitme cihazınızın bakım zamanı geldi. Randevu için arayınız: {phoneNumber}',
                category: 'reminder',
                variables: ['{patientName}', '{phoneNumber}'],
                isActive: true,
                createdAt: '2024-01-01T00:00:00'
            },
            {
                id: '3',
                name: 'Pil Değişim Hatırlatması',
                message: 'Merhaba {patientName}, işitme cihazı pilinizi değiştirme zamanı. Yeni piller için mağazamızı ziyaret edin.',
                category: 'reminder',
                variables: ['{patientName}'],
                isActive: true,
                createdAt: '2024-01-01T00:00:00'
            },
            {
                id: '4',
                name: 'Promosyon Mesajı',
                message: '{clinicName}\'den özel indirim fırsatı! Bu ay %{discount} indirimle {productName}. Detaylar: {phoneNumber}',
                category: 'marketing',
                variables: ['{clinicName}', '{discount}', '{productName}', '{phoneNumber}'],
                isActive: true,
                createdAt: '2024-01-01T00:00:00'
            },
            {
                id: '5',
                name: 'Doğum Günü Kutlaması',
                message: 'Sevgili {patientName}, doğum gününüz kutlu olsun! Bu özel gününüzde size özel %15 indirim fırsatımız var.',
                category: 'custom',
                variables: ['{patientName}'],
                isActive: true,
                createdAt: '2024-01-01T00:00:00'
            }
        ];
        localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(sampleTemplates));
    }
    createSampleCampaigns() {
        const sampleCampaigns = [
            {
                id: '1',
                name: 'Yeni Yıl Kampanyası',
                description: 'Yeni yıl için özel indirim kampanyası',
                templateId: '4',
                targetPatients: ['1', '2', '3'],
                scheduledAt: '2024-01-25T10:00:00',
                status: 'scheduled',
                totalRecipients: 3,
                sentCount: 0,
                deliveredCount: 0,
                failedCount: 0,
                createdAt: '2024-01-20T14:00:00'
            },
            {
                id: '2',
                name: 'Bakım Hatırlatma Kampanyası',
                description: 'Altı aylık bakım hatırlatması',
                templateId: '2',
                targetPatients: ['4', '5', '6', '7', '8'],
                status: 'completed',
                totalRecipients: 5,
                sentCount: 5,
                deliveredCount: 4,
                failedCount: 1,
                createdAt: '2024-01-15T09:00:00',
                updatedAt: '2024-01-15T12:00:00'
            }
        ];
        localStorage.setItem(this.CAMPAIGNS_KEY, JSON.stringify(sampleCampaigns));
    }
    createDefaultSettings() {
        const defaultSettings = {
            provider: 'netgsm',
            username: '',
            senderId: 'X-EAR',
            isActive: false,
            dailyLimit: 1000,
            monthlyLimit: 10000,
            currentDailyUsage: 0,
            currentMonthlyUsage: 0,
            lastResetDate: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(defaultSettings));
    }
    // Message CRUD Operations
    getAllMessages() {
        const data = localStorage.getItem(this.MESSAGES_KEY);
        return data ? JSON.parse(data) : [];
    }
    getMessageById(id) {
        return this.getAllMessages().find(message => message.id === id);
    }
    searchMessages(filters) {
        let messages = this.getAllMessages();
        if (filters.query) {
            const query = filters.query.toLowerCase();
            messages = messages.filter(message => message.message.toLowerCase().includes(query) ||
                message.patientName?.toLowerCase().includes(query) ||
                message.phoneNumber.includes(query));
        }
        if (filters.phoneNumber) {
            messages = messages.filter(message => message.phoneNumber.includes(filters.phoneNumber));
        }
        if (filters.patientName) {
            messages = messages.filter(message => message.patientName?.toLowerCase().includes(filters.patientName.toLowerCase()));
        }
        if (filters.status) {
            messages = messages.filter(message => message.status === filters.status);
        }
        if (filters.messageType) {
            messages = messages.filter(message => message.messageType === filters.messageType);
        }
        if (filters.campaignId) {
            messages = messages.filter(message => message.campaignId === filters.campaignId);
        }
        if (filters.dateFrom) {
            messages = messages.filter(message => message.createdAt >= filters.dateFrom);
        }
        if (filters.dateTo) {
            messages = messages.filter(message => message.createdAt <= filters.dateTo);
        }
        return messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    createMessage(data) {
        try {
            const validation = this.validateMessage(data);
            if (!validation.isValid) {
                return { success: false, error: validation.errors.join(', ') };
            }
            const messages = this.getAllMessages();
            const newMessage = {
                ...data,
                id: Date.now().toString(),
                createdAt: new Date().toISOString()
            };
            messages.push(newMessage);
            localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages));
            return { success: true, data: newMessage };
        }
        catch (error) {
            return { success: false, error: `SMS oluşturulurken hata oluştu: ${error}` };
        }
    }
    updateMessage(id, data) {
        try {
            const messages = this.getAllMessages();
            const index = messages.findIndex(message => message.id === id);
            if (index === -1) {
                return { success: false, error: 'SMS bulunamadı' };
            }
            const updatedMessage = {
                ...messages[index],
                ...data,
                id,
                updatedAt: new Date().toISOString()
            };
            const validation = this.validateMessage(updatedMessage);
            if (!validation.isValid) {
                return { success: false, error: validation.errors.join(', ') };
            }
            messages[index] = updatedMessage;
            localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages));
            return { success: true, data: updatedMessage };
        }
        catch (error) {
            return { success: false, error: `SMS güncellenirken hata oluştu: ${error}` };
        }
    }
    deleteMessage(id) {
        try {
            const messages = this.getAllMessages();
            const message = messages.find(m => m.id === id);
            if (!message) {
                return { success: false, error: 'SMS bulunamadı' };
            }
            if (message.status === 'sent' || message.status === 'delivered') {
                return { success: false, error: 'Gönderilmiş SMS silinemez' };
            }
            const filteredMessages = messages.filter(message => message.id !== id);
            localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(filteredMessages));
            return { success: true, data: true };
        }
        catch (error) {
            return { success: false, error: `SMS silinirken hata oluştu: ${error}` };
        }
    }
    // Template Operations
    getAllTemplates() {
        const data = localStorage.getItem(this.TEMPLATES_KEY);
        return data ? JSON.parse(data) : [];
    }
    getTemplateById(id) {
        return this.getAllTemplates().find(template => template.id === id);
    }
    createTemplate(data) {
        try {
            const templates = this.getAllTemplates();
            const newTemplate = {
                ...data,
                id: Date.now().toString(),
                createdAt: new Date().toISOString()
            };
            templates.push(newTemplate);
            localStorage.setItem(this.TEMPLATES_KEY, JSON.stringify(templates));
            return { success: true, data: newTemplate };
        }
        catch (error) {
            return { success: false, error: `Şablon oluşturulurken hata oluştu: ${error}` };
        }
    }
    // Campaign Operations
    getAllCampaigns() {
        const data = localStorage.getItem(this.CAMPAIGNS_KEY);
        return data ? JSON.parse(data) : [];
    }
    getCampaignById(id) {
        return this.getAllCampaigns().find(campaign => campaign.id === id);
    }
    createCampaign(data) {
        try {
            const campaigns = this.getAllCampaigns();
            const newCampaign = {
                ...data,
                id: Date.now().toString(),
                sentCount: 0,
                deliveredCount: 0,
                failedCount: 0,
                createdAt: new Date().toISOString()
            };
            campaigns.push(newCampaign);
            localStorage.setItem(this.CAMPAIGNS_KEY, JSON.stringify(campaigns));
            return { success: true, data: newCampaign };
        }
        catch (error) {
            return { success: false, error: `Kampanya oluşturulurken hata oluştu: ${error}` };
        }
    }
    // SMS Sending Operations
    sendMessage(id) {
        try {
            const message = this.getMessageById(id);
            if (!message) {
                return { success: false, error: 'SMS bulunamadı' };
            }
            if (message.status !== 'draft' && message.status !== 'scheduled') {
                return { success: false, error: 'Sadece taslak veya zamanlanmış SMS gönderilebilir' };
            }
            const settings = this.getSettings();
            if (!settings.isActive) {
                return { success: false, error: 'SMS servisi aktif değil' };
            }
            // Check daily limits
            if (settings.currentDailyUsage >= settings.dailyLimit) {
                return { success: false, error: 'Günlük SMS limiti aşıldı' };
            }
            // Simulate SMS sending
            const updatedMessage = {
                ...message,
                status: 'sent',
                sentAt: new Date().toISOString(),
                deliveredAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            // Update usage statistics
            this.updateUsageStats(1);
            // Simulate delivery after a short delay
            setTimeout(() => {
                this.updateMessage(id, { status: 'delivered', deliveredAt: new Date().toISOString() });
            }, 1000);
            return this.updateMessage(id, updatedMessage);
        }
        catch (error) {
            return { success: false, error: `SMS gönderilirken hata oluştu: ${error}` };
        }
    }
    sendBulkMessages(ids) {
        let successCount = 0;
        let failedCount = 0;
        const errors = [];
        for (const id of ids) {
            const result = this.sendMessage(id);
            if (result.success) {
                successCount++;
            }
            else {
                failedCount++;
                errors.push(`${id}: ${result.error}`);
            }
        }
        return {
            success: true,
            data: { success: successCount, failed: failedCount, errors }
        };
    }
    scheduleCampaign(campaignId, scheduleTime) {
        try {
            const campaign = this.getCampaignById(campaignId);
            if (!campaign) {
                return { success: false, error: 'Kampanya bulunamadı' };
            }
            const template = this.getTemplateById(campaign.templateId);
            if (!template) {
                return { success: false, error: 'Kampanya şablonu bulunamadı' };
            }
            // Create individual messages for each target patient
            const messages = campaign.targetPatients.map((patientId, index) => ({
                id: `${campaignId}_${index}_${Date.now()}`,
                patientId,
                phoneNumber: this.getPatientPhone(patientId),
                message: this.processTemplate(template.message, { patientName: this.getPatientName(patientId) }),
                templateId: template.id,
                campaignId: campaignId,
                scheduledAt: scheduleTime,
                status: 'scheduled',
                messageType: 'campaign',
                createdAt: new Date().toISOString()
            }));
            // Save messages
            const existingMessages = this.getAllMessages();
            existingMessages.push(...messages);
            localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(existingMessages));
            // Update campaign status
            const updatedCampaign = {
                ...campaign,
                scheduledAt: scheduleTime,
                status: 'scheduled',
                updatedAt: new Date().toISOString()
            };
            return this.updateCampaign(campaignId, updatedCampaign);
        }
        catch (error) {
            return { success: false, error: `Kampanya zamanlanırken hata oluştu: ${error}` };
        }
    }
    updateCampaign(id, data) {
        try {
            const campaigns = this.getAllCampaigns();
            const index = campaigns.findIndex(campaign => campaign.id === id);
            if (index === -1) {
                return { success: false, error: 'Kampanya bulunamadı' };
            }
            const updatedCampaign = {
                ...campaigns[index],
                ...data,
                id,
                updatedAt: new Date().toISOString()
            };
            campaigns[index] = updatedCampaign;
            localStorage.setItem(this.CAMPAIGNS_KEY, JSON.stringify(campaigns));
            return { success: true, data: updatedCampaign };
        }
        catch (error) {
            return { success: false, error: `Kampanya güncellenirken hata oluştu: ${error}` };
        }
    }
    // Settings Operations
    getSettings() {
        const data = localStorage.getItem(this.SETTINGS_KEY);
        if (data) {
            return JSON.parse(data);
        }
        else {
            this.createDefaultSettings();
            const newData = localStorage.getItem(this.SETTINGS_KEY);
            return newData ? JSON.parse(newData) : {
                provider: 'netgsm',
                username: '',
                senderId: 'X-EAR',
                isActive: false,
                dailyLimit: 1000,
                monthlyLimit: 10000,
                currentDailyUsage: 0,
                currentMonthlyUsage: 0,
                lastResetDate: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }
    }
    updateSettings(settings) {
        try {
            const currentSettings = this.getSettings();
            const updatedSettings = {
                ...currentSettings,
                ...settings,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updatedSettings));
            return { success: true, data: updatedSettings };
        }
        catch (error) {
            return { success: false, error: `Ayarlar güncellenirken hata oluştu: ${error}` };
        }
    }
    // Utility Methods
    validateMessage(data) {
        const errors = [];
        const warnings = [];
        if (!data.phoneNumber)
            errors.push('Telefon numarası zorunludur');
        if (!data.message)
            errors.push('Mesaj içeriği zorunludur');
        if (data.phoneNumber && !this.isValidPhoneNumber(data.phoneNumber)) {
            errors.push('Geçerli bir telefon numarası giriniz');
        }
        if (data.message && data.message.length > 160) {
            warnings.push('Mesaj 160 karakterden uzun. Ek ücret uygulanabilir.');
        }
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    isValidPhoneNumber(phone) {
        // Turkish mobile number validation
        const phoneRegex = /^(05)[0-9]{9}$/;
        return phoneRegex.test(phone);
    }
    processTemplate(template, variables) {
        let processed = template;
        Object.entries(variables).forEach(([key, value]) => {
            processed = processed.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        });
        return processed;
    }
    getPatientPhone(patientId) {
        // This would normally fetch from patient service
        const phoneMap = {
            '1': '05551234567',
            '2': '05559876543',
            '3': '05558765432'
        };
        return phoneMap[patientId] || '05550000000';
    }
    getPatientName(patientId) {
        // This would normally fetch from patient service
        const nameMap = {
            '1': 'Ahmet Yılmaz',
            '2': 'Ayşe Demir',
            '3': 'Mehmet Kaya'
        };
        return nameMap[patientId] || 'Değerli Hastamız';
    }
    updateUsageStats(count) {
        const settings = this.getSettings();
        const today = new Date().toDateString();
        const lastResetDate = new Date(settings.lastResetDate).toDateString();
        // Reset daily usage if it's a new day
        if (today !== lastResetDate) {
            settings.currentDailyUsage = 0;
            settings.lastResetDate = new Date().toISOString();
        }
        settings.currentDailyUsage += count;
        settings.currentMonthlyUsage += count;
        this.updateSettings(settings);
    }
    // Statistics
    getStatistics() {
        const messages = this.getAllMessages();
        const campaigns = this.getAllCampaigns();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyMessages = messages.filter(msg => {
            const date = new Date(msg.createdAt);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        return {
            totalMessages: messages.length,
            monthlyMessages: monthlyMessages.length,
            byStatus: {
                draft: messages.filter(msg => msg.status === 'draft').length,
                scheduled: messages.filter(msg => msg.status === 'scheduled').length,
                sent: messages.filter(msg => msg.status === 'sent').length,
                delivered: messages.filter(msg => msg.status === 'delivered').length,
                failed: messages.filter(msg => msg.status === 'failed').length
            },
            byType: {
                manual: messages.filter(msg => msg.messageType === 'manual').length,
                appointment_reminder: messages.filter(msg => msg.messageType === 'appointment_reminder').length,
                campaign: messages.filter(msg => msg.messageType === 'campaign').length,
                automated: messages.filter(msg => msg.messageType === 'automated').length
            },
            campaigns: {
                total: campaigns.length,
                active: campaigns.filter(c => c.status === 'scheduled' || c.status === 'sending').length,
                completed: campaigns.filter(c => c.status === 'completed').length
            },
            settings: this.getSettings()
        };
    }
}
