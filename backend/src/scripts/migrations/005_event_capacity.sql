-- Apply once in Supabase before deploying the capacity-aware checkout.
BEGIN;
CREATE TABLE IF NOT EXISTS public.event_seat_holds (
  order_id text PRIMARY KEY,
  event_id text NOT NULL REFERENCES public.club_events(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.event_seat_holds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.event_seat_holds FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS event_seat_holds_by_event ON public.event_seat_holds(event_id, expires_at);
CREATE INDEX IF NOT EXISTS registrants_event_seats ON public.registrants(event_id);

CREATE OR REPLACE FUNCTION public.event_seats_available(p_event_id text)
RETURNS integer LANGUAGE sql STABLE SET search_path = public, pg_temp AS $$
  SELECT greatest(0, e.total_capacity
    - (SELECT count(*) FROM public.registrants r WHERE r.event_id = e.id)
    - (SELECT count(*) FROM public.event_seat_holds h WHERE h.event_id = e.id AND h.expires_at > now()))::integer
  FROM public.club_events e WHERE e.id = p_event_id
$$;

CREATE OR REPLACE FUNCTION public.event_seat_catalog()
RETURNS TABLE(id text, remaining integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT e.id, public.event_seats_available(e.id) FROM public.club_events e WHERE e.status IS DISTINCT FROM 'draft'
$$;

CREATE OR REPLACE FUNCTION public.hold_event_seat(p_event_id text, p_order_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.club_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EVENT_NOT_FOUND'; END IF;
  DELETE FROM public.event_seat_holds WHERE event_id = p_event_id AND expires_at <= now();
  IF EXISTS (SELECT FROM public.event_seat_holds WHERE event_id = p_event_id AND order_id = p_order_id) THEN RETURN; END IF;
  IF public.event_seats_available(p_event_id) <= 0 THEN RAISE EXCEPTION 'EVENT_FULL'; END IF;
  INSERT INTO public.event_seat_holds VALUES (p_order_id, p_event_id, now() + interval '30 minutes');
END $$;

CREATE OR REPLACE FUNCTION public.guard_event_seat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  payment_order text := coalesce(nullif(NEW.order_id,''), nullif(NEW.razorpay_order_id,''));
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.event_id = NEW.event_id THEN RETURN NEW; END IF;
  PERFORM 1 FROM public.club_events WHERE id = NEW.event_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EVENT_NOT_FOUND'; END IF;
  IF payment_order IS NOT NULL THEN
    IF EXISTS (SELECT FROM public.registrants WHERE order_id = payment_order OR razorpay_order_id = payment_order) THEN
      RAISE EXCEPTION 'REGISTRATION_EXISTS';
    END IF;
    DELETE FROM public.event_seat_holds WHERE order_id = payment_order AND event_id = NEW.event_id;
    IF EXISTS (SELECT FROM public.event_seat_holds WHERE order_id = payment_order) THEN RAISE EXCEPTION 'ORDER_EVENT_MISMATCH'; END IF;
  END IF;
  IF public.event_seats_available(NEW.event_id) <= 0 THEN RAISE EXCEPTION 'EVENT_FULL'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS enforce_event_seats ON public.registrants;
CREATE TRIGGER enforce_event_seats BEFORE INSERT OR UPDATE OF event_id ON public.registrants
  FOR EACH ROW EXECUTE FUNCTION public.guard_event_seat();
REVOKE ALL ON FUNCTION public.hold_event_seat(text,text), public.event_seats_available(text), public.event_seat_catalog() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hold_event_seat(text,text), public.event_seats_available(text), public.event_seat_catalog() TO service_role;
COMMIT;
