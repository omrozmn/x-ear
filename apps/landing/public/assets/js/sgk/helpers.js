// Shared SGK helper utilities (moved from inline sgk.html)
(function(global){
  function calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;
    for (let i = 0; i <= len2; i++) matrix[i] = [i];
    for (let j = 0; j <= len1; j++) matrix[0][j] = j;
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
      }
    }
    const maxLength = Math.max(len1, len2);
    return maxLength > 0 ? (maxLength - matrix[len2][len1]) / maxLength : 0;
  }

  function calculateDateSimilarity(date1, date2) {
    if (!date1 || !date2) return 0;
    const normalize = d => d.replace(/[^\d]/g, '');
    const norm1 = normalize(date1);
    const norm2 = normalize(date2);
    if (norm1 === norm2) return 1.0;
    const formats = [ { pattern: /(\d{1,2})(\d{1,2})(\d{4})/, order: [1,2,3] }, { pattern: /(\d{4})(\d{1,2})(\d{1,2})/, order: [3,2,1] } ];
    for (const format of formats) {
      const m1 = norm1.match(format.pattern);
      const m2 = norm2.match(format.pattern);
      if (m1 && m2) {
        const p1 = format.order.map(i => m1[i]).join('');
        const p2 = format.order.map(i => m2[i]).join('');
        if (p1 === p2) return 1.0;
      }
    }
    return 0.0;
  }

  function isValidTurkishName(name) {
    try {
      if (typeof OCREngine !== 'undefined') {
        const engine = new OCREngine();
        return engine.isValidTurkishName ? engine.isValidTurkishName(name) : { valid: false, confidence: 0 };
      }
    } catch (e) { /* ignore */ }
    return { valid: false, confidence: 0 };
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Convert data URL (base64) to Blob. Prefer SGK.page implementation if available.
  function dataURLToBlob(dataURL) {
    try {
      if (!dataURL) return null;
      if (window.SGK && window.SGK.page && typeof window.SGK.page.dataURLToBlob === 'function') {
        return window.SGK.page.dataURLToBlob(dataURL);
      }
      const parts = dataURL.split(',');
      const contentType = parts[0].split(':')[1].split(';')[0];
      const raw = window.atob(parts[1]);
      const uInt8Array = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; ++i) uInt8Array[i] = raw.charCodeAt(i);
      return new Blob([uInt8Array], { type: contentType });
    } catch (e) {
      console.warn('helpers.dataURLToBlob failed', e);
      return null;
    }
  }

  function extractPatientInfo(ocrText) {
    if (window.sgkPipeline && typeof window.sgkPipeline.extractPatientInfoFallback === 'function') {
      try { return window.sgkPipeline.extractPatientInfoFallback(ocrText); } catch (e) { console.warn('Pipeline extract failed', e); }
    }
    if (typeof OCREngine !== 'undefined') {
      try { const engine = new OCREngine(); return engine.extractPatientInfo ? engine.extractPatientInfo(ocrText) : { name: '', tcNo: '', birthDate: '', confidence: 0 }; } catch(e){}
    }
    return { name: '', tcNo: '', birthDate: '', confidence: 0 };
  }

  function classifyDocument(ocrText) {
    if (window.sgkPipeline && typeof window.sgkPipeline.classifyDocument === 'function') {
      try { return window.sgkPipeline.classifyDocument(ocrText); } catch(e) { console.warn('Pipeline classify failed', e); }
    }
    if (typeof OCREngine !== 'undefined') {
      try { const engine = new OCREngine(); return engine.classifyDocument ? engine.classifyDocument(ocrText) : { type: 'Diğer', confidence: 0 }; } catch(e){}
    }
    return { type: 'Diğer', confidence: 0 };
  }

  async function findPatientMatch(patientInfo) {
    // Try pipeline first
    if (window.sgkPipeline && typeof window.sgkPipeline.fuzzySearchPatients === 'function') {
      try {
        const patients = window.sgkPipeline.getAllPatients();
        const matches = window.sgkPipeline.fuzzySearchPatients(patients, patientInfo);
        if (Array.isArray(matches) && matches.length > 0 && matches[0].confidence > 0.25) {
          return { ...matches[0].patient, matchConfidence: matches[0].confidence };
        }
      } catch (e) { console.warn('Pipeline fuzzy search error', e); }
    }

    // Legacy fallback
    const db = window.patientDatabase || window.patients || [];
    if (!db || db.length === 0) return null;

    let bestMatch = null; let bestScore = 0;
    for (const patient of db) {
      let score = 0; const scoreDetails = [];
      if (patientInfo.name && patient.name) {
        const extractedName = (patientInfo.name || '').toLowerCase();
        const patientName = (patient.name || '').toLowerCase();
        if (extractedName === patientName) { score += 0.8; scoreDetails.push('exact_name_match'); }
        else {
          const similarity = calculateStringSimilarity(extractedName, patientName);
          if (similarity > 0.6) { score += similarity * 0.7; scoreDetails.push('name_similarity'); }
          const extractedWords = extractedName.split(' ').filter(w => w.length > 2);
          const patientWords = patientName.split(' ').filter(w => w.length > 2);
          let wordMatches = 0;
          extractedWords.forEach(e => { patientWords.forEach(pw => { if (pw.includes(e) || e.includes(pw)) wordMatches++; }); });
          if (wordMatches > 0) { const wordMatchScore = (wordMatches / extractedWords.length) * 0.5; score += wordMatchScore; scoreDetails.push('word_match'); }
        }
      }
      if (patientInfo.tcNo && (patient.tcNo || patient.tc)) {
        const patTc = patient.tcNo || patient.tc;
        if (patientInfo.tcNo === patTc) { score += 0.9; scoreDetails.push('tc_exact'); }
      }
      if (patientInfo.birthDate && (patient.birthDate || patient.birth)) {
        const sim = calculateDateSimilarity(patientInfo.birthDate, patient.birthDate || patient.birth);
        if (sim > 0.8) { score += sim * 0.3; scoreDetails.push('birth_date'); }
      }
      if (score > bestScore && score > 0.4) { bestScore = score; bestMatch = { ...patient, matchConfidence: score, matchDetails: scoreDetails }; }
    }
    return bestMatch;
  }

  // Expose helpers
  global.SGK = global.SGK || {};
  global.SGK.helpers = global.SGK.helpers || {};
  Object.assign(global.SGK.helpers, { calculateStringSimilarity, calculateDateSimilarity, isValidTurkishName, readFileAsDataURL, extractPatientInfo, classifyDocument, findPatientMatch });

  // Also expose dataURLToBlob via helpers for canonical access
  global.SGK.helpers.dataURLToBlob = dataURLToBlob;
  window.dataURLToBlob = window.dataURLToBlob || dataURLToBlob;

  // Also expose commonly used functions to window (compat)
  window.calculateStringSimilarity = calculateStringSimilarity;
  window.calculateDateSimilarity = calculateDateSimilarity;
  window.extractPatientInfo = extractPatientInfo;
  window.classifyDocument = classifyDocument;
  window.findPatientMatch = findPatientMatch;
  window.readFileAsDataURL = readFileAsDataURL;

})(window);
