import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@x-ear/ui-web';
import { Download, Eye, FileText, Calendar, Filter, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useToastHelpers } from '@x-ear/ui-web';
import { useListSgkEReceiptDelivered } from '../../api/generated/sgk/sgk';
import { unwrapArray } from '../../utils/response-unwrap';

interface DeliveredEReceipt {
  id: string;
  number: string;
  date: string;
  doctorName: string;
  validUntil: string;
  patientName: string;
  patientTcNumber: string;
  materials: Array<{
    code: string;
    name: string;
    applicationDate: string;
    deliveryStatus: 'delivered';
  }>;
  sgkDocumentAvailable: boolean;
  patientFormAvailable: boolean;
  sgkStatus: 'success' | 'processing' | 'error';
}

interface PatientWithEReceipts {
  id: string;
  name: string;
  tcNumber: string;
  phone: string;
  email: string;
  currentMonthReceipts: DeliveredEReceipt[];
}

export const SGKDownloadsPage: React.FC = () => {
  const { success: showSuccess, error: showError } = useToastHelpers();
  const [patients, setPatients] = useState<PatientWithEReceipts[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientWithEReceipts[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showBulkDownload, setShowBulkDownload] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
  const [downloadLogs, setDownloadLogs] = useState<string[]>([]);

  const [selectedEReceipt, setSelectedEReceipt] = useState<DeliveredEReceipt | null>(null);

  // Orval Hook
  const { data: apiResponse, isLoading: isApiLoading } = useListSgkEReceiptDelivered();

  // Sync data from API
  useEffect(() => {
    const data = unwrapArray<PatientWithEReceipts>(apiResponse) || [];
    if (data.length > 0) {
      setPatients(data);
    }
    setLoading(isApiLoading);
  }, [apiResponse, isApiLoading]);

  // Bulk download options
  const [bulkOptions, setBulkOptions] = useState({
    reports: true,
    prescriptions: true,
    processForms: true
  });

  // Available months for filtering
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    patients.forEach(patient => {
      patient.currentMonthReceipts.forEach(receipt => {
        const date = new Date(receipt.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthKey);
      });
    });
    return Array.from(months).sort().reverse();
  }, [patients]);



  useEffect(() => {
    filterPatients();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, selectedMonth]);



  const filterPatients = () => {
    if (!selectedMonth) {
      setFilteredPatients(patients);
      return;
    }

    const filtered = patients.filter(patient => {
      return patient.currentMonthReceipts.some(receipt => {
        const date = new Date(receipt.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === selectedMonth;
      });
    });

    setFilteredPatients(filtered);
  };

  const formatMonthName = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
  };

  const togglePatientSelection = (patientId: string) => {
    const newSelected = new Set(selectedPatients);
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId);
    } else {
      newSelected.add(patientId);
    }
    setSelectedPatients(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPatients.size === filteredPatients.length) {
      setSelectedPatients(new Set());
    } else {
      setSelectedPatients(new Set(filteredPatients.map(p => p.id)));
    }
  };

  const downloadPatientDocument = async (patientId: string, docType: 'report' | 'prescription' | 'form') => {
    const patient = filteredPatients.find(p => p.id === patientId);
    if (!patient) return;

    try {
      // Simulate download
      await new Promise(resolve => setTimeout(resolve, 1000));

      const docName = docType === 'report' ? 'Rapor' :
        docType === 'prescription' ? 'Reçete' : 'İşlem Formu';

      showSuccess('Başarılı', `${patient.name} için ${docName} indirildi`);
    } catch (error) {
      showError('Hata', 'Belge indirilirken bir hata oluştu');
    }
  };

  const downloadAllPatientDocuments = async (patientId: string) => {
    const patient = filteredPatients.find(p => p.id === patientId);
    if (!patient) return;

    setDownloading(true);
    setDownloadLogs([]);

    try {
      const docs: string[] = [];
      if (bulkOptions.reports) docs.push('Rapor');
      if (bulkOptions.prescriptions) docs.push('Reçete');
      if (bulkOptions.processForms) docs.push('İşlem Formu');

      setDownloadProgress({ current: 0, total: docs.length });

      for (let i = 0; i < docs.length; i++) {
        setDownloadLogs(prev => [...prev, `${patient.name} - ${docs[i]} hazırlanıyor...`]);
        setDownloadProgress({ current: i + 1, total: docs.length });

        // Simulate download delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setDownloadLogs(prev => [...prev.slice(0, -1), `✓ ${patient.name} - ${docs[i]} indirildi`]);
      }

      showSuccess('Başarılı', `${patient.name} için ${docs.length} belge indirildi`);
    } catch (error) {
      showError('Hata', 'Belgeler indirilirken bir hata oluştu');
    } finally {
      setDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  const startBulkDownload = async () => {
    const selectedPatientList = filteredPatients.filter(p => selectedPatients.has(p.id));
    if (selectedPatientList.length === 0) {
      showError('Hata', 'Lütfen en az bir hasta seçin');
      return;
    }

    setDownloading(true);
    setDownloadLogs([]);
    setShowBulkDownload(false);

    try {
      const docsPerPatient = (bulkOptions.reports ? 1 : 0) +
        (bulkOptions.prescriptions ? 1 : 0) +
        (bulkOptions.processForms ? 1 : 0);

      const totalDocs = selectedPatientList.length * docsPerPatient;
      setDownloadProgress({ current: 0, total: totalDocs });

      let completed = 0;

      for (const patient of selectedPatientList) {
        const docs: string[] = [];
        if (bulkOptions.reports) docs.push('Rapor');
        if (bulkOptions.prescriptions) docs.push('Reçete');
        if (bulkOptions.processForms) docs.push('İşlem Formu');

        for (const doc of docs) {
          setDownloadLogs(prev => [...prev, `${patient.name} - ${doc} hazırlanıyor...`]);
          setDownloadProgress({ current: completed + 1, total: totalDocs });

          // Simulate download delay
          await new Promise(resolve => setTimeout(resolve, 600));

          completed++;
          setDownloadLogs(prev => [...prev.slice(0, -1), `✓ ${patient.name} - ${doc} indirildi`]);
        }
      }

      showSuccess('Başarılı', `${selectedPatientList.length} hasta için ${totalDocs} belge indirildi`);
      setSelectedPatients(new Set());
    } catch (error) {
      showError('Hata', 'Toplu indirme sırasında bir hata oluştu');
    } finally {
      setDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'SGK Onaylandı';
      case 'processing':
        return 'SGK İşleniyor';
      case 'error':
        return 'SGK Hatası';
      default:
        return 'Bilinmiyor';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-3 text-lg text-gray-600">Yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SGK Belge İndir</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Bu ay kaydedilen e-reçeteler için belgelerinizi indirin</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Tüm Aylar</option>
                  {availableMonths.map(month => (
                    <option key={month} value={month}>
                      {formatMonthName(month)}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={() => setShowBulkDownload(!showBulkDownload)}
                disabled={selectedPatients.size === 0}
                className="bg-primary hover:bg-primary-dark text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Toplu İndir ({selectedPatients.size})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Download Panel */}
      {showBulkDownload && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mx-4 sm:mx-6 lg:mx-8 mt-6 p-4">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">Toplu İndirme</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={bulkOptions.reports}
                  onChange={(e) => setBulkOptions(prev => ({ ...prev, reports: e.target.checked }))}
                  className="mr-2"
                />
                <span className="font-medium dark:text-gray-200">Rapor Belgeleri</span>
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">SGK onaylı rapor belgelerini indir</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={bulkOptions.prescriptions}
                  onChange={(e) => setBulkOptions(prev => ({ ...prev, prescriptions: e.target.checked }))}
                  className="mr-2"
                />
                <span className="font-medium dark:text-gray-200">E-Reçete Belgeleri</span>
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">E-reçete onay belgelerini indir</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={bulkOptions.processForms}
                  onChange={(e) => setBulkOptions(prev => ({ ...prev, processForms: e.target.checked }))}
                  className="mr-2"
                />
                <span className="font-medium dark:text-gray-200">Hasta İşlem Formları</span>
              </label>
              <p className="text-sm text-gray-600 dark:text-gray-400">Hasta işlem ve teslim formlarını indir</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Toplam <span className="font-semibold">{selectedPatients.size}</span> hasta için belgeler indirilecek
            </p>
            <div className="space-x-2">
              <Button
                onClick={() => setShowBulkDownload(false)}
                variant="outline"
              >
                İptal
              </Button>
              <Button
                onClick={startBulkDownload}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                İndirmeyi Başlat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Modal */}
      {downloading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Belgeler İndiriliyor</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm dark:text-gray-300">
                  <span>İlerleme</span>
                  <span>{downloadProgress.current}/{downloadProgress.total}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress.total > 0 ? (downloadProgress.current / downloadProgress.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                  {downloadLogs.map((log, index) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                E-Reçete Belgeleri
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">({filteredPatients.length})</span>
              </h2>
              <div className="flex items-center space-x-2">
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={selectedPatients.size === filteredPatients.length && filteredPatients.length > 0}
                    onChange={toggleSelectAll}
                    className="mr-2"
                  />
                  Tümünü Seç
                </label>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <div key={patient.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedPatients.has(patient.id)}
                          onChange={() => togglePatientSelection(patient.id)}
                          className="mr-3"
                        />
                      </label>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{patient.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">TC: {patient.tcNumber}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{patient.currentMonthReceipts.length} e-reçete</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadPatientDocument(patient.id, 'report')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        📄 Rapor
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadPatientDocument(patient.id, 'prescription')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        📋 Reçete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadPatientDocument(patient.id, 'form')}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        📝 İşlem Formu
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadAllPatientDocuments(patient.id)}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Tümü
                      </Button>
                    </div>
                  </div>

                  {/* E-receipt details */}
                  <div className="mt-3 pl-7">
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                        E-reçete detayları ({patient.currentMonthReceipts.length})
                      </summary>
                      <div className="mt-2 space-y-2">
                        {patient.currentMonthReceipts.map((receipt) => (
                          <div key={receipt.id} className="bg-gray-50 dark:bg-gray-900 p-2 rounded border-l-4 border-blue-400 dark:border-blue-500">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">E-Reçete #{receipt.number}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{receipt.doctorName}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{new Date(receipt.date).toLocaleDateString('tr-TR')}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{receipt.materials.length} malzeme</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(receipt.sgkStatus)}
                                  <span className="text-xs text-gray-600">{getStatusText(receipt.sgkStatus)}</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedEReceipt(receipt)}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>Seçilen ay için e-reçete bulunamadı.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* E-Receipt Detail Modal */}
      {selectedEReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold dark:text-white">E-Reçete Detayları - {selectedEReceipt.number}</h3>
                <button
                  onClick={() => setSelectedEReceipt(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hasta</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedEReceipt.patientName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">TC Kimlik</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedEReceipt.patientTcNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Doktor</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedEReceipt.doctorName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tarih</label>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(selectedEReceipt.date).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Geçerlilik</label>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(selectedEReceipt.validUntil).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SGK Durumu</label>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(selectedEReceipt.sgkStatus)}
                      <span className="text-sm text-gray-900 dark:text-white">{getStatusText(selectedEReceipt.sgkStatus)}</span>
                    </div>
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Teslim Edilen Malzemeler</label>
                  <div className="space-y-3">
                    {selectedEReceipt.materials.map((material, index) => (
                      <div key={`${material.code}-${index}`} className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-green-800 dark:text-green-300">{material.name}</p>
                            <p className="text-sm text-green-600 dark:text-green-400">Kod: {material.code}</p>
                            <p className="text-sm text-green-600 dark:text-green-400">Başvuru Tarihi: {new Date(material.applicationDate).toLocaleDateString('tr-TR')}</p>
                          </div>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">
                            Teslim Edildi
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  {selectedEReceipt.patientFormAvailable && (
                    <Button
                      onClick={() => downloadPatientDocument(selectedEReceipt.patientTcNumber, 'form')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Hasta İşlem Formunu İndir
                    </Button>
                  )}
                  <Button onClick={() => setSelectedEReceipt(null)} variant="outline">
                    Kapat
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};