import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Github,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRound,
  UsersRound,
  Lock,
  X,
  AlertCircle,
  Smartphone,
  RefreshCw,
  Calendar,
  Clock,
  Globe,
  HelpCircle,
  Layers,
  Hash,
  GraduationCap,
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

const DEFAULT_CONFIG = {
  eventId: 'eventra-2026',
  eventName: 'Eventra 2026',
  eventTagline: "India's Flagship 48-Hour National Hackathon",
  eventDescription: 'Choose your pass, fill in your attendee details, and receive your cryptographically signed QR entry pass.',
  category: 'Hackathon',
  structureType: 'single',
  collegeName: 'Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune',
  clubName: 'ACES',
  eventDate: 'October 16 - 18, 2026',
  eventTime: '09:00 AM IST',
  eventVenue: 'Dr. D. Y. Patil Institute of Technology (DIT), Pimpri, Pune',
  venueHall: '',
  enablePaymentGateway: true,
  pricingType: 'paid',
  entryFee: 5,
  ticketTiers: ['Standard Pass'],
  ticketPrices: {
    'Standard Pass': 5,
  },
  tracks: ['General Track'],
  subEvents: [],
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
};

const TIER_DETAILS = {
  'Hacker Pass': {
    badge: 'MOST POPULAR',
    detail: 'The full hackathon build experience.',
    features: ['Full event access', 'Mentorship & workspace', 'Digital QR entry pass'],
  },
  'Student Pass': {
    badge: 'STUDENT PASS',
    detail: 'Official pass for student attendees.',
    features: ['Event entry', 'Sessions & activities', 'Participation certificate'],
  },
  'VIP Delegate': {
    badge: 'ALL ACCESS',
    detail: 'Priority access for guests and delegates.',
    features: ['All event access', 'VIP seating & networking', 'Digital QR entry pass'],
  },
  'Judge / Mentor': {
    badge: 'INVITED GUEST',
    detail: 'For invited judges, speakers, and mentors.',
    features: ['Judge & mentor access', 'Digital QR entry pass', 'VIP hospitality'],
  },
};

const STEPS = [
  { label: 'Choose pass', caption: 'Pass & track' },
  { label: 'Your details', caption: 'Attendee info' },
  { label: 'Review', caption: 'Confirm details' },
];

const loadRazorpay = () => new Promise((resolve) => {
  if (typeof window !== 'undefined' && window.Razorpay) return resolve(true);
  let script = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
  if (!script) {
    script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.head.appendChild(script);
  }
  const interval = setInterval(() => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      clearInterval(interval);
      resolve(true);
    }
  }, 100);
  const timeout = setTimeout(() => {
    clearInterval(interval);
    resolve(Boolean(window.Razorpay));
  }, 8000);
  script.addEventListener('load', () => {
    clearInterval(interval);
    clearTimeout(timeout);
    resolve(true);
  }, { once: true });
  script.addEventListener('error', () => {
    clearInterval(interval);
    clearTimeout(timeout);
    resolve(false);
  }, { once: true });
});

