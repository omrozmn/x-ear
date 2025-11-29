(function (global) {
    const STORAGE_KEY = window.STORAGE_KEYS?.SGK_DOCUMENTS || 'xear_sgk_documents';

    function _readRaw() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY) || '[]';
            return JSON.parse(raw);
        } catch (e) {
            console.warn('SGKStorage: failed to read storage', e);
            return [];
        }
    }

    function _writeRaw(docs) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
        } catch (e) {
            console.warn('SGKStorage: failed to write storage', e);
        }
    }

    function getAll() {
        return _readRaw();
    }

    function saveAll(docs) {
        _writeRaw(Array.isArray(docs) ? docs : []);
    }

    function add(doc) {
        const all = _readRaw();
        all.push(doc);
        _writeRaw(all);
        return doc;
    }

    function update(doc) {
        if (!doc || !doc.id) return null;
        const all = _readRaw();
        const idx = all.findIndex(d => d.id === doc.id);
        if (idx === -1) return null;
        all[idx] = doc;
        _writeRaw(all);
        return doc;
    }

    function remove(id) {
        let all = _readRaw();
        all = all.filter(d => d.id !== id);
        _writeRaw(all);
    }

    function listByPatient(patientId) {
        if (!patientId) return [];
        const all = _readRaw();
        return all.filter(d => d.patientId === patientId);
    }

    global.SGKStorage = {
        getAll,
        saveAll,
        add,
        update,
        remove,
        listByPatient
    };
})(window);
