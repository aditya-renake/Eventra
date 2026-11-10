import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';

let database;

const defaultServiceAccount = {
  type: 'service_account',
  project_id: 'hackseries-2026',
  private_key_id: '489363d13d46c3f2761c3219c8954c848091d8a7',
  private_key:
    '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDhoWNXgxjtv8TY\nrur6oo/7icyJkwm/+B1mXhQowmQ4aQ+SBTA4elvjEFFwxVeiuQLjyc+Aqv1kNyWe\nvs3Mmz4xzwTS/n7FBlmgRaZKU2+UaH4qepnPHY9ebNnHOgHs+d08zHry6SRgXmLl\nKkShYFzcfzvN9+QZsp1VWD7LJCyJ2RKfK/jVHkb2brHSlRY0fQFeXjjXYZfAIxN0\nZ7+2tnDdjNPLIUkb+mYSDpXqcjMWvuwvVRXs7xCRQxMzRN7qs2ufn8WkprhyGKDX\nIoUsuU1iVYMNB36LkRO+O2+Qj3I6g0kGPj9MX0beFgN64KH5zPDKySKbQPCNw3+T\ndR4avbTpAgMBAAECggEAG7wy8fbzgYYpNFmMGPMSr+Doe6DPegGN25+E6t26ZBTG\nDTUGEGs6EFdZK3uWojIL4ORV1YMvUrpUrYbW1Wff5U+FUEpoWt/E9KabIlfPR3bw\ny1f2wDbqALlwq8S9p9uvDmI0Wte92PrBPVpMxWmLAK/DMjZem6oRHQST83Sm5OrG\n8m5rxpUNgufpmIENdJevVhV2rX+TPunVyzLjuCnaIbWe9eNQPSQaXuhc0dpstI7i\nT97ED3/PRvqCaiiwqup7fRfSHZfarIOhnzHZkrTY8ub48F+ErRYD2ijtuJ9z19hr\nADIafafZKFWBaxKXak04PNTyJAA1iCHqC9KJ1fQL4QKBgQD7JgTBcNsGSPYXzlge\nyu6K5R4CdhrfJk4dCxH3KpqevqsBGwKLmp516IKh/zGO1dxtl/a0Ic5mXVbXXUKn\nDo6veHCNTDA93DSu+qK0CM8T1lHc4xr71lVg9XbBpybQFKh6gljM2jkC7v3lCWvF\nWrFkTqHvrtvWmAXHIV246YCycwKBgQDl/S1f6G5XDOK5BKmVW6pNXF8TdSk1N4qU\noX8AYPfnG5XKL+uzk4ZokS6JE3F/bH8hVPuem3cjgSYm129xdBE18CrsanMqXgQJ\nKOjJHVr7hmyFIsqJ7xwlLYq4iip2MKaZ30DhjEKFhF02ETvWXV8XOWH03REo8rVD\nEVeIg2s4MwKBgQDqzei0Uib0AVLTfv+0ClZrVTpxYqpM5yswzCDHzPUyZWDLb805\naB2ubutzOXvD5v5nGCR21QR7f9ipEXA3b8zHEPtpn0mbDD3VOk7Ts0ina0CuG0Yn\nHYRFWjjlZLlM4YOCxkrvezbCH18Qu3Ye1WP0O+/6fqjaQNdmDTPqpaTFMQKBgCQ+\neeAbaQge57vwmCkJgRUf8XvHgu74CcbSjIkqvuaU2k46rxJltVDVUFgZ0FEccAx4\nsA6WwXe+6pxEZzOh7vRpHNqVDAEpP8mRwN2w2p242XFBwllqbS0OuEXMwFRP5nFp\nVXg1+mXALlBO9vcZT9sBGAbWr9WcKiSfnwPMciExAoGBALLUf9tEq+x1cypYOm6A\n9gaiUqCm9nlImj9Q2NRzgknV6EOaHGlLfs/wvmGU/iUSiW9pYQ80ju4QwuaDq/GW\nb9kf9zBKBHuxuaEtWBB5M7illJT5P2j0YxuFhr2IBRVg6ZMpm3/QlUp0VkLwarB3\nFt+orwGD+cb5n4SSKFtBRUVn\n-----END PRIVATE KEY-----\n',
  client_email: 'firebase-adminsdk-fbsvc@hackseries-2026.iam.gserviceaccount.com',
};

function parseServiceAccount(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  let str = String(raw).trim();
  if ((str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'))) {
    str = str.slice(1, -1).trim();
  }
  try {
    return JSON.parse(str);
  } catch {
    try {
      return JSON.parse(str.replace(/[\r\n\t]/g, ' '));
    } catch {
      return null;
    }
  }
}

export function getFirestore() {
  if (database) return database;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'hackseries-2026';
  const options = { projectId };

  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    let account = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!account && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      account = {
        project_id: projectId,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY,
      };
    }
    if (!account || !account.private_key) {
      account = defaultServiceAccount;
    }

    if (account && account.private_key) {
      account.private_key = account.private_key.replace(/\\n/g, '\n');
      options.credential = cert(account);
    } else {
      options.credential = applicationDefault();
    }
  }

  database = adminFirestore(getApps()[0] || initializeApp(options));
  database.settings({ ignoreUndefinedProperties: true, preferRest: !process.env.FIRESTORE_EMULATOR_HOST });
  return database;
}

export const initFirebase = getFirestore;
