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

  const fillCredentials = (user, pass) => {
    setIdentifier(user);
    setPassword(pass);
    setErrorMessage('');
  };

  return (
    <div style={{ maxWidth: '440px', margin: '60px auto', padding: '0 20px' }}>
      <div className="glass-card" style={{ padding: '36px 30px', border: '1px solid rgba(209, 165, 80, 0.4)', background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(3, 7, 18, 0.95) 100%)' }}>
        
        {/* Header Icon */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #b22b2f 0%, #7a1518 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', margin: '0 auto 12px auto', border: '1px solid rgba(247, 208, 112, 0.4)', boxShadow: '0 0 20px rgba(178, 43, 47, 0.4)' }}>
            <Lock size={22} strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>Admin & Scanner Portal</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>ACES • Dr. D. Y. Patil Institute of Technology (DYPDPU)</p>
        </div>

        {/* Inline Error Alert */}
        {errorMessage && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '12px 14px', color: '#fca5a5', fontSize: '13px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚠️ {errorMessage}</span>
          </div>
        )}

        {/* Quick Admin Credential Shortcuts */}
        <div style={{ marginBottom: '18px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ fontSize: '11px', color: '#f7d070', fontWeight: '800', marginBottom: '6px', textTransform: 'uppercase' }}>
            ⚡ 1-Click Fill Official Logins:
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => fillCredentials('adityarenake', 'Aditya@11')}
              style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(178, 43, 47, 0.2)', border: '1px solid rgba(178, 43, 47, 0.4)', color: '#ffffff', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
            >
              Aditya
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('sohamchitnis', 'Soham@11')}
              style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(209, 165, 80, 0.2)', border: '1px solid rgba(209, 165, 80, 0.4)', color: '#f7d070', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
            >
              Soham
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('haritirawal', 'Hariti@11')}
              style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#4ade80', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
            >
              Hariti
            </button>
            <button
              type="button"
              onClick={() => fillCredentials('gate_scanner_1', 'Scanner@11')}
              style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.2)', border: '1px solid rgba(6, 182, 212, 0.4)', color: '#67e8f9', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
            >
              Gate Scanner
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Username or Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-control"
                placeholder="Enter username or email"
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
          <span>Secured with JWT + HMAC Cryptographic Authority</span>
        </div>

      </div>
    </div>
  );
};
