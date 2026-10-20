import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

let dbInstance = null;
let isInMemoryFallback = false;

// In-Memory store for local development fallback if Google Cloud credentials are not yet set
class MemoryFirestore {
  constructor() {
    this.collections = new Map();
  }

  collection(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map());
    }
    const store = this.collections.get(name);

    return {
      doc: (id) => ({
        set: async (data, options = {}) => {
          const current = store.get(id) || {};
          const merged = options.merge ? { ...current, ...data } : { ...data };
          store.set(id, merged);
          return { writeTime: new Date() };
        },
        get: async () => ({
          exists: store.has(id),
          id,
          data: () => store.get(id) || null,
        }),
        update: async (data) => {
          if (!store.has(id)) throw new Error(`Document ${id} not found`);
          const current = store.get(id);
          const updated = { ...current, ...data };
          store.set(id, updated);
          return { writeTime: new Date() };
        },
        delete: async () => {
          store.delete(id);
          return { writeTime: new Date() };
        },
      }),
      where: (field, op, value) => ({
        limit: (limitCount) => ({
          get: async () => {
            const matches = [];
            for (const [id, item] of store.entries()) {
              if (op === '==' && item[field] === value) {
                matches.push({ id, exists: true, data: () => item });
                if (matches.length >= limitCount) break;
              }
            }
            return {
              empty: matches.length === 0,
              size: matches.length,
              docs: matches,
            };
          },
        }),
        get: async () => {
          const matches = [];
          for (const [id, item] of store.entries()) {
            if (op === '==' && item[field] === value) {
              matches.push({ id, exists: true, data: () => item });
            }
          }
          return {
            empty: matches.length === 0,
            size: matches.length,
            docs: matches,
          };
        },
      }),
      get: async () => {
        const docs = [];
        for (const [id, item] of store.entries()) {
          docs.push({ id, exists: true, data: () => item });
        }
        return {
          empty: docs.length === 0,
          size: docs.length,
          docs,
        };
      },
    };
  }
}

/**
 * Initialize Firebase Admin SDK
 */
