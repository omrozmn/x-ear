import React, { useState } from 'react';
import { Bell, Check } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { useListNotifications, useUpdateNotificationRead } from '../../lib/api-client';
import type { ListNotificationsParams, NotificationRead } from '../../api/generated/schemas';

interface NotificationsResponseShape {
    data?: {
        notifications?: NotificationItem[];
    };
}

interface NotificationItem extends NotificationRead {
    read?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function extractNotifications(value: unknown): NotificationItem[] {
    if (!isRecord(value)) {
        return [];
    }

    const response = value as NotificationsResponseShape;
    return response.data?.notifications ?? [];
}

export function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const userId = 'system'; // In a real app, this would come from auth context

    // Gracefully handle missing notifications endpoint (404)
    const params: ListNotificationsParams = {
        user_id: userId,
        page: 1
    };

    const { data: notificationsData, refetch, isError } = useListNotifications(params, {
        query: {
            retry: false,
            refetchOnWindowFocus: false,
            // Suppress errors - notifications are optional (TanStack Query v5 uses meta for error handling)
            meta: {
                suppressError: true
            }
        }
    });

    const markReadMutation = useUpdateNotificationRead();

    const handleMarkRead = async (id: string) => {
        try {
            await markReadMutation.mutateAsync({ notificationId: id });
            refetch();
        } catch (error) {
            console.error('[NotificationCenter] Mark read failed:', error);
        }
    };

    // If endpoint returns error, show 0 notifications
    const notifications = extractNotifications(notificationsData);
    const unreadCount = isError ? 0 : notifications.filter((notification) => !(notification.read ?? notification.isRead)).length;

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
                        {isError ? (
                            <div className="p-8 text-center text-gray-500 text-sm">
                                Bildirim servisi şu anda kullanılamıyor.
                            </div>
                        ) : notifications.length > 0 ? (
                            <div className="divide-y">
                                {notifications.map((notification) => (
                                    <div key={notification.id} className={`p-4 hover:bg-gray-50 transition-colors ${!(notification.read ?? notification.isRead) ? 'bg-indigo-50/50' : ''}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-sm ${!(notification.read ?? notification.isRead) ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                {notification.title}
                                            </h4>
                                            {!(notification.read ?? notification.isRead) && (
                                                <button
                                                    onClick={() => handleMarkRead(notification.id)}
                                                    className="text-indigo-600 hover:text-indigo-800"
                                                    title="Okundu işaretle"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mb-2">{notification.message}</p>
                                        <span className="text-[10px] text-gray-400">
                                            {notification.createdAt ? new Date(notification.createdAt).toLocaleString('tr-TR') : '-'}
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
