import React, { useState, useEffect } from 'react';
import { QrCode, LayoutDashboard, Globe, LogOut, Lock, Menu, X, ShieldCheck, Crown } from 'lucide-react';
import { DYPDPULogo } from './CollegeLogos';

export const Navbar = ({ currentView, setCurrentView, user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="floating-nav-container">
      <header className="floating-nav-pill">
        
        {/* Left: Emblem Logo */}
        <div 
          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', paddingRight: '8px', borderRight: '1px solid rgba(255, 255, 255, 0.15)' }} 
          onClick={() => handleNavClick('landing')}
          title="Dr. D. Y. Patil Institute of Technology (DYPDPU) - ACES"
        >
          <img
            src="/dypdpu-logo.png"
            alt="DYP DPU"
            style={{ height: '22px', width: 'auto', display: 'block' }}
          />
        </div>

        {/* Navigation Tabs */}
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            className={`pill-nav-item ${currentView === 'landing' ? 'active' : ''}`}
            onClick={() => handleNavClick('landing')}
          >
            HOME
          </button>

          <a
            href="#events-hub-section"
            className="pill-nav-item"
            style={{ textDecoration: 'none', color: '#f7d070' }}
          >
            🔥 ALL EVENTS
          </a>

          <a
            href="#about-section"
            className="pill-nav-item"
            style={{ textDecoration: 'none' }}
          >
            ABOUT EVENT
          </a>

          <a
            href="#tracks-section"
            className="pill-nav-item"
            style={{ textDecoration: 'none' }}
          >
            TRACKS
          </a>

          <a
            href="#schedule-section"
            className="pill-nav-item"
            style={{ textDecoration: 'none' }}
          >
            TIMELINE
          </a>

          <a
            href="#venue-section"
            className="pill-nav-item"
            style={{ textDecoration: 'none' }}
          >
            VENUE
          </a>

          <a
            href="#gallery-section"
            className="pill-nav-item"
            style={{ textDecoration: 'none' }}
          >
            GALLERY
          </a>

          <a
            href="#lookup-section"
            className="pill-nav-item"
            style={{ textDecoration: 'none' }}
          >
            PASS LOOKUP
          </a>

          {user && (
            <>
              {['admin', 'super_admin', 'event_head', 'root_owner'].includes(user?.role) && (
                <button
                  className={`pill-nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
                  onClick={() => handleNavClick('dashboard')}
                >
                  <LayoutDashboard size={12} /> DASHBOARD
                </button>
              )}
              <button
                className={`pill-nav-item ${currentView === 'scanner' ? 'active' : ''}`}
                onClick={() => handleNavClick('scanner')}
              >
                <QrCode size={12} /> SCANNER
              </button>
            </>
          )}

          {!user && (
            <button
              className={`pill-nav-item ${currentView === 'login' ? 'active' : ''}`}
              onClick={() => handleNavClick('login')}
            >
              <Lock size={12} /> LOGIN
            </button>
          )}
        </nav>

        {/* User Badge, Signout or Mobile Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {user && (
            <>
              {/* Personalized Operator Badge for All Admins */}
              <div 
                className="hide-on-mobile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: 'rgba(34, 211, 238, 0.15)',
                  border: '1px solid rgba(34, 211, 238, 0.35)',
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#22d3ee',
                }}
              >
                <ShieldCheck size={12} color="#22d3ee" />
                <span>{user.name ? user.name.split(' ')[0] : 'Admin'}</span>
              </div>

              <button
                className="pill-nav-item hide-on-mobile"
                onClick={onLogout}
                title="Sign Out"
                style={{ color: '#b22b2f', padding: '6px 10px' }}
              >
                <LogOut size={13} />
              </button>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            className="mobile-menu-toggle pill-nav-item"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ padding: '6px 10px' }}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div 
          style={{
            position: 'absolute',
            top: '56px',
            left: '16px',
            right: '16px',
            background: 'rgba(11, 15, 25, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 1001,
          }}
        >
          <button
            className={`btn btn-sm ${currentView === 'landing' ? 'btn-dyp' : 'btn-ghost'}`}
            style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
            onClick={() => handleNavClick('landing')}
          >
            <Globe size={14} /> Home & Event Details
          </button>

          {user && (
            <>
              {['admin', 'super_admin', 'event_head', 'root_owner'].includes(user?.role) && (
                <button
                  className={`btn btn-sm ${currentView === 'dashboard' ? 'btn-dyp' : 'btn-ghost'}`}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
                  onClick={() => handleNavClick('dashboard')}
                >
                  <LayoutDashboard size={14} /> Operations Dashboard
                </button>
              )}
              <button
                className={`btn btn-sm ${currentView === 'scanner' ? 'btn-dyp' : 'btn-ghost'}`}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
                onClick={() => handleNavClick('scanner')}
              >
                <QrCode size={14} /> Gate Scanner Terminal
              </button>

              <button
                className="btn btn-danger btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px', marginTop: '6px' }}
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut size={14} /> Sign Out ({user.name})
              </button>
            </>
          )}

          {!user && (
            <button
              className={`btn btn-sm ${currentView === 'login' ? 'btn-dyp' : 'btn-ghost'}`}
              style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
              onClick={() => handleNavClick('login')}
            >
              <Lock size={14} /> Staff / Admin Sign In
            </button>
          )}
        </div>
      )}
    </div>
  );
};
