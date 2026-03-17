import React, { lazy, Suspense, useState } from 'react';
import { FileText, Globe2 } from 'lucide-react';
import * as Tabs from '@radix-ui/react-tabs';

const BlogManagement = lazy(() => import('./AdminBlogPage'));
const WebManagementPage = lazy(() => import('./WebManagementOversightPage'));

const TabFallback = () => (
  <div className="flex justify-center py-16">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

type TabId = 'blog' | 'web';

const ContentManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('blog');

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">İçerik Yönetimi</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Blog yazıları ve web sitesi yönetimi</p>
      </div>

      <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)}>
        <Tabs.List className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tabs.Trigger value="blog" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'blog' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <FileText className="w-4 h-4" /> Blog
          </Tabs.Trigger>
          <Tabs.Trigger value="web" className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'web' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}>
            <Globe2 className="w-4 h-4" /> Web Yönetim
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="blog"><Suspense fallback={<TabFallback />}><BlogManagement /></Suspense></Tabs.Content>
        <Tabs.Content value="web"><Suspense fallback={<TabFallback />}><WebManagementPage /></Suspense></Tabs.Content>
      </Tabs.Root>
    </div>
  );
};

export default ContentManagementPage;
