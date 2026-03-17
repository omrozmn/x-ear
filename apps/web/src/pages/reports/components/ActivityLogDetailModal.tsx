import React from 'react';
import { Button } from '@x-ear/ui-web';
import { X } from 'lucide-react';
import type { ActivityLogRead } from '@/api/generated/schemas';
import {
    getActivityDetailEntries,
    translateActivityAction,
    translateActivityEntity,
    translateActivityMessage
} from '../utils/activityLogPresentation';
import { usePermissions } from '../../../hooks/usePermissions';
import { useTranslation } from 'react-i18next';

interface ActivityLogDetailModalProps {
    log: ActivityLogRead;
    onClose: () => void;
}

export function ActivityLogDetailModal({ log, onClose }: ActivityLogDetailModalProps) {
  const { t } = useTranslation('reports');
    const { hasPermission } = usePermissions();
    const canViewDetails = hasPermission('sensitive.reports.activity.details.view');
    const actionLabel = translateActivityAction(log.action);
    const entityLabel = translateActivityEntity(log.entityType);
    const messageLabel = translateActivityMessage(log);
    const detailEntries = canViewDetails ? getActivityDetailEntries(log) : [];
    const readableDetails = typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('activityRecordDetail', 'İşlem Kaydı Detayı')}</h2>
                    <Button
                        onClick={onClose}
                        variant="ghost"
                        className="p-1 hover:bg-muted dark:hover:bg-gray-700 rounded text-muted-foreground !w-auto !h-auto"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>
                <div className="p-4 overflow-y-auto">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-muted-foreground">Tarih</label>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {log.createdAt ? new Date(log.createdAt).toLocaleString('tr-TR') : '-'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Aksiyon</label>
                                <p className="font-medium text-gray-900 dark:text-white">{actionLabel}</p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">{t('user', 'Kullanıcı')}</label>
                                <p className="font-medium text-gray-900 dark:text-white">{log.userName || log.userId || '-'}</p>
                                {canViewDetails && log.userEmail && <p className="text-xs text-muted-foreground">{log.userEmail}</p>}
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Varlık</label>
                                <p className="font-medium text-gray-900 dark:text-white">
                                    {entityLabel} {log.entityId ? `- ${log.entityId}` : ''}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground">Kritik</label>
                                <p className="font-medium text-gray-900 dark:text-white">{log.isCritical ? 'Evet' : 'Hayır'}</p>
                            </div>
                        </div>

                        {messageLabel && messageLabel !== '-' && (
                            <div>
                                <label className="text-xs text-muted-foreground">Mesaj</label>
                                <p className="font-medium text-gray-900 dark:text-white">{messageLabel}</p>
                            </div>
                        )}

                        {canViewDetails && log.details && (
                            <div>
                                <label className="text-xs text-muted-foreground">{t('operationDetails', 'İşlem Detayları')}</label>
                                {detailEntries.length > 0 ? (
                                    <div className="rounded-2xl bg-muted/50 p-3 space-y-2">
                                        {detailEntries.map((entry) => (
                                            <div key={entry.label} className="flex items-start justify-between gap-4 text-sm">
                                                <span className="text-muted-foreground">{entry.label}</span>
                                                <span className="font-medium text-right text-gray-900 dark:text-gray-200 whitespace-pre-wrap break-words">
                                                    {entry.value}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <pre className="bg-muted/50 p-3 rounded-2xl text-xs overflow-x-auto text-gray-900 dark:text-gray-300">
                                        {readableDetails}
                                    </pre>
                                )}
                            </div>
                        )}

                        {!canViewDetails && (
                            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                Bu rol icin log detay verisi gizli.
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t border-border">
                    <Button onClick={onClose} variant="outline" className="w-full">
                        {t('close', 'Kapat')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
