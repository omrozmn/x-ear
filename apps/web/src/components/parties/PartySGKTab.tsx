import React, { useState, useEffect } from 'react';
// import { Button, Input, Badge } from '@x-ear/ui-web'; // Unused imports
import { useToastHelpers } from '@x-ear/ui-web';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Party } from '../../types/party/party-base.types';
import { SGKDocument, SGKDocumentType } from '../../types/sgk';

// import sgkService from '../../services/sgk/sgk.service'; // Unused in this file

import { EReceiptQuerySection } from './EReceiptQuerySection';
// import { PartyRightsSection } from './PartyRightsSection'; // Component not in use
// import { MaterialDeliverySection } from './MaterialDeliverySection'; // Component not in use
import { SGKStatusCard } from './SGKStatusCard';
import { PartyReportsSection } from './PartyReportsSection';
import { DeviceRightsSection } from './DeviceRightsSection';
import { SavedEReceiptsSection, SavedEReceipt } from './SavedEReceiptsSection';
import { DeviceAssignmentSection } from './DeviceAssignmentSection';
import { FileUploadSection } from './FileUploadSection';
import { SGKOperationsSection } from './SGKOperationsSection';

interface PartySGKTabProps {
  party: Party;
  onPartyUpdate?: (party: Party) => void;
}

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

