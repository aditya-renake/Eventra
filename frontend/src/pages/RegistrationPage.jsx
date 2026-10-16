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
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

const DEFAULT_CONFIG = {
  eventName: 'HackSeries 2026',
  eventDate: 'October 16 - 18, 2026',
  eventVenue: 'Dr. D. Y. Patil Institute of Technology (DIT), Pimpri, Pune',
  enablePaymentGateway: false,
  ticketPrices: {
    'Hacker Pass': 199,
    'Student Pass': 149,
    'VIP Delegate': 499,
    'Judge / Mentor': 0,
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
  if (window.Razorpay) return resolve(true);
  const script = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
  if (!script) return resolve(false);
  let settled = false;
  const finish = (ready) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeoutId);
    resolve(ready);
  };
  const timeoutId = window.setTimeout(() => finish(Boolean(window.Razorpay)), 5000);
  script.addEventListener('load', () => finish(Boolean(window.Razorpay)), { once: true });
  script.addEventListener('error', () => finish(false), { once: true });
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

  useEffect(() => {
    let mounted = true;
    api.event.getConfig()
      .then((res) => {
        if (mounted && res?.data) setEventConfig((current) => ({ ...current, ...res.data }));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const ticketOptions = useMemo(() => {
    const prices = eventConfig.ticketPrices || DEFAULT_CONFIG.ticketPrices;
    return Object.entries(prices).map(([type, price]) => ({
      type,
      price: Number(price) || 0,
      ...(TIER_DETAILS[type] || {
        badge: 'EVENT PASS',
        detail: 'Access for HackSeries 2026.',
        features: ['Event access', 'Digital QR entry pass'],
      }),
    }));
  }, [eventConfig.ticketPrices]);

  useEffect(() => {
    if (ticketOptions.length && !ticketOptions.some((ticket) => ticket.type === formData.ticketType)) {
      setFormData((current) => ({ ...current, ticketType: ticketOptions[0].type }));
    }
  }, [ticketOptions, formData.ticketType]);

  const selectedTier = ticketOptions.find((tier) => tier.type === formData.ticketType) || ticketOptions[0];
  const paymentEnabled = eventConfig.enablePaymentGateway === true;
  const amountDue = paymentEnabled ? selectedTier?.price || 0 : 0;

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

  const verifyPayment = async (response) => {
    const verifyRes = await api.payment.verifyPayment({
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
      participantData: { ...formData, amountPaid: amountDue },
    });
    completeRegistration(verifyRes.data.uniqueId, 'Payment confirmed.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      handleContinue();
      return;
    }
    if (!formRef.current?.reportValidity()) return;

    let checkoutOpened = false;
    try {
      sounds.playClick();
      setIsLoading(true);
      setErrorMsg('');
      const orderRes = await api.payment.createOrder({ ...formData, amountPaid: amountDue });

      if (orderRes.isFree) {
        completeRegistration(orderRes.data.uniqueId, 'Your free registration is confirmed.');
        return;
      }

      if (orderRes.isMock && import.meta.env.DEV) {
        const demoPayment = await api.payment.verifyPayment({
          razorpay_order_id: orderRes.orderId,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_sig_sandbox_approved',
          participantData: { ...formData, amountPaid: amountDue },
        });
        completeRegistration(demoPayment.data.uniqueId, 'Demo checkout complete.');
        return;
      }

      if (orderRes.isMock) {
        throw new Error('Online checkout is not available right now. Please contact the event team.');
      }

      const scriptReady = await loadRazorpay();
      if (!scriptReady) {
        throw new Error('Secure checkout could not load. Please check your connection and try again.');
      }

      const checkout = new window.Razorpay({
        key: orderRes.keyId,
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: eventConfig.eventName || 'HackSeries 2026',
        description: `${formData.ticketType} registration`,
        image: '/dypdpu-logo.png',
        order_id: orderRes.orderId,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: { color: '#a8484b' },
        handler: async (response) => {
          try {
            setIsLoading(true);
            await verifyPayment(response);
          } catch (error) {
            sounds.playError();
            setErrorMsg(error.message || 'Payment verification failed.');
            onShowToast?.({ type: 'error', title: 'Could not verify payment', message: error.message || 'Please contact the event team.' });
          } finally {
            setIsLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            checkoutOpened = false;
            setIsLoading(false);
          },
        },
      });

      checkout.on('payment.failed', (response) => {
        const description = response?.error?.description || 'Payment was not completed. You can try again.';
        setErrorMsg(description);
        checkoutOpened = false;
        setIsLoading(false);
      });
      checkout.open();
      checkoutOpened = true;
    } catch (error) {
      sounds.playError();
      setErrorMsg(error.message || 'Registration failed. Please try again.');
      onShowToast?.({ type: 'error', title: 'Registration failed', message: error.message || 'Please try again.' });
    } finally {
      if (!checkoutOpened) setIsLoading(false);
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
          <img src="/dypdpu-logo.png" alt="Dr. D. Y. Patil Vidyapeeth" />
          <span />
          <div><strong>ACES</strong><small>DIT Pune</small></div>
        </div>
        <div className="registration-secure"><ShieldCheck size={15} /> Secure registration</div>
      </header>

      <main className="registration-shell">
        <div className="registration-intro">
          <div className="registration-eyebrow"><Sparkles size={14} /> {eventConfig.eventName || 'HackSeries 2026'}</div>
          <h1>Your next big idea<br /><span>starts here.</span></h1>
          <p>Save your place at the 48-hour student hackathon. Choose a pass, tell us a little about yourself, and you’re all set.</p>
          <div className="registration-event-meta">
            <span><Ticket size={15} /> {eventConfig.eventDate || DEFAULT_CONFIG.eventDate}</span>
            <span><MapPin size={15} /> DIT Pune</span>
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
          <div className="registration-error" role="alert">
            <X size={17} /> <span>{errorMsg}</span>
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
                <p className="registration-section-note">Choose the pass that fits how you’ll join HackSeries.</p>

                <div className="registration-ticket-grid">
                  {ticketOptions.map((tier) => {
                    const isSelected = formData.ticketType === tier.type;
                    const price = paymentEnabled ? tier.price : 0;
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
            <div className="registration-summary-event">{eventConfig.eventName || 'HackSeries 2026'}</div>
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

        <div className="registration-footer-note"><Lock size={13} /> Your registration details stay with the HackSeries event team.</div>
      </main>
    </div>
  );
};
