import jwt from 'jsonwebtoken';
import { staffRepo } from '../models/staffRepo.js';
import { registrantRepo } from '../models/registrantRepo.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hackseries_2026_jwt_super_secret_key_8899';

export const login = async (req, res) => {
  try {
    const { username, email, identifier, password } = req.body || {};
    const rawIdentifier = String(username || email || identifier || '').toLowerCase().trim();
    const rawPassword = String(password || '').trim();

    if (!rawIdentifier || !rawPassword) {
      return res.status(400).json({ success: false, message: 'Username/Email and password are required.' });
    }

    // Restrict staff login to Aditya Renake (Main Event Organizer / Root Owner)
    const adityaIdentifiers = new Set([
      'adityarenake',
      'tigeradi1504@gmail.com',
      'aditya.renake@outlook.com',
      'gate_scanner_1',
      'scanner@acesdit.org',
    ]);
    if (!adityaIdentifiers.has(rawIdentifier)) {
      return res.status(403).json({ success: false, message: 'Login is restricted to Aditya Renake.' });
    }

    // Always ensure default admin accounts exist
    await staffRepo.seedDefaultAdmin().catch(() => {});

    // Explicitly reject revoked users
    if (
      rawIdentifier === 'sohamchitnis' ||
      rawIdentifier === 'haritirawal' ||
      rawIdentifier.includes('sohamchitnis@') ||
      rawIdentifier.includes('haritirawal@')
    ) {
      return res.status(403).json({ success: false, message: 'Access permanently revoked by Lead Operations.' });
    }

    let user = await staffRepo.findByIdentifier(rawIdentifier);

    // If user not found in DB, check hardcoded default admins to auto-provision
    if (!user) {
      if (rawIdentifier === 'adityarenake' || rawIdentifier === 'tigeradi1504@gmail.com' || rawIdentifier === 'aditya.renake@outlook.com') {
        user = {
          username: 'adityarenake',
          email: 'tigeradi1504@gmail.com',
          name: 'Aditya Renake',
          role: 'root_owner',
          passwordHash: '',
        };
      } else if (rawIdentifier === 'gate_scanner_1' || rawIdentifier === 'scanner@acesdit.org') {
        user = {
          username: 'gate_scanner_1',
          email: 'scanner@acesdit.org',
          name: 'Gate Scanner Volunteer 1',
          role: 'scanner',
          passwordHash: '',
        };
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    // Verify Password (Bcrypt or Emergency Password)
    let isMatch = false;
    if (user.passwordHash) {
      try {
        isMatch = await staffRepo.verifyPassword(rawPassword, user.passwordHash);
      } catch (err) {
        isMatch = false;
      }
    }

    // Fallback Master Password checks for official Admins & Scanners
    if (!isMatch) {
      if (
        (user.username === 'adityarenake' || user.email === 'tigeradi1504@gmail.com' || user.email === 'aditya.renake@outlook.com') &&
        (rawPassword === 'Aditya@11' || rawPassword === 'Aditya@123' || rawPassword === 'Admin@123')
      ) {
        isMatch = true;
      } else if (
        (user.username === 'gate_scanner_1' || user.email === 'scanner@acesdit.org') &&
        (rawPassword === 'Scanner@11' || rawPassword === 'Admin@123')
      ) {
        isMatch = true;
      }
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    await staffRepo.updateLastLogin(user.username).catch(() => {});

    const assignedRole = user.username.toLowerCase() === 'adityarenake' ? 'root_owner' : (user.role || 'event_head');

    const token = jwt.sign(
      {
        userId: user.username,
        username: user.username,
        email: user.email,
        name: user.name,
        role: assignedRole,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.username,
        username: user.username,
        email: user.email,
        name: user.name,
        role: assignedRole,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

export const getMe = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
};

/**
 * 1-Click Attendee / Student Sign-In (Google or Direct Email)
 */
export const attendeeSignIn = async (req, res) => {
  try {
    const { email, name } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid email address is required.' });
    }

    const registrants = await registrantRepo.findAllByEmail(cleanEmail);
    const latest = registrants[0] || null;
    const attendeeName = name || latest?.name || cleanEmail.split('@')[0] || 'Attendee';

    const token = jwt.sign(
      {
        role: 'attendee',
        email: cleanEmail,
        name: attendeeName,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      success: true,
      token,
      attendee: {
        email: cleanEmail,
        name: attendeeName,
        phone: latest?.phone || '',
        institution: latest?.institution || '',
        githubUrl: latest?.githubUrl || '',
      },
      passesCount: registrants.length,
      message: `Signed in as ${attendeeName}`,
    });
  } catch (error) {
    console.error('Attendee sign-in error:', error);
    return res.status(500).json({ success: false, message: 'Attendee sign-in failed', error: error.message });
  }
};
