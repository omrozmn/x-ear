// Patient Details Inline Tab Helper Functions
// This file contains helper functions for the inline tab system to reduce main file size

// Modal functions
function showAppointmentModal() {
    const modalHtml = `
        <div id="appointmentModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Yeni Randevu Ekle</h3>
                    <button onclick="closeModal('appointmentModal')" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <form onsubmit="saveAppointment(event)">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                            <input type="date" id="appointmentDate" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Saat</label>
                            <input type="time" id="appointmentTime" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                            <textarea id="appointmentDesc" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Randevu açıklaması..."></textarea>
                        </div>
                    </div>
                    
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                            Kaydet
                        </button>
                        <button type="button" onclick="closeModal('appointmentModal')" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400">
                            İptal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Set default date to today
    document.getElementById('appointmentDate').value = new Date().toISOString().split('T')[0];
}

function showSaleModal() {
    const modalHtml = `
        <div id="saleModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-lg">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Yeni Satış Ekle</h3>
                    <button onclick="closeModal('saleModal')" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <form onsubmit="saveSale(event)">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Ürün/Hizmet</label>
                            <select id="saleProduct" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                <option value="">Seçiniz...</option>
                                <option value="İşitme Cihazı - Sağ">İşitme Cihazı - Sağ</option>
                                <option value="İşitme Cihazı - Sol">İşitme Cihazı - Sol</option>
                                <option value="İşitme Cihazı - Bilateral">İşitme Cihazı - Bilateral</option>
                                <option value="Kalıp - Sağ">Kalıp - Sağ</option>
                                <option value="Kalıp - Sol">Kalıp - Sol</option>
                                <option value="Pil Paketi">Pil Paketi</option>
                                <option value="Bakım/Onarım">Bakım/Onarım</option>
                                <option value="Kontrol Muayenesi">Kontrol Muayenesi</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Fiyat (₺)</label>
                            <input type="number" id="salePrice" step="0.01" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi</label>
                            <select id="paymentMethod" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                <option value="Nakit">Nakit</option>
                                <option value="Kredi Kartı">Kredi Kartı</option>
                                <option value="Banka Transferi">Banka Transferi</option>
                                <option value="SGK">SGK</option>
                                <option value="Taksitli">Taksitli</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                            <textarea id="saleNotes" rows="2" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Satış notları..."></textarea>
                        </div>
                    </div>
                    
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
                            Kaydet
                        </button>
                        <button type="button" onclick="closeModal('saleModal')" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400">
                            İptal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function addTimelineEvent() {
    const modalHtml = `
        <div id="timelineModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Manuel Olay Ekle</h3>
                    <button onclick="closeModal('timelineModal')" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <form onsubmit="saveTimelineEvent(event)">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Olay Türü</label>
                            <select id="eventType" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                <option value="note">Not</option>
                                <option value="call">Telefon Görüşmesi</option>
                                <option value="visit">Ziyaret</option>
                                <option value="maintenance">Bakım</option>
                                <option value="complaint">Şikayet</option>
                                <option value="other">Diğer</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Başlık</label>
                            <input type="text" id="eventTitle" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                            <textarea id="eventDesc" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
                            <input type="datetime-local" id="eventDateTime" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                    </div>
                    
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                            Kaydet
                        </button>
                        <button type="button" onclick="closeModal('timelineModal')" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400">
                            İptal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Set default datetime to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('eventDateTime').value = now.toISOString().slice(0, 16);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

function saveAppointment(event) {
    event.preventDefault();
    
    const date = document.getElementById('appointmentDate').value;
    const time = document.getElementById('appointmentTime').value;
    const description = document.getElementById('appointmentDesc').value;
    
    if (!date || !time) {
        alert('Lütfen tarih ve saat bilgilerini girin');
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patient') || urlParams.get('id');
    
    const appointments = JSON.parse(localStorage.getItem('appointments_' + patientId) || '[]');
    const newAppointment = {
        id: Date.now().toString(),
        date: date,
        time: time,
        description: description || 'Randevu',
        status: 'Planlandı',
        created: new Date().toISOString()
    };
    
    appointments.push(newAppointment);
    localStorage.setItem('appointments_' + patientId, JSON.stringify(appointments));
    
    // Log appointment creation to timeline
    if (window.addTimelineEvent) {
        window.addTimelineEvent('appointment', {
            date: date,
            time: time,
            description: description || 'Randevu'
        });
    }
    
    // Close modal and refresh content
    closeModal('appointmentModal');
    
    // Refresh the appointments tab if it's active
    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab && activeTab.textContent.includes('Randevular')) {
        loadAppointmentsContent();
    }
    
    alert('Randevu başarıyla eklendi');
}

function saveSale(event) {
    event.preventDefault();
    
    const product = document.getElementById('saleProduct').value;
    const price = document.getElementById('salePrice').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const notes = document.getElementById('saleNotes').value;
    
    if (!product || !price || !paymentMethod) {
        alert('Lütfen tüm gerekli alanları doldurun');
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patient') || urlParams.get('id');
    
    const sales = JSON.parse(localStorage.getItem('sales_' + patientId) || '[]');
    const newSale = {
        id: Date.now().toString(),
        product: product,
        price: parseFloat(price),
        paymentMethod: paymentMethod,
        notes: notes,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().substring(0,5),
        status: 'Tamamlandı'
    };
    
    sales.push(newSale);
    localStorage.setItem('sales_' + patientId, JSON.stringify(sales));
    
    // Log sale to timeline
    if (window.addTimelineEvent) {
        window.addTimelineEvent('sale', {
            product: product,
            price: parseFloat(price),
            paymentMethod: paymentMethod,
            notes: notes || null
        });
    }
    
    // Close modal
    closeModal('saleModal');
    
    alert('Satış başarıyla kaydedildi');
}

function saveTimelineEvent(event) {
    event.preventDefault();
    
    const type = document.getElementById('eventType').value;
    const title = document.getElementById('eventTitle').value;
    const description = document.getElementById('eventDesc').value;
    const dateTime = document.getElementById('eventDateTime').value;
    
    if (!type || !title || !description || !dateTime) {
        alert('Lütfen tüm alanları doldurun');
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patient') || urlParams.get('id');
    
    const activities = JSON.parse(localStorage.getItem('activities_' + patientId) || '[]');
    activities.push({
        type: type,
        title: title,
        description: description,
        date: new Date(dateTime).toISOString(),
        timestamp: new Date(dateTime).getTime(),
        manual: true
    });
    
    localStorage.setItem('activities_' + patientId, JSON.stringify(activities));
    
    // Close modal and refresh timeline if active
    closeModal('timelineModal');
    
    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab && activeTab.textContent.includes('Zaman Çizelgesi')) {
        loadTimelineContent();
    }
    
    alert('Olay başarıyla eklendi');
}

// Data export/import functions
function exportPatientData() {
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patient') || urlParams.get('id');
    
    const data = {
        patientId: patientId,
        appointments: JSON.parse(localStorage.getItem('appointments_' + patientId) || '[]'),
        sales: JSON.parse(localStorage.getItem('sales_' + patientId) || '[]'),
        documents: JSON.parse(localStorage.getItem('documents_' + patientId) || '[]'),
        deliveries: JSON.parse(localStorage.getItem('deliveries_' + patientId) || '[]'),
        activities: JSON.parse(localStorage.getItem('activities_' + patientId) || '[]'),
        ereceipts: JSON.parse(localStorage.getItem('ereceipts_' + patientId) || '[]'),
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hasta_${patientId}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importPatientData(input) {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm('Bu işlem mevcut hasta verilerini değiştirecek. Devam etmek istiyor musunuz?')) {
                const patientId = data.patientId;
                
                if (data.appointments) localStorage.setItem('appointments_' + patientId, JSON.stringify(data.appointments));
                if (data.sales) localStorage.setItem('sales_' + patientId, JSON.stringify(data.sales));
                if (data.documents) localStorage.setItem('documents_' + patientId, JSON.stringify(data.documents));
                if (data.deliveries) localStorage.setItem('deliveries_' + patientId, JSON.stringify(data.deliveries));
                if (data.activities) localStorage.setItem('activities_' + patientId, JSON.stringify(data.activities));
                if (data.ereceipts) localStorage.setItem('ereceipts_' + patientId, JSON.stringify(data.ereceipts));
                
                alert('Hasta verileri başarıyla içe aktarıldı');
                location.reload(); // Refresh to show imported data
            }
        } catch (error) {
            alert('Dosya okuma hatası: ' + error.message);
        }
    };
    
    reader.readAsText(file);
}

// Printing functions
function printPatientSummary() {
    const printWindow = window.open('', '_blank');
    const urlParams = new URLSearchParams(window.location.search);
    const patientId = urlParams.get('patient') || urlParams.get('id');
    
    const appointments = JSON.parse(localStorage.getItem('appointments_' + patientId) || '[]');
    const sales = JSON.parse(localStorage.getItem('sales_' + patientId) || '[]');
    const activities = JSON.parse(localStorage.getItem('activities_' + patientId) || '[]');
    
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Hasta Özeti - ${patientId}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .section { margin-bottom: 20px; }
                .section h3 { border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                @media print { .no-print { display: none; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Hasta Detay Özeti</h1>
                <p>Hasta ID: ${patientId}</p>
                <p>Yazdırma Tarihi: ${new Date().toLocaleDateString('tr-TR')}</p>
            </div>
            
            <div class="section">
                <h3>Randevular (${appointments.length})</h3>
                ${appointments.length > 0 ? `
                    <table>
                        <tr><th>Tarih</th><th>Saat</th><th>Açıklama</th><th>Durum</th></tr>
                        ${appointments.slice(-10).map(apt => `
                            <tr>
                                <td>${apt.date}</td>
                                <td>${apt.time}</td>
                                <td>${apt.description}</td>
                                <td>${apt.status}</td>
                            </tr>
                        `).join('')}
                    </table>
                ` : '<p>Randevu bulunmuyor</p>'}
            </div>
            
            <div class="section">
                <h3>Satışlar (${sales.length})</h3>
                ${sales.length > 0 ? `
                    <table>
                        <tr><th>Tarih</th><th>Ürün</th><th>Fiyat</th><th>Ödeme</th></tr>
                        ${sales.slice(-10).map(sale => `
                            <tr>
                                <td>${sale.date}</td>
                                <td>${sale.product}</td>
                                <td>₺${sale.price}</td>
                                <td>${sale.paymentMethod}</td>
                            </tr>
                        `).join('')}
                    </table>
                ` : '<p>Satış bulunmuyor</p>'}
            </div>
            
            <div class="section">
                <h3>Son Aktiviteler (${activities.length})</h3>
                ${activities.length > 0 ? `
                    <table>
                        <tr><th>Tarih</th><th>Tür</th><th>Başlık</th><th>Açıklama</th></tr>
                        ${activities.slice(-15).map(activity => `
                            <tr>
                                <td>${new Date(activity.date).toLocaleDateString('tr-TR')}</td>
                                <td>${activity.type}</td>
                                <td>${activity.title}</td>
                                <td>${activity.description}</td>
                            </tr>
                        `).join('')}
                    </table>
                ` : '<p>Aktivite bulunmuyor</p>'}
            </div>
            
            <div class="no-print" style="margin-top: 30px; text-align: center;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #007cba; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Yazdır
                </button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                    Kapat
                </button>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// Quick actions
function quickCall() {
    // Log call to timeline
    if (window.addTimelineEvent) {
        window.addTimelineEvent('call', {
            description: 'Hızlı arama yapıldı'
        });
    }
    
    alert('Telefon görüşmesi başlatılacak');
}

function quickNote() {
    const note = prompt('Hızlı not:');
    if (note) {
        // Log quick note to timeline
        if (window.addTimelineEvent) {
            window.addTimelineEvent('note', {
                content: note,
                type: 'quick_note',
                author: 'Kullanıcı'
            });
        }
        
        alert('Not kaydedildi');
    }
}

function quickReminder() {
    const reminder = prompt('Hatırlatma notu:');
    if (reminder) {
        // Log reminder to timeline
        if (window.addTimelineEvent) {
            window.addTimelineEvent('reminder', {
                content: reminder,
                author: 'Kullanıcı'
            });
        }
        
        alert('Hatırlatma kaydedildi');
    }
}

// Patient Lifecycle Management Modal Functions

function showLabelUpdateModal(patientId, currentLabel) {
    const labels = window.patientLifecycleManager?.patientLabels || [];
    
    const modalHtml = `
        <div id="labelUpdateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Hasta Durumunu Güncelle</h3>
                    <button onclick="closeModal('labelUpdateModal')" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <form onsubmit="updatePatientLabel(event, '${patientId}')">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Yeni Durum</label>
                            <select id="newLabel" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                ${labels.map(label => `
                                    <option value="${label.id}" ${label.id === currentLabel ? 'selected' : ''} style="color: ${label.color}">
                                        ${label.label}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Not (İsteğe bağlı)</label>
                            <textarea id="labelNotes" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Durum değişikliği hakkında not..."></textarea>
                        </div>
                    </div>
                    
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                            Güncelle
                        </button>
                        <button type="button" onclick="closeModal('labelUpdateModal')" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400">
                            İptal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function showSGKUpdateModal(patientId) {
    const patient = window.patientLifecycleManager?.getPatient(patientId);
    const sgkInfo = patient?.sgkInfo || {};
    
    const modalHtml = `
        <div id="sgkUpdateModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-lg">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">SGK Bilgilerini Güncelle</h3>
                    <button onclick="closeModal('sgkUpdateModal')" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                    <p class="text-sm text-blue-800">
                        <strong>Hatırlatma:</strong> Cihaz hakkı 5 yılda bir, pil hakkı yılda bir yenilenir. 
                        Son alma tarihlerini doğru giriniz.
                    </p>
                </div>
                
                <form onsubmit="updateSGKInfo(event, '${patientId}')">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Son Cihaz Alma Tarihi</label>
                            <input type="date" id="lastDeviceDate" value="${sgkInfo.lastDeviceDate ? sgkInfo.lastDeviceDate.split('T')[0] : ''}" 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Son Pil Alma Tarihi</label>
                            <input type="date" id="lastBatteryDate" value="${sgkInfo.lastBatteryDate ? sgkInfo.lastBatteryDate.split('T')[0] : ''}" 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">SGK Sicil No</label>
                            <input type="text" id="sgkSicilNo" value="${sgkInfo.sicilNo || ''}" 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="SGK sicil numarası">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Bağlı Olduğu Kurum</label>
                            <input type="text" id="sgkKurum" value="${sgkInfo.kurum || ''}" 
                                   class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Bağlı olduğu kurum">
                        </div>
                    </div>
                    
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">
                            Kaydet
                        </button>
                        <button type="button" onclick="closeModal('sgkUpdateModal')" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400">
                            İptal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function showDeviceAddModal(patientId) {
    const modalHtml = `
        <div id="deviceAddModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-lg">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Cihaz Ekle</h3>
                    <button onclick="closeModal('deviceAddModal')" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <form onsubmit="addDeviceToPatient(event, '${patientId}')">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Cihaz Türü</label>
                            <select id="deviceType" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                <option value="">Seçiniz...</option>
                                <option value="bte">BTE (Kulak Arkası)</option>
                                <option value="ite">ITE (Kulak İçi)</option>
                                <option value="ric">RIC (Alıcı Kulak İçi)</option>
                                <option value="cic">CIC (Tamamen Kulak İçi)</option>
                                <option value="iic">IIC (Görünmez Kulak İçi)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Cihaz Modeli</label>
                            <input type="text" id="deviceModel" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required placeholder="Cihaz model adı">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Yön</label>
                            <select id="deviceDirection" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                <option value="">Seçiniz...</option>
                                <option value="left">Sol</option>
                                <option value="right">Sağ</option>
                                <option value="bilateral">Bilateral</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Fiyat (₺)</label>
                            <input type="number" id="devicePrice" step="0.01" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Adet</label>
                            <select id="deviceCount" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                <option value="1">1 Adet</option>
                                <option value="2">2 Adet</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Seri No</label>
                            <input type="text" id="deviceSerial" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Cihaz seri numarası">
                        </div>
                    </div>
                    
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
                            Cihaz Ekle
                        </button>
                        <button type="button" onclick="closeModal('deviceAddModal')" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400">
                            İptal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openPatientEditModal(patientId) {
    const patient = window.patientLifecycleManager?.getPatient(patientId);
    if (!patient) {
        alert('Hasta bilgileri bulunamadı');
        return;
    }
    
    const modalHtml = `
        <div id="patientEditModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Hasta Bilgilerini Düzenle</h3>
                    <button onclick="closeModal('patientEditModal')" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <form onsubmit="updatePatientInfo(event, '${patientId}')">
                    <div class="space-y-4">
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Ad</label>
                                <input type="text" id="editName" value="${patient.name || ''}" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
                                <input type="text" id="editSurname" value="${patient.surname || ''}" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">TC Kimlik No</label>
                            <input type="text" id="editTcNo" value="${patient.tcNo || ''}" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="11 haneli TC kimlik numarası">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                            <input type="tel" id="editPhone" value="${patient.phone || ''}" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0555 123 45 67">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
                            <input type="email" id="editEmail" value="${patient.email || ''}" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="ornek@email.com">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                            <textarea id="editAddress" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Tam adres bilgisi">${patient.address || ''}</textarea>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Doğum Tarihi</label>
                            <input type="date" id="editBirthDate" value="${patient.birthDate ? patient.birthDate.split('T')[0] : ''}" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                    </div>
                    
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                            Güncelle
                        </button>
                        <button type="button" onclick="closeModal('patientEditModal')" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400">
                            İptal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Event handlers for modal forms
function updatePatientLabel(event, patientId) {
    event.preventDefault();
    
    const newLabel = document.getElementById('newLabel').value;
    const notes = document.getElementById('labelNotes').value;
    
    if (window.patientLifecycleManager?.updatePatientLabel(patientId, newLabel, notes)) {
        closeModal('labelUpdateModal');
        // Tell the global patient list manager to update and re-render without a full reload
        if (window.patientManager && typeof window.patientManager.updatePatientLabel === 'function') {
            window.patientManager.updatePatientLabel(patientId, newLabel);
            window.patientManager.applyFilters();
            window.patientManager.renderPatients();
        } else {
            // Fallback to a full reload if the global manager isn't available
            location.reload();
        }
        
        // Provide feedback
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast('Hasta durumu güncellendi', 'success');
        } else {
            alert('Hasta durumu güncellendi');
        }
    } else {
        alert('Hasta durumu güncellenirken hata oluştu');
    }
}

function updateSGKInfo(event, patientId) {
    event.preventDefault();
    
    const sgkData = {
        lastDeviceDate: document.getElementById('lastDeviceDate').value,
        lastBatteryDate: document.getElementById('lastBatteryDate').value,
        sicilNo: document.getElementById('sgkSicilNo').value,
        kurum: document.getElementById('sgkKurum').value
    };
    
    if (window.patientLifecycleManager?.updateSGKInfo(patientId, sgkData)) {
        closeModal('sgkUpdateModal');
        alert('SGK bilgileri güncellendi');
        
        // Refresh the documents tab to show updated SGK status
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab && activeTab.textContent.includes('Belgeler')) {
            window.tabNavigation?.loadTabContent('documents');
        }
    } else {
        alert('SGK bilgileri güncellenirken hata oluştu');
    }
}

function addDeviceToPatient(event, patientId) {
    event.preventDefault();
    
    const deviceData = {
        type: document.getElementById('deviceType').value,
        name: document.getElementById('deviceModel').value,
        direction: document.getElementById('deviceDirection').value,
        price: parseFloat(document.getElementById('devicePrice').value),
        count: parseInt(document.getElementById('deviceCount').value),
        serialNumber: document.getElementById('deviceSerial').value
    };
    
    const result = window.patientLifecycleManager?.addDeviceToPatient(patientId, deviceData);
    
    if (result.success) {
        // Log device addition to timeline
        if (window.addTimelineEvent) {
            window.addTimelineEvent('device_assigned', {
                deviceType: deviceData.type,
                deviceName: deviceData.name,
                direction: deviceData.direction,
                price: deviceData.price,
                count: deviceData.count,
                serialNumber: deviceData.serialNumber
            });
        }
        
        closeModal('deviceAddModal');
        alert('Cihaz başarıyla eklendi');
        
        // Refresh relevant tabs
        location.reload();
    } else {
        alert('Hata: ' + result.error);
    }
}

function updatePatientInfo(event, patientId) {
    event.preventDefault();
    
    const patient = window.patientLifecycleManager?.getPatient(patientId);
    if (!patient) {
        alert('Hasta bulunamadı');
        return;
    }
    
    // Update patient data
    patient.name = document.getElementById('editName').value;
    patient.surname = document.getElementById('editSurname').value;
    patient.tcNo = document.getElementById('editTcNo').value;
    patient.phone = document.getElementById('editPhone').value;
    patient.email = document.getElementById('editEmail').value;
    patient.address = document.getElementById('editAddress').value;
    patient.birthDate = document.getElementById('editBirthDate').value;
    patient.updatedAt = new Date().toISOString();
    
    // Log profile update to timeline
    if (window.addTimelineEvent) {
        window.addTimelineEvent('profile_update', {
            updatedFields: ['name', 'surname', 'tcNo', 'phone', 'email', 'address', 'birthDate']
        });
    }
    
    // Save via lifecycle manager first
    window.patientLifecycleManager?.savePatient(patient);
    
    // Also persist through the main patient manager so the list updates in-place
    if (window.patientManager && typeof window.patientManager.saveUpdatedPatientToStorage === 'function') {
        window.patientManager.saveUpdatedPatientToStorage(patient);
        window.patientManager.applyFilters();
        window.patientManager.renderPatients();
    }
    
    closeModal('patientEditModal');
    if (typeof Utils !== 'undefined' && Utils.showToast) {
        Utils.showToast('Hasta bilgileri güncellendi', 'success');
    } else {
        alert('Hasta bilgileri güncellendi');
    }
}

// Notes Management Functions
function showAddNoteModal(patientId) {
    const modalHtml = `
        <div id="addNoteModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-lg">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Detaylı Not Ekle</h3>
                    <button onclick="closeModal('addNoteModal')" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <form onsubmit="addDetailedNote(event, '${patientId}')">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Not Türü</label>
                            <select id="detailedNoteType" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                <option value="call">Telefon Görüşmesi</option>
                                <option value="visit">Ziyaret</option>
                                <option value="general">Genel Not</option>
                                <option value="complaint">Şikayet</option>
                                <option value="feedback">Geri Bildirim</option>
                                <option value="maintenance">Bakım/Onarım</option>
                                <option value="follow_up">Takip</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Başlık</label>
                            <input type="text" id="noteTitle" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Not başlığı" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Detaylı Açıklama</label>
                            <textarea id="detailedNoteText" rows="5" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Detaylı not içeriğini buraya yazın..." required></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Tarih/Saat</label>
                            <input type="datetime-local" id="noteDateTime" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                        </div>
                    </div>
                    
                    <div class="flex gap-3 mt-6">
                        <button type="submit" class="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
                            Notu Kaydet
                        </button>
                        <button type="button" onclick="closeModal('addNoteModal')" class="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400">
                            İptal
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Set default datetime to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('noteDateTime').value = now.toISOString().slice(0, 16);
}

function addQuickNote(event, patientId) {
    event.preventDefault();
    
    const noteType = document.getElementById('quickNoteType').value;
    const noteText = document.getElementById('quickNoteText').value;
    
    if (!noteText.trim()) {
        alert('Lütfen not içeriğini girin');
        return;
    }
    
    const result = window.patientLifecycleManager?.addPatientNote(patientId, noteText, noteType);
    
    if (result) {
        // Log note addition to timeline
        if (window.addTimelineEvent) {
            window.addTimelineEvent('note', {
                content: noteText,
                type: noteType,
                author: 'Kullanıcı'
            });
        }
        
        // Clear form
        document.getElementById('quickNoteText').value = '';
        
        // Refresh notes content
        window.tabNavigation?.loadTabContent('notes');
        
        alert('Not başarıyla eklendi');
    } else {
        alert('Not eklenirken hata oluştu');
    }
}

function addDetailedNote(event, patientId) {
    event.preventDefault();
    
    const noteType = document.getElementById('detailedNoteType').value;
    const noteTitle = document.getElementById('noteTitle').value;
    const noteText = document.getElementById('detailedNoteText').value;
    const noteDateTime = document.getElementById('noteDateTime').value;
    
    if (!noteText.trim()) {
        alert('Lütfen not içeriğini girin');
        return;
    }
    
    const fullNote = `${noteTitle}\n\n${noteText}`;
    const result = window.patientLifecycleManager?.addPatientNote(patientId, fullNote, noteType);
    
    if (result) {
        // Log detailed note addition to timeline
        if (window.addTimelineEvent) {
            window.addTimelineEvent('note', {
                title: noteTitle,
                content: noteText,
                type: noteType,
                author: 'Kullanıcı'
            });
        }
        
        // Update the note timestamp if different from current time
        const patient = window.patientLifecycleManager.getPatient(patientId);
        if (patient && patient.notes.length > 0) {
            const lastNote = patient.notes[patient.notes.length - 1];
            lastNote.date = new Date(noteDateTime).toISOString();
            window.patientLifecycleManager.savePatient(patient);
        }
        
        closeModal('addNoteModal');
        
        // Refresh notes content
        window.tabNavigation?.loadTabContent('notes');
        
        alert('Not başarıyla eklendi');
    } else {
        alert('Not eklenirken hata oluştu');
    }
}

function deleteNote(noteId, patientId) {
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) {
        return;
    }
    
    const patient = window.patientLifecycleManager?.getPatient(patientId);
    if (!patient) {
        alert('Hasta bulunamadı');
        return;
    }
    
    // Remove note from array
    patient.notes = patient.notes.filter(note => note.id !== noteId);
    patient.updatedAt = new Date().toISOString();
    
    // Log note deletion to timeline
    if (window.addTimelineEvent) {
        window.addTimelineEvent('note_deleted', {
            noteId: noteId
        });
    }
    
    window.patientLifecycleManager?.savePatient(patient);
    
    // Refresh notes content
    window.tabNavigation?.loadTabContent('notes');
    
    alert('Not silindi');
}

// Device Management Functions
function editDevice(deviceId) {
    alert('Cihaz düzenleme modalı açılacak: ' + deviceId);
    // TODO: Implement device editing modal
}

function removeDevice(deviceId, patientId) {
    if (!confirm('Bu cihazı kaldırmak istediğinizden emin misiniz?')) {
        return;
    }
    
    const patient = window.patientLifecycleManager?.getPatient(patientId);
    if (!patient) {
        alert('Hasta bulunamadı');
        return;
    }
    
    // Find and remove device
    const deviceIndex = patient.devices.findIndex(device => device.id === deviceId);
    if (deviceIndex === -1) {
        alert('Cihaz bulunamadı');
        return;
    }
    
    const removedDevice = patient.devices[deviceIndex];
    patient.devices.splice(deviceIndex, 1);
    patient.updatedAt = new Date().toISOString();
    
    // Log device removal to timeline
    if (window.addTimelineEvent) {
        window.addTimelineEvent('device_removed', {
            deviceName: removedDevice.name,
            deviceType: removedDevice.type,
            direction: removedDevice.direction,
            serialNumber: removedDevice.serialNumber
        });
    }
    
    // If no devices left, update patient label if they are control patient
    if (patient.devices.length === 0 && patient.currentLabel === 'kontrol_hastasi') {
        window.patientLifecycleManager?.updatePatientLabel(patientId, 'satin_aldi', 'Tüm cihazlar kaldırıldı');
    }
    
    window.patientLifecycleManager?.savePatient(patient);
    
    // Refresh devices content
    window.tabNavigation?.loadTabContent('devices');
    
    alert('Cihaz kaldırıldı');
}

// Enhanced patient creation with lifecycle management
function createPatientWithLifecycle(patientData) {
    const patient = window.patientLifecycleManager?.createPatient(patientData);
    
    if (patient) {
        // Open patient details page
        const url = `patient-details.html?patient=${patient.id}`;
        window.location.href = url;
        return true;
    }
    
    return false;
}

// Label management for acquisition types (can be called from settings)
function updateAcquisitionTypes(newTypes) {
    localStorage.setItem('acquisitionTypes', JSON.stringify(newTypes));
    window.patientLifecycleManager.acquisitionTypes = newTypes;
}

function updatePatientLabels(newLabels) {
    localStorage.setItem('patientLabels', JSON.stringify(newLabels));
    window.patientLifecycleManager.patientLabels = newLabels;
}
