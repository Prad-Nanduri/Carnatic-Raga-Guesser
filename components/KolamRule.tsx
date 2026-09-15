// Kolam-inspired geometric rule: a lattice of dots joined by diamond outlines.
// Line art only — stroke currentColor, no fills.
export default function KolamRule({ className = "" }: { className?: string }) {
  const cells = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 320 24"
      preserveAspectRatio="xMidYMid meet"
      className={`block w-full text-bronze ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <line x1="0" y1="12" x2="14" y2="12" />
      <line x1="306" y1="12" x2="320" y2="12" />
      {cells.map((i) => {
        const x = 32 + i * 32;
        return (
          <g key={i}>
            <path d={`M ${x} 4 L ${x + 7} 12 L ${x} 20 L ${x - 7} 12 Z`} />
            <circle cx={x} cy="12" r="1.4" fill="currentColor" stroke="none" />
            <circle cx={x - 16} cy="12" r="0.9" fill="currentColor" stroke="none" opacity="0.6" />
          </g>
        );
      })}
    </svg>
  );
}
