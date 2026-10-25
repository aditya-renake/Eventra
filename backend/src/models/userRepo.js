import bcrypt from 'bcryptjs';
import { getSupabase, isSupabaseConfigured, toCamel, toSnake } from '../config/supabase.js';

// In-memory cache & fallback store for registered attendee users
const memoryUsers = new Map();

export const userRepo = {
  /**
   * Find user by username
   */
  async findByUsername(username) {
    if (!username) return null;
    const clean = username.toLowerCase().trim();

    if (memoryUsers.has(clean)) {
      return memoryUsers.get(clean);
    }

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb.from('users').select('*').ilike('username', clean).maybeSingle();
        if (data && !error) {
          const user = toCamel(data);
          memoryUsers.set(clean, user);
          return user;
        }
      } catch (err) {
        console.warn('[userRepo] Supabase findByUsername notice:', err.message);
      }
    }

    return null;
  },

  /**
   * Find user by email
   */
  async findByEmail(email) {
    if (!email) return null;
    const clean = email.toLowerCase().trim();

    for (const u of memoryUsers.values()) {
      if (u.email && u.email.toLowerCase().trim() === clean) {
        return u;
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { data, error } = await sb.from('users').select('*').ilike('email', clean).maybeSingle();
        if (data && !error) {
          const user = toCamel(data);
          memoryUsers.set(user.username, user);
          return user;
        }
      } catch (err) {
        console.warn('[userRepo] Supabase findByEmail notice:', err.message);
      }
    }

    return null;
  },

  /**
   * Find user by either username or email
   */
  async findByIdentifier(identifier) {
    if (!identifier) return null;
    const clean = identifier.toLowerCase().trim();

    const byUsername = await this.findByUsername(clean);
    if (byUsername) return byUsername;

    return this.findByEmail(clean);
  },

  /**
   * Create a new attendee user
   */
  async createUser({ name, username, email, password, institution = '', phone = '', avatarUrl = '' }) {
    const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '');
    const cleanEmail = email.toLowerCase().trim();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      id: cleanUsername,
      username: cleanUsername,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      institution: institution ? institution.trim() : '',
      phone: phone ? phone.trim() : '',
      avatarUrl: avatarUrl ? avatarUrl.trim() : '',
      role: 'attendee',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Cache in-memory immediately
    memoryUsers.set(cleanUsername, newUser);

    // Persist to Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const dbRow = toSnake(newUser);
        const { error } = await sb.from('users').upsert(dbRow);
        if (error) {
          console.warn('[userRepo] Supabase user insert warning:', error.message);
        }
      } catch (err) {
        console.warn('[userRepo] Supabase persist notice:', err.message);
      }
    }

    const { passwordHash: _, ...safeUser } = newUser;
    return safeUser;
  },

  /**
   * Verify password
   */
  async verifyPassword(candidatePassword, passwordHash) {
    if (!candidatePassword || !passwordHash) return false;
    return bcrypt.compare(candidatePassword, passwordHash);
  },
};
