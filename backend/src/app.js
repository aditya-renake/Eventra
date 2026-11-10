import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getFirestore } from './config/firebase.js';
import { staffRepo } from './models/staffRepo.js';
import { errorHandler } from './middleware/errorHandler.js';
import { consumeFirestoreLimits, createRateLimit } from './middleware/rateLimit.js';
import { randomUUID } from 'node:crypto';
import notificationRoutes from './routes/notificationRoutes.js';

import chatRoutes from './routes/chat.routes.js';
import authRoutes from './routes/auth.routes.js';
import registrantRoutes from './routes/registrant.routes.js';
import checkinRoutes from './routes/checkin.routes.js';
import emailRoutes from './routes/email.routes.js';
import eventRoutes from './routes/event.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import uploadRoutes from './routes/upload.routes.js';

dotenv.config();

const app = express();

// Global Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb', verify: (req, _res, buffer) => { req.rawBody = Buffer.from(buffer); } }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Personal/admin responses are private by default. Only public DTO handlers opt into CDN caching.
app.use((req, res, next) => {
  const started = process.hrtime.bigint();
  req.requestId = randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - started) / 1e6;
    // Avoid logging URLs/query strings containing pass IDs, emails or auth tokens.
    if (res.statusCode >= 500 || durationMs > 1000 || process.env.REQUEST_LOGGING === 'all') {
      console.log(JSON.stringify({ event: 'http_request', requestId: req.requestId,
        method: req.method, route: req.route?.path || 'unmatched', status: res.statusCode,
        durationMs: Math.round(durationMs) }));
    }
  });
  next();
});

app.use(createRateLimit({
  consume: rules => consumeFirestoreLimits(getFirestore(), rules),
}));

// Ensure staff users exist if in persistent server mode
if (process.env.NODE_ENV === 'development' && process.env.SEED_DEFAULT_STAFF === 'true') {
  staffRepo.seedDefaultAdmin().catch(() => {});
}

// Mount Routes
app.use(['/api/chat', '/chat'], chatRoutes);
app.use('/api/internal/notifications', notificationRoutes);
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
app.use('/api/events', eventRoutes);
app.use('/events', eventRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/payment', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/upload', uploadRoutes);

// Direct standard Razorpay API aliases
app.use('/api', paymentRoutes);
app.use('/', paymentRoutes);

// Health check
app.get(['/api/health', '/health', '/api'], (req, res) => {
  res.json({
    status: 'online',
    database: 'Google Cloud Firestore',
    event: 'Eventra 2026',
    environment: process.env.NODE_ENV || 'production',
    timestamp: new Date(),
    uptime: process.uptime(),
  });
});

// Error handling
app.use(errorHandler);

export { app };
export default app;
