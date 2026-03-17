import React from 'react';
import { AIOpportunity, aiApi } from '../../api/ai';
import { Button } from '../ui/Button';
import { MessageSquare, CheckCircle, XCircle, PlayCircle, Info } from 'lucide-react';

interface InsightCardProps {
    opportunity: AIOpportunity;
    onStateChange?: (id: string, newState: string) => void;
    onActionTriggered?: (id: string) => void;
}

export const InsightCard: React.FC<InsightCardProps> = ({
    opportunity,
    onStateChange,
    onActionTriggered
}) => {
    const {
        id,
        title,
        priority,
        confidenceScore,
        impactScore,
        explanation,
        state,
        recommendedActionLabel,
        recommendedCapability
    } = opportunity;

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'critical': return 'bg-destructive/10 text-red-800 border-red-200';
            case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'medium': return 'bg-primary/10 text-blue-800 border-blue-200';
            default: return 'bg-muted text-foreground border-border';
        }
    };

    const handleAcknowledge = async () => {
        try {
            await aiApi.updateOpportunityState(id, 'ACKNOWLEDGED');
            onStateChange?.(id, 'ACKNOWLEDGED');
        } catch (err) {
            console.error('Failed to acknowledge opportunity:', err);
        }
    };

    const handleDismiss = async () => {
        try {
            await aiApi.updateOpportunityState(id, 'DISMISSED');
            onStateChange?.(id, 'DISMISSED');
        } catch (err) {
            console.error('Failed to dismiss opportunity:', err);
        }
    };

    const handleSimulate = async () => {
        try {
            await aiApi.simulateAction(id);
            onActionTriggered?.(id);
        } catch (err) {
            console.error('Failed to simulate action:', err);
        }
    };

    return (
        <div className={`p-4 mb-4 rounded-xl border shadow-sm transition-all hover:shadow-md bg-card overflow-hidden`}>
            {/* Header: Priority & Scores */}
            <div className="flex justify-between items-start mb-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${getPriorityColor(priority)}`}>
                    {priority}
                </span>
                <div className="flex gap-3 text-[10px] font-medium text-muted-foreground">
                    <div className="flex flex-col items-end">
                        <span>GÜVEN</span>
                        <span className="text-foreground font-bold">{(confidenceScore * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span>ETKİ</span>
                        <span className="text-foreground font-bold">{(impactScore * 100).toFixed(0)}%</span>
                    </div>
                </div>
            </div>

            {/* Title */}
            <h3 className="text-base font-bold text-foreground mb-2 leading-tight">
                {title}
            </h3>

            {/* Explanation */}
            <div className="mb-4 space-y-1">
                {explanation?.slice(0, 2).map((text, i) => (
                    <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <Info size={14} className="mt-0.5 text-blue-400 shrink-0" />
                        <span>{text}</span>
                    </p>
                ))}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                {state === 'NEW' && (
                    <>
                        <Button
                            size="sm"
                            variant="outline"
                            className="px-3 h-8 text-xs flex items-center gap-1.5 hover:bg-muted"
                            onClick={handleAcknowledge}
                        >
                            <CheckCircle size={14} />
                            Anladım
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            className="px-3 h-8 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1.5"
                            onClick={handleDismiss}
                        >
                            <XCircle size={14} />
                            Kaldır
                        </Button>
                    </>
                )}

                {state === 'ACKNOWLEDGED' && recommendedCapability && (
                    <Button
                        size="sm"
                        className="px-4 h-9 text-xs font-semibold premium-gradient tactile-press text-white flex items-center gap-2 shadow-sm"
                        onClick={handleSimulate}
                    >
                        <PlayCircle size={16} />
                        {recommendedActionLabel || 'İşlem Yap'}
                    </Button>
                )}

                <Button
                    size="sm"
                    variant="ghost"
                    className="px-3 h-8 text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 ml-auto"
                    onClick={() => {/* Deep link logic */ }}
                >
                    <MessageSquare size={14} />
                    Sohbette Açıkla
                </Button>
            </div>
        </div>
    );
};
