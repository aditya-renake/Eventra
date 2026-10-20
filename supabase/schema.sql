-- ⚡ HackSeries 2026 — Official Supabase Postgres Database Schema

-- 1. Registrants Table
CREATE TABLE IF NOT EXISTS public.registrants (
    unique_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT DEFAULT '',
    ticket_type TEXT DEFAULT 'Hacker Pass',
    team_name TEXT DEFAULT '',
    track TEXT DEFAULT 'AI & Agentic Systems',
    institution TEXT DEFAULT '',
    github_url TEXT DEFAULT '',
    form_responses JSONB DEFAULT '{}'::jsonb,
    qr_payload TEXT,
    qr_signature TEXT,
    qr_code_url TEXT,
    qr_code_data_url TEXT,
    verified BOOLEAN DEFAULT false,
    verification_status TEXT DEFAULT 'Not Verified',
    verified_at TIMESTAMPTZ,
    payment_status TEXT DEFAULT 'PENDING',
    payment_id TEXT,
    order_id TEXT,
    amount_paid NUMERIC DEFAULT 0,
    paid_at TIMESTAMPTZ,
    checked_in BOOLEAN DEFAULT false,
    checked_in_at TIMESTAMPTZ,
    checked_in_by TEXT,
    checked_in_photo TEXT,
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_registrants_email ON public.registrants (lower(email));
CREATE INDEX IF NOT EXISTS idx_registrants_checked_in ON public.registrants (checked_in, checked_in_at DESC);
CREATE INDEX IF NOT EXISTS idx_registrants_verified ON public.registrants (verified);
CREATE INDEX IF NOT EXISTS idx_registrants_order_id ON public.registrants (order_id);
CREATE INDEX IF NOT EXISTS idx_registrants_payment_id ON public.registrants (payment_id);

-- 2. Staff Users Table
CREATE TABLE IF NOT EXISTS public.staff_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT,
    role TEXT DEFAULT 'scanner',
    assigned_event_ids TEXT[] DEFAULT ARRAY['*'],
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Club Events Catalog Table
CREATE TABLE IF NOT EXISTS public.club_events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tagline TEXT,
    category TEXT,
    entry_fee NUMERIC DEFAULT 0,
    fee_display TEXT,
    date_display TEXT,
    time_display TEXT,
    venue TEXT,
    prize_pool TEXT,
    google_form_url TEXT,
    organizer_name TEXT,
    organizer_email TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Event Configuration Table
CREATE TABLE IF NOT EXISTS public.event_config (
    id TEXT PRIMARY KEY DEFAULT 'main_event_2026',
    event_name TEXT DEFAULT 'HackSeries 2026',
    event_tagline TEXT,
    event_date TEXT DEFAULT 'October 16 - 18, 2026',
    event_time TEXT DEFAULT '09:00 AM IST',
    event_venue TEXT,
    organizer_email TEXT DEFAULT 'tigeradi1504@gmail.com',
    organizer_name TEXT,
    google_form_url TEXT,
    registration_mode TEXT DEFAULT 'native_payment',
    enable_payment_gateway BOOLEAN DEFAULT true,
    ticket_prices JSONB DEFAULT '{"Hacker Pass": 5, "Student Pass": 5, "VIP Delegate": 5, "Judge / Mentor": 5}'::jsonb,
    currency TEXT DEFAULT 'INR',
    upi_id TEXT,
    upi_payee_name TEXT,
    smtp_user TEXT,
    smtp_pass TEXT,
    email_subject_template TEXT,
    email_body_notice TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed Default Config
INSERT INTO public.event_config (id, event_name, event_tagline, event_date, event_time, event_venue, organizer_email, organizer_name, google_form_url)
VALUES (
    'main_event_2026',
    'HackSeries 2026',
    'Presented by ACES — Dept. of Computer Engineering, Dr. D. Y. Patil Institute of Technology, Pimpri, Pune (DYPDPU)',
    'October 16 - 18, 2026',
    '09:00 AM IST (Gate Check-in starts 07:30 AM)',
    'Dr. D. Y. Patil Institute of Technology (DIT), Sant Tukaram Nagar, Pimpri, Pune - 411018',
    'tigeradi1504@gmail.com',
    'ACES (Association of Computer Engineering Students), DIT Pune',
    'https://forms.gle/TmoSjzxUt7yAKz1o6'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Default Events
INSERT INTO public.club_events (id, name, tagline, category, entry_fee, fee_display, date_display, time_display, venue, prize_pool, organizer_name, organizer_email)
VALUES
(
    'hackseries-2026',
    'HackSeries 2026 (Flagship Hackathon)',
    'National-Level 48-Hour Open Innovation, AI & Cloud Computing Hackathon by ACES DIT Pune',
    'Flagship Hackathon',
    5,
    '₹5 Entry Pass',
    'October 16 - 18, 2026',
    '09:00 AM IST (Check-in starts 07:30 AM)',
    'Auditorium & Computer Engineering Labs, DIT Pimpri, Pune',
    '₹15,00,000+ Prize Pool',
    'ACES DIT Pune',
    'tigeradi1504@gmail.com'
),
(
    'ai-agents-bootcamp',
    'AI & Multi-Agent Swarms Bootcamp',
    'Hands-on Masterclass on LangChain, AutoGen, and Autonomous Agent Orchestration',
    'Technical Workshop',
    0,
    'Free with HackSeries Pass',
    'October 17, 2026',
    '02:00 PM IST',
    'Seminar Hall 3, DIT Pune',
    'Certified Badges & API Credits',
    'ACES AI Lab',
    'tigeradi1504@gmail.com'
),
(
    'aces-esports-arena',
    'ACES Inter-College Esports Arena',
    'LAN Tournament for Valorant & BGMI during HackSeries breaks',
    'Esports & Gaming',
    0,
    'Free for Registered Hackers',
    'October 17 - 18, 2026',
    '10:00 PM IST (Night LAN)',
    'Indoor Sports Complex, DIT Pune',
    '₹50,000 Gaming Gear Pool',
    'ACES Gaming Wing',
    'tigeradi1504@gmail.com'
)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.registrants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_config ENABLE ROW LEVEL SECURITY;

-- Grants & Policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Service role full access on registrants" ON public.registrants;
    CREATE POLICY "Service role full access on registrants" ON public.registrants FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read on registrants" ON public.registrants;
    CREATE POLICY "Public read on registrants" ON public.registrants FOR SELECT TO anon, authenticated USING (true);

    DROP POLICY IF EXISTS "Service role full access on staff_users" ON public.staff_users;
    CREATE POLICY "Service role full access on staff_users" ON public.staff_users FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read on club_events" ON public.club_events;
    CREATE POLICY "Public read on club_events" ON public.club_events FOR SELECT TO anon, authenticated USING (true);

    DROP POLICY IF EXISTS "Service role full access on club_events" ON public.club_events;
    CREATE POLICY "Service role full access on club_events" ON public.club_events FOR ALL TO service_role USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read on event_config" ON public.event_config;
    CREATE POLICY "Public read on event_config" ON public.event_config FOR SELECT TO anon, authenticated USING (true);

    DROP POLICY IF EXISTS "Service role full access on event_config" ON public.event_config;
    CREATE POLICY "Service role full access on event_config" ON public.event_config FOR ALL TO service_role USING (true) WITH CHECK (true);
END $$;
