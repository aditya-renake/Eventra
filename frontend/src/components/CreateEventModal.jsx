import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  Layers, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Image, 
  Link as LinkIcon, 
  Globe, 
  Phone, 
  Mail, 
  User, 
  Shield, 
  HelpCircle, 
  ArrowRight, 
  Tag, 
  Target, 
  Settings, 
  Check, 
  Plus, 
  Trash2, 
  Building2,
  ExternalLink,
  Crown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

const STEPS = [
  { id: 1, label: 'Essentials', sublabel: 'Structure & Basics' },
  { id: 2, label: 'When & where', sublabel: 'Schedule & Venue' },
  { id: 3, label: 'Look & POC', sublabel: 'Theme, Poster & POC' },
  { id: 4, label: 'Tickets & seats', sublabel: 'Pricing & Capacity' },
  { id: 5, label: 'Questions & links', sublabel: 'Form & Channels' },
  { id: 6, label: 'Review & visibility', sublabel: 'Live Launch' },
];

const CURATED_POSTERS = [
  {
    title: 'Hackathon Tech Matrix',
    category: 'Hackathon',
    url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'AI Swarm Bootcamp',
    category: 'Workshop',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Esports Arena LAN',
    category: 'Gaming',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Campus Cultural Fest',
    category: 'Cultural',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
  },
  {
    title: 'Tech Keynote & Summit',
    category: 'Seminar',
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80',
  },
];

const THEME_COLORS = [
  { name: 'Electric Indigo', hex: '#596EE6' },
  { name: 'Cyber Violet', hex: '#8B5CF6' },
  { name: 'Emerald Tech', hex: '#10B981' },
  { name: 'Neon Cyan', hex: '#06B6D4' },
  { name: 'Sunset Flame', hex: '#F43F5E' },
  { name: 'Amber Gold', hex: '#F59E0B' },
];

