/**
 * ============================================================================
 * FRONTEND API CLIENT SERVICE
 * ============================================================================
 * Purpose:
 *   Centralized HTTP transport layer communicating with the Express backend.
 *   Provides modular domain methods for authentication, event management,
 *   attendee administration, gate check-in scanning, and payment operations.
 *
 * Architecture:
 *   - Automatically attaches JWT Bearer token from localStorage to authenticated calls.
 *   - Organizes endpoints by resource:
 *       • api.auth        : Login, logout, session persistence, user role extraction.
 *       • api.events      : Multi-event catalog, event creation, pricing config.
 *       • api.registrants : Attendee list, filtering, CSV export/import, approval.
 *       • api.checkin     : Cryptographic QR scan verification, status, recent scans.
 *       • api.email       : Single and batch pass email triggers.
 *       • api.payments    : Razorpay order initialization, signature verification.
 * ============================================================================
 */

const API_BASE = '/api';

/**
 * Helper to make JSON fetch requests with auth token
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('hs26_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  auth: {
    async login(identifier, password) {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      if (data.token) {
        localStorage.setItem('hs26_auth_token', data.token);
        localStorage.setItem('hs26_user', JSON.stringify(data.user));
      }
      return data;
    },
    logout() {
      localStorage.removeItem('hs26_auth_token');
      localStorage.removeItem('hs26_user');
      sessionStorage.removeItem('hs26_cached_dashboard_state');
    },
    getUser() {
      try {
        const u = localStorage.getItem('hs26_user');
        return u ? JSON.parse(u) : null;
      } catch {
        return null;
      }
    },
    getToken() {
      return localStorage.getItem('hs26_auth_token');
    },
    isAuthenticated() {
      return !!localStorage.getItem('hs26_auth_token');
    },
  },

  events: {
    async getAll(params = {}) {
      const query = new URLSearchParams(params).toString();
      return request(`/event${query ? `?${query}` : ''}`);
    },
    async getById(id) {
      return request(`/event/${id}`);
    },
    async create(eventData) {
      return request('/event', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
    },
    async update(id, updates) {
      return request(`/event/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    async delete(id) {
      return request(`/event/${id}`, {
        method: 'DELETE',
      });
    },
    async getStaff() {
      return request('/event/admin/staff');
    },
    async createStaff(staffData) {
      return request('/event/admin/staff', {
        method: 'POST',
        body: JSON.stringify(staffData),
      });
    },
    async updateStaff(username, updates) {
      return request(`/event/admin/staff/${username}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    async deleteStaff(username) {
      return request(`/event/admin/staff/${username}`, {
        method: 'DELETE',
      });
    },
    async purgeStaffExceptOwner() {
      return request('/event/admin/staff-purge/all-except-owner', {
        method: 'DELETE',
      });
    },
  },

  registrants: {
    async list(params = {}) {
      const query = new URLSearchParams(params).toString();
      return request(`/registrants${query ? `?${query}` : ''}`);
    },
    async getPublicPass(uniqueId) {
      return request(`/registrants/pass/${uniqueId}`);
    },
    async create(data) {
      return request('/registrants', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    async update(id, data) {
      return request(`/registrants/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    async delete(id) {
      return request(`/registrants/${id}`, {
        method: 'DELETE',
      });
    },
    async toggleVerification(id, verified) {
      return request(`/registrants/${id}/verify`, {
        method: 'PUT',
        body: JSON.stringify({ verified }),
      });
    },
    async bulkVerify(ids, verified) {
      return request('/registrants/bulk-verify', {
        method: 'POST',
        body: JSON.stringify({ ids, verified }),
      });
    },
    async bulkImport(rows, autoVerify = false, sendAckEmail = true, eventId = 'hackseries-2026') {
      return request('/registrants/bulk-import', {
        method: 'POST',
        body: JSON.stringify({ rows, autoVerify, sendAckEmail, eventId }),
      });
    },
    async simulateGoogleFormWebhook(formData) {
      return request('/registrants/webhook', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
    },
    exportCSVUrl() {
      const token = localStorage.getItem('hs26_auth_token');
      return `/api/registrants/export/csv?token=${encodeURIComponent(token || '')}`;
    },
    async downloadCSV() {
      const token = localStorage.getItem('hs26_auth_token');
      const response = await fetch('/api/registrants/export/csv', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to export CSV. Please ensure you are logged in.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hackseries-2026-registrants.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
  },

  checkin: {
    async scan(payload) {
      return request('/checkin/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    async undo(registrantId) {
      return request(`/checkin/undo/${registrantId}`, {
        method: 'POST',
      });
    },
    async getRecent() {
      return request('/checkin/recent');
    },
  },

  email: {
    async sendSingle(id) {
      return request(`/email/send/${id}`, {
        method: 'POST',
      });
    },
    async sendBulk(payload) {
      return request('/email/bulk-send', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },

  event: {
    async getConfig() {
      return request('/event/config');
    },
    async updateConfig(updates) {
      return request('/event/config', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    async getDatabaseTelemetry() {
      return request('/event/telemetry');
    },
  },

  events: {
    async getAll() {
      return request('/events');
    },
    async getById(id) {
      return request(`/events/${id}`);
    },
    async create(eventData) {
      return request('/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
    },
    async update(id, eventData) {
      return request(`/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(eventData),
      });
    },
    async delete(id) {
      return request(`/events/${id}`, {
        method: 'DELETE',
      });
    },
    async getStaff() {
      return request('/events/admin/staff');
    },
    async createStaff(staffData) {
      return request('/events/admin/staff', {
        method: 'POST',
        body: JSON.stringify(staffData),
      });
    },
    async updateStaff(username, updates) {
      return request(`/events/admin/staff/${username}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    async deleteStaff(username) {
      return request(`/events/admin/staff/${username}`, {
        method: 'DELETE',
      });
    },
    async purgeStaffExceptOwner() {
      return request('/events/admin/staff-purge/all-except-owner', {
        method: 'DELETE',
      });
    },
  },

  payment: {
    async createOrder(participantData) {
      return request('/payment/create-order', {
        method: 'POST',
        body: JSON.stringify(participantData),
      });
    },
    async verifyPayment(verificationData) {
      return request('/payment/verify-payment', {
        method: 'POST',
        body: JSON.stringify(verificationData),
      });
    },
    async checkOrderStatus(orderId, participantData = {}) {
      return request('/payment/check-order', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId, participantData }),
      });
    },
    async verifyUpiPayment(payload) {
      return request('/payment/verify-upi', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
  },
};
