// X-Ear CRM - Email SMTP Integration
class EmailManager {
    constructor() {
        this.providers = {
            'gmail': {
                name: 'Gmail',
                smtp: 'smtp.gmail.com',
                port: 587,
                secure: false,
                auth: 'oauth2'
            },
            'outlook': {
                name: 'Outlook',
                smtp: 'smtp-mail.outlook.com',
                port: 587,
                secure: false,
                auth: 'login'
            },
            'yahoo': {
                name: 'Yahoo',
                smtp: 'smtp.mail.yahoo.com',
                port: 587,
                secure: false,
                auth: 'login'
            },
            'yandex': {
                name: 'Yandex',
                smtp: 'smtp.yandex.com',
                port: 587,
                secure: false,
                auth: 'login'
            },
            'custom': {
                name: 'Özel SMTP',
                smtp: '',
                port: 587,
                secure: false,
                auth: 'login'
            }
        };

        this.emailQueue = [];
        this.emailHistory = [];
        this.templates = this.getDefaultTemplates();
        this.init();
    }

    init() {
        this.loadConfiguration();
        this.setupEmailQueue();
        this.loadEmailHistory();
    }

    loadConfiguration() {
        this.config = Storage.load('email_config') || {
            provider: 'gmail',
            smtp: {
                host: '',
                port: 587,
                secure: false,
                user: '',
                password: ''
            },
            settings: {
                fromName: 'X-Ear Audiolog Kliniği',
                fromEmail: '',
                replyTo: '',
                maxRetries: 3,
                retryDelay: 5000,
                attachmentMaxSize: 25 * 1024 * 1024 // 25MB
            }
        };
    }

    saveConfiguration(config) {
        this.config = { ...this.config, ...config };
        Storage.save('email_config', this.config);
    }

    // Configure email provider
    configureProvider(provider, credentials, settings = {}) {
        if (!this.providers[provider]) {
            throw new Error(`Desteklenmeyen email sağlayıcısı: ${provider}`);
        }

        const providerConfig = this.providers[provider];
        
        this.saveConfiguration({
            provider,
            smtp: {
                host: providerConfig.smtp,
                port: providerConfig.port,
                secure: providerConfig.secure,
                user: credentials.email,
                password: credentials.password
            },
            settings: { 
                ...this.config.settings,
                fromEmail: credentials.email,
                ...settings 
            }
        });

        Utils.showToast(`${providerConfig.name} yapılandırıldı`, 'success');
    }

    // Send single email
    async sendEmail(to, subject, content, options = {}) {
        try {
            // Validate email address
            if (!this.validateEmail(to)) {
                throw new Error('Geçersiz email adresi');
            }

            // Validate configuration
            if (!this.config.smtp.host || !this.config.smtp.user) {
                throw new Error('Email yapılandırması tamamlanmamış');
            }

            // Prepare email data
            const emailData = {
                id: 'email-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                to: to,
                subject: subject,
                content: content,
                from: {
                    name: this.config.settings.fromName,
                    email: this.config.settings.fromEmail
                },
                replyTo: options.replyTo || this.config.settings.replyTo,
                attachments: options.attachments || [],
                priority: options.priority || 'normal',
                scheduledAt: options.scheduledAt || null,
                template: options.template || null,
                patientId: options.patientId || null,
                campaignId: options.campaignId || null,
                createdAt: new Date().toISOString(),
                status: 'pending'
            };

            // Validate attachments
            if (emailData.attachments.length > 0) {
                this.validateAttachments(emailData.attachments);
            }

            // Add to queue
            this.emailQueue.push(emailData);

            // Process immediately if not scheduled
            if (!emailData.scheduledAt) {
                await this.processEmail(emailData);
            }

            return emailData;

        } catch (error) {
            console.error('Email gönderme hatası:', error);
            throw error;
        }
    }

    // Send bulk emails
    async sendBulkEmail(recipients, subject, content, options = {}) {
        const results = [];
        const batchSize = 10; // Process in smaller batches for emails

        for (let i = 0; i < recipients.length; i += batchSize) {
            const batch = recipients.slice(i, i + batchSize);
            const batchResults = await Promise.allSettled(
                batch.map(recipient => {
                    const email = typeof recipient === 'string' ? recipient : recipient.email;
                    const personalizedSubject = this.personalizeContent(subject, recipient);
                    const personalizedContent = this.personalizeContent(content, recipient);
                    
                    return this.sendEmail(email, personalizedSubject, personalizedContent, {
                        ...options,
                        patientId: typeof recipient === 'object' ? recipient.id : null
                    });
                })
            );

            results.push(...batchResults);

            // Wait between batches
            if (i + batchSize < recipients.length) {
                await this.delay(2000);
            }
        }

        return results;
    }

