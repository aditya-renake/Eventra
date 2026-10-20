import React, { useState } from 'react';
import { QrCode, LayoutDashboard, Globe, LogOut, Lock, Menu, X, ShieldCheck, Flame, Compass, Ticket, Info, Trophy, Clock, Image as GalleryIcon } from 'lucide-react';

export const Navbar = ({ currentView, setCurrentView, user, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (view) => {
    setCurrentView(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="floating-nav-container">
      <header className="floating-nav-pill">
        
        {/* Eventra brand logo */}
        <button
          type="button"
          className="eventra-brand"
          onClick={() => handleNavClick('landing')}
          title="Eventra home"
          aria-label="Eventra home"
        >
          <img
            src="/eventra-logo.svg"
            alt="Eventra"
            style={{ height: '34px', width: 'auto', display: 'block' }}
          />
        </button>

        {/* Desktop Navigation Tabs */}
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <button
            className={`pill-nav-item ${currentView === 'landing' ? 'active' : ''}`}
            onClick={() => handleNavClick('landing')}
          >
            HOME
          </button>

          <a
            href="#events-hub-section"
            className="pill-nav-item pill-nav-highlight"
            style={{ textDecoration: 'none' }}
          >
            🔥 ALL EVENTS
          </a>

          <a
            href="#about-section"
            className="pill-nav-item"
            style={{ textDecoration: 'none' }}
          >
            ABOUT
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
                  <LayoutDashboard size={13} /> DASHBOARD
                </button>
              )}
              <button
                className={`pill-nav-item ${currentView === 'scanner' ? 'active' : ''}`}
                onClick={() => handleNavClick('scanner')}
              >
                <QrCode size={13} /> SCANNER
              </button>
            </>
          )}

          {!user && (
            <button
              className={`pill-nav-item ${currentView === 'login' ? 'active' : ''}`}
              onClick={() => handleNavClick('login')}
            >
              <Lock size={13} /> LOGIN
            </button>
          )}
        </nav>

        {/* User Badge, Signout or Mobile Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user && (
            <>
              {/* Operator Badge */}
              <div 
                className="hide-on-mobile user-status-chip"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: 'var(--eventra-soft-lavender, #EEF0FF)',
                  border: '1px solid var(--eventra-soft-lavender-border, #DDE3FF)',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: 'var(--eventra-indigo, #596EE6)',
                }}
              >
                <ShieldCheck size={13} color="#596EE6" />
                <span>{user.name ? user.name.split(' ')[0] : 'Admin'}</span>
              </div>

              <button
                className="pill-nav-item hide-on-mobile signout-btn"
                onClick={onLogout}
                title="Sign Out"
                aria-label="Sign out of operations"
                style={{ color: '#EF4444', padding: '6px 10px' }}
              >
                <LogOut size={14} />
              </button>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            className="mobile-menu-toggle pill-nav-item"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ padding: '7px 11px' }}
            aria-label="Toggle Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>

      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div 
          className="mobile-nav-drawer"
          style={{
            position: 'absolute',
            top: '60px',
            left: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(89, 110, 230, 0.16)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 16px 40px rgba(41, 48, 74, 0.12)',
            zIndex: 1001,
          }}
        >
          <button
            className={`btn btn-sm ${currentView === 'landing' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
            onClick={() => handleNavClick('landing')}
          >
            <Globe size={15} /> Home & Event Details
          </button>

          <a
            href="#events-hub-section"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px', textDecoration: 'none' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Flame size={15} color="#596EE6" /> All Events Hub
          </a>

          <a
            href="#tracks-section"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px', textDecoration: 'none' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Trophy size={15} color="#596EE6" /> Tracks & Prizes
          </a>

          <a
            href="#schedule-section"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px', textDecoration: 'none' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Clock size={15} color="#596EE6" /> Event Timeline
          </a>

          <a
            href="#lookup-section"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px', textDecoration: 'none' }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <Ticket size={15} color="#596EE6" /> Digital Pass Lookup
          </a>

          {user && (
            <>
              {['admin', 'super_admin', 'event_head', 'root_owner'].includes(user?.role) && (
                <button
                  className={`btn btn-sm ${currentView === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
                  onClick={() => handleNavClick('dashboard')}
                >
                  <LayoutDashboard size={15} /> Operations Dashboard
                </button>
              )}
              <button
                className={`btn btn-sm ${currentView === 'scanner' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px' }}
                onClick={() => handleNavClick('scanner')}
              >
                <QrCode size={15} /> Gate Scanner Terminal
              </button>

              <button
                className="btn btn-danger btn-sm"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px', marginTop: '6px' }}
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut size={15} /> Sign Out ({user.name})
              </button>
            </>
          )}

          {!user && (
            <button
              className={`btn btn-sm ${currentView === 'login' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px', marginTop: '4px' }}
              onClick={() => handleNavClick('login')}
            >
              <Lock size={15} /> Staff / Admin Sign In
            </button>
          )}
        </div>
      )}
    </div>
  );
};
