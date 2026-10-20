/**
 * ==============================================================================
 * HackSeries 2026 — Authentication & Role-Based Access Middleware
 * ==============================================================================
 * Purpose:
 *   Guards administrative endpoints and verifies incoming Bearer tokens:
 *   1. Primary: Validates Supabase GoTrue JWT tokens via `verifySupabaseToken()`.
 *   2. Fallback: Verifies HMAC-SHA256 custom JWTs for legacy/offline support.
 *   3. Enforces Role Guards: `requireAdmin`, `requireScanner`, `requireRootOwner`.
 * ==============================================================================
 */

import jwt from 'jsonwebtoken';
import { staffRepo } from '../models/staffRepo.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hackseries_2026_jwt_super_secret_key_8899';

/**
 * Authentication Gatekeeper: Verifies token existence, validates signature, and attaches user to `req.user`.
 */
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication token required.' });
    }

    // 1. Try Supabase Auth verification
    try {
      const { verifySupabaseToken } = await import('../services/supabaseAuthService.js');
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser) {
        req.user = supabaseUser;
        return next();
      }
    } catch (e) {
      // Supabase verification quiet fallback
    }

    // 2. Legacy / Custom JWT verification
    const decoded = jwt.verify(token, JWT_SECRET);

    let user = await staffRepo.findByIdentifier(decoded.userId || decoded.username);
    if (!user) {
      // Resilient fallback to verified token payload for default super admins & scanners
      if (decoded.username) {
        user = {
          username: decoded.username,
          email: decoded.email || `${decoded.username}@hackseries.org`,
          name: decoded.name || decoded.username,
          role: decoded.role || 'admin',
        };
      } else {
        return res.status(401).json({ success: false, message: 'User account not found or deactivated.' });
      }
    }

    const { passwordHash, ...userSafe } = user;
    req.user = userSafe;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', error: error.message });
  }
};

export const requireAdmin = (req, res, next) => {
  const allowedRoles = ['admin', 'super_admin', 'root_owner', 'event_head'];
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Administrator privileges required.' });
  }
  next();
};

export const requireRootOwner = (req, res, next) => {
  const isOwner = req.user && (
    req.user.role === 'root_owner' ||
    req.user.username?.toLowerCase() === 'adityarenake' ||
    req.user.email?.toLowerCase() === 'tigeradi1504@gmail.com' ||
    req.user.email?.toLowerCase() === 'aditya.renake@outlook.com'
  );
  if (!isOwner) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Main Event Organizer / Root Owner privileges (Aditya Renake) required.',
    });
  }
  next();
};
