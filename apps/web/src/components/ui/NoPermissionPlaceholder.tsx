import React from 'react';

interface NoPermissionPlaceholderProps {
    message?: string;
    height?: string;
    className?: string;
}

export const NoPermissionPlaceholder: React.FC<NoPermissionPlaceholderProps> = ({
    message = 'Bu içeriği görüntüleme izniniz yok',
    height = 'h-64',
    className = ''
}) => {
    return (
        <div className={`bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 ${height} ${className}`}>
            <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>{message}</span>
            </div>
        </div>
    );
};
