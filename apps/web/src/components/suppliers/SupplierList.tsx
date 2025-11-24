import React, { useMemo, useState } from 'react';
import { Badge, Button, DataTable, Column, TableAction } from '@x-ear/ui-web';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import type { SupplierExtended } from './supplier-search.types';
// UniversalImporter now lives in the page header (SuppliersPage)

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
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

export function SupplierList({
  suppliers,
  isLoading,
  onSupplierClick,
  onEditSupplier,
  onDeleteSupplier,
  onSort,
  sortBy,
  sortOrder,
  pagination
}: SupplierListProps) {

  

  const columns: Column<SupplierExtended>[] = useMemo(() => [
    {
      key: 'companyName',
      title: 'Şirket Adı',
      sortable: true,
      render: (_, supplier) => (
        <div
          className="flex items-center cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            onSupplierClick?.(supplier);
          }}
        >
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center group-hover:ring-2 group-hover:ring-purple-200 transition-all">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
              {supplier.companyName || supplier.name || 'İsimsiz'}
            </div>
            {supplier.companyCode && (
              <div className="text-sm text-gray-500">
                Kod: {supplier.companyCode}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      title: 'İletişim',
      render: (_, supplier) => (
        <div className="space-y-1">
          {supplier.contactPerson && (
            <div className="flex items-center text-sm text-gray-900">
              <User className="h-4 w-4 mr-2 text-gray-400" />
              {supplier.contactPerson}
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-4 w-4 mr-2 text-gray-400" />
              {supplier.phone}
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-4 w-4 mr-2 text-gray-400" />
              {supplier.email}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'location',
      title: 'Konum',
      render: (_, supplier) => (
        <>
          {supplier.city && (
            <div className="flex items-center text-sm text-gray-900">
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              {supplier.city}
              {supplier.country && supplier.country !== 'Türkiye' && (
                <span className="text-gray-500">, {supplier.country}</span>
              )}
            </div>
          )}
        </>
      )
    },
    {
      key: 'status',
      title: 'Durum',
      render: (_, supplier) => (
        supplier.isActive ?
          <Badge variant="success" size="sm">Aktif</Badge> :
          <Badge variant="secondary" size="sm">Pasif</Badge>
      )
    }
  ], [onSupplierClick]);

  const actions: TableAction<SupplierExtended>[] = useMemo(() => {
    const list: TableAction<SupplierExtended>[] = [
      {
        key: 'view',
        label: 'Görüntüle',
        icon: <Eye className="h-4 w-4" />,
        onClick: (supplier) => onSupplierClick?.(supplier),
        variant: 'secondary'
      }
    ];

    if (onEditSupplier) {
      list.push({
        key: 'edit',
        label: 'Düzenle',
        icon: <Edit className="h-4 w-4" />,
        onClick: (supplier) => onEditSupplier(supplier),
        variant: 'secondary'
      });
    }

    if (onDeleteSupplier) {
      list.push({
        key: 'delete',
        label: 'Sil',
        icon: <Trash2 className="h-4 w-4" />,
        onClick: (supplier) => onDeleteSupplier(supplier),
        variant: 'danger'
      });
    }

    return list;
  }, [onSupplierClick, onEditSupplier, onDeleteSupplier]);

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div />
        <div className="flex items-center space-x-2">
          {/* Importer button moved to SuppliersPage header */}
        </div>
      </div>

      <DataTable
        data={suppliers || []}
        columns={columns}
        loading={isLoading}
        actions={actions}
        sortable={true}
        onSort={(key, direction) => onSort?.(key)}
        onRowClick={onSupplierClick}
        rowKey="id"
        emptyText="Tedarikçi bulunamadı"
        pagination={pagination}
      />

      {/* Importer moved to page header (SuppliersPage) */}
    </>
  );
}