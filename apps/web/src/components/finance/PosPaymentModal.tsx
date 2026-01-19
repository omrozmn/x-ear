import React from 'react';
import { X } from 'lucide-react';
import { PosPaymentForm } from './PosPaymentForm';

interface PosPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    saleId: string;
    amount: number;
    partyName: string;
}

export const PosPaymentModal: React.FC<PosPaymentModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    saleId,
    amount,
    partyName
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-semibold">Online Ödeme - {partyName}</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                    <PosPaymentForm
                        saleId={saleId}
                        amount={amount}
                        onSuccess={() => {
                            onSuccess();
                            onClose();
                        }}
                    />
                </div>
            </div>
        </div>
    );
};
