import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Sparkles, 
  ExternalLink, 
  ArrowUpRight, 
  Search, 
  Tag, 
  Trophy,
  Flame,
  CheckCircle2,
  Clock,
  Ticket
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
        <div 
          className="badge"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '5px 16px', 
            borderRadius: '9999px', 
            background: 'var(--eventra-soft-lavender, #EEF0FF)', 
            border: '1px solid var(--eventra-soft-lavender-border, #DDE3FF)', 
            color: 'var(--eventra-indigo, #596EE6)', 
            fontSize: '11px', 
            fontWeight: '800', 
            letterSpacing: '0.08em', 
            textTransform: 'uppercase', 
            marginBottom: '14px' 
          }}
        >
          <Sparkles size={13} color="#596EE6" />
          <span>EVENTRA DISCOVERY HUB</span>
        </div>

        <h2 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: '900', color: 'var(--eventra-ink, #29304A)', letterSpacing: '-0.025em', marginBottom: '10px' }}>
          Explore Campus Events & Competitions
        </h2>

        <p style={{ fontSize: '15px', color: 'var(--text-muted, #5C6479)', maxWidth: '640px', margin: '0 auto', lineHeight: '1.6' }}>
          Discover upcoming hackathons, AI workshops, gaming championships, and keynotes powered by the Eventra platform.
        </p>
      </div>

      {/* Discovery Filters & Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '28px' }}>
        
        {/* Category Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }} role="tablist" aria-label="Event categories">
          {categories.map((cat) => {
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isSelected}
                className={`event-category-chip ${isSelected ? 'is-active' : ''}`}
                onClick={() => {
                  sounds.playClick();
                  setActiveCategory(cat.id);
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  border: isSelected ? '1px solid #596EE6' : '1px solid #E2E8F8',
                  background: isSelected ? 'linear-gradient(135deg, #596EE6 0%, #475AC4 100%)' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#29304A',
                  boxShadow: isSelected ? '0 4px 14px rgba(89, 110, 230, 0.32)' : '0 2px 6px rgba(41, 48, 74, 0.03)',
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
          <Search size={15} color="#596EE6" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="input-control event-search-input"
            placeholder="Search events, bootcamps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search events"
            style={{
              width: '100%',
              padding: '9px 14px 9px 36px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F8',
              borderRadius: '9999px',
              color: 'var(--eventra-ink, #29304A)',
              fontSize: '13px',
              outline: 'none',
              boxShadow: '0 2px 8px rgba(41, 48, 74, 0.03)',
            }}
          />
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600' }}>
            <Sparkles size={16} color="#596EE6" /> Loading events catalog...
          </div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F8', boxShadow: '0 4px 18px rgba(41, 48, 74, 0.04)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>No events found in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {filteredEvents.map((ev) => {
            const isLive = ev.status === 'live';
            return (
              <article
                key={ev.id || ev.eventId}
                className="event-card-item"
                style={{
                  borderRadius: '18px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  background: '#FFFFFF',
                  border: isLive ? '1px solid rgba(89, 110, 230, 0.35)' : '1px solid #E2E8F8',
                  boxShadow: isLive ? '0 10px 30px rgba(89, 110, 230, 0.12)' : '0 4px 18px rgba(41, 48, 74, 0.04)',
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease',
                }}
              >
                {/* Event Banner */}
                <div style={{ position: 'relative', height: '170px', overflow: 'hidden', background: '#EEF0FF' }}>
                  <img
                    src={ev.bannerUrl || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80'}
                    alt={ev.name}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(41, 48, 74, 0.8) 100%)' }} />

                  {/* Status & Category Badges */}
                  <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        background: isLive ? '#ECFDF5' : '#EEF0FF',
                        color: isLive ? '#059669' : '#596EE6',
                        border: isLive ? '1px solid #A7F3D0' : '1px solid #DDE3FF',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {isLive ? '● LIVE' : 'UPCOMING'}
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        background: '#FFFFFF',
                        color: '#29304A',
                        border: '1px solid #E2E8F8',
                      }}
                    >
                      {ev.category}
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '10px',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        background: 'linear-gradient(135deg, #596EE6 0%, #475AC4 100%)',
                        color: '#FFFFFF',
                        boxShadow: '0 2px 8px rgba(89, 110, 230, 0.3)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {ev.feeDisplay || '₹5 Pass'}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Event Title */}
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--eventra-ink, #29304A)', marginBottom: '6px', lineHeight: '1.3' }}>
                    {ev.name}
                  </h3>

                  {/* Tagline */}
                  <p style={{ fontSize: '13px', color: 'var(--text-muted, #5C6479)', marginBottom: '16px', lineHeight: '1.5', flex: 1 }}>
                    {ev.tagline}
                  </p>

                  {/* Date & Venue Metadata */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px', fontSize: '12px', color: 'var(--eventra-ink-light, #3D4666)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={14} color="#596EE6" />
                      <span>{ev.dateDisplay || 'October 2026'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MapPin size={14} color="#596EE6" />
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ev.venue || 'Campus Arena'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '14px', borderTop: '1px solid #E2E8F8' }}>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        if (onSelectEvent) onSelectEvent(ev);
                        else {
                          window.location.hash = '#register';
                        }
                      }}
                      className="btn btn-primary"
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        border: 'none',
                      }}
                    >
                      <span>Register</span>
                      <ArrowUpRight size={14} />
                    </button>

                    <a
                      href="#lookup-section"
                      onClick={() => {
                        sounds.playClick();
                        if (onNavigateToLookup) onNavigateToLookup(ev.id || ev.eventId);
                      }}
                      className="btn btn-secondary"
                      style={{
                        padding: '10px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Ticket size={13} color="#596EE6" />
                      <span>My Pass</span>
                    </a>
                  </div>

                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
