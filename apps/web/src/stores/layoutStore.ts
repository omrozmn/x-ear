import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutState {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  aiInboxOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAiInboxOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  toggleAiInbox: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      sidebarCollapsed: false,
      aiInboxOpen: false,

      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      setAiInboxOpen: (open) => set({ aiInboxOpen: open }),

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      toggleSidebarCollapse: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      toggleAiInbox: () => set((state) => ({ aiInboxOpen: !state.aiInboxOpen })),
    }),
    {
      name: 'layout-storage',
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
