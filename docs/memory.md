# ⚡ HackSeries 2026 — Master Context & Memory Bank (`memory.md`)

> **CRITICAL ARCHIVAL DOCUMENT:** This file preserves persistent operational context, institutional history, architectural decisions, credential mappings, and gotcha runbooks for HackSeries 2026. All future AI sessions and developers must treat this as the source of truth.

---

## 1. Core Event & Institutional Identity

| Field | Value |
|---|---|
| **Event Name** | **HackSeries 2026** (Flagship 48-Hour National Hackathon) |
| **Dates** | October 16 – 18, 2026 |
| **Prize Pool** | ₹15,00,000+ (Cash + Cloud Credits + Incubation Grants) |
| **Venue** | Dr. D. Y. Patil Institute of Technology (DIT), Sant Tukaram Nagar, Pimpri, Pune – 411018 |
| **Institutional Host** | **ACES** (Association of Computer Engineering Students), Dept. of Computer Engineering, DYPDPU |
| **Lead Operations / Root Owner** | **Aditya Renake** (`tigeradi1504@gmail.com` / `aditya.renake@outlook.com`) |
| **Main Form Intake URL** | `https://forms.gle/TmoSjzxUt7yAKz1o6` |
| **Repositories** | `rajsingh2007rs/Hackseries-2026` / `rajnyx/Hackseries-2026` |

---

## 2. Key Architectural Decisions & "Whys"

### 1. Why HMAC-SHA256 Signatures in QR Codes?
- **Decision:** Embed a truncated 16-character HMAC-SHA256 hex signature directly inside the QR string: `HS26.v1.<uniqueId>.<signature>`.
- **Why:** Traditional QR passes that encode raw JSON strings (`{"id": "123"}`) or bare IDs can be easily fabricated by anyone with a free online QR generator. With our server-held `QR_SIGNING_SECRET`, only our backend can mint a valid signature. If an attendee alters their email, pass ID, or ticket tier, the signature mismatch triggers an instant security alert at the gate.

### 2. Why Cloudinary for QR Code CDN Hosting?
- **Decision:** Generate the QR code as a PNG buffer, upload it to Cloudinary folder `hackseries-2026/passes/`, and store only the secure HTTPS URL (`qrCodeUrl`) in the database record.
- **Why:** Initially, high-resolution Base64 data URLs (`data:image/png;base64,...`) were stored directly inside Firestore documents. At 30KB–50KB per document, 5,000 attendees bloated the database by ~250MB and slowed list queries dramatically. Offloading images to Cloudinary slashed document sizes by >90%, reduced list bandwidth to kilobytes, and enabled fast global CDN caching for mobile attendees.

### 3. Why Supabase Auth for Operations Staff?
- **Decision:** Authenticate staff using Supabase GoTrue Auth, storing role claims in `app_metadata` (`root_owner`, `admin`, `scanner`).
- **Why:** Replaces manual bcrypt hashing and custom JWT issuance with a hardened identity provider. Provides clean path for future full database migration to Supabase Postgres, supports automatic session management, and eliminates password storage risks.

### 4. Why Dual Route Mounting (`/api/*` and `/*`)?
- **Decision:** Every route in `backend/src/app.js` is mounted with both prefixes:
  ```javascript
  app.use('/api/registrants', registrantRoutes);
  app.use('/registrants', registrantRoutes);
  ```
- **Why:** Vercel serverless configurations often rewrite `/api/:path*` to the serverless function root. Depending on how requests enter (via local Vite proxy at `/api` or direct production serverless rewrites), path stripping can occur. Dual mounting guarantees zero 404 routing errors across all deployment topologies.

### 5. Why Atomic Transactions on Gate Check-Ins?
- **Decision:** Check-in validation and state mutations are wrapped in native database transactions (`db.runTransaction()`).
- **Why:** During peak registration rush, 10+ gate volunteers scan attendees concurrently. If two volunteers scan the same attendee pass at the same millisecond, simple read-then-write logic creates a race condition allowing duplicate entries. Atomic transactions guarantee strict idempotency.

### 6. Why In-Browser Live Video Snapshots at the Gate?
- **Decision:** The camera scanner (`QRScanner.jsx`) grabs an instant canvas frame from the webcam (JPEG 320px, ~14KB) at the millisecond of scan and sends it with the payload.
- **Why:** Provides undeniable visual proof of physical presence. Prevents pass sharing where an attendee outside the venue forwards their QR code screenshot to an unauthorized friend inside.

