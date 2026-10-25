import jwt from 'jsonwebtoken';
import { staffRepo } from '../models/staffRepo.js';
import { registrantRepo } from '../models/registrantRepo.js';
import { userRepo } from '../models/userRepo.js';

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

    // Explicitly reject revoked users
    if (
      rawIdentifier === 'sohamchitnis' ||
      rawIdentifier === 'haritirawal' ||
      rawIdentifier.includes('sohamchitnis@') ||
      rawIdentifier.includes('haritirawal@')
    ) {
      return res.status(403).json({ success: false, message: 'Access permanently revoked by Lead Operations.' });
    }

    // 1. Instant Zero-Latency Auth for Master Organizers & Scanner (Never blocks on Firestore network calls)
    const isAditya = ['adityarenake', 'tigeradi1504@gmail.com', 'aditya.renake@outlook.com'].includes(rawIdentifier);
    const isScanner = ['gate_scanner_1', 'scanner@acesdit.org'].includes(rawIdentifier);

    const isMasterAdityaMatch = isAditya && (rawPassword === 'Aditya@11' || rawPassword === 'Aditya@123' || rawPassword === 'Admin@123');
    const isMasterScannerMatch = isScanner && (rawPassword === 'Scanner@11' || rawPassword === 'Admin@123');

    if (isMasterAdityaMatch || isMasterScannerMatch) {
      const activeUser = isAditya ? {
        id: 'adityarenake',
        username: 'adityarenake',
        email: 'tigeradi1504@gmail.com',
        name: 'Aditya Renake',
        role: 'root_owner',
        assignedEventIds: ['*'],
      } : {
        id: 'gate_scanner_1',
        username: 'gate_scanner_1',
        email: 'scanner@acesdit.org',
        name: 'Gate Scanner Volunteer 1',
        role: 'scanner',
        assignedEventIds: ['*'],
      };

      const token = jwt.sign(
        {
          userId: activeUser.username,
          username: activeUser.username,
          email: activeUser.email,
          name: activeUser.name,
          role: activeUser.role,
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Background non-blocking lastLogin update
      staffRepo.updateLastLogin(activeUser.username).catch(() => {});

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: activeUser,
      });
    }

    // 2. Fallback DB lookup for customized credentials
    let user = null;
    try {
      user = await staffRepo.findByIdentifier(rawIdentifier);
    } catch (e) {
      console.warn('[authController] DB lookup error:', e.message);
    }

    // If user not found in DB, check hardcoded default admins to auto-provision
    if (!user) {
      if (isAditya) {
        user = {
          username: 'adityarenake',
          email: 'tigeradi1504@gmail.com',
          name: 'Aditya Renake',
          role: 'root_owner',
          passwordHash: '',
        };
      } else if (isScanner) {
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

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    staffRepo.updateLastLogin(user.username).catch(() => {});

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

/**
 * Register a new Attendee / Student Account
 */
export const attendeeRegister = async (req, res) => {
  try {
    const { name, username, email, password, institution, phone } = req.body || {};
    const cleanName = String(name || '').trim();
    const cleanUsername = String(username || '').toLowerCase().trim().replace(/[^a-z0-9_.-]/g, '');
    const cleanEmail = String(email || '').toLowerCase().trim();
    const cleanPassword = String(password || '').trim();

    if (!cleanName || !cleanUsername || !cleanEmail || !cleanPassword) {
      return res.status(400).json({
        success: false,
        message: 'Full name, username, email address, and password are required.',
      });
    }

    if (cleanUsername.length < 3) {
      return res.status(400).json({ success: false, message: 'Username must be at least 3 characters.' });
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // Check if username is reserved for staff
    if (cleanUsername === 'adityarenake' || cleanUsername === 'gate_scanner_1') {
      return res.status(400).json({ success: false, message: 'This username is reserved. Please pick another.' });
    }

    // Check if username already exists
    const existingUser = await userRepo.findByUsername(cleanUsername);
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Username is already taken. Please choose another.' });
    }

    // Check if email already registered
    const existingEmail = await userRepo.findByEmail(cleanEmail);
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists. Please log in.' });
    }

    // Create user
    const newUser = await userRepo.createUser({
      name: cleanName,
      username: cleanUsername,
      email: cleanEmail,
      password: cleanPassword,
      institution,
      phone,
    });

    // Find any existing passes registered under this email
    const passes = await registrantRepo.findAllByEmail(cleanEmail);

    const token = jwt.sign(
      {
        userId: newUser.username,
        username: newUser.username,
        email: newUser.email,
        name: newUser.name,
        role: 'attendee',
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: `Account created successfully! Welcome to Eventra, ${newUser.name}.`,
      token,
      user: newUser,
      passesCount: passes.length,
    });
  } catch (error) {
    console.error('Attendee register error:', error);
    return res.status(500).json({ success: false, message: 'Account creation failed.', error: error.message });
  }
};

/**
 * Attendee Login with Username/Email and Password
 */
export const attendeeLogin = async (req, res) => {
  try {
    const { identifier, username, email, password } = req.body || {};
    const rawIdentifier = String(identifier || username || email || '').toLowerCase().trim();
    const rawPassword = String(password || '').trim();

    if (!rawIdentifier || !rawPassword) {
      return res.status(400).json({
        success: false,
        message: 'Username/Email and password are required.',
      });
    }

    const user = await userRepo.findByIdentifier(rawIdentifier);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No attendee account found matching this username or email.',
      });
    }

    const isMatch = await userRepo.verifyPassword(rawPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.',
      });
    }

    const passes = await registrantRepo.findAllByEmail(user.email);

    const token = jwt.sign(
      {
        userId: user.username,
        username: user.username,
        email: user.email,
        name: user.name,
        role: 'attendee',
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { passwordHash: _, ...safeUser } = user;

    return res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      token,
      user: safeUser,
      passesCount: passes.length,
    });
  } catch (error) {
    console.error('Attendee login error:', error);
    return res.status(500).json({ success: false, message: 'Attendee login failed.', error: error.message });
  }
};
