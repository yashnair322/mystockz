import { forwardRef } from 'react';

/**
 * Reusable glassmorphism card with optional spotlight + 3D tilt.
 * Pass `tilt` to enable interactive 3D, `spotlight` for a cursor-tracking glow.
 */
const GlassCard = forwardRef(function GlassCard(
  { children, className = '', tilt = false, spotlight = false, as: As = 'div', ...rest },
  ref
) {
  const handleMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    if (spotlight) {
      el.style.setProperty('--mouse-x', `${px * 100}%`);
      el.style.setProperty('--mouse-y', `${py * 100}%`);
    }
    if (tilt) {
      const tiltX = (0.5 - py) * 8;
      const tiltY = (px - 0.5) * 10;
      el.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-4px)`;
    }
  };
  const handleLeave = (e) => { if (tilt) e.currentTarget.style.transform = ''; };

  return (
    <As
      ref={ref}
      className={`glass-card ${spotlight ? 'glass-card--spotlight' : ''} ${className}`}
      onMouseMove={(tilt || spotlight) ? handleMove : undefined}
      onMouseLeave={tilt ? handleLeave : undefined}
      {...rest}
    >
      {children}
    </As>
  );
});

export default GlassCard;
