// SGK Page Component
// Main page for SGK document management, workflow, and e-receipt processing

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SGKDocument,
  SGKStats,
  SGKDocumentFilters,
  SGKWorkflow as SGKWorkflowType
} from '../types/sgk';
import { sgkService } from '../services/sgk.service';
import { SGKDocumentList } from '../components/SGKDocumentList';
import { SGKWorkflow } from '../components/SGKWorkflow';
import { SGKUpload } from '../components/SGKUpload';
import { SGKDownloadsPage } from './sgk/SGKDownloadsPage';
import { Button } from '@x-ear/ui-web';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';

type TabType = 'documents' | 'upload' | 'downloads' | 'stats' | 'workflow';

export const SGKPage: React.FC = () => {
  const { t } = useTranslation('sgk');
  const [activeTab, setActiveTab] = useState<TabType>('documents');
  const [stats, setStats] = useState<SGKStats | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<SGKDocument | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<SGKWorkflowType | null>(null);
  const [filters] = useState<SGKDocumentFilters>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadStats();
  }, [refreshKey]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const statsData = await sgkService.getStats();
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToLoadStats', 'Failed to load stats'));
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSelect = async (document: SGKDocument) => {
    setSelectedDocument(document);

    // Load workflow for the document
    try {
      const workflow = await sgkService.getWorkflow(document.id);
      setSelectedWorkflow(workflow as SGKWorkflowType);
      setActiveTab('workflow');
    } catch (err) {
      console.error('Failed to load workflow:', err);
    }
  };

  const handleUploadComplete = (document: SGKDocument) => {
    setRefreshKey(prev => prev + 1);
    setSelectedDocument(document);
    setActiveTab('documents');
  };

  const handleUploadError = (error: string) => {
    setError(error);
  };

  const handleWorkflowUpdate = (workflow: SGKWorkflowType) => {
    setSelectedWorkflow(workflow);
    setRefreshKey(prev => prev + 1);
  };

  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case 'documents':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'upload':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
      case 'downloads':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'workflow':
        return (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    if (status === 'rejected' || status === 'cancelled') return 'text-destructive';
    if (status === 'approved' || status === 'completed') return 'text-success';
    if (status === 'under_review' || status === 'submitted') return 'text-yellow-600';
    if (status === 'paid') return 'text-purple-600';
    return 'text-muted-foreground';
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg text-muted-foreground">{t('loadingData', 'SGK verileri yükleniyor...')}</span>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <DesktopPageHeader
          title={t('management', 'SGK Yönetimi')}
          description={t('managementDescription', 'Belge yönetimi, iş akışı ve e-reçete işlemleri')}
          eyebrow={{ tr: t('healthcareOps', 'Sağlık Operasyonları'), en: 'Healthcare Ops' }}
          actions={stats ? (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-center dark:border-white/10 dark:bg-white/5">
                <div className="text-2xl font-bold text-primary">{stats.totalDocuments}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('totalDocuments', 'Toplam Belge')}</div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-center dark:border-white/10 dark:bg-white/5">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-300">{stats.pendingApprovals}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('pendingApprovals', 'Bekleyen Onay')}</div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-center dark:border-white/10 dark:bg-white/5">
                <div className="text-2xl font-bold text-success">{formatCurrency(stats.totalValue)}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('totalValue', 'Toplam Değer')}</div>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-center dark:border-white/10 dark:bg-white/5">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-300">{Math.round(stats.approvalRate)}%</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('approvalRate', 'Onay Oranı')}</div>
              </div>
            </div>
          ) : null}
        />
      </div>
      {/* Error Banner */}
      {error && (
        <div className="bg-destructive/10 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-destructive"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-900 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'documents', label: t('tabs.documents', 'Belgeler') },
              { id: 'upload', label: t('tabs.upload', 'Yükle') },
              { id: 'downloads', label: t('tabs.downloads', 'Belge İndir') },
              { id: 'workflow', label: t('tabs.workflow', 'İş Akışı') },
              { id: 'stats', label: t('tabs.stats', 'İstatistikler') }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`${activeTab === tab.id
                  ? 'border-blue-500 text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                {getTabIcon(tab.id as TabType)}
                <span>{tab.label}</span>
              </Button>
            ))}
          </nav>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <SGKDocumentList
              filters={filters}
              onDocumentSelect={handleDocumentSelect}
              onDocumentEdit={(document) => {
                setSelectedDocument(document);
                // Could open edit modal here
              }}
              onDocumentDelete={() => {
                setRefreshKey(prev => prev + 1);
              }}
              onWorkflowUpdate={() => {
                setRefreshKey(prev => prev + 1);
              }}
            />
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-card shadow rounded-2xl p-6">
              <h2 className="text-lg font-medium text-foreground mb-6">{t('uploadNewDocument', 'Yeni Belge Yükle')}</h2>
              <SGKUpload
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                autoProcess={true}
              />
            </div>
          </div>
        )}

        {activeTab === 'downloads' && (
          <div className="space-y-6">
            <SGKDownloadsPage />
          </div>
        )}

        {activeTab === 'workflow' && (
          <div className="space-y-6">
            {selectedDocument ? (
              <div>
                <div className="bg-card shadow rounded-2xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-medium text-foreground">
                        {t('workflow', 'İş Akışı')}: {selectedDocument.filename}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {t('documentId', 'Belge ID')}: {selectedDocument.id}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedDocument(null);
                        setSelectedWorkflow(null);
                      }}
                      className="text-muted-foreground hover:text-muted-foreground"
                      variant='default'>
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>

                  <SGKWorkflow
                    document={selectedDocument}
                    workflow={selectedWorkflow || undefined}
                    onWorkflowUpdate={handleWorkflowUpdate}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-card shadow rounded-2xl p-12">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-foreground">{t('noDocumentSelected', 'Belge seçilmedi')}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('selectDocumentForWorkflow', 'İş akışını görüntülemek için bir belge seçin.')}
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => setActiveTab('documents')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white premium-gradient tactile-press focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                      variant='default'>
                      {t('goToDocuments', 'Belgelere Git')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-card overflow-hidden shadow rounded-2xl">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-muted-foreground truncate">{t('totalDocuments', 'Toplam Belge')}</dt>
                        <dd className="text-lg font-medium text-foreground">{stats.totalDocuments}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card overflow-hidden shadow rounded-2xl">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-muted-foreground truncate">{t('pendingApprovals', 'Bekleyen Onay')}</dt>
                        <dd className="text-lg font-medium text-foreground">{stats.pendingApprovals}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card overflow-hidden shadow rounded-2xl">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-muted-foreground truncate">{t('totalValue', 'Toplam Değer')}</dt>
                        <dd className="text-lg font-medium text-foreground">{formatCurrency(stats.totalValue)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-card overflow-hidden shadow rounded-2xl">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-muted-foreground truncate">{t('approvalRate', 'Onay Oranı')}</dt>
                        <dd className="text-lg font-medium text-foreground">{Math.round(stats.approvalRate)}%</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Types */}
            <div className="bg-card shadow rounded-2xl">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-foreground mb-4">
                  {t('documentTypes', 'Belge Türleri')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <div key={type} className="text-center">
                      <div className="text-2xl font-bold text-primary">{count}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {type === 'recete' ? t('docType.eReceipt', 'E-Reçete') :
                          type === 'rapor' ? t('docType.report', 'Rapor') :
                            type === 'belge' ? t('docType.document', 'Belge') :
                              type === 'fatura' ? t('docType.invoice', 'Fatura') :
                                type === 'teslim' ? t('docType.delivery', 'Teslim') :
                                  type === 'iade' ? t('docType.return', 'İade') : type}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-card shadow rounded-2xl">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-foreground mb-4">
                  {t('statusDistribution', 'Durum Dağılımı')}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} className="text-center">
                      <div className={`text-2xl font-bold ${getStatusColor(status)}`}>
                        {count}
                      </div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {status === 'draft' ? t('status.draft', 'Taslak') :
                          status === 'submitted' ? t('status.submitted', 'Gönderildi') :
                            status === 'under_review' ? t('status.underReview', 'İnceleniyor') :
                              status === 'approved' ? t('status.approved', 'Onaylandı') :
                                status === 'rejected' ? t('status.rejected', 'Reddedildi') :
                                  status === 'paid' ? t('status.paid', 'Ödendi') :
                                    status === 'completed' ? t('status.completed', 'Tamamlandı') :
                                      status === 'cancelled' ? t('status.cancelled', 'İptal') : status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
