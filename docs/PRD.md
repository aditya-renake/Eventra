# ⚡ HackSeries 2026 — Product Requirements Document (PRD)

> **Document Version:** 1.0.0  
> **Target Release:** HackSeries 2026 (October 16–18, 2026)  
> **Institutional Host:** ACES (Association of Computer Engineering Students)  
> **College/Campus:** Dr. D. Y. Patil Institute of Technology (DYPDPU), Pimpri, Pune  
> **Lead Operations & Owner:** Aditya Renake (`tigeradi1504@gmail.com`)  
> **Repository:** `rajsingh2007rs/Hackseries-2026` / `rajnyx/Hackseries-2026`

---

## 1. Executive Summary & Problem Statement

### 1.1 The Problem
Collegiate hackathons, tech symposiums, and engineering conferences frequently struggle with fragmented operational workflows:
- **Registration Disconnect:** Attendee signups are scattered across Google Forms, spreadsheets, or third-party portals without unified validation or automated status sync.
- **Pass Forgery & Fraud:** Standard QR codes generated online simply encode static JSON strings or raw IDs. They are trivially screenshotted, forged, shared between unauthorized attendees, or manipulated in transit.
- **Gate Congestion & Verification Delays:** Physical check-in desks suffer from long queues due to manual name lookups in spreadsheets or slow scanner apps. Duplicate check-ins frequently go unnoticed.
- **Bloated Systems & High Latency:** Pass systems that store base64 images directly inside database records suffer from multi-second load times and bandwidth exhaustion during peak traffic (5,000+ attendees).
- **Disjointed Communication:** Attendees miss important venue directions, Wi-Fi credentials, schedule updates, or hacker kit allocations due to uncoordinated email broadcasts.

### 1.2 The Solution: HackSeries 2026
**HackSeries 2026** is a comprehensive, production-grade event operations platform engineered for zero-friction intake, tamper-proof ticketing, automated payment processing, instant CDN-hosted pass delivery, and atomic real-time gate validation.

---

## 2. Product Goals & Objectives

1. **Zero Gate Chaos:** Enable sub-second gate check-ins using any in-browser mobile or desktop camera without dedicated hardware.
2. **Cryptographic Integrity:** 100% elimination of duplicate, altered, or forged tickets via HMAC-SHA256 digital signatures verified in constant time.
3. **High-Concurrency Scalability:** Maintain sub-millisecond response times for dashboard browsing and pass lookups across 5,000+ simultaneous participants.
4. **Seamless Intake & Payment:** Support automated Google Forms webhooks, batch spreadsheet imports, and direct in-app registration with Razorpay standard checkout.
5. **Instant Omnichannel Notifications:** Deliver digital passes with high-contrast QR graphics via automated SMTP email dispatch, WhatsApp notification links, and mobile offline web passes.

---

## 3. User Personas

| Persona | Role | Key Needs & Pain Points |
|---|---|---|
| **Hacker / Attendee** | College student or developer participating in HackSeries. | Quick registration, immediate pass confirmation with QR code, offline pass access on mobile, transparent verification status. |
| **Main Event Organizer** | Aditya Renake (`root_owner`) | Full control over catalog, pricing, verification toggles, bulk email broadcasts, real-time check-in telemetry, and emergency security controls. |
| **Gate Volunteer / Scanner** | Event volunteer stationed at entrance gates (`scanner`). | High-speed in-browser scanner, audio/visual confirmation of valid passes, duplicate detection alert, live attendee photo capture for security. |
| **Judge / VIP Delegate** | Guest speaker, mentor, or sponsor representative. | Express check-in pass, dedicated VIP tier badge, clear event schedule and venue directions. |

---

## 4. Key Features & Functional Requirements

### 4.1 Ingestion & Intake Engine
- **Google Forms Webhook Receiver (`POST /api/registrants/webhook`):**
  - Ingests new submissions triggered by Google Apps Script `onFormSubmit(e)` in real time.
  - Deep-scans nested form responses for candidate name, email, phone, team name, track, and college.
  - Automatically generates unique pass ID (`HS26-XXXXXXXX`) and cryptographic HMAC signature.
  - Dispatches immediate "Registration Received • Under Verification" confirmation email.
- **Bi-Directional Google Sheets Status Sync:**
  - Listens to Google Sheets `onEdit(e)` triggers (`action: 'update_status'`).
  - Automatically toggles verification status in the database when an organizer marks a cell "Verified" or "Approved".
- **Bulk Spreadsheet Import:**
  - Drag-and-drop `.xlsx`, `.xls`, and `.csv` files.
  - Smart column mapping with options to auto-verify attendees and dispatch acknowledgement emails.
- **CSV Data Export:**
  - One-click export of the entire attendee registry with check-in timestamps, verification states, and ticket tiers.

