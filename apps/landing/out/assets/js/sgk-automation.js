/**
 * SGK Automation System - Handles automated SGK workflow management
 */

class SGKAutomation {
    constructor() {
        this.reports = [];
        this.renewalSchedule = [];
        this.deadlineAlerts = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadReports();
        this.scheduleRenewalChecks();
    }

    bindEvents() {
        // Listen for patient device purchases to auto-create SGK reports
        document.addEventListener('saleCompleted', (e) => {
            this.handleDevicePurchase(e.detail);
        });

        // Listen for SGK report status changes
        document.addEventListener('sgkReportStatusChanged', (e) => {
            this.handleStatusChange(e.detail);
        });

        // Listen for battery report renewals
        document.addEventListener('battery.renewal.due', (e) => {
            this.handleBatteryRenewal(e.detail);
        });
    }

    // Auto-create SGK report when device is purchased
    async handleDevicePurchase({ patient, device }) {
        if (!device || device.type !== 'hearing_aid') return;

        const sgkReport = {
            id: `SGK${Date.now()}`,
            patientId: patient.id,
            patientName: patient.name,
            tcNumber: patient.tcNumber,
            reportType: 'hearing-aid',
            deviceModel: device.model,
            deviceSerial: device.serialNumber,
            status: 'preparing',
            createdDate: new Date().toISOString().split('T')[0],
            submissionDeadline: this.calculateSubmissionDeadline(),
            statusHistory: [{
                status: 'preparing',
                date: new Date().toISOString().split('T')[0],
                note: 'Rapor otomatik olarak oluşturuldu'
            }],
            automated: true
        };

        this.reports.push(sgkReport);
        this.saveReports();

        // Create task for administrative staff
        this.createSGKTask({
            title: 'SGK Raporu Hazırla',
            description: `${patient.name} için işitme cihazı raporu hazırlanması gerekiyor`,
            patientId: patient.id,
            reportId: sgkReport.id,
            priority: 'medium',
            dueDate: sgkReport.submissionDeadline
        });

        // Schedule battery report renewal
        this.scheduleBatteryRenewal(patient, device, sgkReport);

        // Trigger SGK report created event
        document.dispatchEvent(new CustomEvent('sgkReportCreated', {
            detail: { report: sgkReport, patient }
        }));

        Utils.showToast(`SGK raporu otomatik oluşturuldu: ${sgkReport.id}`, 'success');
        return sgkReport;
    }

    // Handle SGK report status changes
    handleStatusChange({ report, oldStatus, newStatus }) {
        // Update status history
        report.statusHistory.push({
            status: newStatus,
            date: new Date().toISOString().split('T')[0],
            note: this.getStatusChangeNote(oldStatus, newStatus)
        });

        // Handle specific status transitions
        switch (newStatus) {
            case 'submitted':
                this.handleSubmitted(report);
                break;
            case 'pending':
                this.handlePending(report);
                break;
            case 'approved':
                this.handleApproved(report);
                break;
            case 'paid':
                this.handlePaid(report);
                break;
            case 'rejected':
                this.handleRejected(report);
                break;
        }

        this.saveReports();
    }

    handleSubmitted(report) {
        // Set expected approval date (typically 10-15 days)
        report.expectedApprovalDate = this.addBusinessDays(new Date(), 12);

        // Create follow-up task
        this.createSGKTask({
            title: 'SGK Raporu Takibi',
            description: `${report.patientName} SGK raporu gönderildi - takip gerekli`,
            reportId: report.id,
            priority: 'low',
            dueDate: this.addBusinessDays(new Date(), 10)
        });

        NotificationManager.add({
            title: 'SGK Raporu Gönderildi',
            message: `${report.patientName} için SGK raporu başarıyla gönderildi`,
            type: 'sgk_submitted'
        });
    }

    handlePending(report) {
        const daysPending = this.calculateDaysBetween(report.submissionDate, new Date());
        
        if (daysPending > 10) {
            // Create urgent follow-up task
            this.createSGKTask({
                title: 'SGK Raporu Takibi - ACİL',
                description: `${report.patientName} SGK raporu ${daysPending} gündür beklemede`,
                reportId: report.id,
                priority: 'high',
                dueDate: new Date()
            });

            NotificationManager.add({
                title: 'SGK Raporu Gecikme Uyarısı',
                message: `${report.patientName} SGK raporu uzun süredir beklemede`,
                type: 'sgk_delay_warning'
            });
        }
    }

    handleApproved(report) {
        // Update patient SGK status
        PatientManager.updatePatient(report.patientId, {
            sgkStatus: 'approved',
            sgkApprovalDate: new Date().toISOString().split('T')[0]
        });

        // Create payment tracking task
        this.createSGKTask({
            title: 'SGK Ödeme Takibi',
            description: `${report.patientName} SGK raporu onaylandı - ödeme takibi`,
            reportId: report.id,
            priority: 'medium',
            dueDate: this.addBusinessDays(new Date(), 5)
        });

        NotificationManager.add({
            title: 'SGK Raporu Onaylandı',
            message: `${report.patientName} SGK raporu onaylandı`,
            type: 'sgk_approved'
        });
    }

