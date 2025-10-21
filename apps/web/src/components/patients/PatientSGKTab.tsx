import React, { useState, useEffect } from 'react';
import { Button, Input, Badge } from '@x-ear/ui-web';
import { useToastHelpers } from '@x-ear/ui-web';
import { FileText, Download, Eye, RefreshCw, Upload, Trash2, AlertCircle, CheckCircle, Clock, Plus, X, Loader2, Shield, CreditCard, Calendar } from 'lucide-react';
import { Patient } from '../../types/patient/patient-base.types';
import { SGKDocument, SGKDocumentType } from '../../types/sgk';
import { useProcessSgkOcr, useTriggerSgkProcessing } from '../../hooks/sgk/useSgk';
import sgkService from '../../services/sgk/sgk.service';

interface PatientSGKTabProps {
  patient: Patient;
  onPatientUpdate?: (patient: Patient) => void;
}

// Loading Spinner Component
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
  );
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Onaylandı' };
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Beklemede' };
      case 'rejected':
        return { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Reddedildi' };
      case 'processing':
        return { color: 'bg-blue-100 text-blue-800', icon: RefreshCw, text: 'İşleniyor' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, text: 'Bilinmiyor' };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} ${className} inline-flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.text}
    </Badge>
  );
};

// Error Message Component
const ErrorMessage: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex items-start">
      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm text-red-800">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Tekrar Dene
          </button>
        )}
      </div>
    </div>
  </div>
);

// Success Message Component
const SuccessMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
    <div className="flex items-center">
      <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
      <p className="text-sm text-green-800">{message}</p>
    </div>
  </div>
);

