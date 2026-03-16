import React, { useEffect, useState } from 'react';
import { BadgePercent, Building2, Users, Shield } from 'lucide-react';
import { TeamMembersTab } from './TeamMembersTab';
import { RolePermissionsTab } from './RolePermissionsTab';
import { BranchesTab } from './BranchesTab';
import { PersonnelSettingsTab } from './PersonnelSettingsTab';
import { Button } from '@x-ear/ui-web';

type TabType = 'members' | 'permissions' | 'branches' | 'personnel-settings';

export default function TeamSettings() {
    const resolveHashTab = (): TabType => {
        if (typeof window === 'undefined') return 'members';
        return window.location.hash === '#personnel-settings' ? 'personnel-settings' : 'members';
    };

    const [activeTab, setActiveTab] = useState<TabType>(resolveHashTab);

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        if (typeof window === 'undefined') return;
        if (tab === 'personnel-settings') {
            window.location.hash = 'personnel-settings';
            return;
        }
        if (window.location.hash === '#personnel-settings') {
            history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }
    };

    useEffect(() => {
        const syncFromHash = () => {
            setActiveTab(window.location.hash === '#personnel-settings' ? 'personnel-settings' : 'members');
        };

        syncFromHash();
        window.addEventListener('hashchange', syncFromHash);
        return () => window.removeEventListener('hashchange', syncFromHash);
    }, []);

    const tabs = [
        { id: 'members' as TabType, label: 'Ekip Uyeleri', icon: Users },
        { id: 'branches' as TabType, label: 'Subeler', icon: Building2 },
        { id: 'permissions' as TabType, label: 'Rol Izinleri', icon: Shield },
        { id: 'personnel-settings' as TabType, label: 'Personel Ayarlari', icon: BadgePercent },
    ];

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <Button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                variant="ghost"
                                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${isActive
                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                    }`}
                            >
                                <Icon className="w-5 h-5 mr-2" />
                                {tab.label}
                            </Button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'members' && <TeamMembersTab />}
            {activeTab === 'branches' && <BranchesTab />}
            {activeTab === 'permissions' && <RolePermissionsTab />}
            {activeTab === 'personnel-settings' && <PersonnelSettingsTab />}
        </div>
    );
}
