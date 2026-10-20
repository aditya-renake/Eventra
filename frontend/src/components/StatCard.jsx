/**
 * ============================================================================
 * METRIC STAT CARD COMPONENT (StatCard.jsx)
 * ============================================================================
 * Purpose:
 *   Glassmorphic metric display card used on the Organizer Dashboard to showcase
 *   key performance indicators: attendee count, check-in percentage, email delivery,
 *   and verified ticket sales with color-coded accent glows and animated progress bars.
 * ============================================================================
 */

import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'emerald', progress }) => {
  const colorMap = {
    emerald: {
      accent: '#22c55e',
      glow: 'rgba(34, 197, 94, 0.15)',
      badgeBg: 'rgba(34, 197, 94, 0.1)',
    },
    cyan: {
      accent: '#06b6d4',
      glow: 'rgba(6, 182, 212, 0.15)',
      badgeBg: 'rgba(6, 182, 212, 0.1)',
    },
    violet: {
      accent: '#8b5cf6',
      glow: 'rgba(139, 92, 246, 0.15)',
      badgeBg: 'rgba(139, 92, 246, 0.1)',
    },
    amber: {
      accent: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.15)',
      badgeBg: 'rgba(245, 158, 11, 0.1)',
    },
  };

  const theme = colorMap[color] || colorMap.emerald;

  return (
    <div className="glass-card stat-card" style={{ padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
          </span>
          <div className="stat-card-value" style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', marginTop: '4px', letterSpacing: '-0.5px' }}>
            {value}
          </div>
        </div>

        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: theme.badgeBg, border: `1px solid ${theme.accent}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.accent }}>
          {Icon && <Icon size={22} />}
        </div>
      </div>

      {progress !== undefined && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
            <span>Progress</span>
            <span style={{ color: theme.accent, fontWeight: '700' }}>{progress}%</span>
          </div>
          <div style={{ width: '100%', height: '6px', background: '#0b0f19', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                height: '100%',
                background: `linear-gradient(90deg, ${theme.accent}, #4ade80)`,
                borderRadius: '999px',
                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>
      )}

      {subtitle && (
        <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>
          {subtitle}
        </div>
      )}
    </div>
  );
};
