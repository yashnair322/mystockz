import { useEffect, useMemo, useRef, memo } from 'react';

/**
 * Cinematic animated trading-chart background.
 * Pure SVG + CSS animations — no JS frame loops, so it's cheap to run.
 *
 * Layers (back → front):
 *   - grid + soft fade mask
 *   - filled area chart (gradient)
 *   - candlestick row that scrolls left infinitely
 *   - glowing price line that "draws itself"
 *   - pulsing data points
 *   - floating price tickers (in DOM, separate, see Home.jsx)
 */

// Deterministic pseudo-random so the chart looks the same every render
const seededRandom = (seed) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const COPY_WIDTH = 2400;     // one chart copy in viewBox units
const SCROLL_DURATION_MS = 40000;  // time to scroll past one copy

const TradingHeroBackground = () => {
  const scrollGroupRef = useRef(null);

  /* JavaScript-driven scroll loop. We directly write the SVG `transform`
     attribute in viewBox user units, so the value is unambiguous.

     We accumulate elapsed time as per-frame deltas (instead of `now - startTime`)
     and SKIP any single delta > 500ms. The browser sometimes pauses rAF for
     several seconds at a time (tab compositor-hides, Alt+Tab, DevTools focus,
     etc.). With the naive (now - startTime) approach those long pauses would
     either teleport the chart forward or — combined with a visibility handler
     reset — snap it back to translate(0 0), which is the "blackout / restart"
     symptom. With delta-accumulation, long pauses are effectively ignored, so
     when rAF resumes the animation continues from exactly where it was. */
  useEffect(() => {
    let rafId = 0;
    let lastFrameTime = 0;
    let elapsed = 0;

    const tick = (now) => {
      if (lastFrameTime > 0) {
        const dt = now - lastFrameTime;
        if (dt < 500) elapsed += dt;   // skip huge gaps from tab-hide / throttle
      }
      lastFrameTime = now;

      const progress = (elapsed % SCROLL_DURATION_MS) / SCROLL_DURATION_MS;
      const tx = -COPY_WIDTH * progress;
      if (scrollGroupRef.current) {
        scrollGroupRef.current.setAttribute('transform', `translate(${tx} 0)`);
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const { candles, linePath, areaPath, dots } = useMemo(() => {
    const rng = seededRandom(42);
    const count = 40;          // candles across
    const spacing = 60;        // px between candles in viewBox
    const width = count * spacing;
    const baseline = 320;      // mid-y in viewBox
    const candles = [];
    const pricePoints = [];

    // Generate a raw random walk that has `count + 1` points
    const rawClose = [];
    let prev = baseline + (rng() - 0.5) * 60;
    for (let i = 0; i <= count; i++) {
      rawClose.push(prev);
      prev = prev + (rng() - 0.5) * 80;
    }

    // Apply linear correction so that rawClose[count] exactly equals rawClose[0]
    const totalDrift = rawClose[count] - rawClose[0];
    for (let i = 0; i <= count; i++) {
      rawClose[i] -= (i / count) * totalDrift;
    }

    for (let i = 0; i < count; i++) {
      const open = rawClose[i];
      const close = rawClose[i + 1];
      const high = Math.min(open, close) - rng() * 25 - 4;
      const low  = Math.max(open, close) + rng() * 25 + 4;
      
      candles.push({
        x: i * spacing + spacing / 2,
        open, close, high, low,
        up: close < open,   // SVG y-down: smaller y = higher price
      });
      pricePoints.push({ x: i * spacing + spacing / 2, y: (open + close) / 2 });
    }

    // To make the chart tile perfectly, we connect the edges at x=0 and x=width
    // using the exact boundary value rawClose[0] (which equals rawClose[count]).
    const boundaryY = rawClose[0];

    const linePath = `M 0 ${boundaryY} ` + 
      pricePoints.map(p => `L ${p.x} ${p.y}`).join(' ') + 
      ` L ${width} ${boundaryY}`;

    // Area under the line, closed to bottom
    const areaPath = `${linePath} L ${width} 600 L 0 600 Z`;

    // A few highlight dots at notable peaks
    const dots = [
      pricePoints[6],
      pricePoints[15],
      pricePoints[24],
      pricePoints[33],
    ].map((p, i) => ({ ...p, delay: i * 0.8 }));

    return { candles, linePath, areaPath, dots, width };
  }, []);

  return (
    <div className="trading-hero-bg" aria-hidden="true">
      <svg
        viewBox="0 0 2400 600"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="60%"  stopColor="#3b82f6" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#0a0f1e" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#3b82f6" />
            <stop offset="25%"  stopColor="#8b5cf6" />
            <stop offset="50%"  stopColor="#ec4899" />
            <stop offset="75%"  stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>

          {/* Edge-fade mask — explicit userSpaceOnUse so the mask is locked to
              the SVG viewBox (0,0,2400,600). With the default objectBoundingBox
              units, the mask was tied to the SCROLLING group's bbox, causing
              content to fall outside its coverage as the chart translated. */}
          <linearGradient
            id="edgeMaskGrad"
            gradientUnits="userSpaceOnUse"
            x1="0" y1="0" x2="2400" y2="0"
          >
            <stop offset="0%"   stopColor="black" />
            <stop offset="6%"   stopColor="white" />
            <stop offset="94%"  stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </linearGradient>
          <mask
            id="edgeMask"
            maskUnits="userSpaceOnUse"
            x="0" y="0" width="2400" height="600"
          >
            <rect x="0" y="0" width="2400" height="600" fill="url(#edgeMaskGrad)" />
          </mask>

          <pattern id="gridPattern" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
          </pattern>

          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background grid */}
        <rect width="100%" height="100%" fill="url(#gridPattern)" mask="url(#edgeMask)" />

        {/* Three copies end-to-end so the visible viewBox region (0..2400) is always
            covered. The parent <g>'s `transform` attribute is driven by the JS rAF
            loop above — it sets transform="translate(tx 0)" in viewBox units, where
            tx loops smoothly from 0 to -2400 then wraps via modulo. Because COPY 2
            and COPY 1 are visually identical, the loop is invisible to the eye. */}
        <g mask="url(#edgeMask)">
          <g
            ref={scrollGroupRef}
            className="chart-scroll"
            transform="translate(0 0)"
          >
          {[0, 2400, 4800].map((offset) => (
            <g key={offset} transform={`translate(${offset}, 0)`}>
              {/* area fill */}
              <path d={areaPath} fill="url(#areaGrad)" />

              {/* candlesticks — solid; motion comes from chart-scroll only */}
              {candles.map((c, i) => (
                <g key={i} className="candle">
                  {/* wick */}
                  <line
                    x1={c.x} x2={c.x}
                    y1={c.high} y2={c.low}
                    stroke={c.up ? '#22c55e' : '#ef4444'}
                    strokeOpacity="0.55"
                    strokeWidth="1.5"
                  />
                  {/* body */}
                  <rect
                    x={c.x - 8}
                    y={Math.min(c.open, c.close)}
                    width="16"
                    height={Math.max(2, Math.abs(c.close - c.open))}
                    fill={c.up ? '#22c55e' : '#ef4444'}
                    fillOpacity="0.65"
                    rx="1.5"
                  />
                </g>
              ))}

              {/* glowing price line */}
              <path
                d={linePath}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
                className="chart-line"
              />

              {/* pulsing data points */}
              {dots.map((d, i) => (
                <g key={i} className="pulse-group" style={{ animationDelay: `${d.delay}s` }}>
                  <circle cx={d.x} cy={d.y} r="14" fill="#a78bfa" opacity="0.18" className="pulse-ring" />
                  <circle cx={d.x} cy={d.y} r="5" fill="#a78bfa" filter="url(#glow)" />
                </g>
              ))}
            </g>
          ))}
          </g>
        </g>
      </svg>
    </div>
  );
};

/* Memoize: the component has no props, so React.memo short-circuits every
   re-render of the parent. Without this, the live-quotes poll on the homepage
   (every 30s) re-renders this component, which restarts the SMIL animation
   from t=0 — visually that's the "stop / blackout / restart" you'd see. */
export default memo(TradingHeroBackground);
