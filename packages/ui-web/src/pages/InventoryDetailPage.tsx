import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import axios from 'axios';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  AlertTriangle,
  CheckCircle,
  Calendar,
  DollarSign,
  Hash,
  Tag,
  User,
  FileText
} from 'lucide-react';

import {
  Card,
  Button,
  Badge,
  Input,
  Select,
  Textarea,
  Modal
} from '../components/ui';

const api = axios.create({
  baseURL: 'http://localhost:5003'
});

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
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface InventoryDetailPageProps {
  id: string;
}

export const InventoryDetailPage: React.FC<InventoryDetailPageProps> = ({ id }) => {
  const navigate = useNavigate();
  const [product, setProduct] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/inventory/${id}`);
      
      if (response.data.success && response.data.data) {
        const item = response.data.data;
        
        // Handle features - can be string, array, or null
        let featuresArray: string[] = [];
        if (item.features) {
          if (typeof item.features === 'string') {
            featuresArray = item.features.split(',').map((f: string) => f.trim()).filter(Boolean);
          } else if (Array.isArray(item.features)) {
            featuresArray = item.features;
          }
        }
        
        const mappedProduct: InventoryItem = {
          id: String(item.id),
          productName: item.name || item.productName || 'Unnamed Product',
          brand: item.brand || '',
          model: item.model || '',
          category: item.category || '',
          stock: item.available_inventory || item.availableInventory || item.inventory || 0,
          minStock: item.min_inventory || item.minInventory || item.minStock || 5,
          unitPrice: parseFloat(item.price) || 0,
          vatIncludedPrice: parseFloat(item.price) * 1.18 || 0,
          totalValue: (item.available_inventory || item.availableInventory || 0) * parseFloat(item.price) || 0,
          barcode: item.barcode || '',
          serialNumber: item.serial_number || item.serialNumber || '',
          supplier: item.supplier || '',
          warrantyPeriod: item.warranty ? `${item.warranty} months` : '',
          description: item.description || '',
          features: featuresArray,
          status: 'active',
          createdAt: item.created_at || item.createdAt || new Date().toISOString(),
          updatedAt: item.updated_at || item.updatedAt || new Date().toISOString()
        };
        
        setProduct(mappedProduct);
        setFormData(mappedProduct);
      }
    } catch (error) {
      console.error('Failed to load product:', error);
      // TODO: Show error toast
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Map frontend data back to backend format
      const backendData = {
        name: formData.productName,
        brand: formData.brand,
        model: formData.model,
        category: formData.category,
        price: formData.unitPrice,
        inventory: formData.stock,
        minInventory: formData.minStock,
        barcode: formData.barcode,
        supplier: formData.supplier,
        warranty: formData.warrantyPeriod ? parseInt(formData.warrantyPeriod) : null,
        description: formData.description,
        features: formData.features?.join(', ')
      };

      await api.put(`/api/inventory/${id}`, backendData);
      await loadProduct();
      setIsEditMode(false);
      // TODO: Show success toast
    } catch (error) {
      console.error('Failed to update product:', error);
      // TODO: Show error toast
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/inventory/${id}`);
      // TODO: Show success toast
      navigate({ to: '/inventory' });
    } catch (error) {
      console.error('Failed to delete product:', error);
      // TODO: Show error toast
    }
  };

  const getStockStatus = () => {
    if (!product) return { label: 'Unknown', color: 'gray' };
    
    if (product.stock === 0) {
      return { label: 'Out of Stock', color: 'red' };
    } else if (product.stock <= product.minStock) {
      return { label: 'Low Stock', color: 'yellow' };
    } else {
      return { label: 'In Stock', color: 'green' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Product Not Found</h2>
        <p className="text-gray-500 mb-6">The product you're looking for doesn't exist.</p>
        <Button onClick={() => navigate({ to: '/inventory' })}>
          Back to Inventory
        </Button>
      </div>
    );
  }

  const stockStatus = getStockStatus();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: '/inventory' })}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </Button>
          
          <div className="flex items-center gap-3">
            {!isEditMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditMode(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditMode(false);
                    setFormData(product);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  Save Changes
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Product Header Card */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                  <Package className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  {isEditMode ? (
                    <Input
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      className="text-2xl font-bold mb-2"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {product.productName}
                    </h1>
                  )}
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    {product.brand} - {product.model}
                  </p>
                </div>
              </div>
              
              <Badge color={stockStatus.color} size="lg">
                {stockStatus.label}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Stock</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {product.stock}
                  </p>
                </div>
                <Package className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Unit Price</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₺{product.unitPrice.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Value</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₺{product.totalValue.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Min Stock</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {product.minStock}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
          </Card>
        </div>

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Basic Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Tag className="w-4 h-4 inline mr-2" />
                    Category
                  </label>
                  {isEditMode ? (
                    <Input
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{product.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Hash className="w-4 h-4 inline mr-2" />
                    Barcode
                  </label>
                  {isEditMode ? (
                    <Input
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{product.barcode || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Supplier
                  </label>
                  {isEditMode ? (
                    <Input
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{product.supplier || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Warranty Period
                  </label>
                  {isEditMode ? (
                    <Input
                      value={formData.warrantyPeriod}
                      onChange={(e) => setFormData({ ...formData, warrantyPeriod: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{product.warrantyPeriod || 'N/A'}</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Additional Information */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Additional Information
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Description
                  </label>
                  {isEditMode ? (
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">
                      {product.description || 'No description available'}
                    </p>
                  )}
                </div>

                {product.features && product.features.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Features
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {product.features.map((feature, index) => (
                        <Badge key={index} color="blue">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Created: {new Date(product.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Updated: {new Date(product.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Product"
      >
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 mb-6">
            Are you sure you want to delete <strong>{product.productName}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
