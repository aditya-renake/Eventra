import React from 'react';

/**
 * Official Eventra Logo Component
 */
export const EventraLogo = ({ height = 34, className = '', showBorder = false }) => (
  <div className={`eventra-logo-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center' }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: showBorder ? '3px 8px' : '0',
      background: showBorder ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
      borderRadius: showBorder ? '8px' : '0',
      border: showBorder ? '1px solid rgba(168, 180, 255, 0.25)' : 'none'
    }}>
      <img
        src="/eventra-logo.png"
        alt="Eventra"
        style={{ height: `${height}px`, width: 'auto', objectFit: 'contain', display: 'block' }}
      />
    </div>
  </div>
);

// Backward-compatible alias so legacy imports render the official Eventra logo
export const DYPDPULogo = EventraLogo;

/**
 * Clean Minimal ACES Logo & Badge with Eventra Theme
 */
export const ACESLogo = ({ size = 32, className = '' }) => (
  <div className={`aces-logo-wrap ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
    <div style={{ width: `${size}px`, height: `${size}px`, borderRadius: '8px', background: 'linear-gradient(135deg, #5065f6 0%, #3746bf 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '900', fontSize: '13px', letterSpacing: '0.5px', boxShadow: '0 0 14px rgba(80, 101, 246, 0.4)' }}>
      A
    </div>
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff', letterSpacing: '0.5px' }}>ACES</span>
        <span style={{ fontSize: '9px', background: 'rgba(80, 101, 246, 0.15)', color: '#a8b4ff', border: '1px solid rgba(168, 180, 255, 0.35)', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
          TECH TEAM
        </span>
      </div>
      <div style={{ fontSize: '10px', color: '#9ca3af', fontWeight: '600' }}>
        Eventra Platform
      </div>
    </div>
  </div>
);
