"use client";

import { useEffect } from "react";
import { useSectorStore, type SectorId } from "@/lib/sector-store";

const VALID_SECTORS: SectorId[] = ["hearing", "pharmacy", "hospital", "hotel", "medical", "optic", "beauty", "general"];

export function SectorInit({ sector }: { sector: string }) {
  const setSector = useSectorStore((s) => s.setSector);

  useEffect(() => {
    if (VALID_SECTORS.includes(sector as SectorId)) {
      setSector(sector as SectorId);
    }
  }, [sector, setSector]);

  return null;
}