### 4.2 Native Payment Gateway (Razorpay)
- **Order Creation (`POST /api/payment/create-order`):**
  - Generates verified Razorpay orders for paid passes (₹5 default or custom ticket price).
  - Automatically supports Free Pass tier bypass for VIPs, judges, and sponsored participants.
- **Automated Signature Verification (`POST /api/payment/verify-payment`):**
  - Validates `razorpay_signature` using HMAC-SHA256 (`order_id + "|" + payment_id`).
  - Mints official digital pass ONLY upon confirmed payment receipt.
  - Recovers abandoned/delayed orders and processes webhook events.

### 4.3 Cryptographic Anti-Forgery QR Engine & CDN Hosting
- **HMAC-SHA256 Digital Signatures:**
  - Format: `HS26.v1.<uniqueId>.<signature>`
  - Computed over `HACKSERIES2026 | uniqueId | email | ticketType` with server-side signing secret.
  - Verified using `crypto.timingSafeEqual` to prevent side-channel timing attacks.
- **Cloudinary CDN Image Hosting:**
  - Generates 400x400 high-contrast QR PNGs (Error Correction Level 'H' with 30% recovery).
  - Uploads generated buffers directly to Cloudinary folder `hackseries-2026/passes/`.
  - Saves fast CDN URLs (`https://res.cloudinary.com/.../hs26_qr_XXXX.png`) in database documents, reducing record size by over 90% compared to inline base64 strings.

### 4.4 Gate Check-In & In-Browser Camera Scanner
- **Zero-Install Browser Scanner (`/scanner`):**
  - Uses `html5-qrcode` to access phone/laptop webcams with automatic back-camera selection.
  - Supports keyboard shortcuts (Enter/Space to advance to next attendee in line).
- **Live Proof-of-Presence Snapshot:**
  - Automatically grabs an ultra-compressed canvas JPEG snapshot (320px @ 0.65 quality, ~14KB) from the video feed at the instant of scan.
  - Persists the photo as `checkedInPhoto` in the registrant record for visual audit trails.
- **Atomic Concurrency Protection:**
  - Database transactions guarantee that simultaneous gate volunteers scanning the exact same pass cannot register duplicate entries.
- **Synthesized Audio & Haptic Feedback:**
  - Web Audio API custom sound effects: Ascending major chime for success, sawtooth double-buzzer for duplicate check-ins, sharp square wave alert for forged passes.
  - Native haptic vibration feedback via `navigator.vibrate()`.
  - Celebratory confetti particle burst on successful entry.

### 4.5 Organizer Control Center (`/dashboard`)
- **Real-Time Telemetry & Metric Cards:**
  - Live counts for Total Registrations, Verified Hackers, Checked-In Gate Attendance, and Pending Passes.
- **Attendee Table with Optimistic UI:**
  - Multi-attribute search (name, email, phone, uniqueId, team name, institution).
  - Multi-facet filters (verified state, check-in state, email dispatch state, ticket type, track).
  - Single-click actions: preview pass, email pass, toggle verification, view gate snapshot, delete.
- **Batch Operations:**
  - Multi-select attendees for bulk verification and batch pass email dispatch with rate limiting.

### 4.6 Supabase Authentication & Role-Based Access Control (RBAC)
- **Multi-Tier Role Hierarchy:**
  - `root_owner`: Aditya Renake — complete administrative privileges, catalog editing, team management, telemetry.
  - `admin` / `event_head`: Lead operations managers.
  - `scanner`: Gate volunteer accounts strictly restricted to `/scanner` and scan verification.
- **Supabase Auth Integration:**
  - Backed by Supabase GoTrue authentication service with JSON Web Tokens.
  - Automatic user provisioning and role verification stored in `app_metadata` claims.

---

## 5. Non-Functional Requirements (NFRs)

| Category | Requirement | Target Metric |
|---|---|---|
| **Performance** | Dashboard search and filter responsiveness | < 100 ms via in-memory micro-cache |
| **Throughput** | Gate check-in verification latency | < 300 ms per scan |
| **Reliability** | QR scanning damage tolerance | Error Correction Level 'H' (up to 30% unreadable recovery) |
| **Availability** | Serverless uptime on Vercel | 99.9% uptime during event duration |
| **Security** | Signature comparison & token safety | Constant-time `timingSafeEqual` comparison |
| **Database Footprint** | Registrant document payload size | < 2 KB (via Cloudinary CDN image offloading) |

---

## 6. Success Criteria & Metrics

1. **Check-In Velocity:** Complete check-in for 1,500+ attendees within 60 minutes on Day 1.
2. **Zero Duplicate Entries:** Exactly 0 unauthorized duplicate scans across multiple parallel gate scanners.
3. **Zero QR Forgeries:** 100% rejection rate for altered, swapped, or forged QR passes.
4. **Email Delivery Success Rate:** > 98% successful delivery of digital pass emails to valid email addresses.
5. **Staff Onboarding Speed:** Gate volunteers operational within 60 seconds of opening `/scanner` on mobile.
