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
        <div className="flex flex-col h-full bg-gray-50/30">
            {/* Search/Header */}
            <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-2.5">
                    <div className="bg-indigo-600 p-1.5 rounded-lg text-white shadow-indigo-100 shadow-lg">
                        <Sparkles size={18} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 leading-none">AI Inbox</h2>
                        <p className="text-[10px] text-gray-500 font-medium uppercase mt-1 tracking-tight">Proactive Insights</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="p-2 h-8 w-8 rounded-full hover:bg-gray-100 text-gray-400"
                        onClick={fetchOpportunities}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="p-3 bg-white/50 border-b border-gray-100 flex gap-2 overflow-x-auto no-scrollbar">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilter('NEW')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all h-auto ${filter === 'NEW'
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    New ({filter === 'NEW' ? opportunities.length : '..'})
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilter('ACKNOWLEDGED')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all h-auto ${filter === 'ACKNOWLEDGED'
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Active
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFilter('ALL')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all h-auto ${filter === 'ALL'
                        ? 'bg-gray-100 text-gray-700'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    History
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {loading && opportunities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 animate-pulse">
                        <RefreshCw size={32} className="mb-4 animate-spin-slow opacity-20" />
                        <p className="text-xs font-medium uppercase tracking-widest">Scanning Data...</p>
                    </div>
                ) : opportunities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <div className="bg-gray-100 p-4 rounded-full mb-4">
                            <Inbox size={32} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">All caught up!</p>
                        <p className="text-xs text-gray-500 mt-1 px-8">
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
            <div className="p-3 bg-white border-t border-gray-100">
                <div className="bg-indigo-50/50 rounded-lg p-3 flex items-start gap-2.5 border border-indigo-100/50">
                    <Bell size={14} className="text-indigo-600 mt-0.5" />
                    <p className="text-[11px] text-indigo-900 leading-relaxed">
                        <span className="font-bold">Pro Tip:</span> Use "Explain in Chat" to deep-dive into the evidence behind any insight.
                    </p>
                </div>
            </div>
        </div>
    );
};
