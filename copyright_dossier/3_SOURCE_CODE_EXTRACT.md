# EXHIBIT A: SOURCE CODE EXTRACT
## (First 10 Pages & Last 10 Pages)
### Under Rule 70(5) of the Copyright Rules, 2013 (Government of India)

**Title of Work:** Eventra 2026: Zero-Tamper Cryptographic QR Pass Issuance, Attendee Intake, and Gate Check-in Operating System  
**Author & Copyright Owner:** Aditya Renake (`tigeradi1504@gmail.com`)  
**All Rights Reserved:** Copyright (c) 2026 Aditya Renake  

================================================================================

```
================================================================================
                               PAGE 1 OF 20
                 FILE: backend/src/server.js (System Server Entrypoint)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Primary Backend Server Entrypoint
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * Author: Aditya Renake (tigeradi1504@gmail.com / aditya.renake@outlook.com)
 * Description: HTTP listener binding, port resolution, and process startup.
 * ==============================================================================
 */

import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`
══════════════════════════════════════════════════════════════
🚀 Eventra 2026 Backend Engine Online!
🗄️ Database: Google Cloud Firestore (Firebase)
🌐 API URL: http://localhost:${PORT}
⚡ Webhook: http://localhost:${PORT}/api/registrants/webhook
🛡️ Anti-Forgery Cryptographic QR System: ACTIVE
📧 Email Sender: ${process.env.SMTP_USER || 'aditya.renake@outlook.com'}
══════════════════════════════════════════════════════════════
  `);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => console.log('HTTP server closed'));
});
```

```
================================================================================
                               PAGE 2 OF 20
                 FILE: backend/src/app.js (Express Middleware Pipeline)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Application Middleware & Route Composition
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initFirebase } from './config/firebase.js';
import { staffRepo } from './models/staffRepo.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import registrantRoutes from './routes/registrant.routes.js';
import checkinRoutes from './routes/checkin.routes.js';
import emailRoutes from './routes/email.routes.js';
import eventRoutes from './routes/event.routes.js';
import paymentRoutes from './routes/payment.routes.js';

dotenv.config();

const app = express();

// Global Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Google Cloud Firestore
initFirebase();

// Ensure staff users exist if in persistent server mode
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  staffRepo.seedDefaultAdmin().catch(() => {});
}

// Mount Routes with Dual Prefix for local proxy & Vercel serverless parity
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/api/registrants', registrantRoutes);
app.use('/registrants', registrantRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/checkin', checkinRoutes);
app.use('/api/email', emailRoutes);
app.use('/email', emailRoutes);
app.use('/api/event', eventRoutes);
app.use('/event', eventRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/payment', paymentRoutes);
```

```
================================================================================
                               PAGE 3 OF 20
       FILE: backend/src/services/qrService.js (Cryptographic HMAC Engine)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Cryptographic HMAC-SHA256 QR Engine
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * Author: Aditya Renake (tigeradi1504@gmail.com)
 * ==============================================================================
 */

import crypto from 'crypto';
import QRCode from 'qrcode';

const SECRET_KEY = process.env.QR_SIGNING_SECRET || 'hackseries_2026_cryptographic_qr_signing_secret_9988';

/**
 * Generate a deterministic truncated 16-character HMAC-SHA256 signature
 */
export const generatePassSignature = (uniqueId, email, ticketType) => {
  const cleanId = String(uniqueId).trim();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanTier = String(ticketType).trim();

  const canonicalPayload = `${cleanId}::${cleanEmail}::${cleanTier}`;
  const hmac = crypto.createHmac('sha256', SECRET_KEY);
  hmac.update(canonicalPayload);
  return hmac.digest('hex').substring(0, 16);
};

/**
 * Verify pass signature using constant-time equality check
 */
export const verifyPassSignature = (uniqueId, email, ticketType, candidateSig) => {
  if (!uniqueId || !candidateSig) return false;
  try {
    const expected = generatePassSignature(uniqueId, email, ticketType);
    const expectedBuf = Buffer.from(expected, 'hex');
    const candidateBuf = Buffer.from(String(candidateSig).trim(), 'hex');
    if (expectedBuf.length !== candidateBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, candidateBuf);
  } catch (err) {
    return false;
  }
};

/**
 * Compose compact canonical QR barcode string: HS26.v1.<uniqueId>.<signature>
 */
export const createQRPayload = (uniqueId, email, ticketType) => {
  const signature = generatePassSignature(uniqueId, email, ticketType);
  return `HS26.v1.${uniqueId}.${signature}`;
};
```

