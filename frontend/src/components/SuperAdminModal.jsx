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
  Info,
  CheckCircle2,
  QrCode,
  FileSpreadsheet,
  Send,
  Sliders,
  LayoutGrid,
  ArrowUpRight,
  Plus,
  Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

const COMMAND_TABS = [
  { 
    id: 'operations', 
    label: 'Operations & Tools', 
    description: 'Team & roles, gate scanner, Excel import, webhook sync, bulk email, template studio, and CSV export', 
    icon: LayoutGrid, 
    keywords: 'team roles gate scanner terminal import excel csv google sheet webhook bulk email passes template studio export download attendees launch event' 
  },
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
  activeEvent = null,
  selectedEventId = null,
  onClose, 
  onShowToast, 
  onRefreshData,
  initialTab = 'operations',
  onNavigateToScanner,
  onOpenTeamModal,
  onOpenExcelImport,
  onOpenWebhookGuide,
  onOpenBulkEmail,
  onOpenEmailTemplate,
  onExportCSV,
  onOpenCreateEvent,
  isMainBoss = false,
  selectedCount = 0
}) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'operations');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [commandSearch, setCommandSearch] = useState('');
  const [broadcastText, setBroadcastText] = useState(eventConfig?.broadcastNotice || '');
  const [broadcastActive, setBroadcastActive] = useState(eventConfig?.broadcastActive || false);
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);

  // Event Details State (prefers selected activeEvent, falls back to eventConfig)
  const sourceEv = activeEvent || eventConfig || {};
  const [eventName, setEventName] = useState(sourceEv.name || sourceEv.eventName || 'Eventra 2026');
  const [eventTagline, setEventTagline] = useState(sourceEv.tagline || sourceEv.eventTagline || '');
  const [eventDate, setEventDate] = useState(sourceEv.dateDisplay || sourceEv.eventDate || 'Dates TBA');
  const [eventTime, setEventTime] = useState(sourceEv.timeDisplay || sourceEv.eventTime || 'Schedule TBA');
  const [eventVenue, setEventVenue] = useState(sourceEv.venue || sourceEv.eventVenue || 'Campus Venue');
  const [organizerName, setOrganizerName] = useState(sourceEv.organizerName || '');
  const [organizerEmail, setOrganizerEmail] = useState(sourceEv.organizerEmail || '');

  // Registration Mode & Payment Gateway State
  const [regMode, setRegMode] = useState('native_payment');
  const [enablePayments, setEnablePayments] = useState(eventConfig?.enablePaymentGateway !== false);
  const [ticketPrices, setTicketPrices] = useState(() => {
    if (sourceEv.ticketPrices && typeof sourceEv.ticketPrices === 'object' && Object.keys(sourceEv.ticketPrices).length > 0) {
      return { ...sourceEv.ticketPrices };
    }
    if (Array.isArray(sourceEv.ticketTiers) && sourceEv.ticketTiers.length > 0) {
      const init = {};
      sourceEv.ticketTiers.forEach((tier) => {
        init[tier] = sourceEv.entryFee ?? 5;
      });
      return init;
    }
    return {
      'Hacker Pass': sourceEv.entryFee ?? 5,
      'Student Pass': sourceEv.entryFee ?? 5,
      'VIP Delegate': sourceEv.entryFee ?? 5,
      'Judge / Mentor': sourceEv.entryFee ?? 5,
    };
  });
  const [newTierName, setNewTierName] = useState('');
  const [newTierPrice, setNewTierPrice] = useState(5);
  const [upiId, setUpiId] = useState(eventConfig?.upiId || 'tigeradi1504-1@okicici');
  const [upiPayeeName, setUpiPayeeName] = useState(eventConfig?.upiPayeeName || sourceEv.name || 'Eventra 2026');
  const [razorpayKeyId, setRazorpayKeyId] = useState(eventConfig?.razorpayKeyId || '');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState(eventConfig?.razorpayKeySecret || '');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);

  // Sync state if activeEvent or eventConfig updates
  useEffect(() => {
    const src = activeEvent || eventConfig;
    if (src) {
      if (src.name || src.eventName) setEventName(src.name || src.eventName);
      if (src.tagline !== undefined || src.eventTagline !== undefined) setEventTagline(src.tagline ?? src.eventTagline ?? '');
      if (src.dateDisplay || src.eventDate) setEventDate(src.dateDisplay || src.eventDate);
      if (src.timeDisplay || src.eventTime) setEventTime(src.timeDisplay || src.eventTime);
      if (src.venue || src.eventVenue) setEventVenue(src.venue || src.eventVenue);
      if (src.organizerName !== undefined) setOrganizerName(src.organizerName || '');
      if (src.organizerEmail !== undefined) setOrganizerEmail(src.organizerEmail || '');
      if (src.ticketPrices && typeof src.ticketPrices === 'object' && Object.keys(src.ticketPrices).length > 0) {
        setTicketPrices({ ...src.ticketPrices });
      } else if (Array.isArray(src.ticketTiers) && src.ticketTiers.length > 0) {
        const generated = {};
        src.ticketTiers.forEach((t) => {
          generated[t] = src.entryFee !== undefined ? Number(src.entryFee) : 5;
        });
        setTicketPrices(generated);
      }
    }
    if (eventConfig) {
      if (eventConfig.registrationMode) setRegMode(eventConfig.registrationMode);
      if (eventConfig.enablePaymentGateway !== undefined) setEnablePayments(eventConfig.enablePaymentGateway);
      if (eventConfig.upiId) setUpiId(eventConfig.upiId);
      if (eventConfig.upiPayeeName) setUpiPayeeName(eventConfig.upiPayeeName);
      if (eventConfig.razorpayKeyId !== undefined) setRazorpayKeyId(eventConfig.razorpayKeyId);
      if (eventConfig.razorpayKeySecret !== undefined) setRazorpayKeySecret(eventConfig.razorpayKeySecret);
      if (eventConfig.broadcastNotice !== undefined) setBroadcastText(eventConfig.broadcastNotice);
      if (eventConfig.broadcastActive !== undefined) setBroadcastActive(eventConfig.broadcastActive);
    }
  }, [activeEvent, eventConfig]);

  // Database Telemetry State
  const [telemetry, setTelemetry] = useState(null);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(false);

  // VIP Pass Generator state
  const [vipName, setVipName] = useState('');
  const [vipEmail, setVipEmail] = useState('');
  const [vipRole, setVipRole] = useState('VIP Guest');
  const [vipTeam, setVipTeam] = useState('Special Invitee');
  const [vipTrack, setVipTrack] = useState(activeEvent?.tracks?.[0] || 'General Track');
  const [isGeneratingVip, setIsGeneratingVip] = useState(false);
  const [generatedVipPass, setGeneratedVipPass] = useState(null);

  const operationsTools = [
    ...(isMainBoss ? [{
      id: 'team',
      title: 'Team & Roles',
      badge: 'GOVERNANCE',
      badgeColor: 'dyp',
      description: 'Configure event heads, delegate gate scanner volunteers, and set granular role-based permissions.',
      icon: Crown,
      iconColor: '#596EE6',
      iconBg: '#EEF0FF',
      buttonText: 'Manage Team & Roles',
      buttonClass: 'btn-secondary',
      action: () => {
        sounds.playClick();
        onClose();
        if (onOpenTeamModal) onOpenTeamModal();
      },
      keywords: 'team roles coordinators scanner volunteers permissions organizer'
    }] : []),
    ...(onNavigateToScanner ? [{
      id: 'scanner',
      title: 'Gate Scanner Terminal',
      badge: 'LIVE TERMINAL',
      badgeColor: 'cyan',
      description: 'Launch high-speed camera QR code scanner with zero-tamper HMAC verification and attendee gate photo capture.',
      icon: QrCode,
      iconColor: '#06b6d4',
      iconBg: 'rgba(6, 182, 212, 0.12)',
      buttonText: 'Launch Gate Scanner',
      buttonClass: 'btn-cyan',
      action: () => {
        sounds.playClick();
        onClose();
        onNavigateToScanner();
      },
      keywords: 'scanner gate qr code camera check-in verify attend terminal'
    }] : []),
    {
      id: 'import-excel',
      title: 'Import Excel / CSV',
      badge: 'BATCH INGESTION',
      badgeColor: 'emerald',
      description: 'Bulk upload attendee manifests (.xlsx, .xls, .csv) with automatic column matching & instant pass generation.',
      icon: FileSpreadsheet,
      iconColor: '#22c55e',
      iconBg: 'rgba(34, 197, 94, 0.12)',
      buttonText: 'Import Excel / CSV',
      buttonClass: 'btn-secondary',
      action: () => {
        sounds.playClick();
        onClose();
        if (onOpenExcelImport) onOpenExcelImport();
      },
      keywords: 'import excel csv spreadsheet upload bulk attendees data manifest'
    },
    ...(isMainBoss ? [{
      id: 'webhook-script',
      title: 'Google Sheet Webhook Script',
      badge: 'REAL-TIME SYNC',
      badgeColor: 'emerald',
      description: 'Copy and deploy the ready Google Apps Script to stream Google Form submissions directly into Cloud Firestore.',
      icon: FileSpreadsheet,
      iconColor: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.12)',
      buttonText: 'View Webhook Script',
      buttonClass: 'btn-secondary',
      action: () => {
        sounds.playClick();
        onClose();
        if (onOpenWebhookGuide) onOpenWebhookGuide();
      },
      keywords: 'google sheet webhook script apps script form live sync automation'
    }] : []),
    {
      id: 'bulk-email',
      title: selectedCount > 0 ? `Bulk Email (${selectedCount} Selected)` : 'Bulk Email Passes',
      badge: selectedCount > 0 ? `${selectedCount} READY` : 'DISPATCH ENGINE',
      badgeColor: selectedCount > 0 ? 'emerald' : 'violet',
      description: 'Mass-send personalized HTML emails with dynamic HMAC-SHA256 digital QR passes to registered attendees.',
      icon: Send,
      iconColor: '#6366f1',
      iconBg: 'rgba(99, 102, 241, 0.12)',
      buttonText: selectedCount > 0 ? `Email ${selectedCount} Selected` : 'Bulk Email Passes',
      buttonClass: 'btn-primary',
      action: () => {
        sounds.playClick();
        onClose();
        if (onOpenBulkEmail) onOpenBulkEmail();
      },
      keywords: 'bulk email passes send dispatch hmac qr tickets mail pass'
    },
    {
      id: 'email-template',
      title: 'Email Template Studio',
      badge: 'PASS BRANDING',
      badgeColor: 'dyp',
      description: 'Customize HTML email invitation branding, banner art, check-in instructions, and organizer contact details.',
      icon: Sliders,
      iconColor: '#8b5cf6',
      iconBg: 'rgba(139, 92, 246, 0.12)',
      buttonText: 'Customize Template',
      buttonClass: 'btn-secondary',
      action: () => {
        sounds.playClick();
        onClose();
        if (onOpenEmailTemplate) onOpenEmailTemplate();
      },
      keywords: 'email template custom html subject body styling design branding'
    },
    {
      id: 'export-csv',
      title: 'Export Attendee CSV',
      badge: 'INSTANT DOWNLOAD',
      badgeColor: 'amber',
      description: 'Download the complete verified attendee roster with check-in status, phone, institution, and unique pass IDs.',
      icon: Download,
      iconColor: '#f59e0b',
      iconBg: 'rgba(245, 158, 11, 0.12)',
      buttonText: 'Export CSV',
      buttonClass: 'btn-secondary',
      action: () => {
        sounds.playClick();
        if (onExportCSV) onExportCSV();
      },
      keywords: 'export csv download spreadsheet roster data attendees'
    },
    ...(isMainBoss && onOpenCreateEvent ? [{
      id: 'create-event',
      title: '+ Launch Sub-Event',
      badge: 'CAMPUS ENGINE',
      badgeColor: 'emerald',
      description: 'Create and launch a new hackathon, workshop, or competition with custom pricing, schedule, and tracks.',
      icon: Sparkles,
      iconColor: '#596EE6',
      iconBg: '#EEF0FF',
      buttonText: '+ Launch Event',
      buttonClass: 'btn-primary',
      action: () => {
        sounds.playClick();
        onClose();
        onOpenCreateEvent();
      },
      keywords: 'launch create new event track hackathon add'
    }] : [])
  ];

  const filteredOperationsTools = operationsTools.filter((tool) =>
    !commandSearch.trim() ||
    `${tool.title} ${tool.description} ${tool.keywords} ${tool.badge}`.toLowerCase().includes(commandSearch.trim().toLowerCase())
  );

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
      const targetEvId = selectedEventId || activeEvent?.id || eventConfig?.activeEventId || 'eventra-2026';

      const cleanTicketPrices = {};
      for (const [k, v] of Object.entries(ticketPrices)) {
        const cleanName = String(k).trim();
        const num = Number(v);
        if (cleanName) {
          cleanTicketPrices[cleanName] = !isNaN(num) && num >= 0 ? num : 0;
        }
      }
      if (Object.keys(cleanTicketPrices).length === 0) {
        cleanTicketPrices['Standard Pass'] = 5;
      }
      const ticketTiersList = Object.keys(cleanTicketPrices);
      const firstTierFee = cleanTicketPrices[ticketTiersList[0]] ?? 5;

      if (targetEvId) {
        await api.events.update(targetEvId, {
          name: eventName ? eventName.trim() : 'Eventra',
          tagline: eventTagline ? eventTagline.trim() : '',
          dateDisplay: eventDate ? eventDate.trim() : 'Dates TBA',
          timeDisplay: eventTime ? eventTime.trim() : 'Schedule TBA',
          venue: eventVenue ? eventVenue.trim() : 'Campus Venue',
          organizerName: organizerName ? organizerName.trim() : '',
          organizerEmail: organizerEmail ? organizerEmail.trim() : '',
          ticketTiers: ticketTiersList,
          ticketPrices: cleanTicketPrices,
          entryFee: firstTierFee,
          pricingType: firstTierFee === 0 ? 'free' : 'paid',
        }).catch(() => {});
      }

      await api.event.updateConfig({
        activeEventId: targetEvId,
        eventName: eventName ? eventName.trim() : 'Eventra 2026',
        eventTagline: eventTagline ? eventTagline.trim() : '',
        eventDate: eventDate ? eventDate.trim() : 'Dates TBA',
        eventTime: eventTime ? eventTime.trim() : 'Schedule TBA',
        eventVenue: eventVenue ? eventVenue.trim() : '',
        organizerName: organizerName ? organizerName.trim() : '',
        organizerEmail: organizerEmail ? organizerEmail.trim() : '',
        registrationMode: 'native_payment',
        enablePaymentGateway: enablePayments,
        upiId: upiId ? upiId.trim() : 'tigeradi1504-1@okicici',
        upiPayeeName: upiPayeeName ? upiPayeeName.trim() : 'Eventra 2026',
        razorpayKeyId: razorpayKeyId ? razorpayKeyId.trim() : '',
        razorpayKeySecret: razorpayKeySecret ? razorpayKeySecret.trim() : '',
        ticketTiers: ticketTiersList,
        ticketPrices: cleanTicketPrices,
        entryFee: firstTierFee,
        pricingType: firstTierFee === 0 ? 'free' : 'paid',
      });

      window.dispatchEvent(new CustomEvent('eventra:events-updated'));
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
      const targetEvId = selectedEventId || activeEvent?.id || eventConfig?.activeEventId || 'eventra-2026';
      const res = await api.registrants.create({
        eventId: targetEvId,
        name: vipName,
        email: vipEmail,
        ticketType: vipRole,
        teamName: vipTeam,
        track: vipTrack,
        institution: activeEvent?.collegeName || 'Eventra Community',
      });

      sounds.playSuccess();
      setGeneratedVipPass(res.data);
      onShowToast({
        type: 'success',
        title: 'VIP Pass Generated!',
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
      a.download = `Eventra2026_Full_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
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

          {/* TAB: Operations & Tools Hub */}
          {activeTab === 'operations' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              
              {/* Quick Action Launcher Strip */}
              <div style={{
                background: '#f8f9fc',
                border: '1px solid var(--eventra-soft-border, #E2E8F0)',
                borderRadius: '16px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '7px',
                      background: 'var(--eventra-soft-lavender, #EEF0FF)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--eventra-indigo, #596EE6)'
                    }}>
                      <Zap size={14} />
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: '800', letterSpacing: '0.03em', color: 'var(--eventra-ink, #1E293B)', textTransform: 'uppercase' }}>
                        Quick Action Launcher
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)', marginLeft: '8px' }}>
                        One-click access to all core operational tools
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                    COMMAND TOOLS
                  </span>
                </div>

                {/* Pills Row (Exact style from Dashboard) */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  alignItems: 'center'
                }}>
                  {isMainBoss && (
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        sounds.playClick();
                        onClose();
                        if (onOpenTeamModal) onOpenTeamModal();
                      }}
                      style={{
                        background: '#EEF0FF',
                        border: '1px solid #DDE3FF',
                        color: '#596EE6',
                        fontWeight: '800',
                      }}
                      title="Manage Coordinators, Event Heads & Permissions"
                    >
                      <Crown size={14} color="#596EE6" /> Team & Roles
                    </button>
                  )}

                  {onNavigateToScanner && (
                    <button
                      className="btn btn-cyan btn-sm"
                      onClick={() => {
                        sounds.playClick();
                        onClose();
                        onNavigateToScanner();
                      }}
                      title="Launch Camera QR Scanner Terminal"
                    >
                      <QrCode size={14} /> Gate Scanner
                    </button>
                  )}

                  <button 
                    className="btn btn-secondary btn-sm" 
                    onClick={() => {
                      sounds.playClick();
                      onClose();
                      if (onOpenExcelImport) onOpenExcelImport();
                    }}
                    style={{
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      background: 'rgba(34, 197, 94, 0.08)',
                      color: '#4ade80'
                    }}
                    title="Upload .xlsx or .csv attendee manifests"
                  >
                    <FileSpreadsheet size={15} /> Import Excel / CSV
                  </button>

                  {isMainBoss && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        sounds.playClick();
                        onClose();
                        if (onOpenWebhookGuide) onOpenWebhookGuide();
                      }}
                      title="Google Apps Script live sync code"
                    >
                      <FileSpreadsheet size={15} color="#22c55e" /> Google Sheet Webhook Script
                    </button>
                  )}

                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => {
                      sounds.playClick();
                      onClose();
                      if (onOpenBulkEmail) onOpenBulkEmail();
                    }}
                    style={{
                      background: selectedCount > 0 ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                    title="Dispatch HMAC digital QR passes to attendees"
                  >
                    <Send size={14} /> 
                    <span>{selectedCount > 0 ? `Email Selected (${selectedCount})` : 'Bulk Email Passes'}</span>
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      sounds.playClick();
                      onClose();
                      if (onOpenEmailTemplate) onOpenEmailTemplate();
                    }}
                    title="Customize HTML pass layout, copy & styling"
                  >
                    <Sliders size={14} /> Email Template
                  </button>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      sounds.playClick();
                      if (onExportCSV) onExportCSV();
                    }}
                    title="Download complete registry as CSV"
                  >
                    <Download size={14} /> Export CSV
                  </button>

                  {isMainBoss && onOpenCreateEvent && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        sounds.playClick();
                        onClose();
                        onOpenCreateEvent();
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #596EE6 0%, #475AC4 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      title="Launch new hackathon sub-event"
                    >
                      <Sparkles size={14} color="#ffffff" />
                      <span>+ Launch Event</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Detailed Tool Cards Section Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--eventra-ink, #1E293B)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LayoutGrid size={15} color="var(--eventra-indigo, #596EE6)" />
                  <span>Operations Control Center</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748B)' }}>
                  Showing {filteredOperationsTools.length} {filteredOperationsTools.length === 1 ? 'operational tool' : 'operational tools'}
                </span>
              </div>

              {/* Detailed Tool Cards Grid */}
              {filteredOperationsTools.length === 0 ? (
                <div style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: '#f8f9fc',
                  borderRadius: '14px',
                  border: '1px dashed var(--eventra-soft-border, #E2E8F0)'
                }}>
                  <Search size={24} style={{ color: '#94A3B8', margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#475569' }}>
                    No operations tools match "{commandSearch}"
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                    Try searching for "scanner", "email", "excel", "roles", or "csv"
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '14px'
                }}>
                  {filteredOperationsTools.map((tool) => {
                    const ToolIcon = tool.icon;
                    return (
                      <div
                        key={tool.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--eventra-soft-border, #E2E8F0)',
                          borderRadius: '14px',
                          padding: '18px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '14px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: tool.iconBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: tool.iconColor
                            }}>
                              <ToolIcon size={20} />
                            </div>
                            <span className={`badge badge-${tool.badgeColor}`} style={{ fontSize: '10px', padding: '3px 8px' }}>
                              {tool.badge}
                            </span>
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--eventra-ink, #0F172A)', marginBottom: '4px' }}>
                            {tool.title}
                          </div>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted, #64748B)', lineHeight: '1.5', margin: 0 }}>
                            {tool.description}
                          </p>
                        </div>

                        <button
                          className={`btn btn-sm ${tool.buttonClass}`}
                          onClick={tool.action}
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '9px 14px',
                            fontWeight: '700'
                          }}
                        >
                          <ToolIcon size={14} />
                          <span>{tool.buttonText}</span>
                          <ArrowUpRight size={13} style={{ opacity: 0.7 }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

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
                    Google Cloud Project: <strong style={{ color: '#fff' }}>{telemetry?.projectId || 'eventra-2026'}</strong>
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
                  <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--eventra-indigo)', marginTop: '2px' }}>{telemetry?.emailSentCount ?? '—'}</div>
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
                      placeholder="Eventra 2026"
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
                      placeholder="Powered by Eventra 2026 — Zero-Tamper QR Pass Platform"
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

              {/* 2. PARTICIPANT INTAKE ENGINE */}
              <div style={{ background: '#070a13', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '10px' }}>
                  <CreditCard size={16} color="var(--eventra-indigo)" />
                  <strong style={{ color: '#fff', fontSize: '14px' }}>2. Native Participant Intake & Instant Pass Engine</strong>
                </div>

                <div style={{
                  padding: '16px',
                  borderRadius: '12px',
                  border: '2px solid var(--eventra-indigo)',
                  background: 'rgba(89, 110, 230, 0.1)',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} color="var(--eventra-indigo)" />
                      <strong style={{ color: '#fff', fontSize: '14px' }}>
                        Native In-App Intake (Active Everywhere)
                      </strong>
                    </div>
                    <span className="badge badge-emerald" style={{ fontSize: '10px' }}>LIVE &amp; VERIFIED</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Direct on-site registration modal at <code>/#register</code>. Supports UPI, NetBanking, Cards with Razorpay. Instantly issues cryptographically signed passes.
                  </p>
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

                {/* Dynamic Ticket Tier Pricing */}
                {enablePayments && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--eventra-indigo)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>Ticket Tier Fees (INR ₹)</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal' }}>
                          — Synchronized dynamically with attendee checkout
                        </span>
                      </div>
                      <span className="badge badge-cyan" style={{ fontSize: '10px' }}>
                        {Object.keys(ticketPrices).length} TIERS CONFIGURED
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                      {Object.entries(ticketPrices).map(([tierName, price]) => (
                        <div 
                          key={tierName}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <label style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }} title={tierName}>
                              {tierName}
                            </label>
                            {Object.keys(ticketPrices).length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  sounds.playClick();
                                  setTicketPrices((prev) => {
                                    const next = { ...prev };
                                    delete next[tierName];
                                    return next;
                                  });
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  opacity: 0.8,
                                }}
                                title={`Delete ${tierName}`}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--eventra-indigo)' }}>₹</span>
                            <input
                              type="number"
                              className="input"
                              value={price}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTicketPrices((prev) => ({
                                  ...prev,
                                  [tierName]: val === '' ? '' : Math.max(0, Number(val)),
                                }));
                              }}
                              min="0"
                              style={{ width: '100%', padding: '6px 10px', fontSize: '13px', fontWeight: '700' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Inline Add Ticket Tier */}
                    <div style={{
                      background: 'rgba(89, 110, 230, 0.06)',
                      border: '1px dashed rgba(89, 110, 230, 0.3)',
                      borderRadius: '10px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ flex: '2', minWidth: '140px' }}>
                        <input
                          type="text"
                          className="input"
                          placeholder="New Tier Name (e.g. VIP Pass, Team Entry)"
                          value={newTierName}
                          onChange={(e) => setNewTierName(e.target.value)}
                          style={{ width: '100%', fontSize: '12px' }}
                        />
                      </div>
                      <div style={{ width: '90px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--eventra-indigo)' }}>₹</span>
                        <input
                          type="number"
                          className="input"
                          placeholder="Fee"
                          value={newTierPrice}
                          onChange={(e) => setNewTierPrice(Math.max(0, Number(e.target.value)))}
                          min="0"
                          style={{ width: '100%', fontSize: '12px' }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => {
                          if (!newTierName.trim()) {
                            onShowToast({ type: 'warning', title: 'Tier Name Required', message: 'Please enter a name for the new ticket tier.' });
                            return;
                          }
                          const clean = newTierName.trim();
                          setTicketPrices((prev) => ({
                            ...prev,
                            [clean]: Number(newTierPrice) >= 0 ? Number(newTierPrice) : 0,
                          }));
                          setNewTierName('');
                          setNewTierPrice(5);
                          sounds.playSuccess();
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '6px 12px' }}
                      >
                        <Plus size={14} /> Add Tier
                      </button>
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
                          placeholder="Eventra 2026"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Razorpay Gateway Live Credentials */}
                {enablePayments && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--eventra-indigo)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={14} color="var(--eventra-indigo)" /> Razorpay Live / Test Credentials (Optional)
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
              <div style={{ background: 'rgba(89, 110, 230, 0.08)', border: '1px solid rgba(89, 110, 230, 0.25)', borderRadius: '12px', padding: '16px', fontSize: '13px', color: 'var(--eventra-indigo)' }}>
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
                  style={{ width: '16px', height: '16px', accentColor: 'var(--eventra-indigo)', cursor: 'pointer' }}
                />
                <label htmlFor="broadcastActiveCheckbox" style={{ fontSize: '13px', color: '#fff', cursor: 'pointer', userSelect: 'none' }}>
                  Activate live broadcast on attendee digital passes now
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={isSavingBroadcast} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                Generate a verified holographic digital pass on the spot for VIP guests, keynote speakers, judges, or mentors with instant cryptographic signing.
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
                    <option value="VIP Pass">VIP Pass</option>
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
                <div style={{ background: '#090d18', border: '1px solid var(--eventra-soft-border)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--eventra-indigo)', fontWeight: '800', textTransform: 'uppercase' }}>
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
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Project: eventra-2026 (Live)</div>
                </div>

                <div style={{ background: '#090d18', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#22d3ee', fontWeight: '800' }}>
                    <Mail size={13} /> SMTP DISPATCH ENGINE
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>{telemetry?.activeMailer || 'Gmail SMTP TLS'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>tigeradi1504@gmail.com</div>
                </div>

                <div style={{ background: '#090d18', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--eventra-indigo)', fontWeight: '800' }}>
                    <Lock size={13} /> SECURITY AUTHORITY
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff', marginTop: '4px' }}>HMAC-SHA256 Token</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Zero-Forgery Gate Protection</div>
                </div>
              </div>

              <div style={{ background: '#060913', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#9ca3af' }}>
                <div style={{ color: 'var(--eventra-indigo)', fontWeight: '700', marginBottom: '8px' }}>⚡ OPERATOR CREDENTIALS VERIFICATION</div>
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
