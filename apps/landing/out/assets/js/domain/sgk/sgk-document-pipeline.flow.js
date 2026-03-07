(function(){
  if (typeof SGKDocumentPipeline === 'undefined') return;
  const proto = SGKDocumentPipeline.prototype;

  proto.processPipeline = async function(file) {
    const container = document.querySelector('.upload-preview');
    let processedData = {};
    try {
      this.updateProgress(container, 1, 8, 'Belge kenarları tespit ediliyor ve döndürme düzeltmesi yapılıyor...');
      processedData = await this.detectDocumentEdgesAndCrop(file);
      this.updateProgress(container, 2, 8, 'Metin çıkarılıyor (OCR)...');
      processedData.ocrText = await this.extractTextFromImage(processedData.croppedImage || file);
      this.updateProgress(container, 3, 8, 'Hasta eşleştiriliyor...');
      processedData.patientMatch = await this.matchPatientByName(processedData.ocrText);
      this.updateProgress(container, 4, 8, 'Belge türü tespit ediliyor...');
      processedData.documentType = await this.detectDocumentType ? await this.detectDocumentType(processedData.ocrText, file.name) : { type:'diger', displayName: 'Diğer', confidence:0.1 };
      this.updateProgress(container, 5, 8, 'PDF\'e dönüştürülüyor...');
      processedData.pdfData = await this.convertToPDF(processedData.croppedImage || file, processedData);
      this.updateProgress(container, 6, 8, 'PDF sıkıştırılıyor...');
      processedData.compressedPDF = await this.compressPDF(processedData.pdfData);
      this.updateProgress(container, 7, 8, 'Dosya kaydediliyor...');
      processedData.savedDocument = await this.saveToPatientDocuments(processedData);
      this.updateProgress(container, 8, 8, 'Tamamlandı!');
      this.showInPatientDocuments(processedData.savedDocument.document || processedData.savedDocument.document || processedData.savedDocument);
      return processedData;
    } catch (error) {
      this.updateProgress(container, 0, 8, 'Hata: ' + error.message);
      throw error;
    }
  };

})();