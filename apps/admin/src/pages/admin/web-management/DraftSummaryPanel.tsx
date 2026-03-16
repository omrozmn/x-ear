import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import type { AIDiscoveryResponse, SiteWorkspace } from '@/lib/website-generator-client';
import type { TabKey } from './types';

export interface DraftSummaryPanelProps {
    workspace: SiteWorkspace | null;
    selectedTheme: string;
    visibleTabs: Array<{ key: TabKey; label: string }>;
    chatMessages: string[];
    activeFeatureCount: number;
    discovery: AIDiscoveryResponse | null;
}

export const DraftSummaryPanel: React.FC<DraftSummaryPanelProps> = ({
    workspace,
    selectedTheme,
    visibleTabs,
    chatMessages,
    activeFeatureCount,
    discovery,
}) => {
    return (
        <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
            <div className="flex items-center gap-3">
                <LayoutTemplate className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900">Olusturulan Draft Ozeti</h2>
            </div>
            <div className="mt-5 grid gap-3">
                {[
                    `Tema: ${selectedTheme}`,
                    `Gorunen sekme sayisi: ${visibleTabs.length}`,
                    `AI mesaj sayisi: ${chatMessages.length}`,
                    `Aktif modul sayisi: ${activeFeatureCount}`,
                    `Menu item sayisi: ${workspace?.adminMenu.visible_items.length ?? 0}`,
                ].map((item) => (
                    <div key={item} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        {item}
                    </div>
                ))}
            </div>
            {discovery ? (
                <div className="mt-4 rounded-3xl border border-sky-200 bg-sky-50 p-4">
                    <div className="text-sm font-semibold text-sky-900">AI Discovery Sonucu</div>
                    <div className="mt-2 text-sm text-sky-800">Site tipi: {discovery.inferred_site_type}</div>
                    <div className="mt-1 text-sm text-sky-800">Onerilen tema: {discovery.suggested_theme_key}</div>
                    <div className="mt-3 space-y-2">
                        {discovery.questions.map((question) => (
                            <div key={question.key} className="rounded-2xl bg-white px-3 py-2 text-xs text-sky-900 ring-1 ring-sky-200">
                                {question.label}
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
};
