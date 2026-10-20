/**
 * ============================================================================
 * AUTHENTICATION CONTROLLER (authController.js)
 * ============================================================================
 * Purpose:
 *   Handles staff and organizer login, password verification, JSON Web Token (JWT)
 *   generation, and active session verification (`/auth/me`).
 *
 * Key Capabilities:
 *   - Authenticates against staff database with bcrypt password comparison.
 *   - Auto-seeds root administrator account if missing.
 *   - Generates signed JWT payload containing username, role, and assigned event scopes.
 * ============================================================================
 */

import jwt from 'jsonwebtoken';
import { staffRepo } from '../models/staffRepo.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hackseries_2026_jwt_super_secret_key_8899';
const OWNER_REGISTRATION_SECRET = process.env.OWNER_REGISTRATION_SECRET || 'K8!vR3@pZ6#n';

export const login = async (req, res) => {
  try {
    const { username, email, identifier, password } = req.body || {};
    let rawEmail = String(email || identifier || username || '').toLowerCase().trim();
    const rawPassword = String(password || '').trim();

    if (!rawEmail || !rawPassword) {
      return res.status(400).json({ success: false, message: 'Username/Email address and password are required.' });
    }

    // Automatically resolve known usernames or lookup in staffRepo
    if (rawEmail === 'adityarenake') {
      rawEmail = 'tigeradi1504@gmail.com';
    } else if (rawEmail === 'gate_scanner_1') {
      rawEmail = 'scanner@acesdit.org';
    } else if (rawEmail === 'rajsingh') {
      rawEmail = 'rajsingh2007.rs@gmail.com';
    } else if (!rawEmail.includes('@')) {
      const existingUser = await staffRepo.findByUsername(rawEmail).catch(() => null);
      if (existingUser?.email) {
        rawEmail = existingUser.email.toLowerCase().trim();
      } else {
        return res.status(400).json({ success: false, message: 'Please enter a valid registered email address or username.' });
      }
    }

    // Always ensure default admin accounts exist
    await staffRepo.seedDefaultAdmin().catch(() => {});

    // Explicitly reject revoked users
    if (
      rawEmail === 'sohamchitnis' ||
      rawEmail === 'haritirawal' ||
      rawEmail.includes('sohamchitnis@') ||
      rawEmail.includes('haritirawal@')
    ) {
      return res.status(403).json({ success: false, message: 'Access permanently revoked by Lead Operations.' });
    }

    // 1. Attempt Supabase Auth login
    try {
      const { loginWithSupabase } = await import('../services/supabaseAuthService.js');
      const supabaseResult = await loginWithSupabase(rawEmail, rawPassword);
      if (supabaseResult.success && supabaseResult.token) {
        return res.json({
          success: true,
          message: 'Login successful via Supabase Auth',
          token: supabaseResult.token,
          user: supabaseResult.user,
        });
      }
    } catch (supaErr) {
      console.warn('⚠️ Supabase login attempt notice:', supaErr.message);
    }

    let resolvedIdentifier = rawEmail;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawEmail);
    if (isUuid) {
      try {
        const { getSupabaseAdmin } = await import('../config/supabase.js');
        const admin = getSupabaseAdmin();
        if (admin) {
          const { data: userById } = await admin.auth.admin.getUserById(rawEmail);
          if (userById?.user?.email) {
            resolvedIdentifier = userById.user.email.toLowerCase();
          }
        }
      } catch (e) {}
    }

    let user = await staffRepo.findByIdentifier(resolvedIdentifier);

    // Also check Supabase Auth if not in staffRepo
    let supabaseUser = null;
    try {
      const { getSupabaseAdmin } = await import('../config/supabase.js');
      const admin = getSupabaseAdmin();
      if (admin) {
        const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
        supabaseUser = (usersData?.users || []).find((u) => u.email?.toLowerCase() === rawEmail);
        if (supabaseUser && !user) {
          user = {
            username: supabaseUser.app_metadata?.username || supabaseUser.user_metadata?.username || rawEmail.split('@')[0],
            email: supabaseUser.email,
            name: supabaseUser.app_metadata?.name || supabaseUser.user_metadata?.name || rawEmail.split('@')[0],
            role: supabaseUser.app_metadata?.role || 'root_owner',
            passwordHash: '',
          };
        }
      }
    } catch (e) {}

    // Check hardcoded default root owners if needed
    if (!user) {
      if (
        resolvedIdentifier === 'adityarenake' ||
        resolvedIdentifier === 'tigeradi1504@gmail.com' ||
        resolvedIdentifier === 'aditya.renake@outlook.com'
      ) {
        user = {
          username: 'adityarenake',
          email: 'tigeradi1504@gmail.com',
          name: 'Aditya Renake',
          role: 'root_owner',
          passwordHash: '',
        };
      } else if (resolvedIdentifier === 'gate_scanner_1' || resolvedIdentifier === 'scanner@acesdit.org') {
        user = {
          username: 'gate_scanner_1',
          email: 'scanner@acesdit.org',
          name: 'Gate Scanner Volunteer 1',
          role: 'scanner',
          passwordHash: '',
        };
      }
    }

    // Accurate Error 1: Account not found / not registered
    if (!user && !supabaseUser) {
      return res.status(404).json({
        success: false,
        code: 'USER_NOT_REGISTERED',
        message: `No registered account found under "${rawEmail}". Please click "Wanna register as an Owner?" below to activate your account.`,
      });
    }

    // Verify Password (Bcrypt or Emergency Passwords)
    let isMatch = false;
    if (user.passwordHash) {
      try {
        isMatch = await staffRepo.verifyPassword(rawPassword, user.passwordHash);
      } catch (err) {
        isMatch = false;
      }
    }

    // Master Passwords & Owner Secret fallback
    if (!isMatch) {
      if (
        (user.username === 'adityarenake' || user.email === 'tigeradi1504@gmail.com' || user.email === 'aditya.renake@outlook.com') &&
        (rawPassword === 'Aditya@11' || rawPassword === 'Aditya@123' || rawPassword === 'Admin@123' || rawPassword === OWNER_REGISTRATION_SECRET)
      ) {
        isMatch = true;
      } else if (
        (user.username === 'rajsingh' || user.email === 'rajsingh2007.rs@gmail.com' || user.role === 'root_owner') &&
        (rawPassword === 'Admin@123' || rawPassword === 'Raj@123' || rawPassword === 'RajSingh@123' || rawPassword === 'Password@123' || rawPassword === OWNER_REGISTRATION_SECRET)
      ) {
        isMatch = true;
      } else if (
        (user.username === 'gate_scanner_1' || user.email === 'scanner@acesdit.org') &&
        (rawPassword === 'Scanner@11' || rawPassword === 'Admin@123')
      ) {
        isMatch = true;
      }
    }

    // Accurate Error 2: Account exists but password does not match
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        code: 'INCORRECT_PASSWORD',
        message: `Incorrect password for "${rawEmail}". If you forgot or want to update your password, click "Wanna register as an Owner?" below to re-register with the Owner Passcode.`,
      });
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
 * ============================================================================
 * REGISTER AS EVENT OWNER
 * ============================================================================
 * Elevates an account with 'root_owner' role if they supply the valid Owner
 * Master Passcode (`K8!vR3@pZ6#n`).
 * Proactively provisions the user into Supabase Auth GoTrue and staff database.
 * ============================================================================
 */
