import React, { useMemo, useState } from 'react';
import { useAdminResponsive } from '../../hooks/useAdminResponsive';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortValue?: (item: T) => unknown;
  mobileHidden?: boolean; // Hide on mobile
  tabletHidden?: boolean; // Hide on tablet
  sortable?: boolean; // Enable sorting for this column
  sortKey?: string; // Custom sort key (if different from column key)
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  bulkActions?: React.ReactNode;
  selectionLabel?: string;
}

type SortDirection = 'asc' | 'desc' | null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getCellValue<T>(item: T, key: string): unknown {
  return isRecord(item) ? item[key] : undefined;
}

function normalizeSortValue(value: unknown): unknown {
  if (typeof value === 'string') {
    const parsedDate = Date.parse(value);
    if (!Number.isNaN(parsedDate) && (value.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(value))) {
      return parsedDate;
    }
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return value;
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  onRowClick,
  emptyMessage = 'Veri bulunamadı',
  className = '',
  selectable = true,
  selectedKeys,
  onSelectionChange,
  bulkActions,
  selectionLabel = 'kayıt seçildi',
}: ResponsiveTableProps<T>) {
  const { isMobile, isTablet } = useAdminResponsive();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [internalSelectedKeys, setInternalSelectedKeys] = useState<string[]>([]);
  const effectiveSelectedKeys = selectedKeys ?? internalSelectedKeys;
  
  // Handle column sort
  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;
    
    const key = column.sortKey || column.key;
    
    if (sortColumn === key) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      setSortColumn(key);
      setSortDirection('asc');
    }
  };

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;
    const activeColumn = columns.find((column) => (column.sortKey || column.key) === sortColumn);

    return [...data].sort((a, b) => {
      const aValue = normalizeSortValue(activeColumn?.sortValue ? activeColumn.sortValue(a) : getCellValue(a, sortColumn));
      const bValue = normalizeSortValue(activeColumn?.sortValue ? activeColumn.sortValue(b) : getCellValue(b, sortColumn));

      // Handle null/undefined
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // String comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'tr');
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Number comparison
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Date comparison
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortDirection === 'asc' 
          ? aValue.getTime() - bValue.getTime() 
          : bValue.getTime() - aValue.getTime();
      }

      // Default: convert to string
      const aStr = String(aValue);
      const bStr = String(bValue);
      const comparison = aStr.localeCompare(bStr, 'tr');
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [columns, data, sortColumn, sortDirection]);

  const visibleKeys = useMemo(() => sortedData.map((item) => keyExtractor(item)), [sortedData, keyExtractor]);
  const selectedVisibleKeys = visibleKeys.filter((key) => effectiveSelectedKeys.includes(key));
  const allVisibleSelected = visibleKeys.length > 0 && selectedVisibleKeys.length === visibleKeys.length;
  const someVisibleSelected = selectedVisibleKeys.length > 0 && !allVisibleSelected;

  const setSelection = (keys: string[]) => {
    if (onSelectionChange) {
      onSelectionChange(keys);
      return;
    }

    setInternalSelectedKeys(keys);
  };

  const toggleRowSelection = (key: string) => {
    if (effectiveSelectedKeys.includes(key)) {
      setSelection(effectiveSelectedKeys.filter((selectedKey) => selectedKey !== key));
      return;
    }

    setSelection([...effectiveSelectedKeys, key]);
  };

  const toggleVisibleSelection = () => {
    if (allVisibleSelected) {
      setSelection(effectiveSelectedKeys.filter((key) => !visibleKeys.includes(key)));
      return;
    }

    const nextKeys = new Set(effectiveSelectedKeys);
    visibleKeys.forEach((key) => nextKeys.add(key));
    setSelection(Array.from(nextKeys));
  };

  // Filter columns based on device
  const visibleColumns = columns.filter(col => {
    if (isMobile && col.mobileHidden) return false;
    if (isTablet && col.tabletHidden) return false;
    return true;
  });

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  // Render sort icon
  const renderSortIcon = (column: Column<T>) => {
    if (!column.sortable) return null;
    
    const key = column.sortKey || column.key;
    const isActive = sortColumn === key;
    
    if (!isActive) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-600" />
      : <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  // Mobile: Card view
  if (isMobile) {
    return (
      <div className={`space-y-3 ${className}`}>
        {selectable && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3">
            <span className="text-sm font-medium text-primary-700">
              {effectiveSelectedKeys.length} {selectionLabel}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleVisibleSelection}
                className="rounded-xl border border-primary-200 bg-white px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
              >
                {allVisibleSelected ? 'Gorunen secimi kaldir' : 'Gorunenleri sec'}
              </button>
              {bulkActions}
            </div>
          </div>
        )}
        {sortedData.map((item) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={`
              mobile-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              ${onRowClick ? 'cursor-pointer touch-feedback hover:shadow-md' : ''}
            `}
          >
            {selectable && (
              <div className="mb-3 flex items-center justify-end">
                <input
                  type="checkbox"
                  checked={effectiveSelectedKeys.includes(keyExtractor(item))}
                  onChange={(event) => {
                    event.stopPropagation();
                    toggleRowSelection(keyExtractor(item));
                  }}
                  onClick={(event) => event.stopPropagation()}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </div>
            )}
            {visibleColumns.map((col) => (
              <div key={col.key} className="flex justify-between items-start mb-2 last:mb-0">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  {col.header}
                </span>
                <span className="text-sm text-gray-900 dark:text-white text-right ml-4">
                  {col.render ? col.render(item) : String(getCellValue(item, col.key) ?? '')}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Desktop/Tablet: Table view
  return (
    <div className={`space-y-3 ${className}`}>
      {selectable && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3">
          <span className="text-sm font-medium text-primary-700">
            {effectiveSelectedKeys.length} {selectionLabel}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleVisibleSelection}
              className="rounded-xl border border-primary-200 bg-white px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
            >
              {allVisibleSelected ? 'Gorunen secimi kaldir' : 'Gorunenleri sec'}
            </button>
            {bulkActions}
          </div>
        </div>
      )}
      <div className="mobile-table-wrapper">
      <table className="mobile-table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {selectable && (
              <th className="w-12 px-4 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = someVisibleSelected;
                    }
                  }}
                  onChange={toggleVisibleSelection}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  aria-label="Tum gorunen satirlari sec"
                />
              </th>
            )}
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col)}
                className={`
                  px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider
                  ${col.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none' : ''}
                `}
              >
                <div className="flex items-center gap-2">
                  <span>{col.header}</span>
                  {renderSortIcon(col)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {sortedData.map((item) => (
            <tr
              key={keyExtractor(item)}
              onClick={() => onRowClick?.(item)}
              className={`
                ${onRowClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800' : ''}
              `}
            >
              {selectable && (
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={effectiveSelectedKeys.includes(keyExtractor(item))}
                    onChange={(event) => {
                      event.stopPropagation();
                      toggleRowSelection(keyExtractor(item));
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    aria-label="Satiri sec"
                  />
                </td>
              )}
              {visibleColumns.map((col) => (
                <td
                  key={col.key}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white"
                >
                  {col.render ? col.render(item) : String(getCellValue(item, col.key) ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
