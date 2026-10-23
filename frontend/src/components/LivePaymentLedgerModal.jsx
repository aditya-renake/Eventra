import React, { useState } from 'react';
import { X, Search, CheckCircle2, Download, CreditCard, ExternalLink, Calendar, Mail, Phone, User, Ticket } from 'lucide-react';
import { sounds } from '../utils/soundEffects';

export const LivePaymentLedgerModal = ({ transactions = [], eventName = 'Event', onClose }) => {
  const [search, setSearch] = useState('');

  const filtered = transactions.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      t.paymentId?.toLowerCase().includes(q) ||
      t.orderId?.toLowerCase().includes(q) ||
      t.name?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.contact?.includes(q) ||
      t.ticketType?.toLowerCase().includes(q) ||
      t.method?.toLowerCase().includes(q)
    );
  });

  const totalFilteredRupees = filtered.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const handleExportCSV = () => {
    sounds.playClick();
    const headers = ['Payment ID', 'Order ID', 'Amount (INR)', 'Status', 'Method', 'Attendee Name', 'Email', 'Phone', 'Pass Tier', 'Timestamp'];
    const rows = filtered.map((t) => [
      `"${t.paymentId || ''}"`,
      `"${t.orderId || ''}"`,
      t.amount || 0,
      `"${t.status || 'captured'}"`,
      `"${t.method || 'upi'}"`,
      `"${(t.name || '').replace(/"/g, '""')}"`,
      `"${t.email || ''}"`,
      `"${t.contact || ''}"`,
      `"${t.ticketType || ''}"`,
      `"${t.createdAt || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Razorpay-Ledger-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, background: 'rgba(3, 7, 18, 0.85)', backdropFilter: 'blur(10px)', zIndex: 9999, padding: '20px' }}>
      <div 
        className="modal-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          background: '#0d121f', 
          border: '1px solid rgba(56, 189, 248, 0.3)', 
          borderRadius: '20px', 
          maxWidth: '1000px', 
          width: '100%', 
          maxHeight: '90vh', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden', 
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)' 
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#080c16' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #06b6d4 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <CreditCard size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#fff', margin: 0 }}>
                Live Razorpay Payment Ledger
              </h3>
              <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0 0' }}>
                Reconciled captured transactions for <strong>{eventName}</strong> ({filtered.length} entries • ₹{totalFilteredRupees.toLocaleString('en-IN')})
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
            >
              <Download size={13} /> Export Ledger CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', background: '#0b101c' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#38bdf8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by Razorpay Payment ID (pay_...), Order ID, Name, Email, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                background: '#070a12',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '10px',
                padding: '9px 14px 9px 36px',
                color: '#fff',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af' }}>
              No transactions match your search filter.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#9ca3af', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '10px 12px' }}>Payment ID</th>
                    <th style={{ padding: '10px 12px' }}>Attendee</th>
                    <th style={{ padding: '10px 12px' }}>Pass Tier</th>
                    <th style={{ padding: '10px 12px' }}>Amount</th>
                    <th style={{ padding: '10px 12px' }}>Method</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px' }}>Captured At</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, idx) => {
                    const dateStr = t.createdAt ? new Date(t.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Just now';
                    return (
                      <tr 
                        key={t.paymentId || idx}
                        style={{ 
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          color: '#E2E8F0',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#38bdf8' }}>
                          <div>{t.paymentId}</div>
                          {t.orderId && <div style={{ fontSize: '10px', color: '#64748b' }}>{t.orderId}</div>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ fontWeight: '800', color: '#FFFFFF' }}>{t.name || 'Attendee'}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{t.email}</div>
                          {t.contact && <div style={{ fontSize: '10px', color: '#64748b' }}>{t.contact}</div>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                            {t.ticketType || 'Standard Pass'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: '900', color: '#22c55e' }}>
                          ₹{t.amount || 0}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: '800', color: '#cbd5e1', background: 'rgba(255, 255, 255, 0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                            {t.method || 'upi'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#22c55e', fontSize: '11px', fontWeight: '800' }}>
                            <CheckCircle2 size={12} color="#22c55e" /> CAPTURED
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {dateStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: '#080c16', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#9ca3af' }}>
          <div>
            🔒 Live reconciliation with Razorpay merchant account • Instant zero-tamper settlement
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary btn-sm"
            style={{ padding: '6px 16px', borderRadius: '8px' }}
          >
            Close Ledger
          </button>
        </div>

      </div>
    </div>
  );
};
