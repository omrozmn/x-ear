import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Select, Textarea } from '@x-ear/ui-web';
import { ArrowLeftRight, AlertCircle } from 'lucide-react';
import type { InventoryItem } from '@/types/inventory';
import type { Device } from '../types';

interface ReplacementSummaryProps {
  device: Device | null;
  selectedInventoryItem: InventoryItem | null;
  priceDifference: number;
  createReturnInvoice: boolean;
  onCreateReturnInvoiceChange: (value: boolean) => void;
  invoiceType: 'individual' | 'corporate' | 'e_archive';
  onInvoiceTypeChange: (value: 'individual' | 'corporate' | 'e_archive') => void;
  notes: string;
  onNotesChange: (value: string) => void;
  formatCurrency: (amount: number) => string;
}

export const ReplacementSummary: React.FC<ReplacementSummaryProps> = ({
  device,
  selectedInventoryItem,
  priceDifference,
  createReturnInvoice,
  onCreateReturnInvoiceChange,
  invoiceType,
  onInvoiceTypeChange,
  notes,
  onNotesChange,
  formatCurrency
}) => {
  if (!selectedInventoryItem || !device) {
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Mevcut Cihaz</h4>
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="font-medium">{device.brand} {device.model}</p>
              <p className="text-sm text-gray-600">SN: {device.serialNumber}</p>
              <Badge variant="secondary" className="mt-1">
                {formatCurrency(device.price)}
              </Badge>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Yeni Cihaz</h4>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="font-medium">{selectedInventoryItem.name}</p>
              <p className="text-sm text-gray-600">{selectedInventoryItem.brand} {selectedInventoryItem.model}</p>
              <Badge variant="secondary" className="mt-1">
                {formatCurrency(selectedInventoryItem.price)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="font-medium">Fiyat Farkı:</span>
            <Badge 
              variant={priceDifference >= 0 ? "success" : "warning"}
              className="text-sm"
            >
              {priceDifference >= 0 ? '+' : ''}{formatCurrency(priceDifference)}
            </Badge>
          </div>
          {priceDifference > 0 && (
            <div className="flex items-center gap-2 mt-2 text-sm text-orange-600">
              <AlertCircle className="h-4 w-4" />
              <span>Ek ödeme gerekli</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <input
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
              <select
                value={invoiceType}
                onChange={(e) => onInvoiceTypeChange(e.target.value as 'individual' | 'corporate' | 'e_archive')}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="individual">Bireysel</option>
                <option value="corporate">Kurumsal</option>
                <option value="e_archive">E-Arşiv</option>
              </select>
            </div>
          )}
        </div>

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