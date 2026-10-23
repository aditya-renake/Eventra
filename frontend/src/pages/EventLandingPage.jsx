import React, { useState, useEffect, useCallback } from 'react';
import { 
  ExternalLink, 
  Search, 
  Cpu, 
  Lock, 
  Coins, 
  Code2, 
  Rocket, 
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
  Mail,
  Phone,
  User,
  Building2,
  Globe,
  FileText,
  Layers,
  Share2
} from 'lucide-react';
import { DYPDPULogo } from '../components/CollegeLogos';
import { ConstellationBackground } from '../components/ConstellationBackground';
import { GallerySection } from '../components/GallerySection';
import { EventsDiscoverySection } from '../components/EventsDiscoverySection';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

const TRACK_ICONS = [Cpu, Lock, Coins, Code2, Rocket, Layers, Sparkles];

const DEFAULT_HACKATHON_TRACKS = [
  {
    title: 'AI & Agentic Systems',
    desc: 'Autonomous multi-agent swarms, local LLM tooling, automated workflows, and self-healing systems.',
    icon: Cpu,
    prize: '₹4,00,000',
    tag: 'AI / ML',
  },
  {
    title: 'Cybersecurity & Privacy',
    desc: 'Zero-knowledge proofs, automated vulnerability scanners, secure enclaves, and cryptographic primitives.',
    icon: Lock,
    prize: '₹3,50,000',
    tag: 'SECURITY',
  },
  {
    title: 'Web3 & Decentralized Tech',
    desc: 'Account abstraction, cross-chain infrastructure, decentralized storage, and resilient smart contracts.',
    icon: Coins,
    prize: '₹3,50,000',
    tag: 'WEB3',
  },
  {
    title: 'Cloud & Distributed Systems',
    desc: 'High-throughput stream processing, edge computing, distributed storage, and serverless architectures.',
    icon: Code2,
    prize: '₹2,50,000',
    tag: 'CLOUD',
  },
  {
    title: 'Open Innovation & Campus Tech',
    desc: 'Smart campus systems, healthcare tech, developer productivity, and civic technology tools.',
    icon: Rocket,
    prize: '₹1,50,000',
    tag: 'OPEN',
  },
];

