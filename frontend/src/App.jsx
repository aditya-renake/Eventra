import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { InteractiveBackground } from './components/InteractiveBackground';
import { EventLandingPage } from './pages/EventLandingPage';
import { DigitalPassPage } from './pages/DigitalPassPage';
import { DashboardPage } from './pages/DashboardPage';
import { ScannerPage } from './pages/ScannerPage';
import { LoginPage } from './pages/LoginPage';
import { api } from './services/api';
import { CheckCircle2, AlertTriangle, Info, XCircle, Instagram, Github } from 'lucide-react';

export function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [activePassId, setActivePassId] = useState(null);
  const [user, setUser] = useState(() => api.auth.getUser());
  const [toasts, setToasts] = useState([]);

  // Check URL pathname & hash on initial load and on hashchange
  useEffect(() => {
    const syncRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const existingUser = api.auth.getUser();
      const isAuth = api.auth.isAuthenticated();

      if (existingUser && isAuth) {
        setUser(existingUser);
      }

      if (path.startsWith('/pass/')) {
        const id = window.location.pathname.split('/pass/')[1];
        if (id) {
          setActivePassId(id);
          setCurrentView('pass');
          return;
        }
      }

      if (path === '/dashboard' || hash === '#dashboard' || hash === '#/dashboard') {
        if (existingUser && isAuth) {
          setCurrentView('dashboard');
        } else {
          setCurrentView('login');
        }
      } else if (path === '/scanner' || hash === '#scanner' || hash === '#/scanner') {
        if (existingUser && isAuth) {
          setCurrentView('scanner');
        } else {
          setCurrentView('login');
        }
      } else if (path === '/login' || hash === '#login' || hash === '#/login') {
        if (existingUser && isAuth) {
          const isDashboardRole = ['admin', 'super_admin', 'event_head', 'root_owner'].includes(existingUser?.role);
          setCurrentView(isDashboardRole ? 'dashboard' : 'scanner');
        } else {
          setCurrentView('login');
        }
      } else if (path === '/' && (!hash || hash === '#' || hash === '#/')) {
        setCurrentView('landing');
      }
    };

    syncRoute();
    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);

    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  const handleShowToast = ({ type = 'info', title, message }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
    window.location.hash = '';
    setCurrentView('landing');
    handleShowToast({
      type: 'info',
      title: 'Logged Out',
      message: 'You have been signed out of operations console.',
    });
  };

  const handleNavigateToPass = (uniqueId) => {
    setActivePassId(uniqueId);
    window.history.pushState({}, '', `/pass/${uniqueId}`);
    setCurrentView('pass');
  };

  const handleBackToLanding = () => {
    window.history.pushState({}, '', '/');
    window.location.hash = '';
    setActivePassId(null);
    setCurrentView('landing');
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    const isDashboardRole = ['admin', 'super_admin', 'event_head', 'root_owner'].includes(loggedInUser?.role);
    const target = isDashboardRole ? 'dashboard' : 'scanner';
    window.location.hash = `#${target}`;
    setCurrentView(target);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* High-Impact Interactive Ambient Floating Background Everywhere */}
      <InteractiveBackground />
      
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          if (view === 'landing') {
            window.history.pushState({}, '', '/');
            window.location.hash = '';
          } else {
            window.location.hash = `#${view}`;
          }
          setCurrentView(view);
        }}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {currentView === 'landing' && (
          <EventLandingPage
            onNavigateToPass={handleNavigateToPass}
            onShowToast={handleShowToast}
          />
        )}

        {currentView === 'pass' && activePassId && (
          <DigitalPassPage
            uniqueId={activePassId}
            onBack={handleBackToLanding}
            onShowToast={handleShowToast}
          />
        )}

        {currentView === 'dashboard' && (
          user ? (
            <DashboardPage
              onShowToast={handleShowToast}
              onNavigateToScanner={() => {
                window.location.hash = '#scanner';
                setCurrentView('scanner');
              }}
            />
          ) : (
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              onShowToast={handleShowToast}
            />
          )
        )}

        {currentView === 'scanner' && (
          user ? (
            <ScannerPage onShowToast={handleShowToast} />
          ) : (
            <LoginPage
              onLoginSuccess={handleLoginSuccess}
              onShowToast={handleShowToast}
            />
          )
        )}

        {currentView === 'login' && (
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
            onShowToast={handleShowToast}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={{ background: '#030712', borderTop: '1px solid var(--border-subtle)', padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span>© 2026 <strong>HackSeries</strong> • Lead Operations:</span>
            
            {/* Aditya Renake */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ color: '#ffffff' }}>Aditya Renake</strong>
              <a 
                href="https://instagram.com/where.aditya" 
                target="_blank" 
                rel="noreferrer" 
                title="Instagram: @where.aditya"
                style={{
                  color: '#e1306c',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(225, 48, 108, 0.12)',
                  border: '1px solid rgba(225, 48, 108, 0.25)',
                  padding: '3px',
                  borderRadius: '5px',
                  textDecoration: 'none'
                }}
              >
                <Instagram size={12} />
              </a>
              <a 
                href="https://github.com/aditya-renake" 
                target="_blank" 
                rel="noreferrer" 
                title="GitHub: @aditya-renake"
                style={{
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '3px',
                  borderRadius: '5px',
                  textDecoration: 'none'
                }}
              >
                <Github size={12} />
              </a>
            </div>

          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            <span>🔒 Zero-Forgery HMAC Engine</span>
            <span>⚡ Google Forms Sync</span>
            <span>📱 In-Browser Camera Scanner</span>
          </div>
        </div>
      </footer>

      {/* Global Toast Notification System */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast"
            style={{
              borderLeft: `4px solid ${
                t.type === 'success'
                  ? '#22c55e'
                  : t.type === 'error'
                  ? '#ef4444'
                  : t.type === 'warning'
                  ? '#f59e0b'
                  : '#06b6d4'
              }`,
            }}
          >
            {t.type === 'success' && <CheckCircle2 size={20} color="#22c55e" />}
            {t.type === 'error' && <XCircle size={20} color="#ef4444" />}
            {t.type === 'warning' && <AlertTriangle size={20} color="#f59e0b" />}
            {t.type === 'info' && <Info size={20} color="#06b6d4" />}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>{t.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.message}</div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
