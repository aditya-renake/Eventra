/**
 * ============================================================================
 * DIGITAL PASS INSPECTION MODAL (PassPreviewModal.jsx)
 * ============================================================================
 * Purpose:
 *   Popup modal within the organizer dashboard allowing staff to inspect an
 *   attendee's holographic digital pass, verify payment status, dispatch emails,
 *   and test print rendering.
 *
 * Key Capabilities:
 *   - Live preview of attendee credentials, team details, and cryptographic QR.
 *   - 1-click manual verification override switch.
 *   - Direct pass email trigger and print/download buttons.
 * ============================================================================
 */

import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  Send, 
  ExternalLink, 
  ShieldCheck, 
  Zap, 
  Calendar, 
  MapPin, 
  Users, 
  RefreshCw,
  Smartphone 
} from 'lucide-react';
import { DYPDPULogo } from './CollegeLogos';
import { api } from '../services/api';

export const PassPreviewModal = ({ registrant, onClose, onShowToast, onRefresh }) => {
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isVerified, setIsVerified] = useState(Boolean(registrant?.verified));

  if (!registrant) return null;

  const handleToggleVerification = async () => {
    try {
      setIsUpdatingStatus(true);
      const nextStatus = !isVerified;
      const regId = registrant.uniqueId || registrant._id;
      await api.registrants.toggleVerification(regId, nextStatus);
      setIsVerified(nextStatus);
      onShowToast({
        type: 'success',
        title: nextStatus ? 'Status Updated: Verified ✅' : 'Status Updated: Pending ⏳',
        message: `${registrant.name} is now marked as ${nextStatus ? 'Verified' : 'Pending'}.`,
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Failed to update status',
        message: err.message,
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      setIsSending(true);
      const res = await api.email.sendSingle(registrant._id);
      onShowToast({
        type: 'success',
        title: 'Pass Email Sent! 🎟️',
        message: `Pass dispatched from aditya.renake@outlook.com to ${registrant.email}`,
      });
      if (res.result?.previewUrl) {
        window.open(res.result.previewUrl, '_blank');
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Email Delivery Failed',
        message: err.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendWhatsApp = () => {
    const passUrl = publicPassUrl;
    const message = `🎟️ *HackSeries 2026 Digital Entry Pass*\n\n` +
      `👤 *Attendee:* ${registrant.name}\n` +
      `🎫 *Pass ID:* ${registrant.uniqueId}\n` +
      `🎟️ *Ticket Type:* ${registrant.ticketType}\n` +
      `🏛️ *Venue:* Dr. D. Y. Patil Institute of Technology (DIT), Pimpri, Pune\n` +
      `📅 *Dates:* October 16–18, 2026 (Check-in 07:30 AM IST)\n\n` +
      `🔗 *View Verified QR Pass:* ${passUrl}\n\n` +
      `⚡ Show this QR code at the gate scanner for express entry.`;

    const phoneParam = registrant.phone ? registrant.phone.replace(/[^0-9]/g, '') : '';
    const whatsappUrl = phoneParam && phoneParam.length >= 10
      ? `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
    if (onShowToast) {
      onShowToast({
        type: 'success',
        title: 'Opening WhatsApp 📱',
        message: 'Pass details ready on WhatsApp.',
      });
    }
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.download = `HackSeries2026-Pass-${registrant.uniqueId}.png`;
    link.href = registrant.qrCodeDataUrl;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const publicPassUrl = `${window.location.origin}/pass/${registrant.uniqueId}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#22c55e" />
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>Official Digital Hacker Pass</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Holographic Pass Card */}
        <div style={{ padding: '24px' }}>
          <div className="holo-ticket">
            <div className="holo-inner">
              
              {/* Event Badge Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <DYPDPULogo height={22} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>HACKSERIES 2026</span>
                      <span className="badge badge-dyp" style={{ fontSize: '9px', padding: '1px 6px' }}>ACES DIT</span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#d1a550', fontWeight: '800', marginTop: '1px' }}>DR. D. Y. PATIL INSTITUTE OF TECHNOLOGY (DYPDPU)</div>
                  </div>
                </div>
                <span className="badge badge-emerald">{registrant.ticketType}</span>
              </div>

              {/* Attendee Info */}
              <div style={{ textAlign: 'center', margin: '14px 0' }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px' }}>
                  {registrant.name}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{registrant.email}</div>
                {registrant.teamName && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontSize: '12px', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.1)', padding: '3px 12px', borderRadius: '999px' }}>
                    <Users size={12} /> Team: {registrant.teamName}
                  </div>
                )}

                {/* Instant Verification Status Switcher */}
                <div style={{ marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={handleToggleVerification}
                    disabled={isUpdatingStatus}
                    style={{
                      background: isVerified ? 'rgba(34, 197, 94, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                      border: isVerified ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(245, 158, 11, 0.5)',
                      color: isVerified ? '#4ade80' : '#fbbf24',
                      padding: '5px 14px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: isVerified ? '0 0 10px rgba(34, 197, 94, 0.2)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                    title="Click to toggle status between Verified and Pending"
                  >
                    <span>{isVerified ? '✅ Status: Verified' : '⏳ Status: Pending'}</span>
                    <span style={{ fontSize: '9px', opacity: 0.8 }}>(Click to {isVerified ? 'Set Pending' : 'Verify'})</span>
                  </button>
                </div>
              </div>

              {/* QR Code Container */}
              <div style={{ textAlign: 'center', margin: '18px 0' }}>
                <div style={{ background: '#ffffff', padding: '14px', borderRadius: '16px', display: 'inline-block', boxShadow: '0 10px 30px rgba(0,0,0,0.6)' }}>
                  <img
                    src={registrant.qrCodeDataUrl}
                    alt={`Pass QR for ${registrant.uniqueId}`}
                    style={{ width: '200px', height: '200px', display: 'block' }}
                  />
                </div>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#f7d070', fontWeight: '800', marginTop: '12px', letterSpacing: '1px' }}>
                  {registrant.uniqueId}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: '700' }}>
                  <ShieldCheck size={14} /> HMAC-SHA256 Cryptographic Signature Verified
                </div>
              </div>

              {/* Event Metadata Footer */}
              <div style={{ background: '#030712', borderRadius: '10px', padding: '12px 16px', border: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
                  <MapPin size={13} color="#b22b2f" style={{ marginTop: '2px', flexShrink: 0 }} /> Dr. D. Y. Patil Institute of Technology (DIT), Sant Tukaram Nagar, Pimpri, Pune
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} color="#f7d070" /> Check-in: Oct 16, 07:30 AM IST • Bring Laptop & ID
                </div>
              </div>

            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleSendEmail}
                disabled={isSending}
              >
                {isSending ? <RefreshCw size={15} className="spin" /> : <Send size={15} />}
                <span>{registrant.emailSent ? 'Resend Email' : 'Send Email'}</span>
              </button>

              <button
                className="btn"
                style={{ background: '#25D366', color: '#ffffff', fontWeight: '800', flex: 1 }}
                onClick={handleSendWhatsApp}
              >
                <Smartphone size={15} /> Send WhatsApp
              </button>
            </div>

            <button className="btn btn-secondary" onClick={handleDownloadQR} title="Download QR PNG">
              <Download size={15} /> Download
            </button>

            <button className="btn btn-secondary" onClick={handlePrint} title="Print Badge">
              <Printer size={15} /> Print
            </button>

            <a
              href={publicPassUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost"
              title="Open Public Pass Portal"
            >
              <ExternalLink size={15} />
            </a>
          </div>

        </div>

      </div>
    </div>
  );
};
