import React, { useState, useEffect, useCallback } from 'react';
import { 
  QrCode, 
  Clock, 
  History, 
  RotateCcw,
  CalendarDays
} from 'lucide-react';
import { QRScanner } from '../components/QRScanner';
import { api } from '../services/api';
import { getEventDayCount, getEventDayLabel } from '../utils/eventDays';

export const ScannerPage = ({ onShowToast }) => {
  const [recentScans, setRecentScans] = useState([]);
  const [activeEventName, setActiveEventName] = useState('Eventra');
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEventDay, setSelectedEventDay] = useState(1);

  const selectedEvent = events.find((event) => (event.id || event.eventId) === selectedEventId);
  const eventDayCount = getEventDayCount(selectedEvent);
  const selectedEventDayLabel = getEventDayLabel(selectedEvent, selectedEventDay);

  const fetchRecentScans = useCallback(async () => {
    try {
      const res = await api.checkin.getRecent();
      setRecentScans(res.data || []);
    } catch (err) {
      console.warn('Failed to load recent scans:', err);
    }
  }, []);

  useEffect(() => {
    fetchRecentScans();
    Promise.allSettled([api.events.getAll(), api.event.getConfig()]).then(([eventsResult, configResult]) => {
      const fetchedEvents = eventsResult.status === 'fulfilled' ? (eventsResult.value?.data || []) : [];
      const config = configResult.status === 'fulfilled' ? (configResult.value?.data || {}) : {};
      setEvents(fetchedEvents);

      const preferredId = config.activeEventId;
      const initialEvent = fetchedEvents.find((event) => (event.id || event.eventId) === preferredId)
        || fetchedEvents.find((event) => event.isFlagship)
        || fetchedEvents[0];

      if (initialEvent) {
        setSelectedEventId(initialEvent.id || initialEvent.eventId);
        setActiveEventName(initialEvent.name || config.eventName || 'Eventra');
      } else if (config.eventName) {
        setActiveEventName(config.eventName);
      }
    });
  }, [fetchRecentScans]);

  useEffect(() => {
    if (selectedEvent) setActiveEventName(selectedEvent.name || 'Eventra');
    setSelectedEventDay(1);
  }, [selectedEventId]);

  const handleScanCompleted = () => {
    fetchRecentScans();
  };

  const handleUndo = async (item) => {
    try {
      await api.checkin.undo(item.uniqueId || item._id, item.eventDay);
      onShowToast({
        type: 'info',
        title: 'Check-in Reverted',
        message: `Reverted check-in for ${item.name}`,
      });
      fetchRecentScans();
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Undo Failed',
        message: err.message,
      });
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <img 
          src="/eventra-logo.svg" 
          alt="Eventra" 
          style={{ height: '40px', width: 'auto', margin: '0 auto 14px auto', display: 'block' }} 
        />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(90deg, rgba(80, 101, 246, 0.15) 0%, rgba(34, 211, 238, 0.15) 100%)', border: '1px solid rgba(168, 180, 255, 0.35)', borderRadius: '999px', padding: '4px 16px', fontSize: '11px', color: '#a8b4ff', fontWeight: '800', marginBottom: '12px' }}>
          <QrCode size={13} color="#22d3ee" /> EVENTRA GATE ENTRY SCANNER • LIVE OPERATIONAL TERMINAL
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#fff', letterSpacing: '-0.5px' }}>
          {activeEventName} Check-in Terminal
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Official Event Gates • Live anti-forgery cryptographic QR verification
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '28px', alignItems: 'flex-start' }}>
        
        {/* Left Column: Live Camera Scanner */}
        <div>
          <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', letterSpacing: '0.4px' }}>
                EVENT
                <select
                  className="input-control select-control"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  disabled={!events.length}
                >
                  {events.length === 0 && <option value="">Loading events…</option>}
                  {events.map((event) => {
                    const eventId = event.id || event.eventId;
                    return <option key={eventId} value={eventId}>{event.name}</option>;
                  })}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', letterSpacing: '0.4px' }}>
                EVENT DAY · {eventDayCount} {eventDayCount === 1 ? 'DAY' : 'DAYS'}
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarDays size={16} color="#22d3ee" />
                  <select
                    className="input-control select-control"
                    value={selectedEventDay}
                    onChange={(e) => setSelectedEventDay(Number(e.target.value))}
                    disabled={!selectedEventId}
                  >
                    {Array.from({ length: eventDayCount }, (_, index) => index + 1).map((day) => (
                      <option key={day} value={day}>{getEventDayLabel(selectedEvent, day)}</option>
                    ))}
                  </select>
                </span>
              </label>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '9px' }}>
              The selected day is recorded separately, so the same pass can be scanned again on another event day.
            </div>
          </div>

          <QRScanner
            onScanComplete={handleScanCompleted}
            onShowToast={onShowToast}
            eventId={selectedEventId}
            eventName={selectedEvent?.name || activeEventName}
            eventDay={selectedEventDay}
            eventDayLabel={selectedEventDayLabel}
          />
        </div>

        {/* Right Column: Live Recent Check-Ins Feed */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={16} color="#22c55e" />
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Recent Gate Scans</span>
            </div>
            <span className="badge badge-emerald">{recentScans.length} Checked In</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
            {recentScans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-dim)', fontSize: '13px' }}>
                <Clock size={32} style={{ opacity: 0.3, margin: '0 auto 8px auto' }} />
                <div>No scans recorded yet today.</div>
                <div style={{ fontSize: '11px', marginTop: '4px' }}>Scanned passes will appear here in real-time.</div>
              </div>
            ) : (
              recentScans.map((item) => (
                <div
                  key={`${item.uniqueId || item._id}-${item.eventDay || 'legacy'}`}
                  style={{
                    background: '#0b0f19',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '13px' }}>{item.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#22c55e', marginTop: '1px' }}>
                      {item.uniqueId}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                      {events.find((event) => (event.id || event.eventId) === item.eventId)?.name
                        ? `${events.find((event) => (event.id || event.eventId) === item.eventId).name} · `
                        : ''}
                      {item.eventDayLabel || 'Day 1'} · Checked in at {item.checkedInAt ? new Date(item.checkedInAt).toLocaleTimeString() : '—'} by {item.checkedInBy || 'Gate Staff'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-emerald" style={{ fontSize: '10px' }}>
                      {item.ticketType || 'Standard Pass'}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleUndo(item)}
                      title={`Undo ${item.eventDayLabel || 'this day'} check-in for this pass`}
                      style={{ padding: '6px', color: '#f87171' }}
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
