// X-Ear CRM - Data Export/Import Manager
class DataExportImportManager {
    constructor() {
        this.exportFormats = ['excel', 'csv', 'json', 'pdf'];
        this.importFormats = ['excel', 'csv', 'json'];
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // File drop handlers for import
        document.addEventListener('dragover', (e) => {
            if (e.target.classList.contains('import-drop-zone')) {
                e.preventDefault();
                e.target.classList.add('drag-over');
            }
        });

        document.addEventListener('dragleave', (e) => {
            if (e.target.classList.contains('import-drop-zone')) {
                e.target.classList.remove('drag-over');
            }
        });

        document.addEventListener('drop', (e) => {
            if (e.target.classList.contains('import-drop-zone')) {
                e.preventDefault();
                e.target.classList.remove('drag-over');
                this.handleFileImport(e.dataTransfer.files);
            }
        });
    }

    // EXPORT METHODS

    // Export all data
    async exportAllData(format = 'excel') {
        try {
            Utils.showToast('Veriler dışa aktarılıyor...', 'info');

            const data = {
                patients: Storage.load('patients') || [],
                appointments: Storage.load('appointments') || [],
                inventory: Storage.load('inventory') || [],
                smsHistory: Storage.load('sms_history') || [],
                emailHistory: Storage.load('email_history') || [],
                automationRules: Storage.load('automation_rules') || [],
                sgkRecords: Storage.load('sgk_records') || [],
                settings: this.getExportableSettings(),
                exportInfo: {
                    exportDate: new Date().toISOString(),
                    version: '1.0',
                    clinic: 'X-Ear Audiolog Kliniği'
                }
            };

            switch (format) {
                case 'excel':
                    await this.exportToExcel(data);
                    break;
                case 'csv':
                    await this.exportToCSV(data);
                    break;
                case 'json':
                    await this.exportToJSON(data);
                    break;
                case 'pdf':
                    await this.exportToPDF(data);
                    break;
                default:
                    throw new Error('Desteklenmeyen format');
            }

            Utils.showToast('Veriler başarıyla dışa aktarıldı', 'success');

        } catch (error) {
            console.error('Export error:', error);
            Utils.showToast(`Dışa aktarma hatası: ${error.message}`, 'error');
        }
    }

    // Export specific data type
    async exportDataType(dataType, format = 'excel', filters = {}) {
        try {
            let data;
            let fileName;

            switch (dataType) {
                case 'patients':
                    data = this.getFilteredPatients(filters);
                    fileName = 'hastalar';
                    break;
                case 'appointments':
                    data = this.getFilteredAppointments(filters);
                    fileName = 'randevular';
                    break;
                case 'inventory':
                    data = this.getFilteredInventory(filters);
                    fileName = 'envanter';
                    break;
                case 'sms':
                    data = this.getFilteredSMS(filters);
                    fileName = 'sms_gecmisi';
                    break;
                case 'email':
                    data = this.getFilteredEmails(filters);
                    fileName = 'email_gecmisi';
                    break;
                case 'sgk':
                    data = this.getFilteredSGK(filters);
                    fileName = 'sgk_kayitlari';
                    break;
                default:
                    throw new Error('Geçersiz veri türü');
            }

            await this.exportSingleDataType(data, dataType, fileName, format);
            Utils.showToast(`${fileName} başarıyla dışa aktarıldı`, 'success');

        } catch (error) {
            console.error('Export error:', error);
            Utils.showToast(`Dışa aktarma hatası: ${error.message}`, 'error');
        }
    }

    // Excel export
    async exportToExcel(data) {
        // Create workbook with multiple sheets
        const workbook = {
            sheets: {},
            sheetNames: []
        };

        // Add patients sheet
        if (data.patients && data.patients.length > 0) {
            workbook.sheets['Hastalar'] = this.createPatientsSheet(data.patients);
            workbook.sheetNames.push('Hastalar');
        }

        // Add appointments sheet
        if (data.appointments && data.appointments.length > 0) {
            workbook.sheets['Randevular'] = this.createAppointmentsSheet(data.appointments);
            workbook.sheetNames.push('Randevular');
        }

        // Add inventory sheet
        if (data.inventory && data.inventory.length > 0) {
            workbook.sheets['Envanter'] = this.createInventorySheet(data.inventory);
            workbook.sheetNames.push('Envanter');
        }

        // Add SGK sheet
        if (data.sgkRecords && data.sgkRecords.length > 0) {
            workbook.sheets['SGK Kayıtları'] = this.createSGKSheet(data.sgkRecords);
            workbook.sheetNames.push('SGK Kayıtları');
        }

        // Convert to Excel file and download
        this.downloadExcelFile(workbook, 'X-Ear_CRM_Verileri_' + this.getDateString());
    }

