import React from 'react';
import { Input, Card, CardContent, Badge } from '@x-ear/ui-web';
import { Search, Package } from 'lucide-react';
import type { InventoryItem } from '@/types/inventory';

interface InventorySelectorProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  inventoryItems: InventoryItem[];
  selectedItem: InventoryItem | null;
  onItemSelect: (item: InventoryItem) => void;
  formatCurrency: (amount: number) => string;
}

export const InventorySelector: React.FC<InventorySelectorProps> = ({
  searchTerm,
  onSearchChange,
  inventoryItems,
  selectedItem,
  onItemSelect,
  formatCurrency
}) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Cihaz ara (marka, model, isim)..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2">
        {inventoryItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Uygun cihaz bulunamadı</p>
          </div>
        ) : (
          inventoryItems.map((item) => (
            <Card
              key={item.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedItem?.id === item.id
                  ? 'ring-2 ring-blue-500 bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onItemSelect(item)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-600">
                      {item.brand} {item.model && `- ${item.model}`}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {formatCurrency(item.price)}
                      </Badge>
                      <Badge 
                        variant={item.availableInventory > 0 ? "default" : "danger"}
                        className="text-xs"
                      >
                        {item.availableSerials?.length || 0} seri no
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={item.availableInventory > 0 ? "default" : "danger"}
                      className="mb-1"
                    >
                      {item.availableInventory} stok
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};