"use client";

import { create } from "zustand";

export type SectorId = "hearing" | "pharmacy" | "hospital" | "hotel" | "medical" | "optic" | "beauty" | "general";

interface SectorState {
  sector: SectorId;
  setSector: (s: SectorId) => void;
}

export const useSectorStore = create<SectorState>((set) => ({
  sector: "general",
  setSector: (sector) => set({ sector }),
}));
