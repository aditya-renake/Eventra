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
};
