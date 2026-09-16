import KolamRule from "./KolamRule";

// Gopuram silhouette as a quiet footer accent — tiered line art, no fills.
function Gopuram() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 64"
      className="h-14 w-auto text-bronze"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    >
      <path d="M96 4 h8 l-2 6 h-4 Z" />
      <path d="M78 12 h44 l4 8 h-52 Z" />
      <path d="M70 22 h60 l5 9 h-70 Z" />
      <path d="M62 33 h76 l6 10 h-88 Z" />
      <path d="M52 45 h96 l7 11 h-110 Z" />
      <line x1="100" y1="2" x2="100" y2="4" />
      <path d="M94 56 h12 v-6 h-12 Z" opacity="0.7" />
    </svg>
  );
}

export default function TempleFooter() {
  return (
    <footer className="mt-16">
      <KolamRule />
      <div className="mt-6 flex flex-col items-center gap-3">
        <Gopuram />
        <p className="subtle text-xs">
          Hum a phrase — matched to the closest Carnatic raga by your own
          pitch contour, judged by you.
        </p>
      </div>
    </footer>
  );
}
