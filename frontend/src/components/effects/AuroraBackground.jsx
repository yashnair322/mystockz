/**
 * Aurora background — animated mesh-gradient blobs that morph slowly.
 * Mount once at the App level. Pure CSS animations (no JS frame loop).
 */
const AuroraBackground = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-[3] overflow-hidden"
    >
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />
    </div>
  );
};

export default AuroraBackground;
