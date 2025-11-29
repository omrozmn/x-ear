// Sync storage keys: if legacy 'xear_patients' is empty but window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data' has content, copy over normalized patients
(function() {
    try {
        const legacyKey = 'xear_patients';
        const modernKey = window.STORAGE_KEYS?.PATIENTS_DATA || 'xear_patients_data';

        const legacy = JSON.parse(localStorage.getItem(legacyKey) || '[]');
        const modern = JSON.parse(localStorage.getItem(modernKey) || '[]');

        if ((!Array.isArray(legacy) || legacy.length === 0) && Array.isArray(modern) && modern.length > 0) {
            console.log('Syncing patients from', modernKey, 'to', legacyKey);
            // Attempt to canonicalize if a helper exists
            const canonicalize = window.CanonicalizePatient && typeof window.CanonicalizePatient.canonicalizePatient === 'function'
                ? (p) => window.CanonicalizePatient.canonicalizePatient(p) || p
                : (p) => ({ ...p, name: p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() });

            const normalized = modern.map(canonicalize).filter(p => p && p.id);
            try {
                // Merge without duplicating by id
                const merged = (legacy || []).slice();
                const existingIds = new Set(merged.map(p => p.id));
                normalized.forEach(p => {
                    if (!existingIds.has(p.id)) {
                        merged.push(p);
                        existingIds.add(p.id);
                    }
                });
                localStorage.setItem(legacyKey, JSON.stringify(merged));
            } catch (e) {
                console.warn('Failed to write legacy patients during sync:', e);
            }
        }
    } catch (err) {
        console.error('patient-storage-sync error:', err);
    }
})();
