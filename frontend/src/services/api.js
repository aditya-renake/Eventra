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

    // Attendee / Student Session helpers
    async attendeeRegister({ name, username, email, password, institution = '', phone = '' }) {
      const data = await request('/auth/attendee/register', {
        method: 'POST',
        body: JSON.stringify({ name, username, email, password, institution, phone }),
      });
      if (data.token) {
        localStorage.setItem('eventra_attendee_token', data.token);
        localStorage.setItem('eventra_attendee_profile', JSON.stringify(data.user));
      }
      return data;
    },
    async attendeeLogin(identifier, password) {
      const data = await request('/auth/attendee/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      if (data.token) {
        localStorage.setItem('eventra_attendee_token', data.token);
        localStorage.setItem('eventra_attendee_profile', JSON.stringify(data.user));
      }
      return data;
    },
    async attendeeSignIn(email, name = '') {
      const data = await request('/auth/attendee/signin', {
        method: 'POST',
        body: JSON.stringify({ email, name }),
      });
      if (data.token) {
        localStorage.setItem('eventra_attendee_token', data.token);
        localStorage.setItem('eventra_attendee_profile', JSON.stringify(data.attendee));
      }
      return data;
    },
    getAttendee() {
      try {
        const a = localStorage.getItem('eventra_attendee_profile');
        return a ? JSON.parse(a) : null;
      } catch {
        return null;
      }
    },
    setAttendee(attendee, token) {
      if (attendee) localStorage.setItem('eventra_attendee_profile', JSON.stringify(attendee));
      if (token) localStorage.setItem('eventra_attendee_token', token);
    },
    logoutAttendee() {
      localStorage.removeItem('eventra_attendee_token');
      localStorage.removeItem('eventra_attendee_profile');
    },
  },

  events: {
    async getAll(params = {}) {
      const query = new URLSearchParams(params).toString();
      return request(`/event${query ? `?${query}` : ''}`);
    },
    async getById(id) {
      return request(`/event/${encodeURIComponent(id)}`);
    },
    async create(eventData) {
      return request('/event', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
    },
    async update(id, updates) {
      return request(`/event/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    async delete(id) {
      return request(`/event/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    },
    async setFlagship(id) {
      return request(`/event/${encodeURIComponent(id)}/flagship`, {
        method: 'POST',
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
      return request(`/registrants/pass/${encodeURIComponent(uniqueId)}`);
    },
    async getAttendeeProfile(email) {
      return request(`/registrants/attendee/profile?email=${encodeURIComponent(email)}`);
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
    async bulkImport(rows, autoVerify = false, sendAckEmail = true, eventId = 'eventra-2026') {
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
    async submitWebhook(formData) {
      return request('/registrants/webhook', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
    },
    exportCSVUrl(eventId) {
      const token = localStorage.getItem('hs26_auth_token');
      const evParam = eventId && eventId !== 'all' ? `&eventId=${encodeURIComponent(eventId)}` : '';
      return `/api/registrants/export/csv?token=${encodeURIComponent(token || '')}${evParam}`;
    },
    async downloadCSV(eventId) {
      const token = localStorage.getItem('hs26_auth_token');
      const query = eventId && eventId !== 'all' ? `?eventId=${encodeURIComponent(eventId)}` : '';
      const response = await fetch(`/api/registrants/export/csv${query}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Failed to export CSV. Please ensure you are logged in.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${eventId || 'eventra-2026'}-registrants.csv`;
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
    async getLiveStats(eventId) {
      const q = eventId && eventId !== 'all' ? `?eventId=${encodeURIComponent(eventId)}` : '';
      return request(`/payment/live-stats${q}`);
    },
  },
};
