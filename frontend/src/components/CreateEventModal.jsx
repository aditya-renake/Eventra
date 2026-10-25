import React, { useState, useEffect } from 'react';
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

const getDefaultBannerForCategory = (category = '') => {
  const catLower = String(category).toLowerCase();
  const match = CURATED_POSTERS.find((p) => p.category.toLowerCase() === catLower);
  if (match) return match.url;
  if (catLower.includes('summit') || catLower.includes('seminar')) return CURATED_POSTERS[4].url;
  if (catLower.includes('cultur') || catLower.includes('sport')) return CURATED_POSTERS[3].url;
  if (catLower.includes('gam')) return CURATED_POSTERS[2].url;
  if (catLower.includes('work') || catLower.includes('comp')) return CURATED_POSTERS[1].url;
  return CURATED_POSTERS[0].url;
};

const THEME_COLORS = [
  { name: 'Electric Indigo', hex: '#596EE6' },
  { name: 'Cyber Violet', hex: '#8B5CF6' },
  { name: 'Emerald Tech', hex: '#10B981' },
  { name: 'Neon Cyan', hex: '#06B6D4' },
  { name: 'Sunset Flame', hex: '#F43F5E' },
  { name: 'Amber Gold', hex: '#F59E0B' },
];

export const CreateEventModal = ({ onClose, onEventCreated, onShowToast, initialEvent = null }) => {
  const isEditing = Boolean(initialEvent && (initialEvent.id || initialEvent.eventId));
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(initialEvent?.slug));
  const [dateDisplayEdited, setDateDisplayEdited] = useState(Boolean(initialEvent?.dateDisplay));
  const [timeDisplayEdited, setTimeDisplayEdited] = useState(Boolean(initialEvent?.timeDisplay));
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // Helper date formatters
  const formatDateDisplay = (startStr, endStr) => {
    if (!startStr) return '';
    try {
      const start = new Date(startStr);
      if (isNaN(start.getTime())) return '';
      const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
      const startDay = start.getDate();
      const startYear = start.getFullYear();

      if (!endStr) {
        return `${startMonth} ${startDay}, ${startYear}`;
      }
      const end = new Date(endStr);
      if (isNaN(end.getTime())) {
        return `${startMonth} ${startDay}, ${startYear}`;
      }
      const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
      const endDay = end.getDate();
      const endYear = end.getFullYear();

      if (startYear === endYear) {
        if (startMonth === endMonth) {
          if (startDay === endDay) {
            return `${startMonth} ${startDay}, ${startYear}`;
          }
          return `${startMonth} ${startDay} – ${endDay}, ${startYear}`;
        }
        return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${startYear}`;
      }
      return `${startMonth} ${startDay}, ${startYear} – ${endMonth} ${endDay}, ${endYear}`;
    } catch {
      return '';
    }
  };

  const formatTimeDisplay = (startStr, endStr) => {
    if (!startStr) return '';
    try {
      const start = new Date(startStr);
      if (isNaN(start.getTime())) return '';
      const fmt = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const startTime = fmt(start);
      if (!endStr) return `${startTime} IST`;
      const end = new Date(endStr);
      if (isNaN(end.getTime())) return `${startTime} IST`;
      return `${startTime} – ${fmt(end)} IST`;
    } catch {
      return '';
    }
  };

  // Core Form State across the 6 Systematic Steps
  const [formData, setFormData] = useState(() => {
    if (initialEvent) {
      const feeNum = initialEvent.entryFee !== undefined ? Number(initialEvent.entryFee) : 5;
      const isFree = initialEvent.pricingType === 'free' || feeNum === 0;
      return {
        structureType: initialEvent.structureType || (Array.isArray(initialEvent.subEvents) && initialEvent.subEvents.length > 0 ? 'sub-events' : 'single'),
        collegeName: initialEvent.collegeName || '',
        name: initialEvent.name || '',
        slug: initialEvent.slug || initialEvent.id || initialEvent.eventId || '',
        category: initialEvent.category || 'Hackathon',
        description: initialEvent.description || '',
        mode: initialEvent.mode || 'in_person',
        startDate: initialEvent.startDate ? String(initialEvent.startDate).slice(0, 16) : '',
        endDate: initialEvent.endDate ? String(initialEvent.endDate).slice(0, 16) : '',
        dateDisplay: initialEvent.dateDisplay || '',
        timeDisplay: initialEvent.timeDisplay || '',
        venue: initialEvent.venue || '',
        venueHall: initialEvent.venueHall || '',
        mapUrl: initialEvent.mapUrl || '',
        meetingUrl: initialEvent.meetingUrl || '',
        tagline: initialEvent.tagline || '',
        themeColor: initialEvent.themeColor || '#596EE6',
        bannerUrl: initialEvent.bannerUrl || '',
        clubName: initialEvent.clubName || '',
        clubCode: initialEvent.clubCode || '',
        organizerName: initialEvent.organizerName || '',
        organizerRole: initialEvent.organizerRole || '',
        organizerEmail: initialEvent.organizerEmail || '',
        organizerPhone: initialEvent.organizerPhone || '',
        alternatePOC: initialEvent.alternatePOC || '',
        pricingType: isFree ? 'free' : 'paid',
        entryFee: isFree ? 0 : feeNum,
        feeDisplay: initialEvent.feeDisplay || (isFree ? 'Free Entry Pass' : `₹${feeNum} Entry Pass`),
        totalCapacity: initialEvent.totalCapacity || 250,
        ticketTiers: Array.isArray(initialEvent.ticketTiers) ? initialEvent.ticketTiers.join(', ') : (initialEvent.ticketTiers || ''),
        tracks: Array.isArray(initialEvent.tracks) ? initialEvent.tracks.join(', ') : (initialEvent.tracks || ''),
        schedule: Array.isArray(initialEvent.schedule) ? initialEvent.schedule : [],
        subEvents: Array.isArray(initialEvent.subEvents) ? initialEvent.subEvents : [],
        requiredFields: initialEvent.requiredFields || {
          fullName: true,
          email: true,
          phone: true,
          college: true,
          branch: false,
          year: false,
          prn: false,
          github: false,
          linkedin: false,
        },
        customQuestion: initialEvent.customQuestion || '',
        whatsappUrl: initialEvent.whatsappUrl || '',
        discordUrl: initialEvent.discordUrl || '',
        brochureUrl: initialEvent.brochureUrl || '',
        socialUrl: initialEvent.socialUrl || '',
        status: initialEvent.status || 'live',
        isFlagship: Boolean(initialEvent.isFlagship),
        allowSpotRegistration: initialEvent.allowSpotRegistration !== false,
        setActiveLive: true,
      };
    }

    return {
      // Step 1: Essentials & Structure
      structureType: 'single', // 'single' | 'sub-events'
      collegeName: '',
      name: '',
      slug: '',
      category: 'Hackathon',
      description: '',

      // Step 2: When & where
      mode: 'in_person', // 'in_person' | 'online' | 'hybrid'
      startDate: '',
      endDate: '',
      dateDisplay: '',
      timeDisplay: '',
      venue: '',
      venueHall: '',
      mapUrl: '',
      meetingUrl: '',

      // Step 3: Look & POC
      tagline: '',
      themeColor: '#596EE6',
      bannerUrl: '',
      clubName: '',
      clubCode: '',
      organizerName: '',
      organizerRole: '',
      organizerEmail: '',
      organizerPhone: '',
      alternatePOC: '',

      // Step 4: Tickets & seats
      pricingType: 'paid', // 'free' | 'paid'
      entryFee: 5,
      feeDisplay: '₹5 Entry Pass',
      totalCapacity: 250,
      ticketTiers: '',
      tracks: '',
      schedule: [],
      subEvents: [], // Array of { id, name, category, fee, seats, coordinator }

      // Step 5: Questions & links
      requiredFields: {
        fullName: true,
        email: true,
        phone: true,
        college: true,
        branch: false,
        year: false,
        prn: false,
        github: false,
        linkedin: false,
      },
      customQuestion: '',
      whatsappUrl: '',
      discordUrl: '',
      brochureUrl: '',
      socialUrl: '',

      // Step 6: Review & visibility
      status: 'live', // 'upcoming' | 'live' | 'draft'
      isFlagship: false,
      allowSpotRegistration: true,
      setActiveLive: true,
    };
  });

  // Pre-fill organizer name/email from logged in admin ONLY if empty and not editing
  useEffect(() => {
    if (isEditing) return;
    const user = api.auth.getUser();
    if (user) {
      setFormData((prev) => ({
        ...prev,
        organizerName: prev.organizerName || user.name || '',
        organizerEmail: prev.organizerEmail || user.email || '',
      }));
    }
  }, [isEditing]);

  // State for adding a sub-event dynamically in Step 4
  const [newSubEvent, setNewSubEvent] = useState({
    name: '',
    category: 'Coding',
    fee: 5,
    seats: 60,
    coordinator: '',
  });

  // State for adding timeline schedule milestones dynamically in Step 2
  const [newMilestone, setNewMilestone] = useState({
    day: 'Day 1',
    time: '09:00 AM',
    title: '',
    desc: '',
  });

  const handleAddMilestone = () => {
    if (!newMilestone.title.trim()) {
      onShowToast({ type: 'warning', title: 'Milestone Title Required', message: 'Please enter a title for the schedule milestone.' });
      return;
    }
    sounds.playClick();
    setFormData((prev) => ({
      ...prev,
      schedule: [
        ...(prev.schedule || []),
        {
          day: newMilestone.day.trim() || 'Day 1',
          time: newMilestone.time.trim() || '09:00 AM',
          title: newMilestone.title.trim(),
          desc: newMilestone.desc.trim() || 'Scheduled activity.',
        },
      ],
    }));
    setNewMilestone({ day: newMilestone.day || 'Day 1', time: '', title: '', desc: '' });
  };

  const handleRemoveMilestone = (idx) => {
    sounds.playClick();
    setFormData((prev) => ({
      ...prev,
      schedule: (prev.schedule || []).filter((_, i) => i !== idx),
    }));
  };

  const handleLoadPresetSchedule = () => {
    sounds.playClick();
    const cat = (formData.category || '').toLowerCase();
    let preset = [];
    if (cat.includes('work') || cat.includes('boot')) {
      preset = [
        { day: 'Day 1', time: '09:30 AM', title: 'Welcome & Environment Setup', desc: 'Lab workstation access, dev environment and dependencies initialization.' },
        { day: 'Day 1', time: '11:00 AM', title: 'Deep-Dive Architecture Session', desc: 'Core technical concepts, framework walkthrough, and interactive coding.' },
        { day: 'Day 2', time: '10:00 AM', title: 'Advanced Production Patterns', desc: 'Live building, debugging, and real-world deployment pipelines.' },
        { day: 'Day 2', time: '03:30 PM', title: 'Project Demonstrations & Certification', desc: 'Participant showcase, feedback from mentors, and certificate issuance.' },
      ];
    } else if (cat.includes('gam') || cat.includes('esport')) {
      preset = [
        { day: 'Day 1', time: '10:00 AM', title: 'Player Pass Verification & Rig Setup', desc: 'LAN peripheral check, ping verification, and tournament briefing.' },
        { day: 'Day 1', time: '11:30 AM', title: 'Qualifiers & Elimination Bracket', desc: 'Group stage elimination matches with live caster stream.' },
        { day: 'Day 2', time: '01:00 PM', title: 'Semifinals & Grand Finals', desc: 'Championship finals broadcast on main stage projection.' },
        { day: 'Day 2', time: '06:00 PM', title: 'Trophy Presentation & Awards', desc: 'Champion awards ceremony and cash prize distribution.' },
      ];
    } else {
      preset = [
        { day: 'Day 1', time: '08:00 AM', title: 'Gate Check-in & Breakfast', desc: 'Scan digital QR pass for verified badge and kit collection.' },
        { day: 'Day 1', time: '09:30 AM', title: 'Inauguration & Track Release', desc: 'Welcome address by dignitaries and problem statements release.' },
        { day: 'Day 1', time: '11:00 AM', title: 'Competition Commences ⚡', desc: 'Main track work begins with mentor checkpoints and lab access.' },
        { day: 'Day 2', time: '03:00 PM', title: 'Final Demos & Award Ceremony', desc: 'Top team live stage pitches, winner announcements, and valedictory.' },
      ];
    }
    setFormData((prev) => ({ ...prev, schedule: preset }));
    onShowToast({ type: 'info', title: 'Schedule Pre-filled ✨', message: 'Loaded suggested schedule milestones for ' + formData.category });
  };

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

  // Image Upload handler (uploads to Cloudinary CDN with fallback to local preview)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        onShowToast({
          type: 'warning',
          title: 'Large Image',
          message: 'Image size exceeds 5MB. Please choose a smaller image.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const localDataUrl = event.target.result;
        setFormData((prev) => ({ ...prev, bannerUrl: localDataUrl }));
        sounds.playClick();

        // Attempt Cloudinary Upload in background
        try {
          setIsUploadingBanner(true);
          const uploadRes = await api.upload.uploadImage(localDataUrl, 'banners');
          if (uploadRes?.success && uploadRes.url) {
            setFormData((prev) => ({ ...prev, bannerUrl: uploadRes.url }));
            onShowToast({
              type: 'success',
              title: 'Uploaded to Cloudinary! ☁️',
              message: 'Optimized CDN banner link generated successfully.',
            });
          }
        } catch (uploadErr) {
          // If Cloudinary isn't configured yet, keep local preview without breaking
          console.log('[Cloudinary notice]', uploadErr.message);
        } finally {
          setIsUploadingBanner(false);
        }
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
      name: newSubEvent.name.trim(),
      category: newSubEvent.category || 'Competition',
      fee: Math.max(0, parseInt(newSubEvent.fee ?? 0, 10) || 0),
      seats: Math.max(1, parseInt(newSubEvent.seats || 50, 10) || 50),
      coordinator: newSubEvent.coordinator?.trim() || formData.organizerName || 'Event Coordinator',
    };
    setFormData({
      ...formData,
      subEvents: [...formData.subEvents, item],
    });
    setNewSubEvent({
      name: '',
      category: 'Coding',
      fee: formData.pricingType === 'free' ? 0 : formData.entryFee,
      seats: 60,
      coordinator: '',
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

      const eventIdClean = isEditing
        ? (initialEvent.id || initialEvent.eventId)
        : ((formData.slug || formData.name)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || `event-${Date.now()}`);

      const rawFee = formData.pricingType === 'free' ? 0 : parseInt(formData.entryFee ?? 0, 10);
      const parsedFee = isNaN(rawFee) || rawFee < 0 ? 0 : rawFee;

      // Parse ticket tiers (supports "Tier Name" or "Tier Name:Price")
      const rawTiersList = typeof formData.ticketTiers === 'string'
        ? formData.ticketTiers.split(',').map((t) => t.trim()).filter(Boolean)
        : (Array.isArray(formData.ticketTiers) ? formData.ticketTiers : []);

      const ticketMap = {};
      const finalTiers = [];

      if (rawTiersList.length > 0) {
        rawTiersList.forEach((item) => {
          if (item.includes(':')) {
            const [tName, tPrice] = item.split(':');
            const cleanName = tName.trim();
            const numPrice = formData.pricingType === 'free' ? 0 : parseInt(tPrice.trim(), 10);
            if (cleanName) {
              finalTiers.push(cleanName);
              ticketMap[cleanName] = !isNaN(numPrice) && numPrice >= 0 ? numPrice : parsedFee;
            }
          } else {
            finalTiers.push(item);
            ticketMap[item] = parsedFee;
          }
        });
      } else if (formData.structureType === 'sub-events' && formData.subEvents.length > 0) {
        formData.subEvents.forEach((sub) => {
          finalTiers.push(sub.name);
          ticketMap[sub.name] = formData.pricingType === 'free' ? 0 : (Number(sub.fee) >= 0 ? Number(sub.fee) : parsedFee);
        });
      } else {
        finalTiers.push('Standard Pass');
        ticketMap['Standard Pass'] = parsedFee;
      }

      // Also include any sub-events in ticketMap so sub-event selection always has accurate pricing
      if (formData.structureType === 'sub-events' && formData.subEvents.length > 0) {
        formData.subEvents.forEach((sub) => {
          if (ticketMap[sub.name] === undefined) {
            ticketMap[sub.name] = formData.pricingType === 'free' ? 0 : (Number(sub.fee) >= 0 ? Number(sub.fee) : parsedFee);
          }
        });
      }

      const parsedTracks = typeof formData.tracks === 'string'
        ? formData.tracks.split(',').map((t) => t.trim()).filter(Boolean)
        : (Array.isArray(formData.tracks) ? formData.tracks : []);

      const finalTracks = parsedTracks.length > 0
        ? parsedTracks
        : (formData.structureType === 'sub-events' && formData.subEvents.length > 0
            ? formData.subEvents.map((s) => s.name)
            : [formData.category || 'General Track']);

      const banner = formData.bannerUrl || getDefaultBannerForCategory(formData.category);
      const cleanDateDisplay = formData.dateDisplay?.trim() || formatDateDisplay(formData.startDate, formData.endDate) || 'Dates TBA';
      const cleanTimeDisplay = formData.timeDisplay?.trim() || formatTimeDisplay(formData.startDate, formData.endDate) || 'Schedule TBA';
      const cleanTagline = formData.tagline?.trim() || (formData.description ? formData.description.trim().slice(0, 120) : `${formData.category} Event`);
      const finalStatus = formData.setActiveLive && formData.status !== 'draft' ? 'live' : (formData.status || 'upcoming');

      const payload = {
        ...formData,
        id: eventIdClean,
        eventId: eventIdClean,
        slug: formData.slug || eventIdClean,
        name: formData.name.trim(),
        tagline: cleanTagline,
        description: formData.description.trim(),
        bannerUrl: banner,
        pricingType: parsedFee === 0 ? 'free' : 'paid',
        entryFee: parsedFee,
        feeDisplay: parsedFee === 0 ? 'Free Entry Pass' : `₹${parsedFee} Entry Pass`,
        ticketTiers: finalTiers,
        ticketPrices: ticketMap,
        tracks: finalTracks,
        schedule: Array.isArray(formData.schedule) ? formData.schedule : [],
        totalCapacity: parseInt(formData.totalCapacity || 250, 10),
        dateDisplay: cleanDateDisplay,
        timeDisplay: cleanTimeDisplay,
        status: finalStatus,
        updatedAt: new Date().toISOString(),
        ...(isEditing ? {} : { createdAt: new Date().toISOString() }),
      };

      const res = isEditing
        ? await api.events.update(eventIdClean, payload)
        : await api.events.create(payload);

      const savedEvent = res?.data || payload;

      // If marked as Flagship, promote to flagship immediately
      if (formData.isFlagship) {
        try {
          await api.events.setFlagship(savedEvent.id || eventIdClean);
        } catch (fErr) {
          console.warn('Could not promote event to flagship:', fErr);
        }
      }

      // If set as active live event on the platform, sync ALL event fields to dynamic site config
      if (formData.setActiveLive) {
        try {
          await api.event.updateConfig({
            activeEventId: savedEvent.id || eventIdClean,
            eventName: savedEvent.name,
            eventTagline: savedEvent.tagline,
            eventDescription: savedEvent.description,
            category: savedEvent.category,
            structureType: savedEvent.structureType,
            collegeName: savedEvent.collegeName || '',
            clubName: savedEvent.clubName || '',
            clubCode: savedEvent.clubCode || '',
            mode: savedEvent.mode || 'in_person',
            startDate: savedEvent.startDate || '',
            endDate: savedEvent.endDate || '',
            eventDate: cleanDateDisplay,
            eventTime: cleanTimeDisplay,
            eventVenue: savedEvent.venue || 'Campus Venue',
            venueHall: savedEvent.venueHall || '',
            mapUrl: savedEvent.mapUrl || '',
            meetingUrl: savedEvent.meetingUrl || '',
            organizerEmail: savedEvent.organizerEmail || '',
            organizerName: savedEvent.organizerName || 'Campus Organizer',
            organizerRole: savedEvent.organizerRole || '',
            organizerPhone: savedEvent.organizerPhone || '',
            alternatePOC: savedEvent.alternatePOC || '',
            themeColor: savedEvent.themeColor || '#596EE6',
            bannerUrl: banner,
            pricingType: savedEvent.pricingType,
            entryFee: parsedFee,
            feeDisplay: savedEvent.feeDisplay,
            totalCapacity: savedEvent.totalCapacity,
            ticketTiers: finalTiers,
            ticketPrices: ticketMap,
            tracks: finalTracks,
            subEvents: savedEvent.subEvents || [],
            requiredFields: savedEvent.requiredFields,
            customQuestion: savedEvent.customQuestion || '',
            whatsappUrl: savedEvent.whatsappUrl || '',
            discordUrl: savedEvent.discordUrl || '',
            brochureUrl: savedEvent.brochureUrl || '',
            socialUrl: savedEvent.socialUrl || '',
            enablePaymentGateway: Object.values(ticketMap).some((v) => Number(v) > 0),
          });
        } catch (cfgErr) {
          console.warn('Could not update live active event config:', cfgErr);
        }
      }

      // Invalidate any stale session cache and notify all views
      try {
        sessionStorage.removeItem('hs26_cached_dashboard_state');
        window.dispatchEvent(new CustomEvent('eventra:events-updated', { detail: savedEvent }));
      } catch {}

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
        title: isEditing ? 'Event Updated Successfully! ✨' : 'Event Launched Successfully! 🚀',
        message: `"${savedEvent.name}" is now live with all your configured details.`,
      });

      if (onEventCreated) onEventCreated(savedEvent);
      onClose();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: isEditing ? 'Update Failed' : 'Launch Failed',
        message: err.message || 'Could not save event. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewBanner = formData.bannerUrl || getDefaultBannerForCategory(formData.category);
  const previewDate = formData.dateDisplay || formatDateDisplay(formData.startDate, formData.endDate) || 'Dates TBA';
  const previewTime = formData.timeDisplay || formatTimeDisplay(formData.startDate, formData.endDate) || 'Schedule TBA';
  const previewFee = formData.pricingType === 'free' || Number(formData.entryFee) === 0
    ? 'Free Entry Pass'
    : `₹${formData.entryFee} Entry Pass`;

  return (
    <div className="event-wizard-overlay" onClick={onClose}>
      <div className="event-wizard-container" onClick={(e) => e.stopPropagation()}>
        
        {/* Top Header Bar */}
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
            <span>EVENTRA PLATFORM</span>
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

        {/* Hero Step Title Header */}
        <div className="event-wizard-header">
          <div className="event-wizard-step-label">
            STEP {currentStep} OF 6 · {STEPS[currentStep - 1].sublabel.toUpperCase()}
          </div>
          <h2 className="event-wizard-title">{isEditing ? `Edit Event: ${formData.name || 'Event'}` : 'Create Event'}</h2>
          <div className="event-wizard-meta">
            <span>Creating event as: <strong>{formData.clubName || 'Campus Club / Organizer'}</strong></span>
            {formData.clubCode && <span className="event-wizard-club-badge">Club Code: {formData.clubCode}</span>}
          </div>
        </div>

        {/* 6-Step Stepper Component */}
        <div className="event-wizard-stepper-wrap">
          <div className="event-wizard-stepper">
            {STEPS.map((step, idx) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              const isUpcoming = step.id > currentStep && !isEditing;

              return (
                <React.Fragment key={step.id}>
                  <button
                    type="button"
                    className={`stepper-item ${isActive ? 'active' : isCompleted ? 'completed' : 'upcoming'}`}
                    onClick={() => {
                      if (isCompleted || isActive || isEditing) {
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
              
              {/* Event Structure Selection */}
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

                <div className="wizard-info-box" style={{ marginBottom: '16px' }}>
                  <AlertCircle size={16} color="#60A5FA" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <div>
                    <strong>Quick Summary:</strong> Both event types follow 6 guided steps. Sub-events are configured in Step 4 (Tickets & seats).
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
              </div>

              {/* Event Basics Form */}
              <div style={{ borderTop: '1px solid #1E283D', paddingTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <Sparkles size={16} color="#F59E0B" />
                  <h3 style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>Event Basics</h3>
                </div>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 16px 0' }}>
                  Fill in the basic identity details of your event
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Official College / Institution */}
                  <div className="wizard-field">
                    <label className="wizard-label">OFFICIAL COLLEGE / INSTITUTION</label>
                    <input
                      type="text"
                      className="wizard-input"
                      placeholder="e.g. Dr. D. Y. Patil Institute of Technology, Pimpri, Pune"
                      value={formData.collegeName}
                      onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                    />
                  </div>

                  {/* Organizing Club & Code */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
                    <div className="wizard-field">
                      <label className="wizard-label">ORGANIZING CLUB / COMMITTEE *</label>
                      <input
                        type="text"
                        className="wizard-input"
                        placeholder="e.g. ACES / Computer Engineering Dept / Sports Council"
                        value={formData.clubName}
                        onChange={(e) => setFormData({ ...formData, clubName: e.target.value })}
                      />
                    </div>
                    <div className="wizard-field">
                      <label className="wizard-label">CLUB CODE (OPTIONAL)</label>
                      <input
                        type="text"
                        className="wizard-input"
                        placeholder="e.g. ACES-01"
                        value={formData.clubCode}
                        onChange={(e) => setFormData({ ...formData, clubCode: e.target.value.toUpperCase() })}
                      />
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
                        eventra.live/
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
                    onChange={(e) => {
                      const val = e.target.value;
                      const nextDate = !dateDisplayEdited ? formatDateDisplay(val, formData.endDate) : formData.dateDisplay;
                      const nextTime = !timeDisplayEdited ? formatTimeDisplay(val, formData.endDate) : formData.timeDisplay;
                      setFormData({
                        ...formData,
                        startDate: val,
                        dateDisplay: nextDate,
                        timeDisplay: nextTime,
                      });
                    }}
                  />
                </div>

                <div className="wizard-field">
                  <label className="wizard-label">END DATE & TIME *</label>
                  <input
                    type="datetime-local"
                    className="wizard-input"
                    value={formData.endDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      const nextDate = !dateDisplayEdited ? formatDateDisplay(formData.startDate, val) : formData.dateDisplay;
                      const nextTime = !timeDisplayEdited ? formatTimeDisplay(formData.startDate, val) : formData.timeDisplay;
                      setFormData({
                        ...formData,
                        endDate: val,
                        dateDisplay: nextDate,
                        timeDisplay: nextTime,
                      });
                    }}
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
                    onChange={(e) => {
                      setDateDisplayEdited(true);
                      setFormData({ ...formData, dateDisplay: e.target.value });
                    }}
                  />
                </div>

                <div className="wizard-field">
                  <label className="wizard-label">GATE CHECK-IN / TIMINGS</label>
                  <input
                    type="text"
                    className="wizard-input"
                    placeholder="e.g. 09:00 AM – 06:00 PM IST (Gate Check-in: 07:45 AM)"
                    value={formData.timeDisplay}
                    onChange={(e) => {
                      setTimeDisplayEdited(true);
                      setFormData({ ...formData, timeDisplay: e.target.value });
                    }}
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

              {/* Event Schedule & Timeline Milestones Builder */}
              <div
                style={{
                  borderTop: '1px solid #1E283D',
                  paddingTop: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={16} color="#3B82F6" />
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
                        Event Timeline & Schedule Milestones ({(formData.schedule || []).length})
                      </h4>
                    </div>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' }}>
                      Add milestones for check-in, keynotes, hacking, submissions, and award ceremonies.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLoadPresetSchedule}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '11px', color: '#60A5FA', border: '1px solid rgba(96, 165, 250, 0.3)', padding: '4px 10px', borderRadius: '6px' }}
                  >
                    ✨ Auto-Load Recommended Schedule
                  </button>
                </div>

                {/* Add Milestone Inputs */}
                <div style={{ background: '#090D18', border: '1px solid #1E283D', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 140px 1fr auto', gap: '8px', alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>DAY / PHASE</label>
                      <input
                        type="text"
                        className="wizard-input"
                        placeholder="e.g. Day 1"
                        value={newMilestone.day}
                        onChange={(e) => setNewMilestone({ ...newMilestone, day: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>TIME</label>
                      <input
                        type="text"
                        className="wizard-input"
                        placeholder="e.g. 09:30 AM"
                        value={newMilestone.time}
                        onChange={(e) => setNewMilestone({ ...newMilestone, time: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>MILESTONE TITLE *</label>
                      <input
                        type="text"
                        className="wizard-input"
                        placeholder="e.g. Gate Check-in & Pass Verification"
                        value={newMilestone.title}
                        onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMilestone}
                      style={{
                        background: '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        height: '38px',
                      }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>BRIEF DESCRIPTION (OPTIONAL)</label>
                    <input
                      type="text"
                      className="wizard-input"
                      placeholder="e.g. Scan digital QR pass at the entrance scanner to receive verified badge and event kit."
                      value={newMilestone.desc}
                      onChange={(e) => setNewMilestone({ ...newMilestone, desc: e.target.value })}
                    />
                  </div>
                </div>

                {/* Milestone Items List */}
                {(formData.schedule || []).length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                    {(formData.schedule || []).map((ms, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#111827',
                          border: '1px solid #1E283D',
                          borderRadius: '8px',
                          padding: '8px 12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '10px', fontWeight: '800', background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', padding: '2px 8px', borderRadius: '4px', flexShrink: 0 }}>
                            {ms.day} • {ms.time}
                          </span>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <strong style={{ fontSize: '12px', color: '#FFFFFF' }}>{ms.title}</strong>
                            {ms.desc && <span style={{ fontSize: '11px', color: '#94A3B8', marginLeft: '6px' }}>— {ms.desc}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMilestone(idx)}
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                          title="Remove milestone"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                  placeholder="e.g. 24-Hour National Innovation Challenge • Hosted by ACES"
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
                      background: isUploadingBanner ? 'rgba(89, 110, 230, 0.15)' : '#151D2C',
                      border: isUploadingBanner ? '1px solid #596EE6' : '1px solid #243046',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      color: isUploadingBanner ? '#818CF8' : '#F8FAFC',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: isUploadingBanner ? 'wait' : 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Upload size={14} />
                    <span>{isUploadingBanner ? 'Uploading to Cloudinary...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageUpload}
                      disabled={isUploadingBanner}
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
                    src={previewBanner}
                    alt="Banner Preview"
                    style={{ width: '100%', height: '160px', objectFit: 'cover' }}
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
                  These contact details will be shown to participants on the event page and passes.
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
                      const nextFee = formData.entryFee > 0 ? formData.entryFee : 5;
                      setFormData({
                        ...formData,
                        pricingType: 'paid',
                        entryFee: nextFee,
                        feeDisplay: `₹${nextFee} Entry Pass`,
                      });
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
                      setFormData({
                        ...formData,
                        pricingType: 'free',
                        entryFee: 0,
                        feeDisplay: 'Free Entry Pass',
                      });
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
                        feeDisplay: val > 0 ? `₹${val} Entry Pass` : 'Free Entry Pass',
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
                    placeholder="e.g. Standard Pass, VIP Pass:150, Team Pass:200"
                    value={formData.ticketTiers}
                    onChange={(e) => setFormData({ ...formData, ticketTiers: e.target.value })}
                  />
                  <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    Optional: use <code>Tier:Price</code> for custom tier pricing (e.g. <code>Student Pass:50, VIP:100</code>).
                  </span>
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
                  <span style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                    Shown on the event page and registration track selector.
                  </span>
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#A78BFA', margin: 0 }}>
                        ⚡ Sub-Events & Individual Activities ({formData.subEvents.length})
                      </h4>
                      <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0 0' }}>
                        Add sub-events below. Each sub-event can have its own entry fee, seat limit, and coordinator.
                      </p>
                    </div>
                  </div>

                  {/* Add Sub-Event Inputs */}
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end', marginBottom: '14px' }}>
                    <div>
                      <label style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>ACTIVITY TITLE</label>
                      <input
                        type="text"
                        className="wizard-input"
                        placeholder="e.g. Blind Coding / BGMI LAN"
                        value={newSubEvent.name}
                        onChange={(e) => setNewSubEvent({ ...newSubEvent, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>TYPE</label>
                      <select
                        className="wizard-select"
                        value={newSubEvent.category}
                        onChange={(e) => setNewSubEvent({ ...newSubEvent, category: e.target.value })}
                      >
                        <option value="Coding">Coding</option>
                        <option value="Workshop">Workshop</option>
                        <option value="Gaming">Gaming</option>
                        <option value="Quiz">Tech Quiz</option>
                        <option value="Design">UI/UX Design</option>
                        <option value="Cultural">Cultural</option>
                        <option value="Sports">Sports</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>FEE (₹)</label>
                      <input
                        type="number"
                        min="0"
                        className="wizard-input"
                        value={newSubEvent.fee}
                        onChange={(e) => setNewSubEvent({ ...newSubEvent, fee: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>SEATS</label>
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
                      style={{
                        background: '#3B82F6',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        height: '40px',
                      }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>

                  {/* Sub-Events List */}
                  {formData.subEvents.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {formData.subEvents.map((sub, idx) => (
                        <div
                          key={sub.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#111827',
                            border: '1px solid #1E283D',
                            borderRadius: '8px',
                            padding: '10px 14px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#60A5FA' }}>#{idx + 1}</span>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF' }}>{sub.name}</div>
                              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                                {sub.category} • Fee: {sub.fee === 0 ? 'Free' : `₹${sub.fee}`} • Capacity: {sub.seats} seats
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubEvent(sub.id)}
                            style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                            title="Remove Sub-Event"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: QUESTIONS & LINKS                                                 */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', margin: '0 0 4px 0' }}>
                  📋 Registration Form Fields & Community Channels
                </h3>
                <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>
                  Choose what information to collect from students during registration and link official community groups.
                </p>
              </div>

              {/* Attendee Fields Checklist */}
              <div>
                <label className="wizard-label" style={{ marginBottom: '10px' }}>
                  ATTENDEE INFORMATION TO COLLECT
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  {[
                    { key: 'fullName', label: 'Full Name', locked: true },
                    { key: 'email', label: 'Email Address', locked: true },
                    { key: 'phone', label: 'WhatsApp / Phone Number', locked: true },
                    { key: 'college', label: 'College / Institution Name', locked: false },
                    { key: 'branch', label: 'Department / Branch', locked: false },
                    { key: 'year', label: 'Year of Study (FE/SE/TE/BE)', locked: false },
                    { key: 'prn', label: 'PRN / Roll Number / College ID', locked: false },
                    { key: 'github', label: 'GitHub / Portfolio Link', locked: false },
                    { key: 'linkedin', label: 'LinkedIn Profile URL', locked: false },
                  ].map((field) => (
                    <label
                      key={field.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        background: formData.requiredFields[field.key] ? 'rgba(59, 130, 246, 0.1)' : '#090D18',
                        border: formData.requiredFields[field.key] ? '1px solid #3B82F6' : '1px solid #1E283D',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        cursor: field.locked ? 'default' : 'pointer',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#F8FAFC',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(formData.requiredFields[field.key])}
                        disabled={field.locked}
                        onChange={(e) => {
                          if (field.locked) return;
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
                className="event-wizard-preview"
                style={{
                  background: '#090D18',
                  border: `2px solid ${formData.themeColor}`,
                  borderRadius: '14px',
                  overflow: 'hidden',
                  boxShadow: `0 10px 30px ${formData.themeColor}25`,
                }}
              >
                {/* Banner Header */}
                <div className="event-wizard-preview-banner" style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
                  <img
                    src={previewBanner}
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
                      ● {(formData.setActiveLive ? 'LIVE' : formData.status).toUpperCase()}
                    </span>
                    <span style={{ background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(6px)', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>
                      {formData.category}
                    </span>
                    <span style={{ background: '#3B82F6', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '800' }}>
                      {previewFee}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>
                    {formData.name || 'Untitled Campus Event'}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>
                    {formData.tagline || formData.description}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '12px', color: '#CBD5E1', marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={14} color="#3B82F6" />
                      <span>{previewDate} ({previewTime})</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} color="#3B82F6" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formData.venue}{formData.venueHall ? ` • ${formData.venueHall}` : ''}
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
                            {s.name} ({s.fee === 0 ? 'Free' : `₹${s.fee}`})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 6-Point Readiness Checklist */}
              <div className="event-wizard-readiness" style={{ background: '#090D18', border: '1px solid #1E283D', borderRadius: '10px', padding: '16px' }}>
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
                    <option value="live">⚡ Live / Open for Registrations Now</option>
                    <option value="upcoming">🟢 Upcoming / Scheduled Event</option>
                    <option value="draft">📝 Draft / Private Staging</option>
                  </select>
                </div>

                <div className="wizard-field" style={{ gridColumn: 'span 2' }}>
                  <label
                    className="event-wizard-feature-toggle"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: formData.isFlagship ? 'rgba(245, 158, 11, 0.12)' : '#090D18',
                      border: formData.isFlagship ? '1px solid #F59E0B' : '1px solid #1E283D',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.isFlagship}
                      onChange={(e) => setFormData({ ...formData, isFlagship: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: '#F59E0B', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: formData.isFlagship ? '#F59E0B' : '#FFFFFF' }}>
                        👑 Set as Sole Flagship Event on Homepage
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px' }}>
                        When enabled, only this event will be featured as the primary flagship spotlight on the homepage hero, while remaining events stay discoverable in the All Events Hub.
                      </div>
                    </div>
                  </label>
                </div>

                <div className="wizard-field" style={{ gridColumn: 'span 2' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'rgba(89, 110, 230, 0.08)',
                      border: '1px solid rgba(89, 110, 230, 0.3)',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#F8FAFC',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.setActiveLive}
                      onChange={(e) => setFormData({ ...formData, setActiveLive: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#596EE6', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontWeight: '800' }}>Set as Active Featured Event for Website & Registrations</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        Immediately publishes all details of this event to the main landing page and makes it the default registration event.
                      </div>
                    </div>
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
                <span>
                  {isSubmitting
                    ? (isEditing ? 'Saving Changes...' : 'Launching Event...')
                    : (isEditing ? '✨ Save & Update Event' : '🚀 Launch Event on Platform')}
                </span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
