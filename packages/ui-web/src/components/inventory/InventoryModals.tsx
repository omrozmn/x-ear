import React from 'react';
import { Modal, Button, Input, Select, Badge, Textarea } from '../ui';
import { InventoryItem, InventoryFilters } from '../../types/inventory';

interface InventoryModalsProps {
  // Product Details Modal
  isDetailsModalOpen: boolean;
  setIsDetailsModalOpen: (open: boolean) => void;
  selectedItem: InventoryItem | null;
  setIsEditModalOpen: (open: boolean) => void;
  setFormData: (data: InventoryItem) => void;
  
  // Bulk Operations Modal
  isBulkModalOpen: boolean;
  setIsBulkModalOpen: (open: boolean) => void;
  selectedRowKeys: (string | number)[];
  bulkOperation: 'category' | 'price' | 'stock' | 'supplier' | 'delete';
  setBulkOperation: (op: 'category' | 'price' | 'stock' | 'supplier' | 'delete') => void;
  bulkFormData: any;
  setBulkFormData: (data: any) => void;
  categories: string[];
  handleBulkOperation: () => void;
}

export const InventoryModals: React.FC<InventoryModalsProps> = ({
  isDetailsModalOpen,
  setIsDetailsModalOpen,
  selectedItem,
  setIsEditModalOpen,
  setFormData,
  isBulkModalOpen,
  setIsBulkModalOpen,
  selectedRowKeys,
  bulkOperation,
  setBulkOperation,
  bulkFormData,
  setBulkFormData,
  categories,
  handleBulkOperation
}) => {
  return (
    <>
      {/* Product Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Product Details"
        size="large"
      >
        {selectedItem && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Product Name</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedItem.productName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Brand</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedItem.brand || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Model</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedItem.model || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedItem.category}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Barcode</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedItem.barcode || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Serial Number</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedItem.serialNumber || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Supplier</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedItem.supplier || '-'}</p>
                </div>
              </div>

              {/* Stock and Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stock & Pricing</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current Stock</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedItem.stock}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Stock</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedItem.minStock || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit Price</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">₺{selectedItem.unitPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">VAT Included Price</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">₺{selectedItem.vatIncludedPrice.toFixed(2)}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Value</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">₺{selectedItem.totalValue.toFixed(2)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Warranty Period</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{selectedItem.warrantyPeriod || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <Badge 
                    variant={selectedItem.status === 'active' ? 'success' : selectedItem.status === 'inactive' ? 'warning' : 'danger'}
                  >
                    {selectedItem.status.charAt(0).toUpperCase() + selectedItem.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* Additional Information */}
              <div className="md:col-span-2 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                    {selectedItem.description || 'No description available'}
                  </p>
                </div>

                {selectedItem.features && selectedItem.features.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Features</label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedItem.features.map((feature, index) => (
                        <Badge key={index} variant="secondary">{feature}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div>
                    <label className="block font-medium">Created At</label>
                    <p>{new Date(selectedItem.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block font-medium">Last Updated</label>
                    <p>{new Date(selectedItem.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsDetailsModalOpen(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setFormData(selectedItem);
                  setIsDetailsModalOpen(false);
                  setIsEditModalOpen(true);
                }}
              >
                Edit Product
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Operations Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title={`Bulk Operations (${selectedRowKeys.length} items selected)`}
        size="medium"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Operation Type
            </label>
            <Select
              value={bulkOperation}
              onChange={(e) => setBulkOperation(e.target.value as any)}
              options={[
                { value: 'category', label: 'Update Category' },
                { value: 'price', label: 'Update Price' },
                { value: 'stock', label: 'Update Stock' },
                { value: 'supplier', label: 'Update Supplier' },
                { value: 'delete', label: 'Delete Items' }
              ]}
            />
          </div>

          {bulkOperation === 'category' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Category
              </label>
              <Select
                value={bulkFormData.category}
                onChange={(e) => setBulkFormData({...bulkFormData, category: e.target.value})}
                options={categories.filter(cat => cat !== 'All').map(cat => ({ value: cat, label: cat }))}
                placeholder="Select category"
              />
            </div>
          )}

          {bulkOperation === 'price' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Price Operation
                </label>
                <Select
                  value={bulkFormData.priceType}
                  onChange={(e) => setBulkFormData({...bulkFormData, priceType: e.target.value})}
                  options={[
                    { value: 'percentage', label: 'Percentage Increase/Decrease' },
                    { value: 'fixed', label: 'Set Fixed Price' },
                    { value: 'increase', label: 'Increase by Amount' },
                    { value: 'decrease', label: 'Decrease by Amount' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Value
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={bulkFormData.priceValue}
                  onChange={(e) => setBulkFormData({...bulkFormData, priceValue: e.target.value})}
                  placeholder={bulkFormData.priceType === 'percentage' ? 'Percentage (e.g., 10)' : 'Amount (₺)'}
                />
              </div>
            </div>
          )}

          {bulkOperation === 'stock' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stock Operation
                </label>
                <Select
                  value={bulkFormData.stockOperation}
                  onChange={(e) => setBulkFormData({...bulkFormData, stockOperation: e.target.value})}
                  options={[
                    { value: 'set', label: 'Set Stock Level' },
                    { value: 'increase', label: 'Increase Stock' },
                    { value: 'decrease', label: 'Decrease Stock' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quantity
                </label>
                <Input
                  type="number"
                  value={bulkFormData.stockValue}
                  onChange={(e) => setBulkFormData({...bulkFormData, stockValue: e.target.value})}
                  placeholder="Stock quantity"
                />
              </div>
            </div>
          )}

          {bulkOperation === 'supplier' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Supplier Name
              </label>
              <Input
                value={bulkFormData.supplier}
                onChange={(e) => setBulkFormData({...bulkFormData, supplier: e.target.value})}
                placeholder="Enter supplier name"
              />
            </div>
          )}

          {bulkOperation === 'delete' && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">
                <strong>Warning:</strong> This action cannot be undone. {selectedRowKeys.length} items will be permanently deleted.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => setIsBulkModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBulkOperation}
            variant={bulkOperation === 'delete' ? 'danger' : 'default'}
          >
            {bulkOperation === 'delete' ? 'Delete Items' : 'Apply Changes'}
          </Button>
        </div>
      </Modal>
    </>
  );
};