import React from 'react';
import { Phone, MessageCircle, ChevronRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';

// Define minimal Party interface if importing fails, or use 'any' temporarily to avoid blockers
// Ideally import { Party } from '@/types/party';

interface PartyCardProps {
    party: any; // Using any to be safe for now, will refine
    onClick: () => void;
    onCall?: (phone: string) => void;
    onMessage?: (phone: string) => void;
}

export const PartyCard: React.FC<PartyCardProps> = ({
    party,
    onClick,
    onCall,
    onMessage
}) => {
    const { triggerSelection } = useHaptic();

    const handleAction = (e: React.MouseEvent, action: () => void) => {
        e.stopPropagation();
        triggerSelection();
        action();
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'bg-green-100 text-green-700';
            case 'inactive': return 'bg-gray-100 text-gray-700';
            case 'lead': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div
            onClick={() => {
                triggerSelection();
                onClick();
            }}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 active:bg-gray-50 transition-colors flex items-center justify-between"
        >
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-gray-500" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-gray-900 font-semibold truncate">
                            {party.firstName} {party.lastName}
                        </h3>
                        {party.status && (
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", getStatusColor(party.status))}>
                                {party.status}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                        {party.phone || 'Telefon yok'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-2 pl-2">
                {party.phone && (
                    <>
                        <button
                            onClick={(e) => handleAction(e, () => onCall?.(party.phone))}
                            className="p-2 bg-green-50 text-green-600 rounded-full active:bg-green-100"
                        >
                            <Phone className="h-5 w-5" />
                        </button>
                        <button
                            onClick={(e) => handleAction(e, () => onMessage?.(party.phone))}
                            className="p-2 bg-blue-50 text-blue-600 rounded-full active:bg-blue-100"
                        >
                            <MessageCircle className="h-5 w-5" />
                        </button>
                    </>
                )}
                <ChevronRight className="h-5 w-5 text-gray-300" />
            </div>
        </div>
    );
};