    createPatientsSheet(patients) {
        const headers = [
            'ID', 'Ad', 'Soyad', 'TC No', 'Telefon', 'Email', 'Doğum Tarihi',
            'Cinsiyet', 'Şehir', 'İlçe', 'Adres', 'Notlar', 'Kayıt Tarihi'
        ];

        const rows = patients.map(patient => [
            patient.id,
            patient.firstName,
            patient.lastName,
            patient.tcNo,
            patient.phone,
            patient.email,
            patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('tr-TR') : '',
            patient.gender === 'M' ? 'Erkek' : patient.gender === 'F' ? 'Kadın' : '',
            patient.city,
            patient.district,
            patient.address,
            patient.notes,
            new Date(patient.createdAt).toLocaleDateString('tr-TR')
        ]);

        return this.createWorksheet([headers, ...rows]);
    }

    createAppointmentsSheet(appointments) {
        const patients = Storage.load('patients') || [];
        const patientMap = Object.fromEntries(patients.map(p => [p.id, p]));

        const headers = [
            'ID', 'Hasta ID', 'Hasta Adı', 'Tarih', 'Saat', 'Durum', 'Tip', 'Notlar', 'Oluşturma Tarihi'
        ];

        const rows = appointments.map(appointment => {
            const patient = patientMap[appointment.patientId];
            const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Bilinmeyen';
            const dateTime = new Date(appointment.dateTime);

            return [
                appointment.id,
                appointment.patientId,
                patientName,
                dateTime.toLocaleDateString('tr-TR'),
                dateTime.toLocaleTimeString('tr-TR'),
                this.getAppointmentStatusText(appointment.status),
                appointment.type,
                appointment.notes,
                new Date(appointment.createdAt).toLocaleDateString('tr-TR')
            ];
        });

        return this.createWorksheet([headers, ...rows]);
    }

    createInventorySheet(inventory) {
        const headers = [
            'ID', 'Ürün Adı', 'Kategori', 'Marka', 'Model', 'Barkod', 'Stok Miktarı',
            'Birim Fiyat', 'Toplam Değer', 'Tedarikçi', 'Son Güncelleme'
        ];

        const rows = inventory.map(item => [
            item.id,
            item.name,
            item.category,
            item.brand,
            item.model,
            item.barcode,
            item.inventory,
            item.price,
            item.inventory * item.price,
            item.supplier,
            new Date(item.updatedAt).toLocaleDateString('tr-TR')
        ]);

        return this.createWorksheet([headers, ...rows]);
    }

    createSGKSheet(sgkRecords) {
        const headers = [
            'ID', 'Hasta ID', 'Hasta Adı', 'İşlem Türü', 'Cihaz Türü', 'Durum',
            'Başvuru Tarihi', 'Onay Tarihi', 'Teslim Tarihi', 'Notlar'
        ];

        const patients = Storage.load('patients') || [];
        const patientMap = Object.fromEntries(patients.map(p => [p.id, p]));

        const rows = sgkRecords.map(record => {
            const patient = patientMap[record.patientId];
            const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Bilinmeyen';

            return [
                record.id,
                record.patientId,
                patientName,
                record.operationType,
                record.deviceType,
                record.status,
                record.applicationDate ? new Date(record.applicationDate).toLocaleDateString('tr-TR') : '',
                record.approvalDate ? new Date(record.approvalDate).toLocaleDateString('tr-TR') : '',
                record.deliveryDate ? new Date(record.deliveryDate).toLocaleDateString('tr-TR') : '',
                record.notes
            ];
        });

        return this.createWorksheet([headers, ...rows]);
    }

    createWorksheet(data) {
        // Mock worksheet creation - in real implementation use libraries like SheetJS
        return {
            data: data,
            range: `A1:${String.fromCharCode(65 + data[0].length - 1)}${data.length}`
        };
    }

