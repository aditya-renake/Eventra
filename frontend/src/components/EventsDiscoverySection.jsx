import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Sparkles, 
  ExternalLink, 
  ArrowUpRight, 
  Search, 
  Filter, 
  Tag, 
  Trophy,
  Flame,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const EventsDiscoverySection = ({ onSelectEvent, onNavigateToLookup }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: '🔥 All Events' },
    { id: 'Hackathon', label: '💻 Hackathons' },
    { id: 'Workshop', label: '🤖 AI & Bootcamps' },
    { id: 'Gaming', label: '🎮 Esports' },
    { id: 'Seminar', label: '🎤 Tech Talks' },
    { id: 'Cultural', label: '🎭 Cultural Fests' },
  ];

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const res = await api.events.getAll();
        setEvents(res.data || []);
      } catch (e) {
        console.warn('Could not fetch events catalog:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const filteredEvents = events.filter((ev) => {
    const matchesCat = activeCategory === 'all' || String(ev.category).toLowerCase() === activeCategory.toLowerCase();
    const matchesSearch = !searchQuery.trim() || 
      ev.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.tagline?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <section id="events-hub-section" style={{ padding: '60px 0 30px 0', position: 'relative', zIndex: 1 }}>
      
      {/* Section Header */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 16px', borderRadius: '9999px', background: 'rgba(178, 43, 47, 0.15)', border: '1px solid rgba(209, 165, 80, 0.4)', color: '#f7d070', fontSize: '11px', fontWeight: '800', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
          <Sparkles size={13} color="#f7d070" />
          <span>CAMPUSMEET DISCOVERY HUB</span>
        </div>

        <h2 style={{ fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '10px' }}>
          Explore Campus Events & Competitions
        </h2>

        <p style={{ fontSize: '15px', color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto', lineHeight: '1.6' }}>
          Discover upcoming hackathons, AI workshops, gaming championships, and keynotes hosted by ACES at Dr. D. Y. Patil Institute of Technology (DYPDPU).
        </p>
      </div>

      {/* Discovery Filters & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '28px' }}>
        
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                sounds.playClick();
                setActiveCategory(cat.id);
              }}
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: '800',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: activeCategory === cat.id ? '1px solid rgba(247, 208, 112, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                background: activeCategory === cat.id ? 'linear-gradient(135deg, #b22b2f 0%, #7a1518 100%)' : 'rgba(14, 18, 28, 0.7)',
                color: activeCategory === cat.id ? '#ffffff' : '#cbd5e1',
                boxShadow: activeCategory === cat.id ? '0 4px 16px rgba(178, 43, 47, 0.4)' : 'none',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <Search size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search events, bootcamps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 14px 9px 36px',
              background: 'rgba(14, 18, 28, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '9999px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading active campus events...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', background: 'rgba(14, 18, 28, 0.5)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>No events found in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {filteredEvents.map((ev) => {
            const isLive = ev.status === 'live';
            return (
              <div
                key={ev.id || ev.eventId}
                className="glass-panel"
                style={{
                  borderRadius: '20px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgba(14, 18, 28, 0.75)',
                  border: isLive ? '1px solid rgba(209, 165, 80, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isLive ? '0 12px 35px rgba(178, 43, 47, 0.15)' : '0 8px 24px rgba(0, 0, 0, 0.4)',
                }}
              >
                {/* Event Banner */}
                <div style={{ position: 'relative', height: '170px', overflow: 'hidden' }}>
                  <img
                    src={ev.bannerUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80'}
                    alt={ev.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(14, 18, 28, 0.95) 100%)' }} />

                  {/* Status & Category Badges */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        background: isLive ? 'rgba(34, 197, 94, 0.9)' : 'rgba(209, 165, 80, 0.9)',
                        color: isLive ? '#ffffff' : '#000000',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {isLive ? '● LIVE / REGISTERING' : 'UPCOMING'}
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: '#f7d070',
                        border: '1px solid rgba(247, 208, 112, 0.3)',
                      }}
                    >
                      {ev.category}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Event Title */}
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff', marginBottom: '6px', lineHeight: '1.3' }}>
                    {ev.name}
                  </h3>

                  {/* Tagline */}
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5', flex: 1 }}>
                    {ev.tagline}
                  </p>

                  {/* Date & Venue Metadata */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px', fontSize: '12px', color: '#cbd5e1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} color="#f7d070" />
                      <span>{ev.dateDisplay || 'October 2026'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} color="#fca5a5" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ev.venue || 'DIT Pune Campus'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <a
                      href={ev.googleFormUrl || 'https://forms.gle/U24ip7E6NqtbZkiT9'}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => sounds.playClick()}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: 'linear-gradient(135deg, #b22b2f 0%, #7a1518 100%)',
                        color: '#ffffff',
                        fontWeight: '800',
                        fontSize: '12px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        border: '1px solid rgba(247, 208, 112, 0.4)',
                        boxShadow: '0 4px 14px rgba(178, 43, 47, 0.35)',
                      }}
                    >
                      <span>Register</span>
                      <ArrowUpRight size={14} />
                    </a>

                    <a
                      href="#lookup-section"
                      onClick={() => {
                        sounds.playClick();
                        if (onNavigateToLookup) onNavigateToLookup(ev.id || ev.eventId);
                      }}
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '12px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                      }}
                    >
                      <span>My Pass 🎟️</span>
                    </a>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
