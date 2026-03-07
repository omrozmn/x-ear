(function(){
  if (typeof SGKDocumentPipeline === 'undefined') return;
  const proto = SGKDocumentPipeline.prototype;

  proto.calculateLevenshteinSimilarity = function(str1, str2) {
    const len1 = str1.length, len2 = str2.length; const matrix = Array(len1+1).fill().map(()=>Array(len2+1).fill(0)); for(let i=0;i<=len1;i++) matrix[i][0]=i; for(let j=0;j<=len2;j++) matrix[0][j]=j; for(let i=1;i<=len1;i++){ for(let j=1;j<=len2;j++){ const cost = str1[i-1]===str2[j-1]?0:1; matrix[i][j] = Math.min(matrix[i-1][j]+1,matrix[i][j-1]+1,matrix[i-1][j-1]+cost); } } const distance = matrix[len1][len2]; const maxLen = Math.max(len1,len2); return maxLen===0?1:1-(distance/maxLen);
  };

  proto.calculateJaroWinklerSimilarity = function(s1, s2) {
    if (s1 === s2) return 1; const len1 = s1.length, len2 = s2.length; if (len1===0 || len2===0) return 0; const matchWindow = Math.floor(Math.max(len1,len2)/2)-1; const s1Matches = new Array(len1).fill(false); const s2Matches = new Array(len2).fill(false); let matches=0, transpositions=0; for (let i=0;i<len1;i++){ const start=Math.max(0,i-matchWindow); const end=Math.min(i+matchWindow+1,len2); for(let j=start;j<end;j++){ if (s2Matches[j] || s1[i]!==s2[j]) continue; s1Matches[i]=true; s2Matches[j]=true; matches++; break; }} if(matches===0) return 0; let k=0; for(let i=0;i<len1;i++){ if(!s1Matches[i]) continue; while(!s2Matches[k]) k++; if (s1[i]!==s2[k]) transpositions++; k++; } const jaro = (matches/len1 + matches/len2 + (matches - transpositions/2)/matches)/3; let prefix=0; for(let i=0;i<Math.min(len1,len2,4);i++){ if (s1[i]===s2[i]) prefix++; else break; } return jaro + (0.1 * prefix * (1-jaro));
  };

  proto.calculateWordSimilarity = function(name1, name2) { const words1 = name1.split(' ').filter(w=>w.length>0); const words2 = name2.split(' ').filter(w=>w.length>0); if (words1.length===0 || words2.length===0) return 0; let totalSimilarity=0, maxPossible=0; words1.forEach(word1=>{ let bestMatch=0; words2.forEach(word2=>{ const similarity = this.calculateLevenshteinSimilarity(word1, word2); bestMatch = Math.max(bestMatch, similarity); }); totalSimilarity += bestMatch; maxPossible += 1; }); return totalSimilarity/maxPossible; };

  proto.calculateLCSSimilarity = function(s1,s2){ const len1=s1.length,len2=s2.length; if(len1===0||len2===0) return 0; const dp=Array(len1+1).fill().map(()=>Array(len2+1).fill(0)); for(let i=1;i<=len1;i++){ for(let j=1;j<=len2;j++){ if(s1[i-1]===s2[j-1]) dp[i][j]=dp[i-1][j-1]+1; else dp[i][j]=Math.max(dp[i-1][j],dp[i][j-1]); }} const lcs=dp[len1][len2]; return (2*lcs)/(len1+len2); };

  proto.calculatePhoneSimilarity = function(phone1, phone2){ const digits1 = phone1.replace(/\D/g,''), digits2 = phone2.replace(/\D/g,''); if (!digits1 || !digits2) return 0; const suffix1 = digits1.slice(-7), suffix2 = digits2.slice(-7); return suffix1 === suffix2 ? 1 : 0; };

  proto.normalizeText = function(text){ return text.toLowerCase().replace(/[çÇ]/g,'c').replace(/[ğĞ]/g,'g').replace(/[ıI]/g,'i').replace(/[öÖ]/g,'o').replace(/[şŞ]/g,'s').replace(/[üÜ]/g,'u').replace(/[0]/g,'o').replace(/[1]/g,'i').replace(/[5]/g,'s').replace(/[8]/g,'b').replace(/[6]/g,'g').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim(); };

  proto.calculateNameOrderMatch = function(name1, name2){ const words1 = this.normalizeText(name1).split(' ').filter(w=>w.length>1); const words2 = this.normalizeText(name2).split(' ').filter(w=>w.length>1); if (words1.length===0||words2.length===0) return 0; if (words1.length !== words2.length) return 0; let orderMatches=0; const minLength = Math.min(words1.length, words2.length); for (let i=0;i<minLength;i++){ const similarity = this.calculateLevenshteinSimilarity(words1[i], words2[i]); if (similarity > 0.8) orderMatches++; } return orderMatches/minLength; };

  proto.isInstitutionalText = function(text){ if(!text||typeof text!=='string') return false; const upperText = text.toUpperCase(); const institutionalKeywords = ['KURUMU','KURUM','HASTANE','SAGLIK','SAĞLIK','HEALTH','MEDICAL','SOSYAL','SOCIAL','GUVENLIK','GÜVENLIK','DEVLET','STATE','KAMU','PUBLIC','BAKANLIGI','BAKANLIĞI','MINISTRY','MUDURLUGU','MÜDÜRLÜĞÜ','DIRECTORATE','UNIVERSITE','ÜNİVERSİTE','UNIVERSITY','FAKULTE','FAKÜLTE','FACULTY','BOLUM','BÖLÜM','DEPARTMENT','MERKEZ','CENTER','CENTRE','ENSTITU','ENSTİTÜ','INSTITUTE','VAKIF','VAKFI','FOUNDATION','DOKTOR','DOCTOR','DR.','DR','HEKIM','PHYSICIAN','MUDUR','MÜDÜR','MANAGER','DIRECTOR','SORUMLU','RESPONSIBLE','ODYOLOG','AUDIOLOGIST','TEKNISYEN','TECHNICIAN','HEMŞIRE','HEMSHIRE','NURSE','ASISTAN','ASSISTANT','UZMAN','SPECIALIST','PROF','PROFESSOR','KULLANICISI','USER','CLIENT','CUSTOMER','LTD','LIMITED','STI','ŞTİ','ANONIM','SIRKET','ŞIRKET','COMPANY','CORPORATION','FIRMA','BUSINESS','TIBBI','TIBBİ','CIHAZLAR','DEVICES','EQUIPMENT','KULLANICISI','USER','CLIENT','CUSTOMER','RAPOR','REPORT','BELGE','DOCUMENT','FORM','FORMUL','BAŞVURU','APPLICATION','ONAY','APPROVAL','ONAYLI','APPROVED','RUHSAT','LICENSE','IZIN','İZİN','PERMIT']; for (const keyword of institutionalKeywords) { if (upperText.includes(keyword)) return true; } const institutionalPatterns = [ /\b(?:SOSYAL\s+GUVENLIK|SOSYAL\s+GÜVENLIK)\b/i, /\b(?:DEVLET\s+HASTANE|STATE\s+HOSPITAL)\b/i, /\b(?:SAGLIK\s+BAKANLIGI|SAĞLIK\s+BAKANLIĞI)\b/i, /\b(?:UNIVERSITE\s+HASTANE|ÜNİVERSİTE\s+HASTANE)\b/i, /\b(?:TIBBI\s+CIHAZ|TIBBİ\s+CIHAZ)\b/i, /\b(?:LTD\s*\.|ŞTİ\s*\.)\b/i ]; for (const pattern of institutionalPatterns) if (pattern.test(text)) return true; return false; };

  proto.cleanExtractedName = function(name){ if(!name||typeof name!=='string') return ''; let cleaned = name.trim(); const prefixes = ['Soyad','Soyadi','SOYAD','SOYADI','Ad','Adi','AD','ADI','Hasta Ad Soyad','HASTA AD SOYAD','Ad Soyad','AD SOYAD']; for (const prefix of prefixes) { if (cleaned.startsWith(prefix)) { cleaned = cleaned.substring(prefix.length).trim(); break; } } const suffixes = ['Cinsiyeti','CİNSİYETİ','CINSIYET','DoğYum','DOĞYUM','Doğum','Tarihi','TARİHİ','TARIH','ERKEK','KADIN','MALE','FEMALE','Teslim','TESLİM','Tarihl','TARİHL','Kub','KUB']; for (const suffix of suffixes) { if (cleaned.endsWith(suffix)) { cleaned = cleaned.substring(0, cleaned.length - suffix.length).trim(); break; } } cleaned = cleaned.replace(/\s+/g,' ').trim(); if (cleaned.length < 4) return ''; return cleaned; };

  proto.isValidNameCandidate = function(name) { if(!name||typeof name!=='string') return false; const words = name.trim().split(/\s+/); if (words.length <2 || words.length >4) return false; if (words.some(word => word.length < 2)) return false; if (/[0-9]/.test(name)) return false; if (this.isInstitutionalText(name)) return false; const turkishCharPattern = /^[a-zA-ZçÇğĞıIİiöÖşŞüÜ\s]+$/; if (!turkishCharPattern.test(name)) return false; return true; };

  proto.scoreNameCandidate = function(name, fullText) { let score=0; const words = name.split(/\s+/); score += words.length===2?10:words.length===3?8:5; const nameIndex = fullText.indexOf(name); if (nameIndex !== -1) { const before = fullText.substring(Math.max(0, nameIndex-50), nameIndex).toLowerCase(); const after = fullText.substring(nameIndex+name.length, nameIndex+name.length+50).toLowerCase(); const contextKeywords=['hasta','patient','ad','name','sayın','bay','bayan']; contextKeywords.forEach(keyword=>{ if (before.includes(keyword)) score+=5; if (after.includes(keyword)) score+=3; }); } if (this.isTurkishNamePattern(name)) score +=5; if (name.length<6) score -=2; if (name.length>30) score -=3; return score; };

  proto.isTurkishNamePattern = function(name){ const turkishNameEndings = ['an','en','in','un','ay','ey','iye','can','han','gül']; const words = name.toLowerCase().split(/\s+/); return words.some(word => turkishNameEndings.some(ending=>word.endsWith(ending))); };

  // Turkish text normalization (moved here from pipeline)
  proto.normalizeTurkish = function(text) {
    if (!text || typeof text !== 'string') {
      console.warn('⚠️ normalizeTurkish: Invalid input, returning empty string');
      return '';
    }

    try {
      return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^\w\s]/g, ' ')       // Replace non-word chars with spaces
        .replace(/\s+/g, ' ')           // Normalize whitespace
        .trim();
    } catch (error) {
      console.error('❌ Error in normalizeTurkish:', error);
      return '';
    }
  };

  // Provide underscored aliases (optional) so callers that expect functions to be provided elsewhere can reference them safely
  proto._utils_calculateLevenshteinSimilarity = proto.calculateLevenshteinSimilarity;
  proto._utils_calculateJaroWinklerSimilarity = proto.calculateJaroWinklerSimilarity;
  proto._utils_calculateWordSimilarity = proto.calculateWordSimilarity;
  proto._utils_calculateLCSSimilarity = proto.calculateLCSSimilarity;
  proto._utils_calculatePhoneSimilarity = proto.calculatePhoneSimilarity;
  proto._utils_normalizeText = proto.normalizeText;
  proto._utils_calculateNameOrderMatch = proto.calculateNameOrderMatch;
  proto._utils_isInstitutionalText = proto.isInstitutionalText;
  proto._utils_cleanExtractedName = proto.cleanExtractedName;
  proto._utils_isValidNameCandidate = proto.isValidNameCandidate;
  proto._utils_scoreNameCandidate = proto.scoreNameCandidate;
  proto._utils_isTurkishNamePattern = proto.isTurkishNamePattern;

})();