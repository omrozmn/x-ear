import React, { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { useGetApiNotifications, usePutApiNotificationsNotificationIdRead } from '../../lib/api-client';
import { Button } from '@x-ear/ui-web';

export function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const userId = 'system'; // In a real app, this would come from auth context

    const { data: notificationsData, refetch } = useGetApiNotifications({
        user_id: userId,
        page: 1,
        limit: 5
    });

    const markReadMutation = usePutApiNotificationsNotificationIdRead();

    const handleMarkRead = async (id: string) => {
        try {
            await markReadMutation.mutateAsync({ notificationId: id } as any);
            refetch();
        } catch (error) {
            console.error(error);
        }
    };

    const unreadCount = (notificationsData as any)?.data?.notifications?.filter((n: any) => !n.read).length || 0;

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger asChild>
                <button className="relative p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100">
                    <Bell className="w-6 h-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content className="w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-0 z-50 mr-4" align="end" sideOffset={5}>
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">Bildirimler</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                                {unreadCount} yeni
                            </span>
                        )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                        {(notificationsData as any)?.data?.notifications && (notificationsData as any).data.notifications.length > 0 ? (
                            <div className="divide-y">
                                {(notificationsData as any).data.notifications.map((notif: any) => (
                                    <div key={notif.id} className={`p-4 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-indigo-50/50' : ''}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-sm ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                {notif.title}
                                            </h4>
                                            {!notif.read && (
                                                <button
                                                    onClick={() => handleMarkRead(notif.id)}
                                                    className="text-indigo-600 hover:text-indigo-800"
                                                    title="Okundu işaretle"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">{notif.message}</p>
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(notif.createdAt).toLocaleString('tr-TR')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                Bildiriminiz bulunmuyor.
                            </div>
                        )}
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