export const CreateEventModal = ({ onClose, onEventCreated, onShowToast }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Core Form State across the 6 Systematic Steps
  const [formData, setFormData] = useState({
    // Step 1: Essentials & Structure
    structureType: 'single', // 'single' | 'sub-events'
    collegeName: 'Dr. D. Y. Patil Institute of Technology Pimpri',
    name: '',
    slug: '',
    category: 'Hackathon',
    description: '',

    // Step 2: When & where
    mode: 'in_person', // 'in_person' | 'online' | 'hybrid'
    startDate: '2026-11-15T09:00',
    endDate: '2026-11-17T18:00',
    dateDisplay: 'November 15 – 17, 2026',
    timeDisplay: '09:00 AM – 06:00 PM IST (Gate Check-in: 07:45 AM)',
    venue: 'Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune',
    venueHall: 'Main Stage & Block 402 High-Density Computing Lab',
    mapUrl: 'https://maps.google.com/?q=DYP+Institute+of+Technology+Pimpri',
    meetingUrl: '',

    // Step 3: Look & POC
    tagline: 'India’s Flagship 48-Hour National Hackathon • ACES DIT Pune',
    themeColor: '#596EE6',
    bannerUrl: CURATED_POSTERS[0].url,
    clubName: 'Association of Computer Engineering Students (ACES)',
    clubCode: 'ASS29EE',
    organizerName: 'Aditya Renake',
    organizerRole: 'Club President / Lead Organizer',
    organizerEmail: 'tigeradi1504@gmail.com',
    organizerPhone: '+91 98765 43210',
    alternatePOC: 'ACES Tech Secretariat (+91 98220 54321)',

    // Step 4: Tickets & seats
    pricingType: 'paid', // 'free' | 'paid'
    entryFee: 5,
    feeDisplay: '₹5 Entry Pass',
    totalCapacity: 250,
    ticketTiers: 'Standard Pass, VIP Delegate, Hacker Pass',
    tracks: 'AI & Agents, Cybersecurity, Web3, Cloud Distributed Systems',
    subEvents: [], // Array of { id, name, category, fee, seats, coordinator }

    // Step 5: Questions & links
    requiredFields: {
      fullName: true,
      email: true,
      phone: true,
      college: true,
      branch: true,
      year: true,
      prn: true,
      github: true,
      linkedin: false,
    },
    customQuestion: 'Do you require on-campus overnight hacker accommodation?',
    whatsappUrl: 'https://chat.whatsapp.com/ACES-Eventra-2026-Official',
    discordUrl: 'https://discord.gg/aces-hackers',
    brochureUrl: '',
    socialUrl: 'https://instagram.com/aces_dit_pune',

    // Step 6: Review & visibility
    status: 'upcoming', // 'upcoming' | 'live' | 'draft'
    isFlagship: true,
    allowSpotRegistration: true,
  });

  // State for adding a sub-event dynamically in Step 4
  const [newSubEvent, setNewSubEvent] = useState({
    name: '',
    category: 'Coding',
    fee: 5,
    seats: 60,
    coordinator: 'ACES Sub-Lead',
  });

  // Auto-generate share slug from Event Name
  const handleNameChange = (val) => {
    const updated = { ...formData, name: val };
    if (!slugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      updated.slug = generated;
    }
    setFormData(updated);
  };

  // Image Upload handler (reads local file to base64 preview)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3.5 * 1024 * 1024) {
        onShowToast({
          type: 'warning',
          title: 'Large Image',
          message: 'Image size exceeds 3.5MB. Consider using a compressed image.',
        });
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, bannerUrl: event.target.result });
        sounds.playClick();
      };
      reader.readAsDataURL(file);
    }
  };

  // Sub-event management
  const handleAddSubEvent = () => {
    if (!newSubEvent.name.trim()) {
      onShowToast({ type: 'warning', title: 'Sub-Event Name', message: 'Please enter sub-event title.' });
      return;
    }
    sounds.playClick();
    const item = {
      id: `sub-${Date.now()}`,
      ...newSubEvent,
      fee: parseInt(newSubEvent.fee || 0, 10),
      seats: parseInt(newSubEvent.seats || 50, 10),
    };
    setFormData({
      ...formData,
      subEvents: [...formData.subEvents, item],
    });
    setNewSubEvent({
      name: '',
      category: 'Coding',
      fee: 5,
      seats: 60,
      coordinator: 'ACES Sub-Lead',
    });
  };

  const handleRemoveSubEvent = (id) => {
    sounds.playClick();
    setFormData({
      ...formData,
      subEvents: formData.subEvents.filter((s) => s.id !== id),
    });
  };

  // Step Validation before proceeding
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        onShowToast({ type: 'error', title: 'Event Name Required', message: 'Please enter an event title.' });
        return;
      }
      if (!formData.description.trim()) {
        onShowToast({ type: 'error', title: 'Description Required', message: 'Please write a brief event description.' });
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.venue.trim()) {
        onShowToast({ type: 'error', title: 'Venue Required', message: 'Please specify the event venue.' });
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.organizerName.trim() || !formData.organizerEmail.trim() || !formData.organizerPhone.trim()) {
        onShowToast({
          type: 'error',
          title: 'POC Contact Required',
          message: 'Please provide primary contact name, email, and phone number.',
        });
        return;
      }
    } else if (currentStep === 4) {
      if (formData.structureType === 'sub-events' && formData.subEvents.length === 0) {
        onShowToast({
          type: 'warning',
          title: 'No Sub-Events Added',
          message: 'You selected "Event with Sub-events". Please add at least one sub-event activity.',
        });
        return;
      }
    }

    sounds.playClick();
    setCurrentStep((prev) => Math.min(prev + 1, 6));
  };

  const handlePrevStep = () => {
    sounds.playClick();
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Final Launch Event Submission
  const handleFinalLaunch = async () => {
    try {
      setIsSubmitting(true);
      sounds.playClick();

      const eventIdClean = (formData.slug || formData.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const payload = {
        ...formData,
        id: eventIdClean,
        eventId: eventIdClean,
        entryFee: formData.pricingType === 'free' ? 0 : parseInt(formData.entryFee || 0, 10),
        feeDisplay:
          formData.pricingType === 'free' || parseInt(formData.entryFee || 0, 10) === 0
            ? 'Free Entry Pass'
            : `₹${formData.entryFee} Entry Pass`,
        ticketTiers: typeof formData.ticketTiers === 'string'
          ? formData.ticketTiers.split(',').map((t) => t.trim()).filter(Boolean)
          : formData.ticketTiers,
        tracks: typeof formData.tracks === 'string'
          ? formData.tracks.split(',').map((t) => t.trim()).filter(Boolean)
          : formData.tracks,
        totalCapacity: parseInt(formData.totalCapacity || 250, 10),
        createdAt: new Date().toISOString(),
      };

      const res = await api.events.create(payload);

      // Trigger Celebration
      sounds.playSuccess();
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#596EE6', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'],
        });
      } catch (err) {
        // Fallback if canvas-confetti is blocked
      }

      onShowToast({
        type: 'success',
        title: 'Event Launched Successfully! 🚀',
        message: `"${payload.name}" is now live on the campus platform.`,
      });

      if (onEventCreated) onEventCreated(res.data || payload);
      onClose();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Launch Failed',
        message: err.message || 'Could not launch event. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="event-wizard-overlay" onClick={onClose}>
      <div className="event-wizard-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Top Header Bar (Screenshot 1) */}
        <div className="event-wizard-topbar">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={currentStep > 1 ? handlePrevStep : onClose}
            style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px' }}
          >
            <ChevronLeft size={16} />
            <span style={{ fontSize: '12px' }}>{currentStep > 1 ? 'Back' : 'Close'}</span>
          </button>

          <div className="event-wizard-brand">
            <Sparkles size={16} color="#596EE6" />
            <span>CAMPUS MEET • EVENTRA</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '700' }}>
              STEP {currentStep} OF 6
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: '6px', borderRadius: '50%', color: '#94A3B8' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Hero Step Title Header (Screenshot 1 & 2) */}
        <div className="event-wizard-header">
          <div className="event-wizard-step-label">
            STEP {currentStep} OF 6 · {STEPS[currentStep - 1].sublabel.toUpperCase()}
          </div>
          <h2 className="event-wizard-title">Create Event</h2>
          <div className="event-wizard-meta">
            <span>Creating event as: <strong>{formData.clubName}</strong></span>
            <span className="event-wizard-club-badge">Club Code: {formData.clubCode}</span>
          </div>
        </div>

        {/* 6-Step Stepper Component (Screenshots 2 & 3) */}
        <div className="event-wizard-stepper-wrap">
          <div className="event-wizard-stepper">
            {STEPS.map((step, idx) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              const isUpcoming = step.id > currentStep;

              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    className={`stepper-item ${isActive ? 'active' : isCompleted ? 'completed' : 'upcoming'}`}
                    onClick={() => {
                      if (isCompleted || isActive) {
                        sounds.playClick();
                        setCurrentStep(step.id);
                      }
                    }}
                    disabled={isUpcoming}
                    title={step.label}
                  >
                    <div className="stepper-circle">
                      {isCompleted ? <Check size={13} strokeWidth={3} /> : step.id}
                    </div>
                    <span className="stepper-label">{step.label}</span>
                  </button>

                  {idx < STEPS.length - 1 && (
                    <div className={`stepper-line ${isCompleted ? 'completed' : ''}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Wizard Step Body */}
        <div className="event-wizard-body">

          {/* ========================================================================= */}
          {/* STEP 1: ESSENTIALS (STRUCTURE & BASICS)                                   */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Event Structure Selection (Screenshot 1) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Layers size={18} color="#3B82F6" />
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
                    What type of event are you creating?
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 14px 0' }}>
                  Choose the structure that best fits your event. This will determine how users register.
                </p>

                {/* Summary Alert */}
                <div className="wizard-info-box" style={{ marginBottom: '16px' }}>
                  <AlertCircle size={16} color="#60A5FA" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <strong>Quick Summary:</strong> Both event types follow 6 guided steps. Sub-events stay on Tickets & seats.
                  </div>
                </div>

                {/* 2 Selectable Cards */}
                <div className="structure-cards-grid">
                  
                  {/* Single Event Card */}
                  <div
                    className={`structure-card ${formData.structureType === 'single' ? 'selected' : ''}`}
                    onClick={() => {
                      sounds.playClick();
                      setFormData({ ...formData, structureType: 'single' });
                    }}
                  >
                    <div className="structure-card-icon">
                      <Target size={22} />
                    </div>
                    <div>
                      <h4 className="structure-card-title">Single Event</h4>
                      <p className="structure-card-desc">
                        A standalone event with one main activity. Participants register for the entire event.
                      </p>
                    </div>
                    <div className="structure-card-eg">
                      e.g., Workshop, Seminar, Concert, Single Competition
                    </div>
                    {formData.structureType === 'single' && (
                      <span style={{ position: 'absolute', top: '14px', right: '14px', background: '#3B82F6', color: '#fff', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                  </div>

                  {/* Event with Sub-events Card */}
                  <div
                    className={`structure-card ${formData.structureType === 'sub-events' ? 'selected' : ''}`}
                    onClick={() => {
                      sounds.playClick();
                      setFormData({ ...formData, structureType: 'sub-events' });
                    }}
                  >
                    <div className="structure-card-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#A78BFA', borderColor: 'rgba(139, 92, 246, 0.25)' }}>
                      <Layers size={22} />
                    </div>
                    <div>
                      <h4 className="structure-card-title">Event with Sub-events</h4>
                      <p className="structure-card-desc">
                        A main event containing multiple sub-events. Participants can register for individual sub-events.
                      </p>
                    </div>
                    <div className="structure-card-eg">
                      e.g., College Fest (with multiple competitions), Tech Summit (with workshops & hackathons)
                    </div>
                    {formData.structureType === 'sub-events' && (
                      <span style={{ position: 'absolute', top: '14px', right: '14px', background: '#3B82F6', color: '#fff', borderRadius: '50%', padding: '2px', display: 'flex' }}>
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                  </div>

                </div>

                {/* How to choose helper */}
                <div className="wizard-tip-box" style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: '#F1F5F9', marginBottom: '4px' }}>
                    <HelpCircle size={14} color="#F59E0B" />
                    <span>How to choose?</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <li><strong>Single Event:</strong> Choose this if you have one main activity with a single registration fee.</li>
                    <li><strong>Event with Sub-events:</strong> Choose this if you have multiple activities under one main event, each with its own fee.</li>
                  </ul>
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#F59E0B', fontWeight: '700' }}>
                    ⚠️ You can't change this structure later. Choose carefully!
                  </div>
                </div>
              </div>

              {/* Event Basics Form (Screenshot 2) */}
              <div style={{ borderTop: '1px solid #1E283D', paddingTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <Sparkles size={16} color="#F59E0B" />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>Event Basics</h3>
                </div>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 16px 0' }}>
                  Fill in the basic identity details of your event
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Official College Box (Screenshot 2) */}
                  <div className="wizard-field">
                    <label className="wizard-label">OFFICIAL COLLEGE</label>
                    <div
                      style={{
                        background: '#090D18',
                        border: '1px solid #1E283D',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: '800', color: '#F8FAFC' }}>
                        {formData.collegeName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        This club is already bound to that campus, so a token is not required.
                      </div>
                    </div>
                  </div>

                  {/* Event Name */}
                  <div className="wizard-field">
                    <label className="wizard-label">
                      EVENT NAME *
                    </label>
                    <input
                      type="text"
                      required
                      className="wizard-input"
                      placeholder="e.g., Tech Summit 2026, Cultural Fest, Sports Tournament, Zion Hackathon"
                      value={formData.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                    />
                  </div>

                  {/* Share Link (Optional) */}
                  <div className="wizard-field">
                    <label className="wizard-label">SHARE LINK (OPTIONAL)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                      <span
                        style={{
                          background: '#151D2C',
                          border: '1px solid #1E283D',
                          borderRight: 'none',
                          borderTopLeftRadius: '8px',
                          borderBottomLeftRadius: '8px',
                          padding: '10px 12px',
                          fontSize: '12px',
                          color: '#94A3B8',
                          fontWeight: '700',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        campusmeet.in/
                      </span>
                      <input
                        type="text"
                        className="wizard-input"
                        style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                        placeholder="auto from event name (e.g. zion)"
                        value={formData.slug}
                        onChange={(e) => {
                          setSlugManuallyEdited(true);
                          setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') });
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      Students open this short link. Leave blank to auto-generate from the event name.
                    </span>
                  </div>

                  {/* Category Dropdown */}
                  <div className="wizard-field">
                    <label className="wizard-label">CATEGORY *</label>
                    <select
                      className="wizard-select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="Hackathon">💻 Hackathon (48h Continuous Code / Innovation)</option>
                      <option value="Workshop">🤖 Workshop / AI Bootcamp</option>
                      <option value="Tech Summit">🚀 Tech Summit / Conference</option>
                      <option value="Gaming">🎮 Esports & LAN Gaming Championship</option>
                      <option value="Competition">⚡ Coding & Algorithmic Competition</option>
                      <option value="Seminar">🎤 Tech Talk & Keynote</option>
                      <option value="Cultural">🎭 Cultural Fest & Musical Night</option>
                      <option value="Sports">🏆 Sports & Athletics Tournament</option>
                      <option value="Other">🌟 Other Campus Event</option>
                    </select>
                  </div>

                  {/* Event Description */}
                  <div className="wizard-field">
                    <label className="wizard-label">EVENT DESCRIPTION *</label>
                    <textarea
                      rows={4}
                      required
                      className="wizard-textarea"
                      placeholder="Describe your event in detail. Include purpose, highlights, activities, rulebook highlights, eligibility, etc. This will be shown to participants."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: WHEN & WHERE                                                      */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 4px 0' }}>
                  📅 Event Schedule & Location
                </h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
                  Configure dates, timings, format, and physical or virtual location details.
                </p>
              </div>

              {/* Event Format / Mode Pill Selector */}
              <div className="wizard-field">
                <label className="wizard-label">EVENT FORMAT / MODE</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  {[
                    { id: 'in_person', label: '🏢 In-Person (On Campus)', desc: 'Physical venue attendance' },
                    { id: 'online', label: '🌐 Virtual (Online)', desc: 'Zoom / Meet / Discord stream' },
                    { id: 'hybrid', label: '⚡ Hybrid Format', desc: 'On-campus + Live Stream' },
                  ].map((mode) => (
                    <div
                      key={mode.id}
                      onClick={() => {
                        sounds.playClick();
                        setFormData({ ...formData, mode: mode.id });
                      }}
                      style={{
                        background: formData.mode === mode.id ? 'rgba(59, 130, 246, 0.12)' : '#090D18',
                        border: formData.mode === mode.id ? '2px solid #3B82F6' : '1px solid #1E283D',
                        borderRadius: '10px',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF', marginBottom: '2px' }}>
                        {mode.label}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{mode.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule Dates & Times */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="wizard-field">
                  <label className="wizard-label">START DATE & TIME *</label>
                  <input
                    type="datetime-local"
                    className="wizard-input"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div className="wizard-field">
                  <label className="wizard-label">END DATE & TIME *</label>
                  <input
                    type="datetime-local"
                    className="wizard-input"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Human Readable Date & Time Strings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="wizard-field">
                  <label className="wizard-label">DISPLAY DATES STRING</label>
                  <input
                    type="text"
                    className="wizard-input"
                    placeholder="e.g. October 16 – 18, 2026"
                    value={formData.dateDisplay}
                    onChange={(e) => setFormData({ ...formData, dateDisplay: e.target.value })}
                  />
                </div>

                <div className="wizard-field">
                  <label className="wizard-label">GATE CHECK-IN / TIMINGS</label>
                  <input
                    type="text"
                    className="wizard-input"
                    placeholder="e.g. 09:00 AM – 06:00 PM IST (Gate Check-in: 07:45 AM)"
                    value={formData.timeDisplay}
                    onChange={(e) => setFormData({ ...formData, timeDisplay: e.target.value })}
                  />
                </div>
              </div>

              {/* Venue Details */}
              <div className="wizard-field">
                <label className="wizard-label">CAMPUS VENUE / AUDITORIUM *</label>
                <input
                  type="text"
                  required
                  className="wizard-input"
                  placeholder="e.g. Dr. D. Y. Patil Institute of Technology, Pimpri, Pune"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="wizard-field">
                  <label className="wizard-label">SPECIFIC ROOM / BLOCK / HALL</label>
                  <input
                    type="text"
                    className="wizard-input"
                    placeholder="e.g. Main Auditorium & High-Performance Lab (Block 402)"
                    value={formData.venueHall}
                    onChange={(e) => setFormData({ ...formData, venueHall: e.target.value })}
                  />
                </div>

                <div className="wizard-field">
                  <label className="wizard-label">GOOGLE MAPS PIN LINK</label>
                  <input
                    type="url"
                    className="wizard-input"
                    placeholder="https://maps.google.com/?q=..."
                    value={formData.mapUrl}
                    onChange={(e) => setFormData({ ...formData, mapUrl: e.target.value })}
                  />
                </div>
              </div>

              {(formData.mode === 'online' || formData.mode === 'hybrid') && (
                <div className="wizard-field">
                  <label className="wizard-label">VIRTUAL STREAM / MEETING LINK</label>
                  <input
                    type="url"
                    className="wizard-input"
                    placeholder="https://meet.google.com/xyz or YouTube Live Link"
                    value={formData.meetingUrl}
                    onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                  />
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: LOOK & POC (THEME, POSTER & CLUB CONTACT)                         */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 4px 0' }}>
                  🎨 Visual Theme, Poster & Club POC Contact
                </h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
                  Set up visual branding, upload an event poster, and designate the lead club person for student inquiries.
                </p>
              </div>

              {/* Tagline */}
              <div className="wizard-field">
                <label className="wizard-label">EVENT TAGLINE / SLOGAN</label>
                <input
                  type="text"
                  className="wizard-input"
                  placeholder="e.g. India's Flagship 48-Hour National Hackathon • ACES DIT Pune"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                />
              </div>

              {/* Theme Color Selector */}
              <div className="wizard-field">
                <label className="wizard-label">VISUAL THEME ACCENT COLOR</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {THEME_COLORS.map((color) => {
                    const isSelected = formData.themeColor.toLowerCase() === color.hex.toLowerCase();
                    return (
                      <button
                        key={color.hex}
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          setFormData({ ...formData, themeColor: color.hex });
                        }}
                        style={{
                          background: isSelected ? 'rgba(255, 255, 255, 0.1)' : '#090D18',
                          border: isSelected ? `2px solid ${color.hex}` : '1px solid #1E283D',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          color: '#FFFFFF',
                          fontSize: '12px',
                          fontWeight: '700',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span
                          style={{
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            background: color.hex,
                            display: 'inline-block',
                            boxShadow: `0 0 8px ${color.hex}88`,
                          }}
                        />
                        <span>{color.name}</span>
                        {isSelected && <Check size={12} color={color.hex} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Poster / Banner Image Section */}
              <div className="wizard-field">
                <label className="wizard-label">EVENT BANNER / POSTER IMAGE</label>
                
                {/* Image URL input & File upload */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="url"
                    className="wizard-input"
                    placeholder="Paste image URL (e.g. https://... or select a preset below)"
                    value={formData.bannerUrl}
                    onChange={(e) => setFormData({ ...formData, bannerUrl: e.target.value })}
                  />
                  <label
                    style={{
                      background: '#151D2C',
                      border: '1px solid #243046',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Upload size={14} />
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>

                {/* Curated Presets Selection */}
                <div style={{ marginTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginBottom: '6px' }}>
                    Quick High-Res Presets (Click to apply):
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    {CURATED_POSTERS.map((preset) => {
                      const isChosen = formData.bannerUrl === preset.url;
                      return (
                        <div
                          key={preset.title}
                          onClick={() => {
                            sounds.playClick();
                            setFormData({ ...formData, bannerUrl: preset.url });
                          }}
                          style={{
                            height: '64px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            position: 'relative',
                            cursor: 'pointer',
                            border: isChosen ? '2px solid #3B82F6' : '1px solid #1E283D',
                            boxShadow: isChosen ? '0 0 12px rgba(59, 130, 246, 0.4)' : 'none',
                          }}
                        >
                          <img
                            src={preset.url}
                            alt={preset.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'linear-gradient(180deg, transparent 20%, rgba(0,0,0,0.85) 100%)',
                              padding: '4px 6px',
                              display: 'flex',
                              alignItems: 'flex-end',
                            }}
                          >
                            <span style={{ fontSize: '10px', fontWeight: '800', color: '#FFFFFF' }}>
                              {preset.title}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Poster Live Preview */}
                {formData.bannerUrl && (
                  <div
                    style={{
                      marginTop: '12px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: `1px solid ${formData.themeColor}55`,
                      maxHeight: '160px',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={formData.bannerUrl}
                      alt="Banner Preview"
                      style={{ width: '100%', height: '160px', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(8px)',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: '800',
                        color: '#FFFFFF',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                      }}
                    >
                      Poster Preview • {formData.category}
                    </div>
                  </div>
                )}
              </div>

              {/* Club Person of Contact (POC) Details */}
              <div style={{ borderTop: '1px solid #1E283D', paddingTop: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <User size={16} color="#3B82F6" />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
                    Club Person of Contact (POC) Details
                  </h3>
                </div>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 14px 0' }}>
                  These contact details will be provided to participants for queries, reporting, and gate inquiries.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  
                  <div className="wizard-field">
                    <label className="wizard-label">PRIMARY CLUB POC NAME *</label>
                    <input
                      type="text"
                      required
                      className="wizard-input"
                      placeholder="e.g. Aditya Renake"
                      value={formData.organizerName}
                      onChange={(e) => setFormData({ ...formData, organizerName: e.target.value })}
                    />
                  </div>

                  <div className="wizard-field">
                    <label className="wizard-label">POC DESIGNATION / ROLE</label>
                    <input
                      type="text"
                      className="wizard-input"
                      placeholder="e.g. Club President / Technical Secretary"
                      value={formData.organizerRole}
                      onChange={(e) => setFormData({ ...formData, organizerRole: e.target.value })}
                    />
                  </div>

                  <div className="wizard-field">
                    <label className="wizard-label">POC EMAIL ADDRESS *</label>
                    <input
                      type="email"
                      required
                      className="wizard-input"
                      placeholder="e.g. tigeradi1504@gmail.com"
                      value={formData.organizerEmail}
                      onChange={(e) => setFormData({ ...formData, organizerEmail: e.target.value })}
                    />
                  </div>

                  <div className="wizard-field">
                    <label className="wizard-label">POC PHONE / WHATSAPP NUMBER *</label>
                    <input
                      type="tel"
                      required
                      className="wizard-input"
                      placeholder="e.g. +91 98765 43210"
                      value={formData.organizerPhone}
                      onChange={(e) => setFormData({ ...formData, organizerPhone: e.target.value })}
                    />
                  </div>

                  <div className="wizard-field" style={{ gridColumn: 'span 2' }}>
                    <label className="wizard-label">ALTERNATE POC / FACULTY COORDINATOR (OPTIONAL)</label>
                    <input
                      type="text"
                      className="wizard-input"
                      placeholder="e.g. Prof. Faculty Coordinator (+91 98220 12345)"
                      value={formData.alternatePOC}
                      onChange={(e) => setFormData({ ...formData, alternatePOC: e.target.value })}
                    />
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: TICKETS & SEATS (PRICING & SUB-EVENTS)                            */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 4px 0' }}>
                  🎟️ Ticket Pricing, Seats & Tiers
                </h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
                  Configure registration fee structure, maximum capacity, and sub-event activities.
                </p>
              </div>

              {/* Free vs Paid Toggle */}
              <div className="wizard-field">
                <label className="wizard-label">PRICING MODEL</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div
                    onClick={() => {
                      sounds.playClick();
                      setFormData({ ...formData, pricingType: 'paid' });
                    }}
                    style={{
                      background: formData.pricingType === 'paid' ? 'rgba(59, 130, 246, 0.12)' : '#090D18',
                      border: formData.pricingType === 'paid' ? '2px solid #3B82F6' : '1px solid #1E283D',
                      borderRadius: '10px',
                      padding: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', marginBottom: '2px' }}>
                      💰 Paid Ticket / Pass
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                      Require UPI / Card payment via Razorpay gateway.
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      sounds.playClick();
                      setFormData({ ...formData, pricingType: 'free', entryFee: 0 });
                    }}
                    style={{
                      background: formData.pricingType === 'free' ? 'rgba(16, 185, 129, 0.12)' : '#090D18',
                      border: formData.pricingType === 'free' ? '2px solid #10B981' : '1px solid #1E283D',
                      borderRadius: '10px',
                      padding: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', marginBottom: '2px' }}>
                      🎁 100% Free Event
                    </div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                      Instant registration pass generation with zero fee.
                    </div>
                  </div>
                </div>
              </div>

              {/* Price & Capacity Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="wizard-field">
                  <label className="wizard-label">
                    {formData.pricingType === 'paid' ? 'BASE TICKET PRICE (₹ INR) *' : 'ENTRY FEE'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={formData.pricingType === 'free'}
                    className="wizard-input"
                    value={formData.pricingType === 'free' ? 0 : formData.entryFee}
                    onChange={(e) => {
                      const val = parseInt(e.target.value || 0, 10);
                      setFormData({
                        ...formData,
                        entryFee: val,
                        feeDisplay: val > 0 ? `₹${val} Entry Pass` : 'Free Pass',
                      });
                    }}
                  />
                </div>

                <div className="wizard-field">
                  <label className="wizard-label">MAX SEAT CAPACITY / ATTENDEES *</label>
                  <input
                    type="number"
                    min="1"
                    className="wizard-input"
                    value={formData.totalCapacity}
                    onChange={(e) => setFormData({ ...formData, totalCapacity: e.target.value })}
                  />
                </div>
              </div>

              {/* Ticket Tiers & Tracks */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="wizard-field">
                  <label className="wizard-label">TICKET TIERS (COMMA-SEPARATED)</label>
                  <input
                    type="text"
                    className="wizard-input"
                    placeholder="e.g. Standard Pass, VIP Delegate, Hacker Pass"
                    value={formData.ticketTiers}
                    onChange={(e) => setFormData({ ...formData, ticketTiers: e.target.value })}
                  />
                </div>

                <div className="wizard-field">
                  <label className="wizard-label">TRACKS / TOPICS (COMMA-SEPARATED)</label>
                  <input
                    type="text"
                    className="wizard-input"
                    placeholder="e.g. AI & Agents, Cybersecurity, Web3, Cloud"
                    value={formData.tracks}
                    onChange={(e) => setFormData({ ...formData, tracks: e.target.value })}
                  />
                </div>
              </div>

              {/* Sub-events Manager (Activates if 'Event with Sub-events' was selected in Step 1) */}
              {formData.structureType === 'sub-events' && (
                <div
                  style={{
                    border: '1px solid #1E283D',
                    background: '#090D18',
                    borderRadius: '12px',
                    padding: '18px',
                    marginTop: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Layers size={16} color="#A78BFA" />
                    <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
                      Sub-events & Competitions Manager
                    </h4>
                  </div>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 14px 0' }}>
                    Add individual sub-events, coding competitions, or workshops under this main festival.
                  </p>

                  {/* Add Sub-event Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'flex-end', marginBottom: '14px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: '#64748B', display: 'block', marginBottom: '4px' }}>SUB-EVENT TITLE</label>
                      <input
                        type="text"
                        className="wizard-input"
                        placeholder="e.g. Speed Coding Clash"
                        value={newSubEvent.name}
                        onChange={(e) => setNewSubEvent({ ...newSubEvent, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', color: '#64748B', display: 'block', marginBottom: '4px' }}>CATEGORY</label>
                      <select
                        className="wizard-select"
                        value={newSubEvent.category}
                        onChange={(e) => setNewSubEvent({ ...newSubEvent, category: e.target.value })}
                      >
                        <option value="Coding">Coding</option>
                        <option value="Gaming">Gaming</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Quiz">Quiz</option>
                        <option value="Robotics">Robotics</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', color: '#64748B', display: 'block', marginBottom: '4px' }}>PRICE (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="wizard-input"
                        value={newSubEvent.fee}
                        onChange={(e) => setNewSubEvent({ ...newSubEvent, fee: e.target.value })}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '10px', color: '#64748B', display: 'block', marginBottom: '4px' }}>SEATS</label>
                      <input
                        type="number"
                        min="1"
                        className="wizard-input"
                        value={newSubEvent.seats}
                        onChange={(e) => setNewSubEvent({ ...newSubEvent, seats: e.target.value })}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddSubEvent}
                      className="btn btn-primary"
                      style={{
                        padding: '10px 14px',
                        background: '#3B82F6',
                        color: '#fff',
                        borderRadius: '8px',
                        fontWeight: '800',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Sub-events List */}
                  {formData.subEvents.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {formData.subEvents.map((sub, sidx) => (
                        <div
                          key={sub.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: '#0D1322',
                            border: '1px solid #1E283D',
                            borderRadius: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#60A5FA' }}>#{sidx + 1}</span>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF' }}>{sub.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748B' }}>Category: {sub.category} • Seats: {sub.seats}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#10B981', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                              ₹{sub.fee}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubEvent(sub.id)}
                              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '16px', color: '#64748B', fontSize: '12px' }}>
                      No sub-events added yet. Use the inputs above to add sub-competitions.
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: QUESTIONS & LINKS (FORM INTAKE & COMMUNITY)                       */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 4px 0' }}>
                  🔗 Attendee Questions & Community Links
                </h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
                  Configure what information to collect from attendees and add WhatsApp / Discord community links.
                </p>
              </div>

              {/* Attendee Data Intake Checkboxes */}
              <div className="wizard-field">
                <label className="wizard-label">REQUIRED ATTENDEE REGISTRATION FIELDS</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {[
                    { key: 'fullName', label: 'Full Name', locked: true },
                    { key: 'email', label: 'Email Address', locked: true },
                    { key: 'phone', label: 'Phone / WhatsApp', locked: true },
                    { key: 'college', label: 'College / Institute Name' },
                    { key: 'branch', label: 'Branch / Engineering Stream' },
                    { key: 'year', label: 'Graduation Year' },
                    { key: 'prn', label: 'Student PRN / Roll Number' },
                    { key: 'github', label: 'GitHub / Portfolio URL' },
                    { key: 'linkedin', label: 'LinkedIn Profile' },
                  ].map((field) => (
                    <label
                      key={field.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#090D18',
                        border: '1px solid #1E283D',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#F8FAFC',
                        cursor: field.locked ? 'default' : 'pointer',
                      }}
                    >
                      <input
                        type="checkbox"
                        disabled={field.locked}
                        checked={field.locked || !!formData.requiredFields[field.key]}
                        onChange={(e) => {
                          sounds.playClick();
                          setFormData({
                            ...formData,
                            requiredFields: {
                              ...formData.requiredFields,
                              [field.key]: e.target.checked,
                            },
                          });
                        }}
                      />
                      <span>{field.label}</span>
                      {field.locked && (
                        <span style={{ fontSize: '10px', color: '#64748B', marginLeft: 'auto' }}>
                          (Mandatory)
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Custom Prompt / Question */}
              <div className="wizard-field">
                <label className="wizard-label">CUSTOM REGISTRATION QUESTION (OPTIONAL)</label>
                <input
                  type="text"
                  className="wizard-input"
                  placeholder="e.g. Do you require campus hostel accommodation? / T-Shirt Size?"
                  value={formData.customQuestion}
                  onChange={(e) => setFormData({ ...formData, customQuestion: e.target.value })}
                />
              </div>

              {/* Community & Broadcast Links */}
              <div style={{ borderTop: '1px solid #1E283D', paddingTop: '18px' }}>
                <label className="wizard-label" style={{ marginBottom: '12px' }}>
                  COMMUNITY & EVENT RESOURCE LINKS
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="wizard-field">
                    <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700' }}>
                      WHATSAPP PARTICIPANT GROUP
                    </label>
                    <input
                      type="url"
                      className="wizard-input"
                      placeholder="https://chat.whatsapp.com/..."
                      value={formData.whatsappUrl}
                      onChange={(e) => setFormData({ ...formData, whatsappUrl: e.target.value })}
                    />
                  </div>

                  <div className="wizard-field">
                    <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700' }}>
                      DISCORD / TELEGRAM CHANNEL
                    </label>
                    <input
                      type="url"
                      className="wizard-input"
                      placeholder="https://discord.gg/..."
                      value={formData.discordUrl}
                      onChange={(e) => setFormData({ ...formData, discordUrl: e.target.value })}
                    />
                  </div>

                  <div className="wizard-field">
                    <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700' }}>
                      RULEBOOK / BROCHURE PDF LINK
                    </label>
                    <input
                      type="url"
                      className="wizard-input"
                      placeholder="https://drive.google.com/..."
                      value={formData.brochureUrl}
                      onChange={(e) => setFormData({ ...formData, brochureUrl: e.target.value })}
                    />
                  </div>

                  <div className="wizard-field">
                    <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: '700' }}>
                      CLUB INSTAGRAM / WEBSITE LINK
                    </label>
                    <input
                      type="url"
                      className="wizard-input"
                      placeholder="https://instagram.com/..."
                      value={formData.socialUrl}
                      onChange={(e) => setFormData({ ...formData, socialUrl: e.target.value })}
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: REVIEW & VISIBILITY (FINAL LAUNCH)                                */}
          {/* ========================================================================= */}
          {currentStep === 6 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 4px 0' }}>
                  🚀 Review Specifications & Launch Event
                </h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
                  Review your event details, set visibility, and publish immediately to the live campus platform.
                </p>
              </div>

              {/* Live Event Preview Card */}
              <div
                style={{
                  background: '#090D18',
                  border: `2px solid ${formData.themeColor}`,
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: `0 10px 30px ${formData.themeColor}25`,
                }}
              >
                {/* Banner Header */}
                <div style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={formData.bannerUrl}
                    alt={formData.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(9, 13, 24, 0.95) 100%)',
                    }}
                  />
                  <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '8px' }}>
                    <span style={{ background: '#10B981', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800' }}>
                      ● {formData.status.toUpperCase()}
                    </span>
                    <span style={{ background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(6px)', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                      {formData.category}
                    </span>
                    <span style={{ background: '#3B82F6', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800' }}>
                      {formData.feeDisplay}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>
                    {formData.name || 'Untitled Campus Event'}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>{formData.tagline}</div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px', color: '#CBD5E1', marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="#3B82F6" />
                      <span>{formData.dateDisplay}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} color="#3B82F6" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formData.venue}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="#3B82F6" />
                      <span>POC: {formData.organizerName} ({formData.organizerPhone})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} color="#3B82F6" />
                      <span>Capacity: {formData.totalCapacity} Seats</span>
                    </div>
                  </div>

                  {formData.structureType === 'sub-events' && formData.subEvents.length > 0 && (
                    <div style={{ marginTop: '8px', borderTop: '1px solid #1E283D', paddingTop: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#A78BFA' }}>
                        {formData.subEvents.length} SUB-EVENTS CONFIGURED:
                      </span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {formData.subEvents.map((s) => (
                          <span key={s.id} style={{ background: '#151D2C', border: '1px solid #243046', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#CBD5E1' }}>
                            {s.name} (₹{s.fee})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 6-Point Readiness Checklist */}
              <div style={{ background: '#090D18', border: '1px solid #1E283D', borderRadius: '10px', padding: '16px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>
                  SYSTEM LAUNCH VERIFICATION CHECKLIST:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    'Structure & Essentials Finalized',
                    'Dates, Timings & Campus Venue Set',
                    'Banner Poster & Visual Theme Applied',
                    'Club POC Contact Details Confirmed',
                    'Ticket Pricing & Seat Capacity Configured',
                    'Attendee Form & Community Links Linked',
                  ].map((checkText) => (
                    <div key={checkText} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10B981' }}>
                      <CheckCircle2 size={14} />
                      <span style={{ color: '#E2E8F0' }}>{checkText}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visibility & Launch Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="wizard-field">
                  <label className="wizard-label">PUBLICATION STATUS</label>
                  <select
                    className="wizard-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="upcoming">🟢 Upcoming / Open for Registrations</option>
                    <option value="live">⚡ Live / Event Happening Now</option>
                    <option value="draft">📝 Draft / Private Staging</option>
                  </select>
                </div>

                <div className="wizard-field">
                  <label className="wizard-label">FLAGSHIP FEATURE ON HOMEPAGE</label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#090D18',
                      border: '1px solid #1E283D',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#F8FAFC',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.isFlagship}
                      onChange={(e) => setFormData({ ...formData, isFlagship: e.target.checked })}
                    />
                    <span>Highlight as Flagship College Event</span>
                  </label>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Wizard Footer Actions */}
        <div className="event-wizard-footer">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                className="wizard-btn-prev"
                onClick={handlePrevStep}
                disabled={isSubmitting}
              >
                <ChevronLeft size={16} />
                <span>Previous Step</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ color: '#94A3B8', fontSize: '13px' }}
            >
              Cancel
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                className="wizard-btn-next"
                onClick={handleNextStep}
              >
                <span>{currentStep === 1 ? 'Continue to When & Where' : 'Next Step'}</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="wizard-btn-launch"
                onClick={handleFinalLaunch}
                disabled={isSubmitting}
              >
                <Sparkles size={16} />
                <span>{isSubmitting ? 'Launching Event...' : '🚀 Launch Event on Platform'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
