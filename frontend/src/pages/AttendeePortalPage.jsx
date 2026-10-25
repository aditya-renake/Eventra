import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  Search, 
  ArrowRight, 
  Download, 
  Share2, 
  Sparkles, 
  User, 
  Mail, 
  ExternalLink, 
  LogOut, 
  ShieldCheck, 
  Smartphone,
  Building2,
  Users
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const AttendeePortalPage = ({ onNavigateToPass, onNavigateToRegister, onShowToast }) => {
  const [emailInput, setEmailInput] = useState('');
  const [attendee, setAttendee] = useState(() => api.auth.getAttendee());
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeEvents, setActiveEvents] = useState([]);

  // Fetch all passes for an email
  const fetchPassesForEmail = async (emailToFetch, silent = false) => {
    if (!emailToFetch) return;
    try {
      if (!silent) setLoading(true);
      const res = await api.registrants.getAttendeeProfile(emailToFetch);
      if (res?.success && res.found) {
        setPasses(res.passes || []);
        if (res.attendee) {
          setAttendee(res.attendee);
          api.auth.setAttendee(res.attendee);
        }
        if (!silent) {
          sounds.playSuccess();
          onShowToast?.({
            type: 'success',
            title: `Welcome back, ${res.attendee?.name || 'Attendee'}! 🎟️`,
            message: `Found ${res.count} active event registration${res.count === 1 ? '' : 's'}.`,
          });
        }
      } else {
        setPasses([]);
        if (!silent) {
          sounds.playError();
          onShowToast?.({
            type: 'warning',
            title: 'No Passes Found',
            message: `No active registrations found for ${emailToFetch}. You can register for upcoming campus events below.`,
          });
        }
      }
    } catch (err) {
      if (!silent) {
        sounds.playError();
        onShowToast?.({
          type: 'error',
          title: 'Lookup Error',
          message: err.message || 'Failed to fetch passes.',
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Initial load if attendee is stored in session
  useEffect(() => {
    const saved = api.auth.getAttendee();
    if (saved?.email) {
      setEmailInput(saved.email);
      fetchPassesForEmail(saved.email, true);
    }

    // Load available active events for "Explore More"
    api.events.getAll().then((res) => {
      if (res?.data) {
        setActiveEvents(Array.isArray(res.data) ? res.data : []);
      }
    }).catch(() => {});
  }, []);

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    sounds.playClick();
    fetchPassesForEmail(emailInput.trim());
  };

  const handleLogout = () => {
    sounds.playClick();
    api.auth.logoutAttendee();
    setAttendee(null);
    setPasses([]);
    setEmailInput('');
    onShowToast?.({
      type: 'info',
      title: 'Signed Out',
      message: 'You have signed out of your attendee passbook.',
    });
  };

  const handleSendWhatsApp = (pass) => {
    sounds.playClick();
    const passUrl = `${window.location.origin}/pass/${pass.uniqueId}`;
    const message = `🎟️ *${pass.eventName || 'Eventra 2026'} Digital Pass*\n\n` +
      `👤 *Attendee:* ${pass.name}\n` +
      `🎫 *Pass ID:* ${pass.uniqueId}\n` +
      `🎟️ *Tier:* ${pass.ticketType}\n` +
      `📍 *Venue:* ${pass.eventVenue || 'Campus'}\n` +
      `📅 *Date:* ${pass.eventDate || 'Dates TBA'}\n\n` +
      `👉 *View Live QR Pass:* ${passUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '30px auto 80px auto', padding: '0 20px' }}>
      
      {/* Top Banner / Welcome Header */}
      <div className="glass-card" style={{ padding: '32px 36px', borderRadius: '22px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, var(--eventra-indigo) 0%, var(--eventra-indigo-dark) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(89, 110, 230, 0.35)',
              flexShrink: 0
            }}>
              <Ticket size={28} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="badge badge-aces" style={{ fontSize: '10px' }}>STUDENT PASSBOOK</span>
                {attendee && (
                  <>
                    <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                      <CheckCircle2 size={11} /> VERIFIED ATTENDEE
                    </span>
                    {attendee.username && (
                      <span className="badge badge-indigo" style={{ fontSize: '10px' }}>
                        @{attendee.username}
                      </span>
                    )}
                  </>
                )}
              </div>

              <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--eventra-ink)', margin: '4px 0 0 0', letterSpacing: '-0.5px' }}>
                {attendee ? `Welcome back, ${attendee.name}!` : 'My Campus Event Passes'}
              </h1>

              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                {attendee 
                  ? `Access your cryptographic entry QR passes, real-time gate check-ins, and event telemetry.` 
                  : 'Access all your registrations and digital passes across every campus event in one unified hub.'}
              </p>
            </div>
          </div>

          {attendee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'right', display: 'none', minWidth: '120px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--eventra-ink)' }}>{attendee.email}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{passes.length} registered events</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Sign out of this student session"
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          )}

        </div>

        {/* Not Logged In Search Box */}
        {!attendee && (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
            <form onSubmit={handleEmailSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
                <input
                  type="email"
                  className="input-control"
                  placeholder="Enter your student email address (e.g. aditya@college.edu)"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  style={{ paddingLeft: '38px', height: '46px', fontSize: '14px' }}
                  required
                />
                <Mail size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0 24px', height: '46px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                disabled={loading}
              >
                <Search size={15} /> {loading ? 'Fetching...' : 'Access My Passes'}
              </button>
            </form>

            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <span>Prefer an account with username & password?</span>
              <div style={{ display: 'flex', gap: '14px' }}>
                <a href="#login" style={{ color: 'var(--eventra-indigo, #596EE6)', fontWeight: '700', textDecoration: 'none' }}>
                  🔑 Sign In
                </a>
                <a href="#login" style={{ color: 'var(--eventra-indigo, #596EE6)', fontWeight: '700', textDecoration: 'none' }}>
                  ✨ Create Free Account
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Passes Grid Section */}
      {attendee && passes.length > 0 ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--eventra-ink)', margin: 0 }}>
                My Registered Events ({passes.length})
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Present the QR code at the campus entry gate for instant cryptographic check-in.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToRegister?.()}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={14} /> Register for Another Event
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '22px', marginBottom: '48px' }}>
            {passes.map((pass) => (
              <div 
                key={pass.uniqueId} 
                className="glass-card" 
                style={{ 
                  borderRadius: '18px', 
                  overflow: 'hidden', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'all 0.2s ease',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Event Banner Image */}
                <div style={{ position: 'relative', height: '140px', background: '#EEF0FF' }}>
                  <img
                    src={pass.bannerUrl || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80'}
                    alt={pass.eventName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(41, 48, 74, 0.85) 100%)' }} />
                  
                  {/* Status Badge */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="badge badge-emerald" style={{ fontSize: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                      {pass.ticketType || 'Standard Pass'}
                    </span>
                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: '800', 
                        padding: '3px 8px', 
                        borderRadius: '6px',
                        background: pass.checkedIn ? 'rgba(34, 197, 94, 0.95)' : 'rgba(245, 158, 11, 0.95)',
                        color: '#FFFFFF',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {pass.checkedIn ? (
                        <>
                          <CheckCircle2 size={12} /> CHECKED IN
                        </>
                      ) : (
                        <>
                          <Clock size={12} /> GATE READY
                        </>
                      )}
                    </span>
                  </div>

                  <div style={{ position: 'absolute', bottom: '12px', left: '16px', right: '16px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF', margin: 0, letterSpacing: '-0.3px', textShadow: '0 2px 4px rgba(0,0,0,0.4)' }}>
                      {pass.eventName}
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <Calendar size={14} color="#596EE6" />
                      <span>{pass.eventDate || 'Dates TBA'}</span>
                      {pass.eventTime && <span>• {pass.eventTime}</span>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <MapPin size={14} color="#596EE6" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pass.eventVenue || 'Campus Venue'} {pass.venueHall ? `(${pass.venueHall})` : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: '700' }}>PASS IDENTIFIER</span>
                      <code style={{ fontSize: '13px', fontWeight: '800', color: 'var(--eventra-indigo)', fontFamily: 'var(--font-mono)' }}>
                        {pass.uniqueId}
                      </code>
                    </div>

                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button"
                      onClick={() => onNavigateToPass?.(pass.uniqueId)}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Ticket size={14} /> Open Pass
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendWhatsApp(pass)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                      title="Send Pass to WhatsApp"
                    >
                      <Share2 size={13} color="#22c55e" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      ) : attendee ? (
        <div className="glass-card" style={{ padding: '50px 20px', textAlign: 'center', borderRadius: '18px', marginBottom: '40px' }}>
          <Ticket size={42} color="var(--eventra-indigo)" style={{ opacity: 0.6, marginBottom: '12px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--eventra-ink)', margin: 0 }}>
            No registered passes found for this email
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', margin: '8px auto 20px auto' }}>
            Check out the live campus events below and register in seconds with pre-filled details.
          </p>
        </div>
      ) : null}

      {/* Explore More Campus Events Section */}
      {activeEvents.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--eventra-ink)', margin: 0 }}>
                Explore More Campus Events
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                1-Click registration with your verified attendee profile.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {activeEvents.slice(0, 4).map((ev) => (
              <div 
                key={ev.id || ev.eventId}
                className="glass-card"
                style={{ padding: '18px', borderRadius: '14px', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <span className="badge badge-aces" style={{ fontSize: '9px', marginBottom: '6px' }}>
                    {ev.category?.toUpperCase() || 'EVENT'}
                  </span>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--eventra-ink)', margin: '4px 0' }}>
                    {ev.name}
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4, margin: '4px 0 12px 0' }}>
                    {ev.tagline || ev.venue || 'Campus Venue'}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--eventra-indigo)' }}>
                    {ev.entryFee ? `₹${ev.entryFee}` : 'Free Pass'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigateToRegister?.(ev.id || ev.eventId)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '11px', padding: '5px 12px' }}
                  >
                    Register <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
