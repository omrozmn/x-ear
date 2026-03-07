(function() {
  function safeParse(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e) { return null; }
  }
  function safeStringify(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) { /* ignore */ }
  }

  const keys = ['xear_patients', 'xear_patients_data', 'xear_patients_data_v2', 'xear_patients_list', window.STORAGE_KEYS?.PATIENTS_LOCAL || 'xear_patients_local'];
  keys.forEach(k => {
    const arr = safeParse(k);
    if (Array.isArray(arr) && arr.length > 0) {
      try {
        const normalized = arr.map(item => {
          if (window && window.CanonicalizePatient && typeof window.CanonicalizePatient.canonicalizePatient === 'function') {
            return window.CanonicalizePatient.canonicalizePatient(item) || item;
          }
          // Fallback: minimal normalization
          const p = Object.assign({}, item);
          p.identityNumber = item.identityNumber || item.identity_number || item.tcNumber || item.tc || null;
          if (item.dob && item.dob.indexOf && item.dob.indexOf('T') !== -1) p.dob = item.dob.split('T')[0];
          p.name = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
          p.tcNumber = p.tcNumber || p.tc || p.identityNumber || null;
          return p;
        });
        safeStringify(k, normalized);
      } catch(e) { /* ignore normalization errors */ }
    }
  });
})();
