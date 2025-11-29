/**
 * SGK Manager - Enhanced with comprehensive SGK workflow management
 */

class SGKManager {
    constructor() {
        this.reports = [];
        this.filteredReports = [];
        this.renewals = [];
        this.deadlines = [];
        this.init();
    }

    init() {
        this.loadSampleData();
        this.bindEvents();
        this.renderStats();
        this.renderReports();
        this.renderRenewals();
        this.renderDeadlines();
        this.populatePatientSelect();
        this.checkAutomaticRenewals();
    }

    loadSampleData() {
        // Enhanced SGK reports data with status flow
        this.reports = [
            {
                id: 'SGK001',
                patientId: 'P001',
                patientName: 'Ahmet Yılmaz',
                tcNumber: '12345678901',
                reportType: 'hearing-aid',
                reportTypeName: 'İşitme Cihazı Raporu',
                date: '2024-01-15',
                doctor: 'Dr. Mehmet Özkan',
                status: 'paid', // preparing, submitted, pending, approved, paid, rejected
                statusHistory: [
                    { status: 'preparing', date: '2024-01-08', note: 'Rapor hazırlanıyor' },
                    { status: 'submitted', date: '2024-01-10', note: 'SGK\'ya gönderildi' },
                    { status: 'pending', date: '2024-01-12', note: 'İnceleme aşamasında' },
                    { status: 'approved', date: '2024-01-15', note: 'Onaylandı' },
                    { status: 'paid', date: '2024-01-18', note: 'Ödeme yapıldı' }
                ],
                details: 'Bilateral sensörinöral işitme kaybı tespit edilmiştir. İşitme cihazı kullanımı önerilmektedir.',
                submissionDate: '2024-01-10',
                approvalDate: '2024-01-15',
                paymentDate: '2024-01-18',
                amount: 15000,
                documents: ['audiogram.pdf', 'medical_report.pdf', 'prescription.pdf']
            },
            {
                id: 'SGK002',
                patientId: 'P002',
                patientName: 'Fatma Demir',
                tcNumber: '98765432109',
                reportType: 'battery-report',
                reportTypeName: 'Pil Raporu',
                date: '2024-01-20',
                doctor: 'Dr. Ayşe Kaya',
                status: 'pending',
                statusHistory: [
                    { status: 'preparing', date: '2024-01-18', note: 'Pil raporu hazırlanıyor' },
                    { status: 'submitted', date: '2024-01-20', note: 'SGK\'ya gönderildi' },
                    { status: 'pending', date: '2024-01-20', note: 'İnceleme aşamasında' }
                ],
                details: 'Yıllık pil değişimi için rapor.',
                submissionDate: '2024-01-20',
                approvalDate: null,
                amount: 2000,
                nextRenewalDate: '2025-01-20',
                documents: ['battery_usage.pdf']
            },
            {
                id: 'SGK003',
                patientId: 'P003',
                patientName: 'Mustafa Çelik',
                tcNumber: '11223344556',
                reportType: 'device-renewal',
                reportTypeName: '5 Yıllık Cihaz Yenileme',
                date: '2024-01-25',
                doctor: 'Dr. Zeynep Arslan',
                status: 'rejected',
                statusHistory: [
                    { status: 'preparing', date: '2024-01-22', note: 'Yenileme raporu hazırlanıyor' },
                    { status: 'submitted', date: '2024-01-24', note: 'SGK\'ya gönderildi' },
                    { status: 'rejected', date: '2024-01-25', note: 'Eksik belge nedeniyle reddedildi' }
                ],
                details: '5 yıllık cihaz kullanım süresi dolmuştur. Yeni cihaz için başvuru.',
                submissionDate: '2024-01-24',
                approvalDate: null,
                rejectionReason: 'Eksik belgeler - Güncel audiogram gerekli',
                originalDeviceDate: '2019-01-25',
                documents: ['old_device_report.pdf']
            }
        ];

        // Battery renewal reminders
        this.renewals = [
            {
                id: 'REN001',
                patientId: 'P001',
                patientName: 'Ahmet Yılmaz',
                type: 'battery',
                lastRenewalDate: '2024-01-18',
                nextRenewalDate: '2025-01-18',
                daysUntilDue: this.calculateDaysUntil('2025-01-18'),
                status: 'upcoming',
                notificationSent: false
            },
            {
                id: 'REN002',
                patientId: 'P004',
                patientName: 'Ayşe Öztürk',
                type: 'device',
                lastRenewalDate: '2019-03-15',
                nextRenewalDate: '2024-03-15',
                daysUntilDue: this.calculateDaysUntil('2024-03-15'),
                status: 'overdue',
                notificationSent: true
            }
        ];

        // SGK deadlines tracking
        this.deadlines = [
            {
                id: 'DL001',
                patientId: 'P002',
                patientName: 'Fatma Demir',
                reportId: 'SGK002',
                type: 'submission_deadline',
                description: 'Pil raporu yanıt süresi',
                deadline: '2024-02-20',
                daysRemaining: this.calculateDaysUntil('2024-02-20'),
                priority: 'medium'
            },
            {
                id: 'DL002',
                patientId: 'P003',
                patientName: 'Mustafa Çelik',
                reportId: 'SGK003',
                type: 'resubmission_deadline',
                description: 'Eksik belgeler için yeniden başvuru süresi',
                deadline: '2024-02-25',
                daysRemaining: this.calculateDaysUntil('2024-02-25'),
                priority: 'high'
            }
        ];

        this.filteredReports = [...this.reports];
    }

