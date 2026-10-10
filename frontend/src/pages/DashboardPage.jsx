import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  CheckCircle2, 
  Mail, 
  Percent, 
  Search, 
  Filter, 
  RefreshCw, 
  FileSpreadsheet, 
  Send, 
  Sliders, 
  Download,
  Zap,
  ShieldCheck,
  QrCode,
  CheckSquare,
  Crown,
  Sparkles
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
import { sounds } from '../utils/soundEffects';

const CACHE_KEY_DASHBOARD = 'hs26_cached_dashboard_state';

const getInitialCachedData = () => {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY_DASHBOARD);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

export const DashboardPage = ({ onShowToast, onNavigateToScanner }) => {
  const cachedInitial = getInitialCachedData();

  // Multi-Event State
  const [eventsList, setEventsList] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('hackseries-2026');
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);

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
  const [eventConfig, setEventConfig] = useState(cachedInitial?.eventConfig || null);

  // Fetch Events Catalog
  const fetchEvents = useCallback(async () => {
    try {
      const res = await api.events.getAll();
      setEventsList(res.data || []);
    } catch (e) {
      console.warn('fetchEvents error:', e);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

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

        // Update instant local session cache
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

  // Initial and reactive fetch on filter change or event change
  useEffect(() => {
    fetchData(1, registrants.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkedInFilter, emailSentFilter, verifiedFilter, trackFilter, ticketFilter, selectedEventId]);

  // Live Auto-Polling (Pulls new submissions into dashboard every 4 seconds)
  useEffect(() => {
    const pollTimer = setInterval(() => {
      fetchData(pagination.page, true);
    }, 4000);
    return () => clearInterval(pollTimer);
  }, [fetchData, pagination.page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData(1);
  };

  const handleExportCSV = () => {
    sounds.playClick();
    window.location.href = api.registrants.exportCSVUrl();
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
    adminDisplayName = 'Aditya Renake (Main Event Organizer 👑)';
  } else if (!adminDisplayName) {
    adminDisplayName = 'Operations Admin';
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      
      {/* Header Title & Top Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>Club Operations Control Room</h1>
            
            {/* Multi-Event Selector Dropdown */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#0b0f19', border: '1px solid rgba(209, 165, 80, 0.4)', borderRadius: '9999px', padding: '3px 10px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#f7d070', textTransform: 'uppercase' }}>Active Event:</span>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  sounds.playClick();
                  setSelectedEventId(e.target.value);
                  setSelectedIds([]);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '12px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                {eventsList.map((ev) => (
                  <option key={ev.id || ev.eventId} value={ev.id || ev.eventId} style={{ background: '#0b0f19', color: '#fff' }}>
                    {ev.name} ({ev.category})
                  </option>
                ))}
              </select>
            </div>

            {isMainBoss ? (
              <span className="badge badge-gold" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', boxShadow: '0 0 10px rgba(247, 208, 112, 0.3)' }}>
                <Crown size={12} color="#f7d070" /> MAIN EVENT ORGANIZER (ROOT)
              </span>
            ) : (
              <span className="badge badge-cyan">SUB-EVENT HEAD</span>
            )}
            <span className="badge badge-dyp">ACES • DIT PUNE</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Multi-Event Campus Engine • Live Google Forms Sync • Express Gate Check-In • Role-Based Delegation
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          {/* + Launch Event */}
          {isMainBoss && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                sounds.playClick();
                setShowCreateEvent(true);
              }}
              style={{
                background: 'linear-gradient(135deg, #b22b2f 0%, #7a1518 100%)',
                border: '1px solid rgba(247, 208, 112, 0.4)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={14} color="#f7d070" />
              <span>+ Launch Event</span>
            </button>
          )}

          {/* Team & Roles (EXCLUSIVE TO MAIN EVENT ORGANIZER / ADITYA RENAKE) */}
          {isMainBoss && (
            <button
              className="btn btn-cyan btn-sm"
              onClick={() => {
                sounds.playClick();
                setShowTeamModal(true);
              }}
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(209, 165, 80, 0.25) 100%)',
                border: '1px solid rgba(209, 165, 80, 0.5)',
                color: '#f7d070',
                fontWeight: '800',
              }}
            >
              <Crown size={14} color="#f7d070" /> Team & Roles (Boss)
            </button>
          )}

          {onNavigateToScanner && (
            <button className="btn btn-cyan btn-sm" onClick={onNavigateToScanner}>
              <QrCode size={14} /> Gate Scanner
            </button>
          )}

          <button 
            className="btn btn-secondary btn-sm" 
            onClick={() => {
              sounds.playClick();
              setShowExcelImport(true);
            }}
            style={{
              border: '1px solid rgba(34, 197, 94, 0.4)',
              background: 'rgba(34, 197, 94, 0.08)',
              color: '#4ade80'
            }}
          >
            <FileSpreadsheet size={15} /> Import Excel / CSV
          </button>

          {isMainBoss && (
            <button className="btn btn-secondary btn-sm" onClick={() => setShowWebhookGuide(true)}>
              <FileSpreadsheet size={15} color="#22c55e" /> Google Sheet Webhook Script
            </button>
          )}

          {/* Bulk Email button with selected counter badge */}
          <button 
            className="btn btn-primary btn-sm" 
            onClick={() => {
              sounds.playClick();
              setShowBulkEmail(true);
            }}
            style={{
              background: selectedIds.length > 0 ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : undefined,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Send size={14} /> 
            <span>{selectedIds.length > 0 ? `Email Selected (${selectedIds.length})` : 'Bulk Email Passes'}</span>
          </button>

          <button className="btn btn-secondary btn-sm" onClick={() => setShowEmailTemplate(true)}>
            <Sliders size={14} /> Email Template
          </button>

          <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
            <Download size={14} /> Export CSV
          </button>

          <button className="btn btn-ghost btn-sm" onClick={() => fetchData(pagination.page)} title="Refresh Data">
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Personalized Admin Greeting Banner (Uniform for All Admins) */}
      <div style={{
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
                Welcome back, {adminDisplayName}! 👋
              </span>
              <span className="badge badge-cyan" style={{ fontSize: '10px', padding: '3px 8px' }}>
                OPERATIONS ADMIN
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Live Google Forms Sync • Real-Time Gate Check-In & Attendee Pass Management
            </div>
          </div>
        </div>

        {/* Operations Command & Live Database Telemetry Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              sounds.playClick();
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
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <StatCard
          title="Total Registrations"
          value={stats.totalRegistrants}
          subtitle="Real-time Google Form intake"
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
          subtitle="Sent via tigeradi1504@gmail.com"
          icon={Mail}
          color="violet"
        />

        <StatCard
          title="Pending Pass Delivery"
          value={stats.pendingEmailCount}
          subtitle="Hackers awaiting QR email pass"
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

          {/* Track filter */}
          <select
            className="input-control select-control"
            style={{ width: '180px' }}
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
          >
            <option value="all">Track: All</option>
            <option value="AI & Agentic Systems">AI & Agentic Systems</option>
            <option value="Cybersecurity & Privacy">Cybersecurity & Privacy</option>
            <option value="Web3 & Decentralized">Web3 & Decentralized</option>
            <option value="Fintech & Open Finance">Fintech & Open Finance</option>
            <option value="Open Innovation">Open Innovation</option>
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
          onClose={() => setSelectedPassRegistrant(null)}
          onShowToast={onShowToast}
          onRefresh={() => fetchData(pagination.page)}
        />
      )}

      {showExcelImport && (
        <ExcelImportModal
          isOpen={showExcelImport}
          onClose={() => setShowExcelImport(false)}
          onShowToast={onShowToast}
          onRefresh={() => fetchData(pagination.page)}
        />
      )}

      {showWebhookGuide && (
        <WebhookGuideModal
          onClose={() => setShowWebhookGuide(false)}
          onShowToast={onShowToast}
          onRefresh={() => fetchData(pagination.page)}
        />
      )}

      {showEmailTemplate && (
        <EmailTemplateModal
          config={eventConfig}
          onClose={() => setShowEmailTemplate(false)}
          onShowToast={onShowToast}
          onSaveConfig={() => api.event.getConfig().then((res) => setEventConfig(res.data))}
        />
      )}

      {showBulkEmail && (
        <BulkEmailModal
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
          onClose={() => setShowSuperAdminModal(false)}
          onShowToast={onShowToast}
          onRefreshData={() => {
            fetchData(pagination.page);
            api.event.getConfig().then((res) => setEventConfig(res.data)).catch(() => {});
          }}
        />
      )}

      {showCreateEvent && (
        <CreateEventModal
          onClose={() => setShowCreateEvent(false)}
          onEventCreated={(newEvent) => {
            fetchEvents();
            if (newEvent?.id || newEvent?.eventId) {
              setSelectedEventId(newEvent.id || newEvent.eventId);
            }
          }}
          onShowToast={onShowToast}
        />
      )}

      {showTeamModal && (
        <TeamManagementModal
          events={eventsList}
          onClose={() => setShowTeamModal(false)}
          onShowToast={onShowToast}
        />
      )}

    </div>
  );
};
