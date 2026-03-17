import { useState } from 'react';
import { Megaphone, Send } from 'lucide-react';
import TenantCampaignsTab from './campaigns/TenantCampaignsTab';
import AdminSmsTab from './campaigns/AdminSmsTab';

type TabId = 'tenant' | 'admin';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ReactNode;
}

const TABS: Tab[] = [
    { id: 'tenant', label: 'Abone Kampanyaları', icon: <Megaphone className="w-5 h-5" /> },
    { id: 'admin', label: 'Admin SMS Kampanyası', icon: <Send className="w-5 h-5" /> },
];

export default function AdminCampaignsPage() {
    const [activeTab, setActiveTab] = useState<TabId>('tenant');

    // TODO: Fetch SMS credit from admin API
    const creditBalance = 1000;
    const creditLoading = false;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">SMS Kampanyaları</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Abone kampanyalarını izleyin veya tenant'lara SMS gönderin
                    </p>
                </div>
            </div>

            {/* Main Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {TABS.map((tab) => (
                        <button
                            data-allow-raw="true"
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                                ${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }
                            `}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {activeTab === 'tenant' && <TenantCampaignsTab />}
                {activeTab === 'admin' && <AdminSmsTab creditBalance={creditBalance} creditLoading={creditLoading} />}
            </div>
        </div>
    );
}
