/**
 * ==============================================================================
 * HackSeries 2026 — Supabase Staff Authentication & Role Service
 * ==============================================================================
 * Purpose:
 *   Manages operations staff identity and role-based access control (RBAC).
 * 
 * RBAC Hierarchy:
 *   - `root_owner` (Aditya Renake): Complete unrestricted administrative control.
 *     Immutable role that cannot be deleted or demoted.
 *   - `admin` / `event_head`: Can view telemetry, manage registrants, create club events.
 *   - `scanner`: Gate volunteer role restricted strictly to `/scanner` and scan validation.
 * 
 * Security Mechanics:
 *   - Staff users are created in Supabase GoTrue with `email_confirm: true`.
 *   - Role claims are embedded in JWT `app_metadata` (protected from user tampering).
 *   - Incoming API requests provide `Authorization: Bearer <token>`, validated via `getUser()`.
 * ==============================================================================
 */

import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';

/**
 * Known default credentials mapping for platform bootstrap and local development.
 */
const STAFF_MAPPING = {
  'adityarenake': {
    email: 'tigeradi1504@gmail.com',
    name: 'Aditya Renake',
    role: 'root_owner',
    defaultPassword: 'Aditya@11',
  },
  'tigeradi1504@gmail.com': {
    email: 'tigeradi1504@gmail.com',
    name: 'Aditya Renake',
    role: 'root_owner',
    defaultPassword: 'Aditya@11',
  },
  'aditya.renake@outlook.com': {
    email: 'tigeradi1504@gmail.com',
    name: 'Aditya Renake',
    role: 'root_owner',
    defaultPassword: 'Aditya@11',
  },
  'rajsingh2007.rs@gmail.com': {
    email: 'rajsingh2007.rs@gmail.com',
    name: 'Raj Singh',
    role: 'root_owner',
  },
  'rajsingh': {
    email: 'rajsingh2007.rs@gmail.com',
    name: 'Raj Singh',
    role: 'root_owner',
  },
};

/**
 * Idempotently provisions initial staff accounts in Supabase Auth GoTrue.
 * Injects `app_metadata.role` claims required by middleware security guards.
 */
export const seedSupabaseStaffUsers = async () => {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  try {
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (listError) {
      console.warn('⚠️ Supabase listUsers error:', listError.message);
      return;
    }

    const existingEmails = new Set((usersData?.users || []).map((u) => u.email?.toLowerCase()));

    const staffToSeed = [
      {
        email: 'tigeradi1504@gmail.com',
        password: 'Aditya@11',
        name: 'Aditya Renake',
        username: 'adityarenake',
        role: 'root_owner',
      },
      {
        email: 'rajsingh2007.rs@gmail.com',
        password: 'Admin@123',
        name: 'Raj Singh',
        username: 'rajsingh',
        role: 'root_owner',
      },
    ];

    for (const staff of staffToSeed) {
      if (!existingEmails.has(staff.email.toLowerCase())) {
        console.log(`👑 [Supabase Auth] Provisioning staff user (${staff.email})...`);
        const { error: createErr } = await admin.auth.admin.createUser({
          email: staff.email,
          password: staff.password,
          email_confirm: true,
          app_metadata: {
            role: staff.role,
            username: staff.username,
            name: staff.name,
          },
          user_metadata: {
            name: staff.name,
          },
        });
        if (createErr) {
          console.warn(`⚠️ [Supabase Auth] Could not create ${staff.email}:`, createErr.message);
        } else {
          console.log(`✅ [Supabase Auth] Created staff user ${staff.email} (${staff.role}).`);
        }
      } else {
        // Ensure app_metadata role is up to date
        const user = usersData.users.find((u) => u.email?.toLowerCase() === staff.email.toLowerCase());
        if (user && user.app_metadata?.role !== staff.role) {
          await admin.auth.admin.updateUserById(user.id, {
            app_metadata: {
              ...user.app_metadata,
              role: staff.role,
              username: staff.username,
              name: staff.name,
            },
          });
        }
      }
    }
  } catch (err) {
    console.warn('⚠️ [Supabase Auth] Staff seed error:', err.message);
  }
};

/**
 * Authenticates user against Supabase Auth
 */
