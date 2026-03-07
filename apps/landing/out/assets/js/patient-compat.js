// Compatibility shim: augment any legacy `window.PatientManager` object so pages don't crash
(function() {
    if (!window.PatientManager || typeof window.PatientManager !== 'object') return;
    const pm = window.PatientManager;

    function defineIfMissing(name, fn) { if (!pm[name]) pm[name] = fn; }

    defineIfMissing('calculateStats', function() {
        try {
            const total = (pm.patients || []).length;
            const active = (pm.patients || []).filter(p => p.status === 'active').length;
            const trial = (pm.patients || []).filter(p => p.segment === 'trial').length;
            const pending = (pm.patients || []).filter(p => p.status === 'pending').length;
            return { total, active, trial, pending };
        } catch (err) { console.error('compat calculateStats error', err); return { total:0, active:0, trial:0, pending:0 }; }
    });

    defineIfMissing('getTodayReminders', function() {
        try {
            const appts = window.XEarStorageManager ? window.XEarStorageManager.get('appointments', []) : JSON.parse(localStorage.getItem('appointments') || '[]');
            const today = new Date();
            const s = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
            const e = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
            return (appts || []).filter(a => a && a.reminderDate).filter(a => {
                const r = new Date(a.reminderDate).toISOString();
                return r >= s && r < e;
            }).map(a => ({ id: a.id || '', patientId: a.patientId || a.patient || '', patientName: ((pm.patients||[]).find(p=>p.id===(a.patientId||a.patient))||{}).name||'', date: new Date(a.reminderDate).toLocaleString('tr-TR') }));
        } catch (err) { console.error('compat getTodayReminders error', err); return []; }
    });

    defineIfMissing('renderStats', function() {
        try {
            const container = document.getElementById('statsContainer'); if (!container) return;
            const stats = typeof pm.calculateStats === 'function' ? pm.calculateStats() : { total:0, active:0, trial:0, pending:0 };
            const reminders = typeof pm.getTodayReminders === 'function' ? pm.getTodayReminders() : [];
            container.innerHTML = `<div class="bg-white p-6 rounded-lg">Toplam: ${stats.total} — Hatırlatıcılar: ${reminders.length}</div>`;
        } catch (err) { console.error('compat renderStats error', err); }
    });

    defineIfMissing('handleNewPatient', async function(formEl) {
        try {
            if (!formEl) return false;
            // Clear previous inline errors
            const phoneErrorEl = formEl.querySelector('#phoneError');
            const tcErrorEl = formEl.querySelector('#tcNumberError');
            if (phoneErrorEl) phoneErrorEl.classList.add('hidden');
            if (tcErrorEl) tcErrorEl.classList.add('hidden');

            const formData = new FormData(formEl);
            const firstName = (formData.get('firstName') || '').trim();
            const lastName = (formData.get('lastName') || '').trim();
            const phone = (formData.get('phone') || '').trim();
            const email = (formData.get('email') || '').trim();
            const tcNumber = (formData.get('tcNumber') || '').trim();
            const birthDate = (formData.get('birthDate') || '').trim();
            const acquisitionType = formData.get('acquisitionType') || '';

            // Field validations with clear messages
            if (!firstName) { if (Utils && Utils.showToast) Utils.showToast('Ad alanı boş bırakılamaz', 'error'); return false; }
            if (!lastName) { if (Utils && Utils.showToast) Utils.showToast('Soyad alanı boş bırakılamaz', 'error'); return false; }
            if (!phone) { if (Utils && Utils.showToast) Utils.showToast('Telefon numarası gereklidir', 'error'); if (phoneErrorEl) { phoneErrorEl.textContent = 'Telefon boş olamaz'; phoneErrorEl.classList.remove('hidden'); } return false; }
            if (!(Utils && Utils.validatePhone && Utils.validatePhone(phone))) { if (Utils && Utils.showToast) Utils.showToast('Geçersiz telefon numarası', 'error'); if (phoneErrorEl) { phoneErrorEl.textContent = 'Geçersiz telefon numarası! Örnek: (90)5553332211'; phoneErrorEl.classList.remove('hidden'); } return false; }
            if (tcNumber && !(Utils && Utils.validateTCKN && Utils.validateTCKN(tcNumber))) { if (Utils && Utils.showToast) Utils.showToast('Geçersiz TC Kimlik Numarası', 'error'); if (tcErrorEl) { tcErrorEl.classList.remove('hidden'); } return false; }
            if (email && typeof email === 'string') {
                const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;
                if (!re.test(email)) { if (Utils && Utils.showToast) Utils.showToast('Geçersiz e-posta adresi', 'error'); return false; }
            }

            const newPatient = {
                id: `p_${Date.now()}`,
                firstName,
                lastName,
                name: `${firstName} ${lastName}`.trim(),
                phone,
                email,
                tcNumber,
                birthDate: birthDate || null,
                acquisitionType,
                createdAt: new Date().toISOString()
            };

            // Persist to backend first (API-first) then sync to local storage for legacy compatibility.
            if (window.patientsCreatePatient) {
                // Use Orval generated client
                try {
                    const resp = await window.patientsCreatePatient({ data: newPatient });
                    
                    // Fix: Extract saved patient from the correct nested structure
                    let saved = null;
                    if (resp && resp.success && resp.data && resp.data.data) {
                        // New API format: { success: true, data: { data: {...}, meta: {...} } }
                        saved = resp.data.data;
                    } else if (resp && resp.success && resp.data) {
                        // Legacy format: { success: true, data: {...} }
                        saved = resp.data;
                    } else if (resp && resp.data) {
                        // Fallback: direct data
                        saved = resp.data;
                    } else {
                        // Last resort: use response as is
                        saved = resp;
                    }
                    
                    if (saved && saved.id) {
                        // Sync to local storage for legacy compatibility
                        const existingPatients = JSON.parse(localStorage.getItem('patients') || '[]');
                        existingPatients.push(saved);
                        localStorage.setItem('patients', JSON.stringify(existingPatients));
                        
                        // Update PatientManager if available
                        if (pm.patients) pm.patients.push(saved);
                        
                        return { success: true, patient: saved };
                    }
                } catch (orvalError) {
                    console.warn('Orval client failed, trying APIConfig fallback:', orvalError);
                }
            }
            
            if (window.APIConfig && typeof window.APIConfig.makeRequest === 'function') {
                try {
                    const resp = await window.APIConfig.makeRequest(window.APIConfig.endpoints.patients, 'POST', newPatient);
                    
                    // Fix: Extract saved patient from the correct nested structure
                    let saved = null;
                    if (resp && resp.success && resp.data && resp.data.data) {
                        // New API format: { success: true, data: { data: {...}, meta: {...} } }
                        saved = resp.data.data;
                    } else if (resp && resp.success && resp.data) {
                        // Legacy format: { success: true, data: {...} }
                        saved = resp.data;
                    } else if (resp && resp.data) {
                        // Fallback: direct data
                        saved = resp.data;
                    } else {
                        // Last resort: use response as is
                        saved = resp;
                    }
                    
                    // Ensure id exists on saved record
                    const savedId = (saved && saved.id) ? saved.id : (newPatient.id || `p_${Date.now()}`);
                    // Persist to unified storage locally as a cache for legacy modules
                    try {
                        const cached = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data') || '[]');
                        if (!cached.some(p => p.id === savedId)) {
                            cached.push(Object.assign({}, saved, { id: savedId }));
                            localStorage.setItem(window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data', JSON.stringify(cached));
                        }
                        // Legacy key as well
                        const legacy = JSON.parse(localStorage.getItem('xear_patients') || '[]');
                        if (!legacy.some(p => p.id === savedId)) {
                            legacy.push(Object.assign({}, saved, { id: savedId }));
                            localStorage.setItem('xear_patients', JSON.stringify(legacy));
                        }
                    } catch (e) { console.warn('Failed to persist saved patient to localStorage after API success', e); }

                    if (Utils && Utils.showToast) Utils.showToast('Hasta başarıyla kaydedildi', 'success');
                    if (typeof pm.loadPatients === 'function') await pm.loadPatients();
                    if (typeof pm.renderPatients === 'function') pm.renderPatients();
                    if (typeof pm.renderStats === 'function') pm.renderStats();
                    if (typeof pm.openPatientDetails === 'function') return pm.openPatientDetails(savedId);
                    window.location.href = `patient-details-modular.html?id=${encodeURIComponent(savedId)}`;
                    return true;
                } catch (apiErr) {
                    console.warn('API create patient failed, falling back to local persistence:', apiErr);
                    // fall through to local persistence path below
                }
            }

            // Local persistence fallback when API not available or failed
            try {
                if (window.XEarStorageManager) {
                    const existing = window.XEarStorageManager.get('patients', []);
                    // Avoid duplicate by id
                    if (!existing.some(p => p.id === newPatient.id)) {
                        existing.push(newPatient);
                        window.XEarStorageManager.set('patients', existing);
                    }
                } else {
                    const existing = JSON.parse(localStorage.getItem(window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data') || '[]');
                    if (!existing.some(p => p.id === newPatient.id)) {
                        existing.push(newPatient);
                        localStorage.setItem(window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data', JSON.stringify(existing));
                    }

                    // ALSO write to the legacy key 'xear_patients' to keep older modules compatible
                    try {
                        const legacy = JSON.parse(localStorage.getItem('xear_patients') || '[]');
                        if (!legacy.some(p => p.id === newPatient.id)) {
                            legacy.push(newPatient);
                            localStorage.setItem('xear_patients', JSON.stringify(legacy));
                        }
                    } catch (e) {
                        console.warn('Failed to also persist to xear_patients:', e);
                    }
                }
            } catch (err) {
                console.error('Failed to persist new patient locally:', err);
                if (Utils && Utils.showToast) Utils.showToast('Hasta kaydedilemedi: depolama hatası', 'error');
                return false;
            }

            if (typeof pm.openPatientDetails === 'function') pm.openPatientDetails(newPatient.id);
            else window.location.href = `patient-details-modular.html?id=${encodeURIComponent(newPatient.id)}`;

            return true;
        } catch (err) {
            console.error('handleNewPatient fallback error:', err);
            if (Utils && Utils.showToast) Utils.showToast('Hasta kaydedilemedi', 'error');
            return false;
        }
    });

    // Ensure a global viewPatient helper exists so inline onclick handlers don't fail
    if (typeof window.viewPatient === 'undefined') {
        window.viewPatient = function(patientId) {
            try {
                if (window.patientManager && typeof window.patientManager.openPatientDetails === 'function') {
                    return window.patientManager.openPatientDetails(patientId);
                }
            } catch (e) { /* ignore */ }
            // Fallback navigation
            window.location.href = `patient-details-modular.html?id=${encodeURIComponent(patientId)}`;
        };
    }

    if (typeof window.patientManager === 'undefined') window.patientManager = pm;
})();
