import * as React from 'react';
import { Column } from './DataTable';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface DataCardProps<T> {
    record: T;
    columns: Column<T>[];
    onRowClick?: (record: T) => void;
    renderActions?: (record: T) => React.ReactNode;
    rowKey: string | number;
}

export const DataCard = <T extends Record<string, any>>({
    record,
    columns,
    onRowClick,
    renderActions,
    rowKey
}: DataCardProps<T>) => {
    // Use the first 2 columns as "Primary" (Title/Subtitle)
    // Others as details
    const primaryCols = columns.slice(0, 2);
    const detailCols = columns.slice(2);

    const renderValue = (col: Column<T>, data: T) => {
        const value = data[col.key];
        if (col.render) {
            return col.render(value, data, 0);
        }
        return value;
    };

    return (
        <div
            className={cn(
                "bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-3 shadow-sm active:scale-[0.98] transition-all",
                onRowClick && "cursor-pointer"
            )}
            onClick={() => onRowClick?.(record)}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                    {primaryCols.map((col, idx) => (
                        <div
                            key={`${rowKey}-${col.key}`}
                            className={cn(
                                idx === 0 ? "text-base font-bold text-gray-900 dark:text-white truncate" : "text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate"
                            )}
                        >
                            {renderValue(col, record)}
                        </div>
                    ))}
                </div>
                {renderActions && (
                    <div className="ml-2" onClick={(e) => e.stopPropagation()}>
                        {renderActions(record)}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-3 border-t border-gray-50 dark:border-gray-700/50">
                {detailCols.map((col) => (
                    <div key={`${rowKey}-${col.key}`} className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold mb-0.5">
                            {typeof col.title === 'string' ? col.title : col.key}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                            {renderValue(col, record)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