export const loginWithSupabase = async (identifier, password) => {
  const client = getSupabaseClient();
  const admin = getSupabaseAdmin();
  if (!client) {
    return { success: false, fallback: true, message: 'Supabase client not initialized' };
  }

  const cleanId = String(identifier || '').toLowerCase().trim();
  let mapping = STAFF_MAPPING[cleanId];
  let targetEmail = mapping ? mapping.email : cleanId;

  // 1. If identifier is a UUID (like the Supabase Auth user ID)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);
  if (isUuid && admin) {
    try {
      const { data: userById } = await admin.auth.admin.getUserById(cleanId);
      if (userById?.user?.email) {
        targetEmail = userById.user.email.toLowerCase();
        mapping = STAFF_MAPPING[targetEmail] || mapping;
      }
    } catch (e) {}
  }

  // 2. If identifier has no '@', search in Supabase auth users
  if (!targetEmail.includes('@') && admin) {
    try {
      const { data: usersData } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
      const found = (usersData?.users || []).find((u) =>
        u.email?.toLowerCase().startsWith(cleanId + '@') ||
        u.app_metadata?.username?.toLowerCase() === cleanId ||
        u.user_metadata?.username?.toLowerCase() === cleanId
      );
      if (found?.email) {
        targetEmail = found.email.toLowerCase();
        mapping = STAFF_MAPPING[targetEmail] || mapping;
      }
    } catch (e) {}
  }

  // Attempt Supabase sign-in
  const { data, error } = await client.auth.signInWithPassword({
    email: targetEmail,
    password,
  });

  if (error || !data?.session) {
    // If user mapping exists and fallback master password matched, or need to auto-create user
    if (mapping && admin) {
      if (password === mapping.defaultPassword || password === 'Aditya@123' || password === 'Admin@123') {
        // Ensure user exists and update password
        await seedSupabaseStaffUsers();
        const retry = await client.auth.signInWithPassword({
          email: targetEmail,
          password: mapping.defaultPassword,
        });
        if (retry.data?.session) {
          const user = retry.data.user;
          const role = user.app_metadata?.role || mapping.role;
          return {
            success: true,
            token: retry.data.session.access_token,
            user: {
              id: user.id,
              username: user.app_metadata?.username || cleanId,
              email: user.email,
              name: user.app_metadata?.name || mapping.name,
              role,
            },
          };
        }
      }
    }

    return {
      success: false,
      message: error?.message || 'Invalid credentials.',
    };
  }

  const user = data.user;
  const userEmail = user.email?.toLowerCase();
  let role =
    user.app_metadata?.role ||
    (mapping
      ? mapping.role
      : userEmail === 'rajsingh2007.rs@gmail.com' || userEmail === 'tigeradi1504@gmail.com'
      ? 'root_owner'
      : 'admin');

  // Auto-inject role into app_metadata if not present yet
  if (!user.app_metadata?.role && admin) {
    await admin.auth.admin
      .updateUserById(user.id, {
        app_metadata: {
          ...user.app_metadata,
          role,
          username: user.app_metadata?.username || userEmail?.split('@')[0],
          name: user.app_metadata?.name || user.user_metadata?.name || userEmail?.split('@')[0],
        },
      })
      .catch(() => {});
  }

  return {
    success: true,
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: {
      id: user.id,
      username: user.app_metadata?.username || user.user_metadata?.username || userEmail?.split('@')[0],
      email: user.email,
      name: user.app_metadata?.name || user.user_metadata?.name || user.app_metadata?.username || user.user_metadata?.username || userEmail?.split('@')[0],
      role,
    },
  };
};

/**
 * Validates token with Supabase Auth
 */
export const verifySupabaseToken = async (token) => {
  const admin = getSupabaseAdmin();
  if (!admin || !token) return null;

  try {
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(token);
    if (error || !user) return null;

    const email = user.email?.toLowerCase();
    const mapping = STAFF_MAPPING[email] || STAFF_MAPPING[user.app_metadata?.username];
    const role =
      user.app_metadata?.role ||
      (mapping
        ? mapping.role
        : email === 'rajsingh2007.rs@gmail.com' || email === 'tigeradi1504@gmail.com'
        ? 'root_owner'
        : 'admin');

    return {
      id: user.id,
      userId: user.id,
      username: user.app_metadata?.username || email?.split('@')[0],
      email: user.email,
      name: user.app_metadata?.name || user.user_metadata?.name || email?.split('@')[0],
      role,
    };
  } catch (e) {
    return null;
  }
};
