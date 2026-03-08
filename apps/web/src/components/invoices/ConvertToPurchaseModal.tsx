import { useState, useEffect, useMemo } from 'react';
import { Modal, Button, Card, Input, Select, Label } from '@x-ear/ui-web';
import { ShoppingCart, AlertCircle, CheckCircle, X, Plus } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { useListSuppliers } from '@/api/generated';
import { extractErrorMessage } from '@/utils/error-utils';
import toast from 'react-hot-toast';

interface IncomingInvoice {
  invoiceId: string;
  supplierName: string;
  supplierTaxNumber?: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: string;
}

// SupplierOption interface removed as it was unused

interface ConvertToPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoices: IncomingInvoice[];
  onSuccess: () => void;
}

// Mock API hooks until the real ones are generated
interface ConvertOptions {
  mutation: {
    onSuccess: (data: { data: ConvertResult }) => void;
    onError: (error: unknown) => void;
  };
}

interface ConvertResult {
  successCount: number;
  errorCount: number;
  createdPurchases: unknown[];
  supplierMappings: unknown[];
  errors: string[];
}

interface ConvertData {
  invoiceIds: string[];
  supplierMappings: Record<string, string>;
}

const useConvertInvoicesToPurchases = (options: ConvertOptions) => ({
  mutate: (data: ConvertData) => {
    // Mock implementation
    setTimeout(() => {
      options.mutation.onSuccess({
        data: {
          successCount: data.invoiceIds.length,
          errorCount: 0,
          createdPurchases: [],
          supplierMappings: [],
          errors: []
        }
      });
    }, 1000);
  },
  isPending: false
});

interface ConvertToPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInvoices: IncomingInvoice[];
  onSuccess: () => void;
}

