import { useState } from 'react';
import { Card } from '@x-ear/ui-web';
import { MessageSquare, Users, Zap } from 'lucide-react';
import SingleSmsTab from './SingleSmsTab';
import BulkSmsTab from './BulkSmsTab';
import SmsAutomationTab from './SmsAutomationTab';

type SubTabId = 'single' | 'bulk' | 'automation';

interface SubTab {
    id: SubTabId;
    label: string;
    icon: React.ReactNode;
}

const SUB_TABS: SubTab[] = [
    { id: 'single', label: 'Tekil SMS', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'bulk', label: 'Toplu SMS', icon: <Users className="w-4 h-4" /> },
    { id: 'automation', label: 'SMS Otomasyonu', icon: <Zap className="w-4 h-4" /> },
];

interface AdminSmsTabProps {
    creditBalance: number;
    creditLoading: boolean;
}

export default function AdminSmsTab({ creditBalance, creditLoading }: AdminSmsTabProps) {
    const [activeSubTab, setActiveSubTab] = useState<SubTabId>('single');

    return (
        <div className="space-y-6">
            {/* Sub-Tab Navigation */}
            <Card className="p-1 dark:bg-gray-800 dark:border-gray-700">
                <nav className="flex space-x-1" aria-label="Sub Tabs">
                    {SUB_TABS.map((tab) => (
                        <button
                            data-allow-raw="true"
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={`
                                flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all
                                ${activeSubTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                                }
                            `}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </Card>

            {/* Sub-Tab Content */}
            <div>
                {activeSubTab === 'single' && <SingleSmsTab creditBalance={creditBalance} creditLoading={creditLoading} />}
                {activeSubTab === 'bulk' && <BulkSmsTab creditBalance={creditBalance} creditLoading={creditLoading} />}
                {activeSubTab === 'automation' && <SmsAutomationTab creditBalance={creditBalance} creditLoading={creditLoading} />}
            </div>
        </div>
    );
}
