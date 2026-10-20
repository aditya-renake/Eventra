/**
 * ============================================================================
 * TEAM & RBAC MANAGEMENT MODAL (TeamManagementModal.jsx)
 * ============================================================================
 * Purpose:
 *   Administrative modal for managing organizer credentials, volunteer accounts,
 *   and gate scanner access permissions.
 *
 * Key Capabilities:
 *   - Create staff accounts with scoped roles: 'root_owner', 'admin', 'scanner'.
 *   - Restrict staff members to specific event IDs or grant universal access ('*').
 *   - Safeguards root owner account against accidental revocation or deletion.
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Shield, ShieldCheck, QrCode, Trash2, Key, Users, CheckCircle2, Crown, Lock, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { sounds } from '../utils/soundEffects';

export const TeamManagementModal = ({ onClose, onShowToast, events = [] }) => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    role: 'scanner',
    assignedEventIds: ['*'],
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.events.getStaff();
      setStaffList(res.data || []);
    } catch (err) {
      onShowToast({ type: 'error', title: 'Error', message: 'Failed to load staff members.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleUpdateRole = async (username, newRole) => {
    try {
      sounds.playClick();
      await api.events.updateStaff(username, { role: newRole });
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'Role Updated! ⚡',
        message: `Updated ${username} to ${newRole}.`,
      });
      fetchStaff();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Failed to update role',
        message: err.message,
      });
    }
  };

  const handlePurgeAllExceptOwner = async () => {
    if (!window.confirm("⚠️ DANGER: Are you sure you want to revoke and delete ALL other staff accounts? Only Aditya Renake (Main Event Organizer) will retain access.")) {
      return;
    }
    try {
      sounds.playWarning();
      const res = await api.events.purgeStaffExceptOwner();
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'All Staff Access Revoked! 🔒',
        message: res.message || 'Only Aditya Renake now retains access.',
      });
      fetchStaff();
    } catch (err) {
      sounds.playError();
      onShowToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message,
      });
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.name || !formData.password || !formData.email) {
      onShowToast({ type: 'error', title: 'Missing Fields', message: 'All fields are required.' });
      return;
    }

    try {
      setIsSubmitting(true);
      sounds.playClick();
      await api.events.createStaff(formData);
      sounds.playSuccess();
      onShowToast({
        type: 'success',
        title: 'Staff Account Created! 👤',
        message: `Account for ${formData.name} (${formData.role}) is now active.`,
      });
      setShowAddForm(false);
      setFormData({
        username: '',
        name: '',
        email: '',
        password: '',
        role: 'scanner',
        assignedEventIds: ['*'],
      });
      fetchStaff();
    } catch (err) {
      sounds.playError();
      onShowToast({ type: 'error', title: 'Creation Error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (username) => {
    if (!window.confirm(`Are you sure you want to remove access for "${username}"?`)) return;
    try {
      sounds.playClick();
      await api.events.deleteStaff(username);
      onShowToast({ type: 'success', title: 'Access Revoked', message: `Staff member ${username} has been removed.` });
      fetchStaff();
    } catch (err) {
      sounds.playError();
      onShowToast({ type: 'error', title: 'Delete Error', message: err.message });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.12) 0%, rgba(178, 43, 47, 0.08) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(209, 165, 80, 0.2)', padding: '6px', borderRadius: '8px', display: 'flex' }}>
              <Crown size={18} color="#f7d070" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>Team & Role Access Delegation</div>
              <div style={{ fontSize: '11px', color: '#f7d070', fontWeight: '700' }}>👑 Root Owner: Aditya Renake (Main Authority)</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px', borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          
          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Registered Staff & Volunteers ({staffList.length})
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handlePurgeAllExceptOwner}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  fontWeight: '800',
                  fontSize: '11px',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
                title="Revoke and delete all other accounts except Aditya Renake"
              >
                <Trash2 size={13} /> Revoke All Other Access
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  background: showAddForm ? '#1e2638' : '#22d3ee',
                  color: showAddForm ? '#fff' : '#000',
                  fontWeight: '800',
                  fontSize: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <UserPlus size={14} /> {showAddForm ? 'Close Form' : '+ Add Staff Account'}
              </button>
            </div>
          </div>

          {/* Add Staff Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateStaff}
              style={{
                background: '#0b0f19',
                border: '1px solid rgba(34, 211, 238, 0.3)',
                borderRadius: '12px',
                padding: '18px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '800', color: '#22d3ee', marginBottom: '4px' }}>
                New Staff Credentials
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>FULL NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: '#06080e', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>USERNAME / LOGIN ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. rahul_gate1"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: '#06080e', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    placeholder="rahul@acesdit.org"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: '#06080e', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>PASSWORD</label>
                  <input
                    type="password"
                    required
                    placeholder="Temporary Password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: '#06080e', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>ASSIGN ROLE & PRIVILEGES</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', background: '#06080e', border: '1px solid var(--border-subtle)', borderRadius: '6px', color: '#fff', fontSize: '12px' }}
                >
                  <option value="scanner">Gate Scanner Volunteer (Camera QR Scanner Only - No Table Access)</option>
                  <option value="event_head">Sub-Event Head (Can Verify Attendees & Send Passes for Assigned Events)</option>
                  <option value="super_admin">Super Administrator (Full Master Privileges across All Events)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    background: '#22d3ee',
                    color: '#000',
                    fontWeight: '800',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          {/* Staff List Table */}
          <div style={{ background: '#06080e', borderRadius: '12px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading team members...</div>
            ) : staffList.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>No additional staff members created yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {staffList.map((st) => {
                  const isOwner = st.username.toLowerCase() === 'adityarenake';
                  return (
                    <div
                      key={st.username}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 18px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        background: isOwner ? 'rgba(209, 165, 80, 0.04)' : 'transparent',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: '800', color: '#ffffff', fontSize: '13px' }}>{st.name}</span>
                          
                          {isOwner ? (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                padding: '3px 10px',
                                borderRadius: '9999px',
                                background: 'linear-gradient(135deg, rgba(209, 165, 80, 0.25) 0%, rgba(178, 43, 47, 0.25) 100%)',
                                color: '#f7d070',
                                border: '1px solid rgba(247, 208, 112, 0.6)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 0 12px rgba(209, 165, 80, 0.35)',
                              }}
                            >
                              <Crown size={12} color="#f7d070" /> ROOT OWNER / MAIN EVENT ORGANIZER
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                background:
                                  st.role === 'super_admin'
                                    ? 'rgba(178, 43, 47, 0.2)'
                                    : st.role === 'event_head'
                                    ? 'rgba(209, 165, 80, 0.2)'
                                    : 'rgba(34, 211, 238, 0.2)',
                                color:
                                  st.role === 'super_admin'
                                    ? '#f7d070'
                                    : st.role === 'event_head'
                                    ? '#d1a550'
                                    : '#22d3ee',
                                border: `1px solid ${
                                  st.role === 'super_admin'
                                    ? 'rgba(209, 165, 80, 0.4)'
                                    : 'rgba(255, 255, 255, 0.1)'
                                }`,
                              }}
                            >
                              {st.role === 'super_admin' ? 'Super Admin' : st.role === 'event_head' ? 'Event Head' : 'Gate Scanner'}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>
                          Username: <code style={{ color: '#cbd5e1' }}>{st.username}</code> • Email: {st.email}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isOwner ? (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#4ade80',
                              fontWeight: '800',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                            }}
                          >
                            <Lock size={12} color="#4ade80" /> Immutable (Master Owner)
                          </span>
                        ) : (
                          <>
                            <select
                              value={st.role || 'scanner'}
                              onChange={(e) => handleUpdateRole(st.username, e.target.value)}
                              style={{
                                background: '#0b0f19',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '6px',
                                color: '#cbd5e1',
                                fontSize: '11px',
                                fontWeight: '700',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                outline: 'none',
                              }}
                              title="Change staff permission role"
                            >
                              <option value="event_head">⭐ Sub-Event Head</option>
                              <option value="scanner">📱 Gate Scanner</option>
                              <option value="super_admin">⚡ Administrator</option>
                            </select>

                            <button
                              onClick={() => handleDeleteStaff(st.username)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#ef4444',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                              }}
                              title={`Revoke access for ${st.name}`}
                            >
                              <Trash2 size={12} /> Remove Access
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
