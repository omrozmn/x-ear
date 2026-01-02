import React from 'react';
import { clsx } from 'clsx';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  showItemsPerPage?: boolean;
  showTotalItems?: boolean;
  showPageNumbers?: boolean;
  showFirstLast?: boolean;
  showPrevNext?: boolean;
  maxVisiblePages?: number;
  itemsPerPageOptions?: number[];
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  pageButtonClassName?: string;
  activePageClassName?: string;
  disabledClassName?: string;
  // Text customization
  previousText?: string;
  nextText?: string;
  firstText?: string;
  lastText?: string;
  itemsPerPageText?: string;
  totalItemsText?: string;
  pageText?: string;
  ofText?: string;
}

const defaultItemsPerPageOptions = [10, 25, 50, 100];

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  showItemsPerPage = true,
  showTotalItems = true,
  showPageNumbers = true,
  showFirstLast = true,
  showPrevNext = true,
  maxVisiblePages = 7,
  itemsPerPageOptions = defaultItemsPerPageOptions,
  disabled = false,
  size = 'md',
  className,
  pageButtonClassName,
  activePageClassName,
  disabledClassName,
  previousText = "Önceki",
  nextText = "Sonraki",
  firstText = "İlk",
  lastText = "Son",
  itemsPerPageText = "Sayfa başına:",
  totalItemsText = "toplam",
  pageText = "Sayfa",
  ofText = "/",
}) => {
  // Calculate visible page numbers
  const getVisiblePages = (): number[] => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    // Adjust start if we're near the end
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    const pages: number[] = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  // Size-based styling
  const sizeClasses = {
    sm: {
      button: 'px-2 py-1 text-xs',
      select: 'text-xs px-2 py-1',
      text: 'text-xs',
    },
    md: {
      button: 'px-3 py-2 text-sm',
      select: 'text-sm px-3 py-2',
      text: 'text-sm',
    },
    lg: {
      button: 'px-4 py-2 text-base',
      select: 'text-base px-4 py-2',
      text: 'text-base',
    },
  };

  const currentSizeClasses = sizeClasses[size];

  // Base button classes
  const baseButtonClasses = clsx(
    'border border-gray-300 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    'transition-colors duration-200 font-medium',
    currentSizeClasses.button,
    disabled && 'opacity-50 cursor-not-allowed hover:bg-white'
  );

  // Handle page change
  const handlePageChange = (page: number) => {
    if (disabled || page < 1 || page > totalPages || page === currentPage) {
      return;
    }
    onPageChange(page);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    if (disabled || !onItemsPerPageChange) return;
    onItemsPerPageChange(newItemsPerPage);
  };

  // Calculate item range
  const startItem = totalItems ? Math.min((currentPage - 1) * itemsPerPage + 1, totalItems) : 0;
  const endItem = totalItems ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

  return (
    <div className={clsx('flex flex-col sm:flex-row items-center justify-between gap-4', className)}>
      {/* Items per page selector */}
      {showItemsPerPage && onItemsPerPageChange && (
        <div className="flex items-center gap-2">
          <span className={clsx('text-gray-700', currentSizeClasses.text)}>
            {itemsPerPageText}
          </span>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            disabled={disabled}
            className={clsx(
              'border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
              currentSizeClasses.select,
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {itemsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Page navigation */}
      <div className="flex items-center gap-1">
        {/* First page button */}
        {showFirstLast && totalPages > maxVisiblePages && (
          <button
            onClick={() => handlePageChange(1)}
            disabled={disabled || isFirstPage}
            className={clsx(
              baseButtonClasses,
              'rounded-l-md',
              isFirstPage && (disabledClassName || 'opacity-50 cursor-not-allowed'),
              pageButtonClassName
            )}
            aria-label={firstText}
          >
            {firstText}
          </button>
        )}

        {/* Previous page button */}
        {showPrevNext && (
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={disabled || isFirstPage}
            className={clsx(
              baseButtonClasses,
              !showFirstLast && 'rounded-l-md',
              isFirstPage && (disabledClassName || 'opacity-50 cursor-not-allowed'),
              pageButtonClassName
            )}
            aria-label={previousText}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="ml-1 hidden sm:inline">{previousText}</span>
          </button>
        )}

        {/* Page numbers */}
        {showPageNumbers && (
          <>
            {/* Show ellipsis if there are hidden pages at the start */}
            {visiblePages[0] > 1 && (
              <>
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={disabled}
                  className={clsx(baseButtonClasses, pageButtonClassName)}
                >
                  1
                </button>
                {visiblePages[0] > 2 && (
                  <span className={clsx('px-2', currentSizeClasses.text, 'text-gray-500')}>
                    ...
                  </span>
                )}
              </>
            )}

            {/* Visible page numbers */}
            {visiblePages.map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                disabled={disabled}
                className={clsx(
                  baseButtonClasses,
                  page === currentPage && (
                    activePageClassName || 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  ),
                  pageButtonClassName
                )}
                aria-current={page === currentPage ? 'page' : undefined}
              >
                {page}
              </button>
            ))}

            {/* Show ellipsis if there are hidden pages at the end */}
            {visiblePages[visiblePages.length - 1] < totalPages && (
              <>
                {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                  <span className={clsx('px-2', currentSizeClasses.text, 'text-gray-500')}>
                    ...
                  </span>
                )}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={disabled}
                  className={clsx(baseButtonClasses, pageButtonClassName)}
                >
                  {totalPages}
                </button>
              </>
            )}
          </>
        )}

        {/* Next page button */}
        {showPrevNext && (
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={disabled || isLastPage}
            className={clsx(
              baseButtonClasses,
              !showFirstLast && 'rounded-r-md',
              isLastPage && (disabledClassName || 'opacity-50 cursor-not-allowed'),
              pageButtonClassName
            )}
            aria-label={nextText}
          >
            <span className="mr-1 hidden sm:inline">{nextText}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Last page button */}
        {showFirstLast && totalPages > maxVisiblePages && (
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={disabled || isLastPage}
            className={clsx(
              baseButtonClasses,
              'rounded-r-md',
              isLastPage && (disabledClassName || 'opacity-50 cursor-not-allowed'),
              pageButtonClassName
            )}
            aria-label={lastText}
          >
            {lastText}
          </button>
        )}
      </div>

      {/* Total items info */}
      {showTotalItems && totalItems && (
        <div className={clsx('text-gray-700', currentSizeClasses.text)}>
          {startItem}-{endItem} {ofText} {totalItems} {totalItemsText}
        </div>
      )}
    </div>
  );
};

// Simple pagination component for basic use cases
export interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}

export const SimplePagination: React.FC<SimplePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  className,
}) => {
  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      disabled={disabled}
      className={className}
      showItemsPerPage={false}
      showTotalItems={false}
      showFirstLast={false}
      maxVisiblePages={5}
    />
  );
};

export default Pagination;