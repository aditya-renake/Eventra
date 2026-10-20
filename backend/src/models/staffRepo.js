import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '../config/supabase.js';

// In-memory fallback map for offline local dev
const memoryStaff = new Map();

function rowToStaff(row) {
  if (!row) return null;
  return {
    id: row.id || row.username,
    username: row.username,
    email: row.email,
    name: row.name,
    passwordHash: row.password_hash,
    role: row.role || 'scanner',
    assignedEventIds: row.assigned_event_ids || ['*'],
    lastLogin: row.last_login,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function staffToRow(staff) {
  return {
    id: staff.username,
    username: staff.username,
    email: staff.email,
    name: staff.name,
    password_hash: staff.passwordHash,
    role: staff.role,
    assigned_event_ids: staff.assignedEventIds || ['*'],
    last_login: staff.lastLogin,
    updated_at: new Date().toISOString(),
  };
}

export const staffRepo = {
  async findByUsername(username) {
    if (!username) return null;
    const cleanUsername = username.toLowerCase().trim();

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('staff_users')
          .select('*')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (data && !error) return rowToStaff(data);
      } catch (err) {
        console.warn('[staffRepo] Supabase findByUsername notice:', err.message);
      }
    }
    return memoryStaff.get(cleanUsername) || null;
  },

  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('staff_users')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (data && !error) return rowToStaff(data);
      } catch (err) {
        console.warn('[staffRepo] Supabase findByEmail notice:', err.message);
      }
    }

    for (const user of memoryStaff.values()) {
      if (user.email === cleanEmail) return user;
    }
    return null;
  },

  async findByIdentifier(identifier) {
    if (!identifier) return null;
    const clean = identifier.toLowerCase().trim();
    const byUsername = await this.findByUsername(clean);
    if (byUsername) return byUsername;
    return this.findByEmail(clean);
  },

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

    memoryStaff.set(cleanUsername, user);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('staff_users').upsert(staffToRow(user));
      } catch (err) {
        console.warn('[staffRepo] Supabase createStaff notice:', err.message);
      }
    }

    return user;
  },

  async verifyPassword(candidatePassword, passwordHash) {
    if (!candidatePassword || !passwordHash) return false;
    return bcrypt.compare(candidatePassword, passwordHash);
  },

  async updateLastLogin(username) {
    if (!username) return;
    const cleanUsername = username.toLowerCase().trim();
    const now = new Date().toISOString();

    const existing = memoryStaff.get(cleanUsername);
    if (existing) {
      existing.lastLogin = now;
      existing.updatedAt = now;
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('staff_users')
          .update({ last_login: now, updated_at: now })
          .eq('username', cleanUsername);
      } catch (e) {
        // quiet
      }
    }
  },

  async getAll() {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('staff_users').select('*');
        if (data && !error && data.length > 0) {
          return data.map((row) => {
            const user = rowToStaff(row);
            const { passwordHash, ...safe } = user;
            if (user.username === 'adityarenake') safe.role = 'root_owner';
            return safe;
          });
        }
      } catch (e) {
        console.warn('[staffRepo] Supabase getAll notice:', e.message);
      }
    }

    const list = [];
    for (const u of memoryStaff.values()) {
      const { passwordHash, ...safe } = u;
      list.push(safe);
    }
    return list;
  },

  async updateStaff(username, updates) {
    if (!username) return null;
    const cleanUsername = username.toLowerCase().trim();
    const existing = await this.findByUsername(cleanUsername);
    if (!existing) return null;

    let nextUpdates = { ...updates, updatedAt: new Date().toISOString() };
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      nextUpdates.passwordHash = await bcrypt.hash(updates.password, salt);
      delete nextUpdates.password;
    }

    const merged = { ...existing, ...nextUpdates };
    memoryStaff.set(cleanUsername, merged);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('staff_users').upsert(staffToRow(merged));
      } catch (err) {
        console.warn('[staffRepo] Supabase updateStaff error:', err.message);
      }
    }

    const { passwordHash, ...safe } = merged;
    return safe;
  },

  async deleteStaff(username) {
    if (!username) return false;
    const cleanUsername = username.toLowerCase().trim();
    if (cleanUsername === 'adityarenake') {
      throw new Error('Cannot delete the Main Event Organizer (Aditya Renake)');
    }

    memoryStaff.delete(cleanUsername);
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('staff_users').delete().eq('username', cleanUsername);
      } catch (err) {
        console.warn('[staffRepo] Supabase deleteStaff error:', err.message);
      }
    }
    return true;
  },

  async seedDefaultAdmin() {
    try {
      const staffList = [
        {
          username: 'adityarenake',
          email: 'tigeradi1504@gmail.com',
          name: 'Aditya Renake',
          password: 'Aditya@11',
          role: 'root_owner',
        },
        {
          username: 'gate_scanner_1',
          email: 'scanner@acesdit.org',
          name: 'Gate Scanner Volunteer 1',
          password: 'Scanner@11',
          role: 'scanner',
        },
      ];

      for (const staff of staffList) {
        const existing = await this.findByUsername(staff.username);
        if (!existing) {
          console.log(`👑 [Supabase Postgres] Seeding staff user (${staff.username})...`);
          await this.createStaff(staff);
        }
      }
    } catch (e) {
      console.warn('⚠️ [staffRepo] Staff seed notice:', e.message);
    }
  },
};
