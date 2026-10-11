// The site mark: a translucent square pyramid, seen from slightly above.
// Two lit faces in front, the back faces and base showing through, hidden
// edges drawn faint. Everything is currentColor with opacities, so the same
// mark is oxblood on paper, white on the red contact card, ink in the footer.
export default function Pyramid({ className = "", size }: { className?: string; size?: number }) {
  const A = "50,5"; // apex
  const L = "5,64"; // base: left, front, right, back (diamond in perspective)
  const F = "50,93";
  const R = "95,64";
  const B = "50,50";
  return (
    <svg
      className={"pyramid " + className}
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      {/* back faces + base, seen through the front */}
      <polygon points={`${A} ${L} ${B}`} fill="currentColor" fillOpacity="0.16" />
      <polygon points={`${A} ${B} ${R}`} fill="currentColor" fillOpacity="0.22" />
      <polygon points={`${L} ${F} ${R} ${B}`} fill="currentColor" fillOpacity="0.1" />
      {/* hidden edges */}
      <path d={`M${A} L${B} M${L} L${B} M${R} L${B}`} fill="none" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="3 3" />
      {/* lit faces */}
      <polygon points={`${A} ${L} ${F}`} fill="currentColor" fillOpacity="0.78" />
      <polygon points={`${A} ${F} ${R}`} fill="currentColor" fillOpacity="0.5" />
      {/* visible edges */}
      <path d={`M${A} L${L} L${F} L${R} Z M${A} L${F}`} fill="none" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
