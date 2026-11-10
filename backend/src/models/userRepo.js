import bcrypt from 'bcryptjs';
import { getFirestore } from '../config/firebase.js';

export const userRepo = {
  async findByUsername(username) {
    const id = String(username || '').trim().toLowerCase();
    if (!id || id.includes('/')) return null;
    return (await getFirestore().collection('users').doc(id).get()).data() || null;
  },

  async findByEmail(email) {
    const query = getFirestore().collection('users').where('email', '==', String(email || '').trim().toLowerCase());
    return (await query.limit(1).get()).docs[0]?.data() || null;
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

    const db = getFirestore();
    const users = db.collection('users');
    await db.runTransaction(async tx => {
      const duplicate = await tx.get(users.where('email', '==', cleanEmail).limit(1));
      if (!duplicate.empty) throw Object.assign(new Error('Email already registered'), { status: 409 });
      tx.create(users.doc(cleanUsername), newUser);
    });

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
