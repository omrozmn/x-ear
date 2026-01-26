import { create } from 'zustand';

interface ChatStoreState {
    isVisible: boolean;
    linkedComposerSessionId: string | null;

    // Actions
    setVisible: (visible: boolean) => void;
    setLinkedSession: (sessionId: string | null) => void;
    toggleVisible: () => void;
}

export const useChatStore = create<ChatStoreState>((set) => ({
    isVisible: false,
    linkedComposerSessionId: null,

    setVisible: (visible) => set({ isVisible: visible }),
    setLinkedSession: (sessionId) => set({ linkedComposerSessionId: sessionId }),
    toggleVisible: () => set((state) => ({ isVisible: !state.isVisible })),
}));
