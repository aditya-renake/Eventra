import React, { useState } from 'react';
import { X, Mail, Eye, Save, ExternalLink, Sparkles, Check } from 'lucide-react';
import { api } from '../services/api';

export const EmailTemplateModal = ({ config, onClose, onShowToast, onSaveConfig }) => {
  const [subject, setSubject] = useState(config?.emailSubjectTemplate || '🎟️ Your Official Entry Pass for HackSeries 2026 — {{name}}');
  const [notice, setNotice] = useState(config?.emailBodyNotice || 'Please present this digital pass with QR code at the registration desk for express check-in and hacker kit collection.');
  const [activeTab, setActiveTab] = useState('editor');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.event.updateConfig({
        emailSubjectTemplate: subject,
        emailBodyNotice: notice,
      });
      onShowToast({
        type: 'success',
        title: 'Template Saved! 💾',
        message: 'Pass email template updated for all subsequent dispatches.',
      });
      if (onSaveConfig) onSaveConfig();
      onClose();
    } catch (err) {
      onShowToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const previewUrl = `/api/email/preview`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={18} color="#22c55e" />
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>Pass Email Template & Sender Configuration</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '10px', padding: '14px 24px', borderBottom: '1px solid var(--border-subtle)', background: '#0b0f19' }}>
          <button
            className={`btn btn-sm ${activeTab === 'editor' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('editor')}
          >
            Template Settings
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'preview' ? 'btn-cyan' : 'btn-ghost'}`}
            onClick={() => setActiveTab('preview')}
          >
            <Eye size={14} /> Live HTML Preview
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {activeTab === 'editor' ? (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Sender Info Notice */}
              <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '12px', padding: '14px 18px', fontSize: '12px', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div>
                    <strong style={{ color: '#4ade80' }}>Active Sender:</strong> tigeradi1504@gmail.com (Gmail SMTP Engine)
                  </div>
                  <span className="badge badge-emerald" style={{ fontSize: '10px' }}>ACTIVE</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  To change the sender email, simply update <code>SMTP_USER</code> and <code>SMTP_PASS</code> in Vercel Environment Variables.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#fff', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Email Subject Line (supports <code style={{ color: '#22c55e' }}>{"{{name}}"}</code>, <code style={{ color: '#22c55e' }}>{"{{eventName}}"}</code>)
                </label>
                <input
                  type="text"
                  className="input-control"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#fff', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Gate Instructions & Notice
                </label>
                <textarea
                  className="input-control"
                  rows={4}
                  value={notice}
                  onChange={(e) => setNotice(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  <Save size={15} /> {isSaving ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Live Rendered HTML with Embedded QR Pass:</span>
                <a href={previewUrl} target="_blank" rel="noreferrer" className="btn btn-sm btn-ghost" style={{ fontSize: '11px' }}>
                  <ExternalLink size={12} /> Open in New Tab
                </a>
              </div>
              <iframe
                src={previewUrl}
                title="Email Preview"
                style={{ width: '100%', height: '420px', border: '1px solid var(--border-subtle)', borderRadius: '12px', background: '#fff' }}
              />
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
