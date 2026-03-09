import React, { useState } from 'react';
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
}: ResponsiveTableProps<T>) {
  const { isMobile, isTablet } = useAdminResponsive();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
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
  const sortedData = React.useMemo(() => {
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
        {sortedData.map((item) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={`
              mobile-card bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
              ${onRowClick ? 'cursor-pointer touch-feedback hover:shadow-md' : ''}
            `}
          >
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
    <div className={`mobile-table-wrapper ${className}`}>
      <table className="mobile-table min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
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
  );
}
