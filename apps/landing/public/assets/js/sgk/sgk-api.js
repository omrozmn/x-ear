// SGK API helper - centralize server interactions for SGK documents
(function (global) {
    const APIConfig = global.APIConfig;

    // Generate idempotency key for POST/PUT/PATCH operations
    function generateIdempotencyKey() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async function upload(files, patientId = null, documentType = 'cihaz_raporu') {
        if (!files || files.length === 0) throw new Error('No files provided');
        const endpoint = APIConfig?.endpoints?.sgkUpload || '/api/sgk/upload';

        const form = new FormData();
        for (const f of files) form.append('files', f);
        if (patientId) form.append('patientId', patientId);
        form.append('documentType', documentType);

        const headers = {
            'Idempotency-Key': generateIdempotencyKey() // Add idempotency key
        };
        try {
            const token = localStorage.getItem(window.STORAGE_KEYS?.ACCESS_TOKEN || 'xear_access_token');
            if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch (e) {}

        const resp = await fetch(endpoint, { method: 'POST', body: form, headers });
        if (!resp.ok) {
            const txt = await resp.text().catch(() => '');
            const err = new Error(`Upload failed: ${resp.status} ${resp.statusText} ${txt}`);
            err.status = resp.status;
            throw err;
        }
        const json = await resp.json().catch(() => null);
        return json;
    }

    async function createDocument(payload) {
        const endpoint = APIConfig?.endpoints?.sgkDocuments || '/api/sgk/documents';
        
        // Try Orval generated client first
        if (window.sgkCreateDocument) {
            try {
                return await window.sgkCreateDocument({ data: payload });
            } catch (orvalError) {
                console.warn('Orval SGK client failed, trying APIConfig fallback:', orvalError);
            }
        }
        
        // Prefer APIConfig.makeRequest when available because it handles auth and error parsing
        if (APIConfig && typeof APIConfig.makeRequest === 'function') {
            return await APIConfig.makeRequest(endpoint, 'POST', payload);
        }
        
        const headers = {
            'Content-Type': 'application/json',
            'Idempotency-Key': generateIdempotencyKey() // Add idempotency key
        };
        
        const resp = await fetch(endpoint, { method: 'POST', body: JSON.stringify(payload), headers });
        if (!resp.ok) throw new Error('Create document failed: ' + resp.status);
        return await resp.json();
    }

    async function getDocument(documentId) {
        const endpoint = (APIConfig?.endpoints?.sgkDocuments || '/api/sgk/documents') + `/${documentId}`;
        
        // Try Orval generated client first
        if (window.sgkGetDocument) {
            try {
                return await window.sgkGetDocument({ id: documentId });
            } catch (orvalError) {
                console.warn('Orval SGK client failed, trying APIConfig fallback:', orvalError);
            }
        }
        
        if (APIConfig && typeof APIConfig.makeRequest === 'function') {
            return await APIConfig.makeRequest(endpoint, 'GET');
        }
        const resp = await fetch(endpoint, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!resp.ok) throw new Error('Get document failed: ' + resp.status);
        return await resp.json();
    }

    async function deleteDocument(documentId) {
        if (!documentId) throw new Error('documentId required');
        const endpointBase = APIConfig?.endpoints?.sgkDocuments || '/api/sgk/documents';
        const endpoint = `${endpointBase}/${encodeURIComponent(documentId)}`;
        
        // Try Orval generated client first
        if (window.sgkDeleteDocument) {
            try {
                return await window.sgkDeleteDocument({ id: documentId });
            } catch (orvalError) {
                console.warn('Orval SGK client failed, trying APIConfig fallback:', orvalError);
            }
        }
        
        if (APIConfig && typeof APIConfig.makeRequest === 'function') {
            return await APIConfig.makeRequest(endpoint, 'DELETE');
        }
        const resp = await fetch(endpoint, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
        if (!resp.ok) throw new Error('Delete document failed: ' + resp.status);
        return await resp.json();
    }

    global.SGKApi = {
        upload,
        createDocument,
        getDocument,
        deleteDocument
    };
})(window);
