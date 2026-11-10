-- Apply after supabase_schema.sql, before 002_registrant_scaling.sql.
-- Outbox jobs are committed in the same transaction as registrations/check-ins.
CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('pass_email','pass_whatsapp','registration_email','checkin_email','checkin_whatsapp')),
  registrant_id text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','skipped','dead')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS notification_jobs_ready_idx ON public.notification_jobs(available_at,created_at) WHERE status='pending';
CREATE INDEX IF NOT EXISTS notification_jobs_lease_idx ON public.notification_jobs(locked_until) WHERE status='processing';
CREATE INDEX IF NOT EXISTS notification_jobs_registrant_idx ON public.notification_jobs(registrant_id,created_at DESC);
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_jobs FROM anon, authenticated;
GRANT ALL ON public.notification_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_notification_jobs(p_notifications jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE inserted_count integer;
BEGIN
  IF jsonb_typeof(p_notifications) <> 'array' OR jsonb_array_length(p_notifications) > 1000 THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_BATCH';
  END IF;
  INSERT INTO notification_jobs(dedupe_key,kind,registrant_id,payload)
  SELECT x->>'dedupe_key',x->>'kind',x->>'registrant_id',coalesce(x->'payload','{}'::jsonb)
  FROM jsonb_array_elements(p_notifications) x
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_notification_jobs(p_worker_id text,p_limit integer DEFAULT 2,p_lease_seconds integer DEFAULT 120,p_max_attempts integer DEFAULT 6)
RETURNS SETOF public.notification_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF nullif(p_worker_id,'') IS NULL THEN RAISE EXCEPTION 'WORKER_ID_REQUIRED'; END IF;
  -- A worker killed after claiming its final attempt must not retry forever.
  UPDATE notification_jobs SET status='dead',locked_until=NULL,locked_by=NULL,
    last_error='Delivery lease expired after maximum attempts',updated_at=now()
  WHERE status='processing' AND locked_until < now() AND attempts >= greatest(1,least(p_max_attempts,20));
  RETURN QUERY
  WITH ready AS (
    SELECT id FROM notification_jobs
    WHERE ((status='pending' AND available_at <= now()) OR (status='processing' AND locked_until < now()))
      AND attempts < greatest(1,least(p_max_attempts,20))
    ORDER BY available_at,created_at
    LIMIT greatest(1,least(p_limit,10)) FOR UPDATE SKIP LOCKED
  ) UPDATE notification_jobs j SET status='processing',attempts=j.attempts+1,locked_by=p_worker_id,
      locked_until=now()+make_interval(secs=>greatest(60,least(p_lease_seconds,600))),updated_at=now()
    FROM ready WHERE j.id=ready.id RETURNING j.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_notification_job(p_id uuid,p_worker_id text,p_outcome text DEFAULT 'sent',p_note text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE job notification_jobs;
BEGIN
  IF p_outcome NOT IN ('sent','skipped') THEN RAISE EXCEPTION 'INVALID_OUTCOME'; END IF;
  UPDATE notification_jobs SET status=p_outcome,sent_at=CASE WHEN p_outcome='sent' THEN now() ELSE NULL END,
    locked_by=NULL,locked_until=NULL,last_error=left(p_note,1000),updated_at=now()
  WHERE id=p_id AND status='processing' AND locked_by=p_worker_id AND locked_until>now() RETURNING * INTO job;
  IF NOT FOUND THEN RETURN false; END IF;
  -- Dynamic statements allow this migration to precede the registrant columns migration.
  IF p_outcome='sent' AND job.kind='pass_email' THEN
    EXECUTE 'UPDATE public.registrants SET email_sent=true,email_sent_at=now(),email_send_count=coalesce(email_send_count,0)+1,updated_at=now() WHERE unique_id=$1' USING job.registrant_id;
  ELSIF p_outcome='sent' AND job.kind='pass_whatsapp' THEN
    EXECUTE 'UPDATE public.registrants SET whatsapp_sent=true,whatsapp_sent_at=now(),updated_at=now() WHERE unique_id=$1' USING job.registrant_id;
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_notification_job(p_id uuid,p_worker_id text,p_error text,p_max_attempts integer DEFAULT 6)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE notification_jobs SET status=CASE WHEN attempts>=greatest(1,least(p_max_attempts,20)) THEN 'dead' ELSE 'pending' END,
    available_at=now()+make_interval(secs=>least(3600,30*power(2,least(attempts-1,7))::integer)+floor(random()*15)::integer),
    last_error=left(p_error,1000),locked_by=NULL,locked_until=NULL,updated_at=now()
  WHERE id=p_id AND status='processing' AND locked_by=p_worker_id AND locked_until>now();
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.notification_queue_stats()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('pending',count(*) FILTER(WHERE status='pending'),
   'processing',count(*) FILTER(WHERE status='processing'),'sent',count(*) FILTER(WHERE status='sent'),
   'skipped',count(*) FILTER(WHERE status='skipped'),'dead',count(*) FILTER(WHERE status='dead'),
   'oldestPendingAt',min(created_at) FILTER(WHERE status='pending')) FROM notification_jobs;
$$;

REVOKE ALL ON FUNCTION public.enqueue_notification_jobs(jsonb), public.claim_notification_jobs(text,integer,integer,integer),
 public.complete_notification_job(uuid,text,text,text),public.fail_notification_job(uuid,text,text,integer),public.notification_queue_stats() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_notification_jobs(jsonb), public.claim_notification_jobs(text,integer,integer,integer),
 public.complete_notification_job(uuid,text,text,text),public.fail_notification_job(uuid,text,text,integer),public.notification_queue_stats() TO service_role;
