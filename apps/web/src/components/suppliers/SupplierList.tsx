import React from 'react';
import { Badge, Button } from '@x-ear/ui-web';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit, 
  Trash2, 
  Eye,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import type { SupplierExtended } from './supplier-search.types';

interface SupplierListProps {
  suppliers: SupplierExtended[];
  isLoading?: boolean;
  error?: Error | null;
  onSupplierClick?: (supplier: SupplierExtended) => void;
  onEditSupplier?: (supplier: SupplierExtended) => void;
  onDeleteSupplier?: (supplier: SupplierExtended) => void;
  onSort?: (field: string) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function SupplierList({ 
  suppliers, 
  onSupplierClick,
  onEditSupplier,
  onDeleteSupplier,
  onSort,
  sortBy,
  sortOrder
}: SupplierListProps) {
  const getStatusBadge = (isActive?: boolean) => {
    if (isActive) {
      return <Badge variant="success" size="sm">Aktif</Badge>;
    }
    return <Badge variant="secondary" size="sm">Pasif</Badge>;
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-4 w-4 inline ml-1" /> : 
      <ChevronDown className="h-4 w-4 inline ml-1" />;
  };

  const handleRowClick = (supplier: SupplierExtended, e: React.MouseEvent) => {
    // Don't trigger row click if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onSupplierClick?.(supplier);
  };

  // Safely handle suppliers array
  const supplierList = suppliers || [];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort?.('companyName')}
            >
              Şirket Adı {renderSortIcon('companyName')}
            </th>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              İletişim
            </th>
            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Konum
            </th>

            <th 
              scope="col" 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Durum
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              İşlemler
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {supplierList.map((supplier) => (
            <tr 
              key={supplier.id} 
              className="hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={(e) => handleRowClick(supplier, e)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {supplier?.companyName || supplier?.name || 'İsimsiz'}
                    </div>
                    {supplier?.companyCode && (
                      <div className="text-sm text-gray-500">
                        Kod: {supplier.companyCode}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="space-y-1">
                  {supplier?.contactPerson && (
                    <div className="flex items-center text-sm text-gray-900">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      {supplier.contactPerson}
                    </div>
                  )}
                  {supplier?.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {supplier.phone}
                    </div>
                  )}
                  {supplier?.email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {supplier.email}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                {supplier?.city && (
                  <div className="flex items-center text-sm text-gray-900">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    {supplier.city}
                    {supplier?.country && supplier.country !== 'Türkiye' && (
                      <span className="text-gray-500">, {supplier.country}</span>
                    )}
                  </div>
                )}
              </td>

              <td className="px-6 py-4 whitespace-nowrap">
                {getStatusBadge(supplier?.isActive)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSupplierClick?.(supplier);
                    }}
                    className="p-2"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {onEditSupplier && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditSupplier(supplier);
                      }}
                      className="p-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDeleteSupplier && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSupplier(supplier);
                      }}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}