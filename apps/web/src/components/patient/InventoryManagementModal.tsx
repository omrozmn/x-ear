import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea, Modal } from '@x-ear/ui-web';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  CheckCircle, 
  Loader2, 
  Filter, 
  RefreshCw,
  AlertCircle,
  Package
} from 'lucide-react';

export interface InventoryItem {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  type: string;
  serialNumbers: string[];
  totalStock: number;
  availableStock: number;
  assignedStock: number;
  onTrialStock: number;
  defectiveStock: number;
  price: number;
  listPrice: number;
  sgkPrice: number;
  warrantyPeriod: number;
  isActive: boolean;
  supplier?: string;
  supplierId?: string;
  ear?: 'left' | 'right' | 'both';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface InventoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInventoryUpdate?: (items: InventoryItem[]) => void;
  isLoading?: boolean;
}

interface InventoryFormData {
  name: string;
  brand: string;
  model: string;
  category: string;
  type: string;
  totalStock: number;
  availableStock: number;
  assignedStock: number;
  onTrialStock: number;
  defectiveStock: number;
  price: number;
  listPrice: number;
  sgkPrice: number;
  warrantyPeriod: number;
  notes: string;
}

interface FormErrors {
  name?: string;
  brand?: string;
  model?: string;
  category?: string;
  type?: string;
  totalStock?: string;
  price?: string;
  listPrice?: string;
  sgkPrice?: string;
  warrantyPeriod?: string;
}

