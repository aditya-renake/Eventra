import React, { useEffect, useState } from 'react';

export const InteractiveBackground = () => {
  const [mousePos, setMousePos] = useState({ x: -500, y: -500 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
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
      {/* 1. Dynamic Cursor-Following Spotlight Glow */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '750px',
          height: '750px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(178, 43, 47, 0.18) 0%, rgba(209, 165, 80, 0.12) 35%, rgba(247, 208, 112, 0.05) 60%, transparent 80%)',
          transform: `translate3d(${mousePos.x - 375}px, ${mousePos.y - 375}px, 0)`,
          transition: 'transform 0.08s ease-out, opacity 0.4s ease',
          opacity: isHovering ? 1 : 0,
          filter: 'blur(30px)',
          willChange: 'transform',
        }}
      />

      {/* 2. Floating Ambient Glow Orbs */}
      <div className="bg-floating-orb orb-1" />
      <div className="bg-floating-orb orb-2" />
      <div className="bg-floating-orb orb-3" />
      <div className="bg-floating-orb orb-4" />
      <div className="bg-floating-orb orb-5" />

      {/* 3. Floating Cyber Particle Dots */}
      <div className="cyber-particles-container">
        {[...Array(18)].map((_, i) => (
          <div
            key={i}
            className={`cyber-floating-particle particle-${i % 6}`}
            style={{
              left: `${(i * 5.8 + 4) % 96}%`,
              animationDelay: `${(i * 0.7).toFixed(1)}s`,
              animationDuration: `${12 + (i % 8) * 2}s`,
            }}
          />
        ))}
      </div>

      {/* 4. Subtle Animated Cyber Grid Scanline */}
      <div className="bg-cyber-scanline" />
    </div>
  );
};
