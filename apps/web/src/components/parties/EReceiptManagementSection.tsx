import React from 'react';
import { Button } from '@x-ear/ui-web';
import { FileText, Plus, Eye } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface SavedEReceipt {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: string;
  materials: string[];
}

interface EReceiptManagementSectionProps {
  savedEReceipts: SavedEReceipt[];
  onCreateEReceipt: () => void;
}

export const EReceiptManagementSection: React.FC<EReceiptManagementSectionProps> = ({
  savedEReceipts,
  onCreateEReceipt
}) => {
  return (
    <div className="bg-card rounded-2xl border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">E-Reçete Yönetimi</h3>
        <Button onClick={onCreateEReceipt}>
          <Plus className="w-4 h-4 mr-2" />
          E-Reçete Oluştur
        </Button>
      </div>

      {savedEReceipts.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p>Henüz e-reçete oluşturulmamış</p>
        </div>
      ) : (
        <div className="space-y-4">
          {savedEReceipts.map((receipt) => (
            <div key={receipt.id} className="border rounded-2xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h5 className="font-medium">E-Reçete #{receipt.number}</h5>
                  <p className="text-sm text-muted-foreground">Tarih: {new Date(receipt.date).toLocaleDateString('tr-TR')}</p>
                  <p className="text-sm text-muted-foreground">Tutar: ₺{receipt.amount}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusBadge status={receipt.status} />
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};