    calculateDaysUntil(dateString) {
        const targetDate = new Date(dateString);
        const today = new Date();
        const diffTime = targetDate - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    checkAutomaticRenewals() {
        // Check for patients needing battery renewals
        AppState.patients.forEach(patient => {
            if (patient.batteryReportDue) {
                const daysUntil = this.calculateDaysUntil(patient.batteryReportDue);
                
                if (daysUntil <= 30 && daysUntil >= 0) {
                    // Check if renewal already exists
                    const existingRenewal = this.renewals.find(r => 
                        r.patientId === patient.id && r.type === 'battery'
                    );
                    
                    if (!existingRenewal) {
                        this.renewals.push({
                            id: `REN${String(this.renewals.length + 1).padStart(3, '0')}`,
                            patientId: patient.id,
                            patientName: patient.name,
                            type: 'battery',
                            lastRenewalDate: patient.lastBatteryRenewal,
                            nextRenewalDate: patient.batteryReportDue,
                            daysUntilDue: daysUntil,
                            status: daysUntil < 0 ? 'overdue' : 'upcoming',
                            notificationSent: false
                        });
                    }
                }
            }

            // Check for 5-year device renewals
            if (patient.devicePurchaseDate) {
                const purchaseDate = new Date(patient.devicePurchaseDate);
                const fiveYearsLater = new Date(purchaseDate);
                fiveYearsLater.setFullYear(fiveYearsLater.getFullYear() + 5);
                
                const daysUntilRenewal = this.calculateDaysUntil(fiveYearsLater.toISOString().split('T')[0]);
                
                if (daysUntilRenewal <= 60 && daysUntilRenewal >= -30) {
                    const existingRenewal = this.renewals.find(r => 
                        r.patientId === patient.id && r.type === 'device'
                    );
                    
                    if (!existingRenewal) {
                        this.renewals.push({
                            id: `REN${String(this.renewals.length + 1).padStart(3, '0')}`,
                            patientId: patient.id,
                            patientName: patient.name,
                            type: 'device',
                            lastRenewalDate: patient.devicePurchaseDate,
                            nextRenewalDate: fiveYearsLater.toISOString().split('T')[0],
                            daysUntilDue: daysUntilRenewal,
                            status: daysUntilRenewal < 0 ? 'overdue' : 'upcoming',
                            notificationSent: false
                        });
                    }
                }
            }
        });
    }

    // Enhanced status management
    updateReportStatus(reportId, newStatus, note = '') {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) return false;

        // Add to status history
        report.statusHistory.push({
            status: newStatus,
            date: new Date().toISOString().split('T')[0],
            note: note,
            updatedBy: 'current_user' // In real app, this would be the logged-in user
        });

        // Update current status
        report.status = newStatus;

        // Set dates based on status
        switch (newStatus) {
            case 'submitted':
                report.submissionDate = new Date().toISOString().split('T')[0];
                break;
            case 'approved':
                report.approvalDate = new Date().toISOString().split('T')[0];
                break;
            case 'paid':
                report.paymentDate = new Date().toISOString().split('T')[0];
                break;
            case 'rejected':
                // Could trigger automatic task creation for resubmission
                this.createResubmissionTask(report);
                break;
        }

        this.renderReports();
        this.renderStats();
        Storage.saveAppState();

        Utils.showToast(`Rapor durumu güncellendi: ${this.getStatusText(newStatus)}`, 'success');
        return true;
    }

