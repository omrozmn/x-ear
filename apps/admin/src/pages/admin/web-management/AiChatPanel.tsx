import React from 'react';
import { Sparkles } from 'lucide-react';
import type { AIEditProposalResponse } from '@/lib/website-generator-client';
import { suggestedCommands } from './types';

export interface AiChatPanelProps {
    chatMessages: string[];
    chatCommand: string;
    setChatCommand: (v: string) => void;
    proposal: AIEditProposalResponse | null;
    isBusy: (key: string) => boolean;
    handleProposeEdit: (command: string) => void;
    handleApplyProposal: () => void;
    handleRevertProposal: () => void;
}

export const AiChatPanel: React.FC<AiChatPanelProps> = ({
    chatMessages,
    chatCommand,
    setChatCommand,
    proposal,
    isBusy,
    handleProposeEdit,
    handleApplyProposal,
    handleRevertProposal,
}) => {
    return (
        <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
            <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-violet-500" />
                <h2 className="text-lg font-semibold text-gray-900">AI Chat ile Duzenleme</h2>
            </div>
            <div className="mt-5 space-y-3">
                {chatMessages.map((message, index) => (
                    <div
                        key={`${message}-${index}`}
                        className={`rounded-3xl px-4 py-3 text-sm ${
                            index % 2 === 0 ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-700'
                        }`}
                    >
                        {message}
                    </div>
                ))}
            </div>
            <div className="mt-4 rounded-3xl bg-gray-50 p-4">
                <div className="flex flex-col gap-3">
                    <input value={chatCommand} onChange={(event) => setChatCommand(event.target.value)} className="w-full rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Ornek: Blog ekle" />
                    <button onClick={() => handleProposeEdit(chatCommand)} disabled={!chatCommand || isBusy('propose-edit')} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                        {isBusy('propose-edit') ? 'Oneri hazirlaniyor...' : 'AI Onerisi Uret'}
                    </button>
                </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                {suggestedCommands.map((command) => (
                    <button
                        key={command}
                        onClick={() => setChatCommand(command)}
                        className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                    >
                        {command}
                    </button>
                ))}
            </div>
            {proposal ? (
                <div className="mt-4 rounded-3xl border border-gray-200 bg-gray-50 p-4">
                    <div className="text-sm font-semibold text-gray-900">Son Oneri</div>
                    <div className="mt-2 text-sm text-gray-600">{proposal.summary}</div>
                    <div className="mt-2 text-xs text-gray-500">Durum: {proposal.status}</div>
                    <div className="mt-3 flex gap-2">
                        <button onClick={handleApplyProposal} disabled={proposal.status !== 'proposed' || isBusy('apply-proposal')} className="rounded-2xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                            Uygula
                        </button>
                        <button onClick={handleRevertProposal} disabled={proposal.status !== 'applied' || isBusy('revert-proposal')} className="rounded-2xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
                            Geri Al
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};