    downloadExcelFile(workbook, fileName) {
        // Mock Excel file download - in real implementation use SheetJS
        const jsonData = JSON.stringify(workbook, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName + '.json'; // Would be .xlsx in real implementation
        link.click();
        
        URL.revokeObjectURL(url);
    }

    // CSV export
    async exportToCSV(data) {
        const csvFiles = [];

        if (data.patients && data.patients.length > 0) {
            csvFiles.push({
                name: 'hastalar.csv',
                content: this.convertToCSV(data.patients, this.getPatientsCSVHeaders())
            });
        }

        if (data.appointments && data.appointments.length > 0) {
            csvFiles.push({
                name: 'randevular.csv',
                content: this.convertToCSV(data.appointments, this.getAppointmentsCSVHeaders())
            });
        }

        if (data.inventory && data.inventory.length > 0) {
            csvFiles.push({
                name: 'envanter.csv',
                content: this.convertToCSV(data.inventory, this.getInventoryCSVHeaders())
            });
        }

        // Download as ZIP file if multiple CSVs, otherwise single CSV
        if (csvFiles.length > 1) {
            this.downloadZipFile(csvFiles, 'X-Ear_CRM_Verileri_' + this.getDateString());
        } else if (csvFiles.length === 1) {
            this.downloadCSVFile(csvFiles[0].content, csvFiles[0].name);
        }
    }

    convertToCSV(data, headers) {
        const csvRows = [];
        csvRows.push(headers.join(','));

        data.forEach(item => {
            const row = headers.map(header => {
                const value = this.getItemValue(item, header);
                return this.escapeCSVValue(value);
            });
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    escapeCSVValue(value) {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return '"' + stringValue.replace(/"/g, '""') + '"';
        }
        return stringValue;
    }

    downloadCSVFile(content, fileName) {
        const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    // JSON export
    async exportToJSON(data) {
        const jsonContent = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'X-Ear_CRM_Verileri_' + this.getDateString() + '.json';
        link.click();
        
        URL.revokeObjectURL(url);
    }

    // PDF export
    async exportToPDF(data) {
        // Mock PDF generation - in real implementation use jsPDF
        const reportContent = this.generatePDFReport(data);
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'X-Ear_CRM_Rapor_' + this.getDateString() + '.txt';
        link.click();
        
        URL.revokeObjectURL(url);
    }

    generatePDFReport(data) {
        let report = 'X-EAR AUDİOLOG KLİNİĞİ\n';
        report += 'Sistem Raporu\n';
        report += '='.repeat(50) + '\n\n';
        report += `Rapor Tarihi: ${new Date().toLocaleString('tr-TR')}\n\n`;

        // Summary statistics
        report += 'ÖZET İSTATİSTİKLER\n';
        report += '-'.repeat(25) + '\n';
        report += `Toplam Hasta Sayısı: ${data.patients?.length || 0}\n`;
        report += `Toplam Randevu Sayısı: ${data.appointments?.length || 0}\n`;
        report += `Envanter Ürün Sayısı: ${data.inventory?.length || 0}\n`;
        report += `SGK Kayıt Sayısı: ${data.sgkRecords?.length || 0}\n\n`;

        // Patient summary
        if (data.patients && data.patients.length > 0) {
            report += 'HASTA LİSTESİ\n';
            report += '-'.repeat(15) + '\n';
            data.patients.slice(0, 20).forEach(patient => {
                report += `${patient.firstName} ${patient.lastName} - ${patient.phone}\n`;
            });
            if (data.patients.length > 20) {
                report += `... ve ${data.patients.length - 20} hasta daha\n`;
            }
            report += '\n';
        }

        // Recent appointments
        if (data.appointments && data.appointments.length > 0) {
            report += 'SON RANDEVULAR\n';
            report += '-'.repeat(20) + '\n';
            const recentAppointments = data.appointments
                .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
                .slice(0, 10);
            
            recentAppointments.forEach(appointment => {
                const date = new Date(appointment.dateTime).toLocaleString('tr-TR');
                report += `${date} - ${appointment.status}\n`;
            });
            report += '\n';
        }

        return report;
    }

    // IMPORT METHODS

    async handleFileImport(files) {
        try {
            if (files.length === 0) return;

            for (const file of files) {
                if (!this.validateImportFile(file)) continue;
                await this.importFile(file);
            }

        } catch (error) {
            console.error('Import error:', error);
            Utils.showToast(`İçe aktarma hatası: ${error.message}`, 'error');
        }
    }

    validateImportFile(file) {
        if (file.size > this.maxFileSize) {
            Utils.showToast('Dosya çok büyük (max 50MB)', 'error');
            return false;
        }

        const extension = file.name.split('.').pop().toLowerCase();
        if (!this.importFormats.includes(extension) && extension !== 'xlsx') {
            Utils.showToast('Desteklenmeyen dosya formatı', 'error');
            return false;
        }

        return true;
    }

    async importFile(file) {
        Utils.showToast('Dosya içe aktarılıyor...', 'info');

        const extension = file.name.split('.').pop().toLowerCase();
        let importData;

        switch (extension) {
            case 'json':
                importData = await this.importFromJSON(file);
                break;
            case 'csv':
                importData = await this.importFromCSV(file);
                break;
            case 'xlsx':
            case 'excel':
                importData = await this.importFromExcel(file);
                break;
            default:
                throw new Error('Desteklenmeyen dosya formatı');
        }

        await this.processImportData(importData);
        Utils.showToast('Veriler başarıyla içe aktarıldı', 'success');
    }

    async importFromJSON(file) {
        const content = await this.readFileAsText(file);
        try {
            return JSON.parse(content);
        } catch (error) {
            throw new Error('Geçersiz JSON formatı');
        }
    }

    async importFromCSV(file) {
        const content = await this.readFileAsText(file);
        const lines = content.split('\n');
        
        if (lines.length < 2) {
            throw new Error('CSV dosyası boş veya geçersiz');
        }

        const headers = this.parseCSVLine(lines[0]);
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line) {
                const values = this.parseCSVLine(line);
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
        }

        return this.determineDataType(headers, data);
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    async importFromExcel(file) {
        // Mock Excel import - in real implementation use SheetJS
        throw new Error('Excel içe aktarma henüz desteklenmiyor');
    }

    determineDataType(headers, data) {
        // Determine data type based on headers
        const headerString = headers.join(',').toLowerCase();
        
        if (headerString.includes('hasta') || headerString.includes('tc') || headerString.includes('telefon')) {
            return { type: 'patients', data: this.mapPatientsData(data) };
        } else if (headerString.includes('randevu') || headerString.includes('tarih') || headerString.includes('saat')) {
            return { type: 'appointments', data: this.mapAppointmentsData(data) };
        } else if (headerString.includes('ürün') || headerString.includes('stok') || headerString.includes('fiyat')) {
            return { type: 'inventory', data: this.mapInventoryData(data) };
        } else {
            return { type: 'unknown', data: data };
        }
    }

    mapPatientsData(data) {
        return data.map(row => ({
            id: row.ID || 'patient-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            firstName: row['Ad'] || row['firstName'] || '',
            lastName: row['Soyad'] || row['lastName'] || '',
            tcNo: row['TC No'] || row['tcNo'] || '',
            phone: row['Telefon'] || row['phone'] || '',
            email: row['Email'] || row['email'] || '',
            birthDate: this.parseDate(row['Doğum Tarihi'] || row['birthDate']),
            gender: this.parseGender(row['Cinsiyet'] || row['gender']),
            city: row['Şehir'] || row['city'] || '',
            district: row['İlçe'] || row['district'] || '',
            address: row['Adres'] || row['address'] || '',
            notes: row['Notlar'] || row['notes'] || '',
            createdAt: new Date().toISOString()
        }));
    }

    mapAppointmentsData(data) {
        return data.map(row => ({
            id: row.ID || 'appointment-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            patientId: row['Hasta ID'] || row['patientId'] || '',
            dateTime: this.parseDateTime(row['Tarih'], row['Saat']),
            status: this.parseAppointmentStatus(row['Durum'] || row['status']),
            type: row['Tip'] || row['type'] || 'Genel Muayene',
            notes: row['Notlar'] || row['notes'] || '',
            createdAt: new Date().toISOString()
        }));
    }

    mapInventoryData(data) {
        return data.map(row => ({
            id: row.ID || 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            name: row['Ürün Adı'] || row['name'] || '',
            category: row['Kategori'] || row['category'] || '',
            brand: row['Marka'] || row['brand'] || '',
            model: row['Model'] || row['model'] || '',
            barcode: row['Barkod'] || row['barcode'] || '',
            inventory: parseInt(row['Stok Miktarı'] || row['inventory']) || 0,
            price: parseFloat(row['Birim Fiyat'] || row['price']) || 0,
            supplier: row['Tedarikçi'] || row['supplier'] || '',
            updatedAt: new Date().toISOString()
        }));
    }

    async processImportData(importData) {
        if (!importData || !importData.type || !importData.data) {
            throw new Error('Geçersiz veri formatı');
        }

        const { type, data } = importData;
        
        switch (type) {
            case 'patients':
                await this.importPatients(data);
                break;
            case 'appointments':
                await this.importAppointments(data);
                break;
            case 'inventory':
                await this.importInventory(data);
                break;
            case 'full':
                await this.importFullData(data);
                break;
            default:
                throw new Error('Desteklenmeyen veri türü');
        }
    }

    async importPatients(patients) {
        const existingPatients = Storage.load('patients') || [];
        const importedCount = patients.length;
        let mergedCount = 0;
        let newCount = 0;

        patients.forEach(patient => {
            const existingIndex = existingPatients.findIndex(p => 
                p.tcNo === patient.tcNo || p.id === patient.id
            );

            if (existingIndex !== -1) {
                // Update existing patient
                existingPatients[existingIndex] = { 
                    ...existingPatients[existingIndex], 
                    ...patient,
                    updatedAt: new Date().toISOString()
                };
                mergedCount++;
            } else {
                // Add new patient
                existingPatients.push(patient);
                newCount++;
            }
        });

        Storage.save('patients', existingPatients);
        
        Utils.showToast(
            `${importedCount} hasta işlendi: ${newCount} yeni, ${mergedCount} güncellendi`, 
            'success'
        );
    }

    async importAppointments(appointments) {
        const existingAppointments = Storage.load('appointments') || [];
        const importedCount = appointments.length;
        let newCount = 0;

        appointments.forEach(appointment => {
            const exists = existingAppointments.some(a => a.id === appointment.id);
            if (!exists) {
                existingAppointments.push(appointment);
                newCount++;
            }
        });

        Storage.save('appointments', existingAppointments);
        
        Utils.showToast(`${newCount} yeni randevu eklendi`, 'success');
    }

    async importInventory(inventory) {
        const existingInventory = Storage.load('inventory') || [];
        const importedCount = inventory.length;
        let mergedCount = 0;
        let newCount = 0;

        inventory.forEach(item => {
            const existingIndex = existingInventory.findIndex(i => 
                i.barcode === item.barcode || i.id === item.id
            );

            if (existingIndex !== -1) {
                existingInventory[existingIndex] = { 
                    ...existingInventory[existingIndex], 
                    ...item 
                };
                mergedCount++;
            } else {
                existingInventory.push(item);
                newCount++;
            }
        });

        Storage.save('inventory', existingInventory);
        
        Utils.showToast(
            `${importedCount} ürün işlendi: ${newCount} yeni, ${mergedCount} güncellendi`, 
            'success'
        );
    }

    async importFullData(data) {
        // Import all data types
        if (data.patients) await this.importPatients(data.patients);
        if (data.appointments) await this.importAppointments(data.appointments);
        if (data.inventory) await this.importInventory(data.inventory);
        
        // Import other data
        if (data.automationRules) {
            Storage.save('automation_rules', data.automationRules);
        }
        if (data.sgkRecords) {
            Storage.save('sgk_records', data.sgkRecords);
        }
        
        Utils.showToast('Tüm veriler başarıyla içe aktarıldı', 'success');
    }

    // Utility methods
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file, 'UTF-8');
        });
    }

    parseDate(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    }

    parseDateTime(dateString, timeString) {
        if (!dateString) return new Date().toISOString();
        
        let dateTime = new Date(dateString);
        if (timeString) {
            const [hours, minutes] = timeString.split(':');
            dateTime.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);
        }
        
        return dateTime.toISOString();
    }

