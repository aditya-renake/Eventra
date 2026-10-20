/**
 * ==============================================================================
 * HackSeries 2026 — HTTP Server Bootstrap
 * ==============================================================================
 * Purpose:
 *   Entry point for the standalone Express Node.js server.
 *   Initializes default staff accounts in Supabase and binds the HTTP listener to PORT (5001).
 * ==============================================================================
 */

import { app } from './app.js';
import { staffRepo } from './models/staffRepo.js';

const PORT = process.env.PORT || 5001;

/**
 * Boots the HTTP listener and runs initial admin seeding.
 */
const startServer = async () => {
  await staffRepo.seedDefaultAdmin().catch(() => {});

  app.listen(PORT, () => {
    console.log(`
══════════════════════════════════════════════════════════════
🚀 HackSeries 2026 Backend Engine Online!
🗄️ Database: Supabase Postgres Engine
🌐 API URL: http://localhost:${PORT}
⚡ Webhook: http://localhost:${PORT}/api/registrants/webhook
🛡️ Anti-Forgery Cryptographic QR System: ACTIVE
📧 Email Sender: ${process.env.SMTP_USER || 'tigeradi1504@gmail.com'}
══════════════════════════════════════════════════════════════
    `);
  });
};

startServer();
