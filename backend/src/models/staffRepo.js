import bcrypt from 'bcryptjs';
import { getFirestore } from '../config/firebase.js';

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

    const doc = await getFirestore().collection('staff_users').doc(cleanUsername).get();
    if (doc.exists) return doc.data();

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

    const result = await getFirestore().collection('staff_users').where('email', '==', cleanEmail).limit(1).get();
    if (!result.empty) return result.docs[0].data();

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

    await getFirestore().collection('staff_users').doc(cleanUsername).create(user);

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
    const ref = getFirestore().collection('staff_users').doc(cleanUsername);
    if ((await ref.get()).exists) await ref.update({ lastLogin: new Date().toISOString() });
  },

  /**
   * Get all registered staff users
   */
  async getAll() {
    const snapshot = await getFirestore().collection('staff_users').get();
    if (!snapshot.empty) return snapshot.docs.map(doc => {
      const { passwordHash, ...staff } = doc.data();
      if (staff.username === 'adityarenake') staff.role = 'root_owner';
      return staff;
    });
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

    await getFirestore().collection('staff_users').doc(cleanUsername).update(nextUpdates);

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
    await getFirestore().collection('staff_users').doc(cleanUsername).delete();
    return true;
  },

  /**
   * Seed default admin and staff users (adityarenake as exclusive root_owner)
   */
  async seedDefaultAdmin() {
    if (hasSeededStaff) return;
    hasSeededStaff = true;
    const staffUsers = getFirestore().collection('staff_users');
    for (const staff of DEFAULT_STAFF) {
      const password = staff.role === 'scanner' ? process.env.SCANNER_PASSWORD : process.env.ADMIN_PASSWORD;
      if (password && !(await staffUsers.doc(staff.username).get()).exists) await this.createStaff({ ...staff, password });
    }
  },
};
