// SGK Page Component
// Main page for SGK document management, workflow, and e-receipt processing

import React, { useState, useEffect } from 'react';
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

type TabType = 'documents' | 'upload' | 'downloads' | 'stats' | 'workflow';

export const SGKPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('documents');
  const [stats, setStats] = useState<SGKStats | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<SGKDocument | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<SGKWorkflowType | null>(null);
  const [filters, _setFilters] = useState<SGKDocumentFilters>({});
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
      setError(err instanceof Error ? err.message : 'Failed to load stats');
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

  const getStatusColor = (status: string, _value: number): string => {
    if (status === 'rejected' || status === 'cancelled') return 'text-red-600';
    if (status === 'approved' || status === 'completed') return 'text-green-600';
    if (status === 'under_review' || status === 'submitted') return 'text-yellow-600';
    if (status === 'paid') return 'text-purple-600';
    return 'text-gray-600';
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg text-gray-600">SGK verileri yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SGK Yönetimi</h1>
              <p className="mt-1 text-sm text-gray-500">
                Belge yönetimi, iş akışı ve e-reçete işlemleri
              </p>
            </div>
            
            {/* Quick Stats */}
            {stats && (
              <div className="flex space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalDocuments}</div>
                  <div className="text-xs text-gray-500">Toplam Belge</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingApprovals}</div>
                  <div className="text-xs text-gray-500">Bekleyen Onay</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalValue)}</div>
                  <div className="text-xs text-gray-500">Toplam Değer</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{Math.round(stats.approvalRate)}%</div>
                  <div className="text-xs text-gray-500">Onay Oranı</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <div className="ml-auto pl-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
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
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'documents', label: 'Belgeler' },
              { id: 'upload', label: 'Yükle' },
              { id: 'downloads', label: 'Belge İndir' },
              { id: 'workflow', label: 'İş Akışı' },
              { id: 'stats', label: 'İstatistikler' }
            ].map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
              onWorkflowUpdate={(_documentId, _status) => {
                setRefreshKey(prev => prev + 1);
              }}
            />
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Yeni Belge Yükle</h2>
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
                <div className="bg-white shadow rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">
                        İş Akışı: {selectedDocument.filename}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Belge ID: {selectedDocument.id}
                      </p>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedDocument(null);
                        setSelectedWorkflow(null);
                      }}
                      className="text-gray-400 hover:text-gray-600"
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
              <div className="bg-white shadow rounded-lg p-12">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Belge seçilmedi</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    İş akışını görüntülemek için bir belge seçin.
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => setActiveTab('documents')}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      variant='default'>
                      Belgelere Git
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
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Toplam Belge</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.totalDocuments}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Bekleyen Onay</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.pendingApprovals}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Toplam Değer</dt>
                        <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.totalValue)}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Onay Oranı</dt>
                        <dd className="text-lg font-medium text-gray-900">{Math.round(stats.approvalRate)}%</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Types */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Belge Türleri
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <div key={type} className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{count}</div>
                      <div className="text-sm text-gray-500 capitalize">
                        {type === 'recete' ? 'E-Reçete' :
                         type === 'rapor' ? 'Rapor' :
                         type === 'belge' ? 'Belge' :
                         type === 'fatura' ? 'Fatura' :
                         type === 'teslim' ? 'Teslim' :
                         type === 'iade' ? 'İade' : type}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Durum Dağılımı
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <div key={status} className="text-center">
                      <div className={`text-2xl font-bold ${getStatusColor(status, count)}`}>
                        {count}
                      </div>
                      <div className="text-sm text-gray-500 capitalize">
                        {status === 'draft' ? 'Taslak' :
                         status === 'submitted' ? 'Gönderildi' :
                         status === 'under_review' ? 'İnceleniyor' :
                         status === 'approved' ? 'Onaylandı' :
                         status === 'rejected' ? 'Reddedildi' :
                         status === 'paid' ? 'Ödendi' :
                         status === 'completed' ? 'Tamamlandı' :
                         status === 'cancelled' ? 'İptal' : status}
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