import React, { useState } from 'react';
import { X, Send, AlertCircle, RefreshCw, CheckCircle2, Users, CheckSquare, Mail } from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const BulkEmailModal = ({
  pendingCount = 0,
  totalCount = 0,
  verifiedCount = 0,
  verifiedPendingCount = 0,
  selectedRegistrants = [],
  onClose,
  onShowToast,
  onRefresh,
  onClearSelection,
}) => {
  // Target Mode: 'verified_pending' | 'verified_all' | 'selected'
  const hasSelected = selectedRegistrants && selectedRegistrants.length > 0;
  const verifiedSelectedCount = (selectedRegistrants || []).filter((r) => r.verified === true || String(r.verificationStatus).toLowerCase() === 'verified').length;
  const initialMode = hasSelected ? 'selected' : 'verified_pending';
  const [targetMode, setTargetMode] = useState(initialMode);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(null);

  const getTargetCount = () => {
    if (targetMode === 'selected') return verifiedSelectedCount;
    if (targetMode === 'verified_pending') return verifiedPendingCount;
    return verifiedCount;
  };

  const targetCount = getTargetCount();

  const handleStartBulkSend = async () => {
    if (targetCount === 0) {
      sounds.playWarning();
      onShowToast({
        type: 'info',
        title: 'No Eligible Verified Recipients',
        message: 'Pass emails can only be sent to attendees whose status is "Verified". Please verify attendees first.',
      });
      return;
    }

    try {
      setIsSending(true);
      sounds.playClick();
      setProgress(`Dispatching QR passes via Gmail SMTP (tigeradi1504@gmail.com)...`);

      let payload = { onlyVerified: true };
      if (targetMode === 'selected') {
        const verifiedIds = selectedRegistrants
          .filter((r) => r.verified === true || String(r.verificationStatus).toLowerCase() === 'verified')
          .map((r) => r.uniqueId || r._id);
        payload.selectedIds = verifiedIds;
      } else if (targetMode === 'verified_pending') {
        payload.onlyVerified = true;
        payload.onlyPending = true;
      } else if (targetMode === 'verified_all') {
        payload.onlyVerified = true;
        payload.onlyPending = false;
      }

      const response = await api.email.sendBulk(payload);

      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'Passes Dispatched to Verified Hackers! 🚀',
        message: `Successfully emailed ${response.results?.sent || 0} digital passes from tigeradi1504@gmail.com`,
      });

      if (onClearSelection) onClearSelection();
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Bulk Dispatch Error',
        message: err.message,
      });
    } finally {
      setIsSending(false);
      setProgress(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '600px', border: '1px solid rgba(255, 255, 255, 0.12)' }}
      >
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(6, 182, 212, 0.05) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.2)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Send size={18} color="#22c55e" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>Verified Pass Email Dispatcher</div>
              <div style={{ fontSize: '11px', color: '#4ade80' }}>🔒 Strictly Verified Attendees Only</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={isSending} style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>

          {/* Strict Verified Security Banner */}
          <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CheckCircle2 size={18} color="#4ade80" />
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
              <strong>Zero-Unverified Leak Guarantee:</strong> Official QR Entry passes will <span style={{ color: '#4ade80' }}>only be emailed to Verified attendees</span>. Unverified applicants are automatically skipped.
            </div>
          </div>
          
          {/* Target Audience Selector */}
          <div style={{ background: '#0b0f19', borderRadius: '14px', padding: '18px', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Select Dispatch Scope:
              </span>
              <span className="badge badge-emerald" style={{ fontSize: '12px', padding: '4px 10px' }}>
                {targetCount} Verified Hackers
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              
              {/* Option 1: Verified & Pending only (Recommended) */}
              <label 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  fontSize: '13px', 
                  cursor: 'pointer',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: targetMode === 'verified_pending' ? 'rgba(34, 197, 94, 0.14)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${targetMode === 'verified_pending' ? '#22c55e' : 'var(--border-subtle)'}`,
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="radio"
                  name="bulkTarget"
                  checked={targetMode === 'verified_pending'}
                  onChange={() => setTargetMode('verified_pending')}
                  disabled={isSending}
                  style={{ accentColor: '#22c55e', width: '16px', height: '16px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={15} color="#22c55e" />
                    <span>Verified & Needs Pass Only ({verifiedPendingCount} hackers)</span>
                    <span className="badge badge-emerald" style={{ fontSize: '9px' }}>RECOMMENDED</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Only emails attendees who are marked "Verified" and have not received their QR pass yet
                  </div>
                </div>
              </label>

              {/* Option 2: Selected attendees */}
              {hasSelected && (
                <label 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    fontSize: '13px', 
                    cursor: 'pointer',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: targetMode === 'selected' ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                    border: `1px solid ${targetMode === 'selected' ? 'rgba(34, 197, 94, 0.4)' : 'var(--border-subtle)'}`,
                    transition: 'all 0.2s ease'
                  }}
                >
                  <input
                    type="radio"
                    name="bulkTarget"
                    checked={targetMode === 'selected'}
                    onChange={() => setTargetMode('selected')}
                    disabled={isSending}
                    style={{ accentColor: '#22c55e', width: '16px', height: '16px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckSquare size={14} color="#22c55e" />
                      <span>Only Selected Verified Hackers ({verifiedSelectedCount} of {selectedRegistrants.length} selected)</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Sends passes strictly to the verified individuals checked in the table
                    </div>
                  </div>
                </label>
              )}

              {/* Option 3: All Verified attendees */}
              <label 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  fontSize: '13px', 
                  cursor: 'pointer',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: targetMode === 'verified_all' ? 'rgba(34, 197, 94, 0.12)' : 'transparent',
                  border: `1px solid ${targetMode === 'verified_all' ? 'rgba(34, 197, 94, 0.4)' : 'var(--border-subtle)'}`,
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="radio"
                  name="bulkTarget"
                  checked={targetMode === 'verified_all'}
                  onChange={() => setTargetMode('verified_all')}
                  disabled={isSending}
                  style={{ accentColor: '#22c55e', width: '16px', height: '16px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '800', color: '#ffffff' }}>
                    All Verified Hackers ({verifiedCount} hackers)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Dispatches passes to all verified hackers (including resending existing passes)
                  </div>
                </div>
              </label>

            </div>
          </div>

          {/* List of Selected Recipients Preview */}
          {targetMode === 'selected' && hasSelected && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: '700', marginBottom: '8px', textTransform: 'uppercase' }}>
                Selected Recipients Preview ({selectedRegistrants.length}):
              </div>
              <div style={{ maxHeight: '140px', overflowY: 'auto', background: '#06080e', borderRadius: '10px', border: '1px solid var(--border-subtle)', padding: '8px' }}>
                {selectedRegistrants.map((reg) => (
                  <div key={reg._id || reg.uniqueId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '12px' }}>
                    <div>
                      <span style={{ fontWeight: '700', color: '#ffffff' }}>{reg.name}</span>
                      <span style={{ color: 'var(--text-dim)', marginLeft: '8px', fontSize: '11px' }}>{reg.email}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#22c55e' }}>{reg.uniqueId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Indicator */}
          {isSending && (
            <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(34, 197, 94, 0.08)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.3)', marginBottom: '20px' }}>
              <RefreshCw size={24} className="spin" color="#22c55e" style={{ margin: '0 auto 8px auto' }} />
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#4ade80' }}>{progress}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Please do not close this window while Gmail delivers passes.</div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button className="btn btn-secondary" onClick={onClose} disabled={isSending}>
              Cancel
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleStartBulkSend} 
              disabled={isSending || targetCount === 0}
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: '#fff',
                fontWeight: '800',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Send size={15} /> 
              <span>{isSending ? 'Dispatching...' : `Send Passes to ${targetCount} ${targetMode === 'selected' ? 'Selected' : ''} Hackers`}</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
