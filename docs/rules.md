# ⚡ HackSeries 2026 — Developer & AI Rulebook (`rules.md`)

> **Scope:** Mandatory guidelines, architectural constraints, and operational rules for any AI assistant or developer modifying the HackSeries 2026 codebase.

---

## 1. Golden Rules of the Codebase

### Rule 1: Zero Degradation of Existing Features
- **Preserve Comments & Docstrings:** Do not strip, refactor, or delete existing comments, JSDoc annotations, or architecture notes unless specifically requested by the user.
- **Backwards Compatibility:** When updating data models or responses, ensure existing clients and fallback endpoints (e.g., `qrCodeDataUrl` when introducing `qrCodeUrl`) continue to work seamlessly.

### Rule 2: Absolute Security & Cryptographic Integrity
- **Constant-Time Verification:** Never compare security tokens, HMAC signatures, or payment signatures using standard equality operators (`===` or `==`). Always use `crypto.timingSafeEqual` with byte buffers.
- **Never Commit Secrets:** `.env`, `backend/.env`, and `frontend/.env` must NEVER be committed to Git. Ensure `.gitignore` explicitly blocks them.
- **Supabase Key Isolation:** 
  - Never expose `SUPABASE_SERVICE_ROLE_KEY` or other server secrets to the client bundle (`frontend/` or `VITE_` variables).
  - Only `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_URL` may be referenced on the client.
- **Authorization via `app_metadata`:** In Supabase Auth, user roles (`root_owner`, `admin`, `scanner`) MUST be stored in `raw_app_meta_data` / `app_metadata`, NEVER in user-editable `user_metadata`.

### Rule 3: Database Efficiency & Memory Sanitation
- **No Base64 Bloat in Documents:** Avoid saving raw 30KB–50KB Base64 data URLs directly into database records. Upload the generated QR buffer to **Cloudinary** and store the clean CDN URL (`https://res.cloudinary.com/...`).
- **Omit Heavy Fields in List Queries:** When returning lists of registrants to the frontend, strip heavy image payloads to reduce response sizes and conserve bandwidth.
- **Cache Invalidation:** Always call `invalidateCache()` whenever a registrant record is created, updated, verified, or deleted.

### Rule 4: Atomic Concurrency on Critical State
- **Gate Check-In Must Be Atomic:** Gate check-ins must execute inside a native database transaction (`db.runTransaction()`). If two gate scanners scan the same pass at the exact same millisecond, exactly one must succeed and the other must receive an `alreadyCheckedIn` warning.

---

## 2. Library & Technology Constraints

| Library / Tool | Permitted Usage | Prohibited Usage |
|---|---|---|
| **Styling** | Vanilla CSS, CSS Custom Properties in `index.css`, Glassmorphism, CSS keyframe animations. | Do NOT install or introduce Tailwind CSS unless explicitly instructed by the user. |
| **Icons** | `lucide-react` | Do not import FontAwesome, Material Icons, or bulky external icon font kits. |
| **Audio** | Native browser **Web Audio API** (`soundEffects.js`). | Do not install Howler.js or heavy external audio frameworks. |
| **Confetti** | Canvas-based native particle system (`confettiBurst.js`). | Do not pull in bulky third-party animation libraries. |
| **QR Code Engine** | `qrcode` with Error Correction Level `'H'`. | Do not change error correction to lower levels ('L' or 'M') as high error correction is essential for scanning damaged passes. |
| **Scanner** | `html5-qrcode` configured for rear mobile cameras. | Do not use native app-only wrappers or invasive camera plugins. |
| **HTTP Client** | Native `fetch` with centralized API wrapper (`frontend/src/services/api.js`). | Do not install Axios or additional HTTP libraries. |

---

## 3. Backend Conventions & Patterns

### 3.1 Route Mounting Pattern
In `backend/src/app.js`, every router must be mounted with **both** `/api/<route>` and `/<route>` prefixes:
```javascript
// Example:
app.use('/api/registrants', registrantRoutes);
app.use('/registrants', registrantRoutes);
```
*Rationale:* Vercel Serverless Function rewrites (`vercel.json`) and local Vite development proxy (`vite.config.js`) route both path conventions. Dual mounting ensures zero broken routes across environments.

### 3.2 Resilience & In-Memory Fallbacks
- The system must remain runnable locally even if Google Cloud credentials, Supabase keys, or Cloudinary keys are temporarily unconfigured.
- Always provide graceful fallbacks (e.g. `MemoryFirestore` in `firebase.js`, local Base64 data URL if Cloudinary fails, local JWT if Supabase is offline).

### 3.3 Serverless Race Protection
- Vercel Serverless Functions have strict execution timeouts (typically 10 to 15 seconds).
- Heavy external operations (e.g., sending emails via external SMTP servers) must be guarded with race timeouts so the HTTP response is never dropped or aborted:
```javascript
const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3500));
await Promise.race([emailDispatchPromise, timeoutPromise]);
```

---

## 4. Frontend Conventions & Patterns

### 4.1 State Management & SWR Micro-Caching
- For sub-millisecond page loads on the organizer dashboard, use `sessionStorage` caching with SWR (Stale-While-Revalidate) mechanics.
- Render cached metrics and tables immediately upon mount, then fetch fresh data in the background and update state without flashing skeletons.

### 4.2 Optimistic UI Updates
- When toggling attendee verification or deleting an entry, update local state optimistically so the UI feels instantaneous, then issue the API call in the background. If the request fails, revert state and display a toast alert.

### 4.3 Notification & Feedback Design
- All user feedback must trigger the unified toast queue via `onShowToast({ type, title, message })`.
- Types: `success` (green/emerald), `error` (crimson/red), `warning` (amber/gold), `info` (cyan/blue).

---

## 5. Staff Identity & Access Control Rules

1. **Root Owner Immutability:**
   - Username: `adityarenake`
   - Email: `tigeradi1504@gmail.com` / `aditya.renake@outlook.com`
   - The Root Owner account cannot be deleted or demoted via API endpoints or admin UI.
2. **Revoked Identifiers:**
   - Any requests attempting to authenticate with or assign permissions to revoked identifiers (`sohamchitnis`, `haritirawal`) must be permanently and explicitly rejected with status 403.
3. **Scanner Restriction:**
   - Accounts with role `scanner` (`gate_scanner_1`) must only access `/scanner` and scan verification endpoints. They must never access financial telemetry, event catalog CRUD, or mass email dispatchers.
