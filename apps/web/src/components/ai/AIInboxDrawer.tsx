import React, { useEffect } from 'react';
import { useLayoutStore } from '../../stores/layoutStore';
import { AIInbox } from './AIInbox';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';

export const AIInboxDrawer: React.FC = () => {
    const { aiInboxOpen, setAiInboxOpen } = useLayoutStore();

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && aiInboxOpen) {
                setAiInboxOpen(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [aiInboxOpen, setAiInboxOpen]);

    if (!aiInboxOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                onClick={() => setAiInboxOpen(false)}
            />

            {/* Drawer Panel */}
            <div className="absolute inset-y-0 right-0 max-w-full flex">
                <div className={`w-screen max-w-md transform transition-transform duration-300 ease-in-out shadow-2xl ${aiInboxOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}>
                    <div className="h-full flex flex-col bg-white overflow-hidden relative">
                        {/* Close Button Inside Drawer (for mobile) */}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAiInboxOpen(false)}
                            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-400 z-20 h-auto"
                        >
                            <X size={20} />
                        </Button>

                        <AIInbox />
                    </div>
                </div>
            </div>
        </div>
    );
};
