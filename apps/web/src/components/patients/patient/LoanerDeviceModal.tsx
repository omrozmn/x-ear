import React, { useState } from 'react';

interface LoanerDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (loanerInventoryId: string, serialNumber: string) => Promise<void>;
    inventoryItems: Array<{
        id?: string;
        name?: string;
        brand?: string;
        model?: string;
        availableInventory?: number;
    }>;
}

export const LoanerDeviceModal: React.FC<LoanerDeviceModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    inventoryItems
}) => {
    const [selectedLoanerItem, setSelectedLoanerItem] = useState('');
    const [loanerSerialNumber, setLoanerSerialNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedLoanerItem) return;

        setIsSubmitting(true);
        try {
            await onSubmit(selectedLoanerItem, loanerSerialNumber);
            // Reset form
            setSelectedLoanerItem('');
            setLoanerSerialNumber('');
            onClose();
        } catch (error) {
            console.error('Failed to add loaner device:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedLoanerItem('');
        setLoanerSerialNumber('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Emanet Cihaz Ekle</h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Stoktan Cihaz Seç
                        </label>
                        <select
                            value={selectedLoanerItem}
                            onChange={(e) => setSelectedLoanerItem(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Cihaz seçiniz...</option>
                            {inventoryItems
                                .filter((item) => (item.availableInventory || 0) > 0)
                                .map((item, index) => (
                                    <option key={item.id || index} value={item.id || ''}>
                                        {item.brand} {item.model} (Stok: {item.availableInventory || 0})
                                    </option>
                                ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Seri No (Opsiyonel)
                        </label>
                        <input
                            type="text"
                            value={loanerSerialNumber}
                            onChange={(e) => setLoanerSerialNumber(e.target.value)}
                            placeholder="Seri numarası giriniz"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                    >
                        İptal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedLoanerItem || isSubmitting}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Ekleniyor...' : 'Ekle'}
                    </button>
                </div>
            </div>
        </div>
    );
};