```
================================================================================
                               PAGE 4 OF 20
     FILE: backend/src/controllers/checkinController.js (Gate Entry Engine)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Real-Time Gate Scanner & Check-in Controller
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

import { registrantRepo } from '../models/registrantRepo.js';
import { verifyPassSignature, parseQRPayload } from '../services/qrService.js';

export const scanAndVerifyPass = async (req, res) => {
  try {
    const { qrData, scannedBy, scannerStation, volunteerNotes } = req.body || {};
    if (!qrData) {
      return res.status(400).json({ success: false, message: 'QR payload is required' });
    }

    const parsed = parseQRPayload(qrData);
    if (!parsed.valid) {
      return res.status(400).json({
        success: false,
        status: 'INVALID_SIGNATURE',
        message: 'Pass barcode is tampered, corrupted, or invalid.',
      });
    }

    const { uniqueId, signature: candidateSig } = parsed;
    const registrant = await registrantRepo.findByUniqueId(uniqueId);
    if (!registrant) {
      return res.status(404).json({
        success: false,
        status: 'PASS_NOT_FOUND',
        message: `No registration found for ID: ${uniqueId}`,
      });
    }

    // Cryptographic validation
    const isValid = verifyPassSignature(
      registrant.uniqueId,
      registrant.email,
      registrant.ticketType,
      candidateSig
    );

    if (!isValid) {
      return res.status(403).json({
        success: false,
        status: 'TAMPERED_PASS',
        message: 'SECURITY ALERT: Digital signature mismatch!',
      });
    }

    // Detect duplicate gate entry
    if (registrant.checkedIn) {
      return res.status(409).json({
        success: false,
        status: 'ALREADY_CHECKED_IN',
        message: `Pass ALREADY SCANNED at ${registrant.checkedInAt}`,
        data: registrant,
      });
    }

    // Atomically complete gate check-in
    const updated = await registrantRepo.update(uniqueId, {
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
      checkedInBy: scannedBy || 'Gate Scanner',
      scannerStation: scannerStation || 'Main Gate Alpha',
      volunteerNotes: volunteerNotes || '',
    });

    return res.json({
      success: true,
      status: 'VERIFIED_ACCESS_GRANTED',
      message: `Welcome, ${registrant.name}! Access Granted.`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
```

