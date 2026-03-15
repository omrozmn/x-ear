import { useState } from 'react';
import { Card } from '@x-ear/ui-web';
import { Users, Zap, MessageSquare, MessageCircleMore } from 'lucide-react';
import { useListSmCredit } from '@/api/client/sms.client';
import SingleSmsTab from './SingleSmsTab';
import BulkSmsTab from './BulkSmsTab';
import SmsAutomationTab from './SmsAutomationTab';
import WhatsAppTab from './WhatsAppTab';
import EmailTab from './EmailTab';
import { DesktopPageHeader } from '../../components/layout/DesktopPageHeader';

type ChannelTabId = 'sms' | 'whatsapp' | 'email';
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
    const [activeChannel, setActiveChannel] = useState<ChannelTabId>('sms');
    const [activeTab, setActiveTab] = useState<TabId>('single');

    // Fetch SMS credit - shared across all tabs
    const { data: creditData, isLoading: creditLoading } = useListSmCredit();
    const creditBalance = (creditData as unknown as { data: { credit: number } })?.data?.credit ?? 0;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <DesktopPageHeader
                title="Mesajlaşma Yönetimi"
                description="SMS, WhatsApp ve e-posta kanallarini tek ekrandan yonetin"
                icon={<MessageCircleMore className="w-6 h-6" />}
                eyebrow={{ tr: 'İletişim', en: 'Messaging' }}
            />

            <Card className="p-1 dark:bg-gray-800 dark:border-gray-700">
                <nav className="flex space-x-1" aria-label="Messaging Channels">
                    <button
                        data-allow-raw="true"
                        onClick={() => setActiveChannel('sms')}
                        className={`
                            flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-2xl transition-all
                            ${activeChannel === 'sms'
                                ? 'bg-indigo-600 text-white shadow-sm dark:bg-indigo-500'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                            }
                        `}
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span>SMS</span>
                    </button>
                    <button
                        data-allow-raw="true"
                        onClick={() => setActiveChannel('whatsapp')}
                        className={`
                            flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-2xl transition-all
                            ${activeChannel === 'whatsapp'
                                ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-500'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                            }
                        `}
                    >
                        <MessageCircleMore className="w-4 h-4" />
                        <span>WhatsApp</span>
                    </button>
                    <button
                        data-allow-raw="true"
                        onClick={() => setActiveChannel('email')}
                        className={`
                            flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-2xl transition-all
                            ${activeChannel === 'email'
                                ? 'bg-sky-600 text-white shadow-sm dark:bg-sky-500'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
                            }
                        `}
                    >
                        <MessageCircleMore className="w-4 h-4" />
                        <span>Email</span>
                    </button>
                </nav>
            </Card>

            {activeChannel === 'sms' ? (
                <>
                    <Card className="p-1 dark:bg-gray-800 dark:border-gray-700">
                        <nav className="flex space-x-1" aria-label="Tabs">
                            {TABS.map((tab) => (
                                <button
                                    data-allow-raw="true"
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-2xl transition-all
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

                    <div className="mt-6">
                        {activeTab === 'single' && <SingleSmsTab creditBalance={creditBalance} creditLoading={creditLoading} />}
                        {activeTab === 'bulk' && <BulkSmsTab creditBalance={creditBalance} creditLoading={creditLoading} />}
                        {activeTab === 'automation' && <SmsAutomationTab creditBalance={creditBalance} creditLoading={creditLoading} />}
                    </div>
                </>
            ) : activeChannel === 'whatsapp' ? (
                <div className="mt-6">
                    <WhatsAppTab />
                </div>
            ) : (
                <div className="mt-6">
                    <EmailTab />
                </div>
            )}
        </div>
    );
}