    handlePaid(report) {
        // Update patient SGK status
        PatientManager.updatePatient(report.patientId, {
            sgkStatus: 'paid',
            sgkPaymentDate: new Date().toISOString().split('T')[0]
        });

        // Archive completed report
        report.completedDate = new Date().toISOString().split('T')[0];
        report.archived = false; // Keep for renewal tracking

        NotificationManager.add({
            title: 'SGK Ödemesi Tamamlandı',
            message: `${report.patientName} SGK ödemesi tamamlandı`,
            type: 'sgk_paid'
        });
    }

    handleRejected(report) {
        // Create resubmission task
        this.createSGKTask({
            title: 'SGK Raporu Yeniden Gönderim',
            description: `${report.patientName} SGK raporu reddedildi - yeniden gönderim gerekli`,
            reportId: report.id,
            priority: 'high',
            dueDate: this.addBusinessDays(new Date(), 3)
        });

        NotificationManager.add({
            title: 'SGK Raporu Reddedildi',
            message: `${report.patientName} SGK raporu reddedildi - acil eylem gerekli`,
            type: 'sgk_rejected'
        });
    }

    // Handle battery report renewals
    handleBatteryRenewal({ patient }) {
        const batteryReport = {
            id: `SGK_BAT_${Date.now()}`,
            patientId: patient.id,
            patientName: patient.name,
            tcNumber: patient.tcNumber,
            reportType: 'battery',
            status: 'preparing',
            createdDate: new Date().toISOString().split('T')[0],
            renewalDate: patient.batteryReportDue,
            submissionDeadline: patient.batteryReportDue,
            statusHistory: [{
                status: 'preparing',
                date: new Date().toISOString().split('T')[0],
                note: 'Pil raporu yenileme zamanı geldi'
            }],
            automated: true
        };

        this.reports.push(batteryReport);
        this.saveReports();

        // Create renewal task
        this.createSGKTask({
            title: 'Pil Raporu Yenileme',
            description: `${patient.name} için pil raporu yenileme zamanı`,
            patientId: patient.id,
            reportId: batteryReport.id,
            priority: 'medium',
            dueDate: patient.batteryReportDue
        });

        // Send SMS reminder
        CampaignManager.sendSMS([patient.id], 'battery_renewal', {
            name: patient.name,
            booking_link: `${window.location.origin}/appointments.html?patient=${patient.id}&type=battery_renewal`
        });

        Utils.showToast(`Pil raporu yenileme hatırlatması gönderildi: ${patient.name}`, 'info');
    }

    // Schedule battery report renewals for existing patients
    scheduleBatteryRenewal(patient, device, sgkReport) {
        // Battery reports need renewal annually
        const renewalDate = new Date();
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);

        PatientManager.updatePatient(patient.id, {
            batteryReportDue: renewalDate.toISOString().split('T')[0],
            lastSGKReportId: sgkReport.id
        });

        this.renewalSchedule.push({
            id: Utils.generateId(),
            patientId: patient.id,
            patientName: patient.name,
            reportType: 'battery',
            renewalDate: renewalDate.toISOString().split('T')[0],
            originalReportId: sgkReport.id,
            status: 'scheduled'
        });