---

## 3. Staff Access & Identity Roster

| Role | Username / Identifier | Email | Permissions |
|---|---|---|---|
| **Root Owner** | `adityarenake` | `tigeradi1504@gmail.com` | **Full Master Access.** Cannot be deleted or demoted. Manages events, telemetry, team, broadcasts, scanner. |
| **Gate Scanner** | `gate_scanner_1` | `scanner@acesdit.org` | **Scanner Terminal Only.** Permitted on `/scanner` and scan verification endpoints. |
| **Revoked** | `sohamchitnis`, `haritirawal` | Any associated email | **Permanently Revoked.** Explicit 403 rejection in middleware and auth controllers. |

---

## 4. Environment Variables Reference

| Variable | Location | Description |
|---|---|---|
| `PORT` | `backend/.env` | Server listening port (default `5001`). |
| `NODE_ENV` | `backend/.env` | `development` or `production`. |
| `CLIENT_URL` | `backend/.env` | Frontend base URL for pass links (`http://localhost:5173` or production domain). |
| `JWT_SECRET` | `backend/.env` | Secret for fallback/legacy token signing. |
| `QR_SIGNING_SECRET` | `backend/.env` | Cryptographic secret for HMAC-SHA256 pass signatures. |
| `CLOUDINARY_CLOUD_NAME` | `backend/.env` | Cloudinary cloud identifier (e.g., `dxs03imj`). |
| `CLOUDINARY_API_KEY` | `backend/.env` | Cloudinary access API key. |
| `CLOUDINARY_API_SECRET` | `backend/.env` | Cloudinary private API secret. |
| `SUPABASE_URL` | `backend/.env`, `frontend/.env` | Supabase project API endpoint (`https://<ref>.supabase.co`). |
| `SUPABASE_ANON_KEY` | `backend/.env`, `frontend/.env` | Public client anon key for browser. |
| `SUPABASE_SERVICE_ROLE_KEY`| `backend/.env` | Privileged admin key for backend auth and user management. |
| `RAZORPAY_KEY_ID` | `backend/.env` | Razorpay public key ID (`rzp_test_...` or `rzp_live_...`). |
| `RAZORPAY_KEY_SECRET` | `backend/.env` | Razorpay private secret key. |
| `SMTP_HOST` | `backend/.env` | Outbound mail server (e.g., `smtp.gmail.com`, `smtp.resend.com`). |
| `SMTP_USER` / `SMTP_PASS` | `backend/.env` | Mailer credentials (e.g. Gmail App Password). |

---

## 5. Operational Gotchas & Recovery Playbooks

### Gotcha 1: Git Merge Conflicts in `package-lock.json`
- **Symptom:** `git pull` reports conflict in `package-lock.json` or `backend/package-lock.json`.
- **Fix:** Never resolve lockfile conflicts by hand-editing JSON text. Run:
  ```bash
  npm install --package-lock-only
  cd backend && npm install --package-lock-only
  git add package-lock.json backend/package-lock.json
  git commit -m "fix: resolve lockfile conflicts"
  ```

### Gotcha 2: Vercel Serverless 10-Second Timeouts
- **Symptom:** API calls that send emails timeout on Vercel (`504 Gateway Timeout`).
- **Fix:** All external network calls in controllers are race-protected with a 3.5s timeout promise:
  ```javascript
  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3500));
  await Promise.race([emailDispatchPromise, timeoutPromise]);
  ```
  This guarantees the HTTP response reaches the browser before the serverless container terminates.

### Gotcha 3: Firestore Composite Index Requirements
- **Symptom:** Querying `.where('checkedIn', '==', true).orderBy('checkedInAt', 'desc')` fails if composite index is pending.
- **Fix:** `registrantRepo.js` contains a built-in try-catch fallback that fetches the most recent check-ins with an in-memory sort if the composite index is missing or building.

### Gotcha 4: Zero-Config Local Development
- If Google Cloud credentials are not supplied, the backend seamlessly falls back to `MemoryFirestore` in `backend/src/config/firebase.js`.
- If Cloudinary credentials are not supplied, pass generation falls back to local Base64 data URLs.
- If Supabase credentials are not supplied, auth falls back to local JWT signing with default master passwords.
