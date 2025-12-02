import React, { useState } from 'react';
import { Users, Shield } from 'lucide-react';
import { TeamMembersTab } from './TeamMembersTab';
import { RolePermissionsTab } from './RolePermissionsTab';

type TabType = 'members' | 'permissions';

export default function TeamSettings() {
    const [activeTab, setActiveTab] = useState<TabType>('members');

    const tabs = [
        { id: 'members' as TabType, label: 'Ekip Uyeleri', icon: Users },
        { id: 'permissions' as TabType, label: 'Rol Izinleri', icon: Shield },
    ];

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ekip Yonetimi</h1>
                <p className="text-gray-500 dark:text-gray-400">Ekip uyelerinizi ve izinlerini yonetin.</p>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                    isActive
                                        ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                            >
                                <Icon className="w-5 h-5 mr-2" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'members' && <TeamMembersTab />}
            {activeTab === 'permissions' && <RolePermissionsTab />}
        </div>
    );
}