    createResubmissionTask(report) {
        // Create task for handling rejected report
        const task = {
            id: Utils.generateId(),
            title: 'Reddedilen SGK raporu - Yeniden başvuru gerekli',
            description: `${report.patientName} için ${report.reportTypeName} reddedildi. Sebep: ${report.rejectionReason || 'Belirtilmemiş'}`,
            patientId: report.patientId,
            reportId: report.id,
            assignee: 'admin',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            type: 'sgk_resubmission',
            priority: 'high',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Add to notifications
        NotificationManager.add({
            type: 'task',
            title: task.title,
            message: task.description,
            patientId: task.patientId,
            priority: task.priority
        });
    }

    // Document management
    addDocument(reportId, documentName, documentType = 'general') {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) return false;

        if (!report.documents) report.documents = [];
        
        const document = {
            id: Utils.generateId(),
            name: documentName,
            type: documentType,
            uploadedAt: new Date().toISOString(),
            size: Math.floor(Math.random() * 1000000) + 100000 // Mock file size
        };

        report.documents.push(document);
        Storage.saveAppState();

        Utils.showToast('Belge başarıyla eklendi', 'success');
        return document;
    }

    // Export functionality
    exportReports(format = 'csv') {
        const data = this.filteredReports.map(report => ({
            'Rapor ID': report.id,
            'Hasta Adı': report.patientName,
            'TC Kimlik': report.tcNumber,
            'Rapor Türü': report.reportTypeName,
            'Durum': this.getStatusText(report.status),
            'Tarih': report.date,
            'Doktor': report.doctor,
            'Tutar': report.amount ? Utils.formatCurrency(report.amount) : '',
            'Başvuru Tarihi': report.submissionDate,
            'Onay Tarihi': report.approvalDate || '',
            'Ödeme Tarihi': report.paymentDate || ''
        }));

        if (format === 'csv') {
            this.downloadCSV(data, 'sgk_raporlari.csv');
        } else {
            // In a real app, this would generate PDF
            Utils.showToast('PDF export özelliği yakında eklenecek', 'info');
        }
    }

    downloadCSV(data, filename) {
        const csvContent = this.convertToCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    convertToCSV(data) {
        if (!data.length) return '';
        
        const headers = Object.keys(data[0]);
        const csvHeaders = headers.join(',');
        
        const csvRows = data.map(row => 
            headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            }).join(',')
        );

