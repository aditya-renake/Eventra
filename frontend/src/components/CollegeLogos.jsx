import React from 'react';

/**
 * Official Dr. D. Y. Patil Vidyapeeth / DIT Pune (DYP DPU) Logo from uploaded official asset
 */
export const DYPDPULogo = ({ height = 36, className = '' }) => (
  <div className={`dyp-logo-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
    <div style={{ background: '#ffffff', padding: '4px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', border: '1px solid rgba(209, 165, 80, 0.4)' }}>
      <img
        src="/dypdpu-logo.png"
        alt="DYP DPU"
        style={{ height: `${height}px`, width: 'auto', objectFit: 'contain', display: 'block' }}
      />
    </div>
  </div>
);

/**
 * Clean Minimal ACES Logo & Badge
 */
export const ACESLogo = ({ size = 32, className = '' }) => (
  <div className={`aces-logo-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
    <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: '8px', background: 'linear-gradient(135deg, #b22b2f 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '900', fontSize: '13px', letterSpacing: '0.5px', boxShadow: '0 0 14px rgba(178, 43, 47, 0.4)' }}>
      A
    </div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px' }}>ACES</span>
        <span style={{ fontSize: '9px', background: 'rgba(178, 43, 47, 0.2)', color: '#fca5a5', border: '1px solid rgba(178, 43, 47, 0.4)', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
          DIT PUNE
        </span>
      </div>
      <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '600' }}>
        Computer Engineering
      </div>
    </div>
  </div>
);
