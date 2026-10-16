import React, { useState, useEffect } from 'react';
import { 
  X, 
  Crown, 
  ShieldAlert, 
  Radio, 
  UserPlus, 
  Download, 
  Cpu, 
  Check, 
  Save, 
  Zap, 
  Sparkles,
  Server,
  Lock,
  Mail,
  RefreshCw,
  Database,
  Activity,
  HardDrive,
  Users,
  CreditCard,
  RotateCcw,
  Search,
  Calendar,
  MapPin,
  Clock,
  Key,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

const COMMAND_TABS = [
  { id: 'telemetry', label: 'Telemetry', description: 'Database activity and system capacity', icon: Activity, keywords: 'database live metrics health' },
  { id: 'intake', label: 'Event & Payments', description: 'Edit all event details, schedule, venue, ticket prices, and payment gateway', icon: Sparkles, keywords: 'event details name dates venue intake payment form tickets upi razorpay pricing' },
  { id: 'broadcast', label: 'Pass broadcast', description: 'Publish an announcement on attendee passes', icon: Radio, keywords: 'announcement message notice' },
  { id: 'vip', label: 'Issue a VIP pass', description: 'Create a pass for a guest, speaker, judge, or mentor', icon: UserPlus, keywords: 'guest speaker judge mentor create' },
  { id: 'backup', label: 'System backup', description: 'Download an attendee and configuration snapshot', icon: Download, keywords: 'export download json data' },
  { id: 'diagnostics', label: 'Security health', description: 'Review service and credential status', icon: Cpu, keywords: 'security diagnostics status' },
];

export const SuperAdminModal = ({ 
  currentUser, 
  eventConfig, 
  onClose, 
  onShowToast, 
  onRefreshData,
  initialTab = 'telemetry'
}) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'telemetry');
  const [commandSearch, setCommandSearch] = useState('');
  const [broadcastText, setBroadcastText] = useState(eventConfig?.broadcastNotice || '');
  const [broadcastActive, setBroadcastActive] = useState(eventConfig?.broadcastActive || false);
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);

  // Event Details State
  const [eventName, setEventName] = useState(eventConfig?.eventName || 'HackSeries 2026');
  const [eventTagline, setEventTagline] = useState(eventConfig?.eventTagline || 'Presented by ACES — Dept. of Computer Engineering, Dr. D. Y. Patil Institute of Technology, Pimpri, Pune (DYPDPU)');
  const [eventDate, setEventDate] = useState(eventConfig?.eventDate || 'October 16 - 18, 2026');
  const [eventTime, setEventTime] = useState(eventConfig?.eventTime || '09:00 AM IST (Gate Check-in starts 07:30 AM)');
  const [eventVenue, setEventVenue] = useState(eventConfig?.eventVenue || 'Dr. D. Y. Patil Institute of Technology (DIT), Sant Tukaram Nagar, Pimpri, Pune - 411018');
  const [organizerName, setOrganizerName] = useState(eventConfig?.organizerName || 'ACES (Association of Computer Engineering Students), DIT Pune');
  const [organizerEmail, setOrganizerEmail] = useState(eventConfig?.organizerEmail || 'tigeradi1504@gmail.com');

  // Registration Mode & Payment Gateway State
  const [regMode, setRegMode] = useState(eventConfig?.registrationMode || 'native_payment');
  const [enablePayments, setEnablePayments] = useState(eventConfig?.enablePaymentGateway !== false);
  const [googleFormLink, setGoogleFormLink] = useState(eventConfig?.googleFormUrl || 'https://forms.gle/TmoSjzxUt7yAKz1o6');
  const [hackerPrice, setHackerPrice] = useState(eventConfig?.ticketPrices?.['Hacker Pass'] ?? 5);
  const [studentPrice, setStudentPrice] = useState(eventConfig?.ticketPrices?.['Student Pass'] ?? 5);
  const [vipPrice, setVipPrice] = useState(eventConfig?.ticketPrices?.['VIP Delegate'] ?? 5);
  const [judgePrice, setJudgePrice] = useState(eventConfig?.ticketPrices?.['Judge / Mentor'] ?? 5);
  const [upiId, setUpiId] = useState(eventConfig?.upiId || 'tigeradi1504-1@okicici');
  const [upiPayeeName, setUpiPayeeName] = useState(eventConfig?.upiPayeeName || 'HackSeries 2026');
  const [razorpayKeyId, setRazorpayKeyId] = useState(eventConfig?.razorpayKeyId || '');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState(eventConfig?.razorpayKeySecret || '');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);

  // Sync state if eventConfig updates
  useEffect(() => {
    if (eventConfig) {
      if (eventConfig.eventName) setEventName(eventConfig.eventName);
      if (eventConfig.eventTagline) setEventTagline(eventConfig.eventTagline);
      if (eventConfig.eventDate) setEventDate(eventConfig.eventDate);
      if (eventConfig.eventTime) setEventTime(eventConfig.eventTime);
      if (eventConfig.eventVenue) setEventVenue(eventConfig.eventVenue);
      if (eventConfig.organizerName) setOrganizerName(eventConfig.organizerName);
      if (eventConfig.organizerEmail) setOrganizerEmail(eventConfig.organizerEmail);
      if (eventConfig.registrationMode) setRegMode(eventConfig.registrationMode);
      if (eventConfig.enablePaymentGateway !== undefined) setEnablePayments(eventConfig.enablePaymentGateway);
      if (eventConfig.googleFormUrl) setGoogleFormLink(eventConfig.googleFormUrl);
      if (eventConfig.ticketPrices) {
        if (eventConfig.ticketPrices['Hacker Pass'] !== undefined) setHackerPrice(eventConfig.ticketPrices['Hacker Pass']);
        if (eventConfig.ticketPrices['Student Pass'] !== undefined) setStudentPrice(eventConfig.ticketPrices['Student Pass']);
        if (eventConfig.ticketPrices['VIP Delegate'] !== undefined) setVipPrice(eventConfig.ticketPrices['VIP Delegate']);
        if (eventConfig.ticketPrices['Judge / Mentor'] !== undefined) setJudgePrice(eventConfig.ticketPrices['Judge / Mentor']);
      }
      if (eventConfig.upiId) setUpiId(eventConfig.upiId);
      if (eventConfig.upiPayeeName) setUpiPayeeName(eventConfig.upiPayeeName);
      if (eventConfig.razorpayKeyId !== undefined) setRazorpayKeyId(eventConfig.razorpayKeyId);
      if (eventConfig.razorpayKeySecret !== undefined) setRazorpayKeySecret(eventConfig.razorpayKeySecret);
      if (eventConfig.broadcastNotice !== undefined) setBroadcastText(eventConfig.broadcastNotice);
      if (eventConfig.broadcastActive !== undefined) setBroadcastActive(eventConfig.broadcastActive);
    }
  }, [eventConfig]);

  // Database Telemetry State
  const [telemetry, setTelemetry] = useState(null);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);

  // VIP Pass Generator state
  const [vipName, setVipName] = useState('');
  const [vipEmail, setVipEmail] = useState('');
  const [vipRole, setVipRole] = useState('VIP Guest');
  const [vipTeam, setVipTeam] = useState('Special Invitee');
  const [vipTrack, setVipTrack] = useState('AI & Web3 Innovation');
  const [isGeneratingVip, setIsGeneratingVip] = useState(false);
  const [generatedVipPass, setGeneratedVipPass] = useState(null);

  const filteredCommandTabs = COMMAND_TABS.filter((tab) =>
    `${tab.label} ${tab.description} ${tab.keywords}`.toLowerCase().includes(commandSearch.trim().toLowerCase())
  );
  const activeCommandTab = filteredCommandTabs.find((tab) => tab.id === activeTab);

  const handleSelectTab = (tabId) => {
    sounds.playClick();
    setActiveTab(tabId);
    if (tabId === 'telemetry') fetchTelemetry();
  };

  const handleCommandSearch = (value) => {
    setCommandSearch(value);
    const query = value.trim().toLowerCase();
    if (!query) return;
    const firstMatch = COMMAND_TABS.find((tab) =>
      `${tab.label} ${tab.description} ${tab.keywords}`.toLowerCase().includes(query)
    );
    if (firstMatch) setActiveTab(firstMatch.id);
  };

  const handleTabKeyDown = (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll('[role="tab"]'));
    if (!buttons.length) return;
    event.preventDefault();
    const currentIndex = buttons.indexOf(document.activeElement);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[nextIndex].focus();
    buttons[nextIndex].click();
  };

  // Fetch Live Database Telemetry
  const fetchTelemetry = async () => {
    try {
      setIsLoadingTelemetry(true);
      const res = await api.event.getDatabaseTelemetry();
      if (res?.data) {
        setTelemetry(res.data);
      }
    } catch (err) {
      console.warn('Could not load telemetry:', err.message);
    } finally {
      setIsLoadingTelemetry(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, []);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  // 1. Save Broadcast Notice to All Digital Passes
  const handleSaveBroadcast = async (e) => {
    e.preventDefault();
    try {
      setIsSavingBroadcast(true);
      await api.event.updateConfig({
        broadcastNotice: broadcastText,
        broadcastActive: broadcastActive,
      });
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'Broadcast Synchronized 📡',
        message: broadcastActive
          ? 'Urgent announcement is now live across all attendee digital passes!'
          : 'Live pass broadcast has been deactivated.',
      });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Broadcast Error',
        message: err.message,
      });
    } finally {
      setIsSavingBroadcast(false);
    }
  };

  // 1b. Save All Event Details, Registration Mode & Payment Gateway Configuration
  const handleSaveRegistrationSettings = async (e) => {
    e.preventDefault();
    try {
      setIsSavingConfig(true);
      await api.event.updateConfig({
        // Event Branding & Logistics
        eventName: eventName ? eventName.trim() : 'HackSeries 2026',
        eventTagline: eventTagline ? eventTagline.trim() : '',
        eventDate: eventDate ? eventDate.trim() : 'October 16 - 18, 2026',
        eventTime: eventTime ? eventTime.trim() : '09:00 AM IST',
        eventVenue: eventVenue ? eventVenue.trim() : '',
        organizerName: organizerName ? organizerName.trim() : '',
        organizerEmail: organizerEmail ? organizerEmail.trim() : '',

        // Registration Mode & Fallback
        registrationMode: regMode,
        enablePaymentGateway: enablePayments,
        googleFormUrl: googleFormLink ? googleFormLink.trim() : '',

        // Payment Gateway & Direct UPI Details
        upiId: upiId ? upiId.trim() : 'tigeradi1504-1@okicici',
        upiPayeeName: upiPayeeName ? upiPayeeName.trim() : 'HackSeries 2026',
        razorpayKeyId: razorpayKeyId ? razorpayKeyId.trim() : '',
        razorpayKeySecret: razorpayKeySecret ? razorpayKeySecret.trim() : '',

        // Ticket Pricing
        ticketPrices: {
          'Hacker Pass': Number(hackerPrice) >= 0 ? Number(hackerPrice) : 5,
          'Student Pass': Number(studentPrice) >= 0 ? Number(studentPrice) : 5,
          'VIP Delegate': Number(vipPrice) >= 0 ? Number(vipPrice) : 5,
          'Judge / Mentor': Number(judgePrice) >= 0 ? Number(judgePrice) : 5,
        },
      });
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'Event & Payment Config Synchronized ⚙️',
        message: 'All event details and payment settings have been saved and applied across the portal!',
      });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Settings Update Failed',
        message: err.message,
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // 2. Generate Instant VIP / Judge Pass
  const handleGenerateVip = async (e) => {
    e.preventDefault();
    if (!vipName || !vipEmail) return;

    try {
      setIsGeneratingVip(true);
      const res = await api.registrants.create({
        name: vipName,
        email: vipEmail,
        ticketType: vipRole,
        teamName: vipTeam,
        track: vipTrack,
        institution: 'Dr. D. Y. Patil Institute of Technology (DYPDPU)',
      });

      sounds.playSuccess();
      setGeneratedVipPass(res.data);
      onShowToast({
        type: 'success',
        title: 'VIP Pass Generated! 👑',
        message: `Cryptographically signed entry pass created for ${vipName} (${res.data.uniqueId})`,
      });
      if (onRefreshData) onRefreshData();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Generation Failed',
        message: err.message,
      });
    } finally {
      setIsGeneratingVip(false);
    }
  };

  // 3. Export Full System Backup JSON
  const handleFullBackup = async () => {
    try {
      sounds.playClick();
      const allData = await api.registrants.list({ limit: 5000 });
      const backupObj = {
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser?.name || 'Aditya Renake',
        leadOperations: 'Aditya Renake',
        stats: allData.stats,
        totalItems: allData.data?.length || 0,
        registrants: allData.data || [],
        config: eventConfig,
      };

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `HackSeries2026_Full_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      onShowToast({
        type: 'success',
        title: 'Backup Downloaded 💾',
        message: 'Full system snapshot downloaded securely to your local machine.',
      });
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Backup Failed',
        message: err.message,
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content command-center-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-center-title"
      >
        
        {/* Modal Header */}
        <div className="command-center-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#030712', boxShadow: '0 0 14px rgba(34, 197, 94, 0.4)' }}>
              <Zap size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span id="command-center-title" className="command-center-title">Operations Command Center</span>
                <span className="badge badge-cyan" style={{ fontSize: '10px' }}>ADMIN TOOLS</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Active Operator: <strong style={{ color: '#22d3ee' }}>{currentUser?.name || 'Operations Admin'}</strong>
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close command center" title="Close (Esc)">
            <X size={18} />
          </button>
        </div>

        <div className="command-center-toolbar">
          <label className="command-center-search-wrap" htmlFor="command-center-search">
            <Search size={16} aria-hidden="true" />
            <input
              id="command-center-search"
              className="command-center-search"
              type="search"
              value={commandSearch}
              onChange={(event) => handleCommandSearch(event.target.value)}
              placeholder="Find a tool or setting…"
              autoFocus
            />
            <kbd>⌘K</kbd>
          </label>
          <span className="command-center-count" aria-live="polite">
            {filteredCommandTabs.length} {filteredCommandTabs.length === 1 ? 'tool' : 'tools'}
          </span>
        </div>

        <div className="command-center-tabs" role="tablist" aria-label="Command center tools" onKeyDown={handleTabKeyDown}>
          {filteredCommandTabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`command-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="command-center-panel"
                tabIndex={isActive ? 0 : -1}
                className={`command-center-tab ${isActive ? 'is-active' : ''}`}
                title={tab.description}
                onClick={() => handleSelectTab(tab.id)}
              >
                <TabIcon size={15} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div
          id="command-center-panel"
          className="command-center-panel"
          role="tabpanel"
          aria-labelledby={activeCommandTab ? `command-tab-${activeTab}` : undefined}
          tabIndex={0}
        >
          {filteredCommandTabs.length === 0 ? (
            <div className="command-center-empty">
              <Search size={22} />
              <strong>No tools match “{commandSearch}”</strong>
              <span>Try “payment”, “broadcast”, “backup”, or “security”.</span>
            </div>
          ) : (
            <>

          {/* TAB 0: Live Database Telemetry */}
          {activeTab === 'telemetry' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Telemetry Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-emerald" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                    {telemetry?.status || 'ONLINE & HEALTHY'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Google Cloud Project: <strong style={{ color: '#fff' }}>{telemetry?.projectId || 'hackseries-2026'}</strong>
                  </span>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    sounds.playClick();
                    fetchTelemetry();
                    onShowToast({
                      type: 'info',
                      title: 'Telemetry Refreshed 🔄',
                      message: `Ping latency: ${telemetry?.pingMs || 25}ms`,
                    });
                  }}
                  disabled={isLoadingTelemetry}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <RefreshCw size={13} className={isLoadingTelemetry ? 'spin' : ''} />
                  <span>Refresh Telemetry</span>
                </button>
              </div>

              {/* Storage Capacity Gauge Card */}
              <div style={{ background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(34, 197, 94, 0.08) 100%)', border: '1px solid rgba(34, 211, 238, 0.3)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#22d3ee', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <HardDrive size={14} /> Storage Consumed vs Free Quota
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#fff', marginTop: '4px' }}>
                      {telemetry?.totalKB || '27.21'} KB <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>/ 1,024 MB (1.00 GB Free Tier)</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Free Capacity</div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#22c55e' }}>
                      {telemetry?.freeCapacityPercent || '99.997'}%
                    </div>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${Math.max(parseFloat(100 - (telemetry?.freeCapacityPercent || 99.99)), 1)}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #22c55e 0%, #22d3ee 100%)',
                      boxShadow: '0 0 10px #22c55e'
                    }} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  <span>⚡ Latency: <strong style={{ color: '#22d3ee' }}>{telemetry?.pingMs || '24'} ms</strong></span>
                  <span>Room for <strong style={{ color: '#4ade80' }}>{telemetry?.approxRemainingAttendeesCapacity?.toLocaleString() || '190,000+'} more attendees</strong></span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#090d18', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Registrants</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#fff', marginTop: '2px' }}>{telemetry?.totalRegistrants ?? '—'}</div>
                  <div style={{ fontSize: '11px', color: '#22d3ee', marginTop: '2px' }}>Live in Firestore</div>
                </div>

                <div style={{ background: '#090d18', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gate Checked In</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#22c55e', marginTop: '2px' }}>{telemetry?.checkedInCount ?? '—'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{telemetry?.pendingCheckin ?? 0} Pending</div>
                </div>

                <div style={{ background: '#090d18', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Passes Emailed</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#f7d070', marginTop: '2px' }}>{telemetry?.emailSentCount ?? '—'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{telemetry?.pendingEmailDispatch ?? 0} Pending</div>
                </div>

                <div style={{ background: '#090d18', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Admin Accounts</div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: '#a78bfa', marginTop: '2px' }}>{telemetry?.staffCount ?? '3'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Authorized Staff</div>
                </div>
              </div>

              {/* Active Mailer & Staff Info */}
              <div style={{ background: '#060913', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: '#9ca3af' }}>Active Outgoing Mailer:</span>
                  <strong style={{ color: '#22d3ee' }}>{telemetry?.activeMailer || 'Gmail SMTP (tigeradi1504@gmail.com)'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af' }}>Active Staff Operators:</span>
                  <span style={{ color: '#fff' }}>Aditya Renake (Lead Operations)</span>
                </div>
              </div>

              {/* 1-Click Backup from Telemetry */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-primary btn-sm" onClick={handleFullBackup} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Download size={14} /> Download Full System JSON Backup
                </button>
              </div>

            </div>
          )}

          {/* TAB: Event Details, Intake & Payments */}
          {activeTab === 'intake' && (
            <form onSubmit={handleSaveRegistrationSettings} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Info Banner */}
              <div style={{ background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.09) 0%, rgba(247, 208, 112, 0.08) 100%)', border: '1px solid rgba(34, 211, 238, 0.25)', borderRadius: '12px', padding: '16px', fontSize: '13px', color: '#67e8f9' }}>
                <div style={{ fontWeight: '800', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Sparkles size={16} color="#22d3ee" /> 
                  Event Command Center — Customize Details & Payment Gateways
                </div>
                You have full operational control over <strong>all event details</strong> (name, schedule, campus venue, organizer contacts) as well as the <strong>participant intake mode</strong> and <strong>payment gateway credentials</strong>. Changes synchronize immediately across the entire site and digital passes.
              </div>

              {/* 1. EVENT DETAILS & BRANDING */}
              <div style={{ background: '#070a13', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
                  <Calendar size={16} color="#22d3ee" />
                  <strong style={{ color: '#fff', fontSize: '14px' }}>1. Event Details, Schedule & Venue</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                      Event Name
                    </label>
                    <input 
                      type="text" 
                      className="input" 
                      value={eventName} 
                      onChange={(e) => setEventName(e.target.value)} 
                      placeholder="HackSeries 2026"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                      Organizer Organization / Department
                    </label>
                    <input 
                      type="text" 
                      className="input" 
                      value={organizerName} 
                      onChange={(e) => setOrganizerName(e.target.value)} 
                      placeholder="ACES (Association of Computer Engineering Students)"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                      Event Dates
                    </label>
                    <input 
                      type="text" 
                      className="input" 
                      value={eventDate} 
                      onChange={(e) => setEventDate(e.target.value)} 
                      placeholder="October 16 - 18, 2026"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                      Event Time & Gate Schedule
                    </label>
                    <input 
                      type="text" 
                      className="input" 
                      value={eventTime} 
                      onChange={(e) => setEventTime(e.target.value)} 
                      placeholder="09:00 AM IST (Gate Check-in starts 07:30 AM)"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                      Campus Venue & Address
                    </label>
                    <input 
                      type="text" 
                      className="input" 
                      value={eventVenue} 
                      onChange={(e) => setEventVenue(e.target.value)} 
                      placeholder="Dr. D. Y. Patil Institute of Technology (DIT), Sant Tukaram Nagar, Pimpri, Pune - 411018"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                      Event Tagline / Subtitle
                    </label>
                    <input 
                      type="text" 
                      className="input" 
                      value={eventTagline} 
                      onChange={(e) => setEventTagline(e.target.value)} 
                      placeholder="Presented by ACES — Dept. of Computer Engineering, Dr. D. Y. Patil Institute of Technology, Pimpri, Pune (DYPDPU)"
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                      Organizer Contact & Notification Email
                    </label>
                    <input 
                      type="email" 
                      className="input" 
                      value={organizerEmail} 
                      onChange={(e) => setOrganizerEmail(e.target.value)} 
                      placeholder="tigeradi1504@gmail.com"
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. PARTICIPANT INTAKE MODE */}
              <div style={{ background: '#070a13', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
                  <RotateCcw size={16} color="#f7d070" />
                  <strong style={{ color: '#fff', fontSize: '14px' }}>2. Participant Intake Mode & 1-Click Revert System</strong>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  
                  {/* Option: Native In-App + Razorpay */}
                  <div 
                    onClick={() => { sounds.playClick(); setRegMode('native_payment'); }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: `2px solid ${regMode === 'native_payment' ? '#f7d070' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: regMode === 'native_payment' ? 'rgba(247, 208, 112, 0.08)' : '#070a13',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CreditCard size={16} color={regMode === 'native_payment' ? '#f7d070' : '#9ca3af'} />
                        <strong style={{ color: regMode === 'native_payment' ? '#fff' : '#9ca3af', fontSize: '14px' }}>
                          Native In-App + Razorpay (Active)
                        </strong>
                      </div>
                      <input 
                        type="radio" 
                        name="registrationMode" 
                        checked={regMode === 'native_payment'} 
                        onChange={() => setRegMode('native_payment')} 
                      />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                      Direct on-site registration modal at <code>/#register</code>. Supports UPI, NetBanking, Cards with Razorpay. Instantly issues cryptographically signed passes.
                    </p>
                    {regMode === 'native_payment' && (
                      <div style={{ marginTop: '10px', display: 'inline-block' }}>
                        <span className="badge badge-gold" style={{ fontSize: '10px' }}>RECOMMENDED</span>
                      </div>
                    )}
                  </div>

                  {/* Option: Classic Google Form */}
                  <div 
                    onClick={() => { sounds.playClick(); setRegMode('google_form'); }}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: `2px solid ${regMode === 'google_form' ? '#22d3ee' : 'rgba(255, 255, 255, 0.1)'}`,
                      background: regMode === 'google_form' ? 'rgba(34, 211, 238, 0.08)' : '#070a13',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RotateCcw size={16} color={regMode === 'google_form' ? '#22d3ee' : '#9ca3af'} />
                        <strong style={{ color: regMode === 'google_form' ? '#fff' : '#9ca3af', fontSize: '14px' }}>
                          Classic Google Form (Original)
                        </strong>
                      </div>
                      <input 
                        type="radio" 
                        name="registrationMode" 
                        checked={regMode === 'google_form'} 
                        onChange={() => setRegMode('google_form')} 
                      />
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                      Landing page CTA redirects participants directly to your Google Form. Existing AppSheet / Webhook synchronization remains active.
                    </p>
                    {regMode === 'google_form' && (
                      <div style={{ marginTop: '10px', display: 'inline-block' }}>
                        <span className="badge badge-cyan" style={{ fontSize: '10px' }}>CLASSIC ACTIVE</span>
                      </div>
                    )}
                  </div>

                </div>

                {/* Google Form Link */}
                <div style={{ marginTop: '6px' }}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                    Google Form URL (Classic Mode Destination)
                  </label>
                  <input 
                    type="url" 
                    className="input" 
                    value={googleFormLink} 
                    onChange={(e) => setGoogleFormLink(e.target.value)} 
                    placeholder="https://forms.gle/..."
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* 3. PAYMENT GATEWAY & TICKET PRICING */}
              <div style={{ background: '#070a13', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={16} color="#22c55e" />
                    <strong style={{ color: '#fff', fontSize: '14px' }}>3. Ticket Pricing & Payment Gateways</strong>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={enablePayments} 
                      onChange={(e) => setEnablePayments(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                    />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: enablePayments ? '#22c55e' : '#9ca3af' }}>
                      {enablePayments ? 'Fee Collection Active' : 'Free Registration (0 Fees)'}
                    </span>
                  </label>
                </div>

                {/* Ticket Tier Pricing */}
                {enablePayments && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#f7d070', marginBottom: '10px' }}>
                      Ticket Tier Fees (INR ₹)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          Hacker Pass (₹)
                        </label>
                        <input 
                          type="number" 
                          className="input" 
                          value={hackerPrice} 
                          onChange={(e) => setHackerPrice(e.target.value)} 
                          min="0"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          Student Pass (₹)
                        </label>
                        <input 
                          type="number" 
                          className="input" 
                          value={studentPrice} 
                          onChange={(e) => setStudentPrice(e.target.value)} 
                          min="0"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          VIP Delegate (₹)
                        </label>
                        <input 
                          type="number" 
                          className="input" 
                          value={vipPrice} 
                          onChange={(e) => setVipPrice(e.target.value)} 
                          min="0"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                          Judge / Mentor (₹)
                        </label>
                        <input 
                          type="number" 
                          className="input" 
                          value={judgePrice} 
                          onChange={(e) => setJudgePrice(e.target.value)} 
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Direct UPI Receiving Account */}
                {enablePayments && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#22d3ee', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={14} color="#22d3ee" /> Direct Receiving UPI Account (QR Code & UPI Apps)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      All QR codes and 1-tap mobile buttons (Google Pay, PhonePe, Paytm, BHIM) send funds directly to this UPI address.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                          Receiving UPI ID
                        </label>
                        <input 
                          type="text" 
                          className="input" 
                          value={upiId} 
                          onChange={(e) => setUpiId(e.target.value)} 
                          placeholder="tigeradi1504-1@okicici"
                          style={{ width: '100%', fontFamily: 'monospace', color: '#22d3ee', fontWeight: '700' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                          UPI Payee Display Name
                        </label>
                        <input 
                          type="text" 
                          className="input" 
                          value={upiPayeeName} 
                          onChange={(e) => setUpiPayeeName(e.target.value)} 
                          placeholder="HackSeries 2026"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Razorpay Gateway Live Credentials */}
                {enablePayments && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#f7d070', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={14} color="#f7d070" /> Razorpay Live / Test Credentials (Optional)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                      Add your Razorpay Key ID and Key Secret to instantly enable automated Credit/Debit Cards, NetBanking, and automated payment callbacks. (If left blank, direct UPI QR Code verification is used).
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                          Razorpay Key ID
                        </label>
                        <input 
                          type="text" 
                          className="input" 
                          value={razorpayKeyId} 
                          onChange={(e) => setRazorpayKeyId(e.target.value)} 
                          placeholder="rzp_live_... or rzp_test_..."
                          style={{ width: '100%', fontFamily: 'monospace' }}
                        />
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                            Razorpay Key Secret
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            {showRazorpaySecret ? <EyeOff size={12} /> : <Eye size={12} />}
                            {showRazorpaySecret ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <input 
                          type={showRazorpaySecret ? 'text' : 'password'} 
                          className="input" 
                          value={razorpayKeySecret} 
                          onChange={(e) => setRazorpayKeySecret(e.target.value)} 
                          placeholder="Secret Key"
                          style={{ width: '100%', fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSavingConfig}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px', justifyContent: 'center' }}
                >
                  {isSavingConfig ? (
                    <>
                      <RefreshCw size={15} className="spin" /> Saving Configuration...
                    </>
                  ) : (
                    <>
                      <Save size={15} /> Save All Event & Payment Settings
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

          {/* TAB 1: Live Broadcast Notice to All Digital Passes */}
          {activeTab === 'broadcast' && (
            <form onSubmit={handleSaveBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ background: 'rgba(209, 165, 80, 0.08)', border: '1px solid rgba(209, 165, 80, 0.3)', borderRadius: '12px', padding: '16px', fontSize: '13px', color: '#f7d070' }}>
                <div style={{ fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={15} /> Real-Time Pass Broadcast Network
                </div>
                Broadcast text entered here will immediately appear as a dynamic glowing announcement banner at the top of <strong>every attendee's holographic digital pass</strong> when they open it!
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Live Digital Pass Announcement Text
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="e.g. 📢 Hacking has begun! Lunch is served at 1:30 PM in Hall 2."
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="broadcastActiveCheckbox"
                  checked={broadcastActive}
                  onChange={(e) => setBroadcastActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#d1a550', cursor: 'pointer' }}
                />
                <label htmlFor="broadcastActiveCheckbox" style={{ fontSize: '13px', color: '#fff', cursor: 'pointer', userSelect: 'none' }}>
                  Activate live broadcast on attendee digital passes now
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-gold btn-sm" disabled={isSavingBroadcast} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={14} />
                  <span>{isSavingBroadcast ? 'Saving...' : 'Publish Broadcast Live'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: VIP Pass Generator */}
          {activeTab === 'vip' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ background: 'rgba(34, 211, 238, 0.08)', border: '1px solid rgba(34, 211, 238, 0.3)', borderRadius: '12px', padding: '16px', fontSize: '13px', color: '#22d3ee' }}>
                <div style={{ fontWeight: '800', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={15} /> Instant Cryptographic VIP / Judge Pass Issuer
                </div>
                Generate a verified holographic digital pass on the spot for VIP guests, keynote speakers, judges, or mentors without requiring a Google Form response.
              </div>

              <form onSubmit={handleGenerateVip} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Dr. Rajesh Sharma"
                    value={vipName}
                    onChange={(e) => setVipName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="e.g. rajesh@example.com"
                    value={vipEmail}
                    onChange={(e) => setVipEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Pass Category</label>
                  <select
                    className="form-control"
                    value={vipRole}
                    onChange={(e) => setVipRole(e.target.value)}
                  >
                    <option value="VIP Pass">👑 VIP Pass</option>
                    <option value="Mentor / Judge">⚖️ Mentor / Judge</option>
                    <option value="Speaker">🎙️ Keynote Speaker</option>
                    <option value="Volunteer Pass">🛡️ Volunteer Pass</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Affiliation / Designation</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Chief Guest / Jury Member"
                    value={vipTeam}
                    onChange={(e) => setVipTeam(e.target.value)}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="submit"
                    className="btn btn-gold"
                    disabled={isGeneratingVip || !vipName || !vipEmail}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Zap size={15} />
                    <span>{isGeneratingVip ? 'Signing Pass...' : 'Generate & Issue VIP Pass'}</span>
                  </button>
                </div>
              </form>

              {/* Result VIP Pass Card */}
              {generatedVipPass && (
                <div style={{ background: '#090d18', border: '1px solid #d1a550', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#f7d070', fontWeight: '800', textTransform: 'uppercase' }}>
                      PASS GENERATED SUCCESSFULLY ✅
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                      {generatedVipPass.name} ({generatedVipPass.uniqueId})
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Category: <strong style={{ color: '#22d3ee' }}>{generatedVipPass.ticketType}</strong>
                    </div>
                  </div>
                  <a
                    href={`/pass/${generatedVipPass.uniqueId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-cyan btn-sm"
                  >
                    View Pass ↗
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Full System Backup */}
          {activeTab === 'backup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={18} color="#22c55e" /> Full Google Cloud Firestore Snapshot
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.6' }}>
                  Download a complete offline JSON snapshot containing all registered hackers, verified cryptographic check-in logs, gate photos, email delivery histories, and system configuration.
                </p>
                <div style={{ marginTop: '16px' }}>
                  <button className="btn btn-primary" onClick={handleFullBackup} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px' }}>
                    <Download size={16} /> Download Full System JSON Backup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Security Diagnostics */}
          {activeTab === 'diagnostics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ background: '#090d18', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4ade80', fontWeight: '800' }}>
                    <Server size={13} /> CLOUD DATABASE
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>Google Cloud Firestore</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Project: hackseries-2026 (Live)</div>
                </div>

                <div style={{ background: '#090d18', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#22d3ee', fontWeight: '800' }}>
                    <Mail size={13} /> SMTP DISPATCH ENGINE
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>{telemetry?.activeMailer || 'Gmail SMTP TLS'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>tigeradi1504@gmail.com</div>
                </div>

                <div style={{ background: '#090d18', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#f7d070', fontWeight: '800' }}>
                    <Lock size={13} /> SECURITY AUTHORITY
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>HMAC-SHA256 Token</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Zero-Forgery Gate Protection</div>
                </div>
              </div>

              <div style={{ background: '#060913', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#9ca3af' }}>
                <div style={{ color: '#f7d070', fontWeight: '700', marginBottom: '8px' }}>⚡ OPERATOR CREDENTIALS VERIFICATION</div>
                <div>• Active Session Operator: <strong style={{ color: '#fff' }}>{currentUser?.name || 'Operations Admin'}</strong></div>
                <div>• Username: <strong style={{ color: '#fff' }}>{currentUser?.username || 'admin'}</strong></div>
                <div>• Assigned Security Clearance: <strong style={{ color: '#22c55e' }}>LEVEL 0 — LEAD OPERATIONS SOVEREIGN</strong></div>
                <div>• Gate Scanner Camera Module: <strong style={{ color: '#22d3ee' }}>HTML5-QRCode + Frame Capture Active</strong></div>
              </div>
            </div>
          )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
