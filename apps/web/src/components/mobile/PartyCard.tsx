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
            case 'active': return 'bg-success/10 text-success';
            case 'inactive': return 'bg-muted text-foreground';
            case 'lead': return 'bg-primary/10 text-primary';
            default: return 'bg-muted text-foreground';
        }
    };

    return (
        <div
            onClick={() => {
                triggerSelection();
                onClick();
            }}
            className={cn(
                "bg-card p-4 rounded-xl shadow-sm border active:bg-muted transition-colors flex items-center justify-between relative overflow-hidden",
                isSelected ? "border-blue-500 bg-primary/10/50" : "border-border"
            )}
        >
            {isSelectionMode && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {isSelected ? (
                        <CheckSquare className="w-6 h-6 text-primary" />
                    ) : (
                        <Square className="w-6 h-6 text-gray-300" />
                    )}
                </div>
            )}

            <div className={cn("flex items-center gap-3 flex-1 min-w-0 transition-all", isSelectionMode && "pr-8")}>
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-6 w-6 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-foreground font-semibold truncate">
                            {party.firstName} {party.lastName}
                        </h3>
                        {party.status && (
                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", getStatusColor(party.status))}>
                                {party.status}
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
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
                                className="p-2 bg-success/10 text-success rounded-full active:bg-success/10"
                            >
                                <Phone className="h-5 w-5" />
                            </button>
                            <button
                                data-allow-raw="true"
                                onClick={(e) => handleAction(e, () => onMessage?.(party.phone as string))}
                                className="p-2 bg-primary/10 text-primary rounded-full active:bg-primary/10"
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
