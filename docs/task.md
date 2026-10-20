# ⚡ HackSeries 2026 — Task Tracker & Milestone Roadmap (`task.md`)

> **Current Sprint Status:** Production-Ready & Deployed  
> **Active Milestone:** Milestone 5 Completed (Supabase Auth & Cloudinary CDN Integration)  
> **Last Updated:** October 2026

---

## 1. Milestone Progress Overview

| Milestone | Description | Status | Completion Date |
|---|---|:---:|:---:|
| **M1: Core Platform & Intake** | Monorepo setup, Google Forms webhook, Firestore CRUD, SWR caching. | **COMPLETED** | Oct 2026 |
| **M2: Cryptographic QR Passes** | HMAC-SHA256 signatures, `html5-qrcode` scanner, audio chimes, live photos. | **COMPLETED** | Oct 2026 |
| **M3: Native Payments (Razorpay)** | Standard Checkout, signature verification, order recovery, webhook routes. | **COMPLETED** | Oct 2026 |
| **M4: Cloudinary QR CDN** | Direct buffer uploads to Cloudinary, CDN URLs replacing base64 DB bloat. | **COMPLETED** | Oct 2026 |
| **M5: Supabase Auth & RBAC** | Supabase GoTrue integration, staff user auto-provisioning, JWT verification. | **COMPLETED** | Oct 2026 |
| **M6: Git Hygiene & Lockfiles** | Merge conflict resolution on `main`, lockfile regeneration, clean tree. | **COMPLETED** | Oct 2026 |
| **M7: Postgres Database Migration** | Full migration from Firestore to Supabase Postgres tables with RLS. | **COMPLETED** | Oct 2026 |
| **M8: Offline PWA & Apple Wallet** | Offline service worker for scanners, `.pkpass` Apple Wallet passes. | **PLANNED** | Roadmap |

---

## 2. Completed Tasks Detail

### ✅ Milestone 1: Intake & Foundation
- [x] Monorepo orchestration via root `package.json` with `concurrently`.
- [x] Vercel serverless integration with `vercel.json` rewrites and `api/index.js`.
- [x] In-memory `MemoryFirestore` fallback for zero-config offline development.
- [x] Google Forms real-time webhook intake (`POST /api/registrants/webhook`).
- [x] Google Sheets `onEdit` bidirectional verification sync.
- [x] Drag-and-drop Excel/CSV spreadsheet bulk import with smart column mapping.
- [x] One-click CSV registrant data export.

### ✅ Milestone 2: Cryptographic Security & Gate Console
- [x] HMAC-SHA256 digital signature embedded in QR payload (`HS26.v1.<uniqueId>.<signature>`).
- [x] Constant-time signature verification (`crypto.timingSafeEqual`).
- [x] In-browser camera gate scanner terminal (`/scanner`) powered by `html5-qrcode`.
- [x] Automated live video canvas snapshot (JPEG 320px, ~14KB) attached to check-in record.
- [x] Atomic check-in transactions (`db.runTransaction()`) eliminating duplicate entries.
- [x] Zero-dependency Web Audio API sound synthesizer for audio feedback.
- [x] Canvas celebratory confetti particle burst on successful scan.

### ✅ Milestone 3: Razorpay Payment Gateway
- [x] In-app registration form with dynamic track selection.
- [x] Razorpay order creation endpoint (`POST /api/payment/create-order`).
- [x] Signature verification & automatic order recovery against network drops.
- [x] Strict pass minting guard: Zero tickets created until payment is cryptographically verified.
- [x] Automated pass delivery via Nodemailer and WhatsApp upon confirmed transaction.

### ✅ Milestone 4: Cloudinary QR Image CDN Hosting
- [x] Installed and configured `cloudinary` Node SDK.
- [x] Created `backend/src/services/cloudinaryService.js` with streaming buffer upload.
- [x] Integrated `generatePassQRCode()` in `qrService.js` to upload 400x400 PNGs to `hackseries-2026/passes/`.
- [x] Updated `registrantController.js` and `paymentController.js` to store CDN URLs (`qrCodeUrl`).
- [x] Reduced database document size by over 90% and accelerated pass loading.

### ✅ Milestone 5: Supabase Auth & Multi-Tier RBAC
- [x] Installed and configured `@supabase/supabase-js`.
- [x] Created `backend/src/config/supabase.js` with public and privileged admin clients.
- [x] Created `backend/src/services/supabaseAuthService.js` with auto-provisioning for `adityarenake` (`root_owner`) and `gate_scanner_1` (`scanner`).
- [x] Updated `authController.js` to authenticate against Supabase Auth.
- [x] Updated `auth.js` middleware to verify incoming Supabase Bearer JWTs and check `app_metadata.role`.
- [x] Verified end-to-end integration test with 100% success.

---

## 3. Active & Upcoming Roadmap

### ✅ Milestone 7: Supabase Postgres Schema & Student Flow Overhaul
- [x] Full database migration from Firestore to live Supabase Postgres tables (`registrants`, `club_events`, `event_config`, `staff_users`).
- [x] Implemented Row Level Security (RLS) policies and performance indexes.
- [x] Created `backend/src/models/registrantRepo.js` and repository suite with atomic transactions and caching.
- [x] Replaced external Google Form redirects with native in-app registration and event selection.
- [x] Connected dynamic event selection (`HackSeries 2026 Flagship`, `AI Bootcamp`, `Esports Arena`) with custom tracks, fees, and pass tiers.
- [x] Unified Cloudinary CDN upload across all ticket creation flows (free pass, Razorpay checkout, recovery, webhook).
- [x] Enhanced digital pass retrieval and pass email delivery with Cloudinary CDN QR code URLs and event metadata.

### 🔄 Milestone 8: Mobile Pass Enhancements (Planned)
- [ ] Generate Apple Wallet `.pkpass` files for iPhone lock-screen passes.
- [ ] Generate Google Wallet JWT pass objects for Android devices.
- [ ] Implement Progressive Web App (PWA) service worker for 100% offline gate scanning in dead Wi-Fi zones.

---

## 4. Operational Runbook & Commands

### Running Locally:
```bash
# Start both backend and frontend concurrently
npm run dev

# Or start individually:
npm run dev:backend   # Port 5001
npm run dev:frontend  # Port 5173
```

### Production Build:
```bash
npm run build
```

### Testing Health:
```bash
curl http://localhost:5001/api/health
```