        return [csvHeaders, ...csvRows].join('\n');
    }

    // Enhanced rendering methods
    renderRenewals() {
        const container = document.getElementById('renewals-container');
        if (!container) return;

        if (this.renewals.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-gray-400 text-4xl mb-4">📅</div>
                    <p class="text-gray-500">Yaklaşan yenileme bulunamadı</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.renewals.map(renewal => `
            <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-semibold text-gray-900">${renewal.patientName}</h4>
                    <span class="badge ${renewal.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
                        ${renewal.status === 'overdue' ? 'Gecikmiş' : 'Yaklaşan'}
                    </span>
                </div>
                <div class="text-sm text-gray-600 space-y-1">
                    <p><strong>Tür:</strong> ${renewal.type === 'battery' ? 'Pil Yenileme' : 'Cihaz Yenileme'}</p>
                    <p><strong>Son Yenileme:</strong> ${Utils.formatDate(renewal.lastRenewalDate)}</p>
                    <p><strong>Sonraki Yenileme:</strong> ${Utils.formatDate(renewal.nextRenewalDate)}</p>
                    <p><strong>Kalan Gün:</strong> 
                        <span class="${renewal.daysUntilDue < 0 ? 'text-red-600 font-semibold' : renewal.daysUntilDue <= 7 ? 'text-orange-600 font-semibold' : 'text-gray-900'}">
                            ${Math.abs(renewal.daysUntilDue)} ${renewal.daysUntilDue < 0 ? 'gün gecikmiş' : 'gün kaldı'}
                        </span>
                    </p>
                </div>
                <div class="mt-3 flex space-x-2">
                    <button onclick="sgkManager.createRenewalReport('${renewal.id}')" class="btn-sm btn-primary">
                        Rapor Oluştur
                    </button>
                    <button onclick="sgkManager.sendRenewalReminder('${renewal.id}')" class="btn-sm btn-secondary">
                        Hatırlatma Gönder
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderDeadlines() {
        const container = document.getElementById('deadlines-container');
        if (!container) return;

        const sortedDeadlines = this.deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

        if (sortedDeadlines.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-gray-400 text-4xl mb-4">⏰</div>
                    <p class="text-gray-500">Yaklaşan son tarih bulunamadı</p>
                </div>
            `;
            return;
        }

        container.innerHTML = sortedDeadlines.map(deadline => `
            <div class="bg-white border-l-4 ${deadline.priority === 'high' ? 'border-red-500' : deadline.priority === 'medium' ? 'border-orange-500' : 'border-blue-500'} rounded-lg p-4">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h4 class="font-semibold text-gray-900">${deadline.patientName}</h4>
                        <p class="text-sm text-gray-600 mt-1">${deadline.description}</p>
                        <p class="text-sm text-gray-500 mt-2">
                            <strong>Son Tarih:</strong> ${Utils.formatDate(deadline.deadline)}
                        </p>
                    </div>
                    <div class="ml-4 text-right">
                        <div class="text-lg font-bold ${deadline.daysRemaining < 0 ? 'text-red-600' : deadline.daysRemaining <= 3 ? 'text-orange-600' : 'text-gray-900'}">
                            ${Math.abs(deadline.daysRemaining)}
                        </div>
                        <div class="text-xs text-gray-500">
                            ${deadline.daysRemaining < 0 ? 'gün gecikmiş' : 'gün kaldı'}
                        </div>
                    </div>
                </div>
                <div class="mt-3 flex space-x-2">
                    <button onclick="sgkManager.viewReport('${deadline.reportId}')" class="btn-sm btn-primary">
                        Raporu Görüntüle
                    </button>
                    ${deadline.daysRemaining <= 3 ? `
                        <button onclick="sgkManager.extendDeadline('${deadline.id}')" class="btn-sm btn-secondary">
                            Süre Uzat
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    bindEvents() {
        // Modal events
        const newReportBtn = document.getElementById('new-report-btn');
        const closeModal = document.getElementById('close-modal');
        const cancelBtn = document.getElementById('cancel-btn');
        const modal = document.getElementById('new-report-modal');
        const form = document.getElementById('new-report-form');

        if (newReportBtn) {
            newReportBtn.addEventListener('click', () => this.openNewReportModal());
        }

        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeModal());
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }

        if (form) {
            form.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        // Filter events
        const statusFilter = document.getElementById('status-filter');
        const dateFrom = document.getElementById('date-from');
        const dateTo = document.getElementById('date-to');
        const patientSearch = document.getElementById('patient-search');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }

        if (dateFrom) {
            dateFrom.addEventListener('change', () => this.applyFilters());
        }

        if (dateTo) {
            dateTo.addEventListener('change', () => this.applyFilters());
        }

        if (patientSearch) {
            patientSearch.addEventListener('input', Utils.debounce(() => this.applyFilters(), 300));
        }
    }

    openNewReportModal() {
        const modal = document.getElementById('new-report-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        const modal = document.getElementById('new-report-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = 'auto';
            this.resetForm();
        }
    }

    resetForm() {
        const form = document.getElementById('new-report-form');
        if (form) {
            form.reset();
        }
    }

    handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const patientSelect = document.getElementById('patient-select');
        const reportType = document.getElementById('report-type');
        const reportDate = document.getElementById('report-date');
        const doctorName = document.getElementById('doctor-name');
        const reportDetails = document.getElementById('report-details');
        
        if (!patientSelect.value || !reportType.value || !reportDate.value || !doctorName.value) {
            Utils.showToast('Lütfen tüm zorunlu alanları doldurun.', 'error');
            return;
        }

        const selectedPatient = window.sampleData.patients.find(p => p.id === patientSelect.value);
        if (!selectedPatient) {
            Utils.showToast('Geçersiz hasta seçimi.', 'error');
            return;
        }

        const reportTypeNames = {
            'hearing-aid': 'İşitme Cihazı Raporu',
            'cochlear-implant': 'Koklear İmplant Raporu',
            'hearing-test': 'İşitme Testi Raporu',
            'medical-report': 'Tıbbi Rapor'
        };

        const newReport = {
            id: `SGK${String(this.reports.length + 1).padStart(3, '0')}`,
            patientId: selectedPatient.id,
            patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
            tcNumber: selectedPatient.tcNumber,
            reportType: reportType.value,
            reportTypeName: reportTypeNames[reportType.value],
            date: reportDate.value,
            doctor: doctorName.value,
            status: 'pending',
            details: reportDetails.value,
            submissionDate: new Date().toISOString().split('T')[0],
            approvalDate: null
        };

        this.reports.unshift(newReport);
        this.applyFilters();
        this.renderStats();
        this.closeModal();
        
        Utils.showToast('SGK raporu başarıyla oluşturuldu.', 'success');
    }

    populatePatientSelect() {
        const select = document.getElementById('patient-select');
        if (!select || !window.sampleData?.patients) return;

        select.innerHTML = '<option value="">Hasta seçin...</option>';
        
        window.sampleData.patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.id;
            option.textContent = `${patient.firstName} ${patient.lastName} (${patient.tcNumber})`;
            select.appendChild(option);
        });
    }

    applyFilters() {
        const statusFilter = document.getElementById('status-filter')?.value || '';
        const dateFrom = document.getElementById('date-from')?.value || '';
        const dateTo = document.getElementById('date-to')?.value || '';
        const patientSearch = document.getElementById('patient-search')?.value.toLowerCase() || '';

        this.filteredReports = this.reports.filter(report => {
            // Status filter
            if (statusFilter && report.status !== statusFilter) {
                return false;
            }

            // Date range filter
            if (dateFrom && report.date < dateFrom) {
                return false;
            }
            if (dateTo && report.date > dateTo) {
                return false;
            }

            // Patient search filter
            if (patientSearch) {
                const searchText = `${report.patientName} ${report.tcNumber}`.toLowerCase();
                if (!searchText.includes(patientSearch)) {
                    return false;
                }
            }

            return true;
        });

        this.renderReports();
    }

    renderStats() {
        const totalReports = this.reports.length;
        const approvedReports = this.reports.filter(r => r.status === 'approved').length;
        const pendingReports = this.reports.filter(r => r.status === 'pending').length;
        const rejectedReports = this.reports.filter(r => r.status === 'rejected').length;

        const totalEl = document.getElementById('total-reports');
        const approvedEl = document.getElementById('approved-reports');
        const pendingEl = document.getElementById('pending-reports');
        const rejectedEl = document.getElementById('rejected-reports');

        if (totalEl) totalEl.textContent = totalReports;
        if (approvedEl) approvedEl.textContent = approvedReports;
        if (pendingEl) pendingEl.textContent = pendingReports;
        if (rejectedEl) rejectedEl.textContent = rejectedReports;
    }

    renderReports() {
        const tbody = document.getElementById('reports-table-body');
        if (!tbody) return;

        if (this.filteredReports.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-8 text-center text-gray-500">
                        <div class="flex flex-col items-center">
                            <svg class="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <p class="text-lg font-medium">Rapor bulunamadı</p>
                            <p class="text-sm">Filtreleri değiştirmeyi deneyin veya yeni bir rapor oluşturun.</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.filteredReports.map(report => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${report.patientName}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${report.tcNumber}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${report.reportTypeName}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${Utils.formatDate(report.date)}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${this.getStatusBadge(report.status)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div class="flex space-x-2">
                        <button onclick="sgkManager.viewReport('${report.id}')" class="text-blue-600 hover:text-blue-900">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                            </svg>
                        </button>
                        <button onclick="sgkManager.editReport('${report.id}')" class="text-green-600 hover:text-green-900">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                        </button>
                        <button onclick="sgkManager.deleteReport('${report.id}')" class="text-red-600 hover:text-red-900">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    getStatusBadge(status) {
        const statusConfig = {
            pending: { class: 'bg-yellow-100 text-yellow-800', text: 'Bekleyen' },
            approved: { class: 'bg-green-100 text-green-800', text: 'Onaylanan' },
            rejected: { class: 'bg-red-100 text-red-800', text: 'Reddedilen' }
        };

        const config = statusConfig[status] || statusConfig.pending;
        return `<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.class}">${config.text}</span>`;
    }

    viewReport(reportId) {
        const report = this.reports.find(r => r.id === reportId);
        if (!report) return;

        // Create and show report details modal
        const modalHtml = `
            <div id="report-view-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50">
                <div class="flex items-center justify-center min-h-screen p-4">
                    <div class="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
                        <div class="p-6 border-b border-gray-200">
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-semibold text-gray-900">SGK Rapor Detayları</h3>
                                <button onclick="sgkManager.closeViewModal()" class="text-gray-400 hover:text-gray-600">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="p-6">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Rapor ID</label>
                                    <p class="text-sm text-gray-900">${report.id}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Durum</label>
                                    ${this.getStatusBadge(report.status)}
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                                    <p class="text-sm text-gray-900">${report.patientName}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">TC Kimlik</label>
                                    <p class="text-sm text-gray-900">${report.tcNumber}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Rapor Türü</label>
                                    <p class="text-sm text-gray-900">${report.reportTypeName}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Rapor Tarihi</label>
                                    <p class="text-sm text-gray-900">${Utils.formatDate(report.date)}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Doktor</label>
                                    <p class="text-sm text-gray-900">${report.doctor}</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Başvuru Tarihi</label>
                                    <p class="text-sm text-gray-900">${Utils.formatDate(report.submissionDate)}</p>
                                </div>
                                ${report.approvalDate ? `
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Onay Tarihi</label>
                                    <p class="text-sm text-gray-900">${Utils.formatDate(report.approvalDate)}</p>
                                </div>
                                ` : ''}
                                ${report.rejectionReason ? `
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Red Sebebi</label>
                                    <p class="text-sm text-red-600">${report.rejectionReason}</p>
                                </div>
                                ` : ''}
                                <div class="md:col-span-2">
                                    <label class="block text-sm font-medium text-gray-700 mb-1">Rapor Detayları</label>
                                    <p class="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">${report.details}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.body.style.overflow = 'hidden';
    }

    closeViewModal() {
        const modal = document.getElementById('report-view-modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    }

    editReport(reportId) {
        Utils.showToast('Rapor düzenleme özelliği yakında eklenecek.', 'info');
    }

    deleteReport(reportId) {
        if (confirm('Bu raporu silmek istediğinizden emin misiniz?')) {
            this.reports = this.reports.filter(r => r.id !== reportId);
            this.applyFilters();
            this.renderStats();
            Utils.showToast('Rapor başarıyla silindi.', 'success');
        }
    }

    // Additional methods for enhanced functionality
    getStatusText(status) {
        const statusTexts = {
            'preparing': 'Hazırlanıyor',
            'submitted': 'Gönderildi',
            'pending': 'Beklemede',
            'approved': 'Onaylandı',
            'paid': 'Ödendi',
            'rejected': 'Reddedildi'
        };
        return statusTexts[status] || status;
    }

    createRenewalReport(renewalId) {
        const renewal = this.renewals.find(r => r.id === renewalId);
        if (!renewal) return;

        // Pre-fill form with renewal data
        this.openNewReportModal();
        
        // Set form values
        setTimeout(() => {
            const patientSelect = document.getElementById('patient-select');
            const reportType = document.getElementById('report-type');
            
            if (patientSelect) patientSelect.value = renewal.patientId;
            if (reportType) reportType.value = renewal.type === 'battery' ? 'battery-report' : 'device-renewal';
        }, 100);
    }

    sendRenewalReminder(renewalId) {
        const renewal = this.renewals.find(r => r.id === renewalId);
        if (!renewal) return;

        // Send SMS reminder using automation system
        const patient = PatientManager.getPatient(renewal.patientId);
        if (patient) {
            const templateId = renewal.type === 'battery' ? 'battery_renewal' : 'device_renewal';
            
            // Use automation context to send SMS
            if (typeof AutomationRules !== 'undefined') {
                const context = AutomationRules.createContext();
                context.sendSMS(renewal.patientId, templateId, {
                    name: patient.name,
                    booking_link: `${window.location.origin}/appointments.html?patient=${renewal.patientId}&type=${renewal.type}_renewal`
                });
            }

            renewal.notificationSent = true;
            Utils.showToast('Hatırlatma SMS\'i gönderildi', 'success');
        }
    }

    extendDeadline(deadlineId) {
        const deadline = this.deadlines.find(d => d.id === deadlineId);
        if (!deadline) return;

        // Show extension dialog
        const extension = prompt('Kaç gün uzatmak istiyorsunuz?', '7');
        if (extension && !isNaN(extension)) {
            const currentDeadline = new Date(deadline.deadline);
            currentDeadline.setDate(currentDeadline.getDate() + parseInt(extension));
            deadline.deadline = currentDeadline.toISOString().split('T')[0];
            deadline.daysRemaining = this.calculateDaysUntil(deadline.deadline);
            
            this.renderDeadlines();
            Utils.showToast(`Son tarih ${extension} gün uzatıldı`, 'success');
        }
    }

    // Bulk operations
    bulkUpdateStatus(reportIds, newStatus) {
        let successCount = 0;
        reportIds.forEach(id => {
            if (this.updateReportStatus(id, newStatus)) {
                successCount++;
            }
        });
        
        Utils.showToast(`${successCount} rapor güncellendi`, 'success');
    }

    // Analytics and reporting
    getReportAnalytics() {
        const analytics = {
            totalReports: this.reports.length,
            byStatus: {},
            byType: {},
            averageProcessingTime: 0,
            totalAmount: 0,
            monthlyStats: {}
        };

        // Calculate status distribution
        this.reports.forEach(report => {
            analytics.byStatus[report.status] = (analytics.byStatus[report.status] || 0) + 1;
            analytics.byType[report.reportType] = (analytics.byType[report.reportType] || 0) + 1;
            
            if (report.amount) {
                analytics.totalAmount += report.amount;
            }
        });

        return analytics;
    }

    generateComplianceReport() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentReports = this.reports.filter(r => 
            new Date(r.submissionDate) >= thirtyDaysAgo
        );

        const compliance = {
            totalSubmitted: recentReports.length,
            onTime: recentReports.filter(r => r.status !== 'rejected').length,
            rejected: recentReports.filter(r => r.status === 'rejected').length,
            averageProcessingDays: this.calculateAverageProcessingTime(recentReports),
            complianceRate: 0
        };

        compliance.complianceRate = recentReports.length > 0 ? 
            (compliance.onTime / compliance.totalSubmitted * 100).toFixed(1) : 0;

        return compliance;
    }

    calculateAverageProcessingTime(reports) {
        const processedReports = reports.filter(r => 
            r.approvalDate && r.submissionDate
        );

        if (processedReports.length === 0) return 0;

        const totalDays = processedReports.reduce((sum, report) => {
            const submitDate = new Date(report.submissionDate);
            const approvalDate = new Date(report.approvalDate);
            const daysDiff = Math.floor((approvalDate - submitDate) / (1000 * 60 * 60 * 24));
            return sum + daysDiff;
        }, 0);

        return Math.round(totalDays / processedReports.length);
    }
}

// Initialize SGK Manager when DOM is loaded
let sgkManager;
document.addEventListener('DOMContentLoaded', () => {
    sgkManager = new SGKManager();
});