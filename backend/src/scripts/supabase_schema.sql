-- =========================================================================
-- EVENTRA 2026 - PRODUCTION SUPABASE POSTGRESQL SCHEMA
-- Execute this script in your Supabase SQL Editor (1-Click Run)
-- =========================================================================

-- 1. CLUB EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.club_events (
    id TEXT PRIMARY KEY,
    event_id TEXT,
    slug TEXT,
    name TEXT NOT NULL,
    tagline TEXT,
    category TEXT DEFAULT 'Hackathon',
    structure_type TEXT DEFAULT 'single',
    college_name TEXT,
    club_name TEXT,
    club_code TEXT,
    description TEXT,
    banner_url TEXT,
    theme_color TEXT DEFAULT '#596EE6',
    mode TEXT DEFAULT 'in_person',
    start_date TEXT,
    end_date TEXT,
    date_display TEXT,
    time_display TEXT,
    venue TEXT,
    venue_hall TEXT,
    map_url TEXT,
    meeting_url TEXT,
    organizer_name TEXT,
    organizer_role TEXT,
    organizer_email TEXT,
    organizer_phone TEXT,
    alternate_poc TEXT,
    pricing_type TEXT DEFAULT 'paid',
    entry_fee NUMERIC DEFAULT 5,
    fee_display TEXT DEFAULT '₹5 Entry Pass',
    ticket_tiers JSONB DEFAULT '["Hacker Pass", "Student Pass"]'::jsonb,
    ticket_prices JSONB DEFAULT '{"Hacker Pass": 5, "Student Pass": 5}'::jsonb,
    tracks JSONB DEFAULT '["AI & Agentic Systems", "Cybersecurity", "Web3", "Cloud"]'::jsonb,
    schedule JSONB DEFAULT '[]'::jsonb,
    sub_events JSONB DEFAULT '[]'::jsonb,
    required_fields JSONB DEFAULT '{"fullName": true, "email": true, "phone": true, "college": true}'::jsonb,
    custom_question TEXT,
    whatsapp_url TEXT,
    discord_url TEXT,
    brochure_url TEXT,
    social_url TEXT,
    status TEXT DEFAULT 'live',
    is_flagship BOOLEAN DEFAULT false,
    allow_spot_registration BOOLEAN DEFAULT true,
    total_capacity INTEGER DEFAULT 500,
    assigned_event_heads JSONB DEFAULT '["adityarenake"]'::jsonb,
    assigned_scanners JSONB DEFAULT '["adityarenake"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure newly added columns exist if table was previously created
ALTER TABLE public.club_events ADD COLUMN IF NOT EXISTS event_id TEXT;
ALTER TABLE public.club_events ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.club_events ADD COLUMN IF NOT EXISTS allow_spot_registration BOOLEAN DEFAULT true;

-- 2. REGISTRANTS / DIGITAL PASSES TABLE
CREATE TABLE IF NOT EXISTS public.registrants (
    id TEXT PRIMARY KEY,
    unique_id TEXT UNIQUE NOT NULL,
    event_id TEXT NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    institution TEXT,
    ticket_type TEXT DEFAULT 'Standard Pass',
    team_name TEXT,
    track TEXT,
    github_url TEXT,
    payment_status TEXT DEFAULT 'free',
    payment_amount NUMERIC DEFAULT 0,
    amount_paid NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    order_id TEXT,
    payment_id TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    utr_number TEXT,
    qr_payload TEXT,
    qr_signature TEXT,
    qr_code_data_url TEXT,
    qr_hmac_signature TEXT,
    checked_in BOOLEAN DEFAULT false,
    checked_in_at TIMESTAMPTZ,
    checked_in_by TEXT,
    checked_in_photo TEXT,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    verified BOOLEAN DEFAULT false,
    verification_status TEXT DEFAULT 'confirmed',
    paid_at TIMESTAMPTZ,
    form_responses JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure newly added columns exist if table was previously created
ALTER TABLE public.registrants ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;
ALTER TABLE public.registrants ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';
ALTER TABLE public.registrants ADD COLUMN IF NOT EXISTS order_id TEXT;
ALTER TABLE public.registrants ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.registrants ADD COLUMN IF NOT EXISTS qr_payload TEXT;
ALTER TABLE public.registrants ADD COLUMN IF NOT EXISTS qr_signature TEXT;
ALTER TABLE public.registrants ADD COLUMN IF NOT EXISTS checked_in_photo TEXT;
ALTER TABLE public.registrants ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;
ALTER TABLE public.registrants ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE public.registrants ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Registrant Fast Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_registrants_email ON public.registrants (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_registrants_unique_id ON public.registrants (unique_id);
CREATE INDEX IF NOT EXISTS idx_registrants_event_id ON public.registrants (event_id);
CREATE INDEX IF NOT EXISTS idx_registrants_utr ON public.registrants (utr_number);
CREATE INDEX IF NOT EXISTS idx_registrants_checked_in ON public.registrants (checked_in);

-- 3. ATTENDEE USER ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    institution TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'attendee',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON public.users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (LOWER(email));

-- 4. STAFF / OPERATIONS USERS TABLE
CREATE TABLE IF NOT EXISTS public.staff_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT,
    role TEXT DEFAULT 'scanner',
    assigned_event_ids JSONB DEFAULT '["*"]'::jsonb,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_username ON public.staff_users (LOWER(username));

-- 5. SYSTEM CONFIG TABLE
CREATE TABLE IF NOT EXISTS public.system_config (
    id TEXT PRIMARY KEY,
    config_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- SEED INITIAL DATA (Eventra Flagship Event & Default Staff)
-- =========================================================================

-- Seed Eventra 2026 Flagship
INSERT INTO public.club_events (
    id, event_id, slug, name, tagline, category, college_name, club_name, club_code,
    description, banner_url, theme_color, mode, start_date, end_date,
    date_display, time_display, venue, venue_hall, map_url,
    organizer_name, organizer_role, organizer_email, organizer_phone,
    pricing_type, entry_fee, fee_display, status, is_flagship, total_capacity
) VALUES (
    'eventra-2026',
    'eventra-2026',
    'eventra-2026',
    'Eventra 2026',
    'India''s Flagship 48-Hour National Hackathon • ACES DIT Pune',
    'Hackathon',
    'Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune',
    'ACES (Association of Computer Engineering Students)',
    'ACES-DIT',
    '48-hour continuous hackathon with ₹15,00,000+ prize pool, Gigabit Wi-Fi, mentorship, and high-density computing labs at Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune.',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    '#596EE6',
    'in_person',
    '2026-10-16T09:00',
    '2026-10-18T18:00',
    'October 16 – 18, 2026',
    '09:00 AM IST (Gate Check-in starts 07:30 AM)',
    'Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune',
    'DIT Main Auditorium & High-Density Compute Labs',
    'https://maps.google.com/?q=Dr.+D.+Y.+Patil+Institute+of+Technology+Pimpri+Pune',
    'Aditya Renake',
    'Lead Operations & Main Event Organizer',
    'tigeradi1504@gmail.com',
    '+91 9890829874',
    'paid',
    5,
    '₹5 Entry Pass',
    'live',
    true,
    500
) ON CONFLICT (id) DO UPDATE SET is_flagship = true;

-- Seed Default Root Operations Owner (Aditya Renake)
INSERT INTO public.staff_users (
    id, username, name, email, password_hash, role, assigned_event_ids
) VALUES (
    'adityarenake',
    'adityarenake',
    'Aditya Renake',
    'tigeradi1504@gmail.com',
    '$2a$10$wT0qBsknL50854Z76W07yuhb0u3e6V76gS2Q83CqfR2.rVzLre.oK',
    'root_owner',
    '["*"]'::jsonb
) ON CONFLICT (id) DO UPDATE SET role = 'root_owner';

-- Enable Row Level Security (RLS) - Permissive for backend service role
ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Allow public read access on events & allow service role full access
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read events" ON public.club_events;
    CREATE POLICY "Public read events" ON public.club_events FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Service role full events" ON public.club_events;
    CREATE POLICY "Service role full events" ON public.club_events USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public lookup passes" ON public.registrants;
    CREATE POLICY "Public lookup passes" ON public.registrants FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Service role full registrants" ON public.registrants;
    CREATE POLICY "Service role full registrants" ON public.registrants USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Service role full users" ON public.users;
    CREATE POLICY "Service role full users" ON public.users USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Service role full staff" ON public.staff_users;
    CREATE POLICY "Service role full staff" ON public.staff_users USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Service role full config" ON public.system_config;
    CREATE POLICY "Service role full config" ON public.system_config USING (true) WITH CHECK (true);
END $$;
