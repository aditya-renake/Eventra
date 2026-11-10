-- Shared across API instances. Run as the database owner before deploying middleware.
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS api_rate_limits_expiry_idx ON public.api_rate_limits (expires_at);
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.api_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_api_rate_limits(p_rules JSONB)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  rule JSONB;
  stored public.api_rate_limits%ROWTYPE;
  current_time TIMESTAMPTZ := clock_timestamp();
  permitted BOOLEAN := true;
  retry_seconds INTEGER := 0;
  max_count INTEGER;
  window_length INTEGER;
BEGIN
  IF jsonb_typeof(p_rules) <> 'array' OR jsonb_array_length(p_rules) NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'Invalid rate limit rules';
  END IF;
  -- Stable key ordering prevents deadlocks when two requests touch shared buckets.
  FOR rule IN SELECT value FROM jsonb_array_elements(p_rules) ORDER BY value->>'key' LOOP
    max_count := (rule->>'limit')::INTEGER;
    window_length := (rule->>'window_seconds')::INTEGER;
    IF (rule->>'key') !~ '^[a-f0-9]{64}$' OR max_count NOT BETWEEN 1 AND 1000000 OR window_length NOT BETWEEN 1 AND 86400 THEN
      RAISE EXCEPTION 'Invalid rate limit rule';
    END IF;
    INSERT INTO public.api_rate_limits AS b (bucket_key, request_count, expires_at)
      VALUES (rule->>'key', 1, current_time + make_interval(secs => window_length))
    ON CONFLICT (bucket_key) DO UPDATE SET
      request_count = CASE WHEN b.expires_at <= current_time THEN 1 ELSE LEAST(b.request_count + 1, 1000001) END,
      expires_at = CASE WHEN b.expires_at <= current_time THEN current_time + make_interval(secs => window_length) ELSE b.expires_at END
    RETURNING * INTO stored;
    IF stored.request_count > max_count THEN
      permitted := false;
      retry_seconds := GREATEST(retry_seconds, CEIL(EXTRACT(EPOCH FROM stored.expires_at - current_time))::INTEGER);
    END IF;
  END LOOP;
  -- Bounded opportunistic retention: no attendee identifiers or raw IPs are stored.
  IF random() < 0.01 THEN
    DELETE FROM public.api_rate_limits WHERE bucket_key IN (
      SELECT bucket_key FROM public.api_rate_limits WHERE expires_at < current_time - INTERVAL '1 day' LIMIT 1000
    );
  END IF;
  RETURN jsonb_build_object('allowed', permitted, 'retry_after', retry_seconds);
END;
$$;
REVOKE ALL ON FUNCTION public.consume_api_rate_limits(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_api_rate_limits(JSONB) TO service_role;
