import bcrypt from 'bcryptjs';
import { getSupabase, isSupabaseConfigured, toCamel, toSnake } from '../config/supabase.js';

let hasSeededStaff = false;

// Default built-in staff records
const DEFAULT_STAFF = [
  {
    id: 'adityarenake',
    username: 'adityarenake',
    name: 'Aditya Renake',
    email: 'tigeradi1504@gmail.com',
    role: 'root_owner',
    assignedEventIds: ['*'],
  },
  {
    id: 'gate_scanner_1',
    username: 'gate_scanner_1',
    name: 'Gate Scanner Volunteer 1',
    email: 'scanner@acesdit.org',
    role: 'scanner',
    assignedEventIds: ['*'],
  },
];

export const staffRepo = {
  /**
   * Find staff user by username
   */
  async findByUsername(username) {
    if (!username) return null;
    const cleanUsername = username.toLowerCase().trim();

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb.from('staff_users').select('*').ilike('username', cleanUsername).maybeSingle();
        if (data && !error) {
          return toCamel(data);
        }
      } catch (err) {
        console.warn('[staffRepo] Supabase findByUsername notice:', err.message);
      }
    }

    // Default Fallback
    const fallback = DEFAULT_STAFF.find((s) => s.username === cleanUsername);
    return fallback || null;
  },

  /**
   * Find staff user by email
   */
  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb.from('staff_users').select('*').ilike('email', cleanEmail).maybeSingle();
        if (data && !error) {
          return toCamel(data);
        }
      } catch (err) {
        console.warn('[staffRepo] Supabase findByEmail notice:', err.message);
      }
    }

    const fallback = DEFAULT_STAFF.find((s) => s.email === cleanEmail);
    return fallback || null;
  },

  /**
   * Find staff user by either username or email
   */
  async findByIdentifier(identifier) {
    if (!identifier) return null;
    const clean = identifier.toLowerCase().trim();

    const byUsername = await this.findByUsername(clean);
    if (byUsername) return byUsername;

    return this.findByEmail(clean);
  },

  /**
   * Create staff user with hashed password
   */
  async createStaff({ username, email, name, password, role = 'admin' }) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const cleanUsername = username.toLowerCase().trim();

    const user = {
      id: cleanUsername,
      username: cleanUsername,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
      role,
      assignedEventIds: ['*'],
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        await sb.from('staff_users').upsert(toSnake(user));
      } catch (err) {
        console.warn('[staffRepo] Supabase createStaff notice:', err.message);
      }
    }

    return user;
  },

  /**
   * Verify password against bcrypt hash
   */
  async verifyPassword(candidatePassword, passwordHash) {
    if (!candidatePassword || !passwordHash) return false;
    return bcrypt.compare(candidatePassword, passwordHash);
  },

  /**
   * Update last login timestamp
   */
  async updateLastLogin(username) {
    if (!username) return;
    const cleanUsername = username.toLowerCase().trim();
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        await sb
          .from('staff_users')
          .update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() })
          .ilike('username', cleanUsername);
      } catch (e) {
        console.warn('[staffRepo] updateLastLogin error:', e.message);
      }
    }
  },

  /**
   * Get all registered staff users
   */
  async getAll() {
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb.from('staff_users').select('*');
        if (data && !error && data.length > 0) {
          return data.map((d) => {
            const camel = toCamel(d);
            delete camel.passwordHash;
            if (camel.username === 'adityarenake') camel.role = 'root_owner';
            return camel;
          });
        }
      } catch (e) {
        console.warn('[staffRepo] Supabase getAll error:', e.message);
      }
    }
    return DEFAULT_STAFF;
  },

  /**
   * Update staff member (e.g. role or assigned events)
   */
  async updateStaff(username, updates) {
    if (!username) return null;
    const cleanUsername = username.toLowerCase().trim();

    let nextUpdates = { ...updates, updatedAt: new Date().toISOString() };
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      nextUpdates.passwordHash = await bcrypt.hash(updates.password, salt);
      delete nextUpdates.password;
    }

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        await sb.from('staff_users').update(toSnake(nextUpdates)).ilike('username', cleanUsername);
      } catch (e) {
        console.warn('[staffRepo] updateStaff notice:', e.message);
      }
    }

    const updated = await this.findByUsername(cleanUsername);
    if (updated) {
      const { passwordHash, ...safe } = updated;
      return safe;
    }
    return null;
  },

  /**
   * Delete a staff user
   */
  async deleteStaff(username) {
    if (!username) return false;
    const cleanUsername = username.toLowerCase().trim();
    if (cleanUsername === 'adityarenake') {
      throw new Error('Cannot delete the Main Event Organizer (Aditya Renake)');
    }
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        await sb.from('staff_users').delete().ilike('username', cleanUsername);
        return true;
      } catch (e) {
        console.warn('[staffRepo] deleteStaff error:', e.message);
      }
    }
    return true;
  },

  /**
   * Seed default admin and staff users (adityarenake as exclusive root_owner)
   */
  async seedDefaultAdmin() {
    if (hasSeededStaff) return;
    hasSeededStaff = true;
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        // Remove revoked users
        await sb.from('staff_users').delete().in('username', ['sohamchitnis', 'haritirawal']);

        for (const staff of DEFAULT_STAFF) {
          const { data } = await sb.from('staff_users').select('id').ilike('username', staff.username).maybeSingle();
          if (!data) {
            await this.createStaff({
              ...staff,
              password: staff.username === 'adityarenake' ? 'Aditya@11' : 'Scanner@11',
            });
          }
        }
      } catch (e) {
        console.warn('[staffRepo] seedDefaultAdmin notice:', e.message);
      }
    }
  },
};
