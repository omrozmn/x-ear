import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoanerInfoCardProps {
    device: {
        brand?: string;
        model?: string;
        loanerBrand?: string;
        loanerModel?: string;
        loanerSerialNumber?: string;
        loanerSerialNumberLeft?: string;
        loanerSerialNumberRight?: string;
    };
    onReturn: () => void;
    isUpdating: boolean;
}

export const LoanerInfoCard: React.FC<LoanerInfoCardProps> = ({ device, onReturn, isUpdating }) => {
    return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                        <RefreshCw className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-amber-900">Emanet Cihaz Verildi</span>
                    </div>
                    <div className="text-sm text-amber-800 space-y-1">
                        <p><strong>Marka:</strong> {device.loanerBrand || device.brand}</p>
                        <p><strong>Model:</strong> {device.loanerModel || device.model}</p>
                        {device.loanerSerialNumberLeft && device.loanerSerialNumberRight ? (
                            <div className="mt-1 space-y-1">
                                <p className="text-xs"><strong className="text-blue-700">Sol SN:</strong> {device.loanerSerialNumberLeft}</p>
                                <p className="text-xs"><strong className="text-red-700">Sağ SN:</strong> {device.loanerSerialNumberRight}</p>
                            </div>
                        ) : (
                            device.loanerSerialNumber && <p><strong>Seri No:</strong> {device.loanerSerialNumber}</p>
                        )}
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Bu emanet cihazı stoğa döndürmek istediğinize emin misiniz?')) {
                            onReturn();
                        }
                    }}
                    disabled={isUpdating}
                    className="ml-2 px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                >
                    Stoğa Döndür
                </button>
            </div>
        </div>
    );
};
