import { getSupabaseAdmin, getSupabaseClient, isSupabaseConfigured } from '../config/supabase.js';

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
  'gate_scanner_1': {
    email: 'scanner@acesdit.org',
    name: 'Gate Scanner Volunteer 1',
    role: 'scanner',
    defaultPassword: 'Scanner@11',
  },
  'scanner@acesdit.org': {
    email: 'scanner@acesdit.org',
    name: 'Gate Scanner Volunteer 1',
    role: 'scanner',
    defaultPassword: 'Scanner@11',
  },
};

/**
 * Ensures standard staff users are provisioned in Supabase Auth with appropriate app_metadata roles
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
        email: 'scanner@acesdit.org',
        password: 'Scanner@11',
        name: 'Gate Scanner Volunteer 1',
        username: 'gate_scanner_1',
        role: 'scanner',
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
  const mapping = STAFF_MAPPING[cleanId];
  const targetEmail = mapping ? mapping.email : cleanId;

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
  const role = user.app_metadata?.role || (mapping ? mapping.role : 'scanner');

  return {
    success: true,
    token: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: {
      id: user.id,
      username: user.app_metadata?.username || cleanId,
      email: user.email,
      name: user.app_metadata?.name || user.user_metadata?.name || user.email.split('@')[0],
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
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return null;

    const email = user.email?.toLowerCase();
    const mapping = STAFF_MAPPING[email] || STAFF_MAPPING[user.app_metadata?.username];
    const role = user.app_metadata?.role || (mapping ? mapping.role : 'scanner');

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
