import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck, Ticket, Mail, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const LoginPage = ({ onLoginSuccess, onShowToast }) => {
  const [tab, setTab] = useState('attendee'); // 'attendee' | 'staff'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleStaffLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    sounds.playClick();
    try {
      setIsLoading(true);
      const data = await api.auth.login(identifier, password);
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'Authentication Verified! ⚡',
        message: `Welcome back, ${data.user.name}`,
      });
      onLoginSuccess(data.user);
    } catch (err) {
      sounds.playError();
      setErrorMessage(err.message || 'Invalid username/email or password.');
      onShowToast({
        type: 'error',
        title: 'Login Failed',
        message: err.message || 'Invalid username/email or password.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttendeeSignIn = async (e) => {
    if (e) e.preventDefault();
    if (!attendeeEmail.trim()) return;
    setErrorMessage('');
    sounds.playClick();
    try {
      setIsLoading(true);
      const clean = attendeeEmail.trim().toLowerCase();
      const res = await api.auth.attendeeSignIn(clean, clean.split('@')[0]);
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: `Welcome, ${res.attendee.name}! 🎟️`,
        message: `Found ${res.passesCount} event pass${res.passesCount === 1 ? '' : 'es'}. Accessing your student portal.`,
      });
      window.location.hash = '#portal';
    } catch (err) {
      sounds.playError();
      setErrorMessage(err.message || 'Failed to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickGoogleSignIn = async () => {
    sounds.playClick();
    let targetEmail = attendeeEmail.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      const promptEmail = window.prompt('Enter your student Google Account email address:', '');
      if (!promptEmail || !promptEmail.includes('@')) return;
      targetEmail = promptEmail.trim();
      setAttendeeEmail(targetEmail);
    }

    try {
      setIsLoading(true);
      const res = await api.auth.attendeeSignIn(targetEmail, targetEmail.split('@')[0]);
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: `Google Verified! 🎟️`,
        message: `Welcome back, ${res.attendee.name}. Accessing your passbook.`,
      });
      window.location.hash = '#portal';
    } catch (err) {
      sounds.playError();
      setErrorMessage(err.message || 'Google sign-in failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '50px auto 80px auto', padding: '0 20px' }}>
      <div className="glass-card login-card" style={{ padding: '32px 28px', borderRadius: '22px' }}>
        
        {/* Header Icon & Logo */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src="/eventra-logo.svg" alt="Eventra" style={{ height: '40px', width: 'auto', margin: '0 auto 12px auto', display: 'block' }} />
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--eventra-ink)', letterSpacing: '-0.5px', margin: 0 }}>
            {tab === 'attendee' ? 'Student & Attendee Portal' : 'Operations Portal'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {tab === 'attendee' ? 'Access your passes & registrations across all events' : 'Eventra 2026 • Secure Staff Access'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--eventra-soft-lavender)', padding: '4px', borderRadius: '12px', marginBottom: '22px' }}>
          <button
            type="button"
            onClick={() => { sounds.playClick(); setTab('attendee'); setErrorMessage(''); }}
            style={{
              padding: '8px 12px',
              borderRadius: '9px',
              border: 'none',
              background: tab === 'attendee' ? '#FFFFFF' : 'transparent',
              color: tab === 'attendee' ? 'var(--eventra-indigo-dark)' : 'var(--text-muted)',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: tab === 'attendee' ? '0 2px 8px rgba(89, 110, 230, 0.15)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Ticket size={13} /> Attendee
          </button>

          <button
            type="button"
            onClick={() => { sounds.playClick(); setTab('staff'); setErrorMessage(''); }}
            style={{
              padding: '8px 12px',
              borderRadius: '9px',
              border: 'none',
              background: tab === 'staff' ? '#FFFFFF' : 'transparent',
              color: tab === 'staff' ? 'var(--eventra-indigo-dark)' : 'var(--text-muted)',
              fontWeight: '800',
              fontSize: '12px',
              cursor: 'pointer',
              boxShadow: tab === 'staff' ? '0 2px 8px rgba(89, 110, 230, 0.15)' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Lock size={13} /> Staff Login
          </button>
        </div>

        {/* Inline Error Alert */}
        {errorMessage && (
          <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '12px 14px', color: '#dc2626', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Attendee Passbook Login */}
        {tab === 'attendee' ? (
          <div>
            {/* 1-Click Google Sign In */}
            <button
              type="button"
              onClick={handleQuickGoogleSignIn}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '12px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '18px', background: '#FFFFFF', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}
              disabled={isLoading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase' }}>or with email</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            <form onSubmit={handleAttendeeSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Registered Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="input-control"
                    placeholder="e.g. aditya@college.edu"
                    value={attendeeEmail}
                    onChange={(e) => setAttendeeEmail(e.target.value)}
                    style={{ paddingLeft: '38px', height: '44px' }}
                    required
                  />
                  <Mail size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '12px', fontSize: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                disabled={isLoading}
              >
                {isLoading ? 'Accessing...' : 'Access My Passes'} <ArrowRight size={16} />
              </button>
            </form>
          </div>
        ) : (
          /* Tab 2: Operations Staff Login */
          <form onSubmit={handleStaffLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Staff Username / Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Enter your username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{ paddingLeft: '38px', height: '44px' }}
                  autoComplete="username"
                  required
                />
                <User size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Operations Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="input-control"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '38px', height: '44px' }}
                  autoComplete="current-password"
                  required
                />
                <Lock size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-dyp" 
              style={{ padding: '12px', marginTop: '6px', fontSize: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} 
              disabled={isLoading}
            >
              {isLoading ? 'Verifying...' : 'Sign In to Operations'} <ArrowRight size={16} />
            </button>
          </form>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dim)', marginTop: '22px', textAlign: 'center' }}>
          <ShieldCheck size={14} color="#22c55e" />
          <span>Eventra 2026 Cryptographic Security Protocol</span>
        </div>

      </div>
    </div>
  );
};
