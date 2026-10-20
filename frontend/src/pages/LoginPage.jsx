/**
 * ============================================================================
 * ORGANIZER & OWNER AUTHENTICATION PORTAL (LoginPage.jsx)
 * ============================================================================
 * Purpose:
 *   Secure login portal providing authentication for event organizers, root owners,
 *   and gate check-in volunteers.
 *
 * Key Capabilities:
 *   - Enforces login only through registered email address.
 *   - Displays the authenticated username / identity upon login.
 *   - 'Wanna register as an Owner?' onboarding flow requiring master secret passcode
 *     (`K8!vR3@pZ6#n`) to provision root owner privileges in Supabase Auth.
 * ============================================================================
 */

import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Crown, Key, Sparkles, UserCheck } from 'lucide-react';
import { api } from '../services/api';

export const LoginPage = ({ onLoginSuccess, onShowToast }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'register_owner'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerSecret, setOwnerSecret] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorCode, setErrorCode] = useState('');

  // Handle Standard Login (Email or Username)
  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setErrorCode('');

    const cleanInput = email.trim();
    if (!cleanInput) {
      const msg = 'Please enter your registered email address or username.';
      setErrorMessage(msg);
      setErrorCode('INVALID_EMAIL');
      onShowToast({ type: 'warning', title: 'Input Required', message: msg });
      return;
    }

    try {
      setIsLoading(true);
      const data = await api.auth.login(cleanInput, password);
      const displayName = data.user.username || data.user.name || cleanInput;
      onShowToast({
        type: 'success',
        title: 'Authentication Verified! ⚡',
        message: `Welcome back, ${displayName}`,
      });
      onLoginSuccess(data.user);
    } catch (err) {
      const msg = err.message || 'Invalid email address or password.';
      setErrorMessage(msg);
      setErrorCode(err.code || '');
      onShowToast({
        type: 'error',
        title: err.code === 'USER_NOT_REGISTERED' ? 'Account Not Registered' : 'Authentication Failed',
        message: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Owner Registration with Passcode
  const handleRegisterOwner = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');

    const cleanUsername = name.trim();
    if (!cleanUsername) {
      const msg = 'Please enter your desired username / display name.';
      setErrorMessage(msg);
      onShowToast({ type: 'warning', title: 'Username Required', message: msg });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) {
      const msg = 'Please enter a valid email address.';
      setErrorMessage(msg);
      onShowToast({ type: 'warning', title: 'Valid Email Required', message: msg });
      return;
    }
    if (!password || password.length < 6) {
      const msg = 'Password must be at least 6 characters.';
      setErrorMessage(msg);
      onShowToast({ type: 'warning', title: 'Password Too Short', message: msg });
      return;
    }
    if (!ownerSecret.trim()) {
      const msg = 'Please provide the Master Owner Passcode.';
      setErrorMessage(msg);
      onShowToast({ type: 'warning', title: 'Passcode Required', message: msg });
      return;
    }

    try {
      setIsLoading(true);
      const data = await api.auth.registerOwner(cleanEmail, password, ownerSecret.trim(), cleanUsername);
      const displayName = data.user.username || data.user.name || cleanEmail.split('@')[0];
      onShowToast({
        type: 'success',
        title: '👑 Owner Access Activated!',
        message: `Welcome, ${displayName}! You are registered as an Event Owner.`,
      });
      onLoginSuccess(data.user);
    } catch (err) {
      const msg = err.message || 'Owner registration failed. Check secret passcode.';
      setErrorMessage(msg);
      onShowToast({
        type: 'error',
        title: 'Registration Denied',
        message: msg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '50px auto', padding: '0 20px' }}>
      <div className="glass-card login-card" style={{ padding: '36px 30px', position: 'relative' }}>
        
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div 
            className="login-icon" 
            style={{ 
              width: '52px', 
              height: '52px', 
              borderRadius: '16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#ffffff', 
              margin: '0 auto 14px auto',
              background: mode === 'register_owner' ? 'linear-gradient(135deg, #b22b2f 0%, #f59e0b 100%)' : undefined,
              boxShadow: mode === 'register_owner' ? '0 0 20px rgba(245, 158, 11, 0.4)' : undefined,
            }}
          >
            {mode === 'register_owner' ? <Crown size={26} color="#ffffff" strokeWidth={2.3} /> : <Lock size={22} strokeWidth={2.5} />}
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>
            {mode === 'register_owner' ? 'Register as Event Owner' : 'Operations Portal'}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {mode === 'register_owner' 
              ? 'Elevated access for Event Leads & Root Organizers'
              : 'ACES · Dr. D. Y. Patil Institute of Technology'}
          </p>
        </div>

        {/* Inline Error Alert with Direct Action Trigger */}
        {errorMessage && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '12px 14px', color: '#fca5a5', fontSize: '13px', marginBottom: '18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ fontSize: '15px' }}>⚠️</span>
              <span style={{ lineHeight: '1.4' }}>{errorMessage}</span>
            </div>
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => {
                  setErrorMessage('');
                  setErrorCode('');
                  setMode('register_owner');
                }}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '2px',
                  background: 'rgba(247, 208, 112, 0.18)',
                  border: '1px solid rgba(247, 208, 112, 0.4)',
                  color: '#f7d070',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Crown size={12} color="#f7d070" />
                <span>{errorCode === 'USER_NOT_REGISTERED' ? 'Register Now as Owner' : 'Reset / Set Password with Owner Passcode'}</span>
              </button>
            )}
          </div>
        )}

        {/* ================================================================ */}
        {/* MODE 1: STANDARD OWNER / STAFF EMAIL LOGIN                       */}
        {/* ================================================================ */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Owner Email Address or Username
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Enter email or username (e.g. adityarenake)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  autoComplete="username"
                  required
                />
                <Mail size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
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
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '38px' }}
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
              {isLoading ? 'Authenticating...' : 'Sign In to Operations'} <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          /* ================================================================ */
          /* MODE 2: REGISTER AS EVENT OWNER (3 OPTIONS: EMAIL, PWD, SECRET)  */
          /* ================================================================ */
          <form onSubmit={handleRegisterOwner} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Option 1: Desired Username */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#f7d070', textTransform: 'uppercase', marginBottom: '6px' }}>
                1. Desired Owner Username
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="input-control"
                  placeholder="Enter your name / username (e.g. Raj Singh)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '38px', borderColor: 'rgba(247, 208, 112, 0.4)' }}
                  autoComplete="name"
                  required
                />
                <UserCheck size={16} color="#f7d070" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                Will be displayed as your identity on the Operations Dashboard.
              </span>
            </div>

            {/* Option 2: Email */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#f7d070', textTransform: 'uppercase', marginBottom: '6px' }}>
                2. Owner Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="input-control"
                  placeholder="Enter your email (e.g. lead@dyp.edu)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '38px', borderColor: 'rgba(247, 208, 112, 0.4)' }}
                  autoComplete="email"
                  required
                />
                <Mail size={16} color="#f7d070" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* Option 3: Desired Password */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#f7d070', textTransform: 'uppercase', marginBottom: '6px' }}>
                3. Set Account Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="input-control"
                  placeholder="Create your login password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  autoComplete="new-password"
                  required
                />
                <Lock size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
            </div>

            {/* Option 4: Master Owner Passcode */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#fca5a5', textTransform: 'uppercase', marginBottom: '6px' }}>
                4. Master Owner Secret Key
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="input-control"
                  placeholder="Enter secret passcode"
                  value={ownerSecret}
                  onChange={(e) => setOwnerSecret(e.target.value)}
                  style={{ paddingLeft: '38px', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                  required
                />
                <Key size={16} color="#ef4444" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                Required to verify root ownership credentials.
              </span>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ 
                padding: '12px', 
                marginTop: '8px', 
                fontSize: '14px', 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                background: 'linear-gradient(135deg, #b22b2f 0%, #d97706 100%)',
                boxShadow: '0 0 15px rgba(217, 119, 6, 0.35)',
                fontWeight: '800'
              }} 
              disabled={isLoading}
            >
              <Crown size={16} color="#f7d070" />
              <span>{isLoading ? 'Verifying & Activating...' : 'Activate & Register as Owner 👑'}</span>
            </button>
          </form>
        )}

        {/* Toggle Mode Switcher */}
        <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => {
                setErrorMessage('');
                setMode('register_owner');
              }}
              style={{
                background: 'rgba(247, 208, 112, 0.08)',
                border: '1px solid rgba(247, 208, 112, 0.3)',
                color: '#f7d070',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <Crown size={14} color="#f7d070" />
              <span>Wanna register as an Owner?</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setErrorMessage('');
                setMode('login');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#22d3ee',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
              }}
            >
              <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
              <span>Already an Owner? Sign In with Email</span>
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dim)', marginTop: '20px', textAlign: 'center' }}>
          <ShieldCheck size={14} color="#22c55e" />
          <span>Secure root owner verification</span>
        </div>

      </div>
    </div>
  );
};