export const PartySGKTab: React.FC<PartySGKTabProps> = ({ party }) => {
  const { success: showSuccess, error: showError } = useToastHelpers();
  // const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // const [documentType] = useState<SGKDocumentType>('rapor');
  // const [uploadNotes, setUploadNotes] = useState('');
  // const [isLoading, setIsLoading] = useState(false); // Not used
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [sgkDocuments, setSgkDocuments] = useState<SGKDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // const [selectedDocumentForWorkflow, setSelectedDocumentForWorkflow] = useState<SGKDocument | null>(null);
  // const [showWorkflowModal, setShowWorkflowModal] = useState(false);

  // E-Receipt Query States
  const [eReceiptNo, setEReceiptNo] = useState('');
  const [eReceiptResult, setEReceiptResult] = useState<any>(null);
  const [eReceiptLoading, setEReceiptLoading] = useState(false);

  // Party Reports States
  const [partyReports, setPartyReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Device Rights States
  const [deviceRights, setDeviceRights] = useState<any>(null);
  const [deviceRightsLoading, setDeviceRightsLoading] = useState(false);

  // Saved E-Receipts States
  const [savedEReceipts, setSavedEReceipts] = useState<SavedEReceipt[]>([]);
  const [savedEReceiptsLoading, setSavedEReceiptsLoading] = useState(false);

  // Device Assignment States
  const [deviceAssignments, setDeviceAssignments] = useState<any[]>([]);
  const [deviceAssignmentsLoading, setDeviceAssignmentsLoading] = useState(false);

  // Safe access to party data with fallbacks
  // Safe access to party data with fallbacks (Prioritize HearingProfile)
  // const sgkData = party?.hearingProfile?.sgkInfo || party?.sgkInfo || {};
  const partyId = party?.id || '';
  const sgkStatus = party?.status || 'pending';

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

  // Load all sections data on mount
  useEffect(() => {
    if (partyId) {
      loadSgkDocuments();
      loadDeviceRights();
      loadSavedEReceipts();
      loadAssignedDevices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId]);

  const loadSgkDocuments = async () => {
    if (!partyId) return;
    setDocumentsLoading(true);
    try {
      setSgkDocuments([]);
    } catch (error) {
      console.error('Error loading SGK documents:', error);
      setError('SGK belgeleri yüklenirken hata oluştu');
    } finally {
      setDocumentsLoading(false);
    }
  };

  /*
  const handleFileUpload = async () => {
    if (!selectedFile || !partyId) return;
    setIsLoading(true);
    setError(null);
    try {
      const body = {
        partyId,
        documentType,
        file: selectedFile,
        notes: uploadNotes || undefined,
        autoProcess: false,
      };

      await sgkService.uploadDocument(body);

      showSuccess('Başarılı', 'SGK belgesi başarıyla yüklendi');
      setSuccessMessage('SGK belgesi başarıyla yüklendi');
      setSelectedFile(null);
      setUploadNotes('');
      await loadSgkDocuments();
    } catch (error: unknown) {
      const err = error as Error | null;
      const errorMessage = err?.message || 'Belge yükleme sırasında hata oluştu';
      showError('Hata', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  */

  /*
  const handleViewWorkflow = (document: SGKDocument) => {
    setSelectedDocumentForWorkflow(document);
    setShowWorkflowModal(true);
  };

  const handleWorkflowUpdate = (updatedWorkflow: SGKWorkflow) => {
    setSgkDocuments(prev => prev.map(doc =>
      doc.id === selectedDocumentForWorkflow?.id
        ? { ...doc, workflow: updatedWorkflow }
        : doc
    ));
    showSuccess('Başarılı', 'İş akışı güncellendi');
  };
  */

  // E-Receipt Query Function (matching legacy implementation)
  const queryEReceipt = async () => {
    if (!eReceiptNo.trim()) {
      showError('Hata', 'E-reçete numarası giriniz');
      return;
    }

    setEReceiptLoading(true);
    setEReceiptResult(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockResponse = {
        success: true,
        receiptNo: eReceiptNo,
        receiptDate: new Date().toLocaleDateString('tr-TR'),
        doctorName: 'Dr. Zeynep Kaya',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR'),
        materials: [
          {
            code: 'DMT001',
            name: 'Dijital programlanabilir işitme cihazı - sağ',
            kdv: '0 KDV',
            direction: 'Sağ',
            available: true
          },
          {
            code: 'DMT002',
            name: 'Dijital programlanabilir işitme cihazı - sol',
            kdv: '0 KDV',
            direction: 'Sol',
            available: true
          }
        ]
      };

      setEReceiptResult(mockResponse);
      showSuccess('Başarılı', 'E-reçete bulundu');
    } catch (error: unknown) {
      console.error('E-receipt query error:', error);
      showError('Hata', 'E-reçete sorgulanırken bir hata oluştu');
    } finally {
      setEReceiptLoading(false);
    }
  };

  // Party Report Query Function (matching legacy implementation)
  const queryPartyReport = async () => {
    setReportsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockReports = [
        {
          type: 'İşitme Cihazı Raporu',
          date: '2024-01-15',
          validUntil: '2026-01-15',
          status: 'Geçerli',
          renewalDate: '2025-12-15',
          doctor: 'Dr. Ahmet Yılmaz'
        }
      ];

      setPartyReports(mockReports);
      showSuccess('Başarılı', 'Hasta raporları yüklendi');
    } catch (error: unknown) {
      console.error('Party report query error:', error);
      showError('Hata', 'Hasta raporları sorgulanırken bir hata oluştu');
    } finally {
      setReportsLoading(false);
    }
  };

  // Load Device Rights (matching legacy)
  const loadDeviceRights = async () => {
    setDeviceRightsLoading(true);
    try {
      const mockDeviceRights = {
        deviceRight: (sgkStatus as string) === 'approved',
        batteryRight: (sgkStatus as string) === 'approved',
        lastUpdate: new Date().toISOString(),
        validUntil: (sgkStatus as string) === 'approved' ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null
      };
      setDeviceRights(mockDeviceRights);
    } catch (error: unknown) {
      console.error('Device rights load error:', error);
    } finally {
      setDeviceRightsLoading(false);
    }
  };

  // Load Saved E-Receipts (matching legacy)
  const loadSavedEReceipts = async () => {
    setSavedEReceiptsLoading(true);
    try {
      const mockEReceipts = [
        {
          id: 'er1',
          number: 'ER2024001',
          date: '2024-01-15',
          doctorName: 'Dr. Ahmet Yılmaz',
          validUntil: '2026-01-15',
          status: 'saved' as const,
          materials: [
            {
              code: 'DMT001',
              name: 'Dijital programlanabilir işitme cihazı - sağ',
              applicationDate: '2024-01-15',
              deliveryStatus: 'saved' as const
            },
            {
              code: 'DMT002',
              name: 'Dijital programlanabilir işitme cihazı - sol',
              applicationDate: '2024-01-15',
              deliveryStatus: 'delivered' as const
            }
          ]
        },
        {
          id: 'er2',
          number: 'ER2024002',
          date: '2024-01-20',
          doctorName: 'Dr. Ayşe Kaya',
          validUntil: '2026-01-20',
          status: 'delivered' as const,
          sgkDocumentAvailable: true,
          partyFormAvailable: true,
          materials: [
            {
              code: 'DMT003',
              name: 'Dijital programlanabilir işitme cihazı - sağ',
              applicationDate: '2024-01-20',
              deliveryStatus: 'delivered' as const
            }
          ]
        }
      ];
      setSavedEReceipts(mockEReceipts);
    } catch (error: unknown) {
      console.error('Saved e-receipts load error:', error);
    } finally {
      setSavedEReceiptsLoading(false);
    }
  };

  // Load Assigned Devices (matching legacy)
  const loadAssignedDevices = async () => {
    setDeviceAssignmentsLoading(true);
    try {
      const mockAssignments = [
        {
          id: 'da1',
          deviceId: 'dev001',
          deviceName: 'Oticon Xceed',
          earSide: 'LEFT',
          assignedDate: '2024-01-15',
          status: 'active',
          serialNumber: 'OCX2024001'
        }
      ];
      setDeviceAssignments(mockAssignments);
    } catch (error: unknown) {
      console.error('Device assignments load error:', error);
    } finally {
      setDeviceAssignmentsLoading(false);
    }
  };

  // SGK Operations (matching legacy)
  const querySGKStatus = async () => {
    try {
      showSuccess('Bilgi', 'SGK durumu sorgulanıyor...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      showSuccess('Başarılı', 'SGK durumu güncellendi');
    } catch (error) {
      console.error('SGK status query failed:', error);
      showError('Hata', 'SGK durumu sorgulanırken hata oluştu');
    }
  };

  const generateSGKReport = async () => {
    try {
      showSuccess('Bilgi', 'SGK raporu oluşturuluyor...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      showSuccess('Başarılı', 'SGK raporu başarıyla oluşturuldu');
    } catch (error) {
      console.error('SGK report generation failed:', error);
      showError('Hata', 'SGK raporu oluşturulurken hata oluştu');
    }
  };

  const sendToSGK = async () => {
    try {
      showSuccess('Bilgi', 'SGK\'ya gönderiliyor...');
      await new Promise(resolve => setTimeout(resolve, 2500));
      showSuccess('Başarılı', 'SGK\'ya başarıyla gönderildi');
    } catch (error) {
      console.error('SGK submission failed:', error);
      showError('Hata', 'SGK\'ya gönderilirken hata oluştu');
    }
  };

  const checkSGKDeadlines = async () => {
    try {
      showSuccess('Bilgi', 'SGK süreleri kontrol ediliyor...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSuccess('Başarılı', 'SGK süreleri kontrol edildi');
    } catch (error) {
      console.error('SGK deadline check failed:', error);
      showError('Hata', 'SGK süreleri kontrol edilirken hata oluştu');
    }
  };

  const exportSGKData = async () => {
    try {
      showSuccess('Bilgi', 'SGK verileri dışa aktarılıyor...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      showSuccess('Başarılı', 'SGK verileri başarıyla dışa aktarıldı');
    } catch (error) {
      console.error('SGK data export failed:', error);
      showError('Hata', 'SGK verileri dışa aktarılırken hata oluştu');
    }
  };

  const updateSGKInfo = async () => {
    try {
      showSuccess('Bilgi', 'SGK bilgileri güncelleniyor...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      showSuccess('Başarılı', 'SGK bilgileri güncellendi');
    } catch (error) {
      console.error('SGK info update failed:', error);
      showError('Hata', 'SGK bilgileri güncellenirken hata oluştu');
    }
  };

  const downloadSGKReport = async () => {
    try {
      showSuccess('Bilgi', 'SGK raporu indiriliyor...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSuccess('Başarılı', 'SGK raporu indirildi');
    } catch (error) {
      console.error('SGK report download failed:', error);
      showError('Hata', 'SGK raporu indirilirken hata oluştu');
    }
  };

  // Edit e-receipt function (opens edit modal)
  const editEReceipt = (updatedEReceipt: any) => {
    setSavedEReceipts(prev => prev.map(receipt =>
      receipt.id === updatedEReceipt.id ? updatedEReceipt : receipt
    ));
    showSuccess('Başarılı', 'E-reçete güncellendi');
  };

  // Download party form function
  const downloadPartyForm = (_eReceiptId: string) => {
    // Simulate download
    showSuccess('Başarılı', 'Hasta işlem formu indirildi');
  };

  // Deliver material function (matching legacy)
  const deliverMaterial = (eReceiptId: string, materialCode: string) => {
    setSavedEReceipts(prev => prev.map(receipt => {
      if (receipt.id === eReceiptId) {
        const updatedMaterials = receipt.materials.map(material =>
          material.code === materialCode
            ? { ...material, deliveryStatus: 'delivered' as const }
            : material
        );
        const allDelivered = updatedMaterials.every(m => m.deliveryStatus === 'delivered');
        return {
          ...receipt,
          materials: updatedMaterials,
          status: allDelivered ? 'delivered' as const : receipt.status
        };
      }
      return receipt;
    }));
    showSuccess('Başarılı', 'Malzeme teslim edildi');
  };

  // Deliver all materials function (matching legacy)
  const deliverAllMaterials = (eReceiptId: string) => {
    setSavedEReceipts(prev => prev.map(receipt => {
      if (receipt.id === eReceiptId) {
        return {
          ...receipt,
          materials: receipt.materials.map(material => ({
            ...material,
            deliveryStatus: 'delivered' as const
          })),
          status: 'delivered' as const
        };
      }
      return receipt;
    }));
    showSuccess('Başarılı', 'Tüm malzemeler teslim edildi');
  };

  return (
    <div className="space-y-6">
      {/* Error and Success Messages */}
      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}
      {successMessage && <SuccessMessage message={successMessage} />}

      {/* SGK Status Card */}
      <SGKStatusCard
        party={party}
        onQueryStatus={querySGKStatus}
        onUpdateInfo={updateSGKInfo}
        onDownloadReport={downloadSGKReport}
      />

      {/* E-Receipt Query Section */}
      <EReceiptQuerySection
        eReceiptNo={eReceiptNo}
        setEReceiptNo={setEReceiptNo}
        eReceiptResult={eReceiptResult}
        eReceiptLoading={eReceiptLoading}
        onQueryEReceipt={queryEReceipt}
        onSaveEReceipt={(eReceiptData) => {
          // E-reçeteyi savedEReceipts state'ine ekle
          setSavedEReceipts(prev => [...prev, eReceiptData]);
          showSuccess('Başarılı', 'E-reçete kaydedildi');
          setEReceiptResult(null); // Formu temizle
        }}
        onError={(message) => showError('Hata', message)}
      />

      {/* Party Reports Section */}
      <PartyReportsSection
        partyReports={partyReports}
        reportsLoading={reportsLoading}
        onQueryPartyReport={queryPartyReport}
      />

      {/* Device Rights Section */}
      <DeviceRightsSection
        deviceRights={deviceRights}
        deviceRightsLoading={deviceRightsLoading}
      />

      {/* Saved E-Receipts Section */}
      <SavedEReceiptsSection
        savedEReceipts={savedEReceipts}
        savedEReceiptsLoading={savedEReceiptsLoading}
        onDeliverMaterial={deliverMaterial}
        onDeliverAllMaterials={deliverAllMaterials}
        onEditEReceipt={editEReceipt}
        onDownloadPartyForm={downloadPartyForm}
        onError={(message) => showError('Hata', message)}
      />

      {/* Device Assignment Section */}
      <DeviceAssignmentSection
        deviceAssignments={deviceAssignments}
        deviceAssignmentsLoading={deviceAssignmentsLoading}
      />

      {/* File Upload Section */}
      <FileUploadSection
        sgkDocuments={sgkDocuments}
        documentsLoading={documentsLoading}
        onUploadClick={() => {/* Handle upload modal */ }}
      />

      {/* SGK Operations */}
      <SGKOperationsSection
        onGenerateSGKReport={generateSGKReport}
        onSendToSGK={sendToSGK}
        onCheckSGKDeadlines={checkSGKDeadlines}
        onExportSGKData={exportSGKData}
      />
    </div>
  );
};