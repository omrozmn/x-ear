import React from 'react';
import { X, User, Box, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import { EntityItem } from '../../api/generated/schemas';

interface EntityPreviewModalProps {
    entity: EntityItem;
    onClose: () => void;
    onAdd: (entity: EntityItem) => void;
}

export const EntityPreviewModal: React.FC<EntityPreviewModalProps> = ({ entity, onClose, onAdd }) => {
    return (
        <div className="absolute inset-x-0 bottom-0 top-[60px] bg-white z-[60] flex flex-col animate-in slide-in-from-right-4">
            <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        {entity.type === 'patient' ? <User size={16} /> : <Box size={16} />}
                    </div>
                    <h3 className="font-semibold text-gray-900">{entity.label}</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                    <X size={18} />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Basic Info */}
                <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Genel Bilgiler</div>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tür</span>
                            <span className="font-medium capitalize">{entity.type}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Açıklama</span>
                            <span className="font-medium">{entity.subLabel || '-'}</span>
                        </div>
                    </div>
                </div>

                {/* Metadata Details */}
                {entity.metadata && (
                    <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Detaylar</div>
                        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            {Object.entries(entity.metadata).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-sm">
                                    <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                    <span className="font-medium">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Actions (Flow C) */}
                <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Hızlı İşlemler</div>
                    <div className="space-y-2">
                        <button data-allow-raw="true" className="w-full flex items-center justify-between p-3 bg-white border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-sm group">
                            <div className="flex items-center gap-2">
                                <FileText size={16} className="text-gray-400 group-hover:text-blue-500" />
                                <span>Son Faturaları Gör</span>
                            </div>
                            <ChevronRight size={14} className="text-gray-300" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t bg-gray-50">
                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold"
                    onClick={() => {
                        onAdd(entity);
                        onClose();
                    }}
                >
                    İşlem İçin Seç (Chip Ekle)
                </Button>
            </div>
        </div>
    );
};
