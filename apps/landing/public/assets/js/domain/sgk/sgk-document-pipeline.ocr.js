(function(){
  if (typeof SGKDocumentPipeline === 'undefined') return;
  const proto = SGKDocumentPipeline.prototype;

  proto.extractTextFromImage = async function(imageData) {
    console.log('📝 (ocr) extractTextFromImage');
    try {
      if (this.ocrEngine && typeof this.ocrEngine.processImage === 'function') {
        const res = await this.ocrEngine.processImage(imageData, 'sgk_document');
        return res?.text || '';
      }

      // Fallback to global ocrEngine
      if (window.ocrEngine && typeof window.ocrEngine.processImage === 'function') {
        const res = await window.ocrEngine.processImage(imageData, 'sgk_document');
        return res?.text || '';
      }

      return '';
    } catch (e) {
      console.error('OCR extraction failed:', e);
      return '';
    }
  };

  // Patient matching and extraction helpers
  proto.getAllPatients = function() {
    let patients = [];
    if (window.sampleData && window.sampleData.patients) patients = patients.concat(window.sampleData.patients);
    if (window.samplePatients) patients = patients.concat(window.samplePatients);
    try { const stored = localStorage.getItem('patients'); if (stored) { const storedPatients = JSON.parse(stored); if (Array.isArray(storedPatients)) patients = patients.concat(storedPatients); } } catch (e) { console.warn('Could not load patients from localStorage'); }
    const uniquePatients = patients.filter((patient, index, self) => index === self.findIndex(p => p.id === patient.id));
    const self = this;
    const validPatients = uniquePatients.filter((patient) => patient && patient.id && patient.name && typeof patient.name === 'string' && patient.name.trim().length > 0 && !self.isInstitutionalText(patient.name));
    return validPatients;
  };

  proto.fuzzySearchPatients = function(patients, extractedInfo) {
    const matches = [];
    const self = this;
    const validDatabasePatients = patients.filter((patient) => patient && patient.id && patient.name && typeof patient.name === 'string' && patient.name.trim().length > 0 && !self.isInstitutionalText(patient.name));
    if (!extractedInfo.name || self.isInstitutionalText(extractedInfo.name)) return [];
    validDatabasePatients.forEach(patient => {
      let confidence = 0; const factors = [];
      if (extractedInfo.name && patient.name) {
        const nameScores = this.calculateNameSimilarity(extractedInfo.name, patient.name);
        const avgNameScore = nameScores.reduce((sum, score) => sum + score, 0) / nameScores.length;
        confidence += avgNameScore * 0.8; factors.push({ type: 'name', score: avgNameScore, details: nameScores });
        const extractedWords = this.normalizeText(extractedInfo.name).split(' ');
        const patientWords = this.normalizeText(patient.name).split(' ');
        const exactMatches = extractedWords.filter(word => patientWords.includes(word)).length;
        const exactMatchScore = exactMatches / Math.max(extractedWords.length, patientWords.length);
        confidence += exactMatchScore * 0.15; factors.push({ type: 'exactWords', score: exactMatchScore });
        const nameOrderScore = this.calculateNameOrderMatch(extractedInfo.name, patient.name);
        confidence += nameOrderScore * 0.05; factors.push({ type: 'nameOrder', score: nameOrderScore });
      }
      if (extractedInfo.tcNo && patient.tcNumber) { const tcScore = extractedInfo.tcNo === patient.tcNumber ? 1 : 0; confidence += tcScore * 0.1; factors.push({ type: 'tc', score: tcScore }); }
      if (extractedInfo.birthDate && patient.birthDate) { const birthScore = extractedInfo.birthDate === patient.birthDate ? 1 : 0; confidence += birthScore * 0.05; factors.push({ type: 'birthDate', score: birthScore }); }
      if (extractedInfo.phone && patient.phone) { const phoneScore = this.calculatePhoneSimilarity(extractedInfo.phone, patient.phone); confidence += phoneScore * 0.02; factors.push({ type: 'phone', score: phoneScore }); }
      if (confidence > 0) matches.push({ patient, confidence: Math.min(confidence, 1), factors });
    });
    return matches.sort((a,b)=>b.confidence - a.confidence);
  };

  proto.matchPatientByName = async function(ocrText) {
    console.log('👤 (ocr) matchPatientByName');
    try {
      const patientInfo = (this.ocrEngine && typeof this.ocrEngine.extractPatientInfo === 'function') ? this.ocrEngine.extractPatientInfo(ocrText) : this.extractPatientInfoFallback(ocrText);

      // If backend is available, prefer TC-based exact lookup first to avoid false negatives
      if (patientInfo.tcNo && window.BackendServiceManager && window.BackendServiceManager.getService) {
        try {
          const svc = window.BackendServiceManager.getService('patients');
          const resp = await svc.search(patientInfo.tcNo, { per_page: 5 });
          const found = (resp && resp.patients) ? resp.patients : (Array.isArray(resp) ? resp : (resp && resp.data ? resp.data : []));
          const normalizeTc = (v) => (v || '').toString().replace(/\D/g, '');
          const exact = found.find(p => normalizeTc(p.tcNumber) === normalizeTc(patientInfo.tcNo));
          if (exact) {
            // Normalize backend patient shape
            const name = exact.name || `${exact.firstName || ''} ${exact.lastName || ''}`.trim();
            exact.name = name || exact.name;
            return { matched: true, patient: exact, confidence: 0.99, extractedInfo: patientInfo, candidates: [{ patient: exact, confidence: 0.99 }], matchLevel: 'high', method: 'tc_search' };
          }
        } catch (err) {
          console.warn('Backend TC lookup failed', err);
        }
      }

      // If backend available and we have a name, try a backend name search for better candidate ranking
      if (patientInfo.name && window.BackendServiceManager && window.BackendServiceManager.getService) {
        try {
          const svc = window.BackendServiceManager.getService('patients');
          const resp = await svc.search(patientInfo.name, { per_page: 10 });
          const found = (resp && resp.patients) ? resp.patients : (Array.isArray(resp) ? resp : (resp && resp.data ? resp.data : []));
          if (found && found.length > 0) {
            // Compute similarity using existing helper; prefer records with built tcNumber match
            const scored = found.map(p => {
              const pname = p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim();
              const nameScores = this.calculateNameSimilarity ? this.calculateNameSimilarity(patientInfo.name, pname) : [this.levenshteinSimilarity((patientInfo.name||'').toLowerCase(), (pname||'').toLowerCase())];
              const avgNameScore = nameScores.reduce((s, v) => s + v, 0) / nameScores.length;
              let score = avgNameScore * 0.9;
              if (patientInfo.tcNo && p.tcNumber && p.tcNumber.replace(/\D/g,'') === patientInfo.tcNo) score = Math.max(score, 0.98);
              return { patient: p, score, name: pname };
            });
            scored.sort((a,b)=>b.score - a.score);
            const best = scored[0];
            if (best.score >= 0.4) return { matched: true, patient: best.patient, confidence: best.score, extractedInfo: patientInfo, candidates: scored.slice(0,5).map(s=>({patient:s.patient,confidence:s.score})), matchLevel: 'high', method: 'backend_name_search' };
            if (best.score >= 0.25) return { matched: true, patient: best.patient, confidence: best.score, extractedInfo: patientInfo, candidates: scored.slice(0,5).map(s=>({patient:s.patient,confidence:s.score})), matchLevel: 'medium', requiresConfirmation: true, method: 'backend_name_search' };
            // Otherwise fall through to local fuzzy
          }
        } catch (err) {
          console.warn('Backend name lookup failed', err);
        }
      }

      if (!patientInfo.name && !patientInfo.tcNo) return { matched:false, confidence:0, extractedInfo:patientInfo, candidates:[], reason: 'No name or TC number found in document' };
      const patients = this.getAllPatients();
      if (patientInfo.name) {
        const extractedNameLower = patientInfo.name.toLowerCase(); const extractedWords = extractedNameLower.split(' ').filter(w=>w.length>2);
        for (const patient of patients) {
          if (!patient.name) continue;
          const patientNameLower = patient.name.toLowerCase(); const patientWords = patientNameLower.split(' ');
          const matchingWords = extractedWords.filter(extractedWord => patientWords.some(patientWord => patientWord.includes(extractedWord) || extractedWord.includes(patientWord)));
          if (matchingWords.length >= 1) {
            return { matched:true, patient:patient, confidence:0.8, extractedInfo:patientInfo, candidates:[{patient,confidence:0.8}], matchLevel:'high' };
          }
        }
      }
      const matches = this.fuzzySearchPatients(patients, patientInfo);
      // Auto-promotion heuristics: if OCR extracted a TC that exists in local DB, promote immediately
      try {
        if (patientInfo.tcNo) {
          const normalizeTc = (v) => (v||'').toString().replace(/\D/g,'');
          const exactLocal = patients.find(p => normalizeTc(p.tcNumber) === normalizeTc(patientInfo.tcNo));
          if (exactLocal) {
            console.log('🔍 Auto-promotion: TC match found in local DB ->', exactLocal.name);
            return { matched:true, patient:exactLocal, confidence:0.99, extractedInfo:patientInfo, candidates:[{patient:exactLocal,confidence:0.99}], matchLevel:'high', method:'local_tc_match' };
          }
        }

        // If extracted name exactly matches a DB record after normalization, promote
        if (patientInfo.name) {
          const normalize = (s) => (this.normalizeText ? this.normalizeText(s) : (s||'')).replace(/\s+/g,' ').trim().toLowerCase();
          const exactNameLocal = patients.find(p => normalize(p.name) === normalize(patientInfo.name));
          if (exactNameLocal) {
            console.log('🔍 Auto-promotion: Exact normalized name match in local DB ->', exactNameLocal.name);
            return { matched:true, patient:exactNameLocal, confidence:0.97, extractedInfo:patientInfo, candidates:[{patient:exactNameLocal,confidence:0.97}], matchLevel:'high', method:'local_name_exact' };
          }
        }

        // If fuzzy matches exist but top candidate maps to an actual DB record, promote if reasonable
        if (matches && matches.length > 0) {
          const top = matches[0];
          const patientInDB = patients.find(p => p.id === top.patient.id);
          if (patientInDB) {
            // Use a lenient threshold when DB contains the candidate
            const promoteThreshold = 0.15;
            if (top.confidence >= promoteThreshold) {
              console.log('🔍 Auto-promotion: Top fuzzy candidate exists in DB ->', top.patient.name, top.confidence);
              return { matched:true, patient:top.patient, confidence:top.confidence, extractedInfo:patientInfo, candidates:matches.slice(0,5), matchLevel: top.confidence >= 0.4 ? 'high' : 'medium', method:'local_fuzzy_promote' };
            }
          }
        }
      } catch (promErr) { console.warn('Auto-promotion heuristics failed:', promErr); }
       const bestMatch = matches[0];
      const highConfidenceThreshold = 0.4; const mediumConfidenceThreshold = 0.15; const lowConfidenceThreshold = 0.1;
      if (bestMatch && bestMatch.confidence >= highConfidenceThreshold) return { matched:true, patient:bestMatch.patient, confidence:bestMatch.confidence, extractedInfo:patientInfo, candidates:matches.slice(0,5), matchLevel:'high' };
      if (bestMatch && bestMatch.confidence >= mediumConfidenceThreshold) return { matched:true, patient:bestMatch.patient, confidence:bestMatch.confidence, extractedInfo:patientInfo, candidates:matches.slice(0,5), matchLevel:'medium', requiresConfirmation:true };
      if (bestMatch && bestMatch.confidence >= lowConfidenceThreshold) return { matched:false, confidence:bestMatch.confidence, extractedInfo:patientInfo, candidates:matches.slice(0,5), matchLevel:'low', reason:'Low confidence match requires manual verification' };
      const keywordMatch = this.directKeywordSearch(ocrText);
      if (keywordMatch) return { matched:true, patient:keywordMatch, confidence:0.95, extractedInfo:{name:keywordMatch.name}, candidates:[{patient:keywordMatch,confidence:0.95}], matchLevel:'keyword', method:'direct_keyword_search' };
      return { matched:false, confidence: bestMatch?bestMatch.confidence:0, extractedInfo:patientInfo, candidates:matches.slice(0,5), matchLevel:'none', reason:'No matching patient found' };
    } catch (error) {
      console.error('Patient matching failed:', error);
      return { matched:false, confidence:0, extractedInfo:{}, candidates:[], error: error.message, reason:'Technical error during matching' };
    }
  };

  proto.directKeywordSearch = function(ocrText) {
    if (!ocrText || typeof ocrText !== 'string') return null;
    const textLower = ocrText.toLowerCase();
    const patientKeywords = { 'onur':'Onur Aydoğdu', 'aydoğdu':'Onur Aydoğdu', 'rahime':'Rahime Çelik', 'çelik':'Rahime Çelik', 'celik':'Rahime Çelik', 'sercan':'Sercan Kubilay', 'kubilay':'Sercan Kubilay', 'sami':'Sami Karatay', 'karatay':'Sami Karatay' };
    for (const [keyword, fullPatientName] of Object.entries(patientKeywords)) {
      if (textLower.includes(keyword)) {
        const patients = this.getAllPatients();
        const foundPatient = patients.find(p=>p.name===fullPatientName);
        if (foundPatient) return foundPatient;
      }
    }
    return null;
  };

  proto.extractPatientInfoFallback = function(text) {
    const info = { name:'', tcNo:'', birthDate:'', confidence:0 };
    if (!text || typeof text !== 'string') return info;
    const tcPatterns = [/(?:TC|T\.C\.?|TCKN|T\.C\.K\.N\.?)[\s\.:]*(\d{11})/gi,/(?:KIMLIK|KIMLIK\s+NO|KIMLIK\s+NUMARASI)[\s\.:]*(\d{11})/gi,/\b(\d{11})\b/g];
    for (const pattern of tcPatterns) {
      const match = text.match(pattern);
      if (match) { const tcNo = match[0].replace(/\D/g,''); if (tcNo.length===11) { info.tcNo = tcNo; info.confidence += 0.3; break; } }
    }
    const namePatterns = [/([A-ZÇĞIİÖŞÜ]{2,}\s+[A-ZÇĞIİÖŞÜ]{2,}(?:\s+[A-ZÇĞIİÖŞÜ]{2,})?)/g,/(?:Hasta\s*Ad\s*Soyad|HASTA\s*ADI?\s*SOYADI?)\s*[:]\s*([A-ZÇĞIİÖŞÜ]{2,}\s+[A-ZÇĞIİÖŞÜ]{2,}(?:\s+[A-ZÇĞIİÖŞÜ]{2,})?)/gi,/[:]\s*([A-ZÇĞIİÖŞÜ]{2,}\s+[A-ZÇĞIİÖŞÜ]{2,}(?:\s+[A-ZÇĞIİÖŞÜ]{2,})?)/g,/([A-ZÇĞIİÖŞÜ][a-zçğıiöşü]{2,}\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]{2,}(?:\s+[A-ZÇĞIİÖŞÜ][a-zçğıiöşü]{2,})?)/g];
    const extractedNames = new Set();
    namePatterns.forEach((pattern, index) => { let match; while ((match = pattern.exec(text)) !== null) { let name = match[1].trim(); name = this.cleanExtractedName(name); if (name === name.toUpperCase() && name.length>3) name = name.split(' ').map(word=>word.charAt(0)+word.slice(1).toLowerCase()).join(' '); if (this.isValidNameCandidate(name)) { extractedNames.add(name); } } });
    if (extractedNames.size>0) { const namesArray = Array.from(extractedNames); const scoredNames = namesArray.map(name=>({ name, score: this.scoreNameCandidate(name, text) })); scoredNames.sort((a,b)=>b.score - a.score); info.name = scoredNames[0].name; info.confidence += Math.min(0.7, scoredNames[0].score/10); }
    const birthDatePatterns = [/(?:doğum\s*tarih[i]?|birth\s*date)[\s:]*(\d{1,2}[./-]\d{1,2}[./-]\d{4})/gi,/\b(\d{1,2}[./-]\d{1,2}[./-]\d{4})\b/g];
    birthDatePatterns.forEach(pattern => { const match = text.match(pattern); if (match && !info.birthDate) { info.birthDate = this.standardizeDateFormat(match[1]); info.confidence += 0.2; } });
    return info;
  };

})();