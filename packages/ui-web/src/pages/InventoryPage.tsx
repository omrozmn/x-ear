import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Upload, 
  Download, 
  Filter, 
  MoreHorizontal,
  Package,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';

import { 
  DataTable, 
  StatsCard, 
  Modal, 
  Button, 
  Input, 
  Select, 
  Badge,
  Card,
  Checkbox,
  Textarea
} from '../components/ui';

// Types
interface InventoryItem {
  id: string;
  productName: string;
  brand: string;
  model: string;
  category: string;
  stock: number;
  minStock: number;
  unitPrice: number;
  vatIncludedPrice: number;
  totalValue: number;
  barcode?: string;
  serialNumber?: string;
  supplier?: string;
  warrantyPeriod?: string;
  description?: string;
  features?: string[];
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: string;
  updatedAt: string;
}

interface InventoryFilters {
  search: string;
  category: string;
  brand: string;
  status: string;
  lowStock: boolean;
}

interface InventoryStats {
  totalProducts: number;
  lowStockCount: number;
  totalValue: number;
  activeTrials: number;
}

// Sample data - will be replaced with API calls
const sampleInventoryData: InventoryItem[] = [
  {
    id: '1',
    productName: 'Wireless Headphones',
    brand: 'TechBrand',
    model: 'WH-1000XM4',
    category: 'Electronics',
    stock: 25,
    minStock: 10,
    unitPrice: 299.99,
    vatIncludedPrice: 353.99,
    totalValue: 8849.75,
    barcode: '1234567890123',
    supplier: 'Tech Supplier Inc.',
    warrantyPeriod: '2 years',
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:45:00Z'
  },
  {
    id: '2',
    productName: 'Bluetooth Speaker',
    brand: 'AudioMax',
    model: 'BT-500',
    category: 'Electronics',
    stock: 5,
    minStock: 15,
    unitPrice: 89.99,
    vatIncludedPrice: 106.19,
    totalValue: 530.95,
    barcode: '2345678901234',
    supplier: 'Audio Solutions Ltd.',
    warrantyPeriod: '1 year',
    status: 'active',
    createdAt: '2024-01-10T09:15:00Z',
    updatedAt: '2024-01-18T16:20:00Z'
  }
];

const categories = ['All', 'Electronics', 'Accessories', 'Components', 'Tools'];
const brands = ['All', 'TechBrand', 'AudioMax', 'ComponentCorp', 'ToolMaster'];
const statusOptions = ['All', 'Active', 'Inactive', 'Discontinued'];

