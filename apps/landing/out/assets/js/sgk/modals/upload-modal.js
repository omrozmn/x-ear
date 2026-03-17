// SGK Upload Modal helper
// Exposes window.SGKModals.openUploadModal(manager)
(function () {
    window.SGKModals = window.SGKModals || {};

    window.SGKModals.openUploadModal = function (manager) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">SGK Belgesi Yükle</h3>
                    <button class="sgk-modal-close text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <form id="sgkUploadForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Belge Türü</label>
                        <select id="sgkDocType" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="sgk_raporu">SGK Raporu</option>
                            <option value="muayene_raporu">Muayene Raporu</option>
                            <option value="hekim_raporu">Hekim Raporu</option>
                            <option value="cihaz_raporu">Cihaz Raporu</option>
                            <option value="onay_belgesi">Onay Belgesi</option>
                            <option value="fatura">Fatura</option>
                            <option value="e_recete">E-Reçete</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Dosya Seç</label>
                        <input type="file" id="sgkFileInput" accept=".pdf,.jpg,.jpeg,.png" 
                               class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <p class="text-xs text-gray-500 mt-1">PDF, JPG, JPEG, PNG formatları desteklenir</p>
                    </div>
                    
                    <div class="flex justify-end space-x-3 pt-4">
                        <button type="button" class="sgk-modal-cancel px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50">İptal</button>
                        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Yükle</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtns = modal.querySelectorAll('.sgk-modal-close, .sgk-modal-cancel');
        closeBtns.forEach(b => b.addEventListener('click', () => modal.remove()));

        const form = modal.querySelector('#sgkUploadForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                if (manager && typeof manager.handleFileUpload === 'function') {
                    await manager.handleFileUpload(modal);
                } else if (window.sgkManagement && typeof window.sgkManagement.handleFileUpload === 'function') {
                    await window.sgkManagement.handleFileUpload(modal);
                } else {
                    console.warn('No SGK manager found for upload modal');
                    modal.remove();
                }
            } catch (err) {
                console.error('Error during upload modal submission:', err);
                modal.remove();
            }
        });

        return modal;
    };
})();