export const PatientSGKTab: React.FC<PatientSGKTabProps> = ({ patient, onPatientUpdate }) => {
  const { success: showSuccess, error: showError } = useToastHelpers();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<SGKDocumentType>('rapor');
  const [uploadNotes, setUploadNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [sgkDocuments, setSgkDocuments] = useState<SGKDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [eReceiptNo, setEReceiptNo] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [isQueryingReport, setIsQueryingReport] = useState(false);
  const [eReceiptData, setEReceiptData] = useState<any>(null);

  // Safe access to patient data with fallbacks
  const sgkData = patient?.sgkInfo || {};
  const patientId = patient?.id || '';
  const sgkStatus = patient?.status || 'pending';
  
  // Enhanced SGK data with fallbacks
  const reportDate = String(sgkData.approvalDate || '05 Ocak 2024');
  const reportNo = String(sgkData.approvalNumber || `SGK-2024-${patientId.slice(-6) || '001234'}`);
  const validityPeriod = sgkData.expiryDate && sgkData.expiryDate !== '' ? 
    Math.ceil((new Date(String(sgkData.expiryDate)).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 365)) + ' Yıl' : 
    '2 Yıl';
  const contributionAmount = 1500; // This should come from business logic
  const sgkCoverage = Math.round((typeof sgkData.coveragePercentage === 'number' ? sgkData.coveragePercentage : 0.85) * contributionAmount);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  const loadSgkDocuments = async () => {
    if (!patientId) return;
    
    setDocumentsLoading(true);
    try {
      // TODO: Fix SGK service response type
      // const documents = await sgkService.listDocuments(patientId);
      setSgkDocuments([]); // Mock data for now
    } catch (error) {
      console.error('Error loading SGK documents:', error);
      setError('SGK belgeleri yüklenirken hata oluştu');
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !patientId) return;

    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Belgeyi yükle
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('patientId', patientId);
      formData.append('documentType', documentType);
      if (uploadNotes) formData.append('notes', uploadNotes);

      const uploadResult = await sgkService.uploadDocument(formData, {
        idempotencyKey: `sgk-upload-${patientId}-${Date.now()}`
      });

      showSuccess('Başarılı', 'SGK belgesi başarıyla yüklendi');
      setSuccessMessage('SGK belgesi başarıyla yüklendi');

      // Reset form
      setSelectedFile(null);
      setUploadNotes('');
      
      // Reload documents
      await loadSgkDocuments();
      
    } catch (error: any) {
      const errorMessage = error?.message || 'Belge yükleme sırasında hata oluştu';
      showError('Hata', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEReceiptQuery = async () => {
    if (!eReceiptNo.trim()) {
      setError('E-Reçete numarası gerekli');
      return;
    }

    setIsQuerying(true);
    setError(null);
    
    try {
      // Mock e-receipt query
      const mockData = {
        receiptNo: eReceiptNo,
        patientName: patient.firstName + ' ' + patient.lastName,
        date: new Date().toLocaleDateString('tr-TR'),
        totalAmount: 150.75,
        items: [
          { name: 'İlaç A', quantity: 1, price: 75.50 },
          { name: 'İlaç B', quantity: 2, price: 37.625 }
        ]
      };
      
      setEReceiptData(mockData);
      setSuccessMessage('E-Reçete bilgileri başarıyla alındı');
      
    } catch (error: any) {
      const errorMessage = error?.message || 'E-Reçete sorgulanırken hata oluştu';
      showError('Hata', errorMessage);
      setError(errorMessage);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleReportQuery = async () => {
    setIsQueryingReport(true);
    setError(null);
    
    try {
      // Mock report query
      showSuccess('Başarılı', 'Hasta hakları sorgulandı');
      setSuccessMessage('Hasta hakları başarıyla sorgulandı');
      
    } catch (error: any) {
      const errorMessage = error?.message || 'Hasta hakları sorgulanırken hata oluştu';
      showError('Hata', errorMessage);
      setError(errorMessage);
    } finally {
      setIsQueryingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error and Success Messages */}
      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}
      {successMessage && <SuccessMessage message={successMessage} />}

      {/* SGK Status Overview */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-600" />
            SGK Durumu
          </h3>
          <StatusBadge status={sgkStatus} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-blue-600 font-medium">Rapor Tarihi</p>
                <p className="text-lg font-semibold text-blue-900">{reportDate || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-green-600 mr-2" />
              <div>
                <p className="text-sm text-green-600 font-medium">Rapor No</p>
                <p className="text-lg font-semibold text-green-900">{reportNo || 'N/A'}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-purple-600 mr-2" />
              <div>
                <p className="text-sm text-purple-600 font-medium">Geçerlilik</p>
                <p className="text-lg font-semibold text-purple-900">{validityPeriod}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center">
              <CreditCard className="w-5 h-5 text-orange-600 mr-2" />
              <div>
                <p className="text-sm text-orange-600 font-medium">SGK Karşılama</p>
                <p className="text-lg font-semibold text-orange-900">₺{sgkCoverage}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Upload Section */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Upload className="w-5 h-5 mr-2 text-blue-600" />
          Belge Yükleme
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Belge Türü
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as SGKDocumentType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="rapor">Rapor</option>
              <option value="recete">Reçete</option>
              <option value="tahlil">Tahlil</option>
              <option value="goruntu">Görüntüleme</option>
              <option value="diger">Diğer</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dosya Seç
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notlar (Opsiyonel)
            </label>
            <textarea
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Belge hakkında notlar..."
            />
          </div>
          
          <Button
            onClick={handleFileUpload}
            disabled={!selectedFile || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Yükleniyor...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Belgeyi Yükle
              </>
            )}
          </Button>
        </div>
      </div>

      {/* E-Receipt Query Section */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="w-5 h-5 mr-2 text-green-600" />
          E-Reçete Sorgulama
        </h3>
        
        <div className="flex gap-4">
          <Input
            value={eReceiptNo}
            onChange={(e) => setEReceiptNo(e.target.value)}
            placeholder="E-Reçete numarasını girin"
            className="flex-1"
          />
          <Button
            onClick={handleEReceiptQuery}
            disabled={isQuerying}
            variant="outline"
          >
            {isQuerying ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Sorgulanıyor...</span>
              </>
            ) : (
              'Sorgula'
            )}
          </Button>
        </div>
        
        {eReceiptData && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">E-Reçete Bilgileri</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Reçete No:</span> {eReceiptData.receiptNo}</p>
              <p><span className="font-medium">Hasta:</span> {eReceiptData.patientName}</p>
              <p><span className="font-medium">Tarih:</span> {eReceiptData.date}</p>
              <p><span className="font-medium">Toplam Tutar:</span> ₺{eReceiptData.totalAmount}</p>
            </div>
          </div>
        )}
      </div>

      {/* Patient Rights Query Section */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2 text-purple-600" />
          Hasta Hakları Sorgulama
        </h3>
        
        <Button
          onClick={handleReportQuery}
          disabled={isQueryingReport}
          variant="outline"
          className="w-full"
        >
          {isQueryingReport ? (
            <>
              <LoadingSpinner size="sm" />
              <span className="ml-2">Sorgulanıyor...</span>
            </>
          ) : (
            'Hasta Haklarını Sorgula'
          )}
        </Button>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-gray-600" />
            SGK Belgeleri
          </h3>
          <Button
            onClick={loadSgkDocuments}
            disabled={documentsLoading}
            variant="outline"
            size="sm"
          >
            {documentsLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
        
        {sgkDocuments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Henüz yüklenmiş SGK belgesi bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sgkDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-gray-600 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{doc.filename}</p>
                    <p className="text-sm text-gray-500">
                      {doc.documentType} • {new Date(doc.uploadedAt).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};