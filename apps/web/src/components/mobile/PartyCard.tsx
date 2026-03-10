import React from 'react';
import { Phone, MessageCircle, ChevronRight, User, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';
import type { PartyRead } from '@/api/generated/schemas';

interface PartyCardProps {
    party: PartyRead;
    onClick: () => void;
    onCall?: (phone: string) => void;
    onMessage?: (phone: string) => void;
    isSelectionMode?: boolean;
    isSelected?: boolean;
}

export const PartyCard: React.FC<PartyCardProps> = ({
    party,
    onClick,
    onCall,
    onMessage,
    isSelectionMode = false,
    isSelected = false
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
            className={cn(
                "bg-white p-4 rounded-xl shadow-sm border active:bg-gray-50 transition-colors flex items-center justify-between relative overflow-hidden",
                isSelected ? "border-blue-500 bg-blue-50/50" : "border-gray-100"
            )}
        >
            {isSelectionMode && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isSelected ? (
                        <CheckSquare className="w-6 h-6 text-blue-600" />
                    ) : (
                        <Square className="w-6 h-6 text-gray-300" />
                    )}
                </div>
            )}

            <div className={cn("flex items-center gap-3 flex-1 min-w-0 transition-all", isSelectionMode && "pr-8")}>
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

            {!isSelectionMode && (
                <div className="flex items-center gap-2 pl-2">
                    {party.phone && (
                        <>
                            <button
                                data-allow-raw="true"
                                onClick={(e) => handleAction(e, () => onCall?.(party.phone as string))}
                                className="p-2 bg-green-50 text-green-600 rounded-full active:bg-green-100"
                            >
                                <Phone className="h-5 w-5" />
                            </button>
                            <button
                                data-allow-raw="true"
                                onClick={(e) => handleAction(e, () => onMessage?.(party.phone as string))}
                                className="p-2 bg-blue-50 text-blue-600 rounded-full active:bg-blue-100"
                            >
                                <MessageCircle className="h-5 w-5" />
                            </button>
                        </>
                    )}
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                </div>
            )}
        </div>
    );
};
