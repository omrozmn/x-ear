import { Button, Input } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';
import { Purchase, PurchaseFilters, PurchaseStatus } from '../../types/purchase';
import { purchaseService } from '../../services/purchase.service';

interface PurchaseListProps {
  onPurchaseSelect?: (purchase: Purchase) => void;
  filters?: PurchaseFilters;
  showActions?: boolean;
  compact?: boolean;
}

export function PurchaseList({ 
  onPurchaseSelect, 
  filters = {}, 
  showActions = false
}: PurchaseListProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Load purchases using the service
  useEffect(() => {
    const loadPurchases = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the purchase service to load purchases
        const result = await purchaseService.searchPurchases(filters);
        setPurchases(result.purchases);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Alış faturaları yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadPurchases();
  }, [filters]);

  const handlePurchaseClick = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    onPurchaseSelect?.(purchase);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const getStatusColor = (status: PurchaseStatus) => {
    switch (status) {
      case 'draft': return 'bg-muted text-foreground';
      case 'sent': return 'bg-primary/10 text-blue-800 dark:text-blue-400';
      case 'approved': return 'bg-success/10 text-success';
      case 'rejected': return 'bg-destructive/10 text-red-800 dark:text-red-400';
      case 'paid': return 'bg-success/10 text-success';
      case 'cancelled': return 'bg-muted text-foreground';
      default: return 'bg-muted text-foreground';
    }
  };

  const getStatusText = (status: PurchaseStatus) => {
    switch (status) {
      case 'draft': return 'Taslak';
      case 'sent': return 'Gönderildi';
      case 'approved': return 'Onaylandı';
      case 'rejected': return 'Reddedildi';
      case 'paid': return 'Ödendi';
      case 'cancelled': return 'İptal';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-muted-foreground">Alış faturaları yükleniyor...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-red-200 rounded-xl p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Hata</h3>
            <div className="mt-2 text-sm text-destructive">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Alış faturası ara..."
            className="w-full px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>
      </div>
      {/* Purchase List */}
      <div className="bg-card shadow overflow-hidden sm:rounded-xl">
        <ul className="divide-y divide-gray-200">
          {purchases.length === 0 ? (
            <li className="px-6 py-8 text-center text-muted-foreground">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-foreground">Alış faturası bulunamadı</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Henüz XML formatında alış faturası import edilmemiş.
                </p>
              </div>
            </li>
          ) : (
            purchases.map((purchase) => (
              <li
                key={purchase.id}
                className={`px-6 py-4 hover:bg-muted cursor-pointer transition-colors ${
                  selectedPurchase?.id === purchase.id ? 'bg-primary/10' : ''
                }`}
                onClick={() => handlePurchaseClick(purchase)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {purchase.purchaseNumber}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(purchase.status)}`}>
                            {getStatusText(purchase.status)}
                          </span>
                          {purchase.xmlFileName && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary/10 text-blue-800">
                              XML
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{purchase.supplierName}</span>
                          {purchase.supplierTaxNumber && (
                            <span>VN: {purchase.supplierTaxNumber}</span>
                          )}
                          <span>{formatDate(purchase.issueDate)}</span>
                          {purchase.dueDate && (
                            <span>Vade: {formatDate(purchase.dueDate)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {formatCurrency(purchase.grandTotal)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {purchase.items.length} kalem
                      </p>
                    </div>
                    
                    {showActions && (
                      <div className="flex items-center space-x-2">
                        {/* Status Actions */}
                        {purchase.status === 'draft' && (
                          <Button
                            className="text-primary hover:text-blue-900 text-sm font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle approve action
                            }}
                            variant='default'>
                            Onayla
                          </Button>
                        )}
                        
                        {purchase.status === 'approved' && (
                          <Button
                            className="text-success hover:text-green-900 text-sm font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle pay action
                            }}
                            variant='default'>
                            Öde
                          </Button>
                        )}
                        
                        <Button
                          className="text-muted-foreground hover:text-muted-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle more actions
                          }}
                          variant='default'>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
      {/* Pagination */}
      {purchases.length > 0 && (
        <div className="bg-card px-4 py-3 flex items-center justify-between border-t border-border sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              className="relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-foreground bg-card hover:bg-muted"
              variant='default'>
              Önceki
            </Button>
            <Button
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-xl text-foreground bg-card hover:bg-muted"
              variant='default'>
              Sonraki
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-foreground">
                Toplam <span className="font-medium">{purchases.length}</span> alış faturası
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-xl shadow-sm -space-x-px" aria-label="Pagination">
                <Button
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  variant='default'>
                  Önceki
                </Button>
                <Button
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                  variant='default'>
                  Sonraki
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}