export const registerOwner = async (req, res) => {
  try {
    const { email, password, ownerSecret, name, username } = req.body || {};
    const cleanEmail = String(email || '').toLowerCase().trim();
    const cleanPassword = String(password || '').trim();
    const cleanSecret = String(ownerSecret || '').trim();
    const requestedUsername = String(username || name || '').trim();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, message: 'Please provide a valid registered email address.' });
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }
    if (!cleanSecret) {
      return res.status(400).json({ success: false, message: 'Owner Secret Passcode is required.' });
    }

    if (cleanSecret !== OWNER_REGISTRATION_SECRET) {
      return res.status(403).json({ success: false, message: 'Invalid Owner Secret Passcode. Unauthorized access.' });
    }

    const finalUsername = requestedUsername || cleanEmail.split('@')[0];
    const displayName = requestedUsername || String(name || '').trim() || finalUsername;

    // 1. Provision / Update in Supabase Auth GoTrue
    const { getSupabaseAdmin } = await import('../config/supabase.js');
    const admin = getSupabaseAdmin();

    if (admin) {
      try {
        const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
        const existing = (usersData?.users || []).find((u) => u.email?.toLowerCase() === cleanEmail);

        if (existing) {
          await admin.auth.admin.updateUserById(existing.id, {
            password: cleanPassword,
            email_confirm: true,
            app_metadata: {
              ...existing.app_metadata,
              role: 'root_owner',
              username: finalUsername,
              name: displayName,
            },
            user_metadata: {
              ...existing.user_metadata,
              username: finalUsername,
              name: displayName,
            },
          });
        } else {
          await admin.auth.admin.createUser({
            email: cleanEmail,
            password: cleanPassword,
            email_confirm: true,
            app_metadata: {
              role: 'root_owner',
              username: finalUsername,
              name: displayName,
            },
            user_metadata: {
              username: finalUsername,
              name: displayName,
            },
          });
        }
      } catch (authErr) {
        console.warn('⚠️ Supabase Auth registration notice:', authErr.message);
      }
    }

    // 2. Upsert into staffRepo database
    await staffRepo.createStaff({
      username: finalUsername,
      email: cleanEmail,
      name: displayName,
      password: cleanPassword,
      role: 'root_owner',
      assignedEventIds: ['*'],
    });

    // 3. Issue persistent JWT token
    const token = jwt.sign(
      {
        userId: finalUsername,
        username: finalUsername,
        email: cleanEmail,
        name: displayName,
        role: 'root_owner',
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: `Owner account verified & activated for ${cleanEmail}!`,
      token,
      user: {
        id: finalUsername,
        username: finalUsername,
        email: cleanEmail,
        name: displayName,
        role: 'root_owner',
      },
    });
  } catch (error) {
    console.error('Owner registration error:', error);
    return res.status(500).json({ success: false, message: 'Failed to register owner', error: error.message });
  }
};
