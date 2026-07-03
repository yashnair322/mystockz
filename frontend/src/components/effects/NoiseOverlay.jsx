/**
 * Subtle film-grain noise overlay using inline SVG turbulence —
 * adds depth to dark backgrounds without needing an image asset.
 */
const NoiseOverlay = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none fixed inset-0 -z-[1] opacity-[0.035] mix-blend-overlay"
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.9'/></svg>\")",
      backgroundSize: '200px 200px',
    }}
  />
);

export default NoiseOverlay;
