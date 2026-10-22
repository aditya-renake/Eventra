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
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

const DEFAULT_CONFIG = {
  eventName: 'Eventra 2026',
  eventDate: 'October 16 - 18, 2026',
  eventVenue: 'Dr. D. Y. Patil Institute of Technology (DIT), Pimpri, Pune',
  enablePaymentGateway: true,
  ticketPrices: {
    'Hacker Pass': 5,
    'Student Pass': 5,
    'VIP Delegate': 5,
    'Judge / Mentor': 5,
  },
};

const TRACKS = [
  'AI & Agentic Systems',
  'Cybersecurity & Privacy',
  'Web3 & Decentralized Tech',
  'Cloud & Distributed Systems',
  'Open Innovation & Campus Tech',
];

const TIER_DETAILS = {
  'Hacker Pass': {
    badge: 'MOST POPULAR',
    detail: 'The full 48-hour build experience.',
    features: ['48-hour hackathon access', 'Meals and hacker kit', 'Digital QR entry pass'],
  },
  'Student Pass': {
    badge: 'STUDENT PASS',
    detail: 'A focused pass for student attendees.',
    features: ['Hackathon entry', 'Mentorship and workshops', 'Participation certificate'],
  },
  'VIP Delegate': {
    badge: 'ALL ACCESS',
    detail: 'Extra access for guests and delegates.',
    features: ['All event access', 'VIP lounge access', 'Priority demo area'],
  },
  'Judge / Mentor': {
    badge: 'INVITED GUEST',
    detail: 'For invited judges and mentors.',
    features: ['Judge and mentor access', 'Digital QR entry pass', 'Event schedule access'],
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

export const RegistrationPage = ({ onRegistrationSuccess, onBackToLanding, onShowToast }) => {
  const formRef = useRef(null);
  const [eventConfig, setEventConfig] = useState(DEFAULT_CONFIG);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    institution: '',
    ticketType: 'Hacker Pass',
    track: TRACKS[0],
    teamName: '',
    githubUrl: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingOrder, setPendingOrder] = useState(null);

  // Detect In-App Browsers (WhatsApp, Instagram, etc. which block standard native intent links)
  const isInAppBrowser = typeof navigator !== 'undefined' && /FBAN|FBAV|Instagram|WhatsApp|Telegram|Line|MicroMessenger/i.test(navigator.userAgent || '');

  useEffect(() => {
    let mounted = true;
    api.event.getConfig()
      .then((res) => {
        if (mounted && res?.data) setEventConfig((current) => ({ ...current, ...res.data }));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // 1. Handle return from Razorpay Hosted Checkout (rzp.io) via callback URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const plinkId = params.get('plink_id') || params.get('payment_link_id');
    const paymentId = params.get('payment_id') || params.get('razorpay_payment_id');
    const orderId = params.get('order_id');
    const plinkStatus = params.get('plink_status') || params.get('razorpay_payment_link_status');

    if (plinkId || (orderId && plinkStatus === 'paid') || paymentId) {
      setIsLoading(true);
      let participantData = formData;
      try {
        const saved = sessionStorage.getItem('eventra_active_order');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.formData) participantData = parsed.formData;
        }
      } catch (e) {}

      api.payment.verifyPaymentLink({
        paymentLinkId: plinkId,
        orderId,
        paymentId,
        participantData,
      })
        .then((res) => {
          if (res?.isPaid && res?.data) {
            try {
              sessionStorage.removeItem('eventra_active_order');
              setPendingOrder(null);
              window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {}
            completeRegistration(res.data.uniqueId, 'Payment verified! Your official entry pass has been issued.');
          } else {
            setIsLoading(false);
          }
        })
        .catch((err) => {
          setIsLoading(false);
          console.warn('Payment link check notice:', err?.message);
        });
    }
  }, []);

  // 2. Restore any pending order from session on initial page mount (e.g. if mobile browser tab reloaded)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('eventra_active_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if ((parsed?.orderId || parsed?.paymentLinkId) && Date.now() - (parsed.timestamp || 0) < 30 * 60 * 1000) {
          setPendingOrder(parsed);
          if (parsed.formData) {
            setFormData((prev) => ({ ...prev, ...parsed.formData }));
          }
          const checkPromise = parsed.paymentLinkId
            ? api.payment.verifyPaymentLink({ paymentLinkId: parsed.paymentLinkId, orderId: parsed.orderId, participantData: parsed.formData })
            : api.payment.checkOrderStatus(parsed.orderId, parsed.formData);

          checkPromise
            .then((res) => {
              if (res?.isPaid && res?.data) {
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

  // Mobile app-switch auto-recovery: Poll when user returns from UPI app (GPay / PhonePe) to browser tab
  useEffect(() => {
    const handleReturnToTab = async () => {
      if (document.visibilityState === 'visible' && (pendingOrder?.orderId || pendingOrder?.paymentLinkId)) {
        try {
          const checkPromise = pendingOrder.paymentLinkId
            ? api.payment.verifyPaymentLink({ paymentLinkId: pendingOrder.paymentLinkId, orderId: pendingOrder.orderId, participantData: pendingOrder.formData || formData })
            : api.payment.checkOrderStatus(pendingOrder.orderId, pendingOrder.formData || formData);

          const checkRes = await checkPromise;
          if (checkRes?.isPaid && checkRes?.data) {
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
    const prices = eventConfig.ticketPrices || DEFAULT_CONFIG.ticketPrices;
    return Object.entries(prices).map(([type, price]) => {
      const p = Number(price);
      const finalPrice = p > 0 ? p : 5;
      return {
        type,
        price: finalPrice,
        ...(TIER_DETAILS[type] || {
          badge: 'EVENT PASS',
          detail: 'Access for Eventra 2026.',
          features: ['Event access', 'Digital QR entry pass'],
        }),
      };
    });
  }, [eventConfig.ticketPrices]);

  useEffect(() => {
    if (ticketOptions.length && !ticketOptions.some((ticket) => ticket.type === formData.ticketType)) {
      setFormData((current) => ({ ...current, ticketType: ticketOptions[0].type }));
    }
  }, [ticketOptions, formData.ticketType]);

  const selectedTier = ticketOptions.find((tier) => tier.type === formData.ticketType) || ticketOptions[0];
  const paymentEnabled = eventConfig.enablePaymentGateway !== false;
  const amountDue = paymentEnabled ? (selectedTier?.price ?? 5) : 0;

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMsg('');
  };

  const handleContinue = () => {
    if (step === 1 && !formRef.current?.reportValidity()) return;
    setErrorMsg('');
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const completeRegistration = (uniqueId, message = 'Your digital pass is ready.') => {
    sounds.playSuccess();
    onShowToast?.({
      type: 'success',
      title: 'You’re registered!',
      message: `${message} Pass ID: ${uniqueId}`,
    });
    onRegistrationSuccess?.(uniqueId);
  };

  const verifyOrderStatusWithRetry = async (orderId, maxAttempts = 3, plinkId = null) => {
    const effectivePlinkId = plinkId || pendingOrder?.paymentLinkId;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        setIsLoading(true);
        if (effectivePlinkId) {
          const linkRes = await api.payment.verifyPaymentLink({
            paymentLinkId: effectivePlinkId,
            orderId,
            participantData: pendingOrder?.formData || formData,
          });
          if (linkRes?.isPaid && linkRes?.data) {
            try {
              sessionStorage.removeItem('eventra_active_order');
              setPendingOrder(null);
            } catch (e) {}
            completeRegistration(linkRes.data.uniqueId, 'Payment verified! Your official entry pass has been issued.');
            return true;
          }
        }
        if (orderId) {
          const checkRes = await api.payment.checkOrderStatus(orderId, pendingOrder?.formData || formData);
          if (checkRes?.isPaid && checkRes?.data) {
            try {
              sessionStorage.removeItem('eventra_active_order');
              setPendingOrder(null);
            } catch (e) {}
            completeRegistration(checkRes.data.uniqueId, 'Payment verified! Your official entry pass has been issued.');
            return true;
          }
        }
      } catch (err) {
        console.warn(`[Order check attempt ${attempt}]:`, err?.message);
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
    setIsLoading(false);
    return false;
  };

  const launchRazorpayCheckout = async (orderRes) => {
    try {
      setIsLoading(true);
      setErrorMsg('');

      const effectiveOrderId = orderRes?.order_id || orderRes?.orderId;
      const paymentLinkUrl = orderRes?.paymentLinkUrl;
      const paymentLinkId = orderRes?.paymentLinkId;

      // Clean mobile contact to strict 10 digits for seamless UPI intent dispatch
      const rawPhone = String(formData.phone || '').replace(/\D/g, '');
      const cleanContact = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;
      const cleanEmail = String(formData.email || '').trim().toLowerCase();

      // Persist in session storage for mobile app-switch recovery
      const pendingData = {
        orderId: effectiveOrderId,
        paymentLinkId,
        paymentLinkUrl,
        formData,
        amountDue,
        timestamp: Date.now(),
      };
      try {
        sessionStorage.setItem('eventra_active_order', JSON.stringify(pendingData));
        setPendingOrder(pendingData);
      } catch (e) {}

      // On mobile devices: Route directly to official Razorpay Hosted Checkout (rzp.io)
      // This eliminates mobile iframe blocks ("Payment blocked as website does not match registered website(s)")
      // and natively triggers Google Pay, PhonePe, Paytm, and CRED UPI apps with 100% success.
      const isMobileDevice = typeof window !== 'undefined' && (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '') ||
        window.innerWidth < 768
      );

      if (isMobileDevice && paymentLinkUrl) {
        setIsLoading(true);
        window.location.href = paymentLinkUrl;
        return;
      }

      const scriptReady = await loadRazorpay();
      if (!scriptReady || !window.Razorpay) {
        if (paymentLinkUrl) {
          window.location.href = paymentLinkUrl;
          return;
        }
        throw new Error('Payment gateway failed to load. Please check your internet connection and try again.');
      }

      const razorpayKey = orderRes?.key_id || orderRes?.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_Toe8X3rzRfnIsm';

      const options = {
        key: razorpayKey,
        amount: orderRes?.amount || (amountDue * 100),
        currency: orderRes?.currency || 'INR',
        name: eventConfig.eventName || 'Eventra 2026',
        description: `${formData.ticketType} Entry Pass (₹${amountDue})`,
        image: `${window.location.origin}/eventra-icon.png`,
        prefill: {
          name: formData.name ? formData.name.trim() : '',
          email: cleanEmail,
          contact: cleanContact,
        },
        theme: {
          color: '#596EE6',
          backdrop_color: 'rgba(15, 23, 42, 0.85)',
        },
        modal: {
          confirm_close: true,     // Prevents accidental back-swipe from cancelling without confirmation
          backdropclose: false,    // Prevents accidental taps outside on mobile touch screens
          escape: false,
          handleback: true,        // Handles Android hardware back button gracefully
          ondismiss: async () => {
            // Auto-check with bank/Razorpay if user paid in GPay/PhonePe before modal was closed
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
        retry: {
          enabled: true,
          max_count: 4,
        },
        send_sms_hash: true,
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
              participantData: { ...formData, amountPaid: amountDue },
            });

            try {
              sessionStorage.removeItem('eventra_active_order');
              setPendingOrder(null);
            } catch (e) {}

            completeRegistration(verifyRes.data.uniqueId, 'Payment verified! Your official entry pass has been issued.');
          } catch (error) {
            // Auto-recovery
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

      const orderRes = await api.payment.createOrder({ ...formData, amountPaid: amountDue });

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
          <div className="registration-eyebrow"><Sparkles size={14} /> {eventConfig.eventName || 'Eventra 2026'}</div>
          <h1>Your next big idea<br /><span>starts here.</span></h1>
          <p>Save your place at the 48-hour student hackathon. Choose a pass, tell us a little about yourself, and you’re all set.</p>
          <div className="registration-event-meta">
            <span><Ticket size={15} /> {eventConfig.eventDate || DEFAULT_CONFIG.eventDate}</span>
            <span><MapPin size={15} /> Eventra Live Stage</span>
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
                  <div><span className="registration-overline">STEP 01 · PASS</span><h2 id="pass-heading">Pick your pass</h2></div>
                  <span className="registration-section-icon"><Ticket size={20} /></span>
                </div>
                <p className="registration-section-note">Choose the pass that fits how you’ll join Eventra.</p>

                <div className="registration-ticket-grid">
                  {ticketOptions.map((tier) => {
                    const isSelected = formData.ticketType === tier.type;
                    const price = tier.price || 5;
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

                <div className="registration-field-block">
                  <label htmlFor="registration-track">Choose your problem track</label>
                  <select
                    id="registration-track"
                    className="input-control registration-select"
                    value={formData.track}
                    onChange={(e) => handleInputChange('track', e.target.value)}
                  >
                    {TRACKS.map((track) => <option key={track} value={track}>{track}</option>)}
                  </select>
                  <small>You can refine your idea and team during the event.</small>
                </div>
              </section>
            )}

            {step === 1 && (
              <section className="registration-form-step" aria-labelledby="details-heading">
                <div className="registration-section-heading">
                  <div><span className="registration-overline">STEP 02 · ATTENDEE</span><h2 id="details-heading">A few details about you</h2></div>
                  <span className="registration-section-icon"><UserRound size={20} /></span>
                </div>
                <p className="registration-section-note">We’ll use these details to prepare your entry pass and event updates.</p>

                <div className="registration-fields-grid">
                  <div className="registration-field-block">
                    <label htmlFor="registration-name">Full name <span>*</span></label>
                    <div className="registration-input-wrap"><UserRound size={16} /><input id="registration-name" className="input-control" autoComplete="name" placeholder="Your name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} required /></div>
                  </div>
                  <div className="registration-field-block">
                    <label htmlFor="registration-email">Email address <span>*</span></label>
                    <div className="registration-input-wrap"><Mail size={16} /><input id="registration-email" className="input-control" type="email" autoComplete="email" placeholder="you@college.edu" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} required /></div>
                  </div>
                  <div className="registration-field-block">
                    <label htmlFor="registration-phone">Mobile / WhatsApp <span>*</span></label>
                    <div className="registration-input-wrap"><Phone size={16} /><input id="registration-phone" className="input-control" type="tel" autoComplete="tel" inputMode="tel" placeholder="Your mobile number" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} required /></div>
                  </div>
                  <div className="registration-field-block">
                    <label htmlFor="registration-institution">College / institution <span>*</span></label>
                    <div className="registration-input-wrap"><Building2 size={16} /><input id="registration-institution" className="input-control" autoComplete="organization" placeholder="College or institution" value={formData.institution} onChange={(e) => handleInputChange('institution', e.target.value)} required /></div>
                  </div>
                  <div className="registration-field-block">
                    <label htmlFor="registration-team">Team name <small>Optional</small></label>
                    <div className="registration-input-wrap"><UsersRound size={16} /><input id="registration-team" className="input-control" placeholder="Leave blank if solo" value={formData.teamName} onChange={(e) => handleInputChange('teamName', e.target.value)} /></div>
                  </div>
                  <div className="registration-field-block">
                    <label htmlFor="registration-github">GitHub profile <small>Optional</small></label>
                    <div className="registration-input-wrap"><Github size={16} /><input id="registration-github" className="input-control" type="url" placeholder="https://github.com/you" value={formData.githubUrl} onChange={(e) => handleInputChange('githubUrl', e.target.value)} /></div>
                  </div>
                </div>
                <div className="registration-privacy-note"><ShieldCheck size={16} /><span>Your details are used for event registration and pass delivery.</span></div>
              </section>
            )}

            {step === 2 && (
              <section className="registration-form-step" aria-labelledby="review-heading">
                <div className="registration-section-heading">
                  <div><span className="registration-overline">STEP 03 · REVIEW</span><h2 id="review-heading">Looking good?</h2></div>
                  <span className="registration-section-icon"><BadgeCheck size={20} /></span>
                </div>
                <p className="registration-section-note">Review your pass and attendee details before you finish.</p>

                <div className="registration-review-card">
                  <div className="registration-review-top"><span className="registration-review-label">YOUR PASS</span><button type="button" onClick={() => setStep(0)}>Edit pass</button></div>
                  <div className="registration-review-title"><span className="registration-review-ticket"><Ticket size={19} /></span><div><strong>{selectedTier?.type}</strong><small>{formData.track}</small></div><b>{amountDue === 0 ? 'Free' : `₹${amountDue}`}</b></div>
                  <div className="registration-review-divider" />
                  <div className="registration-review-top"><span className="registration-review-label">ATTENDEE DETAILS</span><button type="button" onClick={() => setStep(1)}>Edit details</button></div>
                  <dl className="registration-review-details">
                    <div><dt>Name</dt><dd>{formData.name}</dd></div>
                    <div><dt>Email</dt><dd>{formData.email}</dd></div>
                    <div><dt>Mobile</dt><dd>{formData.phone}</dd></div>
                    <div><dt>Institution</dt><dd>{formData.institution}</dd></div>
                    {formData.teamName && <div><dt>Team</dt><dd>{formData.teamName}</dd></div>}
                  </dl>
                </div>

                <div className="registration-next-note">
                  <Sparkles size={16} />
                  <span>{amountDue > 0 ? 'You’ll continue to secure checkout to complete your registration.' : 'Your digital QR pass will be created as soon as you confirm.'}</span>
                </div>

                {/* Mobile In-App Browser Guidance Banner */}
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

                {/* Pending Order Auto-Recovery Card */}
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
                        onClick={() => verifyOrderStatusWithRetry(pendingOrder.orderId, 3, pendingOrder.paymentLinkId)}
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
                      {pendingOrder.paymentLinkUrl && (
                        <a
                          href={pendingOrder.paymentLinkUrl}
                          style={{
                            background: 'linear-gradient(135deg, #596ee6 0%, #475ac4 100%)',
                            color: '#ffffff',
                            fontWeight: '800',
                            fontSize: '12px',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            textDecoration: 'none',
                          }}
                        >
                          <CreditCard size={13} />
                          <span>Re-open Razorpay Link</span>
                        </a>
                      )}
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

                {amountDue > 0 && String(import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_').startsWith('rzp_test_') && (
                  <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(247, 208, 112, 0.08)', border: '1px solid rgba(247, 208, 112, 0.25)', fontSize: '12px', color: '#fef08a', display: 'flex', alignItems: 'center', gap: '8px', lineHeight: 1.5 }}>
                    <AlertCircle size={16} style={{ flexShrink: 0, color: '#facc15' }} />
                    <span><strong>Razorpay Test Sandbox:</strong> Real UPI apps (GPay / PhonePe) will say <em>"Invalid QR"</em> on test codes. To test without real money: inside the popup, select <strong>UPI ID</strong> and enter <code>success@razorpay</code>, or select <strong>Card / NetBanking</strong> & click <strong>Success</strong>. (To accept real mobile UPI payments, switch to Razorpay Live keys in Admin).</span>
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
            <div className="registration-summary-event">{eventConfig.eventName || 'Eventra 2026'}</div>
            <div className="registration-summary-subtitle">48 hours to build something remarkable.</div>
            <div className="registration-summary-rule" />
            <div className="registration-summary-line"><Ticket size={16} /><span>{selectedTier?.type || 'Hacker Pass'}</span><strong>{amountDue === 0 ? 'Free' : `₹${amountDue}`}</strong></div>
            <div className="registration-summary-line"><Sparkles size={16} /><span>{formData.track}</span></div>
            <div className="registration-summary-rule" />
            <div className="registration-total"><span>Total due</span><strong>{amountDue === 0 ? 'Free' : `₹${amountDue}`}</strong></div>
            <div className="registration-summary-foot"><ShieldCheck size={14} /> {amountDue > 0 ? 'Secure payment powered by Razorpay' : 'No payment required'}</div>
            <div className="registration-summary-perks"><div><CheckCircle2 size={15} /> Digital entry pass</div><div><CheckCircle2 size={15} /> Event updates by email</div></div>
          </aside>
        </form>

        <div className="registration-footer-note"><Lock size={13} /> Your registration details stay with the Eventra event team.</div>
      </main>
    </div>
  );
};