    // Process individual email
    async processEmail(emailData) {
        try {
            emailData.status = 'sending';
            this.updateEmailStatus(emailData);

            // Simulate SMTP send
            const result = await this.sendViaProvider(emailData);
            
            emailData.status = 'sent';
            emailData.sentAt = new Date().toISOString();
            emailData.messageId = result.messageId;

            this.updateEmailStatus(emailData);
            this.logEmail(emailData, 'success');

            return emailData;

        } catch (error) {
            emailData.status = 'failed';
            emailData.error = error.message;
            emailData.failedAt = new Date().toISOString();
            
            this.updateEmailStatus(emailData);
            this.logEmail(emailData, 'error', error.message);

            // Retry logic
            if ((emailData.retryCount || 0) < this.config.settings.maxRetries) {
                setTimeout(() => {
                    emailData.retryCount = (emailData.retryCount || 0) + 1;
                    emailData.status = 'pending';
                    this.processEmail(emailData);
                }, this.config.settings.retryDelay);
            }

            throw error;
        }
    }

    // Mock SMTP send
    async sendViaProvider(emailData) {
        // Simulate SMTP connection and send
        await this.delay(Math.random() * 2000 + 1000);

        // Simulate occasional failures
        const success = Math.random() > 0.03; // 97% success rate
        
        if (!success) {
            throw new Error('SMTP sunucusundan hata döndü');
        }

        return {
            messageId: '<' + Date.now() + '.' + Math.random().toString(36).substr(2, 5) + '@' + this.config.smtp.host + '>',
            response: '250 Message accepted'
        };
    }

