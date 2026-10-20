import React, { useState } from 'react';
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
  QrCode,
  Download,
  Instagram,
  Github,
  Users,
  Ticket,
  Trophy
} from 'lucide-react';
import { DYPDPULogo } from '../components/CollegeLogos';
import { ConstellationBackground } from '../components/ConstellationBackground';
import { GallerySection } from '../components/GallerySection';
import { EventsDiscoverySection } from '../components/EventsDiscoverySection';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const EventLandingPage = ({ onNavigateToPass, onNavigateToRegister, onShowToast }) => {
  const [lookupInput, setLookupInput] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [retrievedPass, setRetrievedPass] = useState(null);
  const [eventConfig, setEventConfig] = useState(null);
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });

  React.useEffect(() => {
    api.event.getConfig()
      .then((res) => {
        if (res?.data) setEventConfig(res.data);
      })
      .catch(() => {});
  }, []);

  const googleFormUrl = eventConfig?.googleFormUrl || 'https://forms.gle/TmoSjzxUt7yAKz1o6';
  const isNativePaymentMode = eventConfig?.registrationMode === 'native_payment';
  const eventName = eventConfig?.eventName || 'HackSeries 2026';

  const handleHeroPointerMove = (event) => {
    if (event.pointerType === 'touch') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    setHeroTilt({ x: -y * 4, y: x * 5 });
  };

  const tracks = [
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

  const schedule = [
    { 
      day: 'DAY 1',
      time: '07:30 AM', 
      title: 'Express Gate Check-in & Breakfast', 
      desc: 'Scan your digital QR pass at DIT Main Entrance to collect your badge and hacker kit.' 
    },
    { 
      day: 'DAY 1',
      time: '09:30 AM', 
      title: 'Inauguration & Track Release', 
      desc: 'Official keynote by DIT dignitaries and release of 2026 problem statements in DIT Auditorium.' 
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
      title: 'ACES Midway Mentor Review', 
      desc: '1-on-1 architecture reviews and dry runs with industry engineers and startup founders.' 
    },
    { 
      day: 'DAY 2',
      time: '11:30 PM', 
      title: 'Midnight Energy & Gaming Break', 
      desc: 'Midnight snacks, trivia challenges, and music hosted by the ACES student team.' 
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
      desc: 'Top 10 team live stage pitches and ₹15,00,000+ cash prizes distribution.' 
    },
  ];

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
        message: 'No registered pass found for this ID or Email. Please ensure you completed the Google Form registration.',
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSendWhatsAppForPass = (pass) => {
    if (!pass) return;
    sounds.playClick();
    const passUrl = `${window.location.origin}/pass/${pass.uniqueId}`;
    const message = `🎟️ *HackSeries 2026 Digital Entry Pass*\n\n` +
      `👤 *Attendee:* ${pass.name}\n` +
      `🎫 *Pass ID:* ${pass.uniqueId}\n` +
      `🎟️ *Ticket Type:* ${pass.ticketType}\n` +
      `🏛️ *Venue:* Dr. D. Y. Patil Institute of Technology (DIT), Pimpri, Pune\n` +
      `📅 *Dates:* October 16–18, 2026 (Check-in 07:30 AM IST)\n\n` +
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
    link.download = `HackSeries2026-${pass.uniqueId}.png`;
    link.href = pass.qrCodeDataUrl;
    link.click();
  };

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 20px 80px 20px', position: 'relative' }}>
      
      {/* Background Matrix Constellation Nodes */}
      <ConstellationBackground />

      {/* Event hero */}
      <section className="event-hero" aria-labelledby="event-hero-title">
        <div className="event-hero-copy">
          <div className="event-hero-kicker"><span className="event-hero-kicker-dot" /> {eventName} <span className="event-hero-kicker-divider">/</span> DIT Pune</div>
          <h1 id="event-hero-title">Make your next big idea <span>real in 48 hours.</span></h1>
          <p className="event-hero-description">A hands-on hackathon for curious minds, bold prototypes, and the people who make them happen. Find your track and build something worth sharing.</p>

          <div className="event-hero-meta">
            <span><Calendar size={16} /> {eventConfig?.eventDate || 'October 16–18, 2026'}</span>
            <span><MapPin size={16} /> {eventConfig?.eventVenue || 'DIT Pune, India'}</span>
          </div>

          <div className="event-hero-actions">
            <button
              type="button"
              onClick={() => {
                sounds.playClick();
                if (onNavigateToRegister) onNavigateToRegister();
              }}
              className="event-hero-cta"
            >
              <Ticket size={17} /> Get your pass <ArrowUpRight size={16} />
            </button>
            <a href="#tracks-section" className="event-hero-secondary">Explore the tracks <ArrowUpRight size={15} /></a>
          </div>

          <div className="event-hero-host">
            <img src="/dypdpu-logo.png" alt="Dr. D. Y. Patil Vidyapeeth" />
            <span className="event-hero-host-divider" />
            <span><small>Hosted by</small><strong>ACES · DIT Pune</strong></span>
          </div>
        </div>

        <div className="event-hero-art" onPointerMove={handleHeroPointerMove} onPointerLeave={() => setHeroTilt({ x: 0, y: 0 })}>
          <div className="event-hero-image" style={{ transform: `perspective(1200px) rotateX(${heroTilt.x}deg) rotateY(${heroTilt.y}deg)` }}>
            <img src="/gallery/futuristic_hackathon_1775424262777.png" alt="A packed hackathon floor with teams building together" />
            <div className="event-hero-image-shade" />
            <div className="event-hero-image-topline"><span><Activity size={14} /> THE BUILD STARTS HERE</span><span>01 / 03</span></div>
            <div className="event-hero-image-caption"><span>Ideas move faster together.</span><small>48 hours · 5 tracks · one big finish</small></div>
          </div>
          <div className="event-float-card event-prize-card">
            <span className="event-float-icon"><Trophy size={18} /></span>
            <span><small>Prize pool</small><strong>₹15 lakh+</strong></span>
            <ArrowUpRight size={15} className="event-float-arrow" />
          </div>
          <a href="#tracks-section" className="event-float-card event-tracks-card">
            <span className="event-track-orbit"><Sparkles size={16} /></span>
            <span><small>Find your challenge</small><strong>5 focused tracks</strong></span>
            <ArrowUpRight size={15} className="event-float-arrow" />
          </a>
        </div>
      </section>

      <div className="event-proof-strip" aria-label="HackSeries at a glance">
        <div><strong>48<span>h</span></strong><small>to bring an idea to life</small></div>
        <div><strong>₹15L<span>+</span></strong><small>in prizes to chase</small></div>
        <div><strong>5</strong><small>tracks to explore</small></div>
        <div><strong>2,000<span>+</span></strong><small>builders in the room</small></div>
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
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#fff' }}>HACKSERIES 2026</div>
                        <div style={{ fontSize: '9px', color: '#d1a550', fontWeight: '800' }}>DIT PUNE (DYPDPU)</div>
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
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#f7d070', fontWeight: '900', marginTop: '10px', letterSpacing: '1px' }}>
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

      {/* About HackSeries & DIT Pune */}
      <section id="about-section" style={{ margin: '0 0 60px 0', position: 'relative', zIndex: 1 }}>
        <div className="glass-card" style={{ padding: '36px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', alignItems: 'center' }}>
            <div>
              <span className="badge badge-dyp" style={{ marginBottom: '10px' }}>ABOUT THE HACKATHON</span>
              <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px', marginBottom: '12px' }}>
                HackSeries 2026 — 48-Hour Innovation Arena
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '14px' }}>
                HackSeries 2026 is India’s flagship national 48-hour student hackathon hosted at <strong>Dr. D. Y. Patil Institute of Technology (DIT), Pimpri, Pune (DYPDPU)</strong>. Designed for collegiate developers, AI practitioners, cybersecurity enthusiasts, and hardware builders to turn ambitious ideas into production-ready software.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Hackers receive high-density compute lab access, gigabit internet, uninterrupted power backup, meals, energy lounges, and guidance from industry engineering mentors.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', border: '1px solid rgba(209, 165, 80, 0.25)' }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#f7d070' }}>NAAC A++</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '700' }}>DIT Pune Accredited</div>
              </div>
              <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', border: '1px solid rgba(178, 43, 47, 0.25)' }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#fca5a5' }}>5 Tracks</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '700' }}>AI, Web3, Cyber, Cloud</div>
              </div>
              <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#ffffff' }}>48 Hours</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '700' }}>Non-Stop Building</div>
              </div>
              <div className="glass-panel" style={{ padding: '16px', textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                <div style={{ fontSize: '22px', fontWeight: '900', color: '#4ade80' }}>Express QR</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '700' }}>Zero-Wait Gate Entry</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tracks Section */}
      <section id="tracks-section" style={{ margin: '0 0 60px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <span className="badge badge-gold" style={{ marginBottom: '8px' }}>PROBLEM DOMAINS</span>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px' }}>
            5 Focused Hackathon Tracks
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {tracks.map((t, idx) => {
            const Icon = t.icon;
            return (
              <div key={idx} className="glass-card" style={{ padding: '22px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(178, 43, 47, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', border: '1px solid rgba(178, 43, 47, 0.3)' }}>
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
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '700' }}>PRIZE POOL</span>
                  <span style={{ fontSize: '14px', fontWeight: '900', color: '#f7d070' }}>{t.prize}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Schedule Section */}
      <section id="schedule-section" style={{ margin: '0 0 60px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <span className="badge badge-dyp" style={{ marginBottom: '8px' }}>OCTOBER 16 - 18, 2026</span>
          <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.5px' }}>
            Event Schedule & Milestones
          </h2>
        </div>

        <div className="glass-card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {schedule.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', borderBottom: idx < schedule.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none', paddingBottom: idx < schedule.length - 1 ? '14px' : '0' }}>
                <div style={{ minWidth: '110px' }}>
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
        <div className="glass-card" style={{ padding: '28px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', border: '1px solid rgba(209, 165, 80, 0.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(178, 43, 47, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', border: '1px solid rgba(178, 43, 47, 0.4)' }}>
              <MapPin size={22} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#ffffff' }}>
                Dr. D. Y. Patil Institute of Technology (DIT)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Sant Tukaram Nagar, Pimpri, Pune - 411018 (Near Sant Tukaram Nagar Metro Station)
              </div>
            </div>
          </div>

          <a
            href="https://maps.google.com/?q=Dr.+D.+Y.+Patil+Institute+of+Technology,+Pimpri,+Pune"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
          >
            <Compass size={15} color="var(--dyp-gold)" /> Open Google Maps <ArrowUpRight size={13} />
          </a>
        </div>
      </section>

      {/* CampusMeet Style Events Discovery Hub */}
      <EventsDiscoverySection
        onSelectEvent={(ev) => {
          if (onNavigateToRegister) {
            onNavigateToRegister(ev);
          }
        }}
        onNavigateToLookup={() => {
          const el = document.getElementById('lookup-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Gallery Section from Hackseries-02 */}
      <GallerySection />

      {/* Minimal Footer */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/dypdpu-logo.png"
            alt="DYP DPU"
            style={{ height: '24px', width: 'auto' }}
          />
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            © 2026 HackSeries • ACES, Dept. of Computer Engineering, DIT Pune (DYPDPU)
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
