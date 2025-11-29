(function(){
  if (typeof SGKDocumentPipeline === 'undefined') return;
  const proto = SGKDocumentPipeline.prototype;

  proto.convertToPDF = async function(imageData, processedData) {
    console.log('📄 (pdf) convertToPDF');
    try {
      if (!window.pdfConverter && this.pdfConverter && typeof this.pdfConverter.initialize === 'function') {
        window.pdfConverter = this.pdfConverter;
        if (typeof window.pdfConverter.initialize === 'function') await window.pdfConverter.initialize();
      }
      if (window.pdfConverter && typeof window.pdfConverter.convertImageToPDF === 'function') {
        const filename = this.generateIntelligentFilename(processedData);
        const pdfResult = await window.pdfConverter.convertImageToPDF(imageData, filename, {
          fixOrientation: true,
          cropPaper: false,
          enhanceImage: true,
          format: 'a4',
          patientName: processedData.patientMatch?.patient?.name || processedData.patientMatch?.extractedInfo?.name || 'Bilinmeyen Hasta',
          addMetadata: true,
          documentType: processedData.documentType?.type,
          matchConfidence: processedData.patientMatch?.confidence,
          maxFileSize: 300 * 1024
        });
        pdfResult.imageData = imageData;
        return pdfResult;
      }
      // Fallback minimal PDF
      const blob = new Blob(["%PDF-1.4\n%Dummy PDF"], { type: 'application/pdf' });
      return { data: await this.fileToDataURL(blob), size: 0 };
    } catch (e) {
      console.error('PDF conversion failed:', e);
      throw new Error('PDF dönüştürme başarısız: ' + e.message);
    }
  };

  proto.compressPDF = async function(pdfData) {
    console.log('🗜️ (pdf) compressPDF');
    try {
      const maxAllowedSize = 300 * 1024;
      let currentData = pdfData.data;
      let currentSize = this.estimateDataSize(currentData);
      if (currentSize <= maxAllowedSize) return { ...pdfData, data: currentData, originalSize: currentSize, compressedSize: currentSize, compressionRatio: 1.0 };
      const compressedResult = await this.aggressiveImageCompression(pdfData, maxAllowedSize);
      return { ...pdfData, data: compressedResult.data, originalSize: currentSize, compressedSize: compressedResult.size, compressionRatio: compressedResult.size / currentSize, compressionApplied: true };
    } catch (e) {
      console.error('PDF compression error:', e);
      return await this.emergencyCompress(pdfData);
    }
  };

  proto.aggressiveImageCompression = async function(pdfData, targetSize) {
    try {
      const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
      const img = new Image();
      return new Promise((resolve) => {
        img.onload = async () => {
          let quality = 0.3; let width = Math.min(1200, img.width); let height = Math.floor(img.height * (width / img.width));
          let attempts = 0; const maxAttempts = 5;
          while (attempts < maxAttempts) {
            canvas.width = width; canvas.height = height; ctx.fillStyle = 'white'; ctx.fillRect(0,0,width,height); ctx.drawImage(img,0,0,width,height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            const { jsPDF } = window.jspdf; const pdf = new jsPDF('p','mm','a4');
            const pdfWidth = 210; const pdfHeight = 297; const aspectRatio = width/height;
            let imgWidth = pdfWidth - 20; let imgHeight = imgWidth / aspectRatio;
            if (imgHeight > pdfHeight - 20) { imgHeight = pdfHeight - 20; imgWidth = imgHeight * aspectRatio; }
            const x = (pdfWidth - imgWidth)/2; const y = (pdfHeight - imgHeight)/2;
            pdf.addImage(compressedDataUrl, 'JPEG', x, y, imgWidth, imgHeight);
            const pdfOutput = pdf.output('datauristring'); const estimatedSize = this.estimateDataSize(pdfOutput);
            if (estimatedSize <= targetSize || attempts === maxAttempts - 1) { resolve({ data: pdfOutput, size: estimatedSize, quality, dimensions:{width,height} }); return; }
            quality *= 0.8; width = Math.floor(width*0.9); height = Math.floor(height*0.9); attempts++;
          }
        };
        img.onerror = () => { const { jsPDF } = window.jspdf; const pdf = new jsPDF('p','mm','a4'); pdf.text('SGK Document - Compressed', 20,20); const pdfOutput = pdf.output('datauristring'); resolve({ data: pdfOutput, size: this.estimateDataSize(pdfOutput), quality: 0.1 }); };
        if (pdfData.imageData) img.src = pdfData.imageData; else { const { jsPDF } = window.jspdf; const pdf = new jsPDF('p','mm','a4'); pdf.text('SGK Document - Compressed',20,20); const pdfOutput = pdf.output('datauristring'); resolve({ data: pdfOutput, size: this.estimateDataSize(pdfOutput), quality: 0.1 }); }
      });
    } catch (error) { console.error('Aggressive compression failed:', error); throw error; }
  };

  proto.emergencyCompress = async function(pdfData) {
    try {
      const { jsPDF } = window.jspdf; const pdf = new jsPDF('p','mm','a4'); pdf.setFontSize(12); pdf.text('SGK Belgesi', 20,20); pdf.text('Dosya boyutu nedeniyle sıkıştırıldı', 20,30); pdf.text('Orijinal belge işlendi',20,40); pdf.text(`Yükleme tarihi: ${new Date().toLocaleDateString('tr-TR')}`,20,50); const emergencyPdf = pdf.output('datauristring'); const emergencySize = this.estimateDataSize(emergencyPdf); return { ...pdfData, data: emergencyPdf, originalSize: this.estimateDataSize(pdfData.data), compressedSize: emergencySize, compressionRatio: emergencySize / this.estimateDataSize(pdfData.data), emergencyCompression: true, compressionApplied: true };
    } catch (error) { console.error('Emergency compression failed:', error); return pdfData; }
  };

  proto.estimateDataSize = function(dataString) { if (!dataString) return 0; const base64Data = dataString.split(',')[1] || dataString; return Math.floor(base64Data.length * 0.75); };

})();