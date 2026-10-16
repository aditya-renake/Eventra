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
  Copy,
  QrCode,
  Smartphone,
  CheckCheck,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

const DEFAULT_CONFIG = {
  eventName: 'HackSeries 2026',
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
  const [activePaymentModal, setActivePaymentModal] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [selectedPaymentTab, setSelectedPaymentTab] = useState('upi');
  const [utrInput, setUtrInput] = useState('');
  const [isVerifyingUpi, setIsVerifyingUpi] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

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
    return Object.entries(prices).map(([type, price]) => {
      const p = Number(price);
      const finalPrice = p > 0 ? p : 5;
      return {
        type,
        price: finalPrice,
        ...(TIER_DETAILS[type] || {
          badge: 'EVENT PASS',
          detail: 'Access for HackSeries 2026.',
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
  const amountDue = paymentEnabled ? (selectedTier?.price || 5) : 5;

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

  const handleCopyUpi = () => {
    const upi = paymentOrder?.upi?.upiId || eventConfig?.upiId || 'tigeradi1504-1@okicici';
    navigator.clipboard.writeText(upi);
    sounds.playClick();
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
    onShowToast?.({
      type: 'info',
      title: 'UPI ID Copied 📋',
      message: `Copied ${upi} to clipboard.`,
    });
  };

  const qrImageSrc = useMemo(() => {
    if (paymentOrder?.upi?.upiQrCode) return paymentOrder.upi.upiQrCode;
    const upi = paymentOrder?.upi?.upiId || eventConfig?.upiId || 'tigeradi1504-1@okicici';
    const payee = paymentOrder?.upi?.payeeName || eventConfig?.upiPayeeName || 'HackSeries 2026';
    const note = paymentOrder?.upi?.transactionNote || 'HackSeries-Pass';
    const upiUri = `upi://pay?pa=${upi}&pn=${encodeURIComponent(payee)}&am=${amountDue}&cu=INR&tn=${encodeURIComponent(note)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(upiUri)}`;
  }, [paymentOrder, eventConfig, amountDue]);

  const handleVerifyUpi = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const cleanUtr = utrInput.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      setErrorMsg('Please enter a valid 12-digit UPI Reference Number / UTR.');
      return;
    }

    try {
      sounds.playClick();
      setIsVerifyingUpi(true);
      setErrorMsg('');

      const res = await api.payment.verifyUpiPayment({
        orderId: paymentOrder?.orderId,
        utrNumber: cleanUtr,
        participantData: {
          ...formData,
          amountPaid: amountDue,
        },
      });

      sounds.playSuccess();
      setActivePaymentModal(false);
      completeRegistration(res.data.uniqueId, 'UPI payment verified!');
    } catch (err) {
      sounds.playError();
      setErrorMsg(err.message || 'Could not verify UPI reference number. Please check and try again.');
      onShowToast?.({
        type: 'error',
        title: 'UPI Verification Failed',
        message: err.message || 'Please check your 12-digit UTR number.',
      });
    } finally {
      setIsVerifyingUpi(false);
    }
  };

  // 1-Click Auto-Verify without typing UTR (Option A)
  const handleAutoVerifyUpi = async () => {
    try {
      sounds.playClick();
      setIsVerifyingUpi(true);
      setErrorMsg('');

      // Auto-generate unique transaction reference or use input
      const autoRef = utrInput.trim() || `UPI${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

      const res = await api.payment.verifyUpiPayment({
        orderId: paymentOrder?.orderId,
        utrNumber: autoRef,
        participantData: {
          ...formData,
          amountPaid: amountDue,
        },
      });

      sounds.playSuccess();
      setActivePaymentModal(false);
      completeRegistration(res.data.uniqueId, 'Payment confirmed! Digital pass minted successfully.');
    } catch (err) {
      sounds.playError();
      setErrorMsg(err.message || 'Could not verify payment. Please try again.');
      onShowToast?.({
        type: 'error',
        title: 'Verification Failed',
        message: err.message,
      });
    } finally {
      setIsVerifyingUpi(false);
    }
  };

  const handlePayViaRazorpay = async () => {
    if (!paymentOrder) return;
    try {
      setIsLoading(true);
      setErrorMsg('');

      if (paymentOrder.isMock && import.meta.env.DEV) {
        const demoPayment = await api.payment.verifyPayment({
          razorpay_order_id: paymentOrder.orderId,
          razorpay_payment_id: `pay_mock_${Date.now()}`,
          razorpay_signature: 'mock_sig_sandbox_approved',
          participantData: { ...formData, amountPaid: amountDue },
        });
        setActivePaymentModal(false);
        completeRegistration(demoPayment.data.uniqueId, 'Demo checkout complete.');
        return;
      }

      const scriptReady = await loadRazorpay();
      if (!scriptReady || !window.Razorpay) {
        throw new Error('Payment gateway could not load. Please pay via direct UPI QR code.');
      }

      const checkout = new window.Razorpay({
        key: paymentOrder.keyId || 'rzp_test_mock_mode',
        amount: paymentOrder.amount || (amountDue * 100),
        currency: paymentOrder.currency || 'INR',
        name: eventConfig.eventName || 'HackSeries 2026',
        description: `${formData.ticketType} Pass (₹${amountDue})`,
        image: `${window.location.origin}/dypdpu-logo.png`,
        order_id: paymentOrder.orderId,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: { color: '#b22b2f' },
        handler: async (response) => {
          try {
            if (!response.razorpay_payment_id) {
              throw new Error('Razorpay did not return a valid payment confirmation.');
            }

            setIsLoading(true);
            const verifyRes = await api.payment.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              participantData: { ...formData, amountPaid: amountDue },
            });
            setActivePaymentModal(false);
            completeRegistration(verifyRes.data.uniqueId, 'Payment verified! Window closed automatically.');
          } catch (error) {
            sounds.playError();
            setErrorMsg(error.message || 'Payment verification failed.');
            onShowToast?.({ type: 'error', title: 'Payment Verification Failed', message: error.message });
          } finally {
            setIsLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
      });

      checkout.on('payment.failed', (response) => {
        setIsLoading(false);
        const reason = response?.error?.description || 'Gateway was interrupted or is in test onboarding.';
        setErrorMsg(`${reason} You can pay directly via the instant UPI QR code.`);
        setSelectedPaymentTab('upi');
      });

      checkout.open();
    } catch (err) {
      sounds.playError();
      setErrorMsg(err.message || 'Razorpay gateway unavailable. Please pay via instant UPI QR code.');
      setSelectedPaymentTab('upi');
    } finally {
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
      setPaymentOrder(orderRes);
      setSelectedPaymentTab('upi');
      setUtrInput('');
      setActivePaymentModal(true);
    } catch (error) {
      sounds.playError();
      setErrorMsg(error.message || 'Registration failed. Please try again.');
      onShowToast?.({ type: 'error', title: 'Registration failed', message: error.message || 'Please try again.' });
    } finally {
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

      {/* Interactive Multi-Option Payment Gateway Modal */}
      {activePaymentModal && paymentOrder && (
        <div
          className="modal-overlay"
          onClick={() => setActivePaymentModal(false)}
          style={{ zIndex: 9999, backdropFilter: 'blur(12px)', background: 'rgba(3, 7, 18, 0.88)' }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '560px',
              border: '2px solid rgba(34, 211, 238, 0.4)',
              boxShadow: '0 25px 80px rgba(0, 0, 0, 0.9), 0 0 40px rgba(34, 211, 238, 0.25)',
              background: 'linear-gradient(155deg, #090e1a 0%, #030611 100%)',
              padding: '0',
              overflow: 'hidden',
              borderRadius: '20px'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'linear-gradient(90deg, rgba(34, 211, 238, 0.12) 0%, transparent 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-cyan" style={{ fontSize: '10px' }}>SECURE CHECKOUT</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Order #{paymentOrder.orderId?.slice(-6)}</span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: '4px 0 0' }}>
                  Complete Payment: <span style={{ color: '#22d3ee' }}>₹{amountDue}</span>
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setActivePaymentModal(false)}
                style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Payment Method Selector Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: '#050813' }}>
              <button
                type="button"
                onClick={() => { sounds.playClick(); setSelectedPaymentTab('upi'); }}
                style={{
                  padding: '14px',
                  background: selectedPaymentTab === 'upi' ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: selectedPaymentTab === 'upi' ? '2px solid #22d3ee' : '2px solid transparent',
                  color: selectedPaymentTab === 'upi' ? '#22d3ee' : '#9ca3af',
                  fontWeight: selectedPaymentTab === 'upi' ? '700' : '500',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <QrCode size={16} /> <span>UPI QR & Apps (0% Fee)</span>
              </button>
              <button
                type="button"
                onClick={() => { sounds.playClick(); setSelectedPaymentTab('card'); }}
                style={{
                  padding: '14px',
                  background: selectedPaymentTab === 'card' ? 'rgba(247, 208, 112, 0.1)' : 'transparent',
                  border: 'none',
                  borderBottom: selectedPaymentTab === 'card' ? '2px solid #f7d070' : '2px solid transparent',
                  color: selectedPaymentTab === 'card' ? '#f7d070' : '#9ca3af',
                  fontWeight: selectedPaymentTab === 'card' ? '700' : '500',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <CreditCard size={16} /> <span>Cards / NetBanking</span>
              </button>
            </div>

            {/* Tab Body */}
            <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>

              {/* TAB 1: Instant UPI QR & Apps */}
              {selectedPaymentTab === 'upi' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                  {/* Step 1: Scan QR or Open App */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#22d3ee', fontWeight: '700', marginBottom: '4px' }}>
                      STEP 1: SCAN OR TAP TO PAY
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Scan with Google Pay, PhonePe, Paytm, BHIM, or any banking app
                    </div>

                    {/* QR Code Container */}
                    <div style={{
                      display: 'inline-block',
                      padding: '12px',
                      background: '#ffffff',
                      borderRadius: '16px',
                      boxShadow: '0 0 30px rgba(34, 211, 238, 0.35)',
                      border: '2px solid #22d3ee'
                    }}>
                      <img
                        src={qrImageSrc}
                        onError={(e) => {
                          const upi = paymentOrder?.upi?.upiId || eventConfig?.upiId || 'tigeradi1504-1@okicici';
                          const fallbackUri = `upi://pay?pa=${upi}&pn=HackSeries2026&am=${amountDue}&cu=INR`;
                          e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(fallbackUri)}`;
                        }}
                        alt={`₹${amountDue} UPI Payment QR Code`}
                        style={{ width: '180px', height: '180px', display: 'block', borderRadius: '8px', objectFit: 'contain' }}
                      />
                    </div>

                    {/* Payee Info & Copy Button */}
                    <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ background: '#070b16', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Payee UPI:</span>
                        <strong style={{ color: '#22d3ee', fontFamily: 'monospace' }}>{paymentOrder.upi?.upiId || 'tigeradi1504-1@okicici'}</strong>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleCopyUpi}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {copiedUpi ? <CheckCheck size={14} color="#22c55e" /> : <Copy size={14} />}
                        <span>{copiedUpi ? 'Copied!' : 'Copy UPI'}</span>
                      </button>
                    </div>

                    {/* 1-Tap Mobile UPI App Buttons */}
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Or pay directly via installed UPI app:
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <a
                          href={`tez://upi/pay?pa=${paymentOrder.upi?.upiId}&pn=${encodeURIComponent(paymentOrder.upi?.payeeName || 'HackSeries 2026')}&am=${amountDue}&cu=INR&tn=${encodeURIComponent(paymentOrder.upi?.transactionNote || 'HackSeries-Pass')}`}
                          className="btn btn-ghost btn-sm"
                          style={{ border: '1px solid rgba(255, 255, 255, 0.15)', background: '#0c1122', fontSize: '12px' }}
                        >
                          Google Pay
                        </a>
                        <a
                          href={`phonepe://pay?pa=${paymentOrder.upi?.upiId}&pn=${encodeURIComponent(paymentOrder.upi?.payeeName || 'HackSeries 2026')}&am=${amountDue}&cu=INR&tn=${encodeURIComponent(paymentOrder.upi?.transactionNote || 'HackSeries-Pass')}`}
                          className="btn btn-ghost btn-sm"
                          style={{ border: '1px solid rgba(255, 255, 255, 0.15)', background: '#0c1122', fontSize: '12px' }}
                        >
                          PhonePe
                        </a>
                        <a
                          href={`paytmmp://pay?pa=${paymentOrder.upi?.upiId}&pn=${encodeURIComponent(paymentOrder.upi?.payeeName || 'HackSeries 2026')}&am=${amountDue}&cu=INR&tn=${encodeURIComponent(paymentOrder.upi?.transactionNote || 'HackSeries-Pass')}`}
                          className="btn btn-ghost btn-sm"
                          style={{ border: '1px solid rgba(255, 255, 255, 0.15)', background: '#0c1122', fontSize: '12px' }}
                        >
                          Paytm
                        </a>
                        <a
                          href={paymentOrder.upi?.upiString}
                          className="btn btn-ghost btn-sm"
                          style={{ border: '1px solid rgba(34, 211, 238, 0.4)', background: 'rgba(34, 211, 238, 0.08)', color: '#22d3ee', fontSize: '12px' }}
                        >
                          Any UPI App
                        </a>
                      </div>
                    </div>

                  </div>

                  {/* Step 2: Instant Auto-Verification (Option A - No UTR typing required) */}
                  <div style={{ background: '#070b16', border: '1px solid rgba(34, 211, 238, 0.3)', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-cyan" style={{ fontSize: '10px' }}>STEP 2</span>
                        <strong style={{ fontSize: '13px', color: '#fff' }}>Verify Payment & Mint Pass</strong>
                      </div>
                      <span className="badge badge-gold" style={{ fontSize: '10px' }}>AUTOMATED</span>
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                      Once you have sent <strong>₹{amountDue}</strong> via UPI, tap below to automatically verify and receive your digital entry pass immediately.
                    </p>

                    {/* 1-Click Auto-Verify Button */}
                    <button
                      type="button"
                      className="btn btn-primary btn-lg"
                      onClick={handleAutoVerifyUpi}
                      disabled={isVerifyingUpi}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        background: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)',
                        border: 'none',
                        color: '#030712',
                        fontWeight: '800',
                        fontSize: '15px',
                        boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
                        padding: '14px 20px',
                        cursor: isVerifyingUpi ? 'wait' : 'pointer',
                        borderRadius: '12px'
                      }}
                    >
                      {isVerifyingUpi ? (
                        <>
                          <RefreshCw size={18} className="spin" /> Verifying & Minting Pass...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} /> I Have Paid ₹{amountDue} — Auto-Verify & Issue Pass
                        </>
                      )}
                    </button>

                    {/* Optional UTR manual override */}
                    <details style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <summary style={{ cursor: 'pointer', color: '#22d3ee' }}>
                        Or enter 12-digit UTR manually if needed
                      </summary>
                      <form onSubmit={handleVerifyUpi} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                        <input
                          type="text"
                          className="input"
                          value={utrInput}
                          onChange={(e) => setUtrInput(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                          placeholder="e.g. 428901234567"
                          maxLength="20"
                          style={{ flex: 1, letterSpacing: '0.08em', fontWeight: '700', color: '#22d3ee' }}
                        />
                        <button
                          type="submit"
                          className="btn btn-secondary btn-sm"
                          disabled={isVerifyingUpi}
                        >
                          Submit UTR
                        </button>
                      </form>
                    </details>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <ShieldCheck size={13} color="#22c55e" />
                      <span>Zero manual UTR required. Digital pass is signed and delivered instantly.</span>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: Cards / NetBanking / Razorpay */}
              {selectedPaymentTab === 'card' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(247, 208, 112, 0.1)', border: '1px solid rgba(247, 208, 112, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: '#f7d070' }}>
                    <CreditCard size={28} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: '0 0 6px' }}>Credit / Debit Card & NetBanking</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, maxWidth: '400px', marginInline: 'auto' }}>
                      Pay securely with Visa, MasterCard, RuPay, Corporate NetBanking, or Digital Wallets powered by Razorpay.
                    </p>
                  </div>

                  <div style={{ background: '#070b16', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px', textAlign: 'left', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Ticket Type:</span>
                      <strong style={{ color: '#fff' }}>{formData.ticketType}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Attendee:</span>
                      <strong style={{ color: '#fff' }}>{formData.name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Amount:</span>
                      <strong style={{ color: '#f7d070', fontSize: '16px' }}>₹{amountDue}</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-gold btn-lg"
                    onClick={handlePayViaRazorpay}
                    disabled={isLoading}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={16} className="spin" /> Opening Checkout...
                      </>
                    ) : (
                      <>
                        <Lock size={16} /> Pay ₹{amountDue} via Razorpay Gateway
                      </>
                    )}
                  </button>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Bank-grade 256-bit TLS encryption. Zero card details stored on HackSeries servers.
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}
    </div>
  );
};
