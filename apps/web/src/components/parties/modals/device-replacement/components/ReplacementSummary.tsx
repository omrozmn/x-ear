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
          <h4 className="font-medium text-gray-900 mb-2">İade Edilecek Cihaz</h4>
          <div className="bg-red-50 p-3 rounded-2xl">
            <p className="font-medium">{device.brand} {device.model}</p>
            {device.serialNumber && <p className="text-sm text-gray-600">SN: {device.serialNumber}</p>}
            <Badge variant="secondary" className="mt-1">
              {formatCurrency(device.price)}
            </Badge>
          </div>
        </div>

        {/* Bilateral quantity selector */}
        {isBilateral && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Faturadaki Cihaz Adedi
            </label>
            <div className="flex gap-2">
              {[1, 2].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => onInvoiceQuantityChange(qty)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    invoiceQuantity === qty
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border-b border-green-100">
              {returnSource.type === 'invoice' ? (
                <FileText className="h-4 w-4 text-green-600" />
              ) : (
                <Package className="h-4 w-4 text-green-600" />
              )}
              <span className="text-sm font-medium text-green-700">
                {returnSource.type === 'invoice'
                  ? 'İade faturası otomatik doldurulacak'
                  : 'Envanter kaydından iade faturası — fatura no/tarihi giriniz'}
              </span>
            </div>
            <div className="px-3 py-2 text-sm space-y-0.5 bg-white">
              {returnSource.type === 'invoice' ? (
                <>
                  <p><span className="text-gray-500">Fatura No:</span> <span className="font-medium">{returnSource.invoice.invoiceNumber}</span></p>
                  <p><span className="text-gray-500">Tarih:</span> <span className="font-medium">{returnSource.invoice.invoiceDate}</span></p>
                  <p><span className="text-gray-500">Tedarikçi:</span> <span className="font-medium">{returnSource.invoice.senderName}</span></p>
                  <p className="text-gray-500 pt-1">
                    {returnSource.matchedItem.productName} × {returnSource.matchedItem.quantity}
                  </p>
                </>
              ) : (
                <>
                  <p><span className="text-gray-500">Ürün:</span> <span className="font-medium">{returnSource.item.name}</span></p>
                  {returnSource.item.price != null && (
                    <p><span className="text-gray-500">Birim Fiyat:</span> <span className="font-medium">{formatCurrency(returnSource.item.price)}</span></p>
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
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="createReturnInvoice" className="text-sm font-medium text-gray-700">
                İade faturası oluştur
              </label>
            </div>

            {createReturnInvoice && (
              <div className="ml-6 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Fatura Tipi
                </label>
                <select data-allow-raw="true"
                  value={invoiceType}
                  onChange={(e) => onInvoiceTypeChange(e.target.value as 'individual' | 'corporate' | 'e_archive')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
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