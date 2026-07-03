import { useEffect, useRef } from 'react';

/**
 * Thin gradient progress bar fixed at the top of the viewport,
 * fills 0 → 100% as the user scrolls down the page.
 *
 * Writes the width directly to the DOM via a ref + rAF throttle so the
 * component never re-renders on scroll (React renders are far more expensive
 * than a single style mutation, and the visible motion only needs one paint
 * per frame anyway).
 */
const ScrollProgress = () => {
  const barRef = useRef(null);

  useEffect(() => {
    let rafId = 0;
    let scheduled = false;
    let lastProgress = -1;

    const update = () => {
      scheduled = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const progress = max > 0 ? (doc.scrollTop / max) * 100 : 0;
      if (Math.abs(progress - lastProgress) < 0.1) return;
      lastProgress = progress;
      if (barRef.current) {
        barRef.current.style.width = `${progress}%`;
      }
    };

    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed top-0 left-0 right-0 z-[2000] h-[3px] bg-transparent">
      <div
        ref={barRef}
        className="h-full origin-left"
        style={{
          width: '0%',
          background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)',
          boxShadow: '0 0 12px rgba(139, 92, 246, 0.6)',
          willChange: 'width',
        }}
      />
    </div>
  );
};

export default ScrollProgress;
