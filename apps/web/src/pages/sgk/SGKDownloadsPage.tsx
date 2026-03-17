import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Select } from '@x-ear/ui-web';
import { Download, Eye, FileText, Filter, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useToastHelpers } from '@x-ear/ui-web';
import { useListSgkEReceiptDelivered } from '../../api/generated/sgk/sgk.ts';
import { unwrapArray } from '../../utils/response-unwrap';
import { DesktopPageHeader } from '../../components/layout/DesktopPageHeader';

interface DeliveredEReceipt {
  id: string;
  number: string;
  date: string;
  doctorName: string;
  validUntil: string;
  partyName: string;
  partyTcNumber: string;
  materials: Array<{
    code: string;
    name: string;
    applicationDate: string;
    deliveryStatus: 'delivered';
  }>;
  sgkDocumentAvailable: boolean;
  partyFormAvailable: boolean;
  sgkStatus: 'success' | 'processing' | 'error';
}

interface PartyWithEReceipts {
  id: string;
  name: string;
  tcNumber: string;
  phone: string;
  email: string;
  currentMonthReceipts: DeliveredEReceipt[];
}

export const SGKDownloadsPage: React.FC = () => {
  const { t } = useTranslation('sgk');
  const { success: showSuccess, error: showError } = useToastHelpers();
  const [parties, setParties] = useState<PartyWithEReceipts[]>([]);
  const [filteredParties, setFilteredParties] = useState<PartyWithEReceipts[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedParties, setSelectedParties] = useState<Set<string>>(new Set());
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
    const data = unwrapArray<PartyWithEReceipts>(apiResponse) || [];
    if (data.length > 0) {
      setParties(data);
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
    parties.forEach(party => {
      party.currentMonthReceipts.forEach(receipt => {
        const date = new Date(receipt.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthKey);
      });
    });
    return Array.from(months).sort().reverse();
  }, [parties]);



  useEffect(() => {
    filterParties();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parties, selectedMonth]);



  const filterParties = () => {
    if (!selectedMonth) {
      setFilteredParties(parties);
      return;
    }

    const filtered = parties.filter(party => {
      return party.currentMonthReceipts.some(receipt => {
        const date = new Date(receipt.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        return monthKey === selectedMonth;
      });
    });

    setFilteredParties(filtered);
  };

  const formatMonthName = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' });
  };

  const togglePartySelection = (partyId: string) => {
    const newSelected = new Set(selectedParties);
    if (newSelected.has(partyId)) {
      newSelected.delete(partyId);
    } else {
      newSelected.add(partyId);
    }
    setSelectedParties(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedParties.size === filteredParties.length) {
      setSelectedParties(new Set());
    } else {
      setSelectedParties(new Set(filteredParties.map(p => p.id)));
    }
  };

  const downloadPartyDocument = async (partyId: string, docType: 'report' | 'prescription' | 'form') => {
    const party = filteredParties.find(p => p.id === partyId);
    if (!party) return;

    try {
      // Simulate download
      await new Promise(resolve => setTimeout(resolve, 1000));

      const docName = docType === 'report' ? t('report', 'Rapor') :
        docType === 'prescription' ? t('prescription', 'Reçete') : t('processForm', 'İşlem Formu');

      showSuccess(t('success', 'Başarılı'), t('documentDownloaded', '{{name}} için {{docName}} indirildi', { name: party.name, docName }));
    } catch (error) {
      showError(t('error', 'Hata'), t('downloadError', 'Belge indirilirken bir hata oluştu'));
    }
  };

  const downloadAllPartyDocuments = async (partyId: string) => {
    const party = filteredParties.find(p => p.id === partyId);
    if (!party) return;

    setDownloading(true);
    setDownloadLogs([]);

    try {
      const docs: string[] = [];
      if (bulkOptions.reports) docs.push(t('report', 'Rapor'));
      if (bulkOptions.prescriptions) docs.push(t('prescription', 'Reçete'));
      if (bulkOptions.processForms) docs.push(t('processForm', 'İşlem Formu'));

      setDownloadProgress({ current: 0, total: docs.length });

      for (let i = 0; i < docs.length; i++) {
        setDownloadLogs(prev => [...prev, `${party.name} - ${docs[i]} ${t('preparing', 'hazırlanıyor')}...`]);
        setDownloadProgress({ current: i + 1, total: docs.length });

        // Simulate download delay
        await new Promise(resolve => setTimeout(resolve, 800));
        setDownloadLogs(prev => [...prev.slice(0, -1), `${party.name} - ${docs[i]} ${t('downloaded', 'indirildi')}`]);
      }

      showSuccess(t('success', 'Başarılı'), t('documentsDownloadedCount', '{{name}} için {{count}} belge indirildi', { name: party.name, count: docs.length }));
    } catch (error) {
      showError(t('error', 'Hata'), t('documentsDownloadError', 'Belgeler indirilirken bir hata oluştu'));
    } finally {
      setDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  const startBulkDownload = async () => {
    const selectedPartyList = filteredParties.filter(p => selectedParties.has(p.id));
    if (selectedPartyList.length === 0) {
      showError(t('error', 'Hata'), t('selectAtLeastOnePatient', 'Lütfen en az bir hasta seçin'));
      return;
    }

    setDownloading(true);
    setDownloadLogs([]);
    setShowBulkDownload(false);

    try {
      const docsPerParty = (bulkOptions.reports ? 1 : 0) +
        (bulkOptions.prescriptions ? 1 : 0) +
        (bulkOptions.processForms ? 1 : 0);

      const totalDocs = selectedPartyList.length * docsPerParty;
      setDownloadProgress({ current: 0, total: totalDocs });

      let completed = 0;

      for (const party of selectedPartyList) {
        const docs: string[] = [];
        if (bulkOptions.reports) docs.push(t('report', 'Rapor'));
        if (bulkOptions.prescriptions) docs.push(t('prescription', 'Reçete'));
        if (bulkOptions.processForms) docs.push(t('processForm', 'İşlem Formu'));

        for (const doc of docs) {
          setDownloadLogs(prev => [...prev, `${party.name} - ${doc} ${t('preparing', 'hazırlanıyor')}...`]);
          setDownloadProgress({ current: completed + 1, total: totalDocs });

          // Simulate download delay
          await new Promise(resolve => setTimeout(resolve, 600));

          completed++;
          setDownloadLogs(prev => [...prev.slice(0, -1), `${party.name} - ${doc} ${t('downloaded', 'indirildi')}`]);
        }
      }

      showSuccess(t('success', 'Başarılı'), t('bulkDownloadSuccess', '{{patientCount}} hasta için {{docCount}} belge indirildi', { patientCount: selectedPartyList.length, docCount: totalDocs }));
      setSelectedParties(new Set());
    } catch (error) {
      showError(t('error', 'Hata'), t('bulkDownloadError', 'Toplu indirme sırasında bir hata oluştu'));
    } finally {
      setDownloading(false);
      setDownloadProgress({ current: 0, total: 0 });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return t('sgkApproved', 'SGK Onaylandı');
      case 'processing':
        return t('sgkProcessing', 'SGK İşleniyor');
      case 'error':
        return t('sgkError', 'SGK Hatası');
      default:
        return t('unknown', 'Bilinmiyor');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3 text-lg text-muted-foreground">{t('loading', 'Yükleniyor...')}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <DesktopPageHeader
          title={t('downloads.title', 'SGK Belge İndir')}
          description={t('downloads.description', 'Bu ay kaydedilen e-reçeteler için belgelerinizi indirin')}
          icon={<FileText className="w-6 h-6" />}
          eyebrow={{ tr: t('downloads.eyebrow', 'Belge İndirme'), en: 'Document Downloads' }}
          actions={(
            <>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  options={[
                    { value: '', label: t('allMonths', 'Tüm Aylar') },
                    ...availableMonths.map(month => ({
                      value: month,
                      label: formatMonthName(month)
                    }))
                  ]}
                  className="rounded-xl border-border shadow-sm focus:border-primary focus:ring-primary dark:bg-gray-700 dark:text-white"
                />
              </div>
              <Button
                onClick={() => setShowBulkDownload(!showBulkDownload)}
                disabled={selectedParties.size === 0}
                className="bg-primary hover:bg-primary-dark text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                {t('bulkDownload', 'Toplu İndir')} ({selectedParties.size})
              </Button>
            </>
          )}
        />
      </div>

      {/* Bulk Download Panel */}
      {showBulkDownload && (
        <div className="bg-primary/10 border border-blue-200 dark:border-blue-800 rounded-2xl mx-4 sm:mx-6 lg:mx-8 mt-6 p-4">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">{t('bulkDownloadTitle', 'Toplu İndirme')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  data-allow-raw="true"
                  type="checkbox"
                  checked={bulkOptions.reports}
                  onChange={(e) => setBulkOptions(prev => ({ ...prev, reports: e.target.checked }))}
                  className="mr-2"
                />
                <span className="font-medium dark:text-gray-200">{t('reportDocuments', 'Rapor Belgeleri')}</span>
              </label>
              <p className="text-sm text-muted-foreground">{t('downloadApprovedReports', 'SGK onaylı rapor belgelerini indir')}</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  data-allow-raw="true"
                  type="checkbox"
                  checked={bulkOptions.prescriptions}
                  onChange={(e) => setBulkOptions(prev => ({ ...prev, prescriptions: e.target.checked }))}
                  className="mr-2"
                />
                <span className="font-medium dark:text-gray-200">{t('eReceiptDocuments', 'E-Reçete Belgeleri')}</span>
              </label>
              <p className="text-sm text-muted-foreground">{t('downloadEReceiptApprovals', 'E-reçete onay belgelerini indir')}</p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  data-allow-raw="true"
                  type="checkbox"
                  checked={bulkOptions.processForms}
                  onChange={(e) => setBulkOptions(prev => ({ ...prev, processForms: e.target.checked }))}
                  className="mr-2"
                />
                <span className="font-medium dark:text-gray-200">{t('patientProcessForms', 'Hasta İşlem Formları')}</span>
              </label>
              <p className="text-sm text-muted-foreground">{t('downloadPatientForms', 'Hasta işlem ve teslim formlarını indir')}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t('totalPatientsToDownload', 'Toplam {{count}} hasta için belgeler indirilecek', { count: selectedParties.size })}
            </p>
            <div className="space-x-2">
              <Button
                onClick={() => setShowBulkDownload(false)}
                variant="outline"
              >
                {t('cancel', 'İptal')}
              </Button>
              <Button
                onClick={startBulkDownload}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {t('startDownload', 'İndirmeyi Başlat')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Modal */}
      {downloading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('downloadingDocuments', 'Belgeler İndiriliyor')}</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm dark:text-gray-300">
                  <span>{t('progress', 'İlerleme')}</span>
                  <span>{downloadProgress.current}/{downloadProgress.total}</span>
                </div>
                <div className="w-full bg-accent rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress.total > 0 ? (downloadProgress.current / downloadProgress.total) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900 p-2 rounded">
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-border">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('eReceiptDocumentsTitle', 'E-Reçete Belgeleri')}
                <span className="ml-2 text-sm font-normal text-muted-foreground">({filteredParties.length})</span>
              </h2>
              <div className="flex items-center space-x-2">
                <label className="flex items-center text-sm">
                  <input
                    data-allow-raw="true"
                    type="checkbox"
                    checked={selectedParties.size === filteredParties.length && filteredParties.length > 0}
                    onChange={toggleSelectAll}
                    className="mr-2"
                  />
                  {t('selectAll', 'Tümünü Seç')}
                </label>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredParties.length > 0 ? (
              filteredParties.map((party) => (
                <div key={party.id} className="p-4 hover:bg-muted dark:hover:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          data-allow-raw="true"
                          type="checkbox"
                          checked={selectedParties.has(party.id)}
                          onChange={() => togglePartySelection(party.id)}
                          className="mr-3"
                        />
                      </label>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{party.name}</h3>
                        <p className="text-sm text-muted-foreground">TC: {party.tcNumber}</p>
                        <p className="text-sm text-muted-foreground">{party.currentMonthReceipts.length} e-reçete</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadPartyDocument(party.id, 'report')}
                        className="premium-gradient tactile-press text-white"
                      >
                        📄 Rapor
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadPartyDocument(party.id, 'prescription')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        📋 Reçete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadPartyDocument(party.id, 'form')}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        📝 İşlem Formu
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => downloadAllPartyDocuments(party.id)}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        {t('all', 'Tümü')}
                      </Button>
                    </div>
                  </div>

                  {/* E-receipt details */}
                  <div className="mt-3 pl-7">
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-gray-900 dark:hover:text-gray-200">
                        E-reçete detayları ({party.currentMonthReceipts.length})
                      </summary>
                      <div className="mt-2 space-y-2">
                        {party.currentMonthReceipts.map((receipt) => (
                          <div key={receipt.id} className="bg-gray-50 dark:bg-gray-900 p-2 rounded border-l-4 border-blue-400 dark:border-blue-500">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">E-Reçete #{receipt.number}</p>
                                <p className="text-xs text-muted-foreground">{receipt.doctorName}</p>
                                <p className="text-xs text-muted-foreground">{new Date(receipt.date).toLocaleDateString('tr-TR')}</p>
                                <p className="text-xs text-muted-foreground">{receipt.materials.length} malzeme</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1">
                                  {getStatusIcon(receipt.sgkStatus)}
                                  <span className="text-xs text-muted-foreground">{getStatusText(receipt.sgkStatus)}</span>
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
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p>{t('noEReceiptsFound', 'Seçilen ay için e-reçete bulunamadı.')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* E-Receipt Detail Modal */}
      {selectedEReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold dark:text-white">{t('eReceiptDetails', 'E-Reçete Detayları')} - {selectedEReceipt.number}</h3>
                <Button
                  onClick={() => setSelectedEReceipt(null)}
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-muted-foreground"
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('patient', 'Hasta')}</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedEReceipt.partyName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('tcId', 'TC Kimlik')}</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedEReceipt.partyTcNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('doctor', 'Doktor')}</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedEReceipt.doctorName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('date', 'Tarih')}</label>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(selectedEReceipt.date).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('validity', 'Geçerlilik')}</label>
                    <p className="text-sm text-gray-900 dark:text-white">{new Date(selectedEReceipt.validUntil).toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground">{t('sgkStatus', 'SGK Durumu')}</label>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(selectedEReceipt.sgkStatus)}
                      <span className="text-sm text-gray-900 dark:text-white">{getStatusText(selectedEReceipt.sgkStatus)}</span>
                    </div>
                  </div>
                </div>

                {/* Materials */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-4">{t('deliveredMaterials', 'Teslim Edilen Malzemeler')}</label>
                  <div className="space-y-3">
                    {selectedEReceipt.materials.map((material, index) => (
                      <div key={`${material.code}-${index}`} className="border rounded-2xl p-4 bg-success/10 border-green-200 dark:border-green-800">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-success">{material.name}</p>
                            <p className="text-sm text-success">Kod: {material.code}</p>
                            <p className="text-sm text-success">Başvuru Tarihi: {new Date(material.applicationDate).toLocaleDateString('tr-TR')}</p>
                          </div>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-success/10 text-success">
                            {t('delivered', 'Teslim Edildi')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  {selectedEReceipt.partyFormAvailable && (
                    <Button
                      onClick={() => downloadPartyDocument(selectedEReceipt.partyTcNumber, 'form')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('downloadPatientForm', 'Hasta İşlem Formunu İndir')}
                    </Button>
                  )}
                  <Button onClick={() => setSelectedEReceipt(null)} variant="outline">
                    {t('close', 'Kapat')}
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
