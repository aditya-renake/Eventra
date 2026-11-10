import React, { useState, useEffect, useLayoutEffect, lazy, Suspense, useCallback } from 'react';
import { SeatAvailability } from './services/seatAvailability';
import { EventChat } from './components/EventChat';
import { Navbar } from './components/Navbar';
import { InteractiveBackground } from './components/InteractiveBackground';
const EventLandingPage = lazy(() => import('./pages/EventLandingPage').then(module => ({ default: module.EventLandingPage })));
const EventDetailsPage = lazy(() => import('./pages/EventDetailsPage').then(module => ({ default: module.EventDetailsPage })));
const DigitalPassPage = lazy(() => import('./pages/DigitalPassPage').then(module => ({ default: module.DigitalPassPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const ScannerPage = lazy(() => import('./pages/ScannerPage').then(module => ({ default: module.ScannerPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const RegistrationPage = lazy(() => import('./pages/RegistrationPage').then(module => ({ default: module.RegistrationPage })));
const AttendeePortalPage = lazy(() => import('./pages/AttendeePortalPage').then(module => ({ default: module.AttendeePortalPage })));
import { api } from './services/api';
import { CheckCircle2, AlertTriangle, Info, XCircle, Instagram, Github, ArrowUp } from 'lucide-react';

const REVEAL_SELECTOR = '.event-hero, .event-proof-strip, #about-section, #lookup-section, #events-hub-section, .event-card-item, .event-details-reveal';

export function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [activePassId, setActivePassId] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [user, setUser] = useState(() => api.auth.getUser());
  const [registrationContext, setRegistrationContext] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Monitor scroll for Back-to-Top button & progressive enhancement for scroll progress indicator
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);

      // Fallback for browsers that do not support native CSS animation-timeline: scroll()
      if (!window.CSS || !CSS.supports || !CSS.supports('animation-timeline', 'scroll()')) {
        const bar = document.getElementById('scroll-progress-bar');
        if (bar) {
          const scrollable = document.documentElement.scrollHeight - window.innerHeight;
          const scrolled = window.scrollY;
          const ratio = scrollable > 0 ? scrolled / scrollable : 0;
          bar.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Check URL pathname & hash on initial load and on hashchange
  useEffect(() => {
    const syncRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const rawHash = window.location.hash || '';
      const hash = rawHash.toLowerCase();
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

      if (path.startsWith('/event/')) {
        const evSlug = window.location.pathname.split('/event/')[1];
        if (evSlug) {
          setSelectedEventId(decodeURIComponent(evSlug));
          setCurrentView('event-details');
          return;
        }
      }

      if (hash.startsWith('#event/') || hash.startsWith('#/event/')) {
        const evSlug = rawHash.replace(/^#\/?event\//i, '').split('?')[0];
        if (evSlug && evSlug !== '[object object]') {
          setSelectedEventId(decodeURIComponent(evSlug));
        }
        setCurrentView('event-details');
        return;
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
      } else if (path === '/portal' || path === '/passes' || hash === '#portal' || hash === '#passes' || hash === '#my-passes' || hash === '#/portal' || hash === '#/passes') {
        setCurrentView('portal');
      } else if (path === '/register' || hash.startsWith('#register') || hash.startsWith('#/register')) {
        if (rawHash.includes('event=')) {
          const q = new URLSearchParams(rawHash.split('?')[1] || '').get('event');
          if (q && q.toLowerCase() !== '[object object]') {
            setSelectedEventId(q);
          }
        }
        setCurrentView('register');
      } else if (path !== '/' && !['/dashboard', '/scanner', '/login', '/register', '/portal', '/passes'].includes(path)) {
        // Support short share links like eventra.live/<slug>
        const cleanSlug = path.replace(/^\/+|\/+$/g, '');
        if (cleanSlug && !cleanSlug.includes('.')) {
          setSelectedEventId(decodeURIComponent(cleanSlug));
          setCurrentView('event-details');
        } else {
          setCurrentView('landing');
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

  useLayoutEffect(() => {
    if (!['landing', 'event-details'].includes(currentView)) return undefined;

    const root = document.querySelector(`.app-view-${currentView}`);
    if (!root) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      root.querySelectorAll(REVEAL_SELECTOR).forEach((element) => element.classList.add('is-visible'));
      return undefined;
    }

    const observed = new WeakSet();
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

    const registerRevealTargets = (node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const targets = [];
      if (node.matches(REVEAL_SELECTOR)) targets.push(node);
      targets.push(...node.querySelectorAll(REVEAL_SELECTOR));
      targets.forEach((target) => {
        if (observed.has(target)) return;
        observed.add(target);
        target.classList.add('reveal-on-scroll');
        revealObserver.observe(target);
      });
    };

    registerRevealTargets(root);
    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach(registerRevealTargets));
    });
    mutationObserver.observe(root, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      revealObserver.disconnect();
    };
  }, [currentView]);

  const handleShowToast = useCallback(({ type = 'info', title, message }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

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
    window.location.hash = selectedEventId ? `#event/${selectedEventId}` : '';
    setActivePassId(null);
    setCurrentView('landing');
  };

  const handleNavigateToRegister = (maybeEventId) => {
    const cleanId = typeof maybeEventId === 'string' && maybeEventId !== '[object Object]'
      ? maybeEventId
      : selectedEventId;
    if (cleanId) {
      setSelectedEventId(cleanId);
      window.location.hash = `#register?event=${encodeURIComponent(cleanId)}`;
    } else {
      window.location.hash = '#register';
    }
    setCurrentView('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectEvent = (eventOrId) => {
    const id = typeof eventOrId === 'string' ? eventOrId : (eventOrId?.id || eventOrId?.eventId || eventOrId?.slug);
    if (id) {
      setSelectedEventId(id);
      window.location.hash = `#event/${encodeURIComponent(id)}`;
      setCurrentView('landing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    const isDashboardRole = ['admin', 'super_admin', 'event_head', 'root_owner'].includes(loggedInUser?.role);
    const target = isDashboardRole ? 'dashboard' : 'scanner';
    window.location.hash = `#${target}`;
    setCurrentView(target);
  };

  return (
    <div className={`app-theme-light ${currentView === 'register' ? 'app-registration-light' : ''}`} style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Dynamic Scroll Progress Bar with Native Scroll-Driven Animation & Fallback */}
      <div id="scroll-progress-bar" className="scroll-progress-bar" aria-hidden="true" />

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
      <SeatAvailability>
      <main key={currentView} className={`app-view app-view-${currentView}`} style={{ flex: 1 }}>
        <Suspense fallback={<div role="status" style={{ padding: '64px', textAlign: 'center' }}>Loading page…</div>}>
        {currentView === 'landing' && (
          <EventLandingPage
            selectedEventId={selectedEventId}
            onSelectEvent={handleSelectEvent}
            onNavigateToPass={handleNavigateToPass}
            onNavigateToRegister={handleNavigateToRegister}
            onShowToast={handleShowToast}
          />
        )}

        {currentView === 'event-details' && (
          <EventDetailsPage
            eventId={selectedEventId}
            onBackToHome={handleBackToLanding}
            onNavigateToRegister={handleNavigateToRegister}
            onShowToast={handleShowToast}
          />
        )}

        {currentView === 'register' && (
          <RegistrationPage
            onChatContext={setRegistrationContext}
            selectedEventId={selectedEventId}
            onRegistrationSuccess={(passId) => {
              handleNavigateToPass(passId);
            }}
            onBackToLanding={handleBackToLanding}
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

        {currentView === 'portal' && (
          <AttendeePortalPage
            onNavigateToPass={handleNavigateToPass}
            onNavigateToRegister={handleNavigateToRegister}
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
              onViewLiveEvent={(evId) => {
                handleSelectEvent(evId);
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
        </Suspense>
      </main>
      </SeatAvailability>
      <EventChat page={currentView} eventId={currentView === 'event-details' ? selectedEventId : undefined}
        registration={currentView === 'register' ? registrationContext : null} />

      {/* Footer */}
      <footer style={{ background: '#030712', borderTop: '1px solid var(--border-subtle)', padding: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-dim)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span>© 2026 <strong>Eventra</strong> • Lead Operations:</span>
            
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
            <span>⚡ Native In-App Intake</span>
            <span>📱 In-Browser Camera Scanner</span>
          </div>
        </div>
      </footer>

      {/* Floating Smooth Scroll-to-Top Button */}
      <button
        type="button"
        className={`back-to-top-btn ${showScrollTop ? 'is-active' : ''}`}
        onClick={handleScrollToTop}
        title="Scroll back to top"
        aria-label="Scroll back to top"
      >
        <ArrowUp size={18} strokeWidth={2.5} />
      </button>

      {/* Global Toast Notification System */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
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