    parseGender(genderString) {
        if (!genderString) return '';
        const lower = genderString.toLowerCase();
        if (lower.includes('erkek') || lower === 'm' || lower === 'male') return 'M';
        if (lower.includes('kadın') || lower === 'f' || lower === 'female') return 'F';
        return '';
    }

    parseAppointmentStatus(statusString) {
        if (!statusString) return 'SCHEDULED';
        const lower = statusString.toLowerCase();
        if (lower.includes('onay')) return 'CONFIRMED';
        if (lower.includes('tamamlan')) return 'COMPLETED';
        if (lower.includes('iptal')) return 'CANCELLED';
        if (lower.includes('gelme')) return 'NO_SHOW';
        return 'SCHEDULED';
    }

    getDateString() {
        const now = new Date();
        return now.getFullYear() + 
               String(now.getMonth() + 1).padStart(2, '0') + 
               String(now.getDate()).padStart(2, '0');
    }

    // Filter methods
    getFilteredPatients(filters) {
        const patients = Storage.load('patients') || [];
        // Apply filters here
        return patients;
    }

    getFilteredAppointments(filters) {
        const appointments = Storage.load('appointments') || [];
        // Apply filters here
        return appointments;
    }

    getFilteredInventory(filters) {
        const inventory = Storage.load('inventory') || [];
        // Apply filters here
        return inventory;
    }

