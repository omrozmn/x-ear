import React, { useState, createContext, useContext, ReactNode } from 'react';
import { clsx } from 'clsx';

const cn = (...classes: (string | undefined | null | boolean)[]) => {
  return clsx(classes);
};

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
  orientation: 'horizontal' | 'vertical';
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
};

interface TabsProps {
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Tabs: React.FC<TabsProps> & {
  List: typeof TabsList;
  Trigger: typeof TabsTrigger;
  Content: typeof TabsContent;
} = ({
  children,
  defaultValue,
  value,
  onValueChange,
  orientation = 'horizontal',
  className,
}) => {
    const [internalValue, setInternalValue] = useState(defaultValue || '');

    const activeTab = value !== undefined ? value : internalValue;

    const setActiveTab = (newValue: string) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    return (
      <TabsContext.Provider value={{ activeTab, setActiveTab, orientation }}>
        <div
          className={cn(
            'tabs',
            orientation === 'vertical' ? 'flex gap-4' : 'space-y-2',
            className
          )}
        >
          {children}
        </div>
      </TabsContext.Provider>
    );
  };

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
  const { orientation } = useTabsContext();

  return (
    <div
      className={cn(
        'tabs-list',
        orientation === 'horizontal'
          ? 'flex border-b border-gray-200 dark:border-gray-700'
          : 'flex flex-col space-y-1 min-w-[200px]',
        className
      )}
      role="tablist"
      aria-orientation={orientation}
    >
      {children}
    </div>
  );
};

interface TabsTriggerProps {
  children: ReactNode;
  value: string;
  disabled?: boolean;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  children,
  value,
  disabled = false,
  className,
}) => {
  const { activeTab, setActiveTab, orientation } = useTabsContext();
  const isActive = activeTab === value;

  const handleClick = () => {
    if (!disabled) {
      setActiveTab(value);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'tabs-trigger transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        orientation === 'horizontal'
          ? cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
            isActive
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )
          : cn(
            'px-3 py-2 text-sm font-medium rounded-md text-left',
            isActive
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800',
            disabled && 'opacity-50 cursor-not-allowed'
          ),
        className
      )}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  children: ReactNode;
  value: string;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  children,
  value,
  className,
}) => {
  const { activeTab } = useTabsContext();
  const isActive = activeTab === value;

  if (!isActive) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={cn('tabs-content focus:outline-none', className)}
      tabIndex={0}
    >
      {children}
    </div>
  );
};

// Compound component pattern
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

// Example usage component for documentation
export const TabsExample: React.FC = () => {
  return (
    <Tabs defaultValue="tab1" className="w-full">
      <TabsList>
        <TabsTrigger value="tab1">Genel Bilgiler</TabsTrigger>
        <TabsTrigger value="tab2">Cihazlar</TabsTrigger>
        <TabsTrigger value="tab3">Belgeler</TabsTrigger>
        <TabsTrigger value="tab4" disabled>Devre Dışı</TabsTrigger>
      </TabsList>

      <TabsContent value="tab1" className="mt-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-medium mb-2">Genel Bilgiler</h3>
          <p className="text-gray-600">Hasta genel bilgileri burada görüntülenir.</p>
        </div>
      </TabsContent>

      <TabsContent value="tab2" className="mt-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-medium mb-2">Cihazlar</h3>
          <p className="text-gray-600">Hasta cihaz bilgileri burada görüntülenir.</p>
        </div>
      </TabsContent>

      <TabsContent value="tab3" className="mt-4">
        <div className="p-4 border rounded-lg">
          <h3 className="text-lg font-medium mb-2">Belgeler</h3>
          <p className="text-gray-600">Hasta belgeleri burada görüntülenir.</p>
        </div>
      </TabsContent>
    </Tabs>
  );
};

// Vertical tabs example
export const VerticalTabsExample: React.FC = () => {
  return (
    <Tabs defaultValue="profile" orientation="vertical" className="w-full">
      <TabsList>
        <TabsTrigger value="profile">Profil</TabsTrigger>
        <TabsTrigger value="account">Hesap</TabsTrigger>
        <TabsTrigger value="security">Güvenlik</TabsTrigger>
        <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
      </TabsList>

      <div className="flex-1">
        <TabsContent value="profile">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-medium mb-2">Profil Ayarları</h3>
            <p className="text-gray-600">Profil bilgilerinizi buradan düzenleyebilirsiniz.</p>
          </div>
        </TabsContent>

        <TabsContent value="account">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-medium mb-2">Hesap Ayarları</h3>
            <p className="text-gray-600">Hesap bilgilerinizi buradan yönetebilirsiniz.</p>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-medium mb-2">Güvenlik Ayarları</h3>
            <p className="text-gray-600">Güvenlik tercihlerinizi buradan ayarlayabilirsiniz.</p>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-medium mb-2">Bildirim Ayarları</h3>
            <p className="text-gray-600">Bildirim tercihlerinizi buradan yönetebilirsiniz.</p>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
};