export function ConvertToPurchaseModal({
  isOpen,
  onClose,
  selectedInvoices,
  onSuccess
}: ConvertToPurchaseModalProps) {
  const [supplierMappings, setSupplierMappings] = useState<Record<string, string>>({});
  const [newSupplierName, setNewSupplierName] = useState('');
  const [showNewSupplierForm, setShowNewSupplierForm] = useState<string | null>(null);

  // Use real suppliers API
  const { data: suppliersData } = useListSuppliers({});
  const availableSuppliers = useMemo(() => suppliersData?.data || [], [suppliersData?.data]);

  const convertMutation = useConvertInvoicesToPurchases({
    mutation: {
      onSuccess: (data: { data: ConvertResult }) => {
        const result = data.data;
        if (result.successCount > 0) {
          toast.success(`${result.successCount} fatura başarıyla alışa dönüştürüldü`);
          onSuccess();
          onClose();
        }
        if (result.errorCount > 0) {
          toast.error(`${result.errorCount} faturada hata oluştu`);
        }
      },
      onError: (error: unknown) => {
        toast.error('Dönüştürme işlemi başarısız: ' + extractErrorMessage(error));
      }
    }
  });

  // Auto-map suppliers based on name/tax number similarity
  useEffect(() => {
    if (!availableSuppliers.length) return;

    const autoMappings: Record<string, string> = {};

    selectedInvoices.forEach(invoice => {
      // Try to find exact match by tax number
      const exactMatch = availableSuppliers.find(
        (supplier) => supplier.taxNumber === invoice.supplierTaxNumber
      );

      if (exactMatch) {
        autoMappings[invoice.invoiceId] = String(exactMatch.id);
        return;
      }

      // Try to find fuzzy match by name
      const nameMatch = availableSuppliers.find(
        (supplier) => supplier.name.toLowerCase().includes(invoice.supplierName.toLowerCase()) ||
          invoice.supplierName.toLowerCase().includes(supplier.name.toLowerCase())
      );

      if (nameMatch) {
        autoMappings[invoice.invoiceId] = String(nameMatch.id);
      }
    });

    setSupplierMappings(autoMappings);
  }, [selectedInvoices, availableSuppliers]);

  const handleSupplierChange = (invoiceId: string, supplierId: string) => {
    setSupplierMappings(prev => ({
      ...prev,
      [invoiceId]: supplierId
    }));
  };

  const handleCreateNewSupplier = (invoiceId: string) => {
    if (!newSupplierName.trim()) {
      toast.error('Tedarikçi adı gerekli');
      return;
    }

    // Mock implementation - gerçekte API call yapılacak
    const newSupplierId = `new_${Date.now()}`;
    toast.success(`Yeni tedarikçi "${newSupplierName}" oluşturuldu`);

    setSupplierMappings(prev => ({
      ...prev,
      [invoiceId]: newSupplierId
    }));

    setNewSupplierName('');
    setShowNewSupplierForm(null);
  };

  const handleConvert = () => {
    // Validate all invoices have supplier mappings
    const unmappedInvoices = selectedInvoices.filter(
      invoice => !supplierMappings[invoice.invoiceId]
    );

    if (unmappedInvoices.length > 0) {
      toast.error('Tüm faturalar için tedarikçi seçimi yapılmalı');
      return;
    }

    convertMutation.mutate({
      invoiceIds: selectedInvoices.map(inv => inv.invoiceId),
      supplierMappings
    });
  };

  const totalAmount = selectedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const mappedCount = Object.keys(supplierMappings).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCart className="text-green-600" size={24} />
          <h2 className="text-xl font-semibold">Faturaları Alışa Dönüştür</h2>
        </div>

        <div className="space-y-6">
          {/* Summary */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">
                  {selectedInvoices.length} Fatura Seçildi
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Toplam Tutar: {formatCurrency(totalAmount, 'TRY')}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="text-green-600" size={16} />
                  <span className="text-green-600">{mappedCount} Eşleştirildi</span>
                </div>
                {mappedCount < selectedInvoices.length && (
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <AlertCircle className="text-yellow-600" size={16} />
                    <span className="text-yellow-600">
                      {selectedInvoices.length - mappedCount} Bekliyor
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Invoice Mappings */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Tedarikçi Eşleştirmeleri
            </h3>

            {selectedInvoices.map((invoice) => (
              <Card key={invoice.invoiceId} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatCurrency(invoice.totalAmount, invoice.currency)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <div>Tedarikçi: {invoice.supplierName}</div>
                      {invoice.supplierTaxNumber && (
                        <div>VKN: {invoice.supplierTaxNumber}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 max-w-xs">
                    <Label className="mb-2">
                      Sistem Tedarikçisi
                    </Label>

                    {showNewSupplierForm === invoice.invoiceId ? (
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Yeni tedarikçi adı"
                          value={newSupplierName}
                          onChange={(e) => setNewSupplierName(e.target.value)}
                          fullWidth
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleCreateNewSupplier(invoice.invoiceId)}
                            className="flex-1"
                          >
                            Oluştur
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShowNewSupplierForm(null);
                              setNewSupplierName('');
                            }}
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Select
                          value={supplierMappings[invoice.invoiceId] || ''}
                          onChange={(e) => handleSupplierChange(invoice.invoiceId, e.target.value)}
                          fullWidth
                          options={[
                            { value: '', label: 'Tedarikçi Seçin' },
                            ...availableSuppliers.map((supplier) => ({
                              value: String(supplier.id),
                              label: `${supplier.name}${supplier.taxNumber ? ` (${supplier.taxNumber})` : ''}`
                            }))
                          ]}
                        />

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowNewSupplierForm(invoice.invoiceId)}
                          className="w-full flex items-center gap-2 text-sm"
                        >
                          <Plus size={16} />
                          Yeni Tedarikçi Oluştur
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button
            onClick={handleConvert}
            disabled={mappedCount < selectedInvoices.length || convertMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {convertMutation.isPending ? 'Dönüştürülüyor...' : `${selectedInvoices.length} Faturayı Alışa Dönüştür`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}