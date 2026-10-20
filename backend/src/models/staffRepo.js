import bcrypt from 'bcryptjs';
import { getFirestore } from '../config/firebase.js';

export const staffRepo = {
  getCollection() {
    const db = getFirestore();
    return db.collection('staff_users');
  },

  /**
   * Find staff user by username
   */
  async findByUsername(username) {
    if (!username) return null;
    const cleanUsername = username.toLowerCase().trim();
    const collection = this.getCollection();

    const doc = await collection.doc(cleanUsername).get();
    if (doc.exists) {
      return { id: doc.id, username: doc.id, ...doc.data() };
    }
    return null;
  },

  /**
   * Find staff user by email
   */
  async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    const collection = this.getCollection();

    const snapshot = await collection.where('email', '==', cleanEmail).limit(1).get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, username: doc.id, ...doc.data() };
    }
    return null;
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
      username: cleanUsername,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
      role,
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const collection = this.getCollection();
    await collection.doc(cleanUsername).set(user);
    return { id: cleanUsername, ...user };
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
    try {
      const cleanUsername = username.toLowerCase().trim();
      const collection = this.getCollection();
      await collection.doc(cleanUsername).set(
        { lastLogin: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (e) {
      console.warn('[staffRepo] updateLastLogin error:', e.message);
    }
  },

  /**
   * Get all registered staff users
   */
  async getAll() {
    try {
      const collection = this.getCollection();
      const snapshot = await collection.get();
      const staffList = [];
      snapshot.docs.forEach((doc) => {
        const { passwordHash, ...safeUser } = doc.data();
        const u = doc.id.toLowerCase().trim();
        let role = safeUser.role || 'scanner';
        if (u === 'adityarenake') {
          role = 'root_owner';
        }
        staffList.push({ id: doc.id, username: doc.id, ...safeUser, role });
      });
      return staffList;
    } catch (e) {
      console.warn('[staffRepo] getAll error:', e.message);
      return [];
    }
  },

  /**
   * Update staff member (e.g. role or assigned events)
   */
  async updateStaff(username, updates) {
    if (!username) return null;
    const cleanUsername = username.toLowerCase().trim();
    const collection = this.getCollection();

    const existing = await this.findByUsername(cleanUsername);
    if (!existing) return null;

    let nextUpdates = { ...updates, updatedAt: new Date().toISOString() };
    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      nextUpdates.passwordHash = await bcrypt.hash(updates.password, salt);
      delete nextUpdates.password;
    }

    await collection.doc(cleanUsername).set(nextUpdates, { merge: true });
    const updated = await this.findByUsername(cleanUsername);
    const { passwordHash, ...safe } = updated;
    return safe;
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
    const collection = this.getCollection();
    await collection.doc(cleanUsername).delete();
    return true;
  },

  /**
   * Seed default admin and staff users (adityarenake as exclusive root_owner)
   */
  async seedDefaultAdmin() {
    try {
      // Ensure Soham and Hariti access is permanently revoked and deleted
      await this.getCollection().doc('sohamchitnis').delete().catch(() => {});
      await this.getCollection().doc('haritirawal').delete().catch(() => {});

      const staffList = [
        {
          username: 'adityarenake',
          email: 'tigeradi1504@gmail.com',
          name: 'Aditya Renake',
          password: 'Aditya@11',
          role: 'root_owner',
          assignedEventIds: ['*'],
        },
        {
          username: 'gate_scanner_1',
          email: 'scanner@acesdit.org',
          name: 'Gate Scanner Volunteer 1',
          password: 'Scanner@11',
          role: 'scanner',
          assignedEventIds: ['*'],
        },
      ];

      for (const staff of staffList) {
        const existing = await this.findByUsername(staff.username);
        if (!existing) {
          console.log(`👑 [Firestore] Seeding staff user (${staff.username})...`);
          await this.createStaff(staff);
          console.log(`✅ [Firestore] User ${staff.username} created successfully.`);
        } else if (staff.username === 'adityarenake' && existing.role !== 'root_owner') {
          await this.getCollection().doc('adityarenake').set({ role: 'root_owner' }, { merge: true });
        }
      }
    } catch (e) {
      console.warn('⚠️ [Firestore] Staff seed notice:', e.message);
    }
  },
};
