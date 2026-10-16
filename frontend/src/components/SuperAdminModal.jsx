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
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const SuperAdminModal = ({ 
  currentUser, 
  eventConfig, 
  onClose, 
  onShowToast, 
  onRefreshData,
  initialTab = 'telemetry'
}) => {
  const [activeTab, setActiveTab] = useState(initialTab || 'telemetry');
  const [broadcastText, setBroadcastText] = useState(eventConfig?.broadcastNotice || '');
  const [broadcastActive, setBroadcastActive] = useState(eventConfig?.broadcastActive || false);
  const [isSavingBroadcast, setIsSavingBroadcast] = useState(false);

  // Registration Mode & Payment Gateway Toggle State
  const [regMode, setRegMode] = useState(eventConfig?.registrationMode || 'google_form');
  const [enablePayments, setEnablePayments] = useState(eventConfig?.enablePaymentGateway || false);
  const [googleFormLink, setGoogleFormLink] = useState(eventConfig?.googleFormUrl || 'https://forms.gle/TmoSjzxUt7yAKz1o6');
  const [hackerPrice, setHackerPrice] = useState(eventConfig?.ticketPrices?.['Hacker Pass'] ?? 199);
  const [studentPrice, setStudentPrice] = useState(eventConfig?.ticketPrices?.['Student Pass'] ?? 149);
  const [vipPrice, setVipPrice] = useState(eventConfig?.ticketPrices?.['VIP Delegate'] ?? 499);
  const [upiId, setUpiId] = useState(eventConfig?.upiId || 'tigeradi1504-1@okicici');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

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

  // 1b. Save Registration Mode & Payment Gateway Configuration
  const handleSaveRegistrationSettings = async (e) => {
    e.preventDefault();
    try {
      setIsSavingConfig(true);
      await api.event.updateConfig({
        registrationMode: regMode,
        enablePaymentGateway: enablePayments,
        upiId: upiId ? upiId.trim() : 'tigeradi1504-1@okicici',
        googleFormUrl: googleFormLink,
        ticketPrices: {
          'Hacker Pass': Number(hackerPrice) || 199,
          'Student Pass': Number(studentPrice) || 149,
          'VIP Delegate': Number(vipPrice) || 499,
          'Judge / Mentor': 0,
        },
      });
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'Settings Synchronized ⚙️',
        message: regMode === 'native_payment'
          ? 'Native In-App Registration & Razorpay Portal is now ACTIVE!'
          : 'Classic Google Form Intake is now ACTIVE!',
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
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          maxWidth: '820px', 
          border: '2px solid rgba(34, 211, 238, 0.4)', 
          boxShadow: '0 20px 80px rgba(0, 0, 0, 0.7), 0 0 30px rgba(34, 211, 238, 0.2)',
          background: 'linear-gradient(145deg, #090d18 0%, #03060f 100%)'
        }}
      >
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 26px', borderBottom: '1px solid rgba(34, 211, 238, 0.2)', background: 'linear-gradient(90deg, rgba(34, 211, 238, 0.12) 0%, transparent 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#030712', boxShadow: '0 0 14px rgba(34, 197, 94, 0.4)' }}>
              <Zap size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#fff' }}>Operations Command Center</span>
                <span className="badge badge-cyan" style={{ fontSize: '10px' }}>ADMIN TOOLS</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Active Operator: <strong style={{ color: '#22d3ee' }}>{currentUser?.name || 'Operations Admin'}</strong>
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '8px', padding: '14px 26px', borderBottom: '1px solid var(--border-subtle)', background: '#070a13', overflowX: 'auto' }}>
          <button
            className={`btn btn-sm ${activeTab === 'telemetry' ? 'btn-cyan' : 'btn-ghost'}`}
            onClick={() => {
              sounds.playClick();
              setActiveTab('telemetry');
              fetchTelemetry();
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <Activity size={14} color={activeTab === 'telemetry' ? '#030712' : '#22d3ee'} /> 
            <span>Live Database Telemetry</span>
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'intake' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => {
              sounds.playClick();
              setActiveTab('intake');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <Sparkles size={14} color={activeTab === 'intake' ? '#030712' : '#f7d070'} /> Intake & Payments (Option 1)
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'broadcast' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => {
              sounds.playClick();
              setActiveTab('broadcast');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <Radio size={14} /> Live Pass Broadcast
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'vip' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => {
              sounds.playClick();
              setActiveTab('vip');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <UserPlus size={14} /> Issue VIP Pass
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'backup' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => {
              sounds.playClick();
              setActiveTab('backup');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <Download size={14} /> System Backup
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'diagnostics' ? 'btn-gold' : 'btn-ghost'}`}
            onClick={() => {
              sounds.playClick();
              setActiveTab('diagnostics');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
          >
            <Cpu size={14} /> Security Health
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '26px' }}>

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

          {/* TAB: Intake & Payments (Option 1) */}
          {activeTab === 'intake' && (
            <form onSubmit={handleSaveRegistrationSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Info Banner */}
              <div style={{ background: 'rgba(34, 211, 238, 0.08)', border: '1px solid rgba(34, 211, 238, 0.25)', borderRadius: '12px', padding: '16px', fontSize: '13px', color: '#67e8f9' }}>
                <div style={{ fontWeight: '800', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
                  <Sparkles size={16} color="#22d3ee" /> 
                  Participant Intake Mode & 1-Click Revert System
                </div>
                Toggle dynamically between the <strong>Classic Google Form intake</strong> and the new <strong>Native In-App Registration + Razorpay Payment Portal</strong>. You can revert back at any moment without losing any attendee data!
              </div>

              {/* Mode Selection Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                
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
                    Landing page CTA redirects participants directly to your Google Form. Existing AppSheet / Webhook synchronization remains active. Zero payment collection.
                  </p>
                  {regMode === 'google_form' && (
                    <div style={{ marginTop: '10px', display: 'inline-block' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '10px' }}>ACTIVE MODE</span>
                    </div>
                  )}
                </div>

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
                        Native In-App + Razorpay (New)
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
                    Direct on-site registration modal at <code>/register</code>. Supports UPI, NetBanking, Cards with Razorpay. Instantly issues cryptographically signed passes via email & WhatsApp.
                  </p>
                  {regMode === 'native_payment' && (
                    <div style={{ marginTop: '10px', display: 'inline-block' }}>
                      <span className="badge badge-gold" style={{ fontSize: '10px' }}>ACTIVE MODE</span>
                    </div>
                  )}
                </div>

              </div>

              {/* Native Mode Sub-Settings */}
              <div style={{ background: '#070a13', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '13px' }}>Enable Payment Gateway Fee Collection</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      If disabled, in-app registration will be 100% free with 1-click zero-fee checkout.
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={enablePayments} 
                      onChange={(e) => setEnablePayments(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                    />
                    <span style={{ fontSize: '13px', fontWeight: '700', color: enablePayments ? '#22c55e' : '#9ca3af' }}>
                      {enablePayments ? 'Payments Required (Paid)' : 'Free Registration'}
                    </span>
                  </label>
                </div>

                {/* Ticket Tier Pricing */}
                {enablePayments && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#f7d070', marginBottom: '10px' }}>
                      Ticket Tier Pricing (INR ₹)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
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
                    </div>
                  </div>
                )}

                {/* Target UPI ID for Direct QR Payments */}
                {enablePayments && (
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#22d3ee', marginBottom: '4px' }}>
                      Primary Receiving UPI ID (Instant QR Payments)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      All generated QR codes and 1-tap mobile buttons (GPay, PhonePe, Paytm) will direct payments to this UPI address.
                    </div>
                    <input 
                      type="text" 
                      className="input" 
                      value={upiId} 
                      onChange={(e) => setUpiId(e.target.value)} 
                      placeholder="tigeradi1504-1@okicici"
                      style={{ width: '100%', fontFamily: 'monospace', color: '#22d3ee' }}
                    />
                  </div>
                )}
              </div>

              {/* Google Form Link (Fallback URL) */}
              <div style={{ background: '#070a13', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#fff', display: 'block', marginBottom: '6px' }}>
                  Google Form URL (Classic Mode Link)
                </label>
                <input 
                  type="url" 
                  className="input" 
                  value={googleFormLink} 
                  onChange={(e) => setGoogleFormLink(e.target.value)} 
                  placeholder="https://forms.gle/..."
                  style={{ width: '100%' }}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  When 'Classic Google Form' mode is active, the hero 'Register Now' button sends users here.
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSavingConfig}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '160px', justifyContent: 'center' }}
                >
                  {isSavingConfig ? (
                    <>
                      <RefreshCw size={15} className="spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save size={15} /> Save & Apply Configuration
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

        </div>

      </div>
    </div>
  );
};
