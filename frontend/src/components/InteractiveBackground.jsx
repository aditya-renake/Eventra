import React, { useEffect, useState } from 'react';

export const InteractiveBackground = () => {
  const [mousePos, setMousePos] = useState({ x: -500, y: -500 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) return;

    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      if (!isHovering) setIsHovering(true);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isHovering]);

  return (
    <div
      className="interactive-ambient"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {/* 1. Dynamic Cursor-Following Spotlight Glow in Eventra Indigo & Lavender */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '720px',
          height: '720px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(89, 110, 230, 0.08) 0%, rgba(168, 180, 255, 0.06) 40%, rgba(238, 240, 255, 0.03) 65%, transparent 80%)',
          transform: `translate3d(${mousePos.x - 360}px, ${mousePos.y - 360}px, 0)`,
          transition: 'transform 0.08s ease-out, opacity 0.4s ease',
          opacity: isHovering ? 1 : 0,
          filter: 'blur(40px)',
          willChange: 'transform',
        }}
      />

      {/* 2. Floating Ambient Glow Orbs in Eventra Palette */}
      <div className="bg-floating-orb orb-1" />
      <div className="bg-floating-orb orb-2" />
      <div className="bg-floating-orb orb-3" />

      {/* 3. Subtle Floating Brand Sparkles */}
      <div className="cyber-particles-container">
        {[...Array(14)].map((_, i) => (
          <div
            key={i}
            className={`cyber-floating-particle particle-${i % 3}`}
            style={{
              left: `${(i * 7.2 + 5) % 94}%`,
              animationDelay: `${(i * 0.8).toFixed(1)}s`,
              animationDuration: `${14 + (i % 6) * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};
