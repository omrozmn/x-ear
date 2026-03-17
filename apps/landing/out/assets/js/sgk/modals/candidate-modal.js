// SGK Candidate Selection Modal
// Exposes window.SGKModals.openCandidateModal(manager, doc)
(function () {
    window.SGKModals = window.SGKModals || {};

    window.SGKModals.openCandidateModal = function (manager, doc) {
        if (!doc) return null;
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';

        const candidates = Array.isArray(doc.candidates) ? doc.candidates : (doc.matched_patient ? [doc.matched_patient] : []);

        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Hasta Adayları</h3>
                    <button class="sgk-modal-close text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <div class="space-y-3" id="sgkCandidateList">
                    ${candidates.length === 0 ? '<p class="text-sm text-gray-600">Hiç aday bulunamadı</p>' : ''}
                </div>
                <div class="mt-4 text-right">
                    <button class="sgk-modal-cancel px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">Kapat</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const listEl = modal.querySelector('#sgkCandidateList');
        candidates.forEach(candidate => {
            const item = document.createElement('div');
            item.className = 'border rounded p-3 flex justify-between items-center';
            item.innerHTML = `
                <div>
                    <div class="font-medium">${candidate.name || candidate.fullName || candidate.displayName || (candidate.firstName ? candidate.firstName + ' ' + (candidate.lastName || '') : 'Bilinmeyen')}</div>
                    <div class="text-sm text-gray-600">TC: ${candidate.tcMask || candidate.tc || '—'} · Olasılık: ${candidate.score ? Math.round(candidate.score*100) + '%' : '—'}</div>
                </div>
                <div>
                    <button class="sgk-assign-btn px-3 py-1 bg-green-600 text-white rounded-md">Eşleştir</button>
                </div>
            `;
            const assignBtn = item.querySelector('.sgk-assign-btn');
            assignBtn.addEventListener('click', async () => {
                try {
                    // Call manager to assign
                    if (manager && typeof manager.assignExistingDocument === 'function') {
                        await manager.assignExistingDocument(doc.id, candidate.id || candidate.patientId || candidate.id);
                        modal.remove();
                        manager.showToast('Belge seçilen hasta ile ilişkilendirildi', 'success');
                    } else if (window.sgkManagement && typeof window.sgkManagement.assignExistingDocument === 'function') {
                        await window.sgkManagement.assignExistingDocument(doc.id, candidate.id || candidate.patientId || candidate.id);
                        modal.remove();
                        window.sgkManagement.showToast('Belge seçilen hasta ile ilişkilendirildi', 'success');
                    } else {
                        console.warn('No manager method to assign existing document');
                    }
                } catch (err) {
                    console.error('Failed to assign document to candidate:', err);
                }
            });
            listEl.appendChild(item);
        });

        modal.querySelectorAll('.sgk-modal-close, .sgk-modal-cancel').forEach(b => b.addEventListener('click', () => modal.remove()));

        return modal;
    };
})();
