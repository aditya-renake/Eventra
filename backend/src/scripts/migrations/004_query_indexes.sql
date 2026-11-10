-- Run each statement outside a transaction (CONCURRENTLY avoids blocking writes).
-- These indexes use baseline-schema columns and do not replace missing migration 002.
CREATE INDEX CONCURRENTLY IF NOT EXISTS registrants_event_created_id_idx
  ON public.registrants (event_id, created_at DESC NULLS LAST, id ASC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS registrants_created_id_idx
  ON public.registrants (created_at DESC NULLS LAST, id ASC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS registrants_recent_checkin_idx
  ON public.registrants (checked_in_at DESC) WHERE checked_in = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS registrants_phone_created_idx
  ON public.registrants (phone, created_at DESC);
ANALYZE public.registrants;
