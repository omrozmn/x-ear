import { useState } from 'react';
import { Card } from '@x-ear/ui-web';
import { MessageSquare, Users, Zap } from 'lucide-react';
import { useListSmCredit } from '@/api/generated';
import SingleSmsTab from './SingleSmsTab';
import BulkSmsTab from './BulkSmsTab';
import SmsAutomationTab from './SmsAutomationTab';

type TabId = 'single' | 'bulk' | 'automation';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ReactNode;
}

const TABS: Tab[] = [
    { id: 'single', label: 'Tekil SMS', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'bulk', label: 'Toplu SMS', icon: <Users className="w-4 h-4" /> },
    { id: 'automation', label: 'SMS Otomasyonu', icon: <Zap className="w-4 h-4" /> },
];

export default function SmsPage() {
    const [activeTab, setActiveTab] = useState<TabId>('single');

    // Fetch SMS credit - shared across all tabs
    const { data: creditData, isLoading: creditLoading } = useListSmCredit();
    const creditBalance = (creditData as any)?.data?.credit ?? 0;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SMS Yönetimi</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Tekil SMS gönderin, toplu kampanyalar oluşturun veya otomatik mesajlar ayarlayın
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <Card className="p-1 dark:bg-gray-800 dark:border-gray-700">
                <nav className="flex space-x-1" aria-label="Tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all
                                ${activeTab === tab.id
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

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'single' && <SingleSmsTab creditBalance={creditBalance} creditLoading={creditLoading} />}
                {activeTab === 'bulk' && <BulkSmsTab creditBalance={creditBalance} creditLoading={creditLoading} />}
                {activeTab === 'automation' && <SmsAutomationTab creditBalance={creditBalance} creditLoading={creditLoading} />}
            </div>
        </div>
    );
}
