import React, { useEffect, useRef, useState } from 'react';
const getHtml5Qrcode = () => window.Html5Qrcode;
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ShieldCheck, 
  Zap, 
  Search, 
  RefreshCw,
  User,
  Users,
  Building2,
  X,
  Clock,
  ArrowRight,
  Sparkles,
  Smartphone,
  Mail,
  MessageSquare
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';
import { triggerCelebration } from '../utils/confettiBurst';

export const QRScanner = ({ onScanComplete, onShowToast }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [popupModalResult, setPopupModalResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const html5QrCodeRef = useRef(null);
  const isScannerPausedRef = useRef(false);
  const scannerContainerId = 'hackseries-qr-reader';

  // Fetch available cameras
  useEffect(() => {
    const H5 = window.Html5Qrcode || getHtml5Qrcode();
    if (H5 && H5.getCameras) {
      H5.getCameras()
        .then((devices) => {
          if (devices && devices.length) {
            setCameras(devices);
            // Prefer back camera on mobile devices
            const backCam = devices.find((d) => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('environment') ||
              d.label.toLowerCase().includes('rear')
            );
            setSelectedCamera(backCam ? backCam.id : devices[0].id);
          }
        })
        .catch((err) => {
          console.warn('Could not enumerate cameras:', err);
        });
    }

    return () => {
      stopScanner();
    };
  }, []);

  // Keyboard shortcut listener to quickly close popup modal and scan next
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (popupModalResult && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) {
        e.preventDefault();
        handleClosePopupAndScanNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [popupModalResult]);

  const startScanner = async () => {
    if (!selectedCamera) {
      sounds.playError();
      onShowToast({ type: 'error', title: 'Camera Error', message: 'No camera device selected or available.' });
      return;
    }

    try {
      sounds.playClick();
      const H5 = window.Html5Qrcode || getHtml5Qrcode();
      if (!html5QrCodeRef.current && H5) {
        html5QrCodeRef.current = new H5(scannerContainerId);
      }

      setIsScanning(true);
      isScannerPausedRef.current = false;
      setPopupModalResult(null);

      await html5QrCodeRef.current.start(
        selectedCamera,
        {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          // On QR scanned: pause scanner immediately and process
          if (!isProcessing && !isScannerPausedRef.current) {
            handleProcessScan(decodedText);
          }
        },
        (errorMessage) => {
          // Frame parse error (ignore frame ticks)
        }
      );
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setIsScanning(false);
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Scanner Failed',
        message: 'Could not access camera. Please check permissions.',
      });
    }
  };

  const stopScanner = async () => {
    sounds.playClick();
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        setIsScanning(false);
        isScannerPausedRef.current = false;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  // Process Scanned QR or Manual Input
  const handleProcessScan = async (codeString) => {
    if (!codeString || isProcessing) return;
    setIsProcessing(true);

    // 1. Capture live camera snapshot of attendee
    let livePhoto = null;
    try {
      const videoEl = document.querySelector('#qr-reader video');
      if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(videoEl.videoWidth, 640);
        canvas.height = Math.round((canvas.width / videoEl.videoWidth) * videoEl.videoHeight);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        livePhoto = canvas.toDataURL('image/jpeg', 0.82);
      }
    } catch (photoErr) {
      console.warn('Could not capture frame snapshot:', photoErr);
    }

    // 2. Play scan beep and pause camera scanner immediately so user only scans once
    sounds.playScanBeep();
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        html5QrCodeRef.current.pause(true);
        isScannerPausedRef.current = true;
      } catch (pauseErr) {
        console.warn('Could not pause scanner:', pauseErr);
      }
    }

    try {
      const user = api.auth.getUser();
      const staffName = user ? user.name : 'Gate Scanner';

      const response = await api.checkin.scan({
        qrPayload: codeString,
        photo: livePhoto,
        scannedBy: staffName,
      });

      if (response.status === 'SUCCESS') {
        sounds.playSuccess();
        triggerCelebration();

        setPopupModalResult({
          type: 'success',
          status: 'SUCCESS',
          title: 'ACCESS GRANTED ✅',
          subtitle: 'Verified Official HackSeries Entry Pass',
          message: response.message,
          attendee: response.registrant,
          timestamp: new Date().toLocaleTimeString(),
        });
      } else if (response.status === 'ALREADY_CHECKED_IN') {
        sounds.playWarning();
        setPopupModalResult({
          type: 'warning',
          status: 'ALREADY_CHECKED_IN',
          title: 'ALREADY CHECKED IN ⚠️',
          subtitle: 'Duplicate QR Pass Warning',
          message: response.message,
          attendee: response.registrant,
          checkedInAt: response.checkedInAt ? new Date(response.checkedInAt).toLocaleTimeString() : 'Earlier today',
          checkedInBy: response.checkedInBy || 'Gate Scanner',
          timestamp: new Date().toLocaleTimeString(),
        });
      }

      if (onScanComplete) onScanComplete(response);
    } catch (err) {
      sounds.playError();
      const isForged = err.message.toLowerCase().includes('forger') || err.message.toLowerCase().includes('signature');
      setPopupModalResult({
        type: 'error',
        status: 'ERROR',
        isForged,
        title: isForged ? '🚫 SECURITY ALERT: FORGED QR' : 'INVALID PASS ❌',
        subtitle: isForged ? 'Cryptographic Signature Mismatch' : 'Record Not Found',
        message: err.message || 'Pass ID not found in HackSeries database.',
        scannedCode: codeString,
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Close the popup modal and resume scanning for the next attendee
  const handleClosePopupAndScanNext = () => {
    sounds.playClick();
    setPopupModalResult(null);

    // Resume camera scanner
    if (html5QrCodeRef.current && isScannerPausedRef.current) {
      try {
        html5QrCodeRef.current.resume();
        isScannerPausedRef.current = false;
      } catch (resumeErr) {
        console.warn('Could not resume scanner, restarting:', resumeErr);
        startScanner();
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleProcessScan(manualCode.trim());
      setManualCode('');
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      
      {/* Top Banner Anti-Forgery Verification */}
      <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={20} color="#22c55e" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#22c55e', letterSpacing: '0.5px' }}>ZERO-FORGERY QR VERIFICATION ACTIVE</div>
            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>HMAC-SHA256 Cryptographic Pass Integrity Engine</div>
          </div>
        </div>
        <span className="badge badge-emerald">GATE READY</span>
      </div>

      {/* Camera Selection & Controls */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select
            className="input-control select-control"
            style={{ flex: 1, minWidth: '200px' }}
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            disabled={isScanning}
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                📷 {c.label || `Camera ${c.id}`}
              </option>
            ))}
          </select>

          {isScanning ? (
            <button className="btn btn-danger" onClick={stopScanner}>
              <CameraOff size={16} /> Stop Camera
            </button>
          ) : (
            <button className="btn btn-primary" onClick={startScanner}>
              <Camera size={16} /> Start Camera Scanner
            </button>
          )}
        </div>

        {/* Viewfinder with Laser */}
        <div className="scanner-viewport" style={{ minHeight: isScanning ? '320px' : '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div id={scannerContainerId} style={{ width: '100%' }}></div>
          
          {isScanning && <div className="scanner-laser"></div>}

          {!isScanning && (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-dim)' }}>
              <Camera size={44} style={{ opacity: 0.3, marginBottom: '10px' }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-muted)' }}>Camera Viewfinder Standby</div>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>Click "Start Camera Scanner" or use manual ID entry below</p>
            </div>
          )}
        </div>

        {/* Manual ID Input Fallback */}
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <input
            type="text"
            className="input-control"
            placeholder="Type Pass ID (e.g. HS26-8A3F1B) or Attendee Email..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)' }}
          />
          <button type="submit" className="btn btn-dyp" disabled={!manualCode.trim() || isProcessing}>
            <Search size={15} /> Check In
          </button>
        </form>
      </div>

      {/* POPUP MODAL ON SCANNED QR */}
      {popupModalResult && (
        <div 
          className="modal-overlay" 
          style={{ zIndex: 3500, background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(10px)' }}
          onClick={handleClosePopupAndScanNext}
        >
          <div 
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '520px',
              border: `2px solid ${
                popupModalResult.type === 'success' 
                  ? '#22c55e' 
                  : popupModalResult.type === 'warning' 
                  ? '#f59e0b' 
                  : '#ef4444'
              }`,
              boxShadow: `0 20px 60px ${
                popupModalResult.type === 'success'
                  ? 'rgba(34, 197, 94, 0.35)'
                  : popupModalResult.type === 'warning'
                  ? 'rgba(245, 158, 11, 0.35)'
                  : 'rgba(239, 68, 68, 0.35)'
              }`,
              padding: '0',
              overflow: 'hidden'
            }}
          >
            
            {/* Modal Header */}
            <div 
              style={{
                padding: '20px 24px',
                background: popupModalResult.type === 'success'
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)'
                  : popupModalResult.type === 'warning'
                  ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2) 0%, rgba(178, 43, 47, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(0, 0, 0, 0.4) 100%)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {popupModalResult.type === 'success' && <CheckCircle2 size={36} color="#22c55e" />}
                {popupModalResult.type === 'warning' && <AlertTriangle size={36} color="#f59e0b" />}
                {popupModalResult.type === 'error' && <ShieldAlert size={36} color="#ef4444" />}
                
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: popupModalResult.type === 'success' ? '#4ade80' : popupModalResult.type === 'warning' ? '#fbbf24' : '#f87171' }}>
                    {popupModalResult.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {popupModalResult.subtitle} • {popupModalResult.timestamp}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleClosePopupAndScanNext}
                className="btn btn-ghost btn-sm"
                style={{ padding: '6px', borderRadius: '50%', color: '#fff' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              
              {popupModalResult.attendee ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Attendee Name & Pass ID Banner */}
                  <div style={{ background: '#0b0f19', padding: '18px', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '24px', fontWeight: '900', color: '#ffffff' }}>
                          {popupModalResult.attendee.name}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {popupModalResult.attendee.email}
                        </div>
                      </div>
                      <span className="badge badge-emerald" style={{ fontSize: '11px', padding: '4px 10px' }}>
                        {popupModalResult.attendee.ticketType}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: '#f7d070', fontWeight: '800' }}>
                        {popupModalResult.attendee.uniqueId}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10b981', fontWeight: '700' }}>
                        <ShieldCheck size={13} /> HMAC VERIFIED
                      </div>
                    </div>
                  </div>

                  {/* Live Photo Verification Snapshot */}
                  {popupModalResult.attendee.checkedInPhoto && (
                    <div style={{ background: '#090d18', padding: '14px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <img
                        src={popupModalResult.attendee.checkedInPhoto}
                        alt="Live Gate Entry Snapshot"
                        style={{
                          width: '72px',
                          height: '72px',
                          borderRadius: '10px',
                          objectFit: 'cover',
                          border: '2px solid #22c55e',
                          boxShadow: '0 4px 14px rgba(34, 197, 94, 0.35)'
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '800', color: '#4ade80' }}>
                          <Camera size={14} />
                          <span>Live Gate Photo Captured</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Embedded in confirmation email & recorded in Operations Dashboard.
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Team & Track Details */}
                  {(popupModalResult.attendee.teamName || popupModalResult.attendee.track || popupModalResult.attendee.college) && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      {popupModalResult.attendee.teamName && (
                        <div style={{ background: '#0d121f', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase' }}>TEAM</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#22d3ee', marginTop: '2px' }}>
                            {popupModalResult.attendee.teamName}
                          </div>
                        </div>
                      )}

                      {popupModalResult.attendee.track && (
                        <div style={{ background: '#0d121f', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase' }}>TRACK</div>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#f7d070', marginTop: '2px' }}>
                            {popupModalResult.attendee.track}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Auto-Dispatched Email & WhatsApp Alert Banner */}
                  {popupModalResult.status === 'SUCCESS' && (
                    <div style={{ background: '#070b14', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#4ade80' }}>
                          <Mail size={15} />
                          <span>Check-in email auto-sent to <strong>{popupModalResult.attendee.email}</strong></span>
                        </div>
                        <span className="badge badge-emerald" style={{ fontSize: '10px' }}>AUTO-DELIVERED</span>
                      </div>

                      {/* WhatsApp Direct Action */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          📱 Lead Operations Dispatch: <strong>Aditya Renake</strong> (9890829874)
                        </div>
                        <a
                          href={(() => {
                            const rawPhone = popupModalResult.attendee.phone || '';
                            const digits = rawPhone.replace(/\D/g, '');
                            const waPhone = digits.length === 10 ? `91${digits}` : digits;
                            const waText = encodeURIComponent(
                              `🎉 *Welcome to HackSeries 2026!* ✅\n\nHey *${popupModalResult.attendee.name}*, your gate entry pass (*${popupModalResult.attendee.uniqueId}*) has been verified at Dr. D. Y. Patil Institute of Technology (DIT), Pune!\n\n📶 *WiFi:* DIT_HACKSERIES_GUEST (Pass: HackSeries@2026)\n👕 *Swag Kit & Food Coupon:* Collect at Desk 2\n🎟️ *Live Pass & Schedule:* ${window.location.origin}/pass/${popupModalResult.attendee.uniqueId}\n\nLead Operations: *Aditya Renake* (+91 9890829874)`
                            );
                            return waPhone ? `https://api.whatsapp.com/send?phone=${waPhone}&text=${waText}` : `https://wa.me/?text=${waText}`;
                          })()}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{
                            background: 'rgba(37, 211, 102, 0.15)',
                            border: '1px solid rgba(37, 211, 102, 0.4)',
                            color: '#4ade80',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '700',
                            gap: '6px',
                            textDecoration: 'none'
                          }}
                        >
                          <MessageSquare size={13} color="#25D366" />
                          <span>{popupModalResult.attendee.phone ? `Send WhatsApp to ${popupModalResult.attendee.phone}` : 'Share WhatsApp Alert'}</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Duplicate warning details */}
                  {popupModalResult.status === 'ALREADY_CHECKED_IN' && (
                    <div style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '12px 16px', borderRadius: '10px', fontSize: '12px', color: '#fde68a' }}>
                      <strong>⚠️ Already Checked In:</strong> {popupModalResult.checkedInAt} by {popupModalResult.checkedInBy}
                    </div>
                  )}

                </div>
              ) : (
                /* Error details */
                <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '16px', borderRadius: '12px', fontSize: '13px', color: '#fca5a5' }}>
                  <div style={{ fontWeight: '800', marginBottom: '4px' }}>Scan Rejected:</div>
                  <div>{popupModalResult.message}</div>
                  {popupModalResult.scannedCode && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', marginTop: '8px', color: '#ffffff', wordBreak: 'break-all' }}>
                      Payload: {popupModalResult.scannedCode}
                    </div>
                  )}
                </div>
              )}

              {/* Action Button: Close & Scan Next QR Code */}
              <div style={{ marginTop: '24px' }}>
                <button
                  onClick={handleClosePopupAndScanNext}
                  className="btn"
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    fontSize: '15px',
                    fontWeight: '900',
                    background: popupModalResult.type === 'success'
                      ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                      : popupModalResult.type === 'warning'
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                      : '#ef4444',
                    color: '#ffffff',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    borderRadius: '10px',
                    letterSpacing: '0.3px'
                  }}
                >
                  <span>Close & Scan Next QR Code</span>
                  <ArrowRight size={18} />
                </button>
                <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px' }}>
                  Press <kbd style={{ background: '#1e2638', padding: '2px 6px', borderRadius: '4px', color: '#fff' }}>Space</kbd> or <kbd style={{ background: '#1e2638', padding: '2px 6px', borderRadius: '4px', color: '#fff' }}>Enter</kbd> to quickly dismiss and resume scanner
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
