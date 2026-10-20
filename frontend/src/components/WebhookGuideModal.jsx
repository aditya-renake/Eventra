import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Sparkles, 
  Send, 
  Terminal, 
  Code2,
  CheckCircle2,
  ShieldCheck,
  Webhook
} from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const WebhookGuideModal = ({ onClose, onShowToast }) => {
  const [copied, setCopied] = useState(false);
  const [simName, setSimName] = useState('Ankit Verma');
  const [simEmail, setSimEmail] = useState('ankit.verma@example.com');
  const [simPhone, setSimPhone] = useState('+91 98980 12345');
  const [simTeam, setSimTeam] = useState('HyperScale Labs');
  const [simTrack, setSimTrack] = useState('AI & Agentic Systems');
  const [isSimulating, setIsSimulating] = useState(false);

  const webhookUrl = `${window.location.origin}/api/registrants/webhook`;

  const webhookCurlExample = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Ankit Verma",
    "email": "ankit.verma@example.com",
    "phone": "+91 98980 12345",
    "ticketType": "Hacker Pass",
    "teamName": "HyperScale Labs",
    "track": "AI & Agentic Systems",
    "institution": "Dr. D. Y. Patil Institute of Technology, Pune"
  }'`;

  const handleCopyCode = () => {
    sounds.playClick();
    navigator.clipboard.writeText(webhookCurlExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowToast({
      type: 'success',
      title: 'Payload Copied!',
      message: 'cURL ingestion request copied to clipboard.',
    });
  };

  const handleRunSimulation = async (e) => {
    e.preventDefault();
    if (!simName.trim() || !simEmail.trim()) {
      onShowToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Name and email are required for the simulation.',
      });
      return;
    }

    try {
      setIsSimulating(true);
      sounds.playClick();

      const mockPayload = {
        name: simName.trim(),
        email: simEmail.trim(),
        phone: simPhone.trim(),
        ticketType: 'Hacker Pass',
        teamName: simTeam.trim(),
        track: simTrack,
        institution: 'Campus Delegate',
        formResponses: {
          'Full Name': simName.trim(),
          'Email': simEmail.trim(),
          'Contact': simPhone.trim(),
          'Team': simTeam.trim(),
          'Track': simTrack,
          'Ingestion Source': 'REST Webhook Engine',
        },
      };

      const res = await api.registrants.submitWebhook(mockPayload);
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'Webhook Ingested! ⚡',
        message: `Pass created for ${mockPayload.name} (${res.data?.uniqueId || 'HS26-XXXXXX'}).`,
      });
      onClose();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Simulation Failed',
        message: err.message || 'Webhook rejected payload.',
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
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--eventra-soft-lavender)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--eventra-indigo)' }}>
              <Webhook size={18} />
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: '800', color: '#fff' }}>Eventra REST Ingestion &amp; Webhook Bridge</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Real-time automatic intake from external forms &amp; registration systems</div>
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
              <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--eventra-indigo)', textTransform: 'uppercase' }}>Target URL</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>POST Endpoint</div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Dispatch JSON payload to <code>/api/registrants/webhook</code>.</p>
            </div>

            <div style={{ background: '#0b0f19', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#06b6d4', textTransform: 'uppercase' }}>Format</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>JSON Body</div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Include name, email, phone, teamName, track, and ticketType.</p>
            </div>

            <div style={{ background: '#0b0f19', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#a78bfa', textTransform: 'uppercase' }}>Output</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginTop: '2px' }}>Instant Cryptographic Pass</div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Generates HMAC-SHA256 digital QR ticket and queues confirmation email.</p>
            </div>
          </div>

          {/* Code Box with Copy Button */}
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#080d1a', padding: '8px 16px', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', border: '1px solid var(--border-subtle)', borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <Terminal size={14} /> cURL Ingestion Request
              </div>
              <button className="btn btn-sm btn-primary" onClick={handleCopyCode} style={{ padding: '4px 12px', fontSize: '11px' }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied!' : 'Copy cURL'}</span>
              </button>
            </div>

            <pre style={{ background: '#030712', border: '1px solid var(--border-subtle)', borderBottomLeftRadius: '10px', borderBottomRightRadius: '10px', padding: '16px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#4ade80', maxHeight: '180px', overflowY: 'auto', margin: 0 }}>
              {webhookCurlExample}
            </pre>
          </div>

          {/* Interactive Webhook Simulator */}
          <div style={{ background: '#0b0f19', border: '1px solid rgba(89, 110, 230, 0.3)', borderRadius: '14px', padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Sparkles size={16} color="var(--eventra-indigo)" />
              <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>Interactive Webhook Ingestion Simulator</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Test your endpoint directly. This dispatches an instant simulated attendee to <code style={{ color: 'var(--eventra-indigo)', background: '#030712', padding: '2px 6px', borderRadius: '4px' }}>POST /api/registrants/webhook</code> and issues a live verified pass.
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
              <select
                className="select-control"
                value={simTrack}
                onChange={(e) => setSimTrack(e.target.value)}
              >
                <option value="AI & Agentic Systems">AI &amp; Agentic Systems</option>
                <option value="Cybersecurity & Privacy">Cybersecurity &amp; Privacy</option>
                <option value="Web3 & Decentralized Tech">Web3 &amp; Decentralized Tech</option>
                <option value="Cloud & Distributed Systems">Cloud &amp; Distributed Systems</option>
                <option value="Open Innovation & Campus Tech">Open Innovation</option>
              </select>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSimulating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  gridColumn: '1 / -1',
                  marginTop: '4px',
                  padding: '10px 16px',
                }}
              >
                <Send size={14} />
                <span>{isSimulating ? 'Ingesting Simulated Pass...' : 'Dispatch Ingestion Test Payload'}</span>
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};
