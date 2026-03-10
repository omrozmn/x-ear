import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (limit: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange
}) => {
    const safeCurrentPage = Math.max(1, currentPage);
    const safeTotalPages = Math.max(1, totalPages);
    const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
    const endItem = totalItems === 0 ? 0 : Math.min(safeCurrentPage * itemsPerPage, totalItems);

    return (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
                    disabled={safeCurrentPage === 1}
                    className="relative inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    Önceki
                </button>
                <button
                    onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
                    disabled={safeCurrentPage === safeTotalPages}
                    className="relative ml-3 inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                    Sonraki
                </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-700">
                        Toplam <span className="font-medium">{totalItems}</span> kayıttan <span className="font-medium">{startItem}</span> - <span className="font-medium">{endItem}</span> arası gösteriliyor
                    </p>
                    {onItemsPerPageChange && (
                        <select
                            value={itemsPerPage}
                            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                            className="block w-full rounded-xl border-gray-300 py-1.5 text-base leading-5 text-gray-900 focus:border-indigo-500 focus:placeholder-gray-400 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                        >
                            <option value={10}>10 / sayfa</option>
                            <option value={20}>20 / sayfa</option>
                            <option value={50}>50 / sayfa</option>
                            <option value={100}>100 / sayfa</option>
                        </select>
                    )}
                </div>
                <div>
                    <nav className="isolate inline-flex -space-x-px rounded-xl shadow-sm" aria-label="Pagination">
                        <button
                            onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
                            disabled={safeCurrentPage === 1}
                            className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                            <span className="sr-only">Önceki</span>
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        {[...Array(safeTotalPages)].map((_, i) => {
                            const page = i + 1;
                            // Show first, last, current, and surrounding pages
                            if (
                                page === 1 ||
                                page === safeTotalPages ||
                                (page >= safeCurrentPage - 1 && page <= safeCurrentPage + 1)
                            ) {
                                return (
                                    <button
                                        key={page}
                                        onClick={() => onPageChange(page)}
                                        aria-current={safeCurrentPage === page ? 'page' : undefined}
                                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${safeCurrentPage === page
                                            ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                            : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                );
                            } else if (
                                (page === safeCurrentPage - 2 && page > 1) ||
                                (page === safeCurrentPage + 2 && page < safeTotalPages)
                            ) {
                                return (
                                    <span key={page} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                                        ...
                                    </span>
                                );
                            }
                            return null;
                        })}
                        <button
                            onClick={() => onPageChange(Math.min(safeTotalPages, safeCurrentPage + 1))}
                            disabled={safeCurrentPage === safeTotalPages}
                            className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                        >
                            <span className="sr-only">Sonraki</span>
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
