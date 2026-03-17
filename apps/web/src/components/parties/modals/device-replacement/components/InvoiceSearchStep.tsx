import React from 'react';
import { Search, FileText, Package, ChevronRight, Info } from 'lucide-react';
import type { InventoryItem } from '@/types/inventory';
import type { InvoiceOrInventoryResult, InvoiceSearchResult } from '@/hooks/useInvoiceProductSearch';
import { useInvoiceProductSearch } from '@/hooks/useInvoiceProductSearch';

export interface SelectedInvoiceSource {
  type: 'invoice';
  invoice: InvoiceSearchResult;
  /** The specific matched item the user chose (for unit price / product name) */
  matchedItem: {
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    unit: string | null;
  };
}

export interface SelectedInventorySource {
  type: 'inventory';
  item: InventoryItem;
}

export type SelectedReturnSource = SelectedInvoiceSource | SelectedInventorySource;

interface InvoiceSearchStepProps {
  /** Pre-populated from the selected replacement device name */
  defaultQuery?: string;
  /** All tenant inventory items — used for local fallback search */
  inventoryItems: InventoryItem[];
  onSelect: (source: SelectedReturnSource) => void;
  formatCurrency: (amount: number) => string;
}

const formatDate = (raw: string | null | undefined) => {
  if (!raw) return '—';
  try {
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(raw));
  } catch {
    return raw;
  }
};

export const InvoiceSearchStep: React.FC<InvoiceSearchStepProps> = ({
  defaultQuery = '',
  inventoryItems,
  onSelect,
  formatCurrency,
}) => {
  const { query, setQuery, isLoading, results, isInventoryFallback, isEmpty } =
    useInvoiceProductSearch(inventoryItems, defaultQuery);

  const handleSelectInvoice = (result: InvoiceOrInventoryResult & { type: 'invoice' }) => {
    const firstItem = result.invoice.matchedItems[0];
    if (!firstItem) return;
    onSelect({
      type: 'invoice',
      invoice: result.invoice,
      matchedItem: firstItem,
    });
  };

  const handleSelectInventory = (result: InvoiceOrInventoryResult & { type: 'inventory' }) => {
    onSelect({ type: 'inventory', item: result.item });
  };

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          data-allow-raw="true"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cihaz adını yazın... (örn. Helix RIC, Force 100)"
          className="w-full pl-10 pr-3 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
        {isLoading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground animate-pulse">
            Aranıyor…
          </span>
        )}
      </div>

      {/* Fallback notice */}
      {isInventoryFallback && (
        <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">
          <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Gelen faturalarda cihaz kaydı bulunamadı, envanter sonuçları gösteriliyor. Fatura no ve tarihi kendiniz gireceksiniz.
          </span>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <p className="text-sm text-center text-muted-foreground py-6">
          Eşleşen kayıt bulunamadı.{' '}
          <button
            data-allow-raw="true"
            type="button"
            className="text-primary underline"
            onClick={() => onSelect({ type: 'inventory', item: { id: '', name: query, brand: '', model: '', price: 0 } as InventoryItem })}
          >
            Faturasız devam et
          </button>
        </p>
      )}

      {/* Results list */}
      {results.length > 0 && (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {results.map((result, idx) => {
            if (result.type === 'invoice') {
              const inv = result.invoice;
              return (
                <button
                  data-allow-raw="true"
                  key={`inv-${inv.invoiceId}`}
                  type="button"
                  onClick={() => handleSelectInvoice(result)}
                  className="w-full text-left p-3 rounded-xl border border-border hover:border-blue-400 hover:bg-primary/10 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inv.senderName} · {formatDate(inv.invoiceDate)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mt-0.5" />
                  </div>
                  <ul className="mt-1.5 pl-6 space-y-0.5">
                    {inv.matchedItems.map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground">
                        • {item.productName} ×{item.quantity}{' '}
                        <span className="text-muted-foreground">
                          — {formatCurrency(item.unitPrice)} / {item.unit ?? 'Adet'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            }

            // Inventory fallback item
            const inv_item = result.item;
            return (
              <button
                data-allow-raw="true"
                key={`inv-item-${idx}`}
                type="button"
                onClick={() => handleSelectInventory(result)}
                className="w-full text-left p-3 rounded-xl border border-border hover:border-blue-400 hover:bg-primary/10 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {inv_item.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {inv_item.brand} {inv_item.model} · {formatCurrency(inv_item.price)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Skip option — always visible when results exist */}
      {results.length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          ya da{' '}
          <button
            data-allow-raw="true"
            type="button"
            className="text-primary underline"
            onClick={() => onSelect({ type: 'inventory', item: { id: '', name: query, brand: '', model: '', price: 0 } as InventoryItem })}
          >
            faturasız / manuel devam et
          </button>
        </p>
      )}
    </div>
  );
};

export default InvoiceSearchStep;