export const initFirebase = () => {
  if (dbInstance) return dbInstance;

  try {
    const apps = getApps();
    if (apps.length > 0) {
      dbInstance = getAdminFirestore();
      return dbInstance;
    }

    // 1. Check for Service Account JSON string in environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      let serviceAccount = null;
      if (typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string') {
        let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
          raw = raw.slice(1, -1).trim();
        }
        try {
          serviceAccount = JSON.parse(raw);
        } catch (e1) {
          try {
            // Handle unescaped newlines or literal \n
            serviceAccount = JSON.parse(raw.replace(/[\r\n\t]/g, ' '));
          } catch (e2) {
            console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', e1.message);
          }
        }
      } else {
        serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
      }

      if (serviceAccount && serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        initializeApp({
          credential: cert(serviceAccount),
        });
        console.log('✅ Connected to Google Cloud Firestore (via FIREBASE_SERVICE_ACCOUNT).');
        dbInstance = getAdminFirestore();
        return dbInstance;
      }
    }

    // 2. Check for individual Project ID, Client Email & Private Key
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
      console.log(`✅ Connected to Google Cloud Firestore (${process.env.FIREBASE_PROJECT_ID}).`);
      dbInstance = getAdminFirestore();
      return dbInstance;
    }

    // 3. Built-in Fallback for Vercel Production deployment
    const defaultServiceAccount = {
      type: 'service_account',
      project_id: 'hackseries-2026',
      private_key_id: '489363d13d46c3f2761c3219c8954c848091d8a7',
      private_key:
        '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDhoWNXgxjtv8TY\nrur6oo/7icyJkwm/+B1mXhQowmQ4aQ+SBTA4elvjEFFwxVeiuQLjyc+Aqv1kNyWe\nvs3Mmz4xzwTS/n7FBlmgRaZKU2+UaH4qepnPHY9ebNnHOgHs+d08zHry6SRgXmLl\nKkShYFzcfzvN9+QZsp1VWD7LJCyJ2RKfK/jVHkb2brHSlRY0fQFeXjjXYZfAIxN0\nZ7+2tnDdjNPLIUkb+mYSDpXqcjMWvuwvVRXs7xCRQxMzRN7qs2ufn8WkprhyGKDX\nIoUsuU1iVYMNB36LkRO+O2+Qj3I6g0kGPj9MX0beFgN64KH5zPDKySKbQPCNw3+T\ndR4avbTpAgMBAAECggEAG7wy8fbzgYYpNFmMGPMSr+Doe6DPegGN25+E6t26ZBTG\nDTUGEGs6EFdZK3uWojIL4ORV1YMvUrpUrYbW1Wff5U+FUEpoWt/E9KabIlfPR3bw\ny1f2wDbqALlwq8S9p9uvDmI0Wte92PrBPVpMxWmLAK/DMjZem6oRHQST83Sm5OrG\n8m5rxpUNgufpmIENdJevVhV2rX+TPunVyzLjuCnaIbWe9eNQPSQaXuhc0dpstI7i\nT97ED3/PRvqCaiiwqup7fRfSHZfarIOhnzHZkrTY8ub48F+ErRYD2ijtuJ9z19hr\nADIafafZKFWBaxKXak04PNTyJAA1iCHqC9KJ1fQL4QKBgQD7JgTBcNsGSPYXzlge\nyu6K5R4CdhrfJk4dCxH3KpqevqsBGwKLmp516IKh/zGO1dxtl/a0Ic5mXVbXXUKn\nDo6veHCNTDA93DSu+qK0CM8T1lHc4xr71lVg9XbBpybQFKh6gljM2jkC7v3lCWvF\nWrFkTqHvrtvWmAXHIV246YCycwKBgQDl/S1f6G5XDOK5BKmVW6pNXF8TdSk1N4qU\noX8AYPfnG5XKL+uzk4ZokS6JE3F/bH8hVPuem3cjgSYm129xdBE18CrsanMqXgQJ\nKOjJHVr7hmyFIsqJ7xwlLYq4iip2MKaZ30DhjEKFhF02ETvWXV8XOWH03REo8rVD\nEVeIg2s4MwKBgQDqzei0Uib0AVLTfv+0ClZrVTpxYqpM5yswzCDHzPUyZWDLb805\naB2ubutzOXvD5v5nGCR21QR7f9ipEXA3b8zHEPtpn0mbDD3VOk7Ts0ina0CuG0Yn\nHYRFWjjlZLlM4YOCxkrvezbCH18Qu3Ye1WP0O+/6fqjaQNdmDTPqpaTFMQKBgCQ+\neeAbaQge57vwmCkJgRUf8XvHgu74CcbSjIkqvuaU2k46rxJltVDVUFgZ0FEccAx4\nsA6WwXe+6pxEZzOh7vRpHNqVDAEpP8mRwN2w2p242XFBwllqbS0OuEXMwFRP5nFp\nVXg1+mXALlBO9vcZT9sBGAbWr9WcKiSfnwPMciExAoGBALLUf9tEq+x1cypYOm6A\n9gaiUqCm9nlImj9Q2NRzgknV6EOaHGlLfs/wvmGU/iUSiW9pYQ80ju4QwuaDq/GW\nb9kf9zBKBHuxuaEtWBB5M7illJT5P2j0YxuFhr2IBRVg6ZMpm3/QlUp0VkLwarB3\nFt+orwGD+cb5n4SSKFtBRUVn\n-----END PRIVATE KEY-----\n',
      client_email: 'firebase-adminsdk-fbsvc@hackseries-2026.iam.gserviceaccount.com',
    };

    initializeApp({
      credential: cert(defaultServiceAccount),
    });
    console.log('✅ Connected to Google Cloud Firestore (via built-in service credentials).');
    dbInstance = getAdminFirestore();
    return dbInstance;
  } catch (err) {
    console.warn('⚠️ [Firestore] Connection notice, using local memory mode:', err.message);
    isInMemoryFallback = true;
    dbInstance = new MemoryFirestore();
    return dbInstance;
  }
};

export const getFirestore = () => {
  if (!dbInstance) {
    return initFirebase();
  }
  return dbInstance;
};
