<div align="center">

  <img src="frontend/public/eventra-logo.svg" alt="Eventra Logo" width="280" />

  # Eventra
  ### Enterprise Event Registration, Cryptographic QR Pass & Gate Intelligence Platform

  [![Live Platform](https://img.shields.io/badge/Production-Live%20on%20Vercel-596EE6?style=for-the-badge&logo=vercel&logoColor=white)](https://eventra-2026.vercel.app)
  [![Copyright Registered](https://img.shields.io/badge/Statutory%20Copyright-Diary%20SW--49344%2F2026--CO-29304A?style=for-the-badge&logo=shield&logoColor=white)](#-statutory-copyright--intellectual-property-registration)
  [![License](https://img.shields.io/badge/License-Proprietary%20All%20Rights%20Reserved-A8B4FF?style=for-the-badge&logo=googledocs&logoColor=29304A)](#-statutory-license--legal-notice)
  [![Node.js](https://img.shields.io/badge/Runtime-Node.js%20v18%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite%205-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)

  <p align="center">
    <strong>Zero-Tamper HMAC-SHA256 Pass Verification • Real-Time Attendee Intake • In-Browser Camera Gate Scanner • Multi-Event Command Center</strong>
  </p>

  [Explore Live App](https://eventra-2026.vercel.app) • [View Digital Pass](https://eventra-2026.vercel.app/#lookup-section) • [Gate Scanner](https://eventra-2026.vercel.app/scanner) • [Report Issue](https://github.com/aditya-renake/Eventra/issues)

</div>

---

## 🇮🇳 Statutory Copyright & Intellectual Property Registration

> [!IMPORTANT]
> **LEGAL NOTICE & STATUTORY RECORD OF REGISTRATION**  
> This computer software, architectural system, cryptographic validation engine, and user interfaces are formally registered under statutory copyright protection with the **Government of India, Copyright Office (Department for Promotion of Industry and Internal Trade - DPIIT)**.

| Registry Parameter | Official Statutory Record |
| :--- | :--- |
| **Work Title** | **Eventra** |
| **Official Diary Number** | **`SW-49344/2026-CO`** |
| **Work Classification** | Computer Software (SW) / Literary Work |
| **Statutory Jurisdiction** | Government of India — Copyright Office, Central Branch |
| **Sole Author & Copyright Owner** | **Aditya Vinod Renake** |
| **Filing Date** | October 20, 2026 |
| **Governing Act** | **The Copyright Act, 1957 (Act No. 14 of 1957, Government of India)** |
| **International Coverage** | Berne Convention, Universal Copyright Convention (UCC), and TRIPS Agreement |

Any unauthorized reproduction, modification, distribution, reverse engineering, decompilation, public display, or commercial deployment of this codebase or its derivative works is strictly prohibited and subject to civil and criminal prosecution under Sections 63, 63A, and 64 of the Copyright Act, 1957.

---

## 📑 Table of Contents

- [Platform Overview](#-platform-overview)
- [Key Architectural Capabilities](#-key-architectural-capabilities)
- [Interactive System Flow](#-interactive-system-flow)
- [Quick Start & Setup](#-quick-start--setup)
- [Production Deployment (Vercel)](#-production-deployment-vercel)
- [REST API Specifications](#-rest-api-specifications)
- [Statutory License & Legal Notice](#-statutory-license--legal-notice)

---

## 🌟 Platform Overview

**Eventra** is an enterprise-grade event intelligence and attendee management operating system engineered specifically for campus hackathons, technical symposia, summits, and multi-track conferences. 

Built around a high-performance **React 18** frontend and an asynchronous **Node.js/Express** backend, Eventra replaces fragile paper passes and unverified spreadsheets with a cryptographically enforced verification loop that operates reliably on desktop, tablet, and mobile browsers.

```
       ┌──────────────────────┐         ┌─────────────────────────┐
       │   Attendee Signup    │         │  Google Forms / Sheets  │
       │ (Direct Native / Web)│         │     (Webhook Intake)    │
       └──────────┬───────────┘         └────────────┬────────────┘
                  │                                  │
                  ▼                                  ▼
       ┌──────────────────────────────────────────────────────────┐
       │            Eventra Core Ingestion Engine                 │
       │    HMAC-SHA256 Tokenization & Dynamic Pass Generation     │
       └──────────────────────────┬───────────────────────────────┘
                                  │
           ┌──────────────────────┴──────────────────────┐
           ▼                                             ▼
┌──────────────────────┐                     ┌────────────────────────┐
│  Holographic Mobile  │                     │ Camera Gate Scanner    │
│  Digital Pass View   │ ──(QR Gate Scan)──> │ Real-Time Verification │
│  (/pass/:uniqueId)   │                     │ & Photo Snapshot Audit │
└──────────────────────┘                     └────────────────────────┘
```

---

## ⚡ Key Architectural Capabilities

<details open>
<summary><strong>1. Zero-Tamper HMAC-SHA256 Cryptographic Pass Engine</strong></summary>

- **Tamper-Evident Signatures**: Each issued ticket carries an encrypted cryptographic payload formatted as `EV26.v1.<uniqueId>.<hmacSignature>`.
- **Constant-Time Verification**: Gate verification employs constant-time string comparisons to prevent timing side-channel exploits.
- **Offline Capable & Spoof-Proof**: Passes cannot be fabricated, guessed, or modified by attendees without access to the server-side signing secret.
</details>

<details>
<summary><strong>2. In-Browser Gate Scanner & Live Entry Snapshot</strong></summary>

- **Real-Time Camera Integration**: Built with `html5-qrcode` to scan at 60 FPS directly through smartphone or laptop webcams without dedicated hardware scanners.
- **Gate Camera Snapshot**: Optionally captures a live photo of the entrant during check-in to provide visual audit logs against credential sharing.
- **Duplicate Scan Prevention**: Instant visual and acoustic feedback (synthesized through the Web Audio API) flags duplicate scans with exact timestamps of prior entries.
</details>

<details>
<summary><strong>3. Multi-Channel Attendee Intake & Webhook Bridge</strong></summary>

- **Native Intake Portal**: Interactive registration modal with customizable ticket tiers, team grouping, and optional Razorpay integration.
- **Google Sheets & Forms Webhook**: Plug-and-play Google Apps Script trigger synchronizes external form submissions into verified Eventra passes in real time.
- **Excel & Bulk Import**: Built-in drag-and-drop spreadsheet parser enables one-click batch pass generation for pre-registered cohorts.
</details>

<details>
<summary><strong>4. Automated Dispatch & Digital Pass Delivery</strong></summary>

- **Holographic Mobile Ticket**: Attendee passes at `/pass/:uniqueId` feature high-resolution dynamic QR codes, live event schedule tickers, and high-fidelity PNG ticket downloads.
- **Automated SMTP Mailer**: Sends responsive HTML confirmation emails with inline QR attachments (`cid:eventrapassqr`) and calendar invites.
</details>

<details>
<summary><strong>5. Multi-Event Command Center & Role-Based Access Control</strong></summary>

- **Granular Permissions**: Three-tier clearance model (Lead Organizer, Event Head, Gate Verifier) protects sensitive attendee information.
- **Real-Time Operational Telemetry**: Live metrics for checked-in attendees, revenue, dispatch queue health, and track distributions.
</details>

---

## 🚀 Quick Start & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/aditya-renake/Eventra.git
cd Eventra

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment

Copy the template configuration file:

```bash
cp backend/.env.example backend/.env
```

### 3. Launch Development Environment

Run backend and frontend in separate terminal tabs:

```bash
# Terminal 1: Backend API (Default: http://localhost:5001)
cd backend
npm run dev

# Terminal 2: Frontend Client (Default: http://localhost:5173)
cd frontend
npm run dev
```

Visit `http://localhost:5173` to explore the interface.

---

## ☁️ Production Deployment (Vercel)

The repository includes a root `vercel.json` and a serverless API adapter (`api/index.js`), enabling the complete full-stack platform (React Single Page App + Express REST API) to deploy into a single Vercel project without microservice fragmentation.

<details>
<summary><strong>Step-by-Step Vercel Deployment Instructions</strong></summary>

1. Fork or push this repository to your private GitHub organization.
2. In the [Vercel Dashboard](https://vercel.com/new), select **Import Project** and link your repository.
3. Configure project settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
4. Add your production environment variables (`MONGODB_URI`, `QR_SIGNING_SECRET`, `JWT_SECRET`, `SMTP_*`) in the **Environment Variables** panel.
5. Click **Deploy**. Your custom domain will automatically route requests:
   - Web Application: `https://your-domain.vercel.app/`
   - Gate Scanner: `https://your-domain.vercel.app/scanner`
   - API Endpoints: `https://your-domain.vercel.app/api/*`
</details>

---

## 📡 REST API Specifications

<details>
<summary><strong>View Endpoint Reference</strong></summary>

### Public Endpoints
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/events` | Retrieve active public campus events |
| `GET` | `/api/registrants/lookup/:uniqueId` | Fetch attendee pass data by Unique ID |
| `POST` | `/api/registrants/register` | Direct attendee self-registration |
| `POST` | `/api/registrants/webhook` | Webhook receiver for Google Forms / Sheets |

### Protected Operations Endpoints (Bearer JWT Required)
| Method | Route | Description | Clearance |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Operator authentication & session issue | Public |
| `POST` | `/api/checkin/verify` | Cryptographic QR scanner validation | Verifier / Admin |
| `GET` | `/api/registrants` | Paginated attendee table with search & filter | Admin |
| `POST` | `/api/registrants/send-email/:id`| Trigger dynamic pass email dispatch | Admin |
| `POST` | `/api/events` | Create new multi-track event | Super Admin |

</details>

---

## ⚖️ Statutory License & Legal Notice

```
PROPRIETARY SOFTWARE LICENSE & STATUTORY COPYRIGHT RECORD
Copyright (c) 2026 Aditya Vinod Renake. All Rights Reserved.

OFFICIAL STATUTORY COPYRIGHT DIARY NUMBER: SW-49344/2026-CO
REGISTERED WITH: GOVERNMENT OF INDIA, COPYRIGHT OFFICE (DPIIT)
WORK TITLE: EVENTRA (COMPUTER SOFTWARE / LITERARY WORK)
SOLE AUTHOR & EXCLUSIVE COPYRIGHT OWNER: ADITYA VINOD RENAKE
```

This software and its accompanying documentation, schemas, and media assets are protected under **The Copyright Act, 1957 (Government of India)** and international intellectual property treaties including the **Berne Convention** and the **Universal Copyright Convention**.

No part of this codebase may be copied, stored in a retrieval system, modified, sublicensed, sold, or transmitted in any form without the prior express written authorization of the copyright owner.

For licensing inquiries, enterprise deployment permissions, or official correspondence:
- **Author**: Aditya Vinod Renake
- **Official Inquiries**: `aditya.renake@outlook.com`
- **Statutory Reference**: Diary No. `SW-49344/2026-CO`

---

<div align="center">
  <sub>Engineered with precision for Eventra 2026 • Registered Statutory Intellectual Property of Aditya Vinod Renake</sub>
</div>
