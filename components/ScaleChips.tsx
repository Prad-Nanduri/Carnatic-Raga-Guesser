/**
 * Renders a scale string ("S R2 G3 P N3 S") as swara chips; Sa gets the
 * gold treatment since it anchors the raga.
 */
export default function ScaleChips({ scale }: { scale: string }) {
  return (
    <span className="inline-flex flex-wrap gap-1">
      {scale.split(/\s+/).map((tok, i) => (
        <span key={i} className={`swara ${tok.toUpperCase() === "S" ? "swara--sa" : ""}`}>
          {tok}
        </span>
      ))}
    </span>
  );
}