        this.saveRenewalSchedule();
    }

    // Check for upcoming renewals and deadlines
    scheduleRenewalChecks() {
        // Check daily at 9:00 AM
        const checkTime = new Date();
        checkTime.setHours(9, 0, 0, 0);
        
        if (new Date() > checkTime) {
            checkTime.setDate(checkTime.getDate() + 1);
        }

        const timeUntilCheck = checkTime - new Date();
        
        setTimeout(() => {
            this.checkRenewalsAndDeadlines();
            // Schedule daily checks
            setInterval(() => {
                this.checkRenewalsAndDeadlines();
            }, 24 * 60 * 60 * 1000);
        }, timeUntilCheck);
    }

    checkRenewalsAndDeadlines() {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        // Check for upcoming battery renewals
        this.renewalSchedule.forEach(renewal => {
            const renewalDate = new Date(renewal.renewalDate);
            if (renewalDate <= thirtyDaysFromNow && renewal.status === 'scheduled') {
                const patient = PatientManager.getPatient(renewal.patientId);
                if (patient) {
                    document.dispatchEvent(new CustomEvent('battery.renewal.due', {
                        detail: { patient }
                    }));
                    renewal.status = 'notified';
                }
            }
        });

        // Check for overdue submissions
        this.reports.forEach(report => {
            if (report.submissionDeadline && report.status === 'preparing') {
                const deadline = new Date(report.submissionDeadline);
                if (today > deadline) {
                    this.createUrgentDeadlineAlert(report);
                }
            }
        });

        this.saveRenewalSchedule();
    }

    createUrgentDeadlineAlert(report) {
        this.createSGKTask({
            title: 'SGK Raporu Son Tarih GEÇTİ',
            description: `${report.patientName} SGK raporu son gönderim tarihi geçti!`,
            reportId: report.id,
            priority: 'critical',
            dueDate: new Date()
        });

        NotificationManager.add({
            title: 'SGK Son Tarih Uyarısı',
            message: `${report.patientName} SGK raporu son tarihi geçti!`,
            type: 'sgk_deadline_passed'
        });
    }

    // Helper methods
    createSGKTask(taskData) {
        const task = {
            id: Utils.generateId(),
            ...taskData,
            type: 'sgk',
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        // Add to notification system
        NotificationManager.add({
            title: task.title,
            message: task.description,
            type: 'task',
            data: task
        });

        return task;
    }

    calculateSubmissionDeadline() {
        // SGK reports typically need to be submitted within 30 days
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 30);
        return deadline.toISOString().split('T')[0];
    }

    addBusinessDays(date, days) {
        const result = new Date(date);
        let addedDays = 0;
        
        while (addedDays < days) {
            result.setDate(result.getDate() + 1);
            // Skip weekends (Saturday = 6, Sunday = 0)
            if (result.getDay() !== 0 && result.getDay() !== 6) {
                addedDays++;
            }
        }
        
        return result.toISOString().split('T')[0];
    }

    calculateDaysBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    }

    getStatusChangeNote(oldStatus, newStatus) {
        const notes = {
            'preparing': 'Rapor hazırlanıyor',
            'submitted': 'SGK\'ya gönderildi',
            'pending': 'İnceleme aşamasında',
            'approved': 'Onaylandı',
            'paid': 'Ödeme tamamlandı',
            'rejected': 'Reddedildi - düzeltme gerekli'
        };
        return notes[newStatus] || `Durum güncellendi: ${newStatus}`;
    }

    // Data persistence
    saveReports() {
        Storage.save('sgkReports', this.reports);
    }

    loadReports() {
        this.reports = Storage.load('sgkReports') || [];
    }

    saveRenewalSchedule() {
        Storage.save('sgkRenewalSchedule', this.renewalSchedule);
    }

    loadRenewalSchedule() {
        this.renewalSchedule = Storage.load('sgkRenewalSchedule') || [];
    }

    // Public API methods
    getReports(filters = {}) {
        let reports = [...this.reports];
        
        if (filters.status) {
            reports = reports.filter(r => r.status === filters.status);
        }
        
        if (filters.reportType) {
            reports = reports.filter(r => r.reportType === filters.reportType);
        }
        
        if (filters.patientId) {
            reports = reports.filter(r => r.patientId === filters.patientId);
        }
        
        return reports;
    }

    updateReportStatus(reportId, newStatus, notes = '') {
        const report = this.reports.find(r => r.id === reportId);
        if (report) {
            const oldStatus = report.status;
            report.status = newStatus;
            report.lastUpdated = new Date().toISOString();
            
            if (notes) {
                report.statusHistory.push({
                    status: newStatus,
                    date: new Date().toISOString().split('T')[0],
                    note: notes
                });
            }

            // Trigger status change event
            document.dispatchEvent(new CustomEvent('sgkReportStatusChanged', {
                detail: { report, oldStatus, newStatus }
            }));

            this.saveReports();
            return report;
        }
        return null;
    }

    generateComplianceReport() {
        const totalReports = this.reports.length;
        const paidReports = this.reports.filter(r => r.status === 'paid').length;
        const overdueReports = this.reports.filter(r => {
            return r.submissionDeadline && 
                   new Date(r.submissionDeadline) < new Date() && 
                   r.status === 'preparing';
        }).length;

        return {
            totalReports,
            paidReports,
            overdueReports,
            complianceRate: totalReports > 0 ? (paidReports / totalReports * 100).toFixed(1) : 0,
            averageProcessingDays: this.calculateAverageProcessingDays()
        };
    }

    calculateAverageProcessingDays() {
        const completedReports = this.reports.filter(r => r.status === 'paid' && r.completedDate);
        if (completedReports.length === 0) return 0;

        const totalDays = completedReports.reduce((sum, report) => {
            const created = new Date(report.createdDate);
            const completed = new Date(report.completedDate);
            return sum + this.calculateDaysBetween(created, completed);
        }, 0);

        return Math.round(totalDays / completedReports.length);
    }
}

// Initialize SGK Automation
const sgkAutomation = new SGKAutomation();

// Export for global access
window.SGKAutomation = SGKAutomation;
window.sgkAutomation = sgkAutomation;
