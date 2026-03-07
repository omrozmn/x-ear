/**
 * API Client Wrapper with Optimistic Locking Support
 * Handles 409 conflicts, retry logic, and offline operations
 */

class OptimisticAPIClient {
    constructor() {
        this.pendingUpdates = new Map(); // Track pending updates
        this.conflictHandlers = new Map(); // Custom conflict handlers per endpoint
        this.retryQueue = []; // Queue for failed requests
        this.isOnline = navigator.onLine;
        
        // Listen for online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processPendingUpdates();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * PUT request with optimistic locking
     */
    async putWithOptimisticLock(endpoint, data, options = {}) {
        const requestId = this.generateRequestId();
        
        // If offline, add to outbox
        if (!this.isOnline && window.IndexedDBOutbox) {
            await window.IndexedDBOutbox.addOperation({
                method: 'PUT',
                endpoint,
                data,
                headers: options.headers,
                priority: options.priority || 'normal'
            });
            
            this.showToast('Güncelleme çevrimdışı kuyruğa eklendi', 'info');
            return { success: true, queued: true };
        }
        
        // Track pending update
        this.pendingUpdates.set(requestId, {
            endpoint,
            data,
            timestamp: Date.now(),
            retryCount: 0
        });
        
        this.emitPendingUpdateEvent(endpoint, data, true);
        
        try {
            const response = await this.makeRequest(endpoint, 'PUT', data, options.headers);
            
            // Success - remove from pending
            this.pendingUpdates.delete(requestId);
            this.emitPendingUpdateEvent(endpoint, data, false);
            
            return response;
            
        } catch (error) {
            if (error.status === 409) {
                // Conflict detected
                const conflictData = error.data || {};
                const resolution = await this.handleConflict(endpoint, data, conflictData);
                
                if (resolution.action === 'retry') {
                    // Retry with updated data
                    this.pendingUpdates.delete(requestId);
                    return await this.putWithOptimisticLock(endpoint, resolution.data, options);
                } else if (resolution.action === 'force') {
                    // Force update (ignore version)
                    const forceData = { ...data, _force: true };
                    this.pendingUpdates.delete(requestId);
                    return await this.putWithOptimisticLock(endpoint, forceData, options);
                } else {
                    // User cancelled
                    this.pendingUpdates.delete(requestId);
                    this.emitPendingUpdateEvent(endpoint, data, false);
                    throw new Error('Update cancelled by user');
                }
            } else {
                // Other error - add to outbox if available
                if (window.IndexedDBOutbox) {
                    await window.IndexedDBOutbox.addOperation({
                        method: 'PUT',
                        endpoint,
                        data,
                        headers: options.headers,
                        priority: 'high' // Failed requests get high priority
                    });
                }
                
                this.pendingUpdates.delete(requestId);
                this.emitPendingUpdateEvent(endpoint, data, false);
                throw error;
            }
        }
    }

    /**
     * POST request with optimistic creation
     */
    async postWithOptimistic(endpoint, data, options = {}) {
        const tempId = `temp_${this.generateRequestId()}`;
        const optimisticData = { ...data, id: tempId, isTemporary: true };

        // If offline, add to outbox and return optimistic data
        if (!this.isOnline && window.IndexedDBOutbox) {
            await window.IndexedDBOutbox.addOperation({
                method: 'POST',
                endpoint,
                data,
                headers: options.headers,
                priority: options.priority || 'normal',
                tempId: tempId
            });
            
            this.showToast('Yeni kayıt çevrimdışı kuyruğa eklendi', 'info');
            return { success: true, queued: true, data: optimisticData };
        }

        try {
            const fullUrl = this.buildUrl(endpoint);
            const response = await this.makeRequest(fullUrl, 'POST', data, options.headers);
            // Dispatch success event with tempId and final data
            document.dispatchEvent(new CustomEvent('optimistic-post-success', {
                detail: { tempId, finalData: response.data }
            }));
            return { success: true, data: response.data };
        } catch (error) {
            // If request fails, add to outbox
            if (window.IndexedDBOutbox) {
                await window.IndexedDBOutbox.addOperation({
                    method: 'POST',
                    endpoint,
                    data,
                    headers: options.headers,
                    priority: 'high',
                    tempId: tempId
                });
            }
            // Return optimistic data even on failure, so UI can update
            return { success: false, queued: true, data: optimisticData, error };
        }
    }

    async putWithOptimistic(endpoint, data, options = {}) {
        const optimisticData = { ...data, isOptimistic: true };

        if (!this.isOnline && window.IndexedDBOutbox) {
            await window.IndexedDBOutbox.addOperation({
                method: 'PUT',
                endpoint,
                data,
                headers: options.headers,
                priority: options.priority || 'normal'
            });
            this.showToast('Güncelleme çevrimdışı kuyruğa eklendi', 'info');
            return { success: true, queued: true, data: optimisticData };
        }

        try {
            const fullUrl = this.buildUrl(endpoint);
            const response = await this.makeRequest(fullUrl, 'PUT', data, options.headers);
            return { success: true, data: response.data };
        } catch (error) {
            if (window.IndexedDBOutbox) {
                await window.IndexedDBOutbox.addOperation({
                    method: 'PUT',
                    endpoint,
                    data,
                    headers: options.headers,
                    priority: 'high'
                });
            }
            return { success: false, queued: true, data: optimisticData, error };
        }
    }

    async deleteWithOptimistic(endpoint, data, options = {}) {
        const optimisticData = { ...data, isOptimistic: true };

        if (!this.isOnline && window.IndexedDBOutbox) {
            await window.IndexedDBOutbox.addOperation({
                method: 'DELETE',
                endpoint,
                data,
                headers: options.headers,
                priority: options.priority || 'normal'
            });
            this.showToast('Silme işlemi çevrimdışı kuyruğa eklendi', 'info');
            return { success: true, queued: true, data: optimisticData };
        }

        try {
            const fullUrl = this.buildUrl(endpoint);
            await this.makeRequest(fullUrl, 'DELETE', data, options.headers);
            return { success: true };
        } catch (error) {
            if (window.IndexedDBOutbox) {
                await window.IndexedDBOutbox.addOperation({
                    method: 'DELETE',
                    endpoint,
                    data,
                    headers: options.headers,
                    priority: 'high'
                });
            }
            return { success: false, queued: true, data: optimisticData, error };
        }
    }

    /**
     * Handle 409 conflict responses
     */
    async handleConflict(requestId, endpoint, localData, error, options) {
        const conflictData = error.response?.data || {};
        const serverVersion = conflictData.current_data;
        const conflictDetails = conflictData.conflicts || [];

        // Check for custom conflict handler
        const customHandler = this.conflictHandlers.get(endpoint);
        if (customHandler) {
            return await customHandler(localData, serverVersion, conflictDetails, options);
        }

        // Default conflict handling - show diff modal
        return await this.showConflictModal(requestId, endpoint, localData, serverVersion, conflictDetails, options);
    }

    /**
     * Show conflict resolution modal
     */
    async showConflictModal(requestId, endpoint, localData, serverVersion, conflicts, options) {
        return new Promise((resolve, reject) => {
            const modal = this.createConflictModal(localData, serverVersion, conflicts);
            
            // Handle user choice
            modal.addEventListener('conflict-resolved', async (event) => {
                const { action, mergedData } = event.detail;
                
                try {
                    if (action === 'use-server') {
                        // Use server version
                        this.pendingUpdates.delete(requestId);
                        this.emitPendingUpdateEvent(endpoint, localData, false);
                        resolve({ data: serverVersion, source: 'server' });
                    } else if (action === 'use-local') {
                        // Force update with local data
                        const response = await this.makeRequest(
                            this.buildUrl(endpoint), 
                            'PUT', 
                            { ...localData, force_update: true },
                            options
                        );
                        this.pendingUpdates.delete(requestId);
                        this.emitPendingUpdateEvent(endpoint, localData, false);
                        resolve(response);
                    } else if (action === 'merge') {
                        // Use merged data
                        const response = await this.makeRequest(
                            this.buildUrl(endpoint), 
                            'PUT', 
                            mergedData,
                            options
                        );
                        this.pendingUpdates.delete(requestId);
                        this.emitPendingUpdateEvent(endpoint, localData, false);
                        resolve(response);
                    }
                } catch (retryError) {
                    reject(retryError);
                }
                
                document.body.removeChild(modal);
            });

            modal.addEventListener('conflict-cancelled', () => {
                this.pendingUpdates.delete(requestId);
                this.emitPendingUpdateEvent(endpoint, localData, false);
                document.body.removeChild(modal);
                reject(new Error('Conflict resolution cancelled'));
            });

            document.body.appendChild(modal);
        });
    }

    /**
     * Create conflict resolution modal
     */
    createConflictModal(localData, serverData, conflicts) {
        const modal = document.createElement('div');
        modal.className = 'conflict-modal-overlay';
        modal.innerHTML = `
            <div class="conflict-modal">
                <div class="conflict-header">
                    <h3>🔄 Veri Çakışması Tespit Edildi</h3>
                    <p>Bu kayıt başka bir kullanıcı tarafından değiştirilmiş. Nasıl devam etmek istiyorsunuz?</p>
                </div>
                
                <div class="conflict-content">
                    <div class="conflict-comparison">
                        <div class="local-changes">
                            <h4>Sizin Değişiklikleriniz</h4>
                            <div class="changes-preview" id="local-preview"></div>
                        </div>
                        
                        <div class="server-changes">
                            <h4>Sunucudaki Güncel Veri</h4>
                            <div class="changes-preview" id="server-preview"></div>
                        </div>
                    </div>
                    
                    <div class="conflict-details" id="conflict-details"></div>
                </div>
                
                <div class="conflict-actions">
                    <button class="btn btn-secondary" data-action="use-server">
                        Sunucu Versiyonunu Kullan
                    </button>
                    <button class="btn btn-warning" data-action="use-local">
                        Değişikliklerimi Zorla Kaydet
                    </button>
                    <button class="btn btn-primary" data-action="merge">
                        Manuel Birleştir
                    </button>
                    <button class="btn btn-light" data-action="cancel">
                        İptal
                    </button>
                </div>
            </div>
        `;

        // Populate previews
        this.populateConflictPreview(modal.querySelector('#local-preview'), localData);
        this.populateConflictPreview(modal.querySelector('#server-preview'), serverData);
        this.populateConflictDetails(modal.querySelector('#conflict-details'), conflicts);

        // Add event listeners
        modal.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                
                if (action === 'cancel') {
                    modal.dispatchEvent(new CustomEvent('conflict-cancelled'));
                } else if (action === 'merge') {
                    // Show merge interface
                    this.showMergeInterface(modal, localData, serverData);
                } else {
                    modal.dispatchEvent(new CustomEvent('conflict-resolved', {
                        detail: { action, mergedData: null }
                    }));
                }
            });
        });

        return modal;
    }

    /**
     * Populate conflict preview
     */
    populateConflictPreview(container, data) {
        const preview = document.createElement('pre');
        preview.textContent = JSON.stringify(data, null, 2);
        container.appendChild(preview);
    }

    /**
     * Populate conflict details
     */
    populateConflictDetails(container, conflicts) {
        if (!conflicts.length) {
            container.innerHTML = '<p>Genel veri çakışması tespit edildi.</p>';
            return;
        }

        const list = document.createElement('ul');
        list.className = 'conflict-list';
        
        conflicts.forEach(conflict => {
            const item = document.createElement('li');
            item.innerHTML = `
                <strong>${conflict.field}:</strong> 
                Sizin: "${conflict.local_value}" → 
                Sunucu: "${conflict.server_value}"
            `;
            list.appendChild(item);
        });
        
        container.appendChild(list);
    }

    /**
     * Show merge interface
     */
    showMergeInterface(modal, localData, serverData) {
        const conflictContent = modal.querySelector('.conflict-content');
        
        // Create merge interface
        const mergeInterface = document.createElement('div');
        mergeInterface.className = 'merge-interface';
        mergeInterface.innerHTML = `
            <div class="merge-header">
                <h4>🔀 Manuel Birleştirme</h4>
                <p>Her alan için hangi versiyonu kullanmak istediğinizi seçin:</p>
            </div>
            <div class="merge-fields" id="merge-fields"></div>
            <div class="merge-actions">
                <button class="btn btn-secondary" data-action="back">
                    ← Geri Dön
                </button>
                <button class="btn btn-primary" data-action="confirm-merge">
                    Birleştirmeyi Onayla
                </button>
            </div>
        `;
        
        // Replace content with merge interface
        conflictContent.innerHTML = '';
        conflictContent.appendChild(mergeInterface);
        
        // Populate merge fields
        this.populateMergeFields(mergeInterface.querySelector('#merge-fields'), localData, serverData);
        
        // Add event listeners
        mergeInterface.querySelector('[data-action="back"]').addEventListener('click', () => {
            // Restore original conflict content
            this.restoreConflictContent(modal, localData, serverData);
        });
        
        mergeInterface.querySelector('[data-action="confirm-merge"]').addEventListener('click', () => {
            const mergedData = this.collectMergedData(mergeInterface, localData, serverData);
            modal.dispatchEvent(new CustomEvent('conflict-resolved', {
                detail: { action: 'merge', mergedData }
            }));
        });
    }

    /**
     * Populate merge fields with radio button choices
     */
    populateMergeFields(container, localData, serverData) {
        const allFields = new Set([...Object.keys(localData), ...Object.keys(serverData)]);
        
        allFields.forEach(field => {
            if (field === 'id' || field === 'created_at' || field === 'updated_at') {
                return; // Skip system fields
            }
            
            const localValue = localData[field];
            const serverValue = serverData[field];
            
            // Skip if values are identical
            if (JSON.stringify(localValue) === JSON.stringify(serverValue)) {
                return;
            }
            
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'merge-field';
            fieldDiv.innerHTML = `
                <div class="field-header">
                    <strong>${this.formatFieldName(field)}</strong>
                </div>
                <div class="field-options">
                    <label class="field-option">
                        <input type="radio" name="field_${field}" value="local" checked>
                        <div class="option-content">
                            <span class="option-label">Sizin Versiyonunuz</span>
                            <div class="option-value">${this.formatFieldValue(localValue)}</div>
                        </div>
                    </label>
                    <label class="field-option">
                        <input type="radio" name="field_${field}" value="server">
                        <div class="option-content">
                            <span class="option-label">Sunucu Versiyonu</span>
                            <div class="option-value">${this.formatFieldValue(serverValue)}</div>
                        </div>
                    </label>
                </div>
            `;
            
            container.appendChild(fieldDiv);
        });
    }

    /**
     * Format field name for display
     */
    formatFieldName(field) {
        const fieldNames = {
            'first_name': 'Ad',
            'last_name': 'Soyad',
            'tc_no': 'TC Kimlik No',
            'phone': 'Telefon',
            'email': 'E-posta',
            'address': 'Adres',
            'birth_date': 'Doğum Tarihi',
            'notes': 'Notlar'
        };
        
        return fieldNames[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Format field value for display
     */
    formatFieldValue(value) {
        if (value === null || value === undefined) {
            return '<em>Boş</em>';
        }
        
        if (typeof value === 'string' && value.length > 50) {
            return value.substring(0, 50) + '...';
        }
        
        return String(value);
    }

    /**
     * Collect merged data from form
     */
    collectMergedData(mergeInterface, localData, serverData) {
        const mergedData = { ...localData }; // Start with local data as base
        
        const radioInputs = mergeInterface.querySelectorAll('input[type="radio"]:checked');
        
        radioInputs.forEach(input => {
            const fieldName = input.name.replace('field_', '');
            const choice = input.value;
            
            if (choice === 'server') {
                mergedData[fieldName] = serverData[fieldName];
            }
            // If choice is 'local', we already have it from the base
        });
        
        return mergedData;
    }

    /**
     * Restore original conflict content
     */
    restoreConflictContent(modal, localData, serverData) {
        const conflictContent = modal.querySelector('.conflict-content');
        
        conflictContent.innerHTML = `
            <div class="conflict-comparison">
                <div class="local-changes">
                    <h4>Sizin Değişiklikleriniz</h4>
                    <div class="changes-preview" id="local-preview"></div>
                </div>
                
                <div class="server-changes">
                    <h4>Sunucudaki Güncel Veri</h4>
                    <div class="changes-preview" id="server-preview"></div>
                </div>
            </div>
            
            <div class="conflict-details" id="conflict-details"></div>
        `;
        
        // Re-populate previews
        this.populateConflictPreview(conflictContent.querySelector('#local-preview'), localData);
        this.populateConflictPreview(conflictContent.querySelector('#server-preview'), serverData);
        this.populateConflictDetails(conflictContent.querySelector('#conflict-details'), []);
    }

    /**
     * Queue request for retry when offline
     */
    queueForRetry(requestId, endpoint, data, options) {
        this.retryQueue.push({
            requestId,
            endpoint,
            data,
            options,
            timestamp: Date.now()
        });
    }

    /**
     * Process pending updates when back online
     */
    async processPendingUpdates() {
        const queue = [...this.retryQueue];
        this.retryQueue = [];

        for (const item of queue) {
            try {
                await this.putWithOptimisticLock(item.endpoint, item.data, item.options);
            } catch (error) {
                console.warn('Retry failed for:', item.endpoint, error);
                // Re-queue if still failing
                this.retryQueue.push(item);
            }
        }
    }

    /**
     * Emit pending update events for UI feedback
     */
    emitPendingUpdateEvent(endpoint, data, isPending) {
        window.dispatchEvent(new CustomEvent('pending-update-changed', {
            detail: {
                endpoint,
                data,
                isPending,
                pendingCount: this.pendingUpdates.size
            }
        }));
    }

    /**
     * Register custom conflict handler for specific endpoint
     */
    registerConflictHandler(endpoint, handler) {
        this.conflictHandlers.set(endpoint, handler);
    }

    /**
     * Make HTTP request (delegates to existing APIConfig)
     */
    async makeRequest(url, method, data, options) {
        if (window.APIConfig && typeof window.APIConfig.makeRequest === 'function') {
            return await window.APIConfig.makeRequest(url, method, data);
        } else {
            // Fallback to fetch
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                body: data ? JSON.stringify(data) : undefined
            });

            if (!response.ok) {
                const error = new Error(`HTTP ${response.status}`);
                error.status = response.status;
                error.response = { data: await response.json().catch(() => ({})) };
                throw error;
            }

            return await response.json();
        }
    }

    /**
     * Build full URL from endpoint
     */
    buildUrl(endpoint) {
        if (endpoint.startsWith('http')) {
            return endpoint;
        }
        
        const baseUrl = window.APIConfig?.baseUrl || 'http://localhost:5003/api';
        return `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get pending updates count
     */
    getPendingUpdatesCount() {
        return this.pendingUpdates.size;
    }

    /**
     * Get pending updates for specific endpoint
     */
    getPendingUpdatesForEndpoint(endpoint) {
        return Array.from(this.pendingUpdates.values())
            .filter(update => update.endpoint === endpoint);
    }
}

// Create global instance
window.OptimisticAPIClient = new OptimisticAPIClient();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptimisticAPIClient;
}