import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  QrCode, 
  CheckCircle2, 
  Clock, 
  Trash2, 
  Eye, 
  Check, 
  X, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building2,
  Users,
  CheckSquare,
  Square,
  Camera,
  Image
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const RegistrantTable = ({
  registrants = [],
  pagination = {},
  selectedIds = [],
  onToggleSelect,
  onSelectAllVisible,
  onClearSelection,
  onOpenBulkEmail,
  onPageChange,
  onRefresh,
  onViewPass,
  onShowToast,
}) => {
  const [localRegistrants, setLocalRegistrants] = useState(registrants);
  const [sendingId, setSendingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [selectedPhotoReg, setSelectedPhotoReg] = useState(null);
  const [isBulkVerifying, setIsBulkVerifying] = useState(false);

  React.useEffect(() => {
    setLocalRegistrants(registrants);
  }, [registrants]);

  const visibleIds = localRegistrants.map((r) => r.uniqueId || r._id);
  const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isSomeVisibleSelected = visibleIds.some((id) => selectedIds.includes(id)) && !isAllVisibleSelected;

  // Zero-Lag Optimistic Dropdown Verification Handler
  const handleDropdownVerify = async (reg, isVerified) => {
    const regId = reg.uniqueId || reg._id;
    sounds.playClick();

    // 1. Optimistically update local state immediately (0ms lag)
    setLocalRegistrants((prev) =>
      prev.map((r) =>
        (r.uniqueId || r._id) === regId
          ? {
              ...r,
              verified: isVerified,
              verificationStatus: isVerified ? 'Verified' : 'Not Verified',
            }
          : r
      )
    );

    if (isVerified) sounds.playSuccess();
    else sounds.playWarning();

    // 2. Fire background API request
    try {
      await api.registrants.toggleVerification(regId, isVerified);
      onShowToast({
        type: 'success',
        title: isVerified ? 'Attendee Verified! ✅' : 'Verification Pending ⏳',
        message: `${reg.name} is now marked as ${isVerified ? 'Verified' : 'Not Verified'}.`,
      });
      // Optionally trigger background refresh
      if (onRefresh) onRefresh();
    } catch (err) {
      sounds.playError();
      // Revert optimistic update on failure
      setLocalRegistrants((prev) =>
        prev.map((r) =>
          (r.uniqueId || r._id) === regId
            ? { ...r, verified: !isVerified, verificationStatus: !isVerified ? 'Verified' : 'Not Verified' }
            : r
        )
      );
      onShowToast({
        type: 'error',
        title: 'Status Update Failed',
        message: err.message,
      });
    }
  };

  // Bulk Verification Handler (Mark All Selected as Verified/Pending)
  const handleBulkVerify = async (isVerified) => {
    if (!selectedIds || selectedIds.length === 0) return;
    sounds.playClick();
    setIsBulkVerifying(true);

    // 1. Optimistically update all selected items in local state immediately (0ms lag)
    setLocalRegistrants((prev) =>
      prev.map((r) =>
        selectedIds.includes(r.uniqueId || r._id)
          ? {
              ...r,
              verified: isVerified,
              verificationStatus: isVerified ? 'Verified' : 'Not Verified',
            }
          : r
      )
    );

    if (isVerified) sounds.playSuccess();
    else sounds.playWarning();

    try {
      const res = await api.registrants.bulkVerify(selectedIds, isVerified);
      onShowToast({
        type: 'success',
        title: isVerified ? 'Bulk Verification Complete! ✅' : 'Bulk Marked Pending ⏳',
        message: res.message || `Updated ${selectedIds.length} attendees.`,
      });
      if (onClearSelection) onClearSelection();
      if (onRefresh) onRefresh();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Bulk Update Failed',
        message: err.message,
      });
      if (onRefresh) onRefresh();
    } finally {
      setIsBulkVerifying(false);
    }
  };

  // 1-Click Send Pass Email to single attendee
  const handleSendEmail = async (reg) => {
    try {
      setSendingId(reg.uniqueId || reg._id);
      sounds.playClick();
      const res = await api.email.sendSingle(reg.uniqueId || reg._id);
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'Pass Email Dispatched! 🎟️',
        message: `Official QR pass sent from tigeradi1504@gmail.com to ${reg.email}`,
      });
      if (res.result?.previewUrl) {
        window.open(res.result.previewUrl, '_blank');
      }
      onRefresh();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Email Delivery Failed',
        message: err.message || 'Could not send pass email.',
      });
    } finally {
      setSendingId(null);
    }
  };

  // Toggle Check-in status
  const handleToggleCheckin = async (reg) => {
    try {
      setTogglingId(reg.uniqueId || reg._id);
      sounds.playClick();
      if (reg.checkedIn) {
        await api.checkin.undo(reg.uniqueId || reg._id);
        sounds.playWarning();
        onShowToast({
          type: 'info',
          title: 'Check-in Reverted',
          message: `Reverted check-in for ${reg.name}`,
        });
      } else {
        await api.checkin.scan({ manualCode: reg.uniqueId, scannedBy: 'Dashboard Admin' });
        sounds.playSuccess();
        onShowToast({
          type: 'success',
          title: 'Checked In! ✅',
          message: `${reg.name} checked in successfully.`,
        });
      }
      onRefresh();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Check-in Error',
        message: err.message,
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Delete attendee
  const handleDelete = async (id, name) => {
    sounds.playClick();
    if (!window.confirm(`Are you sure you want to remove ${name} from Eventra 2026?`)) return;
    try {
      await api.registrants.delete(id);
      sounds.playWarning();
      onShowToast({
        type: 'success',
        title: 'Attendee Removed',
        message: `${name} has been removed.`,
      });
      onRefresh();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message,
      });
    }
  };

  const getTicketBadge = (type) => {
    switch (type) {
      case 'VIP Pass':
        return <span className="badge badge-amber">{type}</span>;
      case 'Mentor / Judge':
        return <span className="badge badge-rose">{type}</span>;
      case 'Team Lead Pass':
        return <span className="badge badge-cyan">{type}</span>;
      case 'Speaker Pass':
        return <span className="badge badge-violet">{type}</span>;
      default:
        return <span className="badge badge-emerald">{type}</span>;
    }
  };

  return (
    <div className="glass-panel registrant-table-shell" style={{ overflow: 'hidden', position: 'relative' }}>
      
      {/* Sleek Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div
          className="registrant-bulk-bar"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderBottom: '1px solid rgba(34, 197, 94, 0.35)',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: 'rgba(34, 197, 94, 0.2)',
                color: '#4ade80',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '800',
              }}
            >
              ✓ {selectedIds.length} Selected
            </span>
            <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: '600' }}>
              Bulk Operations:
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Bulk Mark as Verified */}
            <button
              onClick={() => handleBulkVerify(true)}
              disabled={isBulkVerifying}
              style={{
                background: 'linear-gradient(135deg, #15803d 0%, #16a34a 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(34, 197, 94, 0.3)',
              }}
              title="Mark all selected attendees as Verified in 1 click"
            >
              <CheckCircle2 size={14} />
              <span>Bulk Verify ({selectedIds.length})</span>
            </button>

            {/* Bulk Mark as Pending */}
            <button
              onClick={() => handleBulkVerify(false)}
              disabled={isBulkVerifying}
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Mark all selected attendees as Pending"
            >
              <Clock size={14} />
              <span>Mark Pending</span>
            </button>

            {/* Bulk Dispatch Email Passes */}
            {onOpenBulkEmail && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenBulkEmail();
                }}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '7px 14px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)',
                }}
              >
                <Send size={14} />
                <span>Bulk Email Passes</span>
              </button>
            )}

            {/* Clear Selection */}
            {onClearSelection && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onClearSelection();
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#0b0f19', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
              
              {/* Select All Checkbox Column */}
              <th style={{ width: '48px', padding: '14px 16px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={isAllVisibleSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isSomeVisibleSelected;
                  }}
                  onChange={() => {
                    sounds.playClick();
                    if (onSelectAllVisible) onSelectAllVisible(visibleIds);
                  }}
                  title={isAllVisibleSelected ? 'Deselect all on this page' : 'Select all on this page'}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#22c55e' }}
                />
              </th>

              <th style={{ padding: '14px 16px' }}>Hacker / Attendee</th>
              <th style={{ padding: '14px 16px' }}>Verification Status</th>
              <th style={{ padding: '14px 16px' }}>Pass ID</th>
              <th style={{ padding: '14px 16px' }}>Tier & Track</th>
              <th style={{ padding: '14px 16px' }}>Check-in Status</th>
              <th style={{ padding: '14px 16px' }}>Pass Emailed?</th>
              <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {localRegistrants.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '4px' }}>No Registrants Found</div>
                  <p style={{ fontSize: '13px' }}>Google Form submissions will automatically appear here in real time via webhook.</p>
                </td>
              </tr>
            ) : (
              localRegistrants.map((reg) => {
                const regId = reg.uniqueId || reg._id;
                const isSelected = selectedIds.includes(regId);

                return (
                  <tr
                    key={regId}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(34, 197, 94, 0.07)' : 'transparent',
                      borderLeft: isSelected ? '3px solid #22c55e' : '3px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    
                    {/* Row Selection Checkbox */}
                    <td style={{ width: '48px', padding: '14px 16px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          sounds.playClick();
                          if (onToggleSelect) onToggleSelect(regId);
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#22c55e' }}
                      />
                    </td>

                    {/* Attendee Details */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: '700', color: '#ffffff', fontSize: '14px' }}>{reg.name}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{reg.email}</div>
                      {reg.phone && <div style={{ color: 'var(--text-dim)', fontSize: '11px' }}>{reg.phone}</div>}
                      {reg.teamName && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '11px', color: 'var(--accent-cyan)' }}>
                          <Users size={11} /> Team: {reg.teamName}
                        </div>
                      )}
                    </td>

                    {/* Verification Status (Zero-Lag Dropdown) */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <select
                          value={reg.verified ? 'Verified' : 'Pending'}
                          onChange={(e) => handleDropdownVerify(reg, e.target.value === 'Verified')}
                          style={{
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            background: reg.verified ? 'rgba(34, 197, 94, 0.18)' : 'rgba(245, 158, 11, 0.15)',
                            border: reg.verified ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(245, 158, 11, 0.45)',
                            color: reg.verified ? '#4ade80' : '#fbbf24',
                            padding: '6px 28px 6px 12px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            outline: 'none',
                            transition: 'all 0.15s ease',
                            boxShadow: reg.verified ? '0 0 10px rgba(34, 197, 94, 0.15)' : 'none',
                          }}
                          title="Instant status dropdown (syncs 2-way with Google Sheets!)"
                        >
                          <option value="Verified" style={{ background: '#0f172a', color: '#4ade80', fontWeight: '700' }}>
                            ✅ Verified
                          </option>
                          <option value="Pending" style={{ background: '#0f172a', color: '#fbbf24', fontWeight: '700' }}>
                            ⏳ Pending
                          </option>
                        </select>
                        <span
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            fontSize: '9px',
                            color: reg.verified ? '#4ade80' : '#fbbf24',
                            fontWeight: '900',
                          }}
                        >
                          ▼
                        </span>
                      </div>
                    </td>

                    {/* Pass ID with anti-forgery indicator */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#22c55e', fontSize: '12px' }}>
                        {reg.uniqueId}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: '#10b981', marginTop: '2px' }}>
                        <ShieldCheck size={11} /> Verified Signed
                      </div>
                    </td>

                    {/* Tier & Track */}
                    <td style={{ padding: '14px 16px' }}>
                      <div>{getTicketBadge(reg.ticketType)}</div>
                      {reg.track && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {reg.track}
                        </div>
                      )}
                      {reg.institution && (
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Building2 size={10} /> {reg.institution}
                        </div>
                      )}
                    </td>

                    {/* Check-in status with Live Photo Avatar */}
                    <td style={{ padding: '14px 16px' }}>
                      {reg.checkedIn ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {reg.checkedInPhoto && (
                            <div 
                              onClick={() => {
                                sounds.playClick();
                                setSelectedPhotoReg(reg);
                              }}
                              title="Click to view live gate entry snapshot"
                              style={{
                                cursor: 'pointer',
                                position: 'relative',
                                display: 'inline-block'
                              }}
                            >
                              <img
                                src={reg.checkedInPhoto}
                                alt="Gate Snapshot"
                                style={{
                                  width: '38px',
                                  height: '38px',
                                  borderRadius: '8px',
                                  objectFit: 'cover',
                                  border: '2px solid #22c55e',
                                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)',
                                  transition: 'transform 0.15s ease'
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                              />
                              <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#22c55e', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                                <Camera size={8} color="#000" />
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="badge badge-emerald" style={{ gap: '4px' }}>
                              <CheckCircle2 size={12} /> CHECKED IN
                            </span>
                            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
                              {reg.checkedInAt ? new Date(reg.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Gate Check-in'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="badge" style={{ background: '#1f293d', color: '#9ca3af', border: '1px solid #374151' }}>
                          <Clock size={11} /> PENDING
                        </span>
                      )}
                    </td>

                    {/* Email sent status */}
                    <td style={{ padding: '14px 16px' }}>
                      {reg.emailSent ? (
                        <div>
                          <span className="badge badge-cyan" style={{ gap: '4px' }}>
                            <Check size={11} /> SENT ({reg.emailSendCount || 1})
                          </span>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '4px' }}>
                            {reg.emailSentAt ? new Date(reg.emailSentAt).toLocaleDateString() : 'Dispatched'}
                          </div>
                        </div>
                      ) : (
                        <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                          <X size={11} /> NOT SENT
                        </span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        
                        {/* 1-Click Send Email Button */}
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSendEmail(reg)}
                          disabled={sendingId === regId}
                          title={`1-Click: Send Pass Email from tigeradi1504@gmail.com to ${reg.email}`}
                          style={{ padding: '6px 12px', fontSize: '11px' }}
                        >
                          {sendingId === regId ? (
                            <RefreshCw size={12} className="spin" />
                          ) : (
                            <Send size={12} />
                          )}
                          <span>{reg.emailSent ? 'Resend Pass' : 'Send Pass'}</span>
                        </button>

                        {/* View Pass Modal Button */}
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => onViewPass(reg)}
                          title="View Digital Holographic Pass Ticket"
                          style={{ padding: '6px 10px' }}
                        >
                          <Eye size={13} />
                        </button>

                        {/* Check-in Toggle Button */}
                        <button
                          className={`btn btn-sm ${reg.checkedIn ? 'btn-ghost' : 'btn-cyan'}`}
                          onClick={() => handleToggleCheckin(reg)}
                          disabled={togglingId === regId}
                          title={reg.checkedIn ? 'Undo Check-in' : 'Mark Checked-in'}
                          style={{ padding: '6px 10px' }}
                        >
                          {reg.checkedIn ? <X size={13} color="#f87171" /> : <Check size={13} />}
                        </button>

                        {/* Delete */}
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleDelete(regId, reg.name)}
                          title="Remove attendee"
                          style={{ padding: '6px 8px', color: '#6b7280' }}
                        >
                          <Trash2 size={13} />
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Action Bar for Selected Attendees */}
      {selectedIds.length > 0 && (
        <div 
          className="registrant-selection-bar"
          style={{
            position: 'sticky',
            bottom: '0',
            left: '0',
            right: '0',
            background: '#0e1424',
            borderTop: '2px solid #22c55e',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.6)',
            zIndex: 100,
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.2)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <CheckCircle2 size={18} color="#22c55e" />
            </div>
            <div>
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>
                {selectedIds.length} {selectedIds.length === 1 ? 'attendee' : 'attendees'} selected
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                (Choose an action below to process selected hackers all at once)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            
            {/* Send to Selected button */}
            <button
              className="btn btn-primary"
              onClick={() => {
                sounds.playClick();
                if (onOpenBulkEmail) onOpenBulkEmail();
              }}
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#ffffff',
                fontWeight: '900',
                padding: '10px 20px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)'
              }}
            >
              <Send size={15} />
              <span>Send QR Email Passes to Selected ({selectedIds.length})</span>
            </button>

            {/* Clear Selection */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                sounds.playClick();
                if (onClearSelection) onClearSelection();
              }}
              style={{ padding: '9px 14px', fontSize: '12px' }}
            >
              <X size={14} /> Clear Selection
            </button>

          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: '#0b0f19', borderTop: '1px solid var(--border-subtle)', fontSize: '13px' }}>
          <div style={{ color: 'var(--text-muted)' }}>
            Showing Page <strong style={{ color: '#fff' }}>{pagination.page}</strong> of <strong style={{ color: '#fff' }}>{pagination.totalPages}</strong> ({pagination.totalItems} total hackers)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Full-Size Live Gate Snapshot Modal */}
      {selectedPhotoReg && (
        <div className="modal-overlay" onClick={() => setSelectedPhotoReg(null)}>
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ maxWidth: '440px', padding: '0', overflow: 'hidden', border: '2px solid #22c55e', boxShadow: '0 20px 60px rgba(34, 197, 94, 0.4)' }}
          >
            <div style={{ background: '#0b0f19', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={16} color="#22c55e" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: '#fff' }}>Live Gate Entry Photo</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedPhotoReg(null)} style={{ padding: '4px', borderRadius: '50%' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px', textAlign: 'center' }}>
              <img
                src={selectedPhotoReg.checkedInPhoto}
                alt="Live Gate Snapshot"
                style={{
                  width: '100%',
                  maxHeight: '340px',
                  objectFit: 'contain',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
                }}
              />

              <div style={{ marginTop: '16px', textAlign: 'left', background: '#060913', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>{selectedPhotoReg.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedPhotoReg.email}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--eventra-indigo)', fontWeight: '700' }}>{selectedPhotoReg.uniqueId}</span>
                  <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: '700' }}>
                    Checked in {selectedPhotoReg.checkedInAt ? new Date(selectedPhotoReg.checkedInAt).toLocaleTimeString() : 'at Gate'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 20px', background: '#080c16', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'right' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPhotoReg(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