const DEFAULT_HACKATHON_SCHEDULE = [
  { 
    day: 'DAY 1',
    time: '07:30 AM', 
    title: 'Express Gate Check-in & Breakfast', 
    desc: 'Scan your digital QR pass at the main entrance to collect your badge and kit.' 
  },
  { 
    day: 'DAY 1',
    time: '09:30 AM', 
    title: 'Inauguration & Track Release', 
    desc: 'Official keynote by dignitaries and release of problem statements in the Main Auditorium.' 
  },
  { 
    day: 'DAY 1',
    time: '11:00 AM', 
    title: '48-Hour Hackathon Commences ⚡', 
    desc: 'Hacking begins with Gigabit Wi-Fi, high-density lab access, and uninterrupted power.' 
  },
  { 
    day: 'DAY 2',
    time: '02:00 PM', 
    title: 'Midway Mentor Review', 
    desc: '1-on-1 architecture reviews and dry runs with industry engineers and startup founders.' 
  },
  { 
    day: 'DAY 3',
    time: '11:00 AM', 
    title: 'Code Freeze & Project Submission', 
    desc: 'GitHub repositories frozen and demo verification completed.' 
  },
  { 
    day: 'DAY 3',
    time: '03:00 PM', 
    title: 'Grand Finale & Award Ceremony', 
    desc: 'Top team live stage pitches and prize distribution.' 
  },
];

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
  const [eventConfig, setEventConfig] = useState(null);
  const [activeEvent, setActiveEvent] = useState(null);
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);

  const loadLandingData = useCallback(async () => {
    try {
      const cfgRes = await api.event.getConfig().catch(() => null);
      const cfg = cfgRes?.data || null;
      if (cfg) setEventConfig(cfg);

      const targetId = selectedEventId || cfg?.activeEventId || 'eventra-2026';
      if (targetId && targetId !== '[object Object]') {
        const evRes = await api.events.getById(targetId).catch(() => null);
        if (evRes?.data) {
          setActiveEvent(evRes.data);
          setActiveTrackIndex(0);
          return;
        }
      }
      if (cfg) {
        setActiveEvent({
          id: cfg.activeEventId || 'eventra-2026',
          eventId: cfg.activeEventId || 'eventra-2026',
          name: cfg.eventName || 'Eventra 2026',
          tagline: cfg.eventTagline || '',
          description: cfg.eventDescription || '',
          category: cfg.category || 'Hackathon',
          structureType: cfg.structureType || 'single',
          collegeName: cfg.collegeName || '',
          clubName: cfg.clubName || '',
          clubCode: cfg.clubCode || '',
          mode: cfg.mode || 'in_person',
          startDate: cfg.startDate || '',
          endDate: cfg.endDate || '',
          dateDisplay: cfg.eventDate || 'October 16 – 18, 2026',
          timeDisplay: cfg.eventTime || '09:00 AM IST',
          venue: cfg.eventVenue || 'DIT Pune, India',
          venueHall: cfg.venueHall || '',
          mapUrl: cfg.mapUrl || '',
          meetingUrl: cfg.meetingUrl || '',
          organizerName: cfg.organizerName || '',
          organizerRole: cfg.organizerRole || '',
          organizerEmail: cfg.organizerEmail || '',
          organizerPhone: cfg.organizerPhone || '',
          alternatePOC: cfg.alternatePOC || '',
          themeColor: cfg.themeColor || '#596EE6',
          bannerUrl: cfg.bannerUrl || '/gallery/futuristic_hackathon_1775424262777.png',
          pricingType: cfg.pricingType || 'paid',
          entryFee: cfg.entryFee !== undefined ? cfg.entryFee : 5,
          feeDisplay: cfg.feeDisplay || '₹5 Entry Pass',
          totalCapacity: cfg.totalCapacity || 500,
          ticketTiers: cfg.ticketTiers || ['Standard Pass'],
          tracks: cfg.tracks || [],
          subEvents: cfg.subEvents || [],
          whatsappUrl: cfg.whatsappUrl || '',
          discordUrl: cfg.discordUrl || '',
          brochureUrl: cfg.brochureUrl || '',
          socialUrl: cfg.socialUrl || '',
        });
      }
    } catch (e) {
      console.warn('Error loading landing data:', e);
    }
  }, [selectedEventId]);

  useEffect(() => {
    loadLandingData();
    const handleEventUpdated = () => loadLandingData();
    window.addEventListener('eventra:events-updated', handleEventUpdated);
    return () => window.removeEventListener('eventra:events-updated', handleEventUpdated);
  }, [loadLandingData]);

  // Derived active event properties (falling back gracefully only if nothing is configured)
  const effectiveEventId = activeEvent?.id || activeEvent?.eventId || eventConfig?.activeEventId || 'eventra-2026';
  const isDefaultHackathon = effectiveEventId === 'eventra-2026' && (!activeEvent?.name || activeEvent.name === 'Eventra 2026');

  const eventName = activeEvent?.name || eventConfig?.eventName || 'Eventra 2026';
  const eventTagline = activeEvent?.tagline || eventConfig?.eventTagline || '';
  const eventDescription = activeEvent?.description || eventConfig?.eventDescription ||
    'A hands-on campus experience for curious minds, bold builders, and the teams who make them happen.';
  const eventCategory = activeEvent?.category || eventConfig?.category || 'Hackathon';
  const eventDate = activeEvent?.dateDisplay || eventConfig?.eventDate || 'October 16–18, 2026';
  const eventTime = activeEvent?.timeDisplay || eventConfig?.eventTime || '09:00 AM IST';
  const eventVenue = activeEvent?.venue || eventConfig?.eventVenue || 'DIT Pune, India';
  const venueHall = activeEvent?.venueHall || eventConfig?.venueHall || '';
  const collegeName = activeEvent?.collegeName || eventConfig?.collegeName || '';
  const clubName = activeEvent?.clubName || eventConfig?.clubName || '';
  const clubCode = activeEvent?.clubCode || eventConfig?.clubCode || '';
  const organizerName = activeEvent?.organizerName || eventConfig?.organizerName || '';
  const organizerRole = activeEvent?.organizerRole || eventConfig?.organizerRole || '';
  const organizerEmail = activeEvent?.organizerEmail || eventConfig?.organizerEmail || '';
  const organizerPhone = activeEvent?.organizerPhone || eventConfig?.organizerPhone || '';
  const alternatePOC = activeEvent?.alternatePOC || eventConfig?.alternatePOC || '';
  const mapUrl = activeEvent?.mapUrl || eventConfig?.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(eventVenue)}`;
  const meetingUrl = activeEvent?.meetingUrl || eventConfig?.meetingUrl || '';
  const mode = activeEvent?.mode || eventConfig?.mode || 'in_person';
  const totalCapacity = activeEvent?.totalCapacity || eventConfig?.totalCapacity || 250;
  const entryFee = activeEvent?.entryFee !== undefined ? Number(activeEvent.entryFee) : (eventConfig?.entryFee !== undefined ? Number(eventConfig.entryFee) : 5);
  const isFree = activeEvent?.pricingType === 'free' || entryFee === 0;
  const feeDisplay = isFree ? 'Free Entry Pass' : (activeEvent?.feeDisplay || `₹${entryFee} Entry Pass`);
  const bannerUrl = activeEvent?.bannerUrl || eventConfig?.bannerUrl || '/gallery/futuristic_hackathon_1775424262777.png';
  const whatsappUrl = activeEvent?.whatsappUrl || eventConfig?.whatsappUrl || '';
  const discordUrl = activeEvent?.discordUrl || eventConfig?.discordUrl || '';
  const brochureUrl = activeEvent?.brochureUrl || eventConfig?.brochureUrl || '';
  const socialUrl = activeEvent?.socialUrl || eventConfig?.socialUrl || '';

  // Dynamic Tracks or Sub-Events
  const subEvents = Array.isArray(activeEvent?.subEvents) ? activeEvent.subEvents : [];
  const hasSubEvents = subEvents.length > 0;

  const tracks = React.useMemo(() => {
    if (hasSubEvents) {
      return subEvents.map((sub, idx) => ({
        title: sub.name,
        desc: `${sub.category || 'Activity'} • Coordinator: ${sub.coordinator || organizerName || 'Event Team'} • Capacity: ${sub.seats || 60} seats`,
        icon: TRACK_ICONS[idx % TRACK_ICONS.length],
        prize: Number(sub.fee) === 0 ? 'Free' : `₹${sub.fee}`,
        tag: (sub.category || `SUB ${idx + 1}`).toUpperCase().slice(0, 14),
        isSubEvent: true,
        subEvent: sub,
      }));
    }

    const customTracks = Array.isArray(activeEvent?.tracks) && activeEvent.tracks.length > 0
      ? activeEvent.tracks
      : (typeof activeEvent?.tracks === 'string' && activeEvent.tracks.trim()
          ? activeEvent.tracks.split(',').map((t) => t.trim()).filter(Boolean)
          : []);

    if (customTracks.length > 0 && !isDefaultHackathon) {
      return customTracks.map((tName, idx) => ({
        title: tName,
        desc: `Official track/domain for ${eventName} (${eventCategory}) at ${eventVenue}.`,
        icon: TRACK_ICONS[idx % TRACK_ICONS.length],
        prize: feeDisplay,
        tag: tName.toUpperCase().slice(0, 14),
      }));
    }

    return DEFAULT_HACKATHON_TRACKS;
  }, [hasSubEvents, subEvents, activeEvent?.tracks, isDefaultHackathon, eventName, eventCategory, eventVenue, feeDisplay, organizerName]);

  const activeTrack = tracks[activeTrackIndex] || tracks[0] || DEFAULT_HACKATHON_TRACKS[0];
  const ActiveTrackIcon = activeTrack.icon || Sparkles;

  // Dynamic Schedule
  const schedule = React.useMemo(() => {
    if (isDefaultHackathon) {
      return DEFAULT_HACKATHON_SCHEDULE;
    }

    const items = [
      {
        day: 'STEP 1',
        time: eventTime || 'Check-In',
        title: `Gate Check-In & Pass Verification — ${eventName}`,
        desc: `Present your cryptographic Eventra QR Pass at ${eventVenue}${venueHall ? ` (${venueHall})` : ''} for instant verification.`,
      },
      {
        day: 'MAIN',
        time: eventDate,
        title: `${eventName} (${eventCategory})`,
        desc: eventDescription || eventTagline || `Main sessions and activities hosted by ${clubName || organizerName || 'the organizing team'}.`,
      },
    ];

    if (hasSubEvents) {
      subEvents.forEach((sub, idx) => {
        items.push({
          day: `ACTIVITY ${idx + 1}`,
          time: `${sub.seats || 60} Seats`,
          title: `${sub.name} (${sub.category})`,
          desc: `Entry: ${Number(sub.fee) === 0 ? 'Free' : `₹${sub.fee}`} • Coordinator: ${sub.coordinator || organizerName || 'Club Lead'}`,
        });
      });
    }

    items.push({
      day: 'CLOSING',
      time: 'Valedictory',
      title: 'Valedictory, Certificates & Winner Announcements',
      desc: `Closing ceremony and digital certificate/pass verification by ${clubName || collegeName || 'Eventra Operations'}.`,
    });

    return items;
  }, [isDefaultHackathon, eventTime, eventName, eventVenue, venueHall, eventDate, eventCategory, eventDescription, eventTagline, clubName, organizerName, hasSubEvents, subEvents, collegeName]);

  const handleHeroPointerMove = (event) => {
    if (event.pointerType === 'touch') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
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
        setRetrievedPass(res.data);
        onShowToast({
          type: 'success',
          title: 'Pass Verified! 🎟️',
          message: `Found entry pass for ${res.data.name}. You can now send it to WhatsApp or download it.`,
        });
      }
    } catch (err) {
      sounds.playError();
      setRetrievedPass(null);
      onShowToast({
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
    if (onShowToast) {
      onShowToast({
        type: 'success',
        title: 'Opening WhatsApp 📱',
        message: 'Pass details and QR link sent to WhatsApp.',
      });
    }
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
    const shareUrl = `${window.location.origin}/#event/${encodeURIComponent(activeEvent?.slug || effectiveEventId)}`;
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

      {/* Event hero */}
      <section className="event-hero" aria-labelledby="event-hero-title">
        <div className="event-hero-copy">
          <div className="event-hero-kicker" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="event-hero-kicker-dot" />
            <span>{eventName}</span>
            <span className="event-hero-kicker-divider">/</span>
            <span>{clubName || collegeName || eventCategory}</span>
            {clubCode && (
              <span style={{ fontSize: '10px', background: '#EEF0FF', color: '#596EE6', padding: '2px 8px', borderRadius: '999px', fontWeight: '800', border: '1px solid #DDE3FF' }}>
                {clubCode}
              </span>
            )}
          </div>

          <h1 id="event-hero-title">
            {isDefaultHackathon ? (
              <>Make your next big idea <span>real in 48 hours.</span></>
            ) : (
              <>
                {eventName}{' '}
                <span>{eventTagline ? `— ${eventTagline}` : `(${eventCategory})`}</span>
              </>
            )}
          </h1>

          <p className="event-hero-description">
            {eventDescription}
          </p>

          <div className="event-track-picker" role="group" aria-label={hasSubEvents ? 'Choose a sub-event' : 'Choose a track'}>
            <div className="event-track-picker-heading">
              <span>{hasSubEvents ? 'Explore sub-events & activities' : 'Choose your track / domain'}</span>
              <span>{String(activeTrackIndex + 1).padStart(2, '0')} <i>/</i> {String(tracks.length).padStart(2, '0')}</span>
            </div>
            <div className="event-track-picker-options" role="group" aria-label="Event tracks">
              {tracks.map((track, index) => {
                const TrackIcon = track.icon || Sparkles;
                const isSelected = activeTrackIndex === index;
                return (
                  <button
                    type="button"
                    key={`${track.tag}-${index}`}
                    className={`event-track-chip ${isSelected ? 'is-active' : ''}`}
                    aria-pressed={isSelected}
                    title={track.title}
                    onClick={() => {
                      sounds.playClick();
                      setActiveTrackIndex(index);
                    }}
                  >
                    <TrackIcon size={13} aria-hidden="true" />
                    <span>{track.tag}</span>
                  </button>
                );
              })}
            </div>
            <div key={activeTrack.title} className="event-track-picker-preview" aria-live="polite">
              <span className="event-track-preview-icon"><ActiveTrackIcon size={16} aria-hidden="true" /></span>
              <div>
                <strong>{activeTrack.title}</strong>
                <p>{activeTrack.desc}</p>
              </div>
              <span className="event-track-preview-prize">{activeTrack.prize}</span>
            </div>
          </div>

          <div className="event-hero-meta" style={{ flexWrap: 'wrap', gap: '14px' }}>
            <span><Calendar size={16} /> {eventDate}</span>
            {eventTime && <span><Clock size={16} /> {eventTime}</span>}
            <span><MapPin size={16} /> {eventVenue}{venueHall ? ` (${venueHall})` : ''}</span>
          </div>

          <div className="event-hero-actions" style={{ flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onNavigateToRegister(effectiveEventId)}
              className="event-hero-cta"
            >
              <Ticket size={17} /> Get your pass ({isFree ? 'Free' : `₹${entryFee}`}) <ArrowUpRight size={16} />
            </button>
            <a href="#about-section" className="event-hero-secondary">
              Event details <ArrowUpRight size={15} />
            </a>
            <button
              type="button"
              onClick={handleShareCurrentEvent}
              className="event-hero-secondary"
              style={{ cursor: 'pointer', background: 'transparent' }}
              title="Copy shareable event link"
            >
              <Share2 size={15} /> Share Event
            </button>
          </div>

          <div className="event-hero-host">
            <img src="/eventra-logo.svg" alt="Eventra" style={{ height: '32px', width: 'auto' }} />
            <span className="event-hero-host-divider" />
            <span>
              <small>Organized by</small>
              <strong>{clubName || organizerName || eventName}</strong>
            </span>
          </div>
        </div>

        <div className="event-hero-art" onPointerMove={handleHeroPointerMove} onPointerLeave={() => setHeroTilt({ x: 0, y: 0 })}>
          <div className="event-hero-image" style={{ transform: `perspective(1200px) rotateX(${heroTilt.x}deg) rotateY(${heroTilt.y}deg)` }}>
            <img src={bannerUrl} alt={eventName} />
            <div className="event-hero-image-shade" />
            <div className="event-hero-image-topline">
              <span><Activity size={14} /> {eventCategory.toUpperCase()}</span>
              <span>{mode === 'online' ? 'ONLINE' : (clubCode || 'LIVE ON CAMPUS')}</span>
            </div>
            <div className="event-hero-image-caption">
              <span>{eventName}</span>
              <small>{eventDate} · {feeDisplay}</small>
            </div>
          </div>
          <div className="event-float-card event-prize-card">
            <span className="event-float-icon"><Trophy size={18} /></span>
            <span>
              <small>{isDefaultHackathon ? 'Prize pool' : 'Entry Pass'}</small>
              <strong>{isDefaultHackathon ? '₹15 lakh+' : (isFree ? '100% Free' : `₹${entryFee} Pass`)}</strong>
            </span>
            <ArrowUpRight size={15} className="event-float-arrow" />
          </div>
          <a href="#tracks-section" className="event-float-card event-tracks-card" aria-label={`Explore ${activeTrack.title}`}>
            <span className="event-track-orbit"><Sparkles size={16} /></span>
            <span>
              <small>{activeTrack.tag} · {hasSubEvents ? 'Sub-Event' : 'Track'}</small>
              <strong>{activeTrack.prize}</strong>
            </span>
            <ArrowUpRight size={15} className="event-float-arrow" />
          </a>
        </div>
      </section>

      <div className="event-proof-strip" aria-label={`${eventName} at a glance`}>
        <div>
          <strong>{isDefaultHackathon ? <>48<span>h</span></> : eventCategory}</strong>
          <small>{isDefaultHackathon ? 'to bring an idea to life' : (mode === 'online' ? 'Virtual Event' : mode === 'hybrid' ? 'Hybrid Event' : 'In-Person Campus Event')}</small>
        </div>
        <div>
          <strong>{isDefaultHackathon ? <>₹15L<span>+</span></> : (isFree ? 'FREE' : `₹${entryFee}`)}</strong>
          <small>{isDefaultHackathon ? 'in prizes to chase' : 'official entry pass'}</small>
        </div>
        <div>
          <strong>{tracks.length}</strong>
          <small>{hasSubEvents ? 'sub-events to join' : 'tracks / domains'}</small>
        </div>
        <div>
          <strong>{totalCapacity}<span>+</span></strong>
          <small>participant seat capacity</small>
        </div>
      </div>

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

      {/* Dynamic About Event, POC & Community Channels Section */}
      <section id="about-section" style={{ margin: '0 0 60px 0', position: 'relative', zIndex: 1 }}>
        <div className="glass-card" style={{ padding: '36px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', alignItems: 'flex-start' }}>
            <div>
              <span className="badge badge-dyp" style={{ marginBottom: '10px' }}>
                ABOUT THE {eventCategory.toUpperCase()}
              </span>
              <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '12px' }}>
                {eventName} {eventTagline ? `— ${eventTagline}` : ''}
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '14px', whiteSpace: 'pre-line' }}>
                {eventDescription}
              </p>

              {(collegeName || clubName) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '14px', padding: '12px 16px', borderRadius: '12px', background: '#F8FAFF', border: '1px solid #E2E8F8', fontSize: '13px' }}>
                  {collegeName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#29304A' }}>
                      <Building2 size={15} color="#596EE6" />
                      <span><strong>Institution:</strong> {collegeName}</span>
                    </div>
                  )}
                  {clubName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#29304A' }}>
                      <Users size={15} color="#596EE6" />
                      <span><strong>Organizing Club:</strong> {clubName} {clubCode ? `(${clubCode})` : ''}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Community & Resource Links if configured */}
              {(whatsappUrl || discordUrl || brochureUrl || socialUrl || meetingUrl) && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
                  {whatsappUrl && (
                    <a href={whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontWeight: '700', textDecoration: 'none' }}>
                      <Smartphone size={14} /> Join WhatsApp Group
                    </a>
                  )}
                  {discordUrl && (
                    <a href={discordUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                      <Globe size={14} color="#596EE6" /> Discord / Community
                    </a>
                  )}
                  {brochureUrl && (
                    <a href={brochureUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                      <FileText size={14} color="#596EE6" /> Rulebook / Brochure
                    </a>
                  )}
                  {socialUrl && (
                    <a href={socialUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                      <Instagram size={14} color="#596EE6" /> Official Page
                    </a>
                  )}
                  {meetingUrl && (
                    <a href={meetingUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                      <ExternalLink size={14} /> Join Live Stream
                    </a>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', border: '1px solid rgba(89, 110, 230, 0.2)' }}>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#596EE6' }}>{eventCategory}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '700' }}>
                    {mode === 'online' ? 'Virtual Mode' : mode === 'hybrid' ? 'Hybrid Format' : 'On-Campus Live'}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', border: '1px solid rgba(89, 110, 230, 0.2)' }}>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#29304A' }}>
                    {tracks.length} {hasSubEvents ? 'Activities' : 'Tracks'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '700' }}>
                    {hasSubEvents ? 'Sub-Event Competitions' : 'Focused Domains'}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', border: '1px solid rgba(89, 110, 230, 0.2)' }}>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#596EE6' }}>{totalCapacity} Seats</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '700' }}>Total Capacity</div>
                </div>
                <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#059669' }}>{isFree ? 'Free' : `₹${entryFee}`}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '700' }}>QR Entry Pass</div>
                </div>
              </div>

              {/* Organizer POC Contact Box */}
              {(organizerName || organizerEmail || organizerPhone) && (
                <div className="glass-panel" style={{ padding: '16px 18px', border: '1px solid #DDE3FF', background: '#F8FAFF' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: '#596EE6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                    📞 Event Person of Contact (POC)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#29304A' }}>
                    {organizerName && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={14} color="#596EE6" />
                        <span><strong>{organizerName}</strong> {organizerRole ? `(${organizerRole})` : ''}</span>
                      </div>
                    )}
                    {organizerEmail && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Mail size={14} color="#596EE6" />
                        <a href={`mailto:${organizerEmail}`} style={{ color: '#596EE6', textDecoration: 'none', fontWeight: '600' }}>
                          {organizerEmail}
                        </a>
                      </div>
                    )}
                    {organizerPhone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Phone size={14} color="#596EE6" />
                        <a href={`tel:${organizerPhone}`} style={{ color: '#29304A', textDecoration: 'none', fontWeight: '600' }}>
                          {organizerPhone}
                        </a>
                      </div>
                    )}
                    {alternatePOC && (
                      <div style={{ fontSize: '11px', color: '#5C6479', marginTop: '2px' }}>
                        <strong>Alternate POC:</strong> {alternatePOC}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tracks or Sub-Events Section */}
      <section id="tracks-section" style={{ margin: '0 0 60px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <span className="badge badge-gold" style={{ marginBottom: '8px' }}>
            {hasSubEvents ? 'SUB-EVENTS & ACTIVITIES' : 'EVENT DOMAINS & TRACKS'}
          </span>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px' }}>
            {hasSubEvents ? `${subEvents.length} Sub-Events in ${eventName}` : `${tracks.length} Focused ${eventName} Tracks`}
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {tracks.map((t, idx) => {
            const Icon = t.icon || Sparkles;
            return (
              <div key={idx} className="glass-card" style={{ padding: '22px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#596EE6', border: '1px solid #DDE3FF' }}>
                      <Icon size={20} />
                    </div>
                    <span className="badge badge-dark" style={{ fontSize: '10px', fontFamily: 'var(--font-mono)' }}>
                      {t.tag}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff', marginBottom: '6px' }}>{t.title}</h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.desc}</p>
                </div>
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '700' }}>
                    {isDefaultHackathon ? 'PRIZE POOL' : 'ENTRY PASS'}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '900', color: '#596EE6' }}>{t.prize}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Schedule Section */}
      <section id="schedule-section" style={{ margin: '0 0 60px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <span className="badge badge-dyp" style={{ marginBottom: '8px' }}>{eventDate.toUpperCase()}</span>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px' }}>
            Event Schedule & Milestones
          </h2>
        </div>

        <div className="glass-card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {schedule.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', borderBottom: idx < schedule.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none', paddingBottom: idx < schedule.length - 1 ? '14px' : '0' }}>
                <div style={{ minWidth: '120px' }}>
                  <span className="badge badge-gold" style={{ fontSize: '10px', padding: '2px 8px' }}>
                    {item.day}
                  </span>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#ffffff', fontWeight: '800', marginTop: '4px' }}>
                    {item.time}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Venue & Location */}
      <section id="venue-section" style={{ margin: '0 0 60px 0', position: 'relative', zIndex: 1 }}>
        <div className="glass-card" style={{ padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', border: '1px solid #E2E8F8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#596EE6', border: '1px solid #DDE3FF', flexShrink: 0 }}>
              <MapPin size={22} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                {eventVenue}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {[venueHall, collegeName, eventTime].filter(Boolean).join(' • ') || 'Express QR Check-in Gates'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <Compass size={15} color="#596EE6" /> Open Campus Maps <ArrowUpRight size={13} />
            </a>
            <button
              type="button"
              onClick={() => onNavigateToRegister(effectiveEventId)}
              className="btn btn-primary btn-sm"
            >
              <Ticket size={14} /> Register Now
            </button>
          </div>
        </div>
      </section>

      {/* Eventra Events Discovery Hub */}
      <EventsDiscoverySection
        activeEventId={effectiveEventId}
        onSelectEvent={(ev) => {
          if (onSelectEvent) onSelectEvent(ev);
          else {
            setActiveEvent(ev);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onRegisterEvent={(evId) => onNavigateToRegister?.(evId)}
        onNavigateToLookup={() => {
          const el = document.getElementById('lookup-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onShowToast={onShowToast}
      />

      {/* Gallery Section */}
      <GallerySection />

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
