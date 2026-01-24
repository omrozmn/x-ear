import React, { useState, useEffect, useCallback } from 'react';
import { Button, Select, Textarea } from '@x-ear/ui-web';
import { 
  SGKWorkflow as SGKWorkflowType, 
  SGKWorkflowStatus, 
  SGKDocument
} from '../types/sgk';
import sgkService from '../services/sgk/sgk.service';

interface SGKWorkflowProps {
  document: SGKDocument;
  workflow?: SGKWorkflowType;
  onWorkflowUpdate?: (workflow: SGKWorkflowType) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export const SGKWorkflow: React.FC<SGKWorkflowProps> = ({
  document,
  workflow: initialWorkflow,
  onWorkflowUpdate,
  readOnly = false,
  compact = false
}) => {
  const [workflow, setWorkflow] = useState<SGKWorkflowType | null>(initialWorkflow || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<SGKWorkflowStatus>('draft');
  const [statusNotes, setStatusNotes] = useState('');

  const loadWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      const workflowData = await sgkService.getWorkflow(document.id);
      setWorkflow(workflowData as SGKWorkflowType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  }, [document.id]);

  useEffect(() => {
    if (!initialWorkflow) {
      loadWorkflow();
    }
  }, [document.id, initialWorkflow, loadWorkflow]);

  const getStatusColor = (status: SGKWorkflowStatus): string => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'paid': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: SGKWorkflowStatus): string => {
    const labels: Record<SGKWorkflowStatus, string> = {
      draft: 'Taslak',
      submitted: 'Gönderildi',
      under_review: 'İnceleniyor',
      approved: 'Onaylandı',
      rejected: 'Reddedildi',
      paid: 'Ödendi',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi'
    };
    return labels[status] || status;
  };

  const getAvailableStatuses = (currentStatus: SGKWorkflowStatus): SGKWorkflowStatus[] => {
    switch (currentStatus) {
      case 'draft':
        return ['submitted', 'cancelled'];
      case 'submitted':
        return ['under_review', 'rejected', 'cancelled'];
      case 'under_review':
        return ['approved', 'rejected'];
      case 'approved':
        return ['paid', 'cancelled'];
      case 'paid':
        return ['completed'];
      case 'rejected':
        return ['submitted'];
      case 'completed':
        return [];
      case 'cancelled':
        return ['draft'];
      default:
        return [];
    }
  };

  const handleStatusUpdate = async () => {
    if (!workflow) return;

    try {
      setLoading(true);
      const updatedWorkflow = await sgkService.updateWorkflowStatus(
        workflow.id,
        selectedStatus as SGKWorkflowStatus,
        statusNotes || undefined
      );
      setWorkflow(updatedWorkflow);
      onWorkflowUpdate?.(updatedWorkflow);
      setShowStatusModal(false);
      setStatusNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (startDate: string, endDate?: string): string => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays} gün ${diffHours} saat`;
    } else if (diffHours > 0) {
      return `${diffHours} saat`;
    } else {
      return 'Az önce';
    }
  };

  const isDeadlineApproaching = (deadline?: string): boolean => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  const isOverdue = (deadline?: string): boolean => {
    if (!deadline) return false;
    const deadlineDate = new Date(deadline);
    const now = new Date();
    return deadlineDate < now;
  };

  if (loading && !workflow) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">İş akışı yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Hata</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <Button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-500"
              variant='default'>
              Tekrar dene
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">İş akışı bulunamadı</h3>
          <p className="mt-1 text-sm text-gray-500">
            Bu belge için henüz bir iş akışı oluşturulmamış.
          </p>
          {!readOnly && (
            <Button
              onClick={async () => {
                try {
                  const newWorkflow = await sgkService.createWorkflow(document.id, document.partyId);
                  setWorkflow(newWorkflow as SGKWorkflowType);
                  onWorkflowUpdate?.(newWorkflow as SGKWorkflowType);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to create workflow');
                }
              }}
              className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              variant='default'>
              İş Akışı Oluştur
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Status */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(workflow.currentStatus)}`}>
              {getStatusLabel(workflow.currentStatus)}
            </span>
            {workflow.deadline && (
              <div className="flex items-center text-sm text-gray-500">
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className={`${isOverdue(workflow.deadline) ? 'text-red-600 font-medium' : isDeadlineApproaching(workflow.deadline) ? 'text-yellow-600 font-medium' : ''}`}>
                  {formatDate(workflow.deadline)}
                  {isOverdue(workflow.deadline) && ' (Gecikmiş)'}
                  {isDeadlineApproaching(workflow.deadline) && !isOverdue(workflow.deadline) && ' (Yaklaşıyor)'}
                </span>
              </div>
            )}
          </div>

          {!readOnly && getAvailableStatuses(workflow.currentStatus).length > 0 && (
            <Button
              onClick={() => setShowStatusModal(true)}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              variant='default'>
              Durumu Güncelle
            </Button>
          )}
        </div>

        {/* Key Dates */}
        {!compact && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {workflow.submittedDate && (
              <div>
                <span className="text-gray-500">Gönderim:</span>
                <div className="font-medium">{formatDate(workflow.submittedDate)}</div>
              </div>
            )}
            {workflow.approvalDate && (
              <div>
                <span className="text-gray-500">Onay:</span>
                <div className="font-medium">{formatDate(workflow.approvalDate)}</div>
              </div>
            )}
            {workflow.paymentDate && (
              <div>
                <span className="text-gray-500">Ödeme:</span>
                <div className="font-medium">{formatDate(workflow.paymentDate)}</div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Status History */}
      {!compact && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Durum Geçmişi</h4>
          <div className="flow-root">
            <ul className="-mb-8">
              {workflow.statusHistory.map((entry, index) => (
                <li key={index}>
                  <div className="relative pb-8">
                    {index !== workflow.statusHistory.length - 1 && (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                    )}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getStatusColor(entry.status)}`}>
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <circle cx="10" cy="10" r="3" />
                          </svg>
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{getStatusLabel(entry.status)}</span>
                            {entry.notes && (
                              <span className="text-gray-500"> - {entry.notes}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {entry.userName || 'Sistem'}
                            {entry.systemGenerated && ' (Otomatik)'}
                          </p>
                        </div>
                        <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                          <time dateTime={entry.timestamp}>
                            {formatDate(entry.timestamp)}
                          </time>
                          <div>
                            {index > 0 && formatDuration(workflow.statusHistory[index - 1].timestamp, entry.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Durum Güncelle
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yeni Durum
                </label>
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as SGKWorkflowStatus)}
                  options={getAvailableStatuses(workflow.currentStatus).map(status => ({
                    value: status,
                    label: getStatusLabel(status)
                  }))}
                  className="w-full"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notlar (İsteğe bağlı)
                </label>
                <Textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Durum değişikliği ile ilgili notlar..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <Button
                  onClick={() => {
                    setShowStatusModal(false);
                    setStatusNotes('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  variant='default'>
                  İptal
                </Button>
                <Button
                  onClick={handleStatusUpdate}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  variant='default'>
                  {loading ? 'Güncelleniyor...' : 'Güncelle'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};