import React, { useEffect, useState } from 'react';
import { AIOpportunity, aiApi } from '../../api/ai';
import { InsightCard } from './InsightCard';
import { Sparkles, Bell, RefreshCw, Inbox } from 'lucide-react';
import { Button } from '../ui/Button';

export const AIInbox: React.FC = () => {
    const [opportunities, setOpportunities] = useState<AIOpportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'NEW' | 'ACKNOWLEDGED' | 'ALL'>('NEW');

    const fetchOpportunities = async () => {
        setLoading(true);
        try {
            const response = await aiApi.listOpportunities({
                state: filter === 'ALL' ? undefined : filter
            });
            if (response.success) {
                setOpportunities(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch AI opportunities:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOpportunities();
        // Polling every 60 seconds for new insights
        const interval = setInterval(() => {
            fetchOpportunities();
        }, 60000);
        return () => clearInterval(interval);
    }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleStateChange = (id: string, newState: string) => {
        if (filter !== 'ALL') {
            setOpportunities(prev => prev.filter(o => o.id !== id));
        } else {
            setOpportunities(prev =>
                prev.map(o => o.id === id ? { ...o, state: newState as AIOpportunity['state'] } : o)
            );
        }
    };

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* Search/Header */}
            <div className="p-4 bg-card border-b border-border flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2.5">
                    <div className="bg-indigo-600 p-1.5 rounded-2xl text-white shadow-indigo-100 shadow-lg">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-foreground leading-none">AI Inbox</h2>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1 tracking-tight">Proactive Insights</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 h-8 w-8 rounded-full hover:bg-muted text-muted-foreground"
                        onClick={fetchOpportunities}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="p-3 bg-card/50 border-b border-border flex gap-2 overflow-x-auto no-scrollbar">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilter('NEW')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all h-auto ${filter === 'NEW'
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    New ({filter === 'NEW' ? opportunities.length : '..'})
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilter('ACKNOWLEDGED')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all h-auto ${filter === 'ACKNOWLEDGED'
                        ? 'bg-primary/10 text-primary ring-1 ring-blue-200'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    Active
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilter('ALL')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all h-auto ${filter === 'ALL'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    History
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loading && opportunities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-pulse">
                        <RefreshCw size={32} className="mb-4 animate-spin-slow opacity-20" />
                        <p className="text-xs font-medium uppercase tracking-widest">Scanning Data...</p>
                    </div>
                ) : opportunities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="bg-muted p-4 rounded-full mb-4">
                            <Inbox size={32} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-bold text-foreground">All caught up!</p>
                        <p className="text-xs text-muted-foreground mt-1 px-8">
                            AI hasn't found any new opportunities or risks at the moment.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {opportunities.map(opp => (
                            <InsightCard
                                key={opp.id}
                                opportunity={opp}
                                onStateChange={handleStateChange}
                                onActionTriggered={() => setFilter('ACKNOWLEDGED')}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer / Tip */}
            <div className="p-3 bg-card border-t border-border">
                <div className="bg-indigo-50/50 rounded-2xl p-3 flex items-start gap-2.5 border border-indigo-100/50">
                    <Bell size={14} className="text-indigo-600 mt-0.5" />
                    <p className="text-[11px] text-indigo-900 leading-relaxed">
                        <span className="font-bold">Pro Tip:</span> Use "Explain in Chat" to deep-dive into the evidence behind any insight.
                    </p>
                </div>
            </div>
        </div>
    );
};
