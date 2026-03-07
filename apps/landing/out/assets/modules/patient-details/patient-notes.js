class PatientNotesComponent {
    constructor(apiClient) {
        this.apiClient = apiClient;
    }

    openAddNoteModal() {
        const modalHtml = `
            <div id="add-note-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div class="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-semibold">Hasta Notu Ekle</h3>
                        <button onclick="closeAddNoteModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <form id="add-note-form" onsubmit="savePatientNote(event)" class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Not Türü</label>
                            <select name="noteType" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">Seçiniz</option>
                                <option value="genel">Genel Not</option>
                                <option value="randevu">Randevu Notu</option>
                                <option value="tedavi">Tedavi Notu</option>
                                <option value="odeme">Ödeme Notu</option>
                                <option value="cihaz">Cihaz Notu</option>
                                <option value="sgk">SGK Notu</option>
                                <option value="sikayet">Şikayet</option>
                                <option value="takip">Takip Notu</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Öncelik</label>
                            <select name="priority" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="normal">Normal</option>
                                <option value="yuksek">Yüksek</option>
                                <option value="acil">Acil</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Not İçeriği *</label>
                            <textarea name="noteContent" required rows="4" placeholder="Not içeriğini buraya yazın..." class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Hatırlatma Tarihi</label>
                            <input type="text" name="reminderDate" class="modern-date-input w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" name="isPrivate" id="isPrivate" class="mr-2">
                            <label for="isPrivate" class="text-sm text-gray-700">Özel not (sadece ben görebilirim)</label>
                        </div>
                        <div class="flex justify-end space-x-3 pt-4">
                            <button type="button" onclick="closeAddNoteModal()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">
                                İptal
                            </button>
                            <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                Kaydet
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async savePatientNote(formData, patientId) {
        try {
            const noteData = {
                id: Date.now().toString(),
                type: formData.get('noteType'),
                priority: formData.get('priority') || 'normal',
                content: formData.get('noteContent'),
                reminderDate: formData.get('reminderDate') || null,
                isPrivate: formData.get('isPrivate') === 'on',
                createdAt: new Date().toISOString(),
                createdBy: 'current_user', // In a real app, this would be the logged-in user
                status: 'active'
            };

            // Prefer backend persistence when APIConfig available
            if (typeof window !== 'undefined' && window.APIConfig && typeof window.APIConfig.makeRequest === 'function') {
                try {
                    const endpoint = `${window.APIConfig.endpoints.patients}/${patientId}/notes`;
                    const payload = {
                        type: noteData.type,
                        priority: noteData.priority,
                        content: noteData.content,
                        reminderDate: noteData.reminderDate,
                        isPrivate: noteData.isPrivate,
                        createdBy: noteData.createdBy,
                        tags: []
                    };

                    const resp = await window.APIConfig.makeRequest(endpoint, 'POST', payload);
                    const saved = resp && (resp.data || resp) ? (resp.data || resp) : null;
                    if (saved && saved.id) {
                        // Merge saved note into localStorage for UI consistency
                        const patients = JSON.parse(localStorage.getItem('xear_patients') || '[]');
                        const patientIndex = patients.findIndex(p => p.id === patientId);
                        if (patientIndex !== -1) {
                            if (!patients[patientIndex].notes) patients[patientIndex].notes = [];
                            // Convert server note to legacy shape if needed
                            const serverNote = Object.assign({}, noteData, { id: saved.id, createdAt: saved.created_at || saved.createdAt || noteData.createdAt, createdBy: saved.author_id || saved.createdBy || noteData.createdBy });
                            patients[patientIndex].notes.unshift(serverNote);
                            try { localStorage.setItem('xear_patients', JSON.stringify(patients)); } catch(e){ console.warn('persist notes failed', e); }
                            try { localStorage.setItem('xear_patients_data', JSON.stringify(patients)); } catch(e){}
                            try { localStorage.setItem(window.STORAGE_KEYS?.CRM_PATIENTS || 'xear_crm_patients', JSON.stringify(patients)); } catch(e){}

                            if (window.currentPatientData && window.currentPatientData.id === patientId) {
                                window.currentPatientData.notes = patients[patientIndex].notes;
                            }

                            this.showToast('Not başarıyla eklendi', 'success');

                            // Dispatch events so other components (patient list) can react
                            try { window.dispatchEvent(new CustomEvent('patient:updated', { detail: { id: patientId } })); } catch(e){}
                            try { window.dispatchEvent(new CustomEvent('patient:note:created', { detail: { patientId, note: serverNote } })); } catch(e){}

                            return serverNote;
                        }
                    }

                    // If API returns unexpected shape, fall back to local behavior below
                } catch (apiErr) {
                    console.warn('API note create failed, falling back to localStorage:', apiErr);
                    // If 401, bubble up so global handler can react
                    if (apiErr && apiErr.status === 401) throw apiErr;
                    // otherwise continue to local fallback
                }
            }

            // LocalStorage fallback (offline / API not available)
            const patients = JSON.parse(localStorage.getItem('xear_patients') || '[]');
            const patientIndex = patients.findIndex(p => p.id === patientId);

            if (patientIndex !== -1) {
                if (!patients[patientIndex].notes) {
                    patients[patientIndex].notes = [];
                }
                patients[patientIndex].notes.unshift(noteData); // Add to beginning
                localStorage.setItem('xear_patients', JSON.stringify(patients));

                // Update current patient data if available
                if (window.currentPatientData && window.currentPatientData.id === patientId) {
                    window.currentPatientData.notes = patients[patientIndex].notes;
                }

                this.showToast('Not başarıyla eklendi (local)', 'success');

                // Dispatch local event so UI updates immediately
                try { window.dispatchEvent(new CustomEvent('patient:updated', { detail: { id: patientId } })); } catch(e){}
                try { window.dispatchEvent(new CustomEvent('patient:note:created', { detail: { patientId, note: noteData } })); } catch(e){}

                return noteData;
            } else {
                throw new Error('Hasta bulunamadı');
            }
        } catch (error) {
            console.error('Error saving patient note:', error);
            this.showToast('Not eklenirken hata oluştu: ' + error.message, 'error');
            throw error;
        }
    }

    getNoteTypeDisplay(type) {
        const types = {
            'genel': 'Genel',
            'randevu': 'Randevu',
            'tedavi': 'Tedavi',
            'odeme': 'Ödeme',
            'cihaz': 'Cihaz',
            'sgk': 'SGK',
            'sikayet': 'Şikayet',
            'takip': 'Takip'
        };
        return types[type] || type;
    }

    getPriorityClass(priority) {
        switch (priority) {
            case 'acil':
                return 'bg-red-100 text-red-800';
            case 'yuksek':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }

    async loadAndRenderNotes(containerId, patientId) {
        try {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Load notes from localStorage like legacy system
            const patients = JSON.parse(localStorage.getItem('xear_patients') || '[]');
            const patient = patients.find(p => p.id === patientId);
            const notes = patient ? (patient.notes || []) : [];

            // Render the notes
            container.innerHTML = this.renderNotesList(notes);
        } catch (error) {
            console.error('Error loading notes:', error);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-8 text-red-500">
                        <p>Notlar yüklenirken hata oluştu.</p>
                        <button onclick="window.patientNotes.loadAndRenderNotes('${containerId}', '${patientId}')" class="text-blue-600 hover:text-blue-800 font-medium">Tekrar Dene</button>
                    </div>
                `;
            }
        }
    }

    renderNotesList(notes) {
        if (!notes || notes.length === 0) {
            return `
                <div class="text-center py-8 text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p>Henüz not eklenmemiş</p>
                </div>
            `;
        }

        return notes.map(note => `
            <div class="bg-white border border-gray-200 rounded-lg p-4 mb-3">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-2">
                        <span class="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            ${this.getNoteTypeDisplay(note.type)}
                        </span>
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${this.getPriorityClass(note.priority)}">
                            ${note.priority === 'acil' ? 'Acil' : note.priority === 'yuksek' ? 'Yüksek' : 'Normal'}
                        </span>
                        ${note.isPrivate ? '<span class="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Özel</span>' : ''}
                    </div>
                    <div class="text-xs text-gray-500">
                        ${new Date(note.createdAt).toLocaleDateString('tr-TR')} ${new Date(note.createdAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                    </div>
                </div>
                <p class="text-gray-700 mb-2">${note.content}</p>
                ${note.reminderDate ? `
                    <div class="flex items-center text-sm text-orange-600 mt-2">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        Hatırlatma: ${new Date(note.reminderDate).toLocaleDateString('tr-TR')} ${new Date(note.reminderDate).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                    </div>
                ` : ''}
                <div class="text-xs text-gray-500 mt-2">
                    Ekleyen: ${note.createdBy}
                </div>
            </div>
        `).join('');
    }

    showToast(message, type = 'info') {
        const toastHtml = `
            <div id="toast" class="fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-white ${
                type === 'success' ? 'bg-green-500' :
                type === 'error' ? 'bg-red-500' :
                'bg-blue-500'
            } shadow-lg transform transition-transform duration-300 translate-x-full">
                ${message}
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', toastHtml);
        
        const toast = document.getElementById('toast');
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}

// Global functions for note management
window.addPatientNote = function() {
    if (window.patientNotes) {
        window.patientNotes.openAddNoteModal();
    }
};

window.closeAddNoteModal = function() {
    const modal = document.getElementById('add-note-modal');
    if (modal) {
        modal.remove();
    }
};

window.savePatientNote = async function(event) {
    event.preventDefault();
    if (window.patientNotes && window.currentPatientData) {
        const formData = new FormData(event.target);
        await window.patientNotes.savePatientNote(formData, window.currentPatientData.id);
        window.closeAddNoteModal();
        
        // Refresh the current tab if it's showing notes or timeline
        if (window.patientTabContentComponent && 
            (window.patientTabContentComponent.activeTab === 'timeline' || 
             window.patientTabContentComponent.activeTab === 'general')) {
            // Reload patient data to get fresh notes
            if (window.apiClient) {
                try {
                    const freshPatientData = await window.apiClient.getPatient(window.currentPatientData.id);
                    window.currentPatientData = freshPatientData;
                    const content = await window.patientTabContentComponent.render(window.currentPatientData);
                    document.getElementById('tab-content').innerHTML = content;
                } catch (error) {
                    console.error('Error refreshing patient data:', error);
                }
            }
        }
    }
};

// Initialize general tab functionality (loads notes)
window.initializeGeneralTab = function(patientData) {
    if (window.patientNotes && patientData && patientData.id) {
        window.patientNotes.loadAndRenderNotes('quickNotes', patientData.id);
    }
};