import bcrypt from 'bcryptjs';
import { getFirestore } from '../config/firebase.js';

// In-memory cache & fallback store for registered attendee users
const memoryUsers = new Map();

export const userRepo = {
  getCollection() {
    const db = getFirestore();
    return db.collection('users');
  },

  /**
   * Find user by username
   */
  async findByUsername(username) {
    if (!username) return null;
    const clean = username.toLowerCase().trim();

    if (memoryUsers.has(clean)) {
      return memoryUsers.get(clean);
    }

    try {
      const collection = this.getCollection();
      const doc = await collection.doc(clean).get();
      if (doc && doc.exists) {
        const user = { id: doc.id, username: doc.id, ...doc.data() };
        memoryUsers.set(clean, user);
        return user;
      }
    } catch (err) {
      console.warn('[userRepo] findByUsername error:', err.message);
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

    try {
      const collection = this.getCollection();
      const snapshot = await collection.where('email', '==', clean).limit(1).get();
      if (snapshot && !snapshot.empty) {
        const doc = snapshot.docs[0];
        const user = { id: doc.id, username: doc.id, ...doc.data() };
        memoryUsers.set(user.username, user);
        return user;
      }
    } catch (err) {
      console.warn('[userRepo] findByEmail error:', err.message);
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

    // Cache locally immediately
    memoryUsers.set(cleanUsername, { id: cleanUsername, ...newUser });

    // Persist to Google Cloud Firestore
    try {
      const collection = this.getCollection();
      await collection.doc(cleanUsername).set(newUser);
    } catch (err) {
      console.warn('[userRepo] Firestore persist notice:', err.message);
    }

    const { passwordHash: _, ...safeUser } = newUser;
    return { id: cleanUsername, ...safeUser };
  },

  /**
   * Verify password
   */
  async verifyPassword(candidatePassword, passwordHash) {
    if (!candidatePassword || !passwordHash) return false;
    return bcrypt.compare(candidatePassword, passwordHash);
  },
};