export const InventoryManagementModal: React.FC<InventoryManagementModalProps> = ({
  isOpen,
  onClose,
  onInventoryUpdate,
  isLoading = false
}) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<InventoryFormData>({
    name: '',
    brand: '',
    model: '',
    category: '',
    type: '',
    totalStock: 0,
    availableStock: 0,
    assignedStock: 0,
    onTrialStock: 0,
    defectiveStock: 0,
    price: 0,
    listPrice: 0,
    sgkPrice: 0,
    warrantyPeriod: 12,
    notes: ''
  });

  // Clear messages after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Load inventory data
  useEffect(() => {
    if (isOpen) {
      loadInventory();
    }
  }, [isOpen]);

  const loadInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API call with mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockInventory: InventoryItem[] = [
        {
          id: '1',
          name: 'Hearing Aid Premium',
          brand: 'AudioTech',
          model: 'AT-2024',
          category: 'hearing_aid',
          type: 'behind_ear',
          serialNumbers: ['AT001', 'AT002', 'AT003'],
          totalStock: 15,
          availableStock: 10,
          assignedStock: 3,
          onTrialStock: 2,
          defectiveStock: 0,
          price: 2500,
          listPrice: 3000,
          sgkPrice: 2200,
          warrantyPeriod: 24,
          isActive: true,
          notes: 'Premium model with advanced noise cancellation',
          createdAt: '2024-01-15T10:00:00Z',
          updatedAt: '2024-01-20T14:30:00Z'
        },
        {
          id: '2',
          name: 'Cochlear Implant Basic',
          brand: 'CochlearCorp',
          model: 'CC-100',
          category: 'cochlear_implant',
          type: 'internal',
          serialNumbers: ['CC001', 'CC002'],
          totalStock: 8,
          availableStock: 4,
          assignedStock: 2,
          onTrialStock: 2,
          defectiveStock: 0,
          price: 15000,
          listPrice: 18000,
          sgkPrice: 14000,
          warrantyPeriod: 60,
          isActive: true,
          notes: 'Basic cochlear implant for severe hearing loss',
          createdAt: '2024-01-10T09:00:00Z',
          updatedAt: '2024-01-18T16:45:00Z'
        }
      ];
      
      setInventory(mockInventory);
      onInventoryUpdate?.(mockInventory);
    } catch (err) {
      setError('Failed to load inventory. Please try again.');
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.brand.trim()) {
      errors.brand = 'Brand is required';
    }
    
    if (!formData.model.trim()) {
      errors.model = 'Model is required';
    }
    
    if (!formData.category) {
      errors.category = 'Category is required';
    }
    
    if (!formData.type) {
      errors.type = 'Type is required';
    }
    
    if (formData.totalStock < 0) {
      errors.totalStock = 'Stock cannot be negative';
    }
    
    if (formData.price < 0) {
      errors.price = 'Price cannot be negative';
    }
    
    if (formData.listPrice < formData.price) {
      errors.listPrice = 'List price should be greater than or equal to price';
    }
    
    if (formData.sgkPrice < 0) {
      errors.sgkPrice = 'SGK price cannot be negative';
    }
    
    if (formData.warrantyPeriod < 1 || formData.warrantyPeriod > 120) {
      errors.warrantyPeriod = 'Warranty period must be between 1 and 120 months';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddItem = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newItem: InventoryItem = {
        id: Date.now().toString(),
        ...formData,
        serialNumbers: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updatedInventory = [...inventory, newItem];
      setInventory(updatedInventory);
      onInventoryUpdate?.(updatedInventory);
      
      setShowAddForm(false);
      resetForm();
      setSuccessMessage('Item added successfully!');
    } catch (err) {
      setError('Failed to add item. Please try again.');
      console.error('Error adding item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || !validateForm()) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const updatedItem: InventoryItem = {
        ...editingItem,
        ...formData,
        updatedAt: new Date().toISOString()
      };
      
      const updatedInventory = inventory.map(item => 
        item.id === editingItem.id ? updatedItem : item
      );
      
      setInventory(updatedInventory);
      onInventoryUpdate?.(updatedInventory);
      
      setEditingItem(null);
      resetForm();
      setSuccessMessage('Item updated successfully!');
    } catch (err) {
      setError('Failed to update item. Please try again.');
      console.error('Error updating item:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedInventory = inventory.filter(item => item.id !== id);
      setInventory(updatedInventory);
      onInventoryUpdate?.(updatedInventory);
      
      setSuccessMessage('Item deleted successfully!');
    } catch (err) {
      setError('Failed to delete item. Please try again.');
      console.error('Error deleting item:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      model: '',
      category: '',
      type: '',
      totalStock: 0,
      availableStock: 0,
      assignedStock: 0,
      onTrialStock: 0,
      defectiveStock: 0,
      price: 0,
      listPrice: 0,
      sgkPrice: 0,
      warrantyPeriod: 12,
      notes: ''
    });
    setFormErrors({});
  };

  const startEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      brand: item.brand,
      model: item.model,
      category: item.category,
      type: item.type,
      totalStock: item.totalStock,
      availableStock: item.availableStock,
      assignedStock: item.assignedStock,
      onTrialStock: item.onTrialStock || 0,
      defectiveStock: item.defectiveStock || 0,
      price: item.price,
      listPrice: item.listPrice,
      sgkPrice: item.sgkPrice,
      warrantyPeriod: item.warrantyPeriod,
      notes: item.notes || ''
    });
    setFormErrors({});
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setShowAddForm(false);
    resetForm();
  };

  // Filter inventory based on search and filters
  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    const matchesType = !typeFilter || item.type === typeFilter;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    { value: 'hearing_aid', label: 'Hearing Aid' },
    { value: 'cochlear_implant', label: 'Cochlear Implant' },
    { value: 'bone_anchored', label: 'Bone Anchored' },
    { value: 'accessories', label: 'Accessories' }
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'behind_ear', label: 'Behind the Ear (BTE)' },
    { value: 'in_ear', label: 'In the Ear (ITE)' },
    { value: 'in_canal', label: 'In the Canal (ITC)' },
    { value: 'completely_in_canal', label: 'Completely in Canal (CIC)' },
    { value: 'internal', label: 'Internal' },
    { value: 'external', label: 'External' }
  ];

  const getStockStatus = (item: InventoryItem) => {
    const availableForSale = item.availableStock - (item.onTrialStock || 0);
    const stockPercentage = (availableForSale / item.totalStock) * 100;
    
    if (item.onTrialStock > 0 && item.onTrialStock >= item.availableStock) {
      return { color: 'text-blue-600', label: 'All on Trial' };
    }
    if (stockPercentage <= 10) return { color: 'text-red-600', label: 'Critical' };
    if (stockPercentage <= 25) return { color: 'text-yellow-600', label: 'Low' };
    if (item.onTrialStock > 0) return { color: 'text-blue-600', label: 'Some on Trial' };
    return { color: 'text-green-600', label: 'Good' };
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Inventory Management"
      size="xl"
      className="max-w-7xl"
    >
      <div className="space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {successMessage && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Inventory Items</h2>
            {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={loadInventory}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setShowAddForm(true)}
              disabled={loading || saving}
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>
          
          <Select
            label=""
            options={categoryOptions}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            disabled={loading}
          />
          
          <Select
            label=""
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            disabled={loading}
          />
          
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="w-4 h-4" />
            <span>{filteredInventory.length} of {inventory.length} items</span>
          </div>
        </div>

         {/* Inventory Table */}
         {loading ? (
           <div className="flex items-center justify-center py-12">
             <div className="text-center">
               <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
               <p className="text-gray-600">Loading inventory...</p>
             </div>
           </div>
         ) : (
           <div className="overflow-x-auto">
             <table className="w-full border-collapse">
               <thead>
                 <tr className="bg-gray-50">
                   <th className="text-left p-3 font-medium border-b">Item Details</th>
                   <th className="text-left p-3 font-medium border-b">Stock Status</th>
                   <th className="text-left p-3 font-medium border-b">Pricing</th>
                   <th className="text-left p-3 font-medium border-b">Warranty</th>
                   <th className="text-center p-3 font-medium border-b">Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredInventory.map((item) => {
                   const stockStatus = getStockStatus(item);
                   return (
                     <tr key={item.id} className="border-b hover:bg-gray-50">
                       <td className="p-3 border-b">
                         <div className="space-y-1">
                           <div className="font-medium text-gray-900">{item.name}</div>
                           <div className="text-sm text-gray-600">{item.brand} - {item.model}</div>
                           <div className="text-xs text-gray-500">
                             {categoryOptions.find(c => c.value === item.category)?.label} • 
                             {typeOptions.find(t => t.value === item.type)?.label}
                           </div>
                         </div>
                       </td>
                       <td className="p-3 border-b">
                         <div className="space-y-1">
                           <div className="text-sm">
                             <span className="font-medium">Available:</span> {item.availableStock}
                           </div>
                           <div className="text-sm">
                             <span className="font-medium">Assigned:</span> {item.assignedStock}
                           </div>
                           <div className="text-sm">
                             <span className="font-medium">On Trial:</span> {item.onTrialStock || 0}
                           </div>
                           <div className="text-sm">
                             <span className="font-medium">Defective:</span> {item.defectiveStock || 0}
                           </div>
                           <div className="text-sm">
                             <span className="font-medium">Total:</span> {item.totalStock}
                           </div>
                           <div className={`text-xs font-medium ${stockStatus.color}`}>
                             {stockStatus.label}
                           </div>
                         </div>
                       </td>
                       <td className="p-3 border-b">
                         <div className="space-y-1 text-sm">
                           <div><span className="font-medium">Price:</span> ₺{item.price.toLocaleString()}</div>
                           <div><span className="font-medium">List:</span> ₺{item.listPrice.toLocaleString()}</div>
                           <div><span className="font-medium">SGK:</span> ₺{item.sgkPrice.toLocaleString()}</div>
                         </div>
                       </td>
                       <td className="p-3 border-b">
                         <div className="text-sm">
                           {item.warrantyPeriod} months
                         </div>
                       </td>
                       <td className="p-3 border-b">
                         <div className="flex justify-center gap-2">
                           <Button
                             onClick={() => startEdit(item)}
                             variant="outline"
                             size="sm"
                             disabled={saving}
                           >
                             <Edit className="w-4 h-4" />
                           </Button>
                           <Button
                             onClick={() => handleDeleteItem(item.id)}
                             variant="outline"
                             size="sm"
                             disabled={saving}
                             className="text-red-600 hover:text-red-700 hover:border-red-300"
                           >
                             {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                           </Button>
                         </div>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
             
             {filteredInventory.length === 0 && !loading && (
               <div className="text-center py-8 text-gray-500">
                 {inventory.length === 0 ? 'No inventory items found.' : 'No items match your search criteria.'}
               </div>
             )}
           </div>
         )}

        {/* Add/Edit Item Modal */}
        {(showAddForm || editingItem) && (
          <Modal
            isOpen={true}
            onClose={cancelEdit}
            title={editingItem ? 'Edit Item' : 'Add New Item'}
            size="lg"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Item Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  error={formErrors.name}
                  disabled={saving}
                  required
                />
                
                <Input
                  label="Brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  error={formErrors.brand}
                  disabled={saving}
                  required
                />
                
                <Input
                  label="Model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  error={formErrors.model}
                  disabled={saving}
                  required
                />
                
                <Select
                  label="Category"
                  options={categoryOptions.filter(opt => opt.value !== '')}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  error={formErrors.category}
                  disabled={saving}
                  required
                />
                
                <Select
                  label="Type"
                  options={typeOptions.filter(opt => opt.value !== '')}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  error={formErrors.type}
                  disabled={saving}
                  required
                />
                
                <Input
                  label="Total Stock"
                  type="number"
                  value={formData.totalStock}
                  onChange={(e) => setFormData({ ...formData, totalStock: parseInt(e.target.value) || 0 })}
                  error={formErrors.totalStock}
                  disabled={saving}
                  min="0"
                  required
                />
                
                <Input
                  label="Price (₺)"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  error={formErrors.price}
                  disabled={saving}
                  min="0"
                  step="0.01"
                  required
                />
                
                <Input
                  label="List Price (₺)"
                  type="number"
                  value={formData.listPrice}
                  onChange={(e) => setFormData({ ...formData, listPrice: parseFloat(e.target.value) || 0 })}
                  error={formErrors.listPrice}
                  disabled={saving}
                  min="0"
                  step="0.01"
                  required
                />
                
                <Input
                  label="SGK Price (₺)"
                  type="number"
                  value={formData.sgkPrice}
                  onChange={(e) => setFormData({ ...formData, sgkPrice: parseFloat(e.target.value) || 0 })}
                  error={formErrors.sgkPrice}
                  disabled={saving}
                  min="0"
                  step="0.01"
                  required
                />
                
                <Input
                  label="Warranty Period (months)"
                  type="number"
                  value={formData.warrantyPeriod}
                  onChange={(e) => setFormData({ ...formData, warrantyPeriod: parseInt(e.target.value) || 12 })}
                  error={formErrors.warrantyPeriod}
                  disabled={saving}
                  min="1"
                  max="120"
                  required
                />
              </div>
              
              <Textarea
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={saving}
                rows={3}
              />
              
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  onClick={cancelEdit}
                  variant="outline"
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingItem ? handleEditItem : handleAddItem}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {editingItem ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    editingItem ? 'Update Item' : 'Add Item'
                  )}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Modal>
  );
};