    getFilteredSMS(filters) {
        const smsHistory = Storage.load('sms_history') || [];
        // Apply filters here
        return smsHistory;
    }

    getFilteredEmails(filters) {
        const emailHistory = Storage.load('email_history') || [];
        // Apply filters here
        return emailHistory;
    }

    getFilteredSGK(filters) {
        const sgkRecords = Storage.load('sgk_records') || [];
        // Apply filters here
        return sgkRecords;
    }

    getExportableSettings() {
        // Return only non-sensitive settings
        return {
            smsTemplates: Storage.load('sms_templates'),
            emailTemplates: Storage.load('email_templates'),
            automationRules: Storage.load('automation_rules')
        };
    }

    // CSV Headers
    getPatientsCSVHeaders() {
        return ['id', 'firstName', 'lastName', 'tcNo', 'phone', 'email', 'birthDate', 'gender', 'city', 'district', 'address', 'notes', 'createdAt'];
    }

    getAppointmentsCSVHeaders() {
        return ['id', 'patientId', 'dateTime', 'status', 'type', 'notes', 'createdAt'];
    }

    getInventoryCSVHeaders() {
        return ['id', 'name', 'category', 'brand', 'model', 'barcode', 'inventory', 'price', 'supplier', 'updatedAt'];
    }

