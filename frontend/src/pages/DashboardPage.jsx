import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Mail, 
  Search, 
  Filter, 
  RefreshCw, 
  Zap,
  ShieldCheck,
  Crown,
  Edit3,
  ExternalLink,
  Trash2,
  Plus,
  CreditCard,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';
import { StatCard } from '../components/StatCard';
import { RegistrantTable } from '../components/RegistrantTable';
import { PassPreviewModal } from '../components/PassPreviewModal';
import { WebhookGuideModal } from '../components/WebhookGuideModal';
import { EmailTemplateModal } from '../components/EmailTemplateModal';
import { BulkEmailModal } from '../components/BulkEmailModal';
import { SuperAdminModal } from '../components/SuperAdminModal';
import { ExcelImportModal } from '../components/ExcelImportModal';
import { CreateEventModal } from '../components/CreateEventModal';
import { TeamManagementModal } from '../components/TeamManagementModal';
import { LivePaymentLedgerModal } from '../components/LivePaymentLedgerModal';
import { sounds } from '../utils/soundEffects';

const CACHE_KEY_DASHBOARD = 'hs26_cached_dashboard_state';

const getInitialCachedData = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY_DASHBOARD);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

export const DashboardPage = ({ onShowToast, onNavigateToScanner, onViewLiveEvent }) => {
  const cachedInitial = getInitialCachedData();

  // Multi-Event State
  const [eventsList, setEventsList] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(
    cachedInitial?.eventConfig?.activeEventId || 'eventra-2026'
  );
  const [hasUserSelectedEvent, setHasUserSelectedEvent] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [createKey, setCreateKey] = useState(0);
  const [showTeamModal, setShowTeamModal] = useState(false);

  // Live Razorpay Financial Stats State
  const [livePaymentStats, setLivePaymentStats] = useState(null);
  const [loadingPaymentStats, setLoadingPaymentStats] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  const [registrants, setRegistrants] = useState(cachedInitial?.registrants || []);
  const [stats, setStats] = useState(cachedInitial?.stats || {
    totalRegistrants: 0,
    checkedInCount: 0,
    checkedInPercentage: 0,
    emailSentCount: 0,
    pendingEmailCount: 0,
    verifiedCount: 0,
    verifiedPendingEmailCount: 0,
  });
  const [pagination, setPagination] = useState(cachedInitial?.pagination || {
    page: 1,
    limit: 25,
    totalItems: 0,
    totalPages: 1,
  });

  // Selected Attendees for Bulk Actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [checkedInFilter, setCheckedInFilter] = useState('');
  const [emailSentFilter, setEmailSentFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [trackFilter, setTrackFilter] = useState('all');
  const [ticketFilter, setTicketFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);

  // Modals
  const [selectedPassRegistrant, setSelectedPassRegistrant] = useState(null);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showWebhookGuide, setShowWebhookGuide] = useState(false);
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [showBulkEmail, setShowBulkEmail] = useState(false);
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [superAdminTab, setSuperAdminTab] = useState('operations');
  const [eventConfig, setEventConfig] = useState(cachedInitial?.eventConfig || null);

  // Fetch Events Catalog & Active Config
  const fetchEvents = useCallback(async () => {
    try {
      const [evRes, cfgRes] = await Promise.all([
        api.events.getAll().catch(() => null),
        api.event.getConfig().catch(() => null),
      ]);
      const list = evRes?.data || [];
      setEventsList(list);

      if (cfgRes?.data) {
        setEventConfig(cfgRes.data);
        if (!hasUserSelectedEvent && cfgRes.data.activeEventId) {
          setSelectedEventId(cfgRes.data.activeEventId);
        }
      }
    } catch (e) {
      console.warn('fetchEvents error:', e);
    }
  }, [hasUserSelectedEvent]);

  useEffect(() => {
    fetchEvents();
    const handleEventsUpdated = (e) => {
      fetchEvents();
      const updatedEv = e?.detail;
      if (updatedEv && (updatedEv.id || updatedEv.eventId)) {
        setSelectedEventId(updatedEv.id || updatedEv.eventId);
        setHasUserSelectedEvent(true);
      }
    };
    window.addEventListener('eventra:events-updated', handleEventsUpdated);
    return () => window.removeEventListener('eventra:events-updated', handleEventsUpdated);
  }, [fetchEvents]);

  useEffect(() => {
    const openCommandCenter = (event) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;

      const activeElement = document.activeElement;
      if (activeElement?.matches('input, textarea, select, [contenteditable="true"]')) return;

      event.preventDefault();
      setSuperAdminTab('operations');
      setShowSuperAdminModal(true);
    };

    window.addEventListener('keydown', openCommandCenter);
    return () => window.removeEventListener('keydown', openCommandCenter);
  }, []);

  // High-Speed Concurrent Fetch with SWR Caching
  const fetchData = useCallback(async (page = 1, silent = false) => {
    try {
      if (!silent && registrants.length === 0) {
        setLoading(true);
      } else {
        setIsBackgroundSyncing(true);
      }

      const params = {
        page,
        limit: pagination.limit,
        search,
        checkedIn: checkedInFilter,
        emailSent: emailSentFilter,
        verified: verifiedFilter,
        track: trackFilter,
        ticketType: ticketFilter,
        eventId: selectedEventId,
      };

      const [regRes, configRes] = await Promise.all([
        api.registrants.list(params),
        !eventConfig ? api.event.getConfig().catch(() => null) : Promise.resolve(null),
      ]);

      if (regRes) {
        const nextRegistrants = regRes.data || [];
        const nextPagination = regRes.pagination || {};
        const nextStats = regRes.stats || {};

        setRegistrants(nextRegistrants);
        setPagination(nextPagination);
        setStats(nextStats);

        try {
          sessionStorage.setItem(
            CACHE_KEY_DASHBOARD,
            JSON.stringify({
              registrants: nextRegistrants,
              pagination: nextPagination,
              stats: nextStats,
              eventConfig: configRes?.data || eventConfig,
            })
          );
        } catch {}
      }
      if (configRes?.data) {
        setEventConfig(configRes.data);
      }
    } catch (err) {
      if (!silent) {
        onShowToast({
          type: 'error',
          title: 'Data Fetch Error',
          message: err.message,
        });
      }
    } finally {
      setLoading(false);
      setIsBackgroundSyncing(false);
    }
  }, [pagination.limit, search, checkedInFilter, emailSentFilter, verifiedFilter, trackFilter, ticketFilter, selectedEventId, eventConfig, registrants.length, onShowToast]);

  // Live Razorpay Financial Telemetry Query
  const fetchPaymentStats = useCallback(async (evId) => {
    try {
      setLoadingPaymentStats(true);
      const res = await api.payment.getLiveStats(evId);
      const statsData = res?.data || (res?.success ? res : res);
      if (statsData && (statsData.totalRevenue !== undefined || statsData.transactions !== undefined)) {
        setLivePaymentStats(statsData);
      }
    } catch (err) {
      console.warn('Live payment stats query warning:', err);
    } finally {
      setLoadingPaymentStats(false);
    }
  }, []);

  // Initial and reactive fetch on filter change or event change
  useEffect(() => {
    fetchData(1, registrants.length > 0);
    fetchPaymentStats(selectedEventId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedInFilter, emailSentFilter, verifiedFilter, trackFilter, ticketFilter, selectedEventId]);

  // Live Auto-Polling (Pulls new submissions and live Razorpay revenue into dashboard)
  useEffect(() => {
    const pollTimer = setInterval(() => {
      fetchData(pagination.page, true);
      fetchPaymentStats(selectedEventId);
    }, 4500);
    return () => clearInterval(pollTimer);
  }, [fetchData, fetchPaymentStats, pagination.page, selectedEventId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData(1);
  };

  const handleExportCSV = async () => {
    try {
      sounds.playClick();
      await api.registrants.downloadCSV(selectedEventId);
      onShowToast?.({
        type: 'success',
        title: 'Export Complete 📊',
        message: `Attendee list for "${currentSelectedEvent?.name || selectedEventId}" exported to CSV successfully.`,
      });
    } catch (err) {
      sounds.playError();
      onShowToast?.({
        type: 'error',
        title: 'Export Failed',
        message: err.message || 'Could not export attendees.',
      });
    }
  };

  // Selection Handlers
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = (visibleIds) => {
    setSelectedIds((prev) => {
      const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.includes(id));
      if (isAllSelected) {
        return prev.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...prev, ...visibleIds]));
    });
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Compute selected registrant objects
  const selectedRegistrantsList = registrants.filter((r) =>
    selectedIds.includes(r.uniqueId || r._id)
  );

  const currentUser = api.auth.getUser();
  const username = currentUser?.username?.toLowerCase() || '';
  const email = currentUser?.email?.toLowerCase() || '';
  const name = currentUser?.name || '';
  
  const isMainBoss = username === 'adityarenake' || email === 'tigeradi1504@gmail.com' || email === 'aditya.renake@outlook.com' || currentUser?.role === 'root_owner';

  let adminDisplayName = name;
  if (isMainBoss) {
    adminDisplayName = 'Aditya Renake (Main Event Organizer)';
  } else if (!adminDisplayName) {
    adminDisplayName = 'Operations Admin';
  }

  const currentSelectedEvent = selectedEventId === 'all'
    ? { id: 'all', eventId: 'all', name: 'All Events (Combined Collection)', category: 'Global', isFlagship: false }
    : eventsList.find((ev) => (ev.id || ev.eventId) === selectedEventId);
  const isSelectedEventLiveOnSite = Boolean(
    selectedEventId !== 'all' &&
    eventConfig?.activeEventId && String(eventConfig.activeEventId).toLowerCase() === String(selectedEventId).toLowerCase()
  );

  // Dynamic Tracks & Ticket Tiers for Filter Bar
  const availableTracks = React.useMemo(() => {
    if (!currentSelectedEvent || selectedEventId === 'all') return [];
    const list = new Set();
    if (Array.isArray(currentSelectedEvent.tracks)) {
      currentSelectedEvent.tracks.forEach((t) => t && list.add(t));
    }
    if (Array.isArray(currentSelectedEvent.subEvents)) {
      currentSelectedEvent.subEvents.forEach((s) => s?.name && list.add(s.name));
    }
    return Array.from(list);
  }, [currentSelectedEvent, selectedEventId]);

  const availableTicketTiers = React.useMemo(() => {
    if (!currentSelectedEvent || selectedEventId === 'all') return [];
    const list = new Set();
    if (Array.isArray(currentSelectedEvent.ticketTiers)) {
      currentSelectedEvent.ticketTiers.forEach((t) => t && list.add(t));
    }
    if (currentSelectedEvent.ticketPrices && typeof currentSelectedEvent.ticketPrices === 'object') {
      Object.keys(currentSelectedEvent.ticketPrices).forEach((t) => t && list.add(t));
    }
    return Array.from(list);
  }, [currentSelectedEvent, selectedEventId]);

  const handleMakeSelectedEventLive = async () => {
    if (!currentSelectedEvent) return;
    try {
      sounds.playClick();
      const ev = currentSelectedEvent;
      const parsedFee = ev.pricingType === 'free' ? 0 : (ev.entryFee !== undefined ? Number(ev.entryFee) : 5);
      const tiers = Array.isArray(ev.ticketTiers) && ev.ticketTiers.length > 0 ? ev.ticketTiers : ['Standard Pass'];
      const ticketMap = ev.ticketPrices && Object.keys(ev.ticketPrices).length > 0
        ? ev.ticketPrices
        : Object.fromEntries(tiers.map((t) => [t, parsedFee]));

      const res = await api.event.updateConfig({
        activeEventId: ev.id || ev.eventId,
        eventName: ev.name,
        eventTagline: ev.tagline || `${ev.category || 'Campus'} Event`,
        eventDescription: ev.description || '',
        category: ev.category || 'Hackathon',
        structureType: ev.structureType || 'single',
        collegeName: ev.collegeName || '',
        clubName: ev.clubName || '',
        clubCode: ev.clubCode || '',
        mode: ev.mode || 'in_person',
        startDate: ev.startDate || '',
        endDate: ev.endDate || '',
        eventDate: ev.dateDisplay || 'Dates TBA',
        eventTime: ev.timeDisplay || 'Schedule TBA',
        eventVenue: ev.venue || 'Campus Venue',
        venueHall: ev.venueHall || '',
        mapUrl: ev.mapUrl || '',
        meetingUrl: ev.meetingUrl || '',
        organizerEmail: ev.organizerEmail || '',
        organizerName: ev.organizerName || 'Campus Organizer',
        organizerRole: ev.organizerRole || '',
        organizerPhone: ev.organizerPhone || '',
        alternatePOC: ev.alternatePOC || '',
        themeColor: ev.themeColor || '#596EE6',
        bannerUrl: ev.bannerUrl || '',
        pricingType: parsedFee === 0 ? 'free' : 'paid',
        entryFee: parsedFee,
        feeDisplay: ev.feeDisplay || (parsedFee === 0 ? 'Free Entry Pass' : `₹${parsedFee} Entry Pass`),
        totalCapacity: ev.totalCapacity || 250,
        ticketTiers: tiers,
        ticketPrices: ticketMap,
        tracks: Array.isArray(ev.tracks) ? ev.tracks : [],
        subEvents: Array.isArray(ev.subEvents) ? ev.subEvents : [],
        requiredFields: ev.requiredFields || {
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
        customQuestion: ev.customQuestion || '',
        whatsappUrl: ev.whatsappUrl || '',
        discordUrl: ev.discordUrl || '',
        brochureUrl: ev.brochureUrl || '',
        socialUrl: ev.socialUrl || '',
        enablePaymentGateway: Object.values(ticketMap).some((v) => Number(v) > 0),
      });

      setEventConfig(res.data);
      window.dispatchEvent(new CustomEvent('eventra:events-updated', { detail: ev }));
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'Event Published Live! 🚀',
        message: `"${ev.name}" is now the active live event on the website with all its configured details.`,
      });
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Publish Failed',
        message: err.message || 'Could not update live active event.',
      });
    }
  };

  const handleMakeFlagship = async () => {
    if (!currentSelectedEvent) return;
    try {
      sounds.playClick();
      const evId = currentSelectedEvent.id || currentSelectedEvent.eventId;
      await api.events.setFlagship(evId);
      await fetchEvents();
      window.dispatchEvent(new CustomEvent('eventra:events-updated'));
      sounds.playSuccess();
      onShowToast?.({
        type: 'success',
        title: 'Promoted to Flagship! 👑',
        message: `"${currentSelectedEvent.name}" is now the sole Flagship Event featured on the homepage!`,
      });
    } catch (err) {
      sounds.playError();
      onShowToast?.({
        type: 'error',
        title: 'Flagship Update Failed',
        message: err.message || 'Could not promote event to flagship.',
      });
    }
  };

  const handleDeleteSelectedEvent = async () => {
    if (!currentSelectedEvent) return;
    const evId = currentSelectedEvent.id || currentSelectedEvent.eventId;
    if (!window.confirm(`Are you sure you want to delete "${currentSelectedEvent.name}"?`)) return;
    try {
      sounds.playClick();
      await api.events.delete(evId);
      const remaining = eventsList.filter((e) => (e.id || e.eventId) !== evId);
      setEventsList(remaining);
      const nextEv = remaining[0];
      if (nextEv) {
        setSelectedEventId(nextEv.id || nextEv.eventId);
      }
      window.dispatchEvent(new CustomEvent('eventra:events-updated'));
      onShowToast({
        type: 'success',
        title: 'Event Deleted',
        message: `"${currentSelectedEvent.name}" has been removed.`,
      });
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Could not delete event.',
      });
    }
  };

  return (
    <div className="dashboard-page" style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      
      {/* Header Title & Top Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <img src="/eventra-logo.svg" alt="Eventra" style={{ height: '30px', width: 'auto', display: 'block' }} />
            <h1 className="dashboard-title" style={{ fontSize: '26px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>Operations Control Room</h1>
            
            {/* Multi-Event Selector Dropdown */}
            <div className="dashboard-event-picker" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', border: '1px solid #DDE3FF', borderRadius: '9999px', padding: '3px 12px', boxShadow: '0 2px 6px rgba(41, 48, 74, 0.04)' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#596EE6', textTransform: 'uppercase' }}>Active Event:</span>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  sounds.playClick();
                  setHasUserSelectedEvent(true);
                  setSelectedEventId(e.target.value);
                  setTrackFilter('all');
                  setTicketFilter('all');
                  setSelectedIds([]);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--eventra-ink, #29304A)',
                  fontWeight: '800',
                  fontSize: '12px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="all" style={{ background: '#FFFFFF', color: '#29304A', fontWeight: 'bold' }}>
                  🌐 All Events (Combined / Lifetime Collection)
                </option>
                {eventsList.map((ev) => (
                  <option key={ev.id || ev.eventId} value={ev.id || ev.eventId} style={{ background: '#FFFFFF', color: '#29304A' }}>
                    {ev.name} ({ev.category})
                  </option>
                ))}
              </select>
            </div>

            {/* Flagship Promotion & Live on Site Indicator */}
            {selectedEventId !== 'all' && (
              currentSelectedEvent?.isFlagship ? (
                <span style={{ fontSize: '11px', fontWeight: '900', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', color: '#FFFFFF', padding: '3px 12px', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '5px', boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)' }}>
                  <Crown size={12} />
                  👑 ACTIVE FLAGSHIP EVENT
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleMakeFlagship}
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: '9999px',
                    padding: '3px 12px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
                  }}
                  title="Promote this event to be the primary Flagship Event featured on the homepage"
                >
                  <Crown size={11} />
                  <span>⭐ Make Flagship Event</span>
                </button>
              )
            )}

            {selectedEventId !== 'all' && (
              isSelectedEventLiveOnSite ? (
                <span style={{ fontSize: '10px', fontWeight: '800', background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', borderRadius: '9999px', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  LIVE ON WEBSITE
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleMakeSelectedEventLive}
                  style={{
                    background: 'linear-gradient(135deg, #596EE6 0%, #475AC4 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    borderRadius: '9999px',
                    padding: '3px 12px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 8px rgba(89, 110, 230, 0.25)',
                  }}
                  title="Publish this event to the live website landing page and registration form"
                >
                  <Zap size={11} />
                  <span>Publish to Live Site</span>
                </button>
              )
            )}

            {/* Quick Edit, View & Delete Event Actions */}
            {currentSelectedEvent && selectedEventId !== 'all' && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setEditingEvent(currentSelectedEvent);
                    setShowCreateEvent(true);
                  }}
                  style={{
                    background: '#EEF0FF',
                    border: '1px solid #DDE3FF',
                    color: '#596EE6',
                    borderRadius: '9999px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Edit all details of this event in the 6-step wizard"
                >
                  <Edit3 size={11} />
                  <span>Edit Event</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    window.open(`/#event/${encodeURIComponent(selectedEventId)}`, '_blank');
                  }}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #DDE3FF',
                    color: '#596EE6',
                    borderRadius: '9999px',
                    padding: '3px 10px',
                    fontSize: '11px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Open this event's dedicated specifications page in a separate window"
                >
                  <ExternalLink size={11} color="#596EE6" />
                  <span>Event Details ↗</span>
                </button>

                {eventsList.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedEvent}
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#EF4444',
                      borderRadius: '9999px',
                      padding: '3px 8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                    title="Delete this event"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            )}

            {isMainBoss ? (
              <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#EEF0FF', color: '#596EE6', border: '1px solid #DDE3FF', fontWeight: '800' }}>
                <Crown size={12} color="#596EE6" /> MAIN EVENT ORGANIZER
              </span>
            ) : (
              <span className="badge badge-cyan">SUB-EVENT HEAD</span>
            )}
            <span className="badge badge-dyp">EVENTRA OPS</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {currentSelectedEvent
              ? `${currentSelectedEvent.name} • ${currentSelectedEvent.dateDisplay || 'Dates TBA'} • ${currentSelectedEvent.venue || 'Campus Venue'}`
              : 'Multi-Event Campus Engine • Native Attendee Ingestion • Express Gate Check-In • Role-Based Delegation'}
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="btn btn-sm"
            onClick={() => {
              sounds.playClick();
              setSuperAdminTab('operations');
              setShowSuperAdminModal(true);
            }}
            style={{
              background: '#EEF0FF',
              border: '1px solid #DDE3FF',
              color: '#596EE6',
              fontWeight: '800',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              boxShadow: '0 2px 8px rgba(89, 110, 230, 0.12)',
            }}
            title="Open Operations Command Center (⌘K / Ctrl K)"
          >
            <Zap size={14} color="#596EE6" />
            <span>Command Center</span>
            <kbd className="command-shortcut-hint" style={{ background: '#ffffff', color: '#596EE6', borderColor: '#DDE3FF', borderRadius: '4px', padding: '1px 5px', fontSize: '10px' }}>⌘K</kbd>
          </button>

          <button className="btn btn-ghost btn-sm" onClick={() => fetchData(pagination.page)} title="Refresh Data">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Personalized Admin Greeting Banner */}
      <div className="dashboard-welcome" style={{
        background: 'linear-gradient(90deg, rgba(34, 211, 238, 0.12) 0%, rgba(34, 197, 94, 0.08) 50%, rgba(6, 8, 14, 0.85) 100%)',
        border: '1px solid rgba(34, 211, 238, 0.3)',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#030712',
            boxShadow: '0 0 14px rgba(34, 197, 94, 0.45)'
          }}>
            <ShieldCheck size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>
                Welcome back, {adminDisplayName}!
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '3px 8px' }}>
                OPERATIONS ADMIN
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Managing: <strong style={{ color: '#fff' }}>{currentSelectedEvent?.name || 'Eventra'}</strong> • Real-Time Gate Check-In & Attendee Pass Management
            </div>
          </div>
        </div>

        {/* Operations Command & Live Database Telemetry Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              sounds.playClick();
              setSuperAdminTab('telemetry');
              setShowSuperAdminModal(true);
            }}
            style={{
              padding: '7px 14px',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.35)',
              color: '#4ade80',
              fontWeight: '700'
            }}
            title="Click to view real-time Google Cloud Firestore storage & latency metrics"
          >
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }}></span>
            <span>Cloud DB: 99.99% Free</span>
          </button>

          <button
            className="btn btn-cyan btn-sm"
            onClick={() => {
              sounds.playClick();
              setSuperAdminTab('operations');
              setShowSuperAdminModal(true);
            }}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Zap size={14} />
            <span>Operations Command Center</span>
            <kbd className="command-shortcut-hint">⌘K / Ctrl K</kbd>
          </button>
        </div>
      </div>

      {/* Quick Create / Edit Event Banner */}
      <div className="dashboard-create-event-banner">
        <div>
          <h3 className="banner-title">Create or manage campus events</h3>
          <p className="banner-subtitle">
            Launch a new event with custom dates, venue, poster, sub-events, and registration questions — or edit "{currentSelectedEvent?.name || 'your active event'}".
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {currentSelectedEvent && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                sounds.playClick();
                setEditingEvent(currentSelectedEvent);
                setShowCreateEvent(true);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '13px',
              }}
            >
              <Edit3 size={15} />
              <span>Edit "{currentSelectedEvent.name}"</span>
            </button>
          )}
          <button
            type="button"
            className="banner-btn"
            onClick={() => {
              sounds.playClick();
              setEditingEvent(null);
              setCreateKey((k) => k + 1);
              setShowCreateEvent(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Create event</span>
          </button>
        </div>
      </div>

      {/* Live Razorpay Payment Collection & Revenue Telemetry Panel */}
      <div className="dashboard-razorpay-panel">
        {/* Top Header & Reconciled Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="razorpay-panel-icon">
              <CreditCard size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 className="razorpay-panel-title">
                  Live Razorpay Revenue & Payment Collection
                </h2>
                <span className="razorpay-live-badge">
                  <span className="razorpay-live-dot" />
                  {livePaymentStats?.gatewayMode || 'LIVE PRODUCTION'}
                </span>
              </div>
              <div className="razorpay-panel-subtitle">
                Reconciled telemetry for <strong>{currentSelectedEvent?.name || selectedEventId}</strong> • Key <code className="razorpay-key-code">{livePaymentStats?.gatewayKeyId || 'rzp_live_Toe8X3rzRfnIsm'}</code>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={async () => {
                sounds.playClick();
                await Promise.all([
                  fetchPaymentStats(selectedEventId),
                  fetchData(pagination.page, true),
                ]);
                sounds.playSuccess();
                onShowToast?.({
                  type: 'success',
                  title: 'Razorpay Telemetry Reconciled 💳',
                  message: `Synced live revenue & payment telemetry for ${currentSelectedEvent?.name || (selectedEventId === 'all' ? 'All Events' : selectedEventId)}.`,
                });
              }}
              className="razorpay-sync-btn"
              title="Sync Live Razorpay Numbers"
            >
              <RefreshCw size={13} className={loadingPaymentStats ? 'spin' : ''} />
              <span>Sync Razorpay</span>
            </button>

            {livePaymentStats?.transactions?.length > 0 && (
              <button
                type="button"
                onClick={() => setShowLedgerModal(true)}
                className="razorpay-ledger-btn"
              >
                <span>Live Payment Ledger ({livePaymentStats.transactions.length})</span>
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 4 Financial KPI Cards */}
        <div className="razorpay-metrics-grid">
          
          {/* Total Revenue */}
          <div className="razorpay-metric-card">
            <div className="razorpay-metric-label">
              Total Live Revenue
            </div>
            <div className="razorpay-metric-value razorpay-metric-revenue">
              ₹{(livePaymentStats?.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
            <div className="razorpay-metric-subtext">
              100% captured • Instant merchant bank settlement
            </div>
          </div>

          {/* Paid Orders */}
          <div className="razorpay-metric-card">
            <div className="razorpay-metric-label">
              Paid Orders
            </div>
            <div className="razorpay-metric-value razorpay-metric-orders">
              {livePaymentStats?.paidOrdersCount || 0}
            </div>
            <div className="razorpay-metric-subtext">
              {livePaymentStats?.freePassesCount || 0} complimentary / free passes
            </div>
          </div>

          {/* Average Ticket Size */}
          <div className="razorpay-metric-card">
            <div className="razorpay-metric-label">
              Average Order Value
            </div>
            <div className="razorpay-metric-value razorpay-metric-aov">
              ₹{livePaymentStats?.averageTicketValue || 0}
            </div>
            <div className="razorpay-metric-subtext">
              Gross average per paying attendee
            </div>
          </div>

          {/* Gateway Status */}
          <div className="razorpay-metric-card">
            <div className="razorpay-metric-label">
              Gateway Engine
            </div>
            <div className="razorpay-metric-value razorpay-metric-engine">
              <CheckCircle2 size={18} className="razorpay-engine-icon" /> Connected Live
            </div>
            <div className="razorpay-metric-subtext">
              Zero-leak webhook • Instant HMAC pass issue
            </div>
          </div>

        </div>

        {/* Ticket Tier Breakdown Bar if available */}
        {livePaymentStats?.ticketBreakdown && Object.keys(livePaymentStats.ticketBreakdown).length > 0 && (
          <div className="razorpay-breakdown-bar">
            <span className="razorpay-breakdown-label">Pass Sales By Tier:</span>
            {Object.entries(livePaymentStats.ticketBreakdown).map(([tierName, data]) => (
              <span key={tierName} className="razorpay-tier-chip">
                <strong className="razorpay-tier-chip-title">{tierName}:</strong> {data.count} passes (₹{data.revenue})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard
          title="Total Registrations"
          value={stats.totalRegistrants}
          subtitle={`Intake for ${currentSelectedEvent?.name || 'active event'}`}
          icon={Users}
          color="emerald"
        />

        <StatCard
          title="Gate Checked-In"
          value={`${stats.checkedInCount} / ${stats.totalRegistrants}`}
          subtitle={`${stats.checkedInPercentage}% of total attendance verified`}
          icon={CheckCircle2}
          color="cyan"
          progress={stats.checkedInPercentage}
        />

        <StatCard
          title="Passes Dispatched"
          value={stats.emailSentCount}
          subtitle={`Sent via ${currentSelectedEvent?.organizerEmail || 'event mailer'}`}
          icon={Mail}
          color="violet"
        />

        <StatCard
          title="Pending Pass Delivery"
          value={stats.pendingEmailCount}
          subtitle="Attendees awaiting QR email pass"
          icon={Zap}
          color="amber"
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '16px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <input
              type="text"
              className="input-control"
              placeholder="Search Name, Email, Phone, Pass ID (e.g. HS26-), Team..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
            <Search size={16} color="#6b7280" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          {/* Verification Status filter */}
          <select
            className="input-control select-control"
            style={{ width: '175px' }}
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
          >
            <option value="">Verification: All</option>
            <option value="true">✅ Verified Only</option>
            <option value="false">⏳ Pending Review</option>
          </select>

          {/* Check-in filter */}
          <select
            className="input-control select-control"
            style={{ width: '160px' }}
            value={checkedInFilter}
            onChange={(e) => setCheckedInFilter(e.target.value)}
          >
            <option value="">Check-in: All</option>
            <option value="true">Checked In Only</option>
            <option value="false">Pending Gate Only</option>
          </select>

          {/* Email sent filter */}
          <select
            className="input-control select-control"
            style={{ width: '160px' }}
            value={emailSentFilter}
            onChange={(e) => setEmailSentFilter(e.target.value)}
          >
            <option value="">Email: All</option>
            <option value="true">Pass Emailed</option>
            <option value="false">Unsent Only</option>
          </select>

          {/* Dynamic Ticket Tier filter */}
          {availableTicketTiers.length > 0 && (
            <select
              className="input-control select-control"
              style={{ width: '170px' }}
              value={ticketFilter}
              onChange={(e) => setTicketFilter(e.target.value)}
            >
              <option value="all">Pass Tier: All</option>
              {availableTicketTiers.map((tier) => (
                <option key={tier} value={tier}>{tier}</option>
              ))}
            </select>
          )}

          {/* Dynamic Track / Sub-Event filter */}
          <select
            className="input-control select-control"
            style={{ width: '185px' }}
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
          >
            <option value="all">Track / Activity: All</option>
            {availableTracks.map((track) => (
              <option key={track} value={track}>{track}</option>
            ))}
          </select>

          <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '10px 16px' }}>
            <Filter size={14} /> Filter
          </button>
        </form>
      </div>

      {/* Registrant Data Table with Selection Controls */}
      <RegistrantTable
        registrants={registrants}
        pagination={pagination}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAllVisible={handleSelectAllVisible}
        onClearSelection={handleClearSelection}
        onOpenBulkEmail={() => setShowBulkEmail(true)}
        onPageChange={(p) => fetchData(p)}
        onRefresh={() => fetchData(pagination.page)}
        onViewPass={(reg) => setSelectedPassRegistrant(reg)}
        onShowToast={onShowToast}
      />

      {/* Modals */}
      {selectedPassRegistrant && (
        <PassPreviewModal
          registrant={selectedPassRegistrant}
          activeEvent={currentSelectedEvent || eventConfig}
          onClose={() => setSelectedPassRegistrant(null)}
          onShowToast={onShowToast}
          onRefresh={() => fetchData(pagination.page)}
        />
      )}

      {showExcelImport && (
        <ExcelImportModal
          isOpen={showExcelImport}
          eventId={selectedEventId}
          activeEvent={currentSelectedEvent}
          onClose={() => setShowExcelImport(false)}
          onShowToast={onShowToast}
          onRefresh={() => fetchData(pagination.page)}
        />
      )}

      {showWebhookGuide && (
        <WebhookGuideModal
          eventId={selectedEventId}
          activeEvent={currentSelectedEvent}
          onClose={() => setShowWebhookGuide(false)}
          onShowToast={onShowToast}
          onRefresh={() => fetchData(pagination.page)}
        />
      )}

      {showEmailTemplate && (
        <EmailTemplateModal
          config={eventConfig}
          activeEvent={currentSelectedEvent}
          onClose={() => setShowEmailTemplate(false)}
          onShowToast={onShowToast}
          onSaveConfig={() => api.event.getConfig().then((res) => setEventConfig(res.data))}
        />
      )}

      {showBulkEmail && (
        <BulkEmailModal
          eventId={selectedEventId}
          activeEvent={currentSelectedEvent}
          pendingCount={stats.pendingEmailCount}
          totalCount={stats.totalRegistrants}
          verifiedCount={stats.verifiedCount}
          verifiedPendingCount={stats.verifiedPendingEmailCount}
          selectedRegistrants={selectedRegistrantsList}
          onClose={() => setShowBulkEmail(false)}
          onShowToast={onShowToast}
          onRefresh={() => fetchData(pagination.page)}
          onClearSelection={handleClearSelection}
        />
      )}

      {showSuperAdminModal && (
        <SuperAdminModal
          currentUser={currentUser}
          eventConfig={eventConfig}
          activeEvent={currentSelectedEvent}
          selectedEventId={selectedEventId}
          onClose={() => setShowSuperAdminModal(false)}
          onShowToast={onShowToast}
          onRefreshData={() => {
            fetchEvents();
            fetchData(pagination.page);
          }}
          initialTab={superAdminTab}
          onNavigateToScanner={onNavigateToScanner}
          onOpenTeamModal={() => setShowTeamModal(true)}
          onOpenExcelImport={() => setShowExcelImport(true)}
          onOpenWebhookGuide={() => setShowWebhookGuide(true)}
          onOpenBulkEmail={() => setShowBulkEmail(true)}
          onOpenEmailTemplate={() => setShowEmailTemplate(true)}
          onExportCSV={handleExportCSV}
          onOpenCreateEvent={() => {
            setEditingEvent(null);
            setCreateKey((k) => k + 1);
            setShowCreateEvent(true);
          }}
          isMainBoss={isMainBoss}
          selectedCount={selectedIds.length}
        />
      )}

      {showCreateEvent && (
        <CreateEventModal
          key={editingEvent ? (editingEvent.id || editingEvent.eventId) : `create-new-${createKey}`}
          initialEvent={editingEvent}
          onClose={() => {
            setShowCreateEvent(false);
            setEditingEvent(null);
          }}
          onEventCreated={(savedEvent) => {
            fetchEvents();
            fetchPaymentStats(savedEvent?.id || savedEvent?.eventId || selectedEventId);
            if (savedEvent?.id || savedEvent?.eventId) {
              setHasUserSelectedEvent(true);
              setSelectedEventId(savedEvent.id || savedEvent.eventId);
            }
            api.event.getConfig().then((res) => {
              if (res?.data) setEventConfig(res.data);
            }).catch(() => {});
          }}
          onShowToast={onShowToast}
        />
      )}

      {showLedgerModal && (
        <LivePaymentLedgerModal
          transactions={livePaymentStats?.transactions || []}
          eventName={currentSelectedEvent?.name || selectedEventId}
          onClose={() => setShowLedgerModal(false)}
        />
      )}

      {showTeamModal && (
        <TeamManagementModal
          events={eventsList}
          onClose={() => setShowTeamModal(false)}
          onShowToast={onShowToast}
        />
      )}

      <button
        type="button"
        className="command-center-fab"
        onClick={() => {
          sounds.playClick();
          setSuperAdminTab('operations');
          setShowSuperAdminModal(true);
        }}
        aria-label="Open Operations Command Center"
        aria-keyshortcuts="Control+K Meta+K"
        title="Open Command Center (⌘K / Ctrl K)"
      >
        <Zap size={17} />
        <span>Command Center</span>
        <kbd>⌘K</kbd>
      </button>

    </div>
  );
};
