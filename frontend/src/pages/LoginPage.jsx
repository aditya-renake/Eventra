/**
 * ============================================================================
 * ORGANIZER & STAFF LOGIN PORTAL (LoginPage.jsx)
 * ============================================================================
 * Purpose:
 *   Secure login portal providing authentication for event organizers, super
 *   admins, and gate check-in volunteers.
 *
 * Key Capabilities:
 *   - Authenticates against backend using Supabase Auth or staff table credentials.
 *   - Automatically stores active JWT token and role payload in local storage.
 *   - Provides visual status indicators, toast notifications, and role-based redirects.
 * ============================================================================
 */

import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export const LoginPage = ({ onLoginSuccess, onShowToast }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    try {
      setIsLoading(true);
      const data = await api.auth.login(identifier, password);
      onShowToast({
        type: 'success',
        title: 'Authentication Verified! ⚡',
        message: `Welcome back, ${data.user.name}`,
      });
      onLoginSuccess(data.user);
    } catch (err) {
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

  return (
    <div style={{ maxWidth: '440px', margin: '60px auto', padding: '0 20px' }}>
      <div className="glass-card login-card" style={{ padding: '36px 30px' }}>
        
        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="login-icon" style={{ width: '48px', height: '48px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', margin: '0 auto 12px auto' }}>
            <Lock size={22} strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>Operations portal</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>ACES · Dr. D. Y. Patil Institute of Technology</p>
        </div>

        {/* Inline Error Alert */}
        {errorMessage && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '12px 14px', color: '#fca5a5', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-control"
                placeholder="Enter your username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                style={{ paddingLeft: '38px' }}
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
            {isLoading ? 'Verifying...' : 'Sign In to Operations'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dim)', marginTop: '24px', textAlign: 'center' }}>
          <ShieldCheck size={14} color="#22c55e" />
          <span>Secure staff access</span>
        </div>

      </div>
    </div>
  );
};
