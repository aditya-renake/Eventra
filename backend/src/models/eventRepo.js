import { getSupabaseAdmin } from '../config/supabase.js';

let eventsMemoryCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5000;

function invalidateCache() {
  eventsMemoryCache = null;
  lastCacheTime = 0;
}

export const DEFAULT_EVENTS = [
  {
    id: 'hackseries-2026',
    eventId: 'hackseries-2026',
    name: 'HackSeries 2026 (Flagship Hackathon)',
    tagline: 'National-Level 48-Hour Open Innovation, AI & Cloud Computing Hackathon by ACES DIT Pune',
    category: 'Flagship Hackathon',
    description: '48-hour continuous hackathon with ₹15,00,000+ prize pool, Gigabit Wi-Fi, mentorship, and high-density computing labs at Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune.',
    bannerUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80',
    startDate: '2026-10-16T09:00:00.000Z',
    endDate: '2026-10-18T18:00:00.000Z',
    dateDisplay: 'October 16 – 18, 2026',
    timeDisplay: '09:00 AM IST (Gate Check-in starts 07:30 AM)',
    venue: 'Auditorium & Computer Engineering Labs, DIT Pimpri, Pune',
    organizerName: 'ACES (Association of Computer Engineering Students), DIT Pune',
    organizerEmail: 'tigeradi1504@gmail.com',
    googleFormUrl: 'https://forms.gle/TmoSjzxUt7yAKz1o6',
    ticketTiers: ['Hacker Pass', 'VIP Delegate', 'Judge Pass', 'Mentor'],
    tracks: [
      'AI & Agentic Systems',
      'Cybersecurity & Privacy',
      'Web3 & Decentralized Tech',
      'Cloud & Distributed Systems',
      'Open Innovation & Campus Tech',
    ],
    status: 'live',
    isFlagship: true,
    totalCapacity: 500,
    assignedEventHeads: ['adityarenake'],
    assignedScanners: ['adityarenake'],
    entryFee: 5,
    feeDisplay: '₹5 Entry Pass',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ai-agents-bootcamp',
    eventId: 'ai-agents-bootcamp',
    name: 'AI & Multi-Agent Swarms Bootcamp',
    tagline: 'Hands-on Masterclass on LangChain, AutoGen, and Autonomous Agent Orchestration',
    category: 'Technical Workshop',
    description: 'Hands-on 2-day technical bootcamp where students build autonomous agent swarms, tool-calling agents, and production RAG pipelines with live GPU workstations.',
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    startDate: '2026-11-05T10:00:00.000Z',
    endDate: '2026-11-06T17:00:00.000Z',
    dateDisplay: 'October 17, 2026',
    timeDisplay: '02:00 PM IST',
    venue: 'Seminar Hall 3, DIT Pune',
    organizerName: 'ACES AI Lab',
    organizerEmail: 'tigeradi1504@gmail.com',
    googleFormUrl: 'https://forms.gle/TmoSjzxUt7yAKz1o6',
    ticketTiers: ['Workshop Pass', 'Student Pass'],
    tracks: ['Multi-Agent Systems', 'Model Fine-tuning', 'Vector Search'],
    status: 'upcoming',
    isFlagship: false,
    totalCapacity: 120,
    assignedEventHeads: ['adityarenake'],
    assignedScanners: ['adityarenake'],
    entryFee: 0,
    feeDisplay: 'Free with HackSeries Pass',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'aces-esports-arena',
    eventId: 'aces-esports-arena',
    name: 'ACES Inter-College Esports Arena',
    tagline: 'LAN Tournament for Valorant & BGMI during HackSeries breaks',
    category: 'Esports & Gaming',
    description: 'High-octane collegiate LAN esports championship featuring 32 shortlisted teams competing on ultra-low latency fiber networks with live shoutcasting.',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    startDate: '2026-11-20T11:00:00.000Z',
    endDate: '2026-11-21T20:00:00.000Z',
    dateDisplay: 'October 17 - 18, 2026',
    timeDisplay: '10:00 PM IST (Night LAN)',
    venue: 'Indoor Sports Complex, DIT Pune',
    organizerName: 'ACES Gaming Wing',
    organizerEmail: 'tigeradi1504@gmail.com',
    googleFormUrl: 'https://forms.gle/TmoSjzxUt7yAKz1o6',
    ticketTiers: ['Player Pass', 'Spectator Pass', 'VIP Lounge'],
    tracks: ['Valorant 5v5', 'BGMI Squads'],
    status: 'upcoming',
    isFlagship: false,
    totalCapacity: 350,
    assignedEventHeads: ['adityarenake'],
    assignedScanners: ['adityarenake'],
    entryFee: 0,
    feeDisplay: 'Free for Registered Hackers',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function rowToEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.id,
    name: row.name,
    tagline: row.tagline || '',
    category: row.category || 'Workshop',
    description: row.description || '',
    bannerUrl: row.banner_url || '',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    dateDisplay: row.date_display || '',
    timeDisplay: row.time_display || '',
    venue: row.venue || '',
    organizerName: row.organizer_name || '',
    organizerEmail: row.organizer_email || '',
    googleFormUrl: row.google_form_url || '',
    prizePool: row.prize_pool || '',
    ticketTiers: row.ticket_tiers || ['Standard Pass'],
    tracks: row.tracks || ['General Track'],
    status: row.status || 'upcoming',
    isFlagship: row.is_flagship || false,
    totalCapacity: row.total_capacity || 200,
    assignedEventHeads: row.assigned_event_heads || ['adityarenake'],
    assignedScanners: row.assigned_scanners || ['adityarenake'],
    entryFee: Number(row.entry_fee) || 0,
    feeDisplay: row.fee_display || `₹${row.entry_fee || 0}`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function eventToRow(ev) {
  return {
    id: ev.id || ev.eventId,
    name: ev.name,
    tagline: ev.tagline,
    category: ev.category,
    entry_fee: Number(ev.entryFee) || 0,
    fee_display: ev.feeDisplay,
    date_display: ev.dateDisplay,
    time_display: ev.timeDisplay,
    venue: ev.venue,
    prize_pool: ev.prizePool,
    google_form_url: ev.googleFormUrl,
    organizer_name: ev.organizerName,
    organizer_email: ev.organizerEmail,
    updated_at: new Date().toISOString(),
  };
}

export const eventRepo = {
  async getAll({ category, status, search } = {}) {
    let events = [];
    const now = Date.now();
    if (eventsMemoryCache && now - lastCacheTime < CACHE_TTL_MS) {
      events = [...eventsMemoryCache];
    } else {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          const { data, error } = await supabase.from('club_events').select('*');
          if (data && !error && data.length > 0) {
            events = data.map(rowToEvent);
            eventsMemoryCache = events;
            lastCacheTime = now;
          } else {
            events = [...DEFAULT_EVENTS];
          }
        } catch (e) {
          console.warn('[eventRepo] Supabase getAll notice, using defaults:', e.message);
          events = [...DEFAULT_EVENTS];
        }
      } else {
        events = [...DEFAULT_EVENTS];
      }
    }

    if (category && category !== 'all') {
      events = events.filter((ev) => String(ev.category).toLowerCase() === category.toLowerCase());
    }

    if (status && status !== 'all') {
      events = events.filter((ev) => String(ev.status).toLowerCase() === status.toLowerCase());
    }

    if (search && search.trim()) {
      const s = search.toLowerCase().trim();
      events = events.filter(
        (ev) =>
          (ev.name && ev.name.toLowerCase().includes(s)) ||
          (ev.tagline && ev.tagline.toLowerCase().includes(s)) ||
          (ev.category && ev.category.toLowerCase().includes(s))
      );
    }

    return events;
  },

  async findById(eventId) {
    if (!eventId) return null;
    const cleanId = String(eventId).toLowerCase().trim();
    const all = await this.getAll();
    const match = all.find((ev) => ev.id === cleanId || ev.eventId === cleanId);
    if (match) return match;

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        const { data, error } = await supabase.from('club_events').select('*').eq('id', cleanId).maybeSingle();
        if (data && !error) return rowToEvent(data);
      } catch (e) {
        console.warn('[eventRepo] findById error:', e.message);
      }
    }

    return DEFAULT_EVENTS.find((ev) => ev.id === cleanId) || null;
  },

  async create(data) {
    invalidateCache();
    const cleanId = (data.eventId || data.id || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')).toLowerCase().trim();
    const eventItem = {
      ...data,
      id: cleanId,
      eventId: cleanId,
      name: data.name.trim(),
      category: data.category || 'Workshop',
      status: data.status || 'upcoming',
      entryFee: Number(data.entryFee) || 0,
      feeDisplay: data.feeDisplay || `₹${data.entryFee || 0} Entry Pass`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('club_events').upsert(eventToRow(eventItem));
      } catch (err) {
        console.warn('[eventRepo] Supabase create error:', err.message);
      }
    }
    return eventItem;
  },

  async update(eventId, updates) {
    invalidateCache();
    if (!eventId) return null;
    const cleanId = String(eventId).toLowerCase().trim();
    const existing = await this.findById(cleanId);
    if (!existing) return null;

    const merged = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('club_events').upsert(eventToRow(merged));
      } catch (err) {
        console.warn('[eventRepo] Supabase update error:', err.message);
      }
    }
    return merged;
  },

  async delete(eventId) {
    invalidateCache();
    if (!eventId) return false;
    const cleanId = String(eventId).toLowerCase().trim();
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('club_events').delete().eq('id', cleanId);
      } catch (err) {
        console.warn('[eventRepo] Supabase delete error:', err.message);
      }
    }
    return true;
  },
};
