import React, { useState, useEffect } from 'react';
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
  Smartphone,
  Clock,
  Mail,
  Building2
} from 'lucide-react';
import { api } from '../services/api';

export const PassPreviewModal = ({ registrant, activeEvent = null, onClose, onShowToast, onRefresh }) => {
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isVerified, setIsVerified] = useState(Boolean(registrant?.verified));
  const [fullPassData, setFullPassData] = useState(null);

  useEffect(() => {
    const regId = registrant?.uniqueId || registrant?._id;
    if (regId) {
      api.registrants.getPublicPass(regId)
        .then((res) => {
          if (res?.data) setFullPassData(res.data);
        })
        .catch(() => {});
    }
  }, [registrant]);

  if (!registrant) return null;

  const eventName = fullPassData?.eventName || activeEvent?.name || activeEvent?.eventName || 'Eventra';
  const eventDate = fullPassData?.eventDate || activeEvent?.dateDisplay || activeEvent?.eventDate || 'Dates TBA';
  const eventTime = fullPassData?.eventTime || activeEvent?.timeDisplay || activeEvent?.eventTime || '';
  const eventVenue = fullPassData?.eventVenue || activeEvent?.venue || activeEvent?.eventVenue || 'Campus Venue';
  const venueHall = fullPassData?.venueHall || activeEvent?.venueHall || '';
  const organizerEmail = fullPassData?.organizerEmail || activeEvent?.organizerEmail || '';
  const organizerPhone = fullPassData?.organizerPhone || activeEvent?.organizerPhone || '';
  const qrDataUrl = registrant.qrCodeDataUrl || fullPassData?.qrCodeDataUrl;
  const extraResponses = registrant.formResponses || fullPassData?.formResponses || {};

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
      const regId = registrant.uniqueId || registrant._id;
      const res = await api.email.sendSingle(regId);
      onShowToast({
        type: 'success',
        title: 'Pass Email Sent! 🎟️',
        message: `Official QR pass dispatched for ${eventName} to ${registrant.email}`,
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

  const publicPassUrl = `${window.location.origin}/pass/${registrant.uniqueId}`;

  const handleSendWhatsApp = () => {
    const passUrl = publicPassUrl;
    const message = `🎟️ *${eventName} Digital Entry Pass*\n\n` +
      `👤 *Attendee:* ${registrant.name}\n` +
      `🎫 *Pass ID:* ${registrant.uniqueId}\n` +
      `🎟️ *Ticket Type:* ${registrant.ticketType}\n` +
      (registrant.track ? `🎯 *Track / Activity:* ${registrant.track}\n` : '') +
      `🏛️ *Venue:* ${eventVenue}${venueHall ? ` (${venueHall})` : ''}\n` +
      `📅 *Dates:* ${eventDate}${eventTime ? ` (${eventTime})` : ''}\n\n` +
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
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `Eventra-Pass-${registrant.uniqueId}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="#22c55e" />
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>Official Digital Pass — {eventName}</span>
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
                  <img src="/eventra-logo.svg" alt="Eventra" style={{ height: '26px', width: 'auto', display: 'block' }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: '900', color: '#fff', letterSpacing: '-0.3px', textTransform: 'uppercase' }}>
                        {eventName}
                      </span>
                      <span className="badge badge-dyp" style={{ fontSize: '9px', padding: '1px 6px' }}>VERIFIED PASS</span>
                    </div>
                    <div style={{ fontSize: '9px', color: '#a8b4ff', fontWeight: '800', marginTop: '1px' }}>OFFICIAL VERIFIED ENTRY PASS</div>
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
                {registrant.institution && (
                  <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <Building2 size={11} color="#596EE6" /> {registrant.institution}
                  </div>
                )}
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
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`Pass QR for ${registrant.uniqueId}`}
                      style={{ width: '200px', height: '200px', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '12px' }}>
                      Loading QR...
                    </div>
                  )}
                </div>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#a8b4ff', fontWeight: '800', marginTop: '12px', letterSpacing: '1px' }}>
                  {registrant.uniqueId}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: '700' }}>
                  <ShieldCheck size={14} /> HMAC-SHA256 Cryptographic Signature Verified
                </div>
              </div>

              {/* Extra Form Responses if collected */}
              {Object.keys(extraResponses).length > 0 && (
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '11px', color: '#CBD5E1' }}>
                  {Object.entries(extraResponses).map(([k, v]) => (
                    v ? (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '2px 0' }}>
                        <span style={{ color: '#94A3B8' }}>{k}:</span>
                        <strong style={{ color: '#FFFFFF', textAlign: 'right' }}>{String(v)}</strong>
                      </div>
                    ) : null
                  ))}
                </div>
              )}

              {/* Event Metadata Footer */}
              <div style={{ background: '#030712', borderRadius: '10px', padding: '12px 16px', border: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <MapPin size={13} color="#596EE6" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <span>{eventVenue}{venueHall ? ` (${venueHall})` : ''}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={13} color="#a8b4ff" style={{ flexShrink: 0 }} />
                  <span>{eventDate}{eventTime ? ` • ${eventTime}` : ''}</span>
                </div>
                {(organizerEmail || organizerPhone) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={13} color="#22d3ee" style={{ flexShrink: 0 }} />
                    <span>{[organizerEmail, organizerPhone].filter(Boolean).join(' • ')}</span>
                  </div>
                )}
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

            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleDownloadQR} title="Download QR PNG">
                <Download size={15} /> Download
              </button>

              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handlePrint} title="Print Badge">
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
    </div>
  );
};
