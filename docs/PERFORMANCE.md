# Eventra performance changes

## Implemented

- Route-level lazy loading; spreadsheet import is separately lazy loaded. QR scanning uses the installed package only on the scanner route. Razorpay uses the existing checkout-time loader.
- Concurrent identical GETs share a promise, isolated by authorization headers. No completed private responses are cached. Writes invalidate pending-read sharing. Client JSON requests time out after 30 seconds; messaging and Supabase HTTP calls after 10 seconds. Mutations are never automatically retried.
- Dashboard search waits 350 ms after typing; older responses cannot overwrite newer results. Registrants poll every 15 seconds, financial data every 60 seconds, and both skip hidden tabs. Manual refresh remains available. Existing independent catalog/config requests remain parallel.
- Known Unsplash and unsigned Cloudinary event banners request WebP at bounded widths. Cards retain lazy loading; hero banners have high fetch priority. Arbitrary URLs, signed images and QR codes are preserved.
- Content-hashed Vite assets get one-year immutable browser caching on Vercel; HTML revalidates. Vercel provides static CDN delivery and transport compression. No misleading Content-Encoding header is added to uncompressed responses.
- Decorative ambient animations are disabled on touch and reduced-motion devices.
- Removed unused MongoDB development dependencies (mongoose, mongodb-memory-server). Existing Supabase/Firestore adapters remain.
- CI uses lockfile installs, npm download caching, cancellation of superseded runs, tests, production build and a 230 KB entry-JavaScript budget.
- Added migration 004 for common ordering and lookup indexes, using concurrent index creation. It has NOT been applied to a live database.

## Validation and deployment dependencies

Baseline production entry: 916.31 KB raw / 262.45 KB gzip. Updated entry: approximately 179 KB raw / 56 KB gzip. Landing content and shared chunks additionally load on a landing visit; these entry figures are not whole-page transfer sizes or measured latency improvements.

Run `npm test`, `npm run build`, and `node scripts/check-bundle-size.js`. CI performs these automatically. Runtime requires Node 22.

The pre-existing working tree contains a notification worker, queue migration 001, shared rate-limit migration 003, private-response safeguards and paginated database access. The repository code explicitly requires scaling migration **002**, but that SQL file is absent. Restore and review the matching migration before deploying this backend; 004 does not supply its generated columns or RPCs. Never reapply the baseline schema to a populated production database as a substitute. Run 004 statements separately outside a transaction and inspect query plans on representative staging data.

The existing worker can be started with `npm run worker:notifications --prefix backend` on an always-on worker host after its database prerequisites are installed. The worker is not started automatically in Vercel functions. Confirm durable enqueueing at every intended notification call site before claiming notifications are entirely off the request path.

No hosting settings or live database were changed. Match the Vercel function region to the actual Supabase region after checking both deployments; do not guess from visitor location. Supabase is accessed over HTTP, so adding a client-side Postgres connection pool would not apply here. Vercel manages app-instance scaling and CDN compression.

Redis, OpenTelemetry export and real-user monitoring need provisioned services, retention/privacy decisions and environment configuration; none are claimed active. Existing short caches and request-duration logs remain. There is no AI response endpoint to stream. The attendee table is already paginated to 25 rows, so virtualization adds little value. Check-in, payment and verification remain server-confirmed. SSR requires a separate routing/rendering migration because the app currently routes with hashes and browser storage.

## Browser performance acceptance checklist

Not yet measured on a physical phone or throttled browser:

1. Cold-load landing, event details, a direct pass link, dashboard and scanner with Fast 3G and 4x CPU slowdown. Record LCP, INP, CLS and total transfer size.
2. Confirm scanner/Excel/Razorpay downloads are absent from a landing visit. Open their respective flows and verify camera permissions, spreadsheet parsing and checkout.
3. Type a rapid search, change event and paginate while requests are delayed. Confirm the newest result wins; hide the tab and verify polling stops.
4. Verify WebP banners and lazy card loading. On a deployed preview verify Content-Encoding negotiation, immutable hashed assets and non-cacheable personal/API responses.
5. Compare staging query plans and p95 request durations under realistic concurrent reads before and after applying indexes.

References: https://react.dev/reference/react/lazy and https://vercel.com/docs/how-vercel-cdn-works and https://vercel.com/docs/caching/cache-control-headers.
