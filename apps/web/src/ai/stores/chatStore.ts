import { create } from 'zustand';
import { EntityItem } from '../../api/generated/schemas';

interface ChatStoreState {
    isVisible: boolean;
    linkedComposerSessionId: string | null;
    pendingPrompt: string | null;
    pendingContext: EntityItem[] | null;

    // Actions
    setVisible: (visible: boolean) => void;
    setLinkedSession: (sessionId: string | null) => void;
    toggleVisible: () => void;
    setPendingPrompt: (prompt: string | null, context?: EntityItem[] | null) => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
    isVisible: false,
    linkedComposerSessionId: null,
    pendingPrompt: null,
    pendingContext: null,

    setVisible: (visible) => set({ isVisible: visible }),
    setLinkedSession: (sessionId) => set({ linkedComposerSessionId: sessionId }),
    toggleVisible: () => set((state) => ({ isVisible: !state.isVisible })),
    setPendingPrompt: (prompt, context = null) => set({ pendingPrompt: prompt, pendingContext: context }),
}));
