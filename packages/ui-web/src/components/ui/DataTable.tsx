import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface Column<T = any> {
  key: string;
  title: string | React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
}

export interface TableAction<T = any> {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (record: T) => void;
  disabled?: (record: T) => boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface BulkAction<T = any> {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedRecords: T[]) => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
    onChange: (page: number, pageSize: number) => void;
  };
  rowSelection?: {
    selectedRowKeys: (string | number)[];
    onChange: (selectedRowKeys: (string | number)[], selectedRows: T[]) => void;
    getCheckboxProps?: (record: T) => { disabled?: boolean };
  };
  actions?: TableAction<T>[];
  bulkActions?: BulkAction<T>[];
  searchable?: boolean;
  onSearch?: (value: string) => void;
  sortable?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc' | null) => void;
  rowKey?: string | ((record: T) => string | number);
  emptyText?: string;
  size?: 'small' | 'medium' | 'large';
  bordered?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  className?: string;
  onRowClick?: (record: T) => void;
}

export const DataTable = <T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  pagination,
  rowSelection,
  actions,
  bulkActions,
  searchable = false,
  onSearch,
  sortable = false,
  onSort,
  rowKey = 'id',
  emptyText = 'Veri bulunamadı',
  size = 'medium',
  bordered = false,
  striped = false,
  hoverable = true,
  className = '',
  onRowClick,
}: DataTableProps<T>) => {
  const [searchValue, setSearchValue] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const getRowKey = useCallback((record: T, index: number): string | number => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index;
  }, [rowKey]);

  const selectedRecords = useMemo(() => {
    if (!rowSelection) return [];
    return data.filter(record =>
      rowSelection.selectedRowKeys.includes(getRowKey(record, data.indexOf(record)))
    );
  }, [data, rowSelection, getRowKey]);

  const handleSort = (key: string) => {
    if (!sortable) return;

    let direction: 'asc' | 'desc' | null = 'asc';

    if (sortConfig?.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : sortConfig.direction === 'desc' ? null : 'asc';
    }

    setSortConfig(direction ? { key, direction } : null);
    onSort?.(key, direction);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    onSearch?.(value);
  };

  const handleSelectAll = (checked: boolean) => {
    if (!rowSelection) return;

    if (checked) {
      const allKeys = data.map((record, index) => getRowKey(record, index));
      rowSelection.onChange(allKeys, data);
    } else {
      rowSelection.onChange([], []);
    }
  };

  const handleSelectRow = (record: T, checked: boolean) => {
    if (!rowSelection) return;

    const key = getRowKey(record, data.indexOf(record));
    let newSelectedKeys = [...rowSelection.selectedRowKeys];

    if (checked) {
      newSelectedKeys.push(key);
    } else {
      newSelectedKeys = newSelectedKeys.filter(k => k !== key);
    }

    const newSelectedRows = data.filter(r =>
      newSelectedKeys.includes(getRowKey(r, data.indexOf(r)))
    );

    rowSelection.onChange(newSelectedKeys, newSelectedRows);
  };

  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  const cellPadding = {
    small: 'px-3 py-2',
    medium: 'px-4 py-3',
    large: 'px-6 py-4',
  };

  const isAllSelected = rowSelection && data.length > 0 &&
    data.every(record => rowSelection.selectedRowKeys.includes(getRowKey(record, data.indexOf(record))));

  const isIndeterminate = rowSelection && rowSelection.selectedRowKeys.length > 0 && !isAllSelected;

  const renderCell = (column: Column<T>, record: T, index: number) => {
    const value = record[column.key];

    if (column.render) {
      return column.render(value, record, index);
    }

    return value;
  };

  const renderActions = (record: T) => {
    if (!actions || actions.length === 0) return null;

    return (
      <div className="flex items-center space-x-2">
        {actions.map(action => (
          <button
            key={action.key}
            onClick={(e) => { e.stopPropagation(); action.onClick(record) }}
            disabled={action.disabled?.(record)}
            className={`
              inline-flex items-center px-2 py-1 text-sm font-medium rounded-md
              ${action.variant === 'danger'
                ? 'text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30'
                : action.variant === 'primary'
                  ? 'text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {action.icon && <span className="mr-1">{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>
    );
  };

  const renderPagination = () => {
    if (!pagination) return null;

    const { current, pageSize, total, showSizeChanger, pageSizeOptions = [10, 20, 50, 100] } = pagination;
    const totalPages = Math.ceil(total / pageSize);
    const startItem = (current - 1) * pageSize + 1;
    const endItem = Math.min(current * pageSize, total);

    // Calculate visible page numbers
    const getVisiblePages = () => {
      const maxVisible = 5;
      const pages: number[] = [];

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        const start = Math.max(1, current - Math.floor(maxVisible / 2));
        const end = Math.min(totalPages, start + maxVisible - 1);

        for (let i = start; i <= end; i++) {
          pages.push(i);
        }

        // Add ellipsis if needed
        if (start > 1) {
          pages.unshift(-1); // -1 represents ellipsis
          pages.unshift(1);
        }
        if (end < totalPages) {
          pages.push(-2); // -2 represents ellipsis
          pages.push(totalPages);
        }
      }

      return pages;
    };

    const visiblePages = getVisiblePages();

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
          <span>
            {total > 0 ? `${startItem}-${endItem}` : '0'} / {total} kayıt gösteriliyor
          </span>
          {showSizeChanger && (
            <select
              value={pageSize}
              onChange={(e) => pagination.onChange(1, Number(e.target.value))}
              className="ml-4 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size} / sayfa</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {/* First page button */}
          <button
            onClick={() => pagination.onChange(1, pageSize)}
            disabled={current <= 1}
            className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="İlk sayfa"
          >
            İlk
          </button>

          {/* Previous page button */}
          <button
            onClick={() => pagination.onChange(current - 1, pageSize)}
            disabled={current <= 1}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Önceki sayfa"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center space-x-1">
            {visiblePages.map((page, index) => {
              if (page === -1 || page === -2) {
                return (
                  <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-400">
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={page}
                  onClick={() => pagination.onChange(page, pageSize)}
                  className={`
                    px-3 py-1 text-sm rounded-md transition-colors
                    ${page === current
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {page}
                </button>
              );
            })}
          </div>

          {/* Next page button */}
          <button
            onClick={() => pagination.onChange(current + 1, pageSize)}
            disabled={current >= totalPages}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Sonraki sayfa"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last page button */}
          <button
            onClick={() => pagination.onChange(totalPages, pageSize)}
            disabled={current >= totalPages}
            className="px-2 py-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Son sayfa"
          >
            Son
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white dark:bg-gray-800 shadow-sm rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {searchable && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Ara..."
                  value={searchValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {bulkActions && selectedRecords.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedRecords.length} kayıt seçildi
                </span>
                <div className="flex space-x-2">
                  {bulkActions.map(action => (
                    <button
                      key={action.key}
                      onClick={() => action.onClick(selectedRecords)}
                      className={`
                        inline-flex items-center px-3 py-1 text-sm font-medium rounded-md
                        ${action.variant === 'danger'
                          ? 'text-red-700 bg-red-100 hover:bg-red-200 dark:text-red-400 dark:bg-red-900/20 dark:hover:bg-red-900/30'
                          : action.variant === 'primary'
                            ? 'text-blue-700 bg-blue-100 hover:bg-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/30'
                            : 'text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
                        }
                      `}
                    >
                      {action.icon && <span className="mr-1">{action.icon}</span>}
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700 ${sizeClasses[size]}`}>
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              {rowSelection && (
                <th className={`${cellPadding[size]} text-left`}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = !!isIndeterminate;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}

              {columns.map(column => (
                <th
                  key={column.key}
                  className={`
                    ${cellPadding[size]} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider
                    ${column.sortable && sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''}
                    ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                  `}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.title}</span>
                    {column.sortable && sortable && (
                      <div className="flex flex-col">
                        <ChevronUp
                          className={`w-3 h-3 ${sortConfig?.key === column.key && sortConfig.direction === 'asc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                            }`}
                        />
                        <ChevronDown
                          className={`w-3 h-3 -mt-1 ${sortConfig?.key === column.key && sortConfig.direction === 'desc'
                              ? 'text-blue-600'
                              : 'text-gray-400'
                            }`}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}

              {actions && actions.length > 0 && (
                <th className={`${cellPadding[size]} text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}>
                  İşlemler
                </th>
              )}
            </tr>
          </thead>

          <tbody className={`bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 ${striped ? 'divide-y-0' : ''}`}>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (rowSelection ? 1 : 0) + (actions ? 1 : 0)} className="px-4 py-8 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Yükleniyor...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowSelection ? 1 : 0) + (actions ? 1 : 0)} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((record, index) => {
                const key = getRowKey(record, index);
                const isSelected = rowSelection?.selectedRowKeys.includes(key);
                const checkboxProps = rowSelection?.getCheckboxProps?.(record) || {};

                return (
                  <tr
                    key={key}
                    className={`
                      ${striped && index % 2 === 1 ? 'bg-gray-50 dark:bg-gray-700/50' : ''}
                      ${hoverable ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}
                      ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      ${onRowClick ? 'cursor-pointer' : ''}
                    `}
                    onClick={() => onRowClick?.(record)}
                  >
                    {rowSelection && (
                      <td className={cellPadding[size]}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={checkboxProps.disabled}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleSelectRow(record, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                        />
                      </td>
                    )}

                    {columns.map(column => (
                      <td
                        key={column.key}
                        className={`
                          ${cellPadding[size]} text-gray-900 dark:text-gray-100
                          ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                          ${bordered ? 'border-r border-gray-200 dark:border-gray-700 last:border-r-0' : ''}
                        `}
                      >
                        {renderCell(column, record, index)}
                      </td>
                    ))}

                    {actions && actions.length > 0 && (
                      <td className={cellPadding[size]}>
                        {renderActions(record)}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {renderPagination()}
    </div>
  );
};

export default DataTable;