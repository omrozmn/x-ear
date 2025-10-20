import { Button, Input, Select } from '@x-ear/ui-web';
import React, { useState, useCallback, useMemo } from 'react';
import { Invoice, InvoiceBulkAction, InvoiceExportOptions } from '../../types/invoice';
import { EFaturaSubmissionData, EFaturaIntegratorResponse } from '../../types/efatura';

interface InvoiceBulkOperationsProps {
  selectedInvoices: Invoice[];
  onBulkActionComplete?: (action: string, results: any) => void;
  onSelectionClear?: () => void;
  className?: string;
}

interface BulkOperationState {
  isProcessing: boolean;
  currentAction: string | null;
  progress: number;
  results: BulkOperationResult[];
  error: string | null;
}

interface BulkOperationResult {
  invoiceId: string;
  invoiceNumber: string;
  success: boolean;
  message?: string;
  error?: string;
}

export const InvoiceBulkOperations: React.FC<InvoiceBulkOperationsProps> = ({
  selectedInvoices,
  onBulkActionComplete,
  onSelectionClear,
  className = ''
}) => {
  const [state, setState] = useState<BulkOperationState>({
    isProcessing: false,
    currentAction: null,
    progress: 0,
    results: [],
    error: null
  });

  const [exportOptions, setExportOptions] = useState<InvoiceExportOptions>({
    format: 'excel',
    includeItems: true,
    includePayments: false
  });

  const [confirmationDialog, setConfirmationDialog] = useState<{
    isOpen: boolean;
    action: InvoiceBulkAction | null;
    message: string;
  }>({
    isOpen: false,
    action: null,
    message: ''
  });

  // Available bulk actions
  const bulkActions: InvoiceBulkAction[] = [
    {
      type: 'send',
      label: 'Faturaları Gönder',
      icon: '📤',
      requiresConfirmation: true,
      confirmationMessage: 'Seçili faturaları göndermek istediğinizden emin misiniz?'
    },
    {
      type: 'send_to_gib',
      label: 'GİB\'e Toplu Gönder',
      icon: '🏛️',
      requiresConfirmation: true,
      confirmationMessage: 'Seçili faturaları GİB\'e göndermek istediğinizden emin misiniz?'
    },
    {
      type: 'cancel',
      label: 'Faturaları İptal Et',
      icon: '❌',
      requiresConfirmation: true,
      confirmationMessage: 'Seçili faturaları iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
    },
    {
      type: 'export',
      label: 'Dışa Aktar',
      icon: '📊',
      requiresConfirmation: false,
      confirmationMessage: ''
    },
    {
      type: 'delete',
      label: 'Sil',
      icon: '🗑️',
      requiresConfirmation: true,
      confirmationMessage: 'Seçili faturaları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
    }
  ];

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalAmount = selectedInvoices.reduce((sum, invoice) => sum + (invoice.grandTotal || 0), 0);
    const statusCounts = selectedInvoices.reduce((counts, invoice) => {
      counts[invoice.status] = (counts[invoice.status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return {
      count: selectedInvoices.length,
      totalAmount,
      statusCounts
    };
  }, [selectedInvoices]);

  const handleBulkAction = useCallback(async (action: InvoiceBulkAction) => {
    if (action.requiresConfirmation) {
      setConfirmationDialog({
        isOpen: true,
        action,
        message: action.confirmationMessage
      });
      return;
    }

    await executeBulkAction(action);
  }, []);

  const executeBulkAction = useCallback(async (action: InvoiceBulkAction) => {
    setState(prev => ({
      ...prev,
      isProcessing: true,
      currentAction: action.label,
      progress: 0,
      results: [],
      error: null
    }));

    try {
      let results: BulkOperationResult[] = [];

      switch (action.type) {
        case 'send':
          results = await processSendInvoices();
          break;
        case 'send_to_gib':
          results = await processSendToGIB();
          break;
        case 'cancel':
          results = await processCancelInvoices();
          break;
        case 'export':
          await processExportInvoices();
          break;
        case 'delete':
          results = await processDeleteInvoices();
          break;
        default:
          throw new Error(`Unsupported action: ${action.type}`);
      }

      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentAction: null,
        progress: 100,
        results
      }));

      if (onBulkActionComplete) {
        onBulkActionComplete(action.type, results);
      }

    } catch (error) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        currentAction: null,
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      }));
    }
  }, [selectedInvoices, exportOptions, onBulkActionComplete]);

  const processSendInvoices = async (): Promise<BulkOperationResult[]> => {
    const results: BulkOperationResult[] = [];
    
    for (let i = 0; i < selectedInvoices.length; i++) {
      const invoice = selectedInvoices[i];
      
      try {
        // Simulate API call to send invoice
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock success/failure
        const success = Math.random() > 0.1; // 90% success rate
        
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success,
          message: success ? 'Fatura başarıyla gönderildi' : undefined,
          error: success ? undefined : 'Gönderim hatası'
        });

        setState(prev => ({
          ...prev,
          progress: ((i + 1) / selectedInvoices.length) * 100
        }));
      } catch (error) {
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
      }
    }

    return results;
  };

  const processSendToGIB = async (): Promise<BulkOperationResult[]> => {
    const results: BulkOperationResult[] = [];
    
    // Group invoices into batches of 10 for GIB submission
    const batchSize = 10;
    const batches: Invoice[][] = [];
    
    for (let i = 0; i < selectedInvoices.length; i += batchSize) {
      batches.push(selectedInvoices.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        // Simulate batch submission to GIB via integrator
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock batch results
        batch.forEach(invoice => {
          const success = Math.random() > 0.05; // 95% success rate for GIB
          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            success,
            message: success ? 'GİB\'e başarıyla gönderildi' : undefined,
            error: success ? undefined : 'GİB gönderim hatası'
          });
        });

        setState(prev => ({
          ...prev,
          progress: ((batchIndex + 1) / batches.length) * 100
        }));
      } catch (error) {
        batch.forEach(invoice => {
          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            success: false,
            error: error instanceof Error ? error.message : 'Batch gönderim hatası'
          });
        });
      }
    }

    return results;
  };

  const processCancelInvoices = async (): Promise<BulkOperationResult[]> => {
    const results: BulkOperationResult[] = [];
    
    for (let i = 0; i < selectedInvoices.length; i++) {
      const invoice = selectedInvoices[i];
      
      try {
        // Check if invoice can be cancelled
        if (invoice.status === 'paid' || invoice.status === 'cancelled') {
          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            success: false,
            error: 'Ödenen veya iptal edilmiş fatura iptal edilemez'
          });
          continue;
        }

        // Simulate API call to cancel invoice
        await new Promise(resolve => setTimeout(resolve, 300));
        
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: true,
          message: 'Fatura başarıyla iptal edildi'
        });

        setState(prev => ({
          ...prev,
          progress: ((i + 1) / selectedInvoices.length) * 100
        }));
      } catch (error) {
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: false,
          error: error instanceof Error ? error.message : 'İptal hatası'
        });
      }
    }

    return results;
  };

  const processExportInvoices = async (): Promise<void> => {
    // Simulate export processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const exportData = selectedInvoices.map(invoice => ({
      'Fatura No': invoice.invoiceNumber,
      'Hasta': invoice.patientName,
      'Tarih': invoice.issueDate,
      'Tutar': invoice.grandTotal,
      'Durum': invoice.status,
      'Ödeme Yöntemi': invoice.paymentMethod || 'Belirtilmemiş'
    }));

    // Create and download file based on format
    let content: string;
    let fileName: string;
    let mimeType: string;

    switch (exportOptions.format) {
      case 'csv':
        content = convertToCSV(exportData);
        fileName = `faturalar_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
        break;
      case 'excel':
        // For simplicity, we'll export as CSV with Excel-compatible format
        content = convertToCSV(exportData);
        fileName = `faturalar_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'application/vnd.ms-excel';
        break;
      case 'pdf':
        content = 'PDF export not implemented yet';
        fileName = `faturalar_${new Date().toISOString().split('T')[0]}.pdf`;
        mimeType = 'application/pdf';
        break;
      default:
        throw new Error('Desteklenmeyen export formatı');
    }

    // Download file
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const processDeleteInvoices = async (): Promise<BulkOperationResult[]> => {
    const results: BulkOperationResult[] = [];
    
    for (let i = 0; i < selectedInvoices.length; i++) {
      const invoice = selectedInvoices[i];
      
      try {
        // Check if invoice can be deleted
        if (invoice.status === 'paid') {
          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            success: false,
            error: 'Ödenen fatura silinemez'
          });
          continue;
        }

        // Simulate API call to delete invoice
        await new Promise(resolve => setTimeout(resolve, 200));
        
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: true,
          message: 'Fatura başarıyla silindi'
        });

        setState(prev => ({
          ...prev,
          progress: ((i + 1) / selectedInvoices.length) * 100
        }));
      } catch (error) {
        results.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Silme hatası'
        });
      }
    }

    return results;
  };

  const convertToCSV = (data: any[]): string => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape commas and quotes in CSV
          return typeof value === 'string' && (value.includes(',') || value.includes('"'))
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  const confirmAction = useCallback(() => {
    if (confirmationDialog.action) {
      executeBulkAction(confirmationDialog.action);
    }
    setConfirmationDialog({ isOpen: false, action: null, message: '' });
  }, [confirmationDialog.action, executeBulkAction]);

  const cancelAction = useCallback(() => {
    setConfirmationDialog({ isOpen: false, action: null, message: '' });
  }, []);

  if (selectedInvoices.length === 0) {
    return (
      <div className={`bulk-operations-empty ${className}`}>
        <p className="text-gray-500 text-center py-4">
          Toplu işlem yapmak için fatura seçiniz
        </p>
      </div>
    );
  }

  return (
    <div className={`invoice-bulk-operations ${className}`}>
      {/* Selection Summary */}
      <div className="selection-summary bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-blue-900">
            {statistics.count} fatura seçildi
          </h3>
          <Button
            onClick={onSelectionClear}
            className="text-blue-600 hover:text-blue-800 text-sm"
            variant='default'>
            Seçimi Temizle
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Toplam Tutar:</span>
            <div className="font-medium">₺{statistics.totalAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</div>
          </div>
          
          {Object.entries(statistics.statusCounts).map(([status, count]) => (
            <div key={status}>
              <span className="text-gray-600">{getStatusLabel(status)}:</span>
              <div className="font-medium">{count}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Export Options */}
      <div className="export-options mb-4">
        <h4 className="font-medium mb-2">Dışa Aktarma Seçenekleri</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Format</label>
            <Select
              value={exportOptions.format}
              onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
              options={[
                { value: 'excel', label: 'Excel' },
                { value: 'csv', label: 'CSV' },
                { value: 'pdf', label: 'PDF' },
                { value: 'xml', label: 'XML' }
              ]}
              className="w-full px-3 py-1 border rounded"
            />
          </div>
          
          <label className="flex items-center">
            <Input
              type="checkbox"
              checked={exportOptions.includeItems}
              onChange={(e) => setExportOptions(prev => ({ ...prev, includeItems: e.target.checked }))}
              className="mr-2"
            />
            Kalem Detayları
          </label>
          
          <label className="flex items-center">
            <Input
              type="checkbox"
              checked={exportOptions.includePayments}
              onChange={(e) => setExportOptions(prev => ({ ...prev, includePayments: e.target.checked }))}
              className="mr-2"
            />
            Ödeme Bilgileri
          </label>
        </div>
      </div>
      {/* Bulk Actions */}
      <div className="bulk-actions mb-4">
        <h4 className="font-medium mb-2">Toplu İşlemler</h4>
        <div className="flex flex-wrap gap-2">
          {bulkActions.map((action) => (
            <Button
              key={action.type}
              onClick={() => handleBulkAction(action)}
              disabled={state.isProcessing}
              className={`px-4 py-2 rounded text-sm font-medium disabled:opacity-50 ${
                action.type === 'delete' || action.type === 'cancel'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : action.type === 'send_to_gib'
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              variant='default'>
              {action.icon} {action.label}
            </Button>
          ))}
        </div>
      </div>
      {/* Progress Indicator */}
      {state.isProcessing && (
        <div className="progress-indicator bg-gray-50 border rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">{state.currentAction}</span>
            <span className="text-sm text-gray-600">{Math.round(state.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${state.progress}%` }}
            />
          </div>
        </div>
      )}
      {/* Error Display */}
      {state.error && (
        <div className="error-message bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <h5 className="font-medium text-red-800 mb-1">Hata</h5>
          <p className="text-red-700">{state.error}</p>
        </div>
      )}
      {/* Results */}
      {state.results.length > 0 && (
        <div className="operation-results">
          <h4 className="font-medium mb-2">İşlem Sonuçları</h4>
          <div className="results-list bg-gray-50 border rounded-lg p-4 max-h-96 overflow-auto">
            {state.results.map((result) => (
              <div
                key={result.invoiceId}
                className={`result-item flex justify-between items-center py-2 px-3 mb-2 rounded ${
                  result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                <span className="font-medium">{result.invoiceNumber}</span>
                <span className="text-sm">
                  {result.success ? result.message : result.error}
                </span>
              </div>
            ))}
          </div>
          
          <div className="results-summary mt-2 text-sm text-gray-600">
            Başarılı: {state.results.filter(r => r.success).length} / 
            Başarısız: {state.results.filter(r => !r.success).length}
          </div>
        </div>
      )}
      {/* Confirmation Dialog */}
      {confirmationDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-medium text-lg mb-4">İşlemi Onayla</h3>
            <p className="text-gray-700 mb-6">{confirmationDialog.message}</p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={cancelAction}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                variant='default'>
                İptal
              </Button>
              <Button
                onClick={confirmAction}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                variant='default'>
                Onayla
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get status label in Turkish
function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    'draft': 'Taslak',
    'sent': 'Gönderildi',
    'approved': 'Onaylandı',
    'rejected': 'Reddedildi',
    'cancelled': 'İptal',
    'paid': 'Ödendi',
    'overdue': 'Gecikmiş'
  };
  return statusLabels[status] || status;
}

export default InvoiceBulkOperations;