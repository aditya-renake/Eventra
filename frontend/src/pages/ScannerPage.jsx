import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  History, 
  RotateCcw, 
  User, 
  Users, 
  Volume2 
} from 'lucide-react';
import { QRScanner } from '../components/QRScanner';
import { api } from '../services/api';

export const ScannerPage = ({ onShowToast }) => {
  const [recentScans, setRecentScans] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRecentScans = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await api.checkin.getRecent();
      setRecentScans(res.data || []);
    } catch (err) {
      console.warn('Failed to load recent scans:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentScans();
  }, [fetchRecentScans]);

  const handleScanCompleted = (scanResponse) => {
    fetchRecentScans();
  };

  const handleUndo = async (item) => {
    try {
      await api.checkin.undo(item._id || item.uniqueId);
      onShowToast({
        type: 'info',
        title: 'Check-in Reverted',
        message: `Reverted check-in for ${item.name}`,
      });
      fetchRecentScans();
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Undo Failed',
        message: err.message,
      });
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(90deg, rgba(178, 43, 47, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)', border: '1px solid rgba(209, 165, 80, 0.4)', borderRadius: '999px', padding: '4px 16px', fontSize: '11px', color: '#f7d070', fontWeight: '800', marginBottom: '12px' }}>
          <QrCode size={13} color="#22d3ee" /> DIT PUNE GATE ENTRY SCANNER • ACES OPS
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>
          HackSeries 2026 Check-in Terminal
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Dr. D. Y. Patil Institute of Technology (DIT) Campus • Live anti-forgery QR verification
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px', alignItems: 'flex-start' }}>
        
        {/* Left Column: Live Camera Scanner */}
        <div>
          <QRScanner onScanComplete={handleScanCompleted} onShowToast={onShowToast} />
        </div>

        {/* Right Column: Live Recent Check-Ins Feed */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={16} color="#22c55e" />
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Recent Gate Scans</span>
            </div>
            <span className="badge badge-emerald">{recentScans.length} Checked In</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
            {recentScans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-dim)', fontSize: '13px' }}>
                <Clock size={32} style={{ opacity: 0.3, margin: '0 auto 8px auto' }} />
                <div>No scans recorded yet today.</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Scanned passes will appear here in real-time.</div>
              </div>
            ) : (
              recentScans.map((item) => (
                <div
                  key={item._id || item.uniqueId}
                  style={{
                    background: '#0b0f19',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '13px' }}>{item.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#22c55e', marginTop: '1px' }}>
                      {item.uniqueId}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Checked in at {new Date(item.checkedInAt).toLocaleTimeString()} by {item.checkedInBy || 'Gate Staff'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                      {item.ticketType || 'Hacker'}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleUndo(item)}
                      title="Undo check-in for this pass"
                      style={{ padding: '6px', color: '#f87171' }}
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