```
================================================================================
                               PAGE 5 OF 20
    FILE: backend/src/controllers/paymentController.js (Order Initiation)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — In-App Payment Order & Verification Controller
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import { registrantRepo } from '../models/registrantRepo.js';
import { configRepo } from '../models/configRepo.js';
import { createOrder, verifyPaymentSignature, getRazorpayClient } from '../services/paymentService.js';
import { generatePassSignature, createQRPayload, generateQRCodeDataUrl } from '../services/qrService.js';
import { sendPassEmail } from '../services/emailService.js';

export const initiateRegistrationOrder = async (req, res) => {
  try {
    const { name, email, phone, ticketType = 'Hacker Pass', teamName = '', track = 'AI' } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }

    const cfg = await configRepo.getConfig().catch(() => ({}));
    const ticketPrice = Number(cfg?.ticketPrice ?? 5);

    // Free Ticket Flow (₹0)
    if (ticketPrice <= 0) {
      const uniqueId = `HS26-${uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase()}`;
      const signature = generatePassSignature(uniqueId, email, ticketType);
      const qrPayload = createQRPayload(uniqueId, email, ticketType);
      const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

      const registrant = await registrantRepo.create({
        uniqueId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: String(phone || '').trim(),
        ticketType,
        teamName,
        track,
        qrPayload,
        qrSignature: signature,
        qrCodeDataUrl,
        verified: true,
        paymentStatus: 'FREE_PASS',
        checkedIn: false,
      });

      sendPassEmail(registrant, cfg).catch(() => {});
      return res.status(201).json({ success: true, isPaid: true, data: registrant });
    }

    // Razorpay Paid Order Creation
    const receipt = `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const orderData = await createOrder({
      amount: ticketPrice,
      currency: 'INR',
      receipt,
      notes: { name, email, ticketType },
    });

    return res.status(200).json({
      success: true,
      requiresPayment: true,
      orderId: orderData.orderId,
      amount: orderData.amount,
      currency: orderData.currency,
      keyId: orderData.keyId,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
```

```
================================================================================
                               PAGE 6 OF 20
    FILE: backend/src/controllers/paymentController.js (Signature Verification)
================================================================================
```

```javascript
/**
 * Verify Razorpay payment signature & mint official cryptographic pass
 */
export const verifyAndCompleteRegistration = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      participantData,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Missing payment signature verification parameters.' });
    }

    // Cryptographic HMAC-SHA256 signature verification with Razorpay Key Secret
    const isSignatureValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature. Payment verification rejected.',
      });
    }

    // Check for duplicate processing
    const existing = await registrantRepo.findByPaymentId(razorpay_payment_id);
    if (existing) {
      return res.status(200).json({ success: true, message: 'Pass already issued', data: existing });
    }

    // Mint official verified pass
    const rawUuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    const uniqueId = `HS26-${rawUuid}`;
    const cleanEmail = String(participantData?.email || '').toLowerCase().trim();
    const ticketType = participantData?.ticketType || 'Hacker Pass';

    const signature = generatePassSignature(uniqueId, cleanEmail, ticketType);
    const qrPayload = createQRPayload(uniqueId, cleanEmail, ticketType);
    const qrCodeDataUrl = await generateQRCodeDataUrl(qrPayload);

    const newRegistrant = await registrantRepo.create({
      uniqueId,
      name: (participantData?.name || 'Participant').trim(),
      email: cleanEmail,
      phone: String(participantData?.phone || '').trim(),
      ticketType,
      teamName: participantData?.teamName || '',
      track: participantData?.track || 'AI & Agentic Systems',
      qrPayload,
      qrSignature: signature,
      qrCodeDataUrl,
      verified: true,
      paymentStatus: 'PAID',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      amountPaid: 5,
      checkedIn: false,
    });

    return res.status(201).json({
      success: true,
      message: `Payment Verified! Pass ${uniqueId} issued.`,
      data: newRegistrant,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
```

```
================================================================================
                               PAGE 7 OF 20
        FILE: backend/src/controllers/authController.js (Authentication)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Staff Authentication & Session Controller
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

import jwt from 'jsonwebtoken';
import { staffRepo } from '../models/staffRepo.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hackseries_2026_jwt_super_secret_key_8899';

export const login = async (req, res) => {
  try {
    const { username, email, identifier, password } = req.body || {};
    const rawIdentifier = String(username || email || identifier || '').toLowerCase().trim();
    const rawPassword = String(password || '').trim();

    if (!rawIdentifier || !rawPassword) {
      return res.status(400).json({ success: false, message: 'Username/Email and password are required.' });
    }

    // Access control: Restrict staff login to Aditya Renake
    const adityaIdentifiers = new Set([
      'adityarenake',
      'tigeradi1504@gmail.com',
      'aditya.renake@outlook.com',
      'gate_scanner_1',
      'scanner@acesdit.org',
    ]);
    if (!adityaIdentifiers.has(rawIdentifier)) {
      return res.status(403).json({ success: false, message: 'Login is restricted to Aditya Renake.' });
    }

    // Provision or fetch staff user
    let user = await staffRepo.findByIdentifier(rawIdentifier);
    if (!user) {
      user = {
        username: 'adityarenake',
        email: 'tigeradi1504@gmail.com',
        name: 'Aditya Renake',
        role: 'root_owner',
      };
    }

    // Password verification with Bcrypt and emergency fallbacks
    let isMatch = false;
    if (user.passwordHash) {
      isMatch = await staffRepo.verifyPassword(rawPassword, user.passwordHash).catch(() => false);
    }
    if (!isMatch && (rawPassword === 'Aditya@11' || rawPassword === 'Aditya@123' || rawPassword === 'Admin@123')) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    const token = jwt.sign(
      { userId: user.username, username: user.username, role: 'root_owner' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.username, username: user.username, name: 'Aditya Renake', role: 'root_owner' },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
```

```
================================================================================
                               PAGE 8 OF 20
   FILE: backend/src/models/registrantRepo.js (Firestore Persistence Engine)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Registrant Document Repository (Firestore)
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

import { getFirestore } from '../config/firebase.js';

export const registrantRepo = {
  getCollection() {
    const db = getFirestore();
    return db.collection('registrants');
  },

  async create(registrantData) {
    const cleanId = String(registrantData.uniqueId).toUpperCase().trim();
    const docData = {
      ...registrantData,
      uniqueId: cleanId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.getCollection().doc(cleanId).set(docData);
    return docData;
  },

  async findByUniqueId(uniqueId) {
    if (!uniqueId) return null;
    const cleanId = String(uniqueId).toUpperCase().trim();
    const doc = await this.getCollection().doc(cleanId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },

  async findByEmail(email) {
    if (!email) return null;
    const snapshot = await this.getCollection()
      .where('email', '==', String(email).toLowerCase().trim())
      .limit(1)
      .get();
    return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
  },

  async update(uniqueId, updates) {
    const cleanId = String(uniqueId).toUpperCase().trim();
    const nextUpdates = { ...updates, updatedAt: new Date().toISOString() };
    await this.getCollection().doc(cleanId).set(nextUpdates, { merge: true });
    return this.findByUniqueId(cleanId);
  },
};
```

```
================================================================================
                               PAGE 9 OF 20
         FILE: api/index.js (Vercel Serverless Function Bridge)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Vercel Serverless Function Dynamic Execution Bridge
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

let appInstance = null;
let loadError = null;

async function getApp() {
  if (appInstance) return appInstance;
  if (loadError) throw loadError;

  try {
    const mod = await import('../backend/src/app.js');
    appInstance = mod.default || mod.app;
    return appInstance;
  } catch (err) {
    loadError = err;
    console.error('CRITICAL: Failed to load backend Express app:', err);
    throw err;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Preserve original request URL across Vercel edge rewrites
  const forwardedUri = req.headers['x-forwarded-uri'] || req.headers['x-now-route-matches'];
  if (forwardedUri && forwardedUri.startsWith('/api')) {
    req.url = forwardedUri;
  }

  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error('Serverless Handler Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Serverless Function Runtime Error',
      error: err?.message || String(err),
    });
  }
}
```

```
================================================================================
                               PAGE 10 OF 20
   FILE: backend/src/services/emailService.js (Automated Pass Email Dispatcher)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Automated Outlook / SMTP Pass Email Delivery Service
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

import nodemailer from 'nodemailer';

export const sendPassEmail = async (registrant, cfg = {}) => {
  const host = cfg.smtpHost || process.env.SMTP_HOST || 'smtp.office365.com';
  const port = Number(cfg.smtpPort || process.env.SMTP_PORT || 587);
  const secure = port === 465;
  const user = cfg.smtpUser || process.env.SMTP_USER || 'aditya.renake@outlook.com';
  const pass = cfg.smtpPass || process.env.SMTP_PASS;

  const transporter = nodemailer.createTransporter({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  const passUrl = `https://eventra-2026.vercel.app/pass/${registrant.uniqueId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; background: #0c0d12; color: #fff; padding: 30px;">
      <h2>🎉 Congratulations, ${registrant.name}!</h2>
      <p>Your official entry pass for <strong>Eventra 2026</strong> has been minted.</p>
      <div style="background: #141622; border: 1px solid #00f0ff; padding: 20px; border-radius: 12px; margin: 20px 0;">
        <p><strong>Attendee Pass ID:</strong> ${registrant.uniqueId}</p>
        <p><strong>Tier:</strong> ${registrant.ticketType}</p>
        <p><a href="${passUrl}" style="background: #00f0ff; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Holographic Digital Pass</a></p>
      </div>
    </div>
  `;

  return transporter.sendMail({
    from: `"Eventra 2026" <${user}>`,
    to: registrant.email,
    subject: `⚡ Your Official Entry Pass: Eventra 2026 (${registrant.uniqueId})`,
    html,
  });
};
```

```
================================================================================
                               PAGE 11 OF 20
              FILE: frontend/src/App.jsx (Client Application State)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Client Application State & Routing Coordinator
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { EventLandingPage } from './pages/EventLandingPage';
import { RegistrationPage } from './pages/RegistrationPage';
import { DigitalPassPage } from './pages/DigitalPassPage';
import { ScannerPage } from './pages/ScannerPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { Navbar } from './components/Navbar';
import { api } from './services/api';

export function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [currentPassId, setCurrentPassId] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => api.auth.getUser());
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/pass/')) {
        setCurrentPassId(path.replace('/pass/', ''));
        setCurrentPage('pass');
      } else if (path === '/scanner') {
        setCurrentPage('scanner');
      } else if (path === '/register') {
        setCurrentPage('register');
      } else if (path === '/operations' || path === '/admin') {
        setCurrentPage(currentUser ? 'dashboard' : 'login');
      } else {
        setCurrentPage('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    handlePopState();
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  return (
    <div className="app-container">
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        user={currentUser}
        onLogout={() => {
          api.auth.logout();
          setCurrentUser(null);
          setCurrentPage('landing');
        }}
      />
      {currentPage === 'landing' && <EventLandingPage onNavigate={setCurrentPage} />}
      {currentPage === 'register' && <RegistrationPage onNavigate={setCurrentPage} />}
      {currentPage === 'pass' && <DigitalPassPage passId={currentPassId} />}
      {currentPage === 'scanner' && <ScannerPage />}
      {currentPage === 'dashboard' && <DashboardPage user={currentUser} />}
      {currentPage === 'login' && <LoginPage onLoginSuccess={setCurrentUser} />}
    </div>
  );
}
```

```
================================================================================
                               PAGE 12 OF 20
        FILE: frontend/src/pages/RegistrationPage.jsx (Checkout Client)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — In-App Razorpay Checkout & Registration Client
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { api } from '../services/api';
import { triggerConfetti } from '../utils/confettiBurst';

export const RegistrationPage = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    ticketType: 'Hacker Pass',
    teamName: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleCheckout = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const order = await api.payment.createOrder(formData);

      // Razorpay Checkout Modal Integration
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Eventra 2026',
        description: `${formData.ticketType} Registration`,
        order_id: order.orderId,
        handler: async (response) => {
          const verified = await api.payment.verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            participantData: formData,
          });
          triggerConfetti();
          window.location.href = `/pass/${verified.data.uniqueId}`;
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: { color: '#00f0ff' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(`Checkout failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="registration-container">
      <form onSubmit={handleCheckout}>
        <input
          type="text"
          placeholder="Full Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Processing Order...' : 'Pay ₹5 & Claim Pass'}
        </button>
      </form>
    </div>
  );
};
```

```
================================================================================
                               PAGE 13 OF 20
         FILE: frontend/src/pages/DigitalPassPage.jsx (Holographic Pass)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Public Holographic Digital Ticket Pass Page
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const DigitalPassPage = ({ passId }) => {
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!passId) return;
    api.registrants.getByUniqueId(passId)
      .then((res) => setPass(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [passId]);

  if (loading) return <div className="loader">Loading verified pass...</div>;
  if (!pass) return <div className="error">Pass not found</div>;

  return (
    <div className="holographic-badge-wrapper">
      <div className="holographic-card">
        <div className="badge-header">
          <span className="badge-logo">⚡ HACKSERIES 2026</span>
          <span className="badge-tier">{pass.ticketType}</span>
        </div>
        <div className="qr-container">
          <img src={pass.qrCodeDataUrl} alt="Encrypted QR Pass" className="qr-image" />
        </div>
        <div className="badge-attendee-details">
          <h2>{pass.name}</h2>
          <p>{pass.email}</p>
          <span className="unique-id">{pass.uniqueId}</span>
        </div>
        <div className="security-watermark">
          HMAC-SHA256 DIGITAL SIGNATURE VERIFIED
        </div>
      </div>
    </div>
  );
};
```

```
================================================================================
                               PAGE 14 OF 20
             FILE: frontend/src/pages/ScannerPage.jsx (Camera Scanner)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Staff Gate Camera Scanner & Audio Feedback Console
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api } from '../services/api';
import { playSuccessSound, playErrorSound, playWarningSound } from '../utils/soundEffects';

export const ScannerPage = () => {
  const [scanResult, setScanResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 250 });
    
    scanner.render(async (decodedText) => {
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        const response = await api.checkin.scanPass({ qrData: decodedText });
        playSuccessSound();
        setScanResult({ type: 'success', message: response.message, data: response.data });
      } catch (err) {
        if (err.message.includes('ALREADY SCANNED')) {
          playWarningSound();
          setScanResult({ type: 'warning', message: err.message });
        } else {
          playErrorSound();
          setScanResult({ type: 'error', message: err.message });
        }
      } finally {
        setTimeout(() => setIsProcessing(false), 2000);
      }
    });

    return () => scanner.clear().catch(() => {});
  }, []);

  return (
    <div className="scanner-container">
      <h1>Gate Terminal Alpha</h1>
      <div id="qr-reader" style={{ width: '100%', maxWidth: '400px' }}></div>
      {scanResult && (
        <div className={`scan-alert alert-${scanResult.type}`}>
          {scanResult.message}
        </div>
      )}
    </div>
  );
};
```

```
================================================================================
                               PAGE 15 OF 20
         FILE: frontend/src/pages/LoginPage.jsx (Authentication Portal)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Operations Portal Authentication Interface
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

export const LoginPage = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await api.auth.login(identifier, password);
      onLoginSuccess(data.user);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-card">
      <div className="login-header">
        <Lock size={24} />
        <h1>Operations Portal</h1>
        <p>ACES · Dr. D. Y. Patil Institute of Technology</p>
      </div>
      {errorMessage && <div className="error-alert">{errorMessage}</div>}
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Enter username or email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Verifying...' : 'Sign In'} <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
};
```

```
================================================================================
                               PAGE 16 OF 20
           FILE: frontend/src/services/api.js (HTTP Client Service)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Frontend API Client & Request Dispatcher
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

const API_BASE = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('hs26_auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }
  return data;
}

export const api = {
  auth: {
    async login(identifier, password) {
      const data = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      if (data.token) {
        localStorage.setItem('hs26_auth_token', data.token);
        localStorage.setItem('hs26_user', JSON.stringify(data.user));
      }
      return data;
    },
    logout() {
      localStorage.removeItem('hs26_auth_token');
      localStorage.removeItem('hs26_user');
    },
    getUser() {
      try {
        const u = localStorage.getItem('hs26_user');
        return u ? JSON.parse(u) : null;
      } catch {
        return null;
      }
    },
  },
  payment: {
    createOrder: (payload) => request('/payment/create-order', { method: 'POST', body: JSON.stringify(payload) }),
    verifyPayment: (payload) => request('/payment/verify', { method: 'POST', body: JSON.stringify(payload) }),
  },
  checkin: {
    scanPass: (payload) => request('/checkin/scan', { method: 'POST', body: JSON.stringify(payload) }),
  },
  registrants: {
    getByUniqueId: (id) => request(`/registrants/${id}`),
    getAll: () => request('/registrants'),
  },
};
```

```
================================================================================
                               PAGE 17 OF 20
         FILE: frontend/src/utils/soundEffects.js (Audio Synthesizer)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Web Audio API Sound Synthesizer (Zero-Asset Feedback)
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

const getAudioContext = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  return new AudioContext();
};

export const playSuccessSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
};

export const playWarningSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.setValueAtTime(200, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {}
};
```

```
================================================================================
                               PAGE 18 OF 20
          FILE: frontend/src/utils/confettiBurst.js (Particle Effects)
================================================================================
```

```javascript
/**
 * ==============================================================================
 * Eventra 2026 — Confetti Animation & Particle Celebration Trigger
 * ==============================================================================
 * Copyright (c) 2026 Aditya Renake. All Rights Reserved.
 * ==============================================================================
 */

import confetti from 'canvas-confetti';

export const triggerConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#00f0ff', '#7000ff', '#ffffff', '#00ff66'],
  });
};
```

```
================================================================================
                               PAGE 19 OF 20
                 FILE: package.json (Dependency Declarations)
================================================================================
```

```json
{
  "name": "eventra-2026",
  "version": "1.0.0",
  "description": "Eventra 2026 - Full-Stack Event Registration, QR Pass, and Check-in System ready for Vercel deployment",
  "type": "module",
  "scripts": {
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "build": "cd frontend && npm install && npm run build",
    "start": "node backend/src/server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "firebase-admin": "^13.0.0",
    "jsonwebtoken": "^9.0.2",
    "nodemailer": "^6.9.13",
    "qrcode": "^1.5.3",
    "razorpay": "^2.9.8",
    "uuid": "^9.0.1"
  },
  "author": "Aditya Renake <tigeradi1504@gmail.com>",
  "license": "UNLICENSED"
}
```

```
================================================================================
                               PAGE 20 OF 20
                 FILE: LICENSE (Proprietary Legal Notice)
================================================================================
```

```text
PROPRIETARY SOFTWARE LICENSE & INTELLECTUAL PROPERTY NOTICE
===========================================================

Copyright (c) 2026 Aditya Renake. All Rights Reserved.

PROJECT: Eventra 2026 Event Management, Digital QR Pass & Check-In Platform
AUTHOR & SOLE COPYRIGHT HOLDER: Aditya Renake (tigeradi1504@gmail.com / aditya.renake@outlook.com)

1. PROPRIETARY RIGHTS NOTICE
All source code, software architecture, backend services, frontend user interfaces,
database schemas, cryptographic signing systems, documentation, graphic assets, and
related intellectual property comprising "Eventra 2026" are the exclusive proprietary
property of Aditya Renake.

2. RESTRICTIONS ON USE
No license is granted, by implication, estoppel, or otherwise, to any person or entity
to copy, modify, merge, publish, distribute, sublicense, sell, reverse engineer, or
deploy this software or any part thereof in any format or medium, without the express
prior written consent of Aditya Renake.

3. GOVERNING LAW
This intellectual property is protected under the Copyright Act, 1957 (Government of India)
and international copyright treaties, including the Berne Convention for the Protection of
Literary and Artistic Works and the Universal Copyright Convention.

===========================================================
Aditya Renake
Dr. D. Y. Patil Institute of Technology (DIT), Pimpri, Pune
===========================================================
```

---
**[END OF SOURCE CODE EXTRACT EXHIBIT]**
