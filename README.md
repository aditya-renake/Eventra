# ⚡ Eventra 2026 — Event Registration + QR Pass + Check-in System

A complete full-stack web application designed for **Eventra 2026**. Features real-time intake from Google Forms & Sheets, zero-tamper HMAC-SHA256 cryptographic QR passes, single-click prefilled Outlook email delivery (`aditya.renake@outlook.com`), public mobile pass viewer, and an in-browser camera gate check-in console.

---

## 🌟 Key Capabilities

1. **Intake Bridge (Google Forms & Sheets)**
   - Official Form: [https://forms.gle/TmoSjzxUt7yAKz1o6](https://forms.gle/TmoSjzxUt7yAKz1o6)
   - Real-time `onFormSubmit` Google Apps Script webhook trigger (`POST /api/registrants/webhook`).
   - Generates unique ID (`HS26-XXXXXX`) and anti-forgery cryptographic signature for each submission.

2. **Zero-Forgery Cryptographic QR Pass Engine**
   - Each QR code embeds an HMAC-SHA256 digital signature (`HS26.v1.<uniqueId>.<signature>`).
   - Constant-time verification prevents spoofed or forged passes at the check-in gates.

3. **1-Click Prefilled Pass Email Delivery**
   - Single-click dispatch from the dashboard to the attendee's Google Form email.
   - Pre-configured for Outlook: `aditya.renake@outlook.com`.
   - Rich responsive HTML email with embedded inline QR code (`cid:hackpassqr`) and mobile pass button.
   - 1-click fallback to open local email client with prefilled recipient, subject, and pass body.

4. **Public Event Website & Mobile Pass Portal**
   - Stunning modern landing page with tracks, prizes, schedule, and pass retrieval lookup.
   - Public mobile ticket portal at `/pass/:uniqueId` with holographic badge, dynamic high-res QR, and PNG badge download.

5. **Staff Gate Check-in Scanner**
   - In-browser camera scanner using `html5-qrcode` (`/scanner`).
   - Instant visual cards + Web Audio synthesized sound effects (verified chime, duplicate scan buzzer, alert beep).
   - Duplicate check-in prevention with timestamp of previous scan.
   - Manual code fallback and live scan stream with quick undo.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm

### 1. Install Dependencies
```bash
# In backend
cd backend
npm install

# In frontend
cd ../frontend
npm install
```

### 2. Start the Backend API (Port 5001)
```bash
cd backend
npm run dev
```
> *Note:* The backend automatically runs an embedded in-memory MongoDB database with pre-seeded sample attendees if no MongoDB Atlas URI is specified in `.env`.

### 3. Start the Frontend (Port 5173)
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## ⚡ Deploying to Vercel (1-Click Ready)

The project is pre-configured with `vercel.json` and a root serverless function handler (`api/index.js`) so the entire full-stack app (React frontend + Express API) deploys seamlessly in a single Vercel project.

### Option 1: Deploy with Vercel CLI
```bash
cd /Users/adityarenake/Desktop/hackseries
npx vercel
```

### Option 2: Deploy via GitHub / Vercel Dashboard
1. Push your `hackseries` folder to a GitHub repository.
2. Go to [vercel.com/new](https://vercel.com/new) and import your repository.
3. Keep default settings (Root directory: `./`, Framework Preset: Vite).
4. Add the following **Environment Variables** in Vercel:

| Variable | Recommended Value | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB Atlas cluster connection string |
| `JWT_SECRET` | `hackseries_2026_jwt_super_secret_key_8899` | Secret for staff tokens |
| `QR_SIGNING_SECRET` | `hackseries_2026_cryptographic_qr_signing_secret_9988` | Secret for anti-forgery QR HMAC signatures |
| `SMTP_HOST` | `smtp.office365.com` | Outlook / Hotmail SMTP server |
| `SMTP_PORT` | `587` | Port 587 |
| `SMTP_USER` | `aditya.renake@outlook.com` | Organizer email |
| `SMTP_PASS` | `your_outlook_app_password` | Outlook App Password |
| `EMAIL_FROM` | `"Eventra 2026" <aditya.renake@outlook.com>` | Sender display header |

5. Click **Deploy**!
   - Frontend is live at `https://your-project.vercel.app/`
   - Webhook is live at `https://your-project.vercel.app/api/registrants/webhook`
   - Digital passes are live at `https://your-project.vercel.app/pass/<uniqueId>`

---

## 🔐 Staff & Admin Access Credentials

| Role | Username / Email | Password | Access |
|---|---|---|---|
| **Lead Operations Admin** | Aditya Renake | Full Control Room + Gate Scanner |

---

## 📋 Google Apps Script Webhook Setup

To connect your Google Form to this system:
1. Open the Google Sheet linked to your Google Form [https://forms.gle/TmoSjzxUt7yAKz1o6](https://forms.gle/TmoSjzxUt7yAKz1o6).
2. Click **Extensions** → **Apps Script**.
3. Replace the code with the following snippet:

```javascript
const WEBHOOK_URL = "https://your-api-domain.com/api/registrants/webhook";

function onFormSubmit(e) {
  try {
    const itemResponses = e ? e.namedValues : null;
    
    let name = "Hacker";
    let email = "hacker@example.com";
    let phone = "";
    let ticketType = "Hacker Pass";
    let teamName = "";
    let track = "AI & Agentic Systems";
    let formResponses = {};

    if (itemResponses) {
      for (const [key, valArray] of Object.entries(itemResponses)) {
        const val = valArray ? valArray[0] : "";
        const cleanKey = key.trim();
        formResponses[cleanKey] = val;

        const lower = cleanKey.toLowerCase();
        if (lower.includes("name") && !lower.includes("team")) name = val;
        else if (lower.includes("email")) email = val;
        else if (lower.includes("phone") || lower.includes("contact")) phone = val;
        else if (lower.includes("team")) teamName = val;
        else if (lower.includes("track") || lower.includes("category")) track = val;
      }
    }

    const payload = {
      name: name,
      email: email,
      phone: phone,
      ticketType: ticketType,
      teamName: teamName,
      track: track,
      formResponses: formResponses
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    UrlFetchApp.fetch(WEBHOOK_URL, options);
  } catch (error) {
    Logger.log("Error posting to Eventra: " + error.toString());
  }
}
```

4. In the Apps Script left menu, click **Triggers (Clock icon)** → **Add Trigger**.
   - Function: `onFormSubmit`
   - Event source: `From spreadsheet`
   - Event type: `On form submit`
5. Click **Save**. Now every submission automatically generates a verified cryptographic pass!

---

## 📧 Email SMTP Configuration (Outlook / Hotmail)

In `backend/.env`:
```ini
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=aditya.renake@outlook.com
SMTP_PASS=your_outlook_app_password
EMAIL_FROM="Eventra 2026" <aditya.renake@outlook.com>
```

> **Tip for Outlook/Hotmail:** If you have 2-Factor Authentication enabled on your Microsoft account, create an **App Password** at `account.microsoft.com/security` and put it in `SMTP_PASS`.

---

## 📁 Project Structure

```
hackseries/
├── backend/
│   ├── src/
│   │   ├── config/db.js           # Mongo Atlas + In-Memory fallback
│   │   ├── models/                # Registrant, StaffUser, EventConfig
│   │   ├── controllers/           # Webhook, Checkin, Email, Auth, Event
│   │   ├── services/              # HMAC QR engine & Nodemailer Outlook service
│   │   ├── middleware/            # JWT Auth & error handlers
│   │   ├── routes/                # REST API routes
│   │   ├── utils/seedData.js      # Auto-seeder
│   │   └── server.js              # Express server
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/            # QRScanner, RegistrantTable, Modals, Navbar
│   │   ├── pages/                 # EventLanding, DigitalPass, Scanner, Dashboard, Login
│   │   ├── services/api.js        # API Client
│   │   ├── utils/soundEffects.js  # Web Audio API synthesizer
│   │   ├── App.jsx
│   │   └── index.css              # Custom neon glassmorphic design system
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── package.json
├── LICENSE
└── README.md
```

---

## ⚖️ Intellectual Property & Copyright Notice

**Copyright (c) 2026 Aditya Renake. All Rights Reserved.**

This platform, software architecture, backend engines, frontend interfaces, and cryptographic validation routines are the exclusive intellectual property of **Aditya Renake**. 

Unauthorized copying, distribution, modification, reverse engineering, sublicensing, or deployment of this software is strictly prohibited under the **Copyright Act, 1957 (Government of India)** and international copyright treaties (Berne Convention).

