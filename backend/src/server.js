import { app } from './app.js';
import { initFirebase } from './config/firebase.js';
import { staffRepo } from './models/staffRepo.js';

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  initFirebase();
  await staffRepo.seedDefaultAdmin();

  app.listen(PORT, () => {
    console.log(`
══════════════════════════════════════════════════════════════
🚀 HackSeries 2026 Backend Engine Online!
🗄️ Database: Google Cloud Firestore (Firebase)
🌐 API URL: http://localhost:${PORT}
⚡ Webhook: http://localhost:${PORT}/api/registrants/webhook
🛡️ Anti-Forgery Cryptographic QR System: ACTIVE
📧 Email Sender: ${process.env.SMTP_USER || 'aditya.renake@outlook.com'}
══════════════════════════════════════════════════════════════
    `);
  });
};

startServer();
