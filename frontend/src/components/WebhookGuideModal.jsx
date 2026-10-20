import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Terminal, 
  Play, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';

export const WebhookGuideModal = ({ onClose, onShowToast, onRefresh }) => {
  const [copied, setCopied] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simName, setSimName] = useState('Ankit Verma');
  const [simEmail, setSimEmail] = useState('ankit.verma@example.com');
  const [simPhone, setSimPhone] = useState('+91 98980 12345');
  const [simTeam, setSimTeam] = useState('HyperScale Labs');
  const [simTrack, setSimTrack] = useState('AI & Agentic Systems');

  const webhookUrl = `${window.location.origin}/api/registrants/webhook`;

  const appsScriptCode = `/**
 * Google Apps Script for HackSeries 2026 Registration Intake & Verification Sync
 * 1. Open your Google Sheet linked to Google Forms
 * 2. Click Extensions -> Apps Script -> Paste this entire code
 * 3. Triggers (⏰ Alarm clock icon on left) -> Add 2 Triggers:
 *    - onFormSubmit (Event: On form submit)
 *    - onEdit (Event: On edit)
 */

const WEBHOOK_URL = "${webhookUrl}";

/**
 * Trigger 1: Runs automatically when a hacker submits the Google Form
 */
function onFormSubmit(e) {
  try {
    const itemResponses = e ? e.namedValues : null;
    
    let name = "Sample Hacker";
    let email = "hacker@example.com";
    let phone = "";
    let ticketType = "Hacker Pass";
    let teamName = "";
    let track = "AI & Agentic Systems";
    let institution = "";
    let formResponses = {};

    if (itemResponses) {
      for (const [key, valArray] of Object.entries(itemResponses)) {
        const val = valArray ? valArray[0] : "";
        const cleanKey = key.trim();
        formResponses[cleanKey] = val;

        const lower = cleanKey.toLowerCase();
        if (lower.includes("name") && !lower.includes("team")) name = val;
        else if (lower.includes("email")) email = val;
        else if (lower.includes("phone") || lower.includes("contact")) phone = val;
        else if (lower.includes("team")) teamName = val;
        else if (lower.includes("track") || lower.includes("category")) track = val;
        else if (lower.includes("college") || lower.includes("inst")) institution = val;
      }
    }

    const payload = {
      name: name,
      email: email,
      phone: phone,
      ticketType: ticketType,
      teamName: teamName,
      track: track,
      institution: institution,
      formResponses: formResponses
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log("HackSeries Webhook Response: " + response.getContentText());
  } catch (error) {
    Logger.log("Error onFormSubmit: " + error.toString());
  }
}

/**
 * Trigger 2: Runs automatically when you change 'Verified' / 'Not Verified' dropdown in Google Sheet!
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const range = e.range;
    const sheet = range.getSheet();
    const row = range.getRow();
    const col = range.getColumn();
    
    // Ignore header row
    if (row <= 1) return;

    // Check edited column header name
    const headerName = sheet.getRange(1, col).getValue().toString().toLowerCase().trim();
    
    if (headerName.includes("verif") || headerName.includes("status") || headerName.includes("approval")) {
      const cellValue = range.getValue().toString().trim();
      const isVerified = cellValue.toLowerCase() === "verified";

      // Look for the Email column in Row 1
      const lastCol = sheet.getLastColumn();
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      let emailCol = -1;
      for (let i = 0; i < headers.length; i++) {
        if (headers[i].toString().toLowerCase().includes("email")) {
          emailCol = i + 1;
          break;
        }
      }

      if (emailCol > 0) {
        const hackerEmail = sheet.getRange(row, emailCol).getValue().toString().trim();
        if (hackerEmail) {
          const payload = {
            action: "update_status",
            email: hackerEmail,
            verified: isVerified,
            verificationStatus: isVerified ? "Verified" : "Not Verified"
          };

          const options = {
            method: "post",
            contentType: "application/json",
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
          };

          UrlFetchApp.fetch(WEBHOOK_URL, options);
          Logger.log("✅ Updated verification for " + hackerEmail + " to: " + (isVerified ? "Verified" : "Not Verified"));
        }
      }
    }
  } catch (err) {
    Logger.log("Error in onEdit sync: " + err.toString());
  }
}
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast({
      type: 'success',
      title: 'Copied to Clipboard! 📋',
      message: 'Google Apps Script snippet is ready to paste into your Google Sheet.',
    });
  };

  const handleRunSimulation = async (e) => {
    e.preventDefault();
    try {
      setIsSimulating(true);
      const res = await api.registrants.simulateGoogleFormWebhook({
        name: simName,
        email: simEmail,
        phone: simPhone,
        ticketType: 'Hacker Pass',
        teamName: simTeam,
        track: simTrack,
        formResponses: {
          'T-Shirt Size': 'L',
          'Dietary Preference': 'Vegetarian',
          'Hackathon Project Idea': 'Automated Multi-Modal Contract Security Auditor',
          'Submission Timestamp': new Date().toISOString(),
        },
      });

      onShowToast({
        type: 'success',
        title: 'Webhook Test Ingested! 📥',
        message: `Registered: ${res.data.name} -> Generated Pass ID: ${res.data.uniqueId}`,
      });

      if (onRefresh) onRefresh();
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Simulation Error',
        message: err.message,
      });
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '780px' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#fff' }}>Google Forms & Sheet Webhook Bridge</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Real-time automatic intake of Google Form submissions</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          
          {/* Step-by-Step Instructions */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#0b0f19', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#22c55e', textTransform: 'uppercase' }}>Step 1</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>Open Linked Sheet</div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Open the Google Sheet linked to your Google Form.</p>
            </div>

            <div style={{ background: '#0b0f19', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#06b6d4', textTransform: 'uppercase' }}>Step 2</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>Extensions → Apps Script</div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Click Extensions &gt; Apps Script in the Google Sheet menu.</p>
            </div>

            <div style={{ background: '#0b0f19', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#a78bfa', textTransform: 'uppercase' }}>Step 3</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>Paste & Add Trigger</div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Paste the code below, then click Triggers (clock icon) &gt; Add Trigger on 'Form Submit'.</p>
            </div>
          </div>

          {/* Code Box with Copy Button */}
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#080d1a', padding: '8px 16px', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', border: '1px solid var(--border-subtle)', borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <Terminal size={14} /> Code.gs
              </div>
              <button className="btn btn-sm btn-primary" onClick={handleCopyCode} style={{ padding: '4px 12px', fontSize: '11px' }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied!' : 'Copy Script'}</span>
              </button>
            </div>

            <pre style={{ background: '#030712', border: '1px solid var(--border-subtle)', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', padding: '16px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#4ade80', maxHeight: '180px', overflowY: 'auto', margin: 0 }}>
              {appsScriptCode}
            </pre>
          </div>

          {/* Interactive Webhook Simulator */}
          <div style={{ background: '#0b0f19', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: '14px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Sparkles size={16} color="#06b6d4" />
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Interactive Webhook Test Simulator</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Test your endpoint without opening Google Forms. This dispatches an instant simulated submission to <code style={{ color: '#22c55e', background: '#030712', padding: '2px 6px', borderRadius: '4px' }}>POST /api/registrants/webhook</code>.
            </p>

            <form onSubmit={handleRunSimulation} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
              <input
                type="text"
                className="input-control"
                placeholder="Full Name"
                value={simName}
                onChange={(e) => setSimName(e.target.value)}
                required
              />
              <input
                type="email"
                className="input-control"
                placeholder="Email Address"
                value={simEmail}
                onChange={(e) => setSimEmail(e.target.value)}
                required
              />
              <input
                type="text"
                className="input-control"
                placeholder="Phone"
                value={simPhone}
                onChange={(e) => setSimPhone(e.target.value)}
              />
              <input
                type="text"
                className="input-control"
                placeholder="Team Name"
                value={simTeam}
                onChange={(e) => setSimTeam(e.target.value)}
              />
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="submit" className="btn btn-cyan" disabled={isSimulating}>
                  <Play size={14} /> {isSimulating ? 'Simulating...' : 'Dispatch Test Submission'}
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