export const RegistrationPage = ({ selectedEventId, onRegistrationSuccess, onBackToLanding, onShowToast }) => {
  const formRef = useRef(null);
  const [eventConfig, setEventConfig] = useState(DEFAULT_CONFIG);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    institution: '',
    ticketType: 'Standard Pass',
    track: 'General Track',
    teamName: '',
    githubUrl: '',
    branch: '',
    year: '',
    prn: '',
    linkedinUrl: '',
    customAnswer: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingOrder, setPendingOrder] = useState(null);
  const [prefillProfile, setPrefillProfile] = useState(null);
  const [alreadyRegisteredPass, setAlreadyRegisteredPass] = useState(null);

  // Check email for existing campus registrations & smart pre-fill
  const checkEmailForExistingProfile = async (emailToCheck) => {
    if (!emailToCheck || !emailToCheck.includes('@') || !emailToCheck.includes('.')) {
      setPrefillProfile(null);
      setAlreadyRegisteredPass(null);
      return;
    }
    try {
      const res = await api.registrants.getAttendeeProfile(emailToCheck);
      if (res?.success && res.found) {
        const currentEvId = eventConfig.eventId || eventConfig.activeEventId || 'eventra-2026';
        const match = res.passes?.find((p) => (p.eventId || 'eventra-2026') === currentEvId);
        if (match) {
          setAlreadyRegisteredPass(match);
        } else {
          setAlreadyRegisteredPass(null);
        }
        if (res.attendee) {
          setPrefillProfile(res.attendee);
        }
      } else {
        setPrefillProfile(null);
        setAlreadyRegisteredPass(null);
      }
    } catch (e) {
      // background prefill check error ignored
    }
  };

  // Detect In-App Browsers (WhatsApp, Instagram, etc. which block standard native intent links)
  const isInAppBrowser = typeof navigator !== 'undefined' && /FBAN|FBAV|Instagram|WhatsApp|Telegram|Line|MicroMessenger/i.test(navigator.userAgent || '');

  useEffect(() => {
    let mounted = true;

    const getRequestedEventId = () => {
      if (selectedEventId && selectedEventId !== '[object Object]') return selectedEventId;
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      let targetId = null;
      if (hash.includes('event=')) {
        targetId = new URLSearchParams(hash.split('?')[1] || '').get('event');
      }
      if (!targetId && search.includes('event=')) {
        targetId = new URLSearchParams(search).get('event');
      }
      return targetId;
    };

    const loadEventForRegistration = async () => {
      try {
        const cfgRes = await api.event.getConfig().catch(() => null);
        const cfg = cfgRes?.data || {};
        const targetId = getRequestedEventId() || cfg.activeEventId || 'eventra-2026';

        const evRes = await api.events.getById(targetId).catch(() => null);
        const ev = evRes?.data;

        if (!mounted) return;

        if (ev) {
          const isFree = ev.pricingType === 'free' || Number(ev.entryFee) === 0;
          const baseFee = isFree ? 0 : (ev.entryFee !== undefined ? Number(ev.entryFee) : 5);
          const subEvents = Array.isArray(ev.subEvents) ? ev.subEvents : [];
          const hasSubEvents = ev.structureType === 'sub-events' && subEvents.length > 0;

          const tiers = Array.isArray(ev.ticketTiers) && ev.ticketTiers.length > 0
            ? ev.ticketTiers
            : (hasSubEvents ? subEvents.map((s) => s.name) : ['Standard Pass']);

          const ticketMap = {};
          if (ev.ticketPrices && typeof ev.ticketPrices === 'object' && Object.keys(ev.ticketPrices).length > 0) {
            Object.entries(ev.ticketPrices).forEach(([k, v]) => {
              ticketMap[k] = isFree ? 0 : (Number(v) >= 0 ? Number(v) : baseFee);
            });
          } else if (hasSubEvents) {
            subEvents.forEach((s) => {
              ticketMap[s.name] = isFree ? 0 : (Number(s.fee) >= 0 ? Number(s.fee) : baseFee);
            });
          } else {
            tiers.forEach((tier) => {
              ticketMap[tier] = baseFee;
            });
          }

          const tracksList = Array.isArray(ev.tracks) && ev.tracks.length > 0
            ? ev.tracks
            : (hasSubEvents ? subEvents.map((s) => s.name) : [ev.category || 'General Track']);

          setEventConfig({
            ...DEFAULT_CONFIG,
            ...cfg,
            eventId: ev.id || ev.eventId,
            eventName: ev.name || cfg.eventName || 'Eventra 2026',
            eventTagline: ev.tagline || cfg.eventTagline || '',
            eventDescription: ev.description || cfg.eventDescription || '',
            category: ev.category || cfg.category || 'Event',
            structureType: ev.structureType || 'single',
            collegeName: ev.collegeName || cfg.collegeName || '',
            clubName: ev.clubName || cfg.clubName || '',
            clubCode: ev.clubCode || cfg.clubCode || '',
            eventDate: ev.dateDisplay || cfg.eventDate || 'Dates TBA',
            eventTime: ev.timeDisplay || cfg.eventTime || '',
            eventVenue: ev.venue || cfg.eventVenue || 'Campus Venue',
            venueHall: ev.venueHall || cfg.venueHall || '',
            pricingType: isFree ? 'free' : 'paid',
            entryFee: baseFee,
            enablePaymentGateway: isFree ? false : (cfg.enablePaymentGateway !== false),
            ticketTiers: tiers,
            ticketPrices: ticketMap,
            tracks: tracksList,
            subEvents,
            requiredFields: ev.requiredFields || cfg.requiredFields || DEFAULT_CONFIG.requiredFields,
            customQuestion: ev.customQuestion !== undefined ? ev.customQuestion : (cfg.customQuestion || ''),
          });
        } else if (cfg && Object.keys(cfg).length > 0) {
          setEventConfig((current) => ({
            ...current,
            ...cfg,
            eventId: cfg.activeEventId || 'eventra-2026',
            tracks: Array.isArray(cfg.tracks) && cfg.tracks.length > 0 ? cfg.tracks : [cfg.category || 'General Track'],
            subEvents: Array.isArray(cfg.subEvents) ? cfg.subEvents : [],
          }));
        }
      } catch (err) {
        console.warn('Error loading event for registration:', err);
      }
    };

    loadEventForRegistration();
    return () => { mounted = false; };
  }, [selectedEventId]);

  // Restore any pending order from session on initial page mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('eventra_active_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.orderId && Date.now() - (parsed.timestamp || 0) < 30 * 60 * 1000) {
          setPendingOrder(parsed);
          if (parsed.formData) {
            setFormData((prev) => ({ ...prev, ...parsed.formData }));
          }
          api.payment.checkOrderStatus(parsed.orderId, parsed.formData)
            .then((res) => {
              if (res.isPaid && res.data) {
                sessionStorage.removeItem('eventra_active_order');
                setPendingOrder(null);
                completeRegistration(res.data.uniqueId, 'Payment verified! Your official entry pass has been issued.');
              }
            })
            .catch(() => {});
        } else {
          sessionStorage.removeItem('eventra_active_order');
        }
      }
    } catch (e) {}
  }, []);

  // Mobile app-switch auto-recovery
  useEffect(() => {
    const handleReturnToTab = async () => {
      if (document.visibilityState === 'visible' && pendingOrder?.orderId) {
        try {
          const checkRes = await api.payment.checkOrderStatus(pendingOrder.orderId, pendingOrder.formData || formData);
          if (checkRes.isPaid && checkRes.data) {
            try {
              sessionStorage.removeItem('eventra_active_order');
              setPendingOrder(null);
            } catch (e) {}
            completeRegistration(checkRes.data.uniqueId, 'Payment verified! Your official entry pass has been issued.');
          }
        } catch (e) {}
      }
    };

    document.addEventListener('visibilitychange', handleReturnToTab);
    window.addEventListener('focus', handleReturnToTab);
    return () => {
      document.removeEventListener('visibilitychange', handleReturnToTab);
      window.removeEventListener('focus', handleReturnToTab);
    };
  }, [pendingOrder, formData]);

  const ticketOptions = useMemo(() => {
    const isEventFree = eventConfig.pricingType === 'free' || Number(eventConfig.entryFee) === 0;
    const prices = eventConfig.ticketPrices && Object.keys(eventConfig.ticketPrices).length > 0
      ? eventConfig.ticketPrices
      : { 'Standard Pass': isEventFree ? 0 : (eventConfig.entryFee ?? 5) };

    const subEvents = Array.isArray(eventConfig.subEvents) ? eventConfig.subEvents : [];

    return Object.entries(prices).map(([type, price]) => {
      const p = isEventFree ? 0 : Number(price);
      const finalPrice = !isNaN(p) && p >= 0 ? p : 0;
      const matchedSub = subEvents.find((s) => s.name === type);

      if (matchedSub) {
        return {
          type,
          price: finalPrice,
          badge: (matchedSub.category || 'SUB-EVENT').toUpperCase(),
          detail: `${matchedSub.category || 'Competition'} • Coordinator: ${matchedSub.coordinator || 'Event Team'}`,
          features: [
            `Capacity: ${matchedSub.seats || 60} seats`,
            'Official QR entry pass',
            'Participation certificate',
          ],
        };
      }

      return {
        type,
        price: finalPrice,
        ...(TIER_DETAILS[type] || {
          badge: finalPrice === 0 ? 'FREE PASS' : 'OFFICIAL PASS',
          detail: `Verified entry pass for ${eventConfig.eventName || 'this event'}.`,
          features: [
            `Full ${eventConfig.category || 'event'} access`,
            'Cryptographic QR entry pass',
            'Instant email & WhatsApp pass',
          ],
        }),
      };
    });
  }, [eventConfig]);

  const availableTracks = useMemo(() => {
    if (Array.isArray(eventConfig.subEvents) && eventConfig.subEvents.length > 0) {
      return eventConfig.subEvents.map((s) => s.name);
    }
    if (Array.isArray(eventConfig.tracks) && eventConfig.tracks.length > 0) {
      return eventConfig.tracks;
    }
    return [eventConfig.category || 'General Track'];
  }, [eventConfig]);

  useEffect(() => {
    if (ticketOptions.length && !ticketOptions.some((ticket) => ticket.type === formData.ticketType)) {
      setFormData((current) => ({ ...current, ticketType: ticketOptions[0].type }));
    }
  }, [ticketOptions, formData.ticketType]);

  useEffect(() => {
    if (availableTracks.length && !availableTracks.includes(formData.track)) {
      setFormData((current) => ({ ...current, track: availableTracks[0] }));
    }
  }, [availableTracks, formData.track]);

  const selectedTier = ticketOptions.find((tier) => tier.type === formData.ticketType) || ticketOptions[0];
  const paymentEnabled = eventConfig.enablePaymentGateway !== false && eventConfig.pricingType !== 'free';
  const amountDue = paymentEnabled ? (selectedTier?.price ?? 0) : 0;

  const reqFields = eventConfig.requiredFields || DEFAULT_CONFIG.requiredFields;

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // If user picks a sub-event as ticketType and it's also in tracks, keep track in sync
      if (field === 'ticketType' && availableTracks.includes(value)) {
        updated.track = value;
      }
      return updated;
    });
    setErrorMsg('');
  };

  const buildParticipantPayload = () => {
    const formResponses = {};
    if (formData.branch) formResponses['Department / Branch'] = formData.branch.trim();
    if (formData.year) formResponses['Year of Study'] = formData.year.trim();
    if (formData.prn) formResponses['PRN / Roll Number'] = formData.prn.trim();
    if (formData.linkedinUrl) formResponses['LinkedIn Profile'] = formData.linkedinUrl.trim();
    if (eventConfig.customQuestion && formData.customAnswer) {
      formResponses[eventConfig.customQuestion] = formData.customAnswer.trim();
    }

    return {
      ...formData,
      institution: formData.institution.trim() || eventConfig.collegeName || 'Campus Participant',
      formResponses,
      amountPaid: amountDue,
      eventId: eventConfig.eventId || eventConfig.activeEventId || 'eventra-2026',
    };
  };

  const handleContinue = () => {
    if (step === 1 && !formRef.current?.reportValidity()) return;
    setErrorMsg('');
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const completeRegistration = (uniqueId, message = 'Your digital pass is ready.') => {
    sounds.playSuccess();
    if (formData.email) {
      api.auth.setAttendee({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        institution: formData.institution,
        githubUrl: formData.githubUrl,
      });
    }
    onShowToast?.({
      type: 'success',
      title: 'You’re registered!',
      message: `${message} Pass ID: ${uniqueId}`,
    });
    onRegistrationSuccess?.(uniqueId);
  };

  const verifyOrderStatusWithRetry = async (orderId, maxAttempts = 3) => {
    if (!orderId) return false;
    const payloadData = buildParticipantPayload();
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setIsLoading(true);
        const checkRes = await api.payment.checkOrderStatus(orderId, payloadData);
        if (checkRes.isPaid && checkRes.data) {
          try {
            sessionStorage.removeItem('eventra_active_order');
            setPendingOrder(null);
          } catch (e) {}
          completeRegistration(checkRes.data.uniqueId, 'Payment verified! Your official entry pass has been issued.');
          return true;
        }
      } catch (err) {
        console.warn(`[Order check attempt ${attempt}]:`, err?.message);
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
    return false;
  };

  const launchRazorpayCheckout = async (orderRes) => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      const scriptReady = await loadRazorpay();
      if (!scriptReady || !window.Razorpay) {
        throw new Error('Payment gateway failed to load. Please check your internet connection and try again.');
      }

      const razorpayKey = orderRes?.key_id || orderRes?.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_Toe8X3rzRfnIsm';
      const effectiveOrderId = orderRes?.order_id || orderRes?.orderId;

      const rawPhone = String(formData.phone || '').replace(/\D/g, '');
      const cleanContact = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;
      const cleanEmail = String(formData.email || '').trim().toLowerCase();
      const participantPayload = buildParticipantPayload();

      const pendingData = {
        orderId: effectiveOrderId,
        formData: participantPayload,
        amountDue,
        timestamp: Date.now(),
      };
      try {
        sessionStorage.setItem('eventra_active_order', JSON.stringify(pendingData));
        setPendingOrder(pendingData);
      } catch (e) {}

      const options = {
        key: razorpayKey,
        amount: orderRes?.amount || (amountDue * 100),
        currency: orderRes?.currency || 'INR',
        order_id: effectiveOrderId,
        name: eventConfig.eventName || 'Eventra',
        description: `${formData.ticketType} Entry Pass (₹${amountDue})`,
        image: `${window.location.origin}/eventra-icon.png`,
        prefill: {
          name: formData.name ? formData.name.trim() : '',
          email: cleanEmail,
          contact: cleanContact,
        },
        theme: {
          color: eventConfig.themeColor || '#596EE6',
          backdrop_color: 'rgba(15, 23, 42, 0.85)',
        },
        modal: {
          confirm_close: true,
          backdropclose: false,
          escape: false,
          handleback: true,
          ondismiss: async () => {
            if (effectiveOrderId) {
              const verified = await verifyOrderStatusWithRetry(effectiveOrderId, 3);
              if (verified) return;
            }
            setIsLoading(false);
            onShowToast?.({
              type: 'info',
              title: 'Checkout Window Closed',
              message: 'If you paid in Google Pay / PhonePe, click "Verify My Payment" below to retrieve your pass.',
            });
          },
        },
        handler: async (response) => {
          try {
            if (!response?.razorpay_payment_id) {
              throw new Error('Razorpay did not return a valid payment ID.');
            }

            setIsLoading(true);
            const verifyRes = await api.payment.verifyPayment({
              order_id: response.razorpay_order_id || effectiveOrderId,
              razorpay_order_id: response.razorpay_order_id || effectiveOrderId,
              payment_id: response.razorpay_payment_id,
              razorpay_payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              razorpay_signature: response.razorpay_signature,
              participantData: participantPayload,
            });

            try {
              sessionStorage.removeItem('eventra_active_order');
              setPendingOrder(null);
            } catch (e) {}

            completeRegistration(verifyRes.data.uniqueId, 'Payment verified! Your official entry pass has been issued.');
          } catch (error) {
            const verified = await verifyOrderStatusWithRetry(response?.razorpay_order_id || effectiveOrderId, 3);
            if (verified) return;

            sounds.playError();
            setErrorMsg(error.message || 'Payment verification failed.');
            onShowToast?.({
              type: 'error',
              title: 'Verification Failed',
              message: error.message || 'Payment could not be verified.',
            });
          } finally {
            setIsLoading(false);
          }
        },
      };

      if (effectiveOrderId && String(effectiveOrderId).startsWith('order_')) {
        options.order_id = effectiveOrderId;
      }

      const checkout = new window.Razorpay(options);

      checkout.on('payment.failed', async (response) => {
        if (effectiveOrderId) {
          const verified = await verifyOrderStatusWithRetry(effectiveOrderId, 3);
          if (verified) return;
        }
        setIsLoading(false);
        const reason = response?.error?.description || 'Payment was declined or cancelled.';
        setErrorMsg(`Payment Notice: ${reason}`);
        onShowToast?.({ type: 'warning', title: 'Payment Incomplete', message: reason });
      });

      checkout.open();
    } catch (err) {
      sounds.playError();
      setErrorMsg(err.message || 'Could not launch payment gateway.');
      onShowToast?.({ type: 'error', title: 'Checkout Error', message: err.message });
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      handleContinue();
      return;
    }
    if (!formRef.current?.reportValidity()) return;

    try {
      sounds.playClick();
      setIsLoading(true);
      setErrorMsg('');

      const participantPayload = buildParticipantPayload();
      const orderRes = await api.payment.createOrder(participantPayload);

      if (orderRes?.isFree) {
        completeRegistration(orderRes.data?.uniqueId || orderRes.uniqueId, 'Registration successful!');
        return;
      }

      await launchRazorpayCheckout(orderRes);
    } catch (error) {
      sounds.playError();
      setErrorMsg(error.message || 'Registration failed. Please try again.');
      onShowToast?.({
        type: 'error',
        title: 'Registration failed',
        message: error.message || 'Please try again.',
      });
      setIsLoading(false);
    }
  };

  const hasSubEvents = Array.isArray(eventConfig.subEvents) && eventConfig.subEvents.length > 0;

  return (
    <div className="registration-page">
      <div className="registration-orb registration-orb-one" aria-hidden="true" />
      <div className="registration-orb registration-orb-two" aria-hidden="true" />

      <header className="registration-header">
        <button type="button" className="registration-back" onClick={onBackToLanding}>
          <ArrowLeft size={16} /> <span>Back to event</span>
        </button>
        <div className="registration-brand">
          <img src="/eventra-logo.svg" alt="Eventra" style={{ height: '34px', width: 'auto' }} />
        </div>
        <div className="registration-secure"><ShieldCheck size={15} /> Secure registration</div>
      </header>

      <main className="registration-shell">
        <div className="registration-intro">
          <div className="registration-eyebrow">
            <Sparkles size={14} /> {eventConfig.eventName || 'Eventra'}
            {eventConfig.clubName && ` • ${eventConfig.clubName}`}
          </div>
          <h1>
            {eventConfig.eventName || 'Event Registration'}
            <br />
            <span>{eventConfig.eventTagline || `Official ${eventConfig.category || 'Event'} Pass`}</span>
          </h1>
          <p>
            {eventConfig.eventDescription || 'Select your pass tier, fill in your participant details, and receive your cryptographically verified QR entry pass.'}
          </p>
          <div className="registration-event-meta" style={{ flexWrap: 'wrap', gap: '12px' }}>
            <span><Calendar size={15} /> {eventConfig.eventDate || 'Dates TBA'}</span>
            {eventConfig.eventTime && <span><Clock size={15} /> {eventConfig.eventTime}</span>}
            <span><MapPin size={15} /> {eventConfig.eventVenue || 'Campus Venue'}{eventConfig.venueHall ? ` (${eventConfig.venueHall})` : ''}</span>
          </div>
        </div>

        <div className="registration-progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((item, index) => (
            <React.Fragment key={item.label}>
              <div className={`registration-step ${index === step ? 'is-current' : ''} ${index < step ? 'is-complete' : ''}`}>
                <span className="registration-step-number">{index < step ? <Check size={15} /> : `0${index + 1}`}</span>
                <span className="registration-step-copy"><strong>{item.label}</strong><small>{item.caption}</small></span>
              </div>
              {index < STEPS.length - 1 && <span className={`registration-step-line ${index < step ? 'is-complete' : ''}`} aria-hidden="true" />}
            </React.Fragment>
          ))}
        </div>

        {errorMsg && (
          <div className="registration-error" role="alert" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <X size={17} /> <span>{errorMsg}</span>
            </div>
            {pendingOrder?.orderId && (
              <button
                type="button"
                onClick={() => verifyOrderStatusWithRetry(pendingOrder.orderId, 3)}
                disabled={isLoading}
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: '#FECACA',
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '4px',
                }}
              >
                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                <span>If your UPI app debited money, click here to verify & claim pass</span>
              </button>
            )}
          </div>
        )}

        <form ref={formRef} className="registration-layout" onSubmit={handleSubmit}>
          <div className="registration-form-card">
            {step === 0 && (
              <section className="registration-form-step" aria-labelledby="pass-heading">
                <div className="registration-section-heading">
                  <div>
                    <span className="registration-overline">STEP 01 · PASS</span>
                    <h2 id="pass-heading">{hasSubEvents ? 'Pick your pass or sub-event' : 'Pick your pass'}</h2>
                  </div>
                  <span className="registration-section-icon"><Ticket size={20} /></span>
                </div>
                <p className="registration-section-note">
                  Choose the pass tier {hasSubEvents ? 'or sub-event activity ' : ''}for <strong>{eventConfig.eventName}</strong>.
                </p>

                <div className="registration-ticket-grid">
                  {ticketOptions.map((tier) => {
                    const isSelected = formData.ticketType === tier.type;
                    const price = tier.price ?? 0;
                    return (
                      <label key={tier.type} className={`registration-tier ${isSelected ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="ticketType"
                          value={tier.type}
                          checked={isSelected}
                          onChange={() => handleInputChange('ticketType', tier.type)}
                        />
                        <span className="registration-tier-top"><span>{tier.badge}</span>{isSelected && <CheckCircle2 size={17} />}</span>
                        <span className="registration-tier-name">{tier.type}</span>
                        <span className="registration-tier-price">{price === 0 ? 'Free' : `₹${price}`}<small>{price === 0 ? ' no payment' : ' / person'}</small></span>
                        <span className="registration-tier-detail">{tier.detail}</span>
                        <span className="registration-tier-features">
                          {tier.features.map((feature) => <span key={feature}><Check size={13} /> {feature}</span>)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {availableTracks.length > 0 && (
                  <div className="registration-field-block">
                    <label htmlFor="registration-track">
                      {hasSubEvents ? 'Choose your sub-event / activity' : 'Choose your track / category'}
                    </label>
                    <select
                      id="registration-track"
                      className="input-control registration-select"
                      value={formData.track}
                      onChange={(e) => handleInputChange('track', e.target.value)}
                    >
                      {availableTracks.map((track) => (
                        <option key={track} value={track}>{track}</option>
                      ))}
                    </select>
                    <small>Your selected {hasSubEvents ? 'sub-event' : 'track'} will be printed on your digital QR pass.</small>
                  </div>
                )}
              </section>
            )}

            {step === 1 && (
              <section className="registration-form-step" aria-labelledby="details-heading">
                <div className="registration-section-heading">
                  <div><span className="registration-overline">STEP 02 · ATTENDEE</span><h2 id="details-heading">A few details about you</h2></div>
                  <span className="registration-section-icon"><UserRound size={20} /></span>
                </div>
                <p className="registration-section-note">We’ll use these details to generate your entry pass and send event updates.</p>

                {/* Already Registered Alert for this Event */}
                {alreadyRegisteredPass && (
                  <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '12px', padding: '14px 18px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <CheckCircle2 size={18} color="#D97706" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#92400E' }}>You already have an active pass for this event!</div>
                        <div style={{ fontSize: '12px', color: '#B45309' }}>Pass ID: <code style={{ fontWeight: '800', color: '#78350F' }}>{alreadyRegisteredPass.uniqueId}</code> ({alreadyRegisteredPass.ticketType})</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRegistrationSuccess?.(alreadyRegisteredPass.uniqueId)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '12px', background: '#FFFFFF' }}
                    >
                      View Pass <ArrowRight size={13} />
                    </button>
                  </div>
                )}

                {/* Smart Pre-fill Banner */}
                {prefillProfile && !alreadyRegisteredPass && (!formData.phone || !formData.institution) && (
                  <div style={{ background: '#EEF0FF', border: '1px solid #C7D2FE', borderRadius: '12px', padding: '14px 18px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Sparkles size={18} color="#596EE6" />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#1E1B4B' }}>Welcome back, {prefillProfile.name}!</div>
                        <div style={{ fontSize: '12px', color: '#4B5563' }}>Auto-fill your contact & college info from your prior registrations?</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playSuccess();
                        setFormData((prev) => ({
                          ...prev,
                          name: prefillProfile.name || prev.name,
                          phone: prefillProfile.phone || prev.phone,
                          institution: prefillProfile.institution || prev.institution,
                          githubUrl: prefillProfile.githubUrl || prev.githubUrl,
                        }));
                        onShowToast?.({
                          type: 'success',
                          title: 'Details Pre-filled! ⚡',
                          message: 'Saved contact and college info applied to your registration.',
                        });
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Sparkles size={13} /> 1-Click Auto-Fill
                    </button>
                  </div>
                )}

                <div className="registration-fields-grid">
                  <div className="registration-field-block">
                    <label htmlFor="registration-name">Full name <span>*</span></label>
                    <div className="registration-input-wrap">
                      <UserRound size={16} />
                      <input
                        id="registration-name"
                        className="input-control"
                        autoComplete="name"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="registration-field-block">
                    <label htmlFor="registration-email">Email address <span>*</span></label>
                    <div className="registration-input-wrap">
                      <Mail size={16} />
                      <input
                        id="registration-email"
                        className="input-control"
                        type="email"
                        autoComplete="email"
                        placeholder="you@college.edu"
                        value={formData.email}
                        onChange={(e) => {
                          handleInputChange('email', e.target.value);
                          checkEmailForExistingProfile(e.target.value);
                        }}
                        onBlur={(e) => checkEmailForExistingProfile(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="registration-field-block">
                    <label htmlFor="registration-phone">Mobile / WhatsApp <span>*</span></label>
                    <div className="registration-input-wrap">
                      <Phone size={16} />
                      <input
                        id="registration-phone"
                        className="input-control"
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="Your 10-digit mobile number"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {reqFields.college !== false && (
                    <div className="registration-field-block">
                      <label htmlFor="registration-institution">College / institution <span>*</span></label>
                      <div className="registration-input-wrap">
                        <Building2 size={16} />
                        <input
                          id="registration-institution"
                          className="input-control"
                          autoComplete="organization"
                          placeholder={eventConfig.collegeName || 'College or institution'}
                          value={formData.institution}
                          onChange={(e) => handleInputChange('institution', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {reqFields.branch && (
                    <div className="registration-field-block">
                      <label htmlFor="registration-branch">Department / Branch <span>*</span></label>
                      <div className="registration-input-wrap">
                        <Layers size={16} />
                        <input
                          id="registration-branch"
                          className="input-control"
                          placeholder="e.g. Computer Engineering / AI & DS"
                          value={formData.branch}
                          onChange={(e) => handleInputChange('branch', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {reqFields.year && (
                    <div className="registration-field-block">
                      <label htmlFor="registration-year">Year of Study <span>*</span></label>
                      <div className="registration-input-wrap">
                        <GraduationCap size={16} />
                        <select
                          id="registration-year"
                          className="input-control registration-select"
                          value={formData.year}
                          onChange={(e) => handleInputChange('year', e.target.value)}
                          required
                        >
                          <option value="">Select Year</option>
                          <option value="FE (First Year)">FE (First Year)</option>
                          <option value="SE (Second Year)">SE (Second Year)</option>
                          <option value="TE (Third Year)">TE (Third Year)</option>
                          <option value="BE / BTech (Final Year)">BE / BTech (Final Year)</option>
                          <option value="Postgraduate / Other">Postgraduate / Other</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {reqFields.prn && (
                    <div className="registration-field-block">
                      <label htmlFor="registration-prn">PRN / Roll Number / College ID <span>*</span></label>
                      <div className="registration-input-wrap">
                        <Hash size={16} />
                        <input
                          id="registration-prn"
                          className="input-control"
                          placeholder="Enter your PRN or Roll Number"
                          value={formData.prn}
                          onChange={(e) => handleInputChange('prn', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="registration-field-block">
                    <label htmlFor="registration-team">Team name <small>Optional</small></label>
                    <div className="registration-input-wrap">
                      <UsersRound size={16} />
                      <input
                        id="registration-team"
                        className="input-control"
                        placeholder="Leave blank if registering solo"
                        value={formData.teamName}
                        onChange={(e) => handleInputChange('teamName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="registration-field-block">
                    <label htmlFor="registration-github">
                      GitHub / Portfolio {reqFields.github ? <span>*</span> : <small>Optional</small>}
                    </label>
                    <div className="registration-input-wrap">
                      <Github size={16} />
                      <input
                        id="registration-github"
                        className="input-control"
                        type="url"
                        placeholder="https://github.com/you"
                        value={formData.githubUrl}
                        onChange={(e) => handleInputChange('githubUrl', e.target.value)}
                        required={Boolean(reqFields.github)}
                      />
                    </div>
                  </div>

                  {reqFields.linkedin && (
                    <div className="registration-field-block">
                      <label htmlFor="registration-linkedin">LinkedIn Profile URL <span>*</span></label>
                      <div className="registration-input-wrap">
                        <Globe size={16} />
                        <input
                          id="registration-linkedin"
                          className="input-control"
                          type="url"
                          placeholder="https://linkedin.com/in/you"
                          value={formData.linkedinUrl}
                          onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {eventConfig.customQuestion && (
                    <div className="registration-field-block" style={{ gridColumn: '1 / -1' }}>
                      <label htmlFor="registration-custom">{eventConfig.customQuestion} <span>*</span></label>
                      <div className="registration-input-wrap">
                        <HelpCircle size={16} />
                        <input
                          id="registration-custom"
                          className="input-control"
                          placeholder="Your answer"
                          value={formData.customAnswer}
                          onChange={(e) => handleInputChange('customAnswer', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="registration-privacy-note"><ShieldCheck size={16} /><span>Your details are used for event registration and official QR pass delivery.</span></div>
              </section>
            )}

            {step === 2 && (
              <section className="registration-form-step" aria-labelledby="review-heading">
                <div className="registration-section-heading">
                  <div><span className="registration-overline">STEP 03 · REVIEW</span><h2 id="review-heading">Looking good?</h2></div>
                  <span className="registration-section-icon"><BadgeCheck size={20} /></span>
                </div>
                <p className="registration-section-note">Review your pass and attendee details before confirming your spot at <strong>{eventConfig.eventName}</strong>.</p>

                <div className="registration-review-card">
                  <div className="registration-review-top"><span className="registration-review-label">YOUR PASS</span><button type="button" onClick={() => setStep(0)}>Edit pass</button></div>
                  <div className="registration-review-title"><span className="registration-review-ticket"><Ticket size={19} /></span><div><strong>{selectedTier?.type}</strong><small>{formData.track}</small></div><b>{amountDue === 0 ? 'Free' : `₹${amountDue}`}</b></div>
                  <div className="registration-review-divider" />
                  <div className="registration-review-top"><span className="registration-review-label">ATTENDEE DETAILS</span><button type="button" onClick={() => setStep(1)}>Edit details</button></div>
                  <dl className="registration-review-details">
                    <div><dt>Name</dt><dd>{formData.name}</dd></div>
                    <div><dt>Email</dt><dd>{formData.email}</dd></div>
                    <div><dt>Mobile</dt><dd>{formData.phone}</dd></div>
                    {formData.institution && <div><dt>Institution</dt><dd>{formData.institution}</dd></div>}
                    {formData.branch && <div><dt>Branch</dt><dd>{formData.branch}</dd></div>}
                    {formData.year && <div><dt>Year</dt><dd>{formData.year}</dd></div>}
                    {formData.prn && <div><dt>PRN / ID</dt><dd>{formData.prn}</dd></div>}
                    {formData.teamName && <div><dt>Team</dt><dd>{formData.teamName}</dd></div>}
                    {eventConfig.customQuestion && formData.customAnswer && (
                      <div><dt>{eventConfig.customQuestion}</dt><dd>{formData.customAnswer}</dd></div>
                    )}
                  </dl>
                </div>

                <div className="registration-next-note">
                  <Sparkles size={16} />
                  <span>{amountDue > 0 ? 'You’ll continue to secure checkout to complete your registration.' : 'Your digital QR pass will be created as soon as you confirm.'}</span>
                </div>

                {isInAppBrowser && amountDue > 0 && (
                  <div style={{
                    marginTop: '14px',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    background: 'rgba(59, 130, 246, 0.08)',
                    border: '1px solid rgba(59, 130, 246, 0.25)',
                    fontSize: '12px',
                    color: '#93C5FD',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    lineHeight: 1.5,
                  }}>
                    <Smartphone size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#60A5FA' }} />
                    <div>
                      <strong>📱 Mobile Notice (WhatsApp/Instagram Browser):</strong> If Google Pay or PhonePe doesn’t open automatically, tap the menu <strong>(⋮)</strong> at the top right and select <strong>"Open in Chrome"</strong> or <strong>"Open in Safari"</strong>. Alternatively, choose <strong>"UPI ID"</strong> (e.g. <code>yourname@okaxis</code>) or <strong>Card</strong> inside the checkout window.
                    </div>
                  </div>
                )}

                {pendingOrder?.orderId && (
                  <div style={{
                    marginTop: '14px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <RefreshCw size={18} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong style={{ fontSize: '13px', color: '#FFFFFF' }}>Already completed payment in your UPI app?</strong>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94A3B8', lineHeight: 1.5 }}>
                          If money was debited from your bank via Google Pay, PhonePe, or Paytm, tap below to verify and retrieve your pass instantly.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => verifyOrderStatusWithRetry(pendingOrder.orderId, 3)}
                        disabled={isLoading}
                        style={{
                          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                          border: 'none',
                          color: '#ffffff',
                          fontWeight: '800',
                          fontSize: '12px',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                        <span>{isLoading ? 'Verifying with Bank...' : 'Verify My UPI Payment'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          try {
                            sessionStorage.removeItem('eventra_active_order');
                          } catch (e) {}
                          setPendingOrder(null);
                        }}
                        style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            <div className="registration-form-actions">
              {step > 0 ? (
                <button type="button" className="registration-button-secondary" onClick={() => { setErrorMsg(''); setStep((current) => current - 1); }} disabled={isLoading}><ArrowLeft size={16} /> Back</button>
              ) : <span className="registration-action-spacer" />}
              {step < STEPS.length - 1 ? (
                <button type="button" className="registration-button-primary" onClick={handleContinue}>Continue <ArrowRight size={16} /></button>
              ) : (
                <button type="submit" className="registration-button-primary" disabled={isLoading}>
                  {isLoading ? <><span className="registration-spinner" /> Processing…</> : amountDue > 0 ? <><CreditCard size={17} /> Continue to payment <ArrowRight size={16} /></> : <><CheckCircle2 size={17} /> Complete registration <ArrowRight size={16} /></>}
                </button>
              )}
            </div>
          </div>

          <aside className="registration-summary">
            <div className="registration-summary-heading"><span>YOUR EVENT</span><span className="registration-live-dot" /> <small>Registration portal</small></div>
            <div className="registration-summary-event">{eventConfig.eventName || 'Eventra'}</div>
            <div className="registration-summary-subtitle">
              {eventConfig.eventTagline || `${eventConfig.eventDate || 'Upcoming Event'} • ${eventConfig.eventVenue || 'Campus Venue'}`}
            </div>
            <div className="registration-summary-rule" />
            <div className="registration-summary-line"><Ticket size={16} /><span>{selectedTier?.type || 'Standard Pass'}</span><strong>{amountDue === 0 ? 'Free' : `₹${amountDue}`}</strong></div>
            <div className="registration-summary-line"><Sparkles size={16} /><span>{formData.track}</span></div>
            {eventConfig.eventDate && (
              <div className="registration-summary-line"><Calendar size={16} /><span>{eventConfig.eventDate}</span></div>
            )}
            {eventConfig.eventVenue && (
              <div className="registration-summary-line"><MapPin size={16} /><span>{eventConfig.eventVenue}</span></div>
            )}
            <div className="registration-summary-rule" />
            <div className="registration-total"><span>Total due</span><strong>{amountDue === 0 ? 'Free' : `₹${amountDue}`}</strong></div>
            <div className="registration-summary-foot"><ShieldCheck size={14} /> {amountDue > 0 ? 'Secure payment powered by Razorpay' : 'Free official pass — no payment required'}</div>
            <div className="registration-summary-perks"><div><CheckCircle2 size={15} /> Digital QR entry pass</div><div><CheckCircle2 size={15} /> Instant email & WhatsApp pass</div></div>
          </aside>
        </form>

        <div className="registration-footer-note"><Lock size={13} /> Your registration details stay with the {eventConfig.clubName || eventConfig.eventName || 'Eventra'} organizing team.</div>
      </main>
    </div>
  );
};
