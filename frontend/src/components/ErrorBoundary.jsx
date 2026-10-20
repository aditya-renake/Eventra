/**
 * ============================================================================
 * REACT RUNTIME ERROR BOUNDARY (ErrorBoundary.jsx)
 * ============================================================================
 * Purpose:
 *   Catches unhandled runtime exceptions in descendant React component trees,
 *   logs errors to console, and presents a branded recovery interface with
 *   options to reload or clear corrupted cache/storage state.
 * ============================================================================
 */

import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#06080e',
          color: '#ffffff',
          padding: '20px',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            maxWidth: '500px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(178, 43, 47, 0.5)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Application Recovery</h2>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px' }}>
              The portal encountered an unexpected state. Click below to reload cleanly.
            </p>

            {this.state.error && (
              <details style={{ textAlign: 'left', marginBottom: '20px', background: 'rgba(0, 0, 0, 0.4)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <summary style={{ cursor: 'pointer', color: '#f87171', fontSize: '12px', fontWeight: '700' }}>
                  Error Details: {this.state.error.message || String(this.state.error)}
                </summary>
                <pre style={{ marginTop: '10px', fontSize: '11px', color: '#94a3b8', whiteSpace: 'pre-wrap', maxHeight: '160px', overflowY: 'auto', fontFamily: 'monospace' }}>
                  {this.state.error.stack || this.state.error.toString()}
                </pre>
              </details>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => {
                  window.location.hash = '';
                  window.location.reload();
                }}
                style={{
                  background: 'linear-gradient(135deg, #b22b2f 0%, #7a1518 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Reload Portal
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = '/';
                }}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  color: '#f7d070',
                  border: '1px solid rgba(255,255,255,0.2)',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Reset Session & Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
