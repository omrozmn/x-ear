import React from 'react';
import { Button } from '@x-ear/ui-web';
import { X } from 'lucide-react';
import type { ActivityLogRead } from '@/api/generated/schemas';

interface ActivityLogDetailModalProps {
    log: ActivityLogRead;
    onClose: () => void;
}

export function ActivityLogDetailModal({ log, onClose }: ActivityLogDetailModalProps) {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Aktivite Log Detayı</h2>
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-400 !w-auto !h-auto"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="p-4 overflow-y-auto">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Tarih</label>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {log.createdAt ? new Date(log.createdAt).toLocaleString('tr-TR') : '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Aksiyon</label>
                                <p className="font-medium text-gray-900 dark:text-white">{log.action}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Kullanıcı</label>
                                <p className="font-medium text-gray-900 dark:text-white">{log.userName || log.userId || '-'}</p>
                                {log.userEmail && <p className="text-xs text-gray-500 dark:text-gray-400">{log.userEmail}</p>}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Varlık</label>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {log.entityType || '-'} {log.entityId ? `- ${log.entityId}` : ''}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Kritik</label>
                                <p className="font-medium text-gray-900 dark:text-white">{log.isCritical ? 'Evet' : 'Hayır'}</p>
                            </div>
                        </div>

                        {log.message && (
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Mesaj</label>
                                <p className="font-medium text-gray-900 dark:text-white">{log.message}</p>
                            </div>
                        )}

                        {log.details && (
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400">Detaylar</label>
                                <pre className="bg-gray-100 dark:bg-gray-900/50 p-3 rounded-lg text-xs overflow-x-auto text-gray-900 dark:text-gray-300">
                                    {JSON.stringify(log.details, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <Button onClick={onClose} variant="outline" className="w-full">
                        Kapat
                    </Button>
                </div>
            </div>
        </div>
    );
}
