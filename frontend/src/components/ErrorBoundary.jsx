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
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '20px' }}>
              The portal encountered an unexpected state. Click below to reload cleanly.
            </p>
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
