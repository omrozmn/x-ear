import React, { useState, useEffect } from 'react';
import { Button, Input, Badge } from '@x-ear/ui-web';
import { useToastHelpers } from '@x-ear/ui-web';
import { FileText, Download, Eye, RefreshCw, Upload, Trash2, AlertCircle, CheckCircle, Clock, Plus, X } from 'lucide-react';
import { Patient } from '../../types/patient/patient-base.types';
import { SGKDocument, SGKDocumentType } from '../../types/sgk';
import { useProcessSgkOcr, useTriggerSgkProcessing } from '../../hooks/sgk/useSgk';
import sgkService from '../../services/sgk/sgk.service';

interface PatientSGKTabProps {
  patient: Patient;
  onPatientUpdate?: (patient: Patient) => void;
}

export const PatientSGKTab: React.FC<PatientSGKTabProps> = ({ patient, onPatientUpdate }) => {
  const [eReceiptNo, setEReceiptNo] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [isQueryingReport, setIsQueryingReport] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<SGKDocumentType>('rapor');
  const [uploadNotes, setUploadNotes] = useState('');
  const [sgkDocuments, setSgkDocuments] = useState<SGKDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  
  const { success: showSuccess, error: showError } = useToastHelpers();
  
  // SGK hooks
  const processingMutation = useTriggerSgkProcessing();

  const [sgkData, setSgkData] = useState({
    hasInsurance: patient.sgkInfo?.hasInsurance || false,
    insuranceNumber: patient.sgkInfo?.insuranceNumber || '',
    insuranceType: patient.sgkInfo?.insuranceType || 'sgk',
    coveragePercentage: patient.sgkInfo?.coveragePercentage || 0,
    approvalNumber: patient.sgkInfo?.approvalNumber || '',
    approvalDate: patient.sgkInfo?.approvalDate || '',
    expiryDate: patient.sgkInfo?.expiryDate || '',
  });
  const sgkStatus = patient.status || 'pending';
  
  // Enhanced SGK data with fallbacks
  const reportDate = sgkData.approvalDate || '05 Ocak 2024';
  const reportNo = sgkData.approvalNumber || `SGK-2024-${patient.id?.slice(-6) || '001234'}`;
  const validityPeriod = sgkData.expiryDate ? 
    Math.ceil((new Date(sgkData.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365)) + ' Yıl' : 
    '2 Yıl';
  const contributionAmount = 1500; // This should come from business logic
  const sgkCoverage = Math.round((sgkData.coveragePercentage || 0.85) * contributionAmount); // Fix: Calculate coverage based on percentage of contribution
  const totalAmount = contributionAmount + sgkCoverage;

  // Load SGK documents on component mount
  useEffect(() => {
    if (patient.id) {
      loadSgkDocuments();
    }
  }, [patient.id]);

  const loadSgkDocuments = async () => {
    if (!patient?.id) return;
    
    setDocumentsLoading(true);
    try {
      // TODO: Fix SGK service response type
      // const documents = await sgkService.listDocuments(patient.id);
      setSgkDocuments([]); // Mock data for now
    } catch (error) {
      console.error('Error loading SGK documents:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async () => {
    if (!selectedFile || !patient.id) return;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('patientId', patient.id);
      formData.append('documentType', documentType);
      if (uploadNotes) formData.append('notes', uploadNotes);

      await sgkService.uploadDocument(formData, {
        idempotencyKey: `sgk-upload-${patient.id}-${Date.now()}`
      });

      showSuccess('Başarılı', 'SGK belgesi başarıyla yüklendi');
      setSelectedFile(null);
      setUploadNotes('');
      loadSgkDocuments();
    } catch (error) {
      console.error('Error uploading SGK document:', error);
      showError('Hata', 'Belge yüklenirken hata oluştu');
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (documentId: string) => {
    try {
      await sgkService.deleteDocument(documentId, {
        idempotencyKey: `sgk-delete-${documentId}-${Date.now()}`
      });
      
      showSuccess('Başarılı', 'Belge başarıyla silindi');
      loadSgkDocuments();
    } catch (error) {
      console.error('Error deleting SGK document:', error);
      showError('Hata', 'Belge silinirken hata oluştu');
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return { text: 'Onaylı', class: 'px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full' };
      case 'pending':
        return { text: 'Beklemede', class: 'px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full' };
      case 'expired':
        return { text: 'Süresi Dolmuş', class: 'px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full' };
      case 'rejected':
        return { text: 'Reddedildi', class: 'px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full' };
      default:
        return { text: 'Bilinmiyor', class: 'px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full' };
    }
  };

  const statusInfo = getStatusInfo(sgkStatus);

  const handleEReceiptQuery = async () => {
    if (!eReceiptNo.trim()) return;

    setIsQuerying(true);
    try {
      // TODO: Implement e-receipt query API call
      console.log('Querying e-receipt:', eReceiptNo);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error querying e-receipt:', error);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleReportQuery = async () => {
    setIsQueryingReport(true);
    try {
      // TODO: Implement report query API call
      console.log('Querying patient report for TC:', patient.tcNumber);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Error querying report:', error);
    } finally {
      setIsQueryingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* SGK Status Information */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">SGK Durum Bilgileri</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SGK Status Information */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">SGK Durumu:</span>
                  <span className={statusInfo.class}>{statusInfo.text}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rapor Tarihi:</span>
                  <span className="font-medium">{reportDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rapor No:</span>
                  <span className="font-medium">{reportNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Geçerlilik:</span>
                  <span className="font-medium">{validityPeriod}</span>
                </div>
                {sgkData.expiryDate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Geçerlilik Tarihi:</span>
                    <span className="font-medium">{new Date(sgkData.expiryDate).toLocaleDateString('tr-TR')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Information */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Katkı Payı:</span>
                  <span className="font-medium">₺{contributionAmount.toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">SGK Karşılama:</span>
                  <span className="font-medium">₺{sgkCoverage.toLocaleString('tr-TR')}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600 font-medium">Toplam Tutar:</span>
                  <span className="font-bold text-lg">₺{totalAmount.toLocaleString('tr-TR')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SGK Document Management Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">SGK Belgeleri</h3>
            <Button
              onClick={() => document.getElementById('sgk-file-input')?.click()}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Belge Yükle
            </Button>
          </div>
        </div>
        <div className="p-6">
          {/* File Upload Section */}
          <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
            <input
              id="sgk-file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Belge Türü
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value as SGKDocumentType)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="rapor">Rapor</option>
                      <option value="recete">E-Reçete</option>
                      <option value="fatura">Fatura</option>
                      <option value="belge">Genel Belge</option>
                      <option value="teslim">Teslim Belgesi</option>
                      <option value="iade">İade Belgesi</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notlar (Opsiyonel)
                    </label>
                    <Input
                      value={uploadNotes}
                      onChange={(e) => setUploadNotes(e.target.value)}
                      placeholder="Belge hakkında notlar..."
                    />
                  </div>
                </div>
                
                <Button
                  onClick={handleFileUpload}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Belgeyi Yükle ve İşle
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">SGK belgesi yüklemek için tıklayın</p>
                <p className="text-sm text-gray-500">PDF, JPG, PNG formatları desteklenir</p>
              </div>
            )}
          </div>

          {/* Documents List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-gray-900">
                Yüklenen Belgeler ({sgkDocuments.length})
              </h4>
              {sgkDocuments.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSgkDocuments}
                  disabled={documentsLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${documentsLoading ? 'animate-spin' : ''}`} />
                  Yenile
                </Button>
              )}
            </div>

            {documentsLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-spin" />
                <p className="text-gray-600">Belgeler yükleniyor...</p>
              </div>
            ) : sgkDocuments.length > 0 ? (
              <div className="space-y-3">
                {sgkDocuments.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {doc.processingStatus === 'completed' && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {doc.processingStatus === 'processing' && <Clock className="w-5 h-5 text-yellow-600" />}
                        {doc.processingStatus === 'failed' && <AlertCircle className="w-5 h-5 text-red-600" />}
                        {doc.processingStatus === 'pending' && <FileText className="w-5 h-5 text-gray-600" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{doc.filename}</p>
                          <Badge variant={doc.documentType === 'rapor' ? 'default' : 'secondary'}>
                            {doc.documentType.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(doc.uploadedAt).toLocaleDateString('tr-TR')} • 
                          {doc.processingStatus === 'completed' && ' İşlendi'}
                          {doc.processingStatus === 'processing' && ' İşleniyor'}
                          {doc.processingStatus === 'failed' && ' İşleme Hatası'}
                          {doc.processingStatus === 'pending' && ' İşleme Bekliyor'}
                        </p>
                        {doc.notes && (
                          <p className="text-sm text-gray-600 mt-1">{doc.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {doc.fileUrl && (
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Görüntüle
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>Henüz SGK belgesi yüklenmemiş.</p>
                <p className="text-sm">Yukarıdaki alandan belge yükleyebilirsiniz.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* E-receipt Query Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">E-Reçete Sorgulama</h3>
        </div>
        <div className="p-6">
          <div className="flex space-x-4 mb-4">
            <Input
              type="text"
              placeholder="E-reçete numarası giriniz"
              value={eReceiptNo}
              onChange={(e) => setEReceiptNo(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleEReceiptQuery}
              disabled={isQuerying || !eReceiptNo.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isQuerying ? 'Sorgulanıyor...' : 'Sorgula'}
            </Button>
          </div>
          <div id="eReceiptResult" className="hidden">
            {/* E-receipt query results will be displayed here */}
          </div>
        </div>
      </div>

      {/* Report Query Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Rapor Sorgulama</h3>
        </div>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-600">Hasta TC Kimlik Numarası ile rapor haklarını sorgulayın</p>
            <Button
              onClick={handleReportQuery}
              disabled={isQueryingReport}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isQueryingReport ? 'Sorgulanıyor...' : 'Rapor Sorgula'}
            </Button>
          </div>
          <div id="reportResult" className="hidden">
            {/* Report query results will be displayed here */}
          </div>
        </div>
      </div>

      {/* Saved E-receipts Section */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Kaydedilmiş E-Reçeteler{' '}
            <span className="text-sm font-normal text-gray-500">
              ({patient.ereceiptHistory?.length || 0} kaydedilmiş e-reçete)
            </span>
          </h3>
        </div>
        <div className="p-6">
          {patient.ereceiptHistory && patient.ereceiptHistory.length > 0 ? (
            <div className="space-y-4">
              {patient.ereceiptHistory.map((receipt, index) => (
                <div key={receipt.id || index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">E-Reçete #{receipt.receiptNumber}</p>
                      <p className="text-sm text-gray-500">{receipt.date}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      Görüntüle
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      İndir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Henüz kaydedilmiş e-reçete bulunmamaktadır.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};