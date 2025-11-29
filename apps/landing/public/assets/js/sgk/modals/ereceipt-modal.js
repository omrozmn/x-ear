// SGK E-Receipt Modal
// Exposes window.SGKModals.openEReceiptModal(manager, response, patientId)
(function () {
    window.SGKModals = window.SGKModals || {};

    window.SGKModals.openEReceiptModal = function (manager, response, patientId) {
        if (!response) return null;
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

        const materials = Array.isArray(response.materials) ? response.materials : [];
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-3xl mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">E-Reçete: ${response.receiptNo}</h3>
                    <button class="sgk-modal-close text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                <div class="mb-4 text-sm text-gray-700">
                    <div><strong>Doktor:</strong> ${response.doctorName}</div>
                    <div><strong>Tarih:</strong> ${response.receiptDate}</div>
                    <div><strong>Geçerlilik:</strong> ${response.validUntil}</div>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <label for="sgkGlobalDate" class="text-sm font-medium text-blue-800">Tüm malzemeler için başvuru tarihi:</label>
                            <input type="date" id="sgkGlobalDate" value="${new Date().toISOString().split('T')[0]}" 
                                   max="${new Date().toISOString().split('T')[0]}" class="sgk-ereceipt-date text-sm border border-blue-300 rounded px-2 py-1">
                        </div>
                        <button id="sgkApplyGlobalDate" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs transition-colors">Tarihi Uygula</button>
                    </div>
                </div>

                <div class="space-y-3 mb-4" id="sgkEReceiptMaterials">
                    ${materials.map((material, index) => `
                        <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                            <div class="flex items-center">
                                <input type="checkbox" id="sgk_mat_${index}" data-code="${material.code}" class="mr-3 sgk-material-checkbox rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                <div>
                                    <p class="font-medium text-gray-900">${material.name}</p>
                                    <p class="text-sm text-gray-600">Kod: ${material.code} • ${material.kdv}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="text-sm">
                                    <label for="sgk_date_${index}" class="block text-gray-600 mb-1">Başvuru Tarihi:</label>
                                    <input type="date" id="sgk_date_${index}" value="${new Date().toISOString().split('T')[0]}" max="${new Date().toISOString().split('T')[0]}" class="sgk-ereceipt-date text-sm border border-gray-300 rounded px-2 py-1">
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="flex justify-between items-center">
                    <div class="flex space-x-2">
                        <button id="sgkSelectAll" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm">Hepsini Seç</button>
                        <button id="sgkDeselectAll" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm">Seçimi Temizle</button>
                    </div>
                    <div class="flex space-x-2">
                        <button id="sgkSaveEReceipt" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm">E-Reçete Kaydet</button>
                        <button class="sgk-modal-cancel px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Kapat</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Helpers
        const applyGlobalDate = () => {
            const globalDate = modal.querySelector('#sgkGlobalDate').value;
            modal.querySelectorAll('.sgk-ereceipt-date').forEach(d => d.value = globalDate);
        };
        const selectAll = () => {
            modal.querySelectorAll('.sgk-material-checkbox').forEach(cb => cb.checked = true);
        };
        const deselectAll = () => {
            modal.querySelectorAll('.sgk-material-checkbox').forEach(cb => cb.checked = false);
        };

        modal.querySelector('#sgkApplyGlobalDate').addEventListener('click', applyGlobalDate);
        modal.querySelector('#sgkSelectAll').addEventListener('click', selectAll);
        modal.querySelector('#sgkDeselectAll').addEventListener('click', deselectAll);

        modal.querySelectorAll('.sgk-modal-close, .sgk-modal-cancel').forEach(b => b.addEventListener('click', () => modal.remove()));

        const saveBtn = modal.querySelector('#sgkSaveEReceipt');
        saveBtn.addEventListener('click', async () => {
            const selected = [];
            modal.querySelectorAll('.sgk-material-checkbox').forEach((cb, i) => {
                if (cb.checked) {
                    selected.push({ code: cb.getAttribute('data-code'), date: modal.querySelectorAll('.sgk-ereceipt-date')[i].value });
                }
            });

            if (selected.length === 0) {
                if (manager && typeof manager.showToast === 'function') manager.showToast('Lütfen en az bir malzeme seçin', 'warning');
                else alert('Lütfen en az bir malzeme seçin');
                return;
            }

            const payload = {
                patientId: patientId || (window.currentPatientData && window.currentPatientData.id) || null,
                receiptNo: response.receiptNo,
                date: response.receiptDate,
                doctorName: response.doctorName,
                validUntil: response.validUntil,
                materials: selected
            };

            try {
                if (manager && typeof manager.saveEReceipt === 'function') {
                    await manager.saveEReceipt(payload);
                } else if (window.legacyBridge && typeof window.legacyBridge.saveEReceipt === 'function') {
                    await window.legacyBridge.saveEReceipt(payload);
                } else if (window.saveEReceipt && typeof window.saveEReceipt === 'function') {
                    // Some legacy places expose window.saveEReceipt(receiptNo)
                    await window.saveEReceipt(payload.receiptNo);
                } else {
                    // Fallback: persist locally
                    const key = window.STORAGE_KEYS?.LOCAL_ERECEIPTS || 'xear_local_ereceipts';
                    try {
                        const arr = JSON.parse(localStorage.getItem(key) || '[]');
                        arr.push(payload);
                        localStorage.setItem(key, JSON.stringify(arr));
                        if (manager && typeof manager.showToast === 'function') manager.showToast('E-reçete yerel olarak kaydedildi', 'success');
                    } catch (e) {
                        console.error('Failed saving e-receipt locally', e);
                        if (manager && typeof manager.showToast === 'function') manager.showToast('E-reçete kaydedilemedi', 'error');
                    }
                }
                modal.remove();
                if (manager && typeof manager.loadSavedEReceipts === 'function') manager.loadSavedEReceipts();
            } catch (err) {
                console.error('Failed to save e-receipt', err);
                if (manager && typeof manager.showToast === 'function') manager.showToast('E-reçete kaydetme başarısız', 'error');
            }
        });

        return modal;
    };
})();
