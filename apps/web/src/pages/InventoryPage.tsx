import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Upload, Download } from 'lucide-react';
import { Button, Modal } from '@x-ear/ui-web';
import { InventoryList } from '../components/inventory/InventoryList';
import { InventoryStats } from '../components/inventory/InventoryStats';
import { InventoryForm } from '../components/inventory/InventoryForm';
import { AdvancedFilters, InventoryFilters } from '../components/inventory/AdvancedFilters';
import { InventoryItem } from '../types/inventory';

const api = axios.create({
  baseURL: 'http://localhost:5003'
});

export const InventoryPage: React.FC = () => {
  // State management
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Data for filters
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await api.get('/api/inventory', {
          params: { per_page: 100 }
        });
        
        if (response.data.success && Array.isArray(response.data.data)) {
          const items = response.data.data;
          
          // Extract unique values
          const uniqueCategories = [...new Set(items.map((item: any) => item.category).filter(Boolean))];
          const uniqueBrands = [...new Set(items.map((item: any) => item.brand).filter(Boolean))];
          const uniqueSuppliers = [...new Set(items.map((item: any) => item.supplier).filter(Boolean))];
          
          setCategories(uniqueCategories);
          setBrands(uniqueBrands);
          setSuppliers(uniqueSuppliers);
        }
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };
    
    loadFilterOptions();
  }, []);

  const handleFiltersChange = (newFilters: InventoryFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleItemSave = (item: InventoryItem) => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedItem(null);
    // Reload list will happen automatically via subscription in InventoryList
  };

  const handleItemEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleItemDelete = async (item: InventoryItem) => {
    if (window.confirm(`${item.name} ürününü silmek istediğinizden emin misiniz?`)) {
      try {
        await api.delete(`/api/inventory/${item.id}`);
        // Reload will happen via subscription
      } catch (error) {
        console.error('Delete failed:', error);
        alert('Silme işlemi başarısız oldu');
      }
    }
  };

  const exportInventory = async () => {
    try {
      const response = await api.get('/api/inventory', {
        params: { per_page: 1000 }
      });
      
      if (response.data.success && Array.isArray(response.data.data)) {
        const items = response.data.data;
        
        const headers = [
          'ID', 'Ürün Adı', 'Marka', 'Model', 'Kategori', 'Stok', 
          'Fiyat', 'Barkod', 'Tedarikçi'
        ];
        
        const csvContent = [
          headers.join(','),
          ...items.map((item: any) => [
            item.id,
            `"${item.name || ''}"`,
            `"${item.brand || ''}"`,
            `"${item.model || ''}"`,
            `"${item.category || ''}"`,
            item.available_inventory || 0,
            item.price || 0,
            `"${item.barcode || ''}"`,
            `"${item.supplier || ''}"`
          ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Dışa aktarma başarısız oldu');
    }
  };

  const importInventory = () => {
    setIsBulkUploadModalOpen(true);
  };


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Envanter Yönetimi</h1>
          <p className="text-gray-600 dark:text-gray-400">İşitme cihazları ve aksesuarlarını yönetin</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={exportInventory}
            icon={<Download className="w-4 h-4" />}
          >
            Dışa Aktar
          </Button>
          <Button
            variant="outline"
            onClick={importInventory}
            icon={<Upload className="w-4 h-4" />}
          >
            İçe Aktar
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Yeni Ürün
          </Button>
        </div>
      </div>

      {/* Stats */}
      <InventoryStats />

      {/* Filters */}
      <AdvancedFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={clearFilters}
        categories={categories}
        brands={brands}
        suppliers={suppliers}
        isExpanded={showFilters}
        onToggleExpanded={() => setShowFilters(!showFilters)}
      />

      {/* Inventory List */}
      <InventoryList
        filters={filters}
        onItemEdit={handleItemEdit}
        onItemDelete={handleItemDelete}
      />

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Yeni Ürün Ekle"
        size="lg"
      >
        <InventoryForm
          onSave={handleItemSave}
          onCancel={() => setIsAddModalOpen(false)}
        />
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        title="Ürün Düzenle"
        size="lg"
      >
        <InventoryForm
          item={selectedItem || undefined}
          onSave={handleItemSave}
          onCancel={() => {
            setIsEditModalOpen(false);
            setSelectedItem(null);
          }}
        />
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        title="Toplu Yükleme"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              CSV dosyanızla ürünlerinizi toplu olarak yükleyin
            </p>
          </div>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
            <input
              type="file"
              accept=".csv"
              className="w-full"
              onChange={(e) => {
                // Handle file upload
                console.log('File selected:', e.target.files?.[0]);
              }}
            />
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <p>CSV formatı: Ürün Adı, Marka, Model, Kategori, Stok, Fiyat, Barkod, Tedarikçi</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryPage;