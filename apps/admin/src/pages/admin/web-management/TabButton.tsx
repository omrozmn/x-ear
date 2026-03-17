import React from 'react';

export interface TabButtonProps {
    active: boolean;
    label: string;
    onClick: () => void;
}

export const TabButton: React.FC<TabButtonProps> = ({ active, label, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
                active
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
        >
            {label}
        </button>
    );
};