    getItemValue(item, key) {
        return item[key] || '';
    }

    getAppointmentStatusText(status) {
        const statusTexts = {
            'scheduled': 'Planlandı',
            'confirmed': 'Onaylandı',
            'completed': 'Tamamlandı',
            'cancelled': 'İptal Edildi',
            'no_show': 'Gelmedi'
        };
        return statusTexts[status] || status;
    }

    downloadZipFile(files, fileName) {
        // Mock ZIP download - in real implementation use JSZip
        console.log('Would create ZIP file with:', files);
        Utils.showToast('ZIP dosyası oluşturma henüz desteklenmiyor', 'info');
    }

    async exportSingleDataType(data, dataType, fileName, format) {
        switch (format) {
            case 'csv':
                const csvContent = this.convertToCSV(data, this.getHeadersForDataType(dataType));
                this.downloadCSVFile(csvContent, fileName + '.csv');
                break;
            case 'json':
                const jsonContent = JSON.stringify(data, null, 2);
                const blob = new Blob([jsonContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName + '.json';
                link.click();
                URL.revokeObjectURL(url);
                break;
            default:
                throw new Error('Desteklenmeyen format');
        }
    }

    getHeadersForDataType(dataType) {
        switch (dataType) {
            case 'patients':
                return this.getPatientsCSVHeaders();
            case 'appointments':
                return this.getAppointmentsCSVHeaders();
            case 'inventory':
                return this.getInventoryCSVHeaders();
            default:
                return Object.keys(dataType[0] || {});
        }
    }
}

// Initialize Data Export/Import Manager
window.dataExportImportManager = new DataExportImportManager();
