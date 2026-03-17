"use client";

/**
 * Gradient fade connector between landing page sections.
 * Creates visual continuity so sections don't feel disconnected.
 */
export function SectionConnector({ flip = false }: { flip?: boolean }) {
  return (
    <div
      className="relative z-10 h-32 md:h-48 pointer-events-none -my-16 md:-my-24"
      aria-hidden="true"
    >
      {/* Gradient fade */}
      <div
        className={`absolute inset-0 ${
          flip
            ? "bg-gradient-to-b from-transparent via-accent-blue/[0.03] to-transparent"
            : "bg-gradient-to-b from-transparent via-accent-purple/[0.03] to-transparent"
        }`}
      />
      {/* Center line pulse */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
        <div
          className={`h-full w-full ${
            flip
              ? "bg-gradient-to-b from-transparent via-accent-blue/20 to-transparent"
              : "bg-gradient-to-b from-transparent via-accent-purple/20 to-transparent"
          }`}
        />
      </div>
      {/* Center dot */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-blue/40" />
      </div>
    </div>
  );
}
