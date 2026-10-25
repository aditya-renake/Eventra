import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck, Ticket, Mail, Sparkles, UserPlus, LogIn, Building2, Phone } from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const LoginPage = ({ onLoginSuccess, onShowToast }) => {
  const [tab, setTab] = useState('attendee'); // 'attendee' | 'staff'
  const [attendeeMode, setAttendeeMode] = useState('login'); // 'login' | 'register' | 'quick-lookup'

  // Staff credentials
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Attendee registration fields
  const [attendeeName, setAttendeeName] = useState('');
  const [attendeeUsername, setAttendeeUsername] = useState('');
  const [attendeeEmail, setAttendeeEmail] = useState('');
  const [attendeePassword, setAttendeePassword] = useState('');
  const [attendeeInstitution, setAttendeeInstitution] = useState('');
  const [attendeePhone, setAttendeePhone] = useState('');

  // Attendee login fields
  const [attendeeLoginId, setAttendeeLoginId] = useState('');
  const [attendeeLoginPassword, setAttendeeLoginPassword] = useState('');

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

  const handleAttendeeRegister = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    sounds.playClick();

    if (!attendeeName.trim() || !attendeeUsername.trim() || !attendeeEmail.trim() || !attendeePassword.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.auth.attendeeRegister({
        name: attendeeName,
        username: attendeeUsername,
        email: attendeeEmail,
        password: attendeePassword,
        institution: attendeeInstitution,
        phone: attendeePhone,
      });

      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: `Welcome to Eventra, ${res.user.name}! 🚀`,
        message: `Your student account has been created. Redirecting to your passbook...`,
      });

      setTimeout(() => {
        window.location.hash = '#portal';
      }, 500);
    } catch (err) {
      sounds.playError();
      setErrorMessage(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttendeeLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    sounds.playClick();

    if (!attendeeLoginId.trim() || !attendeeLoginPassword.trim()) {
      setErrorMessage('Username/Email and password are required.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.auth.attendeeLogin(attendeeLoginId.trim(), attendeeLoginPassword.trim());
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: `Welcome back, ${res.user.name}! 🎟️`,
        message: `Found ${res.passesCount} event pass${res.passesCount === 1 ? '' : 'es'}. Accessing your portal...`,
      });

      setTimeout(() => {
        window.location.hash = '#portal';
      }, 500);
    } catch (err) {
      sounds.playError();
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickEmailLookup = async (e) => {
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
        message: `Found ${res.passesCount} event pass${res.passesCount === 1 ? '' : 'es'}. Accessing your passbook.`,
      });
      window.location.hash = '#portal';
    } catch (err) {
      sounds.playError();
      setErrorMessage(err.message || 'Failed to lookup passbook.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '460px', margin: '40px auto 80px auto', padding: '0 20px' }}>
      <div className="glass-card login-card" style={{ padding: '32px 28px', borderRadius: '22px' }}>
        
        {/* Header Icon & Logo */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src="/eventra-logo.svg" alt="Eventra" style={{ height: '40px', width: 'auto', margin: '0 auto 12px auto', display: 'block' }} />
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--eventra-ink)', letterSpacing: '-0.5px', margin: 0 }}>
            {tab === 'attendee' 
              ? (attendeeMode === 'register' ? 'Create Student Account' : 'Student & Attendee Portal') 
              : 'Operations Portal'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {tab === 'attendee'
              ? (attendeeMode === 'register' 
                  ? 'Register once to unlock 1-click event passes & smart pre-fill' 
                  : 'Access your passes & registrations across all events')
              : 'Eventra 2026 • Secure Staff Access'}
          </p>
        </div>

        {/* Tab Switcher: Attendee vs Staff */}
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

        {/* Tab 1: Attendee Passbook Login & Registration */}
        {tab === 'attendee' ? (
          <div>
            
            {/* Sub-mode selector (Login vs Register vs Quick Email) */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <button
                type="button"
                onClick={() => { sounds.playClick(); setAttendeeMode('login'); setErrorMessage(''); }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: attendeeMode === 'login' ? 'var(--eventra-indigo, #596EE6)' : 'rgba(89, 110, 230, 0.08)',
                  color: attendeeMode === 'login' ? '#ffffff' : 'var(--eventra-indigo, #596EE6)',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <LogIn size={13} /> Sign In
              </button>

              <button
                type="button"
                onClick={() => { sounds.playClick(); setAttendeeMode('register'); setErrorMessage(''); }}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: 'none',
                  background: attendeeMode === 'register' ? 'var(--eventra-indigo, #596EE6)' : 'rgba(89, 110, 230, 0.08)',
                  color: attendeeMode === 'register' ? '#ffffff' : 'var(--eventra-indigo, #596EE6)',
                  fontWeight: '700',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <UserPlus size={13} /> Create Account
              </button>
            </div>

            {/* Mode A: Attendee Sign In (Username/Email + Password) */}
            {attendeeMode === 'login' && (
              <form onSubmit={handleAttendeeLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Student Username or Email
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="e.g. adityarenake or you@college.edu"
                      value={attendeeLoginId}
                      onChange={(e) => setAttendeeLoginId(e.target.value)}
                      style={{ paddingLeft: '38px', height: '44px' }}
                      autoComplete="username"
                      required
                    />
                    <User size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      className="input-control"
                      placeholder="••••••••"
                      value={attendeeLoginPassword}
                      onChange={(e) => setAttendeeLoginPassword(e.target.value)}
                      style={{ paddingLeft: '38px', height: '44px' }}
                      autoComplete="current-password"
                      required
                    />
                    <Lock size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '12px', fontSize: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing In...' : 'Sign In to Passbook'} <ArrowRight size={16} />
                </button>

                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => { sounds.playClick(); setAttendeeMode('quick-lookup'); setErrorMessage(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--eventra-indigo, #596EE6)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Quick Lookup by Email (No password required)
                  </button>
                </div>
              </form>
            )}

            {/* Mode B: Attendee Account Registration */}
            {attendeeMode === 'register' && (
              <form onSubmit={handleAttendeeRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Full Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="Aditya Renake"
                      value={attendeeName}
                      onChange={(e) => setAttendeeName(e.target.value)}
                      style={{ paddingLeft: '36px', height: '42px', fontSize: '13px' }}
                      required
                    />
                    <User size={15} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Username *
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="aditya_26"
                      value={attendeeUsername}
                      onChange={(e) => setAttendeeUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                      style={{ height: '42px', fontSize: '13px' }}
                      autoComplete="username"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Phone (WhatsApp)
                    </label>
                    <input
                      type="tel"
                      className="input-control"
                      placeholder="+91 9890829874"
                      value={attendeePhone}
                      onChange={(e) => setAttendeePhone(e.target.value)}
                      style={{ height: '42px', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Email Address *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      className="input-control"
                      placeholder="aditya@college.edu"
                      value={attendeeEmail}
                      onChange={(e) => setAttendeeEmail(e.target.value)}
                      style={{ paddingLeft: '36px', height: '42px', fontSize: '13px' }}
                      autoComplete="email"
                      required
                    />
                    <Mail size={15} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Create Password *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      className="input-control"
                      placeholder="At least 6 characters"
                      value={attendeePassword}
                      onChange={(e) => setAttendeePassword(e.target.value)}
                      style={{ paddingLeft: '36px', height: '42px', fontSize: '13px' }}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                    <Lock size={15} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    College / Institution
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="input-control"
                      placeholder="Dr. D. Y. Patil Institute of Technology (DYPDPU)"
                      value={attendeeInstitution}
                      onChange={(e) => setAttendeeInstitution(e.target.value)}
                      style={{ paddingLeft: '36px', height: '42px', fontSize: '13px' }}
                    />
                    <Building2 size={15} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '12px', fontSize: '14px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating Account...' : 'Create Student Account'} <UserPlus size={16} />
                </button>
              </form>
            )}

            {/* Mode C: Quick Email Lookup */}
            {attendeeMode === 'quick-lookup' && (
              <form onSubmit={handleQuickEmailLookup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ background: 'var(--eventra-soft-lavender, #EEF0FF)', border: '1px solid var(--eventra-soft-lavender-border, #DDE3FF)', borderRadius: '12px', padding: '12px 14px', fontSize: '12px', color: 'var(--eventra-ink)', lineHeight: '1.5' }}>
                  Already registered for an event? Enter your registered email address to view all your passes without a password.
                </div>

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

                <div style={{ textAlign: 'center', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => { sounds.playClick(); setAttendeeMode('login'); setErrorMessage(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--eventra-indigo, #596EE6)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Back to Account Sign In
                  </button>
                </div>
              </form>
            )}

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