    // Content personalization
    personalizeContent(content, recipient) {
        if (typeof recipient === 'string') {
            return content;
        }

        let personalizedContent = content;
        
        // Replace placeholders
        const placeholders = {
            '{firstName}': recipient.firstName || '',
            '{lastName}': recipient.lastName || '',
            '{fullName}': `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim(),
            '{email}': recipient.email || '',
            '{phone}': recipient.phone || '',
            '{tcNo}': recipient.tcNo || '',
            '{birthDate}': recipient.birthDate ? new Date(recipient.birthDate).toLocaleDateString('tr-TR') : '',
            '{city}': recipient.city || '',
            '{district}': recipient.district || '',
            '{address}': recipient.address || '',
            '{currentDate}': new Date().toLocaleDateString('tr-TR'),
            '{currentTime}': new Date().toLocaleTimeString('tr-TR'),
            '{clinicName}': 'X-Ear Audiolog Kliniği',
            '{clinicPhone}': '+90 (212) 555-0123',
            '{clinicEmail}': 'info@x-ear.com',
            '{clinicAddress}': 'İstanbul, Türkiye'
        };

        Object.entries(placeholders).forEach(([placeholder, value]) => {
            personalizedContent = personalizedContent.replace(new RegExp(placeholder, 'g'), value);
        });

        return personalizedContent;
    }

    // Email validation
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Attachment validation
    validateAttachments(attachments) {
        const totalSize = attachments.reduce((sum, attachment) => sum + (attachment.size || 0), 0);
        
        if (totalSize > this.config.settings.attachmentMaxSize) {
            throw new Error('Toplam ek dosya boyutu 25MB\'ı aşamaz');
        }

        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];

        for (const attachment of attachments) {
            if (!allowedTypes.includes(attachment.type)) {
                throw new Error(`Desteklenmeyen dosya türü: ${attachment.type}`);
            }
        }
    }

    // Queue processing
    setupEmailQueue() {
        setInterval(() => {
            this.processScheduledEmails();
        }, 30000); // Check every 30 seconds
    }

    processScheduledEmails() {
        const now = new Date();
        const scheduledEmails = this.emailQueue.filter(email => 
            email.status === 'pending' && 
            email.scheduledAt && 
            new Date(email.scheduledAt) <= now
        );

        scheduledEmails.forEach(email => {
            this.processEmail(email).catch(error => {
                console.error('Zamanlanmış email hatası:', error);
            });
        });
    }

    // Email logging and storage
    updateEmailStatus(emailData) {
        // Update in queue
        const queueIndex = this.emailQueue.findIndex(email => email.id === emailData.id);
        if (queueIndex !== -1) {
            this.emailQueue[queueIndex] = emailData;
        }

        // Save to persistent storage
        this.saveEmailToHistory(emailData);

        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('emailStatusUpdate', {
            detail: emailData
        }));
    }

    saveEmailToHistory(emailData) {
        const historyIndex = this.emailHistory.findIndex(email => email.id === emailData.id);
        
        if (historyIndex !== -1) {
            this.emailHistory[historyIndex] = emailData;
        } else {
            this.emailHistory.push(emailData);
        }
        
        // Keep only last 500 emails
        if (this.emailHistory.length > 500) {
            this.emailHistory.splice(0, this.emailHistory.length - 500);
        }
        
        Storage.save('email_history', this.emailHistory);
    }

    loadEmailHistory() {
        this.emailHistory = Storage.load('email_history') || [];
    }

    logEmail(emailData, level, message = '') {
        const logEntry = {
            timestamp: new Date().toISOString(),
            emailId: emailData.id,
            level,
            message,
            data: {
                to: emailData.to,
                subject: emailData.subject,
                status: emailData.status
            }
        };

        const logs = Storage.load('email_logs') || [];
        logs.push(logEntry);
        
        // Keep only last 300 logs
        if (logs.length > 300) {
            logs.splice(0, logs.length - 300);
        }
        
        Storage.save('email_logs', logs);
    }

    // Template management
    getDefaultTemplates() {
        return [
            {
                id: 'appointment_reminder',
                name: 'Randevu Hatırlatması',
                subject: 'Randevu Hatırlatması - {clinicName}',
                content: `
                    <h2>Randevu Hatırlatması</h2>
                    <p>Sayın {fullName},</p>
                    <p><strong>{appointmentDate}</strong> tarihinde saat <strong>{appointmentTime}</strong> randevunuz bulunmaktadır.</p>
                    <p>Randevunuz için zamanında kliniğimizde bulunmanızı rica ederiz.</p>
                    <hr>
                    <p>Saygılarımızla,<br>
                    {clinicName}<br>
                    Tel: {clinicPhone}<br>
                    Email: {clinicEmail}</p>
                `,
                category: 'appointment'
            },
            {
                id: 'appointment_confirmation',
                name: 'Randevu Onayı',
                subject: 'Randevunuz Onaylandı - {clinicName}',
                content: `
                    <h2>Randevu Onayı</h2>
                    <p>Sayın {fullName},</p>
                    <p>Randevunuz başarıyla onaylanmıştır.</p>
                    <ul>
                        <li><strong>Tarih:</strong> {appointmentDate}</li>
                        <li><strong>Saat:</strong> {appointmentTime}</li>
                        <li><strong>Doktor:</strong> {doctorName}</li>
                    </ul>
                    <p>Randevunuzu iptal etmeniz gerekirse lütfen en az 24 saat öncesinden bildiriniz.</p>
                    <hr>
                    <p>Saygılarımızla,<br>
                    {clinicName}<br>
                    Tel: {clinicPhone}<br>
                    Email: {clinicEmail}</p>
                `,
                category: 'appointment'
            },
            {
                id: 'battery_reminder',
                name: 'Pil Hatırlatması',
                subject: 'İşitme Cihazı Pil Hatırlatması - {clinicName}',
                content: `
                    <h2>Pil Hatırlatması</h2>
                    <p>Sayın {fullName},</p>
                    <p>İşitme cihazınızın pil değişim zamanı yaklaştı.</p>
                    <p>Cihazınızın düzgün çalışması için pil değişimi önemlidir. En kısa zamanda kliniğimizi ziyaret edebilir veya pil siparişi verebilirsiniz.</p>
                    <p><strong>Randevu almak için:</strong> {clinicPhone}</p>
                    <hr>
                    <p>Saygılarımızla,<br>
                    {clinicName}<br>
                    Tel: {clinicPhone}<br>
                    Email: {clinicEmail}</p>
                `,
                category: 'maintenance'
            },
            {
                id: 'device_renewal',
                name: 'Cihaz Yenileme',
                subject: 'İşitme Cihazı Yenileme Hatırlatması - {clinicName}',
                content: `
                    <h2>Cihaz Yenileme Hatırlatması</h2>
                    <p>Sayın {fullName},</p>
                    <p>İşitme cihazınızın garanti süresi dolmak üzere veya yenileme zamanınız gelmiştir.</p>
                    <p>Yeni teknoloji ürünlerimiz hakkında bilgi almak ve cihazınızı yenilemek için randevu alabilirsiniz.</p>
                    <ul>
                        <li>Daha gelişmiş ses kalitesi</li>
                        <li>Kablosuz bağlantı özellikleri</li>
                        <li>Daha uzun pil ömrü</li>
                        <li>Su ve toz geçirmez tasarım</li>
                    </ul>
                    <p><strong>Randevu için:</strong> {clinicPhone}</p>
                    <hr>
                    <p>Saygılarımızla,<br>
                    {clinicName}<br>
                    Tel: {clinicPhone}<br>
                    Email: {clinicEmail}</p>
                `,
                category: 'renewal'
            },
            {
                id: 'welcome',
                name: 'Hoş Geldiniz',
                subject: 'Kliniğimize Hoş Geldiniz - {clinicName}',
                content: `
                    <h2>Kliniğimize Hoş Geldiniz</h2>
                    <p>Sayın {fullName},</p>
                    <p>X-Ear Audiolog Kliniği ailesine katıldığınız için teşekkür ederiz.</p>
                    <p>Kliniğimizde size en iyi hizmeti sunmak için çalışıyoruz. İhtiyacınız olan tüm işitme sağlığı hizmetleri için yanınızdayız.</p>
                    <h3>Hizmetlerimiz:</h3>
                    <ul>
                        <li>İşitme testi ve değerlendirme</li>
                        <li>İşitme cihazı danışmanlığı ve satışı</li>
                        <li>Cihaz ayarlama ve bakım</li>
                        <li>SGK işlemleri</li>
                    </ul>
                    <p>Herhangi bir sorunuz olduğunda bize ulaşabilirsiniz.</p>
                    <hr>
                    <p>Saygılarımızla,<br>
                    {clinicName}<br>
                    Tel: {clinicPhone}<br>
                    Email: {clinicEmail}<br>
                    Adres: {clinicAddress}</p>
                `,
                category: 'welcome'
            }
        ];
    }

    getEmailTemplates() {
        return Storage.load('email_templates') || this.templates;
    }

    saveEmailTemplate(template) {
        const templates = this.getEmailTemplates();
        const existingIndex = templates.findIndex(t => t.id === template.id);
        
        if (existingIndex !== -1) {
            templates[existingIndex] = template;
        } else {
            templates.push(template);
        }
        
        Storage.save('email_templates', templates);
    }

    deleteEmailTemplate(templateId) {
        const templates = this.getEmailTemplates();
        const filtered = templates.filter(t => t.id !== templateId);
        Storage.save('email_templates', filtered);
    }

    // Statistics and history
    getEmailHistory(filters = {}) {
        let filtered = this.emailHistory;
        
        if (filters.patientId) {
            filtered = filtered.filter(email => email.patientId === filters.patientId);
        }
        
        if (filters.status) {
            filtered = filtered.filter(email => email.status === filters.status);
        }
        
        if (filters.dateFrom) {
            filtered = filtered.filter(email => new Date(email.createdAt) >= new Date(filters.dateFrom));
        }
        
        if (filters.dateTo) {
            filtered = filtered.filter(email => new Date(email.createdAt) <= new Date(filters.dateTo));
        }
        
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    getStatistics(period = 'month') {
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
        
        const periodEmails = this.emailHistory.filter(email => 
            new Date(email.createdAt) >= startDate
        );
        
        const stats = {
            total: periodEmails.length,
            sent: periodEmails.filter(email => email.status === 'sent').length,
            failed: periodEmails.filter(email => email.status === 'failed').length,
            pending: periodEmails.filter(email => email.status === 'pending').length,
            successRate: 0
        };
        
        if (stats.total > 0) {
            stats.successRate = (stats.sent / stats.total * 100).toFixed(1);
        }
        
        return stats;
    }

    // Utility methods
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Test email functionality
    async testEmailConfiguration() {
        try {
            const testEmail = {
                to: this.config.settings.fromEmail,
                subject: 'X-Ear CRM Email Test',
                content: `
                    <h2>Email Yapılandırma Testi</h2>
                    <p>Bu email, X-Ear CRM sisteminin email yapılandırmasını test etmek için gönderilmiştir.</p>
                    <p>Bu emaili aldıysanız, email yapılandırmanız başarılı bir şekilde çalışıyor demektir.</p>
                    <p><strong>Test Zamanı:</strong> ${new Date().toLocaleString('tr-TR')}</p>
                    <hr>
                    <p>X-Ear CRM</p>
                `
            };

            await this.sendEmail(testEmail.to, testEmail.subject, testEmail.content);
            return true;
        } catch (error) {
            throw error;
        }
    }
}

// Initialize Email Manager
window.emailManager = new EmailManager();
