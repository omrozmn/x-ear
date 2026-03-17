import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Textarea } from '@x-ear/ui-web';
import { ArrowLeftRight, FileText, Package } from 'lucide-react';
import type { Device } from '../types';
import type { SelectedReturnSource } from './InvoiceSearchStep';

interface ReplacementSummaryProps {
  device: Device | null;
  isBilateral: boolean;
  invoiceQuantity: number;
  onInvoiceQuantityChange: (qty: number) => void;
  createReturnInvoice: boolean;
  onCreateReturnInvoiceChange: (value: boolean) => void;
  invoiceType: 'individual' | 'corporate' | 'e_archive';
  onInvoiceTypeChange: (value: 'individual' | 'corporate' | 'e_archive') => void;
  notes: string;
  onNotesChange: (value: string) => void;
  returnSource?: SelectedReturnSource | null;
  formatCurrency: (amount: number) => string;
}

export const ReplacementSummary: React.FC<ReplacementSummaryProps> = ({
  device,
  isBilateral,
  invoiceQuantity,
  onInvoiceQuantityChange,
  createReturnInvoice,
  onCreateReturnInvoiceChange,
  invoiceType,
  onInvoiceTypeChange,
  notes,
  onNotesChange,
  returnSource,
  formatCurrency
}) => {
  if (!device) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5" />
          Değişim Özeti
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium text-foreground mb-2">İade Edilecek Cihaz</h4>
          <div className="bg-destructive/10 p-3 rounded-2xl">
            <p className="font-medium">{device.brand} {device.model}</p>
            {device.serialNumber && <p className="text-sm text-muted-foreground">SN: {device.serialNumber}</p>}
            <Badge variant="secondary" className="mt-1">
              {formatCurrency(device.price)}
            </Badge>
          </div>
        </div>

        {/* Bilateral quantity selector */}
        {isBilateral && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Faturadaki Cihaz Adedi
            </label>
            <div className="flex gap-2">
              {[1, 2].map((qty) => (
                <button
                  data-allow-raw="true"
                  key={qty}
                  type="button"
                  onClick={() => onInvoiceQuantityChange(qty)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    invoiceQuantity === qty
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-card text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {qty} Adet
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Return source preview */}
        {returnSource ? (
          <div className="border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-success/10 border-b border-green-100">
              {returnSource.type === 'invoice' ? (
                <FileText className="h-4 w-4 text-success" />
              ) : (
                <Package className="h-4 w-4 text-success" />
              )}
              <span className="text-sm font-medium text-success">
                {returnSource.type === 'invoice'
                  ? 'İade faturası otomatik doldurulacak'
                  : 'Envanter kaydından iade faturası — fatura no/tarihi giriniz'}
              </span>
            </div>
            <div className="px-3 py-2 text-sm space-y-0.5 bg-card">
              {returnSource.type === 'invoice' ? (
                <>
                  <p><span className="text-muted-foreground">Fatura No:</span> <span className="font-medium">{returnSource.invoice.invoiceNumber}</span></p>
                  <p><span className="text-muted-foreground">Tarih:</span> <span className="font-medium">{returnSource.invoice.invoiceDate}</span></p>
                  <p><span className="text-muted-foreground">Tedarikçi:</span> <span className="font-medium">{returnSource.invoice.senderName}</span></p>
                  <p className="text-muted-foreground pt-1">
                    {returnSource.matchedItem.productName} × {returnSource.matchedItem.quantity}
                  </p>
                </>
              ) : (
                <>
                  <p><span className="text-muted-foreground">Ürün:</span> <span className="font-medium">{returnSource.item.name}</span></p>
                  {returnSource.item.price != null && (
                    <p><span className="text-muted-foreground">Birim Fiyat:</span> <span className="font-medium">{formatCurrency(returnSource.item.price)}</span></p>
                  )}
                  <p className="text-amber-600 pt-1 text-xs">Fatura no ve tarihi kendiniz gireceksiniz.</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input data-allow-raw="true"
                type="checkbox"
                id="createReturnInvoice"
                checked={createReturnInvoice}
                onChange={(e) => onCreateReturnInvoiceChange(e.target.checked)}
                className="rounded border-border text-primary focus:ring-ring"
              />
              <label htmlFor="createReturnInvoice" className="text-sm font-medium text-foreground">
                İade faturası oluştur
              </label>
            </div>

            {createReturnInvoice && (
              <div className="ml-6 space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Fatura Tipi
                </label>
                <select data-allow-raw="true"
                  value={invoiceType}
                  onChange={(e) => onInvoiceTypeChange(e.target.value as 'individual' | 'corporate' | 'e_archive')}
                  className="block w-full px-3 py-2 border border-border rounded-xl shadow-sm focus:outline-none focus:ring-ring focus:border-blue-500 sm:text-sm"
                >
                  <option value="individual">Bireysel</option>
                  <option value="corporate">Kurumsal</option>
                  <option value="e_archive">E-Arşiv</option>
                </select>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Notlar
          </label>
          <Textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Değişim ile ilgili notlar..."
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
};