export const InventoryPage: React.FC = () => {
  // State management
  const [inventoryData, setInventoryData] = useState<InventoryItem[]>(sampleInventoryData);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<InventoryFilters>({
    search: '',
    category: 'All',
    brand: 'All',
    status: 'All',
    lowStock: false
  });
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Bulk operations state
  const [bulkOperation, setBulkOperation] = useState<'category' | 'price' | 'stock' | 'supplier' | 'delete'>('category');
  const [bulkFormData, setBulkFormData] = useState({
    category: '',
    priceType: 'percentage', // percentage, fixed, increase, decrease
    priceValue: '',
    stockOperation: 'set', // set, increase, decrease
    stockValue: '',
    supplier: ''
  });
  
  // Table states
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  // Form state for add/edit modal
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    productName: '',
    brand: '',
    model: '',
    category: '',
    stock: 0,
    minStock: 0,
    unitPrice: 0,
    barcode: '',
    supplier: '',
    warrantyPeriod: '',
    status: 'active'
  });

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let filtered = inventoryData;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.productName.toLowerCase().includes(searchLower) ||
        item.brand.toLowerCase().includes(searchLower) ||
        item.model.toLowerCase().includes(searchLower) ||
        item.barcode?.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filters.category !== 'All') {
      filtered = filtered.filter(item => item.category === filters.category);
    }

    // Brand filter
    if (filters.brand !== 'All') {
      filtered = filtered.filter(item => item.brand === filters.brand);
    }

    // Status filter
    if (filters.status !== 'All') {
      filtered = filtered.filter(item => item.status === filters.status.toLowerCase());
    }

    // Low stock filter
    if (filters.lowStock) {
      filtered = filtered.filter(item => item.stock <= item.minStock);
    }

    return filtered;
  }, [inventoryData, filters]);

  // Calculate statistics
  const stats: InventoryStats = useMemo(() => {
    const totalProducts = inventoryData.length;
    const lowStockCount = inventoryData.filter(item => item.stock <= item.minStock).length;
    const totalValue = inventoryData.reduce((sum, item) => sum + item.totalValue, 0);
    const activeTrials = inventoryData.filter(item => item.status === 'active').length;

    return {
      totalProducts,
      lowStockCount,
      totalValue,
      activeTrials
    };
  }, [inventoryData]);

  // Update pagination total when filtered data changes
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: filteredData.length
    }));
  }, [filteredData]);

  // Table columns configuration
  const columns = [
    {
      key: 'productName',
      title: 'Product Name',
      sortable: true,
      render: (value: string, record: InventoryItem) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white">{value}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{record.brand} - {record.model}</span>
        </div>
      )
    },
    {
      key: 'category',
      title: 'Category',
      sortable: true,
      render: (value: string) => (
        <Badge variant="secondary">{value}</Badge>
      )
    },
    {
      key: 'stock',
      title: 'Stock',
      sortable: true,
      render: (value: number, record: InventoryItem) => (
        <div className="flex items-center space-x-2">
          <span className={`font-medium ${value <= record.minStock ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
            {value}
          </span>
          {value <= record.minStock && (
            <AlertTriangle className="w-4 h-4 text-red-500" />
          )}
        </div>
      )
    },
    {
      key: 'minStock',
      title: 'Min Stock',
      sortable: true
    },
    {
      key: 'unitPrice',
      title: 'Unit Price',
      sortable: true,
      render: (value: number) => `₺${value.toFixed(2)}`
    },
    {
      key: 'vatIncludedPrice',
      title: 'VAT Included Price',
      sortable: true,
      render: (value: number) => `₺${value.toFixed(2)}`
    },
    {
      key: 'totalValue',
      title: 'Total Value',
      sortable: true,
      render: (value: number) => `₺${value.toFixed(2)}`
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => (
        <Badge 
          variant={value === 'active' ? 'success' : value === 'inactive' ? 'warning' : 'danger'}
        >
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      )
    }
  ];

  // Table actions
  const actions = [
    {
      key: 'view',
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      onClick: (record: InventoryItem) => {
        setSelectedItem(record);
        setIsDetailsModalOpen(true);
      }
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      onClick: (record: InventoryItem) => {
        setSelectedItem(record);
        setFormData(record);
        setIsEditModalOpen(true);
      }
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'danger' as const,
      onClick: (record: InventoryItem) => {
        if (window.confirm(`Are you sure you want to delete ${record.productName}?`)) {
          setInventoryData(prev => prev.filter(item => item.id !== record.id));
        }
      }
    }
  ];

  // Bulk actions
  const bulkActions = [
    {
      key: 'bulk-operations',
      label: 'Bulk Operations',
      icon: <MoreHorizontal className="w-4 h-4" />,
      onClick: (selectedRecords: InventoryItem[]) => {
        setIsBulkModalOpen(true);
      }
    },
    {
      key: 'delete',
      label: 'Delete Selected',
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'danger' as const,
      onClick: (selectedRecords: InventoryItem[]) => {
        if (window.confirm(`Are you sure you want to delete ${selectedRecords.length} items?`)) {
          const selectedIds = selectedRecords.map(record => record.id);
          setInventoryData(prev => prev.filter(item => !selectedIds.includes(item.id)));
          setSelectedRowKeys([]);
        }
      }
    },
    {
      key: 'export',
      label: 'Export Selected',
      icon: <Download className="w-4 h-4" />,
      onClick: (selectedRecords: InventoryItem[]) => {
        exportToCSV(selectedRecords);
      }
    }
  ];

  // Bulk operations handler
  const handleBulkOperation = () => {
    const selectedRecords = inventoryData.filter(item => selectedRowKeys.includes(item.id));
    
    if (selectedRecords.length === 0) {
      alert('Please select items to perform bulk operations');
      return;
    }

    try {
      let updatedData = [...inventoryData];
      
      switch (bulkOperation) {
        case 'category':
          if (!bulkFormData.category) {
            alert('Please select a category');
            return;
          }
          updatedData = updatedData.map(item => 
            selectedRowKeys.includes(item.id) 
              ? { ...item, category: bulkFormData.category, updatedAt: new Date().toISOString() }
              : item
          );
          break;
          
        case 'price':
          if (!bulkFormData.priceValue) {
            alert('Please enter a price value');
            return;
          }
          const priceValue = parseFloat(bulkFormData.priceValue);
          updatedData = updatedData.map(item => {
            if (!selectedRowKeys.includes(item.id)) return item;
            
            let newPrice = item.unitPrice;
            switch (bulkFormData.priceType) {
              case 'percentage':
                newPrice = item.unitPrice * (1 + priceValue / 100);
                break;
              case 'fixed':
                newPrice = priceValue;
                break;
              case 'increase':
                newPrice = item.unitPrice + priceValue;
                break;
              case 'decrease':
                newPrice = item.unitPrice - priceValue;
                break;
            }
            
            const vatIncludedPrice = newPrice * 1.18; // 18% VAT
            const totalValue = newPrice * item.stock;
            
            return {
              ...item,
              unitPrice: Math.max(0, newPrice),
              vatIncludedPrice,
              totalValue,
              updatedAt: new Date().toISOString()
            };
          });
          break;
          
        case 'stock':
          if (!bulkFormData.stockValue) {
            alert('Please enter a stock value');
            return;
          }
          const stockValue = parseInt(bulkFormData.stockValue);
          updatedData = updatedData.map(item => {
            if (!selectedRowKeys.includes(item.id)) return item;
            
            let newStock = item.stock;
            switch (bulkFormData.stockOperation) {
              case 'set':
                newStock = stockValue;
                break;
              case 'increase':
                newStock = item.stock + stockValue;
                break;
              case 'decrease':
                newStock = Math.max(0, item.stock - stockValue);
                break;
            }
            
            const totalValue = item.unitPrice * newStock;
            
            return {
              ...item,
              stock: newStock,
              totalValue,
              updatedAt: new Date().toISOString()
            };
          });
          break;
          
        case 'supplier':
          if (!bulkFormData.supplier) {
            alert('Please enter a supplier name');
            return;
          }
          updatedData = updatedData.map(item => 
            selectedRowKeys.includes(item.id) 
              ? { ...item, supplier: bulkFormData.supplier, updatedAt: new Date().toISOString() }
              : item
          );
          break;
          
        case 'delete':
          if (window.confirm(`Are you sure you want to delete ${selectedRecords.length} items?`)) {
            updatedData = updatedData.filter(item => !selectedRowKeys.includes(item.id));
          } else {
            return;
          }
          break;
      }
      
      setInventoryData(updatedData);
      setSelectedRowKeys([]);
      setIsBulkModalOpen(false);
      
      // Reset bulk form
      setBulkFormData({
        category: '',
        priceType: 'percentage',
        priceValue: '',
        stockOperation: 'set',
        stockValue: '',
        supplier: ''
      });
      
    } catch (error) {
      console.error('Bulk operation error:', error);
      alert('An error occurred during bulk operation');
    }
  };

  // Export to CSV function
  const exportToCSV = (data: InventoryItem[]) => {
    const headers = [
      'ID', 'Product Name', 'Brand', 'Model', 'Category', 'Stock', 'Min Stock',
      'Unit Price', 'VAT Included Price', 'Total Value', 'Barcode', 'Serial Number',
      'Supplier', 'Warranty Period', 'Status', 'Created At', 'Updated At'
    ];
    
    const csvContent = [
      headers.join(','),
      ...data.map(item => [
        item.id,
        `"${item.productName}"`,
        `"${item.brand}"`,
        `"${item.model}"`,
        `"${item.category}"`,
        item.stock,
        item.minStock,
        item.unitPrice,
        item.vatIncludedPrice,
        item.totalValue,
        `"${item.barcode || ''}"`,
        `"${item.serialNumber || ''}"`,
        `"${item.supplier || ''}"`,
        `"${item.warrantyPeriod || ''}"`,
        item.status,
        item.createdAt,
        item.updatedAt
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print inventory function
  const printInventory = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inventory Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .header { text-align: center; margin-bottom: 30px; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat-item { text-align: center; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Inventory Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="stats">
          <div class="stat-item">
            <h3>${stats.totalProducts}</h3>
            <p>Total Products</p>
          </div>
          <div class="stat-item">
            <h3>${stats.lowStockCount}</h3>
            <p>Low Stock Items</p>
          </div>
          <div class="stat-item">
            <h3>₺${stats.totalValue.toFixed(2)}</h3>
            <p>Total Value</p>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Brand</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Unit Price</th>
              <th>Total Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(item => `
              <tr>
                <td>${item.productName}</td>
                <td>${item.brand}</td>
                <td>${item.category}</td>
                <td>${item.stock}</td>
                <td>₺${item.unitPrice.toFixed(2)}</td>
                <td>₺${item.totalValue.toFixed(2)}</td>
                <td>${item.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Event handlers
  const handleFilterChange = (key: keyof InventoryFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAddItem = () => {
    // Validate form data
    if (!formData.productName || !formData.brand || !formData.category) {
      alert('Please fill in all required fields');
      return false;
    }

    const newItem: InventoryItem = {
      id: Date.now().toString(),
      productName: formData.productName!,
      brand: formData.brand!,
      model: formData.model || '',
      category: formData.category!,
      stock: formData.stock || 0,
      minStock: formData.minStock || 0,
      unitPrice: formData.unitPrice || 0,
      vatIncludedPrice: (formData.unitPrice || 0) * 1.18, // 18% VAT
      totalValue: (formData.stock || 0) * ((formData.unitPrice || 0) * 1.18),
      barcode: formData.barcode,
      supplier: formData.supplier,
      warrantyPeriod: formData.warrantyPeriod,
      status: formData.status as 'active' | 'inactive' | 'discontinued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setInventoryData(prev => [...prev, newItem]);
    setFormData({
      productName: '',
      brand: '',
      model: '',
      category: '',
      stock: 0,
      minStock: 0,
      unitPrice: 0,
      barcode: '',
      supplier: '',
      warrantyPeriod: '',
      status: 'active'
    });
    
    return true; // Allow modal to close
  };

  const handleEditItem = () => {
    if (!selectedItem || !formData.productName || !formData.brand || !formData.category) {
      alert('Please fill in all required fields');
      return false;
    }

    const updatedItem: InventoryItem = {
      ...selectedItem,
      ...formData,
      vatIncludedPrice: (formData.unitPrice || 0) * 1.18,
      totalValue: (formData.stock || 0) * ((formData.unitPrice || 0) * 1.18),
      updatedAt: new Date().toISOString()
    } as InventoryItem;

    setInventoryData(prev => 
      prev.map(item => item.id === selectedItem.id ? updatedItem : item)
    );
    
    setSelectedItem(null);
    setFormData({
      productName: '',
      brand: '',
      model: '',
      category: '',
      stock: 0,
      minStock: 0,
      unitPrice: 0,
      barcode: '',
      supplier: '',
      warrantyPeriod: '',
      status: 'active'
    });
    
    return true;
  };

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination(prev => ({
      ...prev,
      current: page,
      pageSize
    }));
  };

  const handleRowSelection = (selectedRowKeys: (string | number)[], selectedRows: InventoryItem[]) => {
    setSelectedRowKeys(selectedRowKeys);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your product inventory</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={printInventory}
            icon={<Download className="w-4 h-4" />}
          >
            Print
          </Button>
          <Button
            variant="outline"
            onClick={() => exportToCSV(filteredData)}
            icon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsBulkUploadModalOpen(true)}
            icon={<Upload className="w-4 h-4" />}
          >
            Bulk Upload
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Products"
          value={stats.totalProducts.toString()}
          color="blue"
          icon={<Package className="w-6 h-6" />}
        />
        <StatsCard
          title="Low Stock"
          value={stats.lowStockCount.toString()}
          color="red"
          icon={<AlertTriangle className="w-6 h-6" />}
        />
        <StatsCard
          title="Total Value"
          value={`₺${stats.totalValue.toFixed(2)}`}
          color="green"
          icon={<DollarSign className="w-6 h-6" />}
        />
        <StatsCard
          title="Active Items"
          value={stats.activeTrials.toString()}
          color="purple"
          icon={<TrendingUp className="w-6 h-6" />}
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-2">
            <Input
              placeholder="Search products, brands, models..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select
            value={filters.category}
            onChange={(value) => handleFilterChange('category', value)}
            options={categories.map(cat => ({ value: cat, label: cat }))}
            placeholder="Category"
          />
          <Select
            value={filters.brand}
            onChange={(value) => handleFilterChange('brand', value)}
            options={brands.map(brand => ({ value: brand, label: brand }))}
            placeholder="Brand"
          />
          <Select
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
            options={statusOptions.map(status => ({ value: status, label: status }))}
            placeholder="Status"
          />
          <div className="flex items-center">
            <Checkbox
              checked={filters.lowStock}
              onChange={(checked) => handleFilterChange('lowStock', checked)}
              label="Low Stock Only"
            />
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card>
        <DataTable
          data={filteredData.slice(
            (pagination.current - 1) * pagination.pageSize,
            pagination.current * pagination.pageSize
          )}
          columns={columns}
          loading={loading}
          pagination={{
            ...pagination,
            onChange: handlePaginationChange
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: handleRowSelection
          }}
          actions={actions}
          bulkActions={bulkActions}
          searchable={false} // We have custom search
          sortable={true}
          rowKey="id"
          hoverable={true}
          striped={true}
        />
      </Card>

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddItem}
        title="Add New Product"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Product Name *"
              value={formData.productName || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
              placeholder="Enter product name"
            />
            <Input
              label="Brand *"
              value={formData.brand || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
              placeholder="Enter brand"
            />
            <Input
              label="Model"
              value={formData.model || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
              placeholder="Enter model"
            />
            <Select
              label="Category *"
              value={formData.category || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              options={categories.filter(cat => cat !== 'All').map(cat => ({ value: cat, label: cat }))}
              placeholder="Select category"
            />
            <Input
              label="Stock Quantity"
              type="number"
              value={formData.stock?.toString() || '0'}
              onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
              placeholder="0"
            />
            <Input
              label="Minimum Stock"
              type="number"
              value={formData.minStock?.toString() || '0'}
              onChange={(e) => setFormData(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))}
              placeholder="0"
            />
            <Input
              label="Unit Price"
              type="number"
              step="0.01"
              value={formData.unitPrice?.toString() || '0'}
              onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />
            <Input
              label="Barcode"
              value={formData.barcode || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
              placeholder="Enter barcode"
            />
            <Input
              label="Supplier"
              value={formData.supplier || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
              placeholder="Enter supplier"
            />
            <Input
              label="Warranty Period"
              value={formData.warrantyPeriod || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, warrantyPeriod: e.target.value }))}
              placeholder="e.g., 2 years"
            />
          </div>
          <Select
            label="Status"
            value={formData.status || 'active'}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'discontinued' }))}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'discontinued', label: 'Discontinued' }
            ]}
          />
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        onSave={handleEditItem}
        title="Edit Product"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Product Name *"
              value={formData.productName || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
              placeholder="Enter product name"
            />
            <Input
              label="Brand *"
              value={formData.brand || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
              placeholder="Enter brand"
            />
            <Input
              label="Model"
              value={formData.model || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
              placeholder="Enter model"
            />
            <Select
              label="Category *"
              value={formData.category || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              options={categories.filter(cat => cat !== 'All').map(cat => ({ value: cat, label: cat }))}
              placeholder="Select category"
            />
            <Input
              label="Stock Quantity"
              type="number"
              value={formData.stock?.toString() || '0'}
              onChange={(e) => setFormData(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
              placeholder="0"
            />
            <Input
              label="Minimum Stock"
              type="number"
              value={formData.minStock?.toString() || '0'}
              onChange={(e) => setFormData(prev => ({ ...prev, minStock: parseInt(e.target.value) || 0 }))}
              placeholder="0"
            />
            <Input
              label="Unit Price"
              type="number"
              step="0.01"
              value={formData.unitPrice?.toString() || '0'}
              onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
              placeholder="0.00"
            />
            <Input
              label="Barcode"
              value={formData.barcode || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
              placeholder="Enter barcode"
            />
            <Input
              label="Supplier"
              value={formData.supplier || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
              placeholder="Enter supplier"
            />
            <Input
              label="Warranty Period"
              value={formData.warrantyPeriod || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, warrantyPeriod: e.target.value }))}
              placeholder="e.g., 2 years"
            />
          </div>
          <Select
            label="Status"
            value={formData.status || 'active'}
            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' | 'discontinued' }))}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'discontinued', label: 'Discontinued' }
            ]}
          />
        </div>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        title="Bulk Upload Products"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-center">
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Upload a CSV file with your product data
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
            <p>CSV format: Product Name, Brand, Model, Category, Stock, Min Stock, Unit Price, Barcode, Supplier, Warranty Period</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryPage;