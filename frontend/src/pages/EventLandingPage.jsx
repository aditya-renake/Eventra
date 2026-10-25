import React, { useState, useEffect, useCallback } from 'react';
import { 
  ExternalLink, 
  Search, 
  MapPin, 
  Compass, 
  ArrowUpRight, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles,
  Calendar,
  Activity,
  Smartphone,
  Download,
  Instagram,
  Github,
  Users,
  Ticket,
  Trophy,
  Clock,
  Building2,
  Globe,
  Share2,
  Crown,
  Zap,
  Lock,
  Layers,
  CreditCard,
  Check,
  ChevronRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { DYPDPULogo } from '../components/CollegeLogos';
import { ConstellationBackground } from '../components/ConstellationBackground';
import { EventsDiscoverySection } from '../components/EventsDiscoverySection';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const EventLandingPage = ({
  selectedEventId,
  onSelectEvent,
  onNavigateToPass,
  onNavigateToRegister,
  onShowToast,
}) => {
  const [lookupInput, setLookupInput] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [retrievedPass, setRetrievedPass] = useState(null);
  const [retrievedPasses, setRetrievedPasses] = useState([]);
  const [eventConfig, setEventConfig] = useState(null);
  const [allEvents, setAllEvents] = useState([]);
  const [flagshipEvent, setFlagshipEvent] = useState(null);
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });

  const loadLandingData = useCallback(async () => {
    try {
      const [evListRes, cfgRes] = await Promise.all([
        api.events.getAll().catch(() => ({ data: [] })),
        api.event.getConfig().catch(() => null),
      ]);

      const events = evListRes?.data || [];
      setAllEvents(events);

      const cfg = cfgRes?.data || null;
      if (cfg) setEventConfig(cfg);

      // Select the flagship event:
      // 1. Explicitly has isFlagship: true
      // 2. Or matches cfg.activeEventId
      // 3. Or first available event in catalog
      let chosen = events.find((e) => e.isFlagship === true);
      if (!chosen && cfg?.activeEventId) {
        chosen = events.find((e) => (e.id || e.eventId) === cfg.activeEventId);
      }
      if (!chosen && events.length > 0) {
        chosen = events[0];
      }

      setFlagshipEvent(chosen || null);
    } catch (e) {
      console.warn('Error loading landing data:', e);
    }
  }, []);

  useEffect(() => {
    loadLandingData();
    const handleEventUpdated = () => loadLandingData();
    window.addEventListener('eventra:events-updated', handleEventUpdated);
    return () => window.removeEventListener('eventra:events-updated', handleEventUpdated);
  }, [loadLandingData]);

  // Derived properties from the single flagship event
  const effectiveId = flagshipEvent?.slug || flagshipEvent?.id || flagshipEvent?.eventId || 'eventra-2026';
  const eventName = flagshipEvent?.name || eventConfig?.eventName || 'Eventra Flagship Hackathon';
  const eventTagline = flagshipEvent?.tagline || eventConfig?.eventTagline || 'Zero-Tamper Collegiate Innovation';
  const eventDescription = flagshipEvent?.description || eventConfig?.eventDescription ||
    'The premier campus hackathon bringing curious minds, bold builders, and industry engineers together for a high-intensity 48-hour sprint.';
  const eventCategory = flagshipEvent?.category || eventConfig?.category || 'Hackathon';
  const eventDate = flagshipEvent?.dateDisplay || eventConfig?.eventDate || 'October 16–18, 2026';
  const eventTime = flagshipEvent?.timeDisplay || eventConfig?.eventTime || '09:00 AM IST';
  const eventVenue = flagshipEvent?.venue || eventConfig?.eventVenue || 'DIT Pune, India';
  const venueHall = flagshipEvent?.venueHall || eventConfig?.venueHall || '';
  const collegeName = flagshipEvent?.collegeName || eventConfig?.collegeName || 'Dr. D. Y. Patil Pratishthan';
  const clubName = flagshipEvent?.clubName || eventConfig?.clubName || 'ACES / CSI';
  const clubCode = flagshipEvent?.clubCode || eventConfig?.clubCode || '';
  const organizerName = flagshipEvent?.organizerName || eventConfig?.organizerName || 'Aditya Renake';
  const mode = flagshipEvent?.mode || eventConfig?.mode || 'in_person';
  const totalCapacity = flagshipEvent?.totalCapacity || eventConfig?.totalCapacity || 500;
  const entryFee = flagshipEvent?.entryFee !== undefined ? Number(flagshipEvent.entryFee) : (eventConfig?.entryFee !== undefined ? Number(eventConfig.entryFee) : 5);
  const isFree = flagshipEvent?.pricingType === 'free' || entryFee === 0;
  const feeDisplay = isFree ? 'Free Entry Pass' : (flagshipEvent?.feeDisplay || `₹${entryFee} Entry Pass`);
  const bannerUrl = flagshipEvent?.bannerUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80';

  const handleOpenDetails = () => {
    sounds.playClick();
    window.open(`/#event/${encodeURIComponent(effectiveId)}`, '_blank');
  };

  const handleHeroPointerMove = (e) => {
    if (e.pointerType === 'touch') return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - bounds.left) / bounds.width - 0.5;
    const y = (e.clientY - bounds.top) / bounds.height - 0.5;
    setHeroTilt({ x: -y * 4, y: x * 5 });
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!lookupInput.trim()) return;

    sounds.playClick();
    try {
      setIsLookingUp(true);
      const res = await api.registrants.getPublicPass(lookupInput.trim());
      if (res.data?.uniqueId) {
        sounds.playSuccess();
        const passList = res.passes && res.passes.length > 0 ? res.passes : [res.data];
        setRetrievedPasses(passList);
        setRetrievedPass(res.data);
        if (res.attendee) {
          api.auth.setAttendee(res.attendee);
        }
        onShowToast?.({
          type: 'success',
          title: `Pass Verified! 🎟️ (${passList.length} Pass${passList.length === 1 ? '' : 'es'})`,
          message: passList.length > 1
            ? `Found ${passList.length} registered event passes. Toggle between them below.`
            : `Found entry pass for ${res.data.name}. You can now send it to WhatsApp or download it.`,
        });
      }
    } catch (err) {
      sounds.playError();
      setRetrievedPass(null);
      setRetrievedPasses([]);
      onShowToast?.({
        type: 'error',
        title: 'Pass Not Found',
        message: 'No registered pass found for this ID or Email. Please ensure you completed your registration.',
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSendWhatsAppForPass = (pass) => {
    if (!pass) return;
    sounds.playClick();
    const passUrl = `${window.location.origin}/pass/${pass.uniqueId}`;
    const passEvName = pass.eventName || eventName;
    const passEvVenue = pass.eventVenue || eventVenue;
    const passEvDate = pass.eventDate || eventDate;
    const passEvTime = pass.eventTime || eventTime;

    const message = `🎟️ *${passEvName} Digital Entry Pass*\n\n` +
      `👤 *Attendee:* ${pass.name}\n` +
      `🎫 *Pass ID:* ${pass.uniqueId}\n` +
      `🎟️ *Ticket Type:* ${pass.ticketType}\n` +
      `🏛️ *Venue:* ${passEvVenue}\n` +
      `📅 *Dates:* ${passEvDate} (${passEvTime})\n\n` +
      `🔗 *Open Verified QR Pass:* ${passUrl}\n\n` +
      `⚡ Present this QR pass at the entrance scanner for express check-in.`;

    const phoneParam = pass.phone ? pass.phone.replace(/[^0-9]/g, '') : '';
    const whatsappUrl = phoneParam && phoneParam.length >= 10
      ? `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
    onShowToast?.({
      type: 'success',
      title: 'Opening WhatsApp 📱',
      message: 'Pass details and QR link sent to WhatsApp.',
    });
  };

  const handleDownloadQRForPass = (pass) => {
    if (!pass?.qrCodeDataUrl) return;
    sounds.playClick();
    const link = document.createElement('a');
    link.download = `Eventra-${pass.uniqueId}.png`;
    link.href = pass.qrCodeDataUrl;
    link.click();
  };

  const handleShareCurrentEvent = () => {
    sounds.playClick();
    const shareUrl = `${window.location.origin}/#event/${encodeURIComponent(effectiveId)}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    onShowToast?.({
      type: 'success',
      title: 'Event Link Copied! 🔗',
      message: `Shareable link for "${eventName}" copied to clipboard.`,
    });
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 20px 80px 20px', position: 'relative' }}>
      
      {/* Background Matrix Constellation Nodes */}
      <ConstellationBackground />

      {/* Flagship Hero Section — ONLY the Flagship Event is displayed here */}
      <section className="event-hero" aria-labelledby="event-hero-title">
        <div className="event-hero-copy">
          {/* Hero Title */}
          <h1 id="event-hero-title" style={{ marginTop: '0', fontSize: 'clamp(32px, 5.5vw, 54px)', lineHeight: '1.15', fontWeight: '900', color: 'var(--eventra-ink, #29304A)', letterSpacing: '-0.03em' }}>
            {eventName}{' '}
            <span style={{ color: '#596EE6', display: 'block', fontSize: 'clamp(22px, 3.8vw, 36px)', fontWeight: '800', marginTop: '6px' }}>
              {eventTagline ? `— ${eventTagline}` : `(${eventCategory})`}
            </span>
          </h1>

          {/* Hero Description */}
          <p className="event-hero-description" style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--text-muted, #5C6479)', margin: '18px 0 24px 0', maxWidth: '600px' }}>
            {eventDescription}
          </p>

          {/* Key Facts Pill Grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '28px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#FFFFFF', border: '1px solid #E2E8F8', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: '700', color: '#29304A', boxShadow: '0 2px 6px rgba(41, 48, 74, 0.04)' }}>
              <Calendar size={15} color="#596EE6" />
              <span>{eventDate}</span>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#FFFFFF', border: '1px solid #E2E8F8', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: '700', color: '#29304A', boxShadow: '0 2px 6px rgba(41, 48, 74, 0.04)' }}>
              <Clock size={15} color="#596EE6" />
              <span>{eventTime}</span>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#FFFFFF', border: '1px solid #E2E8F8', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: '700', color: '#29304A', boxShadow: '0 2px 6px rgba(41, 48, 74, 0.04)' }}>
              <MapPin size={15} color="#596EE6" />
              <span>{eventVenue}{venueHall ? ` (${venueHall})` : ''}</span>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: '#FFFFFF', border: '1px solid #E2E8F8', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: '700', color: '#29304A', boxShadow: '0 2px 6px rgba(41, 48, 74, 0.04)' }}>
              <Users size={15} color="#596EE6" />
              <span>{totalCapacity} Seats</span>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', background: isFree ? '#ECFDF5' : '#EEF0FF', border: isFree ? '1px solid #A7F3D0' : '1px solid #DDE3FF', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: '800', color: isFree ? '#059669' : '#596EE6' }}>
              <Ticket size={15} />
              <span>{feeDisplay}</span>
            </div>
          </div>

          {/* Hero Action Buttons */}
          <div className="event-hero-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => onNavigateToRegister(effectiveId)}
              className="event-hero-cta"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '13px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #596EE6 0%, #475AC4 100%)',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: '800',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 18px rgba(89, 110, 230, 0.35)',
              }}
            >
              <Ticket size={18} />
              <span>Get Your Pass ({isFree ? 'Free' : `₹${entryFee}`})</span>
              <ArrowUpRight size={16} />
            </button>

            {/* Event Details Button — Opens in Separate Window */}
            <button
              type="button"
              onClick={handleOpenDetails}
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '13px 22px',
                borderRadius: '12px',
                background: '#FFFFFF',
                border: '1.5px solid #596EE6',
                color: '#596EE6',
                fontSize: '14px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(89, 110, 230, 0.1)',
              }}
              title="Open full event schedule, tracks, rules, and contact info in a separate window"
            >
              <span>Event Details</span>
              <ArrowUpRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleShareCurrentEvent}
              className="btn btn-ghost"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#5C6479',
                cursor: 'pointer',
              }}
              title="Copy shareable link"
            >
              <Share2 size={15} />
              <span>Share Event</span>
            </button>
          </div>

          {/* Host Branding */}
          <div className="event-hero-host" style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '32px' }}>
            <img src="/eventra-logo.svg" alt="Eventra" style={{ height: '32px', width: 'auto' }} />
            <span className="event-hero-host-divider" style={{ width: '1px', height: '24px', background: '#DDE3FF' }} />
            <span style={{ fontSize: '13px', color: '#5C6479' }}>
              <small style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: '800', color: '#596EE6' }}>Flagship Organized By</small>
              <strong style={{ color: '#29304A', fontSize: '14px' }}>{clubName || organizerName || collegeName || 'Eventra Operations'}</strong>
            </span>
          </div>
        </div>

        {/* 3D Interactive Hero Art Card */}
        <div className="event-hero-art" onPointerMove={handleHeroPointerMove} onPointerLeave={() => setHeroTilt({ x: 0, y: 0 })}>
          <div
            className="event-hero-image"
            onClick={handleOpenDetails}
            style={{
              transform: `perspective(1200px) rotateX(${heroTilt.x}deg) rotateY(${heroTilt.y}deg)`,
              cursor: 'pointer',
              position: 'relative',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 24px 50px rgba(41, 48, 74, 0.15)',
              border: '2px solid rgba(89, 110, 230, 0.25)',
            }}
            title="Click to view full event details in separate window"
          >
            <img src={bannerUrl} alt={eventName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div className="event-hero-image-shade" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(41, 48, 74, 0.1) 0%, rgba(41, 48, 74, 0.85) 100%)' }} />
            
            {/* Topline Badge */}
            <div className="event-hero-image-topline" style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#FFFFFF', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '800', color: '#29304A', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                <Crown size={12} color="#F59E0B" /> FLAGSHIP
              </span>
              <span style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#FFFFFF', padding: '4px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '700' }}>
                {mode === 'online' ? 'VIRTUAL' : 'CAMPUS LIVE'}
              </span>
            </div>

            {/* Bottom Caption with Event Details Pill */}
            <div className="event-hero-image-caption" style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', color: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <span style={{ fontSize: '18px', fontWeight: '900', display: 'block', textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}>{eventName}</span>
                <small style={{ fontSize: '12px', color: '#E2E8F8', opacity: 0.9 }}>{eventDate} • {feeDisplay}</small>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#596EE6', color: '#FFFFFF', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', boxShadow: '0 4px 12px rgba(89, 110, 230, 0.4)' }}>
                <span>Event Details</span>
                <ArrowUpRight size={13} />
              </span>
            </div>
          </div>

          {/* Floating Badge 1: Trophy / Pass */}
          <div className="event-float-card event-prize-card" onClick={handleOpenDetails} style={{ cursor: 'pointer' }}>
            <span className="event-float-icon"><Trophy size={18} /></span>
            <span>
              <small>{eventCategory}</small>
              <strong>{isFree ? 'Free Pass' : feeDisplay}</strong>
            </span>
            <ArrowUpRight size={15} className="event-float-arrow" />
          </div>

          {/* Floating Badge 2: Open Details */}
          <div className="event-float-card event-tracks-card" onClick={handleOpenDetails} style={{ cursor: 'pointer' }}>
            <span className="event-track-orbit"><Sparkles size={16} /></span>
            <span>
              <small>Explore Agenda & Tracks</small>
              <strong>View Details ↗</strong>
            </span>
            <ArrowUpRight size={15} className="event-float-arrow" />
          </div>
        </div>
      </section>

      {/* Proof Metric Strip */}
      <div className="event-proof-strip" aria-label={`${eventName} highlights`}>
        <div>
          <strong>{eventCategory}</strong>
          <small>{mode === 'online' ? 'Virtual Format' : mode === 'hybrid' ? 'Hybrid Format' : 'Live In-Person Experience'}</small>
        </div>
        <div>
          <strong>{isFree ? '100% FREE' : `₹${entryFee}`}</strong>
          <small>official entry pass</small>
        </div>
        <div>
          <strong>{totalCapacity}<span>+</span></strong>
          <small>participant seat capacity</small>
        </div>
        <div>
          <strong>HMAC-SHA256</strong>
          <small>tamper-proof ticket security</small>
        </div>
      </div>

      {/* =========================================================================
          ABOUT EVENTRA STARTUP SECTION
          Explains what Eventra is: The modern operating system for campus & enterprise events
          ========================================================================= */}
      <section id="about-section" style={{ margin: '40px 0 70px 0', position: 'relative', zIndex: 1 }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid #E2E8F8',
          boxShadow: '0 12px 40px rgba(41, 48, 74, 0.06)',
          padding: 'clamp(28px, 5vw, 56px)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle Ambient Radial Glow */}
          <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '380px', height: '380px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(89, 110, 230, 0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          
          {/* Section Header */}
          <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 48px auto' }}>
            <div 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '5px 16px', 
                borderRadius: '9999px', 
                background: '#EEF0FF', 
                border: '1px solid #DDE3FF', 
                color: '#596EE6', 
                fontSize: '11px', 
                fontWeight: '900', 
                letterSpacing: '0.08em', 
                textTransform: 'uppercase', 
                marginBottom: '16px' 
              }}
            >
              <Zap size={13} color="#596EE6" />
              <span>THE EVENTRA PLATFORM</span>
            </div>

            <h2 style={{ fontSize: 'clamp(28px, 4.5vw, 42px)', fontWeight: '900', color: '#29304A', letterSpacing: '-0.025em', lineHeight: '1.2', marginBottom: '14px' }}>
              The Operating System for Campus & Enterprise Events
            </h2>

            <p style={{ fontSize: '16px', color: '#5C6479', lineHeight: '1.65', margin: 0 }}>
              Eventra replaces chaotic Google Forms, forged screenshots, and manual gate spreadsheets with an integrated, tamper-proof operating system designed for modern universities and hackathon organizers.
            </p>
          </div>

          {/* 6-Feature Architectural Bento Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            
            {/* Feature 1: Cryptographic Anti-Forgery Passes */}
            <div style={{ background: '#F8FAFF', borderRadius: '18px', padding: '28px', border: '1px solid #E2E8F8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#596EE6', marginBottom: '18px', border: '1px solid #DDE3FF' }}>
                  <Lock size={22} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#29304A', marginBottom: '8px' }}>
                  Zero-Forgery HMAC QR Passes
                </h3>
                <p style={{ fontSize: '14px', color: '#5C6479', lineHeight: '1.6' }}>
                  Every pass is signed with HMAC-SHA256 mathematical tokens tied to attendee credentials. Screenshots, forwarded tickets, or counterfeits fail gate verification instantly.
                </p>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#596EE6' }}>
                <CheckCircle2 size={14} color="#596EE6" /> Cryptographic Integrity Guaranteed
              </div>
            </div>

            {/* Feature 2: Sub-100ms In-Browser Camera Scanner */}
            <div style={{ background: '#F8FAFF', borderRadius: '18px', padding: '28px', border: '1px solid #E2E8F8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', marginBottom: '18px', border: '1px solid #A7F3D0' }}>
                  <Zap size={22} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#29304A', marginBottom: '8px' }}>
                  Sub-100ms Edge Camera Scanner
                </h3>
                <p style={{ fontSize: '14px', color: '#5C6479', lineHeight: '1.6' }}>
                  Hardware-accelerated web scanning runs directly inside Safari and Chrome on any smartphone. Zero mobile app installations required for gate staff or volunteers.
                </p>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#059669' }}>
                <CheckCircle2 size={14} color="#059669" /> Express Lines • Works Offline
              </div>
            </div>

            {/* Feature 3: Direct-to-Bank Razorpay Settlement */}
            <div style={{ background: '#F8FAFF', borderRadius: '18px', padding: '28px', border: '1px solid #E2E8F8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', marginBottom: '18px', border: '1px solid #FDE68A' }}>
                  <CreditCard size={22} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#29304A', marginBottom: '8px' }}>
                  100% Direct Razorpay Settlement
                </h3>
                <p style={{ fontSize: '14px', color: '#5C6479', lineHeight: '1.6' }}>
                  Zero platform escrow delay or hidden cuts. Payments route straight into your organization’s Razorpay account with automated instant pass issuance upon webhook capture.
                </p>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#D97706' }}>
                <CheckCircle2 size={14} color="#D97706" /> Live Revenue Reconciled
              </div>
            </div>

            {/* Feature 4: Automated WhatsApp & Email Ticket Dispatch */}
            <div style={{ background: '#F8FAFF', borderRadius: '18px', padding: '28px', border: '1px solid #E2E8F8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A', marginBottom: '18px', border: '1px solid #BBF7D0' }}>
                  <Smartphone size={22} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#29304A', marginBottom: '8px' }}>
                  Instant WhatsApp & Email Dispatch
                </h3>
                <p style={{ fontSize: '14px', color: '#5C6479', lineHeight: '1.6' }}>
                  Attendees receive high-resolution QR entry passes, venue maps, and calendar invites pushed directly to WhatsApp and their inbox within 3 seconds of registration.
                </p>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#16A34A' }}>
                <CheckCircle2 size={14} color="#16A34A" /> Automated Delivery Engine
              </div>
            </div>

            {/* Feature 5: Multi-Event & Multi-Track University Fest Architecture */}
            <div style={{ background: '#F8FAFF', borderRadius: '18px', padding: '28px', border: '1px solid #E2E8F8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED', marginBottom: '18px', border: '1px solid #DDD6FE' }}>
                  <Layers size={22} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#29304A', marginBottom: '8px' }}>
                  Multi-Event & Multi-Track Engine
                </h3>
                <p style={{ fontSize: '14px', color: '#5C6479', lineHeight: '1.6' }}>
                  Host entire university tech fests with sub-events, separate club coordinators, distinct tracks, tiered ticketing, and custom registration question builders.
                </p>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#7C3AED' }}>
                <CheckCircle2 size={14} color="#7C3AED" /> Granular Staff Delegation
              </div>
            </div>

            {/* Feature 6: Live Revenue & Attendance Telemetry */}
            <div style={{ background: '#F8FAFF', borderRadius: '18px', padding: '28px', border: '1px solid #E2E8F8', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB', marginBottom: '18px', border: '1px solid #BFDBFE' }}>
                  <TrendingUp size={22} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#29304A', marginBottom: '8px' }}>
                  Live Revenue & Gate Telemetry
                </h3>
                <p style={{ fontSize: '14px', color: '#5C6479', lineHeight: '1.6' }}>
                  Monitor attendance rates, ticket sales velocity, check-in timestamps, and Razorpay captured volume in real time with 1-click CSV exports.
                </p>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#2563EB' }}>
                <CheckCircle2 size={14} color="#2563EB" /> 100% Accurate Dashboard
              </div>
            </div>

          </div>

          {/* Startup Trust Ribbon */}
          <div style={{ borderTop: '1px solid #E2E8F8', paddingTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: '#29304A' }}>
                Want to organize your college hackathon or fest on Eventra?
              </div>
              <div style={{ fontSize: '13px', color: '#5C6479', marginTop: '2px' }}>
                Create your first event in 2 minutes with custom poster, venue, ticket tiers, and instant live launch.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <a
                href="#events-hub-section"
                className="btn btn-secondary"
                style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', textDecoration: 'none' }}
              >
                <span>Browse All Campus Events</span>
                <ChevronRight size={14} />
              </a>

              <a
                href="#dashboard"
                className="btn btn-primary"
                style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '800', textDecoration: 'none' }}
              >
                <span>Organizer Dashboard</span>
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* Instant Digital Pass Retrieval Search & Generated Pass Portal */}
      <section id="lookup-section" style={{ maxWidth: '820px', margin: '0 auto 60px auto', position: 'relative', zIndex: 1 }}>
        <div className="glass-card" style={{ padding: '32px', border: '1px solid rgba(209, 165, 80, 0.4)', background: 'linear-gradient(145deg, #0e1320 0%, #080b12 100%)' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div className="cyber-node-badge" style={{ marginBottom: '8px' }}>
              <span>⚡</span> PASS ACCESS PORTAL
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.3px' }}>
              Already Registered? Access Your Pass
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Enter your registered email or Pass ID to retrieve and download your official entry pass.
            </p>
          </div>

          <form onSubmit={handleLookup} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: retrievedPass ? '24px' : '0' }}>
            <input
              type="text"
              className="input-control"
              placeholder="e.g. aditya.renake@outlook.com or HS26-9B4D2E"
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              style={{ flex: 1, minWidth: '220px', padding: '12px 16px', fontSize: '14px' }}
              required
            />
            <button type="submit" className="btn btn-dyp" style={{ padding: '12px 24px' }} disabled={isLookingUp}>
              <Search size={15} /> {isLookingUp ? 'Searching...' : 'Retrieve Pass'}
            </button>
          </form>

          {/* Generated Real Pass Display (Visible ONLY when pass is retrieved) */}
          {retrievedPass && (
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '24px', animation: 'fadeIn 0.3s ease' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#22c55e' }}>
                  <CheckCircle2 size={15} color="#22c55e" /> VERIFIED PASS GENERATED
                </div>
                <button
                  onClick={() => {
                    setRetrievedPass(null);
                    setLookupInput('');
                  }}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                >
                  Look up another pass
                </button>
              </div>

              {/* Multi-Pass Event Switcher if user is registered for multiple events */}
              {retrievedPasses.length > 1 && (
                <div style={{ marginBottom: '22px', textAlign: 'center', background: 'rgba(89, 110, 230, 0.08)', border: '1px solid var(--border-subtle)', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', marginBottom: '10px' }}>
                    🎟️ You have {retrievedPasses.length} registered campus events (Click to switch pass):
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {retrievedPasses.map((p) => {
                      const isCurrent = retrievedPass?.uniqueId === p.uniqueId;
                      return (
                        <button
                          key={p.uniqueId}
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            setRetrievedPass(p);
                          }}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            border: isCurrent ? '1px solid var(--eventra-indigo)' : '1px solid var(--border-subtle)',
                            background: isCurrent ? 'var(--eventra-indigo)' : 'var(--bg-card)',
                            color: isCurrent ? '#FFFFFF' : 'var(--eventra-ink)',
                            boxShadow: isCurrent ? '0 4px 14px rgba(89, 110, 230, 0.35)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          🎟️ {p.eventName || 'Campus Event'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Holographic Generated Pass Ticket */}
              <div className="holo-ticket" style={{ maxWidth: '460px', margin: '0 auto', boxShadow: '0 10px 40px rgba(0,0,0,0.6)' }}>
                <div className="holo-inner" style={{ padding: '22px' }}>
                  
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <DYPDPULogo height={20} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#fff', textTransform: 'uppercase' }}>
                          {retrievedPass.eventName || eventName}
                        </div>
                        <div style={{ fontSize: '9px', color: '#a8b4ff', fontWeight: '800' }}>OFFICIAL VERIFIED ENTRY PASS</div>
                      </div>
                    </div>
                    <span className="badge badge-emerald" style={{ fontSize: '10px' }}>{retrievedPass.ticketType}</span>
                  </div>

                  {/* Attendee Name */}
                  <div style={{ textAlign: 'center', margin: '14px 0' }}>
                    <div style={{ fontSize: '22px', fontWeight: '900', color: '#ffffff' }}>
                      {retrievedPass.name}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{retrievedPass.email}</div>
                    
                    {retrievedPass.teamName && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontSize: '11px', color: 'var(--aces-cyan)', background: 'rgba(34, 211, 238, 0.12)', padding: '2px 10px', borderRadius: '999px' }}>
                        <Users size={11} /> Team: <strong>{retrievedPass.teamName}</strong>
                      </div>
                    )}
                  </div>

                  {/* QR Code Container */}
                  <div style={{ textAlign: 'center', margin: '16px 0' }}>
                    <div style={{ background: '#ffffff', padding: '14px', borderRadius: '14px', display: 'inline-block', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                      <img
                        src={retrievedPass.qrCodeDataUrl}
                        alt={`QR Pass for ${retrievedPass.uniqueId}`}
                        style={{ width: '180px', height: '180px', display: 'block' }}
                      />
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#596EE6', fontWeight: '900', marginTop: '10px', letterSpacing: '1px' }}>
                      {retrievedPass.uniqueId}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#10b981', marginTop: '4px', fontWeight: '700' }}>
                      <ShieldCheck size={13} /> HMAC-SHA256 Cryptographic Signature Verified
                    </div>
                  </div>

                  {/* Pass Delivery Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppForPass(retrievedPass)}
                      className="btn"
                      style={{ background: '#25D366', color: '#ffffff', fontWeight: '800', width: '100%', padding: '12px 18px', fontSize: '13px', boxShadow: '0 4px 16px rgba(37, 211, 102, 0.35)' }}
                    >
                      <Smartphone size={16} /> Get Pass on WhatsApp
                    </button>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleDownloadQRForPass(retrievedPass)}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                      >
                        <Download size={14} /> Save QR Image
                      </button>

                      <button
                        type="button"
                        onClick={() => onNavigateToPass(retrievedPass.uniqueId)}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                      >
                        <ExternalLink size={14} /> View Full Pass
                      </button>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>
      </section>

      {/* Eventra Discovery Section — Lists All Campus Events with Flagship badge and New Window details link */}
      <EventsDiscoverySection
        activeEventId={effectiveId}
        onSelectEvent={(ev) => {
          sounds.playClick();
          window.open(`/#event/${encodeURIComponent(ev.slug || ev.id || ev.eventId)}`, '_blank');
        }}
        onRegisterEvent={(evId) => onNavigateToRegister?.(evId)}
        onNavigateToLookup={() => {
          const el = document.getElementById('lookup-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onShowToast={onShowToast}
      />

      {/* Minimal Footer */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/eventra-logo.svg"
            alt="Eventra"
            style={{ height: '28px', width: 'auto', display: 'block' }}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            © 2026 Eventra • Zero-Tamper Event Management Platform
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--text-muted)' }}>
          <span style={{ fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
            Lead Operations:
          </span>

          {/* Aditya Renake */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <strong style={{ color: '#ffffff', fontWeight: '800' }}>Aditya Renake</strong>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <a 
                href="https://instagram.com/where.aditya" 
                target="_blank" 
                rel="noreferrer" 
                title="Instagram: @where.aditya"
                style={{
                  color: '#e1306c',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(225, 48, 108, 0.12)',
                  border: '1px solid rgba(225, 48, 108, 0.25)',
                  padding: '4px',
                  borderRadius: '6px',
                  textDecoration: 'none'
                }}
              >
                <Instagram size={13} />
              </a>
              <a 
                href="https://github.com/aditya-renake" 
                target="_blank" 
                rel="noreferrer" 
                title="GitHub Profile"
                style={{
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '4px',
                  borderRadius: '6px',
                  textDecoration: 'none'
                }}
              >
                <Github size={13} />
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};
