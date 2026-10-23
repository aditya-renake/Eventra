import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Sparkles, 
  ArrowLeft, 
  ArrowUpRight, 
  Share2, 
  CheckCircle2, 
  Ticket, 
  Trophy, 
  Layers, 
  ShieldCheck, 
  ExternalLink, 
  Mail, 
  Phone, 
  User, 
  Building2, 
  Globe, 
  FileText, 
  Instagram, 
  Smartphone,
  Cpu,
  Lock,
  Coins,
  Code2,
  Rocket
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';
import { ConstellationBackground } from '../components/ConstellationBackground';

const TRACK_ICONS = [Cpu, Lock, Coins, Code2, Rocket, Layers, Sparkles];

export const EventDetailsPage = ({
  eventId,
  onNavigateToRegister,
  onBackToHome,
  onShowToast,
}) => {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTrackIndex, setActiveTrackIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchEvent = async () => {
      try {
        setLoading(true);
        setError(null);
        const targetId = eventId || 'eventra-2026';
        const res = await api.events.getById(targetId);
        if (isMounted) {
          if (res?.data) {
            setEvent(res.data);
          } else {
            setError('Event not found');
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Error fetching event details:', err);
          setError(err.message || 'Could not load event');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchEvent();
    return () => { isMounted = false; };
  }, [eventId]);

  const handleShare = () => {
    sounds.playClick();
    const shareUrl = window.location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    onShowToast?.({
      type: 'success',
      title: 'Link Copied! 🔗',
      message: `Shareable link for "${event?.name || 'this event'}" copied to clipboard.`,
    });
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <ConstellationBackground />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '15px', color: '#596EE6', fontWeight: '800' }}>
          <Sparkles size={20} className="spin" />
          <span>Loading event specifications...</span>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '32px', textAlign: 'center', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F8', boxShadow: '0 10px 30px rgba(41, 48, 74, 0.08)' }}>
        <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#29304A', marginBottom: '8px' }}>Event Not Found</h2>
        <p style={{ fontSize: '14px', color: '#5C6479', marginBottom: '20px' }}>
          The requested event could not be found or may have been retired.
        </p>
        <button
          type="button"
          onClick={onBackToHome}
          className="btn btn-primary"
          style={{ padding: '10px 20px', borderRadius: '10px' }}
        >
          <ArrowLeft size={16} /> Return to Eventra Home
        </button>
      </div>
    );
  }

  const isFree = event.pricingType === 'free' || Number(event.entryFee) === 0;
  const feeDisplay = isFree ? 'Free Entry Pass' : (event.feeDisplay || `₹${event.entryFee} Entry Pass`);
  const subEvents = Array.isArray(event.subEvents) ? event.subEvents : [];
  const hasSubEvents = subEvents.length > 0;

  // Process tracks
  const rawTracks = Array.isArray(event.tracks) && event.tracks.length > 0
    ? event.tracks
    : (typeof event.tracks === 'string' && event.tracks.trim()
        ? event.tracks.split(',').map((t) => t.trim()).filter(Boolean)
        : (hasSubEvents ? subEvents.map((s) => s.name) : [event.category || 'General Track']));

  const displayTracks = hasSubEvents
    ? subEvents.map((sub, idx) => ({
        title: sub.name,
        category: sub.category || 'Activity',
        desc: `Sub-event competition • Coordinator: ${sub.coordinator || event.organizerName || 'Club Lead'} • Capacity: ${sub.seats || 60} seats`,
        fee: Number(sub.fee) === 0 ? 'Free' : `₹${sub.fee}`,
        icon: TRACK_ICONS[idx % TRACK_ICONS.length],
        seats: sub.seats || 60,
      }))
    : rawTracks.map((tName, idx) => ({
        title: tName,
        category: event.category || 'Domain',
        desc: `Official track for ${event.name} (${event.category}) at ${event.venue || 'Campus'}.`,
        fee: feeDisplay,
        icon: TRACK_ICONS[idx % TRACK_ICONS.length],
        seats: event.totalCapacity || 250,
      }));

  // Process schedule/timeline
  const displaySchedule = Array.isArray(event.schedule) && event.schedule.length > 0
    ? event.schedule
    : [
        {
          day: 'STEP 1',
          time: event.timeDisplay || 'Check-In',
          title: `Gate Check-In & Cryptographic Pass Verification`,
          desc: `Present your official Eventra QR Pass at ${event.venue}${event.venueHall ? ` (${event.venueHall})` : ''} for instant camera check-in.`,
        },
        {
          day: 'MAIN',
          time: event.dateDisplay || 'Event Day',
          title: `${event.name} — Main Sessions & Competitions`,
          desc: event.description || event.tagline || `Organized by ${event.clubName || event.organizerName || 'the organizing committee'}.`,
        },
        ...(hasSubEvents ? subEvents.map((sub, i) => ({
          day: `ACTIVITY ${i + 1}`,
          time: `${sub.seats || 60} Seats`,
          title: `${sub.name} (${sub.category})`,
          desc: `Entry: ${Number(sub.fee) === 0 ? 'Free' : `₹${sub.fee}`} • Coordinator: ${sub.coordinator || event.organizerName || 'Lead'}`,
        })) : []),
        {
          day: 'FINALE',
          time: 'Closing Ceremony',
          title: 'Valedictory & Verified Certificate Distribution',
          desc: `Awards announcement and verified credentials issuance powered by Eventra.`,
        },
      ];

  const mapLink = event.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(event.venue || 'Campus')}`;

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 20px 80px 20px', position: 'relative' }}>
      <ConstellationBackground />

      {/* Top Breadcrumb & Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '20px 0 24px 0', borderBottom: '1px solid #E2E8F8', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={onBackToHome}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px' }}
        >
          <ArrowLeft size={15} />
          <span>Back to Eventra Home</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleShare}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px' }}
          >
            <Share2 size={14} color="#596EE6" />
            <span>Share</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToRegister(event.id || event.eventId)}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '10px', fontWeight: '800' }}
          >
            <Ticket size={14} />
            <span>Register ({isFree ? 'Free' : `₹${event.entryFee}`})</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>

      {/* Event Hero Banner */}
      <div
        style={{
          borderRadius: '24px',
          overflow: 'hidden',
          background: '#FFFFFF',
          border: '1px solid #DDE3FF',
          boxShadow: '0 20px 48px rgba(89, 110, 230, 0.12)',
          marginBottom: '36px',
        }}
      >
        {/* Banner Cover Image */}
        <div style={{ position: 'relative', height: '320px', overflow: 'hidden', background: '#EEF0FF' }}>
          <img
            src={event.bannerUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80'}
            alt={event.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(41, 48, 74, 0.92) 100%)' }} />

          {/* Floating Badges */}
          <div style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ background: '#10B981', color: '#fff', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '800', letterSpacing: '0.04em' }}>
                ● {(event.status || 'LIVE').toUpperCase()}
              </span>
              <span style={{ background: '#FFFFFF', color: '#29304A', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '800', border: '1px solid #E2E8F8' }}>
                {event.category?.toUpperCase() || 'EVENT'}
              </span>
              <span style={{ background: 'rgba(89, 110, 230, 0.95)', color: '#FFFFFF', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '800' }}>
                {event.mode === 'online' ? '🌐 VIRTUAL (ONLINE)' : event.mode === 'hybrid' ? '⚡ HYBRID FORMAT' : '🏢 IN-PERSON ON CAMPUS'}
              </span>
              {event.isFlagship && (
                <span style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#FFFFFF', padding: '5px 12px', borderRadius: '999px', fontSize: '11px', fontWeight: '800' }}>
                  👑 FLAGSHIP EVENT
                </span>
              )}
            </div>

            <span style={{ background: isFree ? '#10B981' : 'linear-gradient(135deg, #596EE6 0%, #475AC4 100%)', color: '#FFFFFF', padding: '6px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: '900', boxShadow: '0 4px 12px rgba(89, 110, 230, 0.35)' }}>
              {feeDisplay}
            </span>
          </div>

          {/* Bottom Title Overlay */}
          <div style={{ position: 'absolute', bottom: '24px', left: '28px', right: '28px' }}>
            {(event.collegeName || event.clubName) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#E2E8F0', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                <Building2 size={15} color="#A5B4FC" />
                <span>{event.collegeName || 'Campus Event'}</span>
                {event.clubName && (
                  <>
                    <span>•</span>
                    <span>{event.clubName} {event.clubCode ? `(${event.clubCode})` : ''}</span>
                  </>
                )}
              </div>
            )}
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: '900', color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              {event.name}
            </h1>
            {event.tagline && (
              <p style={{ fontSize: '16px', color: '#CBD5E1', margin: '6px 0 0 0', fontWeight: '600' }}>
                {event.tagline}
              </p>
            )}
          </div>
        </div>

        {/* Hero Quick Key Metrics */}
        <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', background: '#FAFCFF', borderTop: '1px solid #E2E8F8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#596EE6', flexShrink: 0 }}>
              <Calendar size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#5C6479', fontWeight: '800', textTransform: 'uppercase' }}>Date & Schedule</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#29304A' }}>{event.dateDisplay || 'Dates TBA'}</div>
              {event.timeDisplay && <div style={{ fontSize: '11px', color: '#596EE6', fontWeight: '700' }}>{event.timeDisplay}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#596EE6', flexShrink: 0 }}>
              <MapPin size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#5C6479', fontWeight: '800', textTransform: 'uppercase' }}>Location & Hall</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#29304A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {event.venue || 'Campus Venue'}
              </div>
              {event.venueHall && <div style={{ fontSize: '11px', color: '#5C6479' }}>{event.venueHall}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#596EE6', flexShrink: 0 }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#5C6479', fontWeight: '800', textTransform: 'uppercase' }}>Capacity Limit</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#29304A' }}>{event.totalCapacity || 250} Attendees</div>
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: '700' }}>Instant QR Check-in</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => onNavigateToRegister(event.id || event.eventId)}
              className="btn btn-primary"
              style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: '800', width: '100%', justifyContent: 'center' }}
            >
              <Ticket size={16} /> Register Now
            </button>
          </div>
        </div>
      </div>

      {/* Main 2-Column Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '28px' }}>
        
        {/* Left Column: Description, Tracks & Schedule */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* About Event Section */}
          <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '32px', border: '1px solid #E2E8F8', boxShadow: '0 4px 18px rgba(41, 48, 74, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Sparkles size={18} color="#596EE6" />
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#29304A', margin: 0 }}>
                About {event.name}
              </h2>
            </div>

            <p style={{ fontSize: '15px', color: '#3D4666', lineHeight: 1.7, whiteSpace: 'pre-line', margin: '0 0 20px 0' }}>
              {event.description || event.tagline || 'Detailed event overview, rules, and guidelines will be announced shortly.'}
            </p>

            {/* Community Links */}
            {(event.whatsappUrl || event.discordUrl || event.brochureUrl || event.socialUrl || event.meetingUrl) && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid #EEF2F6' }}>
                {event.whatsappUrl && (
                  <a href={event.whatsappUrl} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontWeight: '700', textDecoration: 'none' }}>
                    <Smartphone size={14} /> WhatsApp Group
                  </a>
                )}
                {event.discordUrl && (
                  <a href={event.discordUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                    <Globe size={14} color="#596EE6" /> Community Discord
                  </a>
                )}
                {event.brochureUrl && (
                  <a href={event.brochureUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                    <FileText size={14} color="#596EE6" /> Rulebook PDF
                  </a>
                )}
                {event.socialUrl && (
                  <a href={event.socialUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                    <Instagram size={14} color="#596EE6" /> Club Page
                  </a>
                )}
                {event.meetingUrl && (
                  <a href={event.meetingUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                    <ExternalLink size={14} /> Virtual Link
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Tracks / Sub-Events Section */}
          <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '32px', border: '1px solid #E2E8F8', boxShadow: '0 4px 18px rgba(41, 48, 74, 0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trophy size={18} color="#596EE6" />
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#29304A', margin: 0 }}>
                  {hasSubEvents ? `Sub-Events & Activities (${subEvents.length})` : `Tracks & Domains (${displayTracks.length})`}
                </h2>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#596EE6', background: '#EEF0FF', padding: '3px 10px', borderRadius: '999px' }}>
                {hasSubEvents ? 'Individual Competition Registrations' : 'Choose Your Domain'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
              {displayTracks.map((item, idx) => {
                const Icon = item.icon || Sparkles;
                return (
                  <div
                    key={idx}
                    style={{
                      background: '#FAFCFF',
                      border: '1px solid #E2E8F8',
                      borderRadius: '14px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#596EE6' }}>
                          <Icon size={18} />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: '800', background: '#FFFFFF', border: '1px solid #E2E8F8', padding: '2px 8px', borderRadius: '999px', color: '#29304A' }}>
                          {item.category?.toUpperCase() || 'TRACK'}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#29304A', margin: '0 0 6px 0' }}>
                        {item.title}
                      </h4>
                      <p style={{ fontSize: '12px', color: '#5C6479', lineHeight: 1.5, margin: 0 }}>
                        {item.desc}
                      </p>
                    </div>

                    <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #EEF2F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#5C6479', fontWeight: '700' }}>Pass Price</span>
                      <span style={{ fontSize: '13px', fontWeight: '900', color: '#596EE6' }}>{item.fee}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timeline & Milestones Schedule */}
          <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '32px', border: '1px solid #E2E8F8', boxShadow: '0 4px 18px rgba(41, 48, 74, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <Clock size={18} color="#596EE6" />
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#29304A', margin: 0 }}>
                Event Timeline & Schedule
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {displaySchedule.map((milestone, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'flex-start',
                    paddingBottom: idx < displaySchedule.length - 1 ? '16px' : '0',
                    borderBottom: idx < displaySchedule.length - 1 ? '1px solid #EEF2F6' : 'none',
                  }}
                >
                  <div style={{ minWidth: '110px' }}>
                    <span style={{ fontSize: '10px', fontWeight: '800', background: '#EEF0FF', color: '#596EE6', padding: '3px 8px', borderRadius: '999px', display: 'inline-block' }}>
                      {milestone.day}
                    </span>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#29304A', marginTop: '4px' }}>
                      {milestone.time}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#29304A', margin: '0 0 4px 0' }}>
                      {milestone.title}
                    </h4>
                    <p style={{ fontSize: '12px', color: '#5C6479', margin: 0, lineHeight: 1.5 }}>
                      {milestone.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Venue, POC Contacts, Ticket Tiers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Registration Ticket Pass Card */}
          <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '24px', border: '2px solid #596EE6', boxShadow: '0 8px 24px rgba(89, 110, 230, 0.15)' }}>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#596EE6', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              ⚡ OFFICIAL ENTRY PASS
            </div>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#29304A', marginBottom: '4px' }}>
              {feeDisplay}
            </div>
            <p style={{ fontSize: '12px', color: '#5C6479', margin: '0 0 16px 0' }}>
              Includes zero-forgery cryptographic HMAC pass, optical camera check-in, and digital event certificate.
            </p>

            <button
              type="button"
              onClick={() => onNavigateToRegister(event.id || event.eventId)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '10px', fontSize: '14px', fontWeight: '800', justifyContent: 'center' }}
            >
              <Ticket size={16} /> Get Your Pass Now
            </button>

            {Array.isArray(event.ticketTiers) && event.ticketTiers.length > 0 && (
              <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #EEF2F6' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#5C6479', display: 'block', marginBottom: '6px' }}>
                  AVAILABLE TIERS:
                </span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {event.ticketTiers.map((t) => (
                    <span key={t} style={{ fontSize: '11px', background: '#F8FAFF', border: '1px solid #DDE3FF', padding: '2px 8px', borderRadius: '6px', color: '#3D4666', fontWeight: '700' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Venue & Maps Card */}
          <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '24px', border: '1px solid #E2E8F8', boxShadow: '0 4px 18px rgba(41, 48, 74, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <MapPin size={18} color="#596EE6" />
              <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#29304A', margin: 0 }}>
                Venue & Directions
              </h3>
            </div>

            <div style={{ fontSize: '14px', fontWeight: '800', color: '#29304A', marginBottom: '4px' }}>
              {event.venue || 'Campus Venue'}
            </div>
            {event.venueHall && (
              <div style={{ fontSize: '12px', color: '#5C6479', marginBottom: '14px' }}>
                Hall: <strong>{event.venueHall}</strong>
              </div>
            )}

            <a
              href={mapLink}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <ExternalLink size={14} color="#596EE6" /> Open in Google Maps
            </a>
          </div>

          {/* Club POC Contacts */}
          {(event.organizerName || event.organizerEmail || event.organizerPhone) && (
            <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '24px', border: '1px solid #E2E8F8', boxShadow: '0 4px 18px rgba(41, 48, 74, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <User size={18} color="#596EE6" />
                <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#29304A', margin: 0 }}>
                  Club Contact (POC)
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                {event.organizerName && (
                  <div>
                    <strong style={{ color: '#29304A' }}>{event.organizerName}</strong>
                    {event.organizerRole && <span style={{ color: '#5C6479' }}> ({event.organizerRole})</span>}
                  </div>
                )}
                {event.organizerEmail && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={13} color="#596EE6" />
                    <a href={`mailto:${event.organizerEmail}`} style={{ color: '#596EE6', textDecoration: 'none', fontWeight: '600' }}>
                      {event.organizerEmail}
                    </a>
                  </div>
                )}
                {event.organizerPhone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={13} color="#596EE6" />
                    <a href={`tel:${event.organizerPhone}`} style={{ color: '#29304A', textDecoration: 'none', fontWeight: '600' }}>
                      {event.organizerPhone}
                    </a>
                  </div>
                )}
                {event.alternatePOC && (
                  <div style={{ fontSize: '11px', color: '#5C6479', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid #EEF2F6' }}>
                    Alternate POC: {event.alternatePOC}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security & Verification Guarantee */}
          <div style={{ background: '#F8FAFF', borderRadius: '14px', padding: '16px', border: '1px solid #DDE3FF', display: 'flex', gap: '10px' }}>
            <ShieldCheck size={20} color="#596EE6" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#29304A' }}>
                Eventra Verified Platform
              </div>
              <div style={{ fontSize: '11px', color: '#5C6479', marginTop: '2px' }}>
                All tickets issued with zero-tamper cryptographic signatures and live gate verification.
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
