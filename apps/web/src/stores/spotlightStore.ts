import { create } from 'zustand';

import { EntityItem, AutocompleteResponse } from '../api/generated/schemas';

interface SpotlightState {
    isOpen: boolean;
    query: string;
    stagedEntities: EntityItem[];
    autocompleteResults: AutocompleteResponse | null;

    // Actions
    setOpen: (open: boolean) => void;
    setQuery: (q: string) => void;
    addStagedEntity: (entity: EntityItem) => void;
    removeStagedEntity: (id: string) => void;
    setAutocompleteResults: (results: AutocompleteResponse | null) => void;
    reset: () => void;
}

// Simplified store creation to avoid middleware type conflicts
export const useSpotlightStore = create<SpotlightState>((set) => ({
    isOpen: false,
    query: '',
    stagedEntities: [],
    autocompleteResults: null,

    setOpen: (open) => set({ isOpen: open }),
    setQuery: (q) => set({ query: q }),

    addStagedEntity: (entity) => set((state) => {
        // Prevent duplicate staging
        if (state.stagedEntities.some(e => e.id === entity.id)) return state;
        return { stagedEntities: [...state.stagedEntities, entity] };
    }),

    removeStagedEntity: (id) => set((state) => ({
        stagedEntities: state.stagedEntities.filter(e => e.id !== id)
    })),

    setAutocompleteResults: (results) => set({ autocompleteResults: results }),

    reset: () => set({
        query: '',
        stagedEntities: [],
        autocompleteResults: null
    })
}));
