import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  Download, 
  Printer, 
  CheckCircle2, 
  Calendar, 
  MapPin, 
  Users, 
  Mail, 
  ArrowLeft, 
  Sparkles,
  Smartphone,
  RefreshCw
} from 'lucide-react';
import { DYPDPULogo } from '../components/CollegeLogos';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const DigitalPassPage = ({ uniqueId, onBack, onShowToast }) => {
  const [passData, setPassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPass = async () => {
      try {
        setLoading(true);
        const res = await api.registrants.getPublicPass(uniqueId);
        setPassData(res.data);
      } catch (err) {
        setError(err.message || 'Could not find pass record.');
      } finally {
        setLoading(false);
      }
    };

    if (uniqueId) {
      fetchPass();
    }
  }, [uniqueId]);

  const handleDownload = () => {
    if (!passData) return;
    sounds.playClick();
    const link = document.createElement('a');
    link.download = `HackSeries2026-${passData.uniqueId}.png`;
    link.href = passData.qrCodeDataUrl;
    link.click();
    if (onShowToast) {
      onShowToast({
        type: 'success',
        title: 'Pass Saved! 📱',
        message: 'QR Pass saved to your device. Show this image at the entrance gates.',
      });
    }
  };

  const handleSendWhatsApp = () => {
    if (!passData) return;
    sounds.playClick();
    const passUrl = window.location.href;
    const message = `🎟️ *HackSeries 2026 Digital Entry Pass*\n\n` +
      `👤 *Attendee:* ${passData.name}\n` +
      `🎫 *Pass ID:* ${passData.uniqueId}\n` +
      `🎟️ *Ticket Type:* ${passData.ticketType}\n` +
      `🏛️ *Venue:* Dr. D. Y. Patil Institute of Technology (DIT), Pimpri, Pune\n` +
      `📅 *Dates:* October 16–18, 2026 (Check-in 07:30 AM IST)\n\n` +
      `🔗 *Open Verified QR Pass:* ${passUrl}\n\n` +
      `⚡ Present this QR pass at the entrance scanner for express check-in.`;

    const phoneParam = passData.phone ? passData.phone.replace(/[^0-9]/g, '') : '';
    const whatsappUrl = phoneParam && phoneParam.length >= 10
      ? `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
    if (onShowToast) {
      onShowToast({
        type: 'success',
        title: 'Opening WhatsApp 📱',
        message: 'Pass details and QR verification link ready on WhatsApp.',
      });
    }
  };

  const handlePrint = () => {
    sounds.playClick();
    window.print();
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center', padding: '24px' }}>
        <RefreshCw size={36} className="spin" color="#22c55e" style={{ margin: '0 auto 16px auto' }} />
        <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Loading Cryptographic Pass...</div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>Verifying digital signature with HackSeries authority</p>
      </div>
    );
  }

  if (error || !passData) {
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto', textAlign: 'center', padding: '36px' }} className="glass-card">
        <div style={{ fontSize: '20px', fontWeight: '800', color: '#f87171', marginBottom: '8px' }}>Pass Not Found</div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          {error || 'No registered entry pass found for this ID.'}
        </p>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Event Website
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '520px', margin: '30px auto 60px auto', padding: '0 20px' }}>
      
      {/* Back Button */}
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: '16px' }}>
        <ArrowLeft size={15} /> Event Home
      </button>

      {/* Holographic Digital Pass Ticket */}
      <div className="holo-ticket">
        <div className="holo-inner">
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <DYPDPULogo height={22} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>HACKSERIES 2026</span>
                  <span className="badge badge-dyp" style={{ fontSize: '9px', padding: '1px 6px' }}>DIT PUNE</span>
                </div>
                <div style={{ fontSize: '9px', color: '#d1a550', fontWeight: '800', marginTop: '1px' }}>DR. D. Y. PATIL INSTITUTE OF TECHNOLOGY (DYPDPU)</div>
              </div>
            </div>
            <span className="badge badge-emerald">{passData.ticketType}</span>
          </div>

          {/* Attendee Name */}
          <div style={{ textAlign: 'center', margin: '16px 0' }}>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px' }}>
              {passData.name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>{passData.email}</div>
            
            {passData.teamName && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '8px', fontSize: '12px', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.12)', padding: '4px 14px', borderRadius: '999px' }}>
                <Users size={13} /> Team: <strong>{passData.teamName}</strong>
              </div>
            )}
          </div>

          {/* QR Code Container */}
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <div style={{ background: '#ffffff', padding: '16px', borderRadius: '18px', display: 'inline-block', boxShadow: '0 12px 35px rgba(0,0,0,0.6)' }}>
              <img
                src={passData.qrCodeDataUrl}
                alt={`Pass QR Code for ${passData.uniqueId}`}
                style={{ width: '220px', height: '220px', display: 'block' }}
              />
            </div>

            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: '#f7d070', fontWeight: '900', marginTop: '14px', letterSpacing: '1px' }}>
              {passData.uniqueId}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: '700' }}>
              <ShieldCheck size={14} /> HMAC-SHA256 Cryptographic Signature Verified
            </div>
          </div>

          {/* Check-in Status Pill */}
          <div style={{ textAlign: 'center', margin: '14px 0' }}>
            {passData.checkedIn ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', borderRadius: '999px', padding: '6px 18px', color: '#4ade80', fontSize: '12px', fontWeight: '800' }}>
                <CheckCircle2 size={15} /> CHECKED IN AT DIT CAMPUS
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: '999px', padding: '6px 18px', color: '#22d3ee', fontSize: '12px', fontWeight: '800' }}>
                <Sparkles size={14} /> READY FOR GATE CHECK-IN
              </div>
            )}
          </div>

          {/* Details */}
          <div style={{ background: '#030712', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Calendar size={14} color="#f7d070" />
              <span><strong>Dates:</strong> October 16 - 18, 2026 (Check-in 07:30 AM IST)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
              <MapPin size={14} color="#b22b2f" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span><strong>Venue:</strong> Dr. D. Y. Patil Institute of Technology (DIT), Sant Tukaram Nagar, Pimpri, Pune - 411018</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={14} color="#a78bfa" />
              <span><strong>Contact:</strong> aditya.renake@outlook.com</span>
            </div>
          </div>

        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
        <button 
          className="btn" 
          style={{ background: '#25D366', color: '#ffffff', fontWeight: '800', width: '100%', padding: '12px 20px', boxShadow: '0 4px 16px rgba(37, 211, 102, 0.35)' }}
          onClick={handleSendWhatsApp}
        >
          <Smartphone size={16} /> Get Pass on WhatsApp
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleDownload}>
            <Download size={16} /> Save QR Image
          </button>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> Print Badge
          </button>
        </div>
      </div>

    </div>
  );
};
