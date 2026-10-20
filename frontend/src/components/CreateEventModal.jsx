import React, { useState } from 'react';
import { X, Plus, Calendar, MapPin, Layers, Users, Sparkles, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const CreateEventModal = ({ onClose, onEventCreated, onShowToast }) => {
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    category: 'Workshop',
    description: '',
    dateDisplay: '',
    timeDisplay: '',
    venue: 'Eventra Main Stage / Hybrid Arena',
    organizerName: 'ACES DIT Pune',
    organizerEmail: 'tigeradi1504@gmail.com',
    googleFormUrl: '',
    totalCapacity: 250,
    ticketTiers: 'Standard Pass, VIP Delegate',
    tracks: 'Track A, Track B',
    status: 'upcoming',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      onShowToast({ type: 'error', title: 'Name Required', message: 'Please enter an event title.' });
      return;
    }

    try {
      setIsSubmitting(true);
      sounds.playClick();

      const payload = {
        ...formData,
        eventId: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        ticketTiers: formData.ticketTiers.split(',').map((t) => t.trim()).filter(Boolean),
        tracks: formData.tracks.split(',').map((t) => t.trim()).filter(Boolean),
        totalCapacity: parseInt(formData.totalCapacity || 200, 10),
      };

      const res = await api.events.create(payload);
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'Event Created! 🎉',
        message: `Event "${payload.name}" is now live on the platform.`,
      });

      if (onEventCreated) onEventCreated(res.data);
      onClose();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Creation Failed',
        message: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(135deg, rgba(89, 110, 230, 0.12) 0%, rgba(168, 180, 255, 0.08) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'var(--eventra-soft-lavender)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Plus size={18} color="var(--eventra-indigo)" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--eventra-ink)' }}>Create New Campus Event</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Launch a hackathon, workshop, gaming tourney, or seminar</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={isSubmitting} style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Event Title */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
              EVENT TITLE *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AI Autonomous Agents Bootcamp 2026"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0b0f19',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
              }}
            />
          </div>

          {/* Tagline & Category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                CATEGORY
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0b0f19',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              >
                <option value="Hackathon">Hackathon</option>
                <option value="Workshop">Workshop / Bootcamp</option>
                <option value="Seminar">Tech Seminar / Keynote</option>
                <option value="Gaming">Esports / Gaming</option>
                <option value="Cultural">Cultural / Fest</option>
                <option value="Competition">Coding Competition</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                STATUS
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0b0f19',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              >
                <option value="upcoming">Upcoming</option>
                <option value="live">Live / Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Tagline */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
              SHORT TAGLINE
            </label>
            <input
              type="text"
              placeholder="e.g. Master LangChain & Swarm Multi-Agent Architectures in 2 Days"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0b0f19',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Date & Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                EVENT DATES
              </label>
              <input
                type="text"
                placeholder="e.g. November 5 – 6, 2026"
                value={formData.dateDisplay}
                onChange={(e) => setFormData({ ...formData, dateDisplay: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0b0f19',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                TIMINGS / GATES
              </label>
              <input
                type="text"
                placeholder="e.g. 10:00 AM – 05:00 PM IST"
                value={formData.timeDisplay}
                onChange={(e) => setFormData({ ...formData, timeDisplay: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0b0f19',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Venue & Capacity */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                VENUE
              </label>
              <input
                type="text"
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0b0f19',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                MAX CAPACITY
              </label>
              <input
                type="number"
                value={formData.totalCapacity}
                onChange={(e) => setFormData({ ...formData, totalCapacity: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0b0f19',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Google Form Link */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
              GOOGLE REGISTRATION FORM URL
            </label>
            <input
              type="url"
              placeholder="https://forms.gle/..."
              value={formData.googleFormUrl}
              onChange={(e) => setFormData({ ...formData, googleFormUrl: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#0b0f19',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Ticket Tiers & Tracks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                TICKET TIERS (Comma-separated)
              </label>
              <input
                type="text"
                value={formData.ticketTiers}
                onChange={(e) => setFormData({ ...formData, ticketTiers: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0b0f19',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '6px', display: 'block' }}>
                TRACKS / TOPICS (Comma-separated)
              </label>
              <input
                type="text"
                value={formData.tracks}
                onChange={(e) => setFormData({ ...formData, tracks: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: '#0b0f19',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, var(--eventra-indigo) 0%, var(--eventra-indigo-dark) 100%)',
                color: '#fff',
                fontWeight: '800',
                border: '1px solid rgba(168, 180, 255, 0.4)',
                boxShadow: '0 4px 14px rgba(89, 110, 230, 0.3)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isSubmitting ? 'Creating Event...' : '🚀 Launch Event on Platform'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
