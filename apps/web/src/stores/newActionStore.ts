import { create } from 'zustand';

interface NewActionStore {
  triggered: boolean;
  fireNewAction: () => void;
  resetNewAction: () => void;
}

export const useNewActionStore = create<NewActionStore>((set) => ({
  triggered: false,
  fireNewAction: () => set({ triggered: true }),
  resetNewAction: () => set({ triggered: false }),
}));
