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
    <div className="modal-backdrop live-ledger-backdrop" onClick={onClose}>
      <div 
        className="modal-card live-ledger-modal" 
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Header */}
        <div className="live-ledger-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="live-ledger-icon">
              <CreditCard size={18} />
            </div>
            <div>
              <h3 className="live-ledger-header-title">
                Live Razorpay Payment Ledger
              </h3>
              <p className="live-ledger-header-sub">
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
              className="btn btn-ghost btn-sm"
              style={{ padding: '6px', borderRadius: '8px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="live-ledger-search-box">
          <div style={{ position: 'relative' }}>
            <Search size={15} color="#596EE6" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="live-ledger-search-input"
              placeholder="Search by Razorpay Payment ID (pay_...), Order ID, Name, Email, Phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="live-ledger-table-wrap">
          {filtered.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No transactions match your search filter.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="live-ledger-table">
                <thead>
                  <tr>
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
                      <tr key={t.paymentId || idx}>
                        <td style={{ padding: '12px' }}>
                          <div className="live-ledger-pid">{t.paymentId}</div>
                          {t.orderId && <div className="live-ledger-orderid">{t.orderId}</div>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div className="live-ledger-name">{t.name || 'Attendee'}</div>
                          <div className="live-ledger-email">{t.email}</div>
                          {t.contact && <div className="live-ledger-contact">{t.contact}</div>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className="live-ledger-tier-badge">
                            {t.ticketType || 'Standard Pass'}
                          </span>
                        </td>
                        <td className="live-ledger-amount">
                          ₹{t.amount || 0}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className="live-ledger-method-badge">
                            {t.method || 'upi'}
                          </span>
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span className="live-ledger-status-badge">
                            <CheckCircle2 size={12} /> CAPTURED
                          </span>
                        </td>
                        <td className="live-ledger-date" style={{ padding: '12px' }}>
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
        <div className="live-ledger-footer">
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
