// Pause source writes and notification workers during the final copy and verification.
import { isDeepStrictEqual } from 'node:util';
import { createClient } from '@supabase/supabase-js';
import { getFirestore } from '../config/firebase.js';
import { paymentKeys } from '../models/registrantRepoCore.js';
import { notificationId } from '../services/notificationQueue.js';

const project = process.argv.find(arg => arg.startsWith('--project='))?.slice(10);
if (!project || project !== process.env.FIREBASE_PROJECT_ID) throw new Error('Specify --project matching FIREBASE_PROJECT_ID');
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Source service role key is required');
const source = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const db = getFirestore();
const apply = process.argv.includes('--apply');
const camel = row => Object.fromEntries(Object.entries(row).map(([k,v]) => [k.replace(/_([a-z0-9])/g, (_,c) => c.toUpperCase()),v]));

function destinations(table, row) {
  let data = camel(row), collection = table, id = data.id;
  const documents = [];
  if (table === 'registrants') {
    id = data.uniqueId.trim().toUpperCase();
    data = { ...data, id, uniqueId: id, eventId: (data.eventId || 'eventra-2026').trim().toLowerCase(), email: data.email.trim().toLowerCase() };
    if (data.utrNumber) data.utrNumber = data.utrNumber.trim().toUpperCase();
    for (const key of ['emailNormalized','isVerified','paymentReference','orderReference','utrNormalized','searchText']) delete data[key];
    for (const ref of paymentKeys(db, data)) documents.push([ref, { uniqueId: id }]);
  } else if (table === 'system_config') {
    collection = 'event_config';
    data = row.config_data;
  } else if (['users','staff_users'].includes(table)) {
    id = data.username.trim().toLowerCase();
    data = { ...data, username: id, email: data.email.trim().toLowerCase() };
  } else if (table === 'notification_jobs') {
    id = notificationId(row.dedupe_key);
    data = { ...row, id };
    for (const key of ['available_at','locked_until','created_at','updated_at','sent_at']) {
      if (data[key]) data[key] = new Date(data[key]).toISOString();
    }
  } else if (table === 'event_seat_holds') {
    id = row.order_id;
  }
  documents.push([db.collection(collection).doc(id), data]);
  return documents;
}

async function copyTable(table, optional = false) {
  const primaryKey = table === 'event_seat_holds' ? 'order_id' : 'id';
  let cursor;
  let rows = 0;
  for (;;) {
    let query = source.from(table).select('*').order(primaryKey).limit(100);
    if (cursor) query = query.gt(primaryKey, cursor);
    const { data, error } = await query;
    if (error) {
      if (optional && ['PGRST205','42P01'].includes(error.code)) { console.log(table, 'absent at source'); return; }
      throw new Error('Source read failed for ' + table + ' (' + error.code + ')');
    }
    if (!data.length) break;
    for (const row of data) {
      const entries = destinations(table, row);
      await db.runTransaction(async tx => {
        const existing = await tx.getAll(...entries.map(([ref]) => ref));
        for (const [i, [ref, value]] of entries.entries()) {
          if (existing[i].exists && !isDeepStrictEqual(existing[i].data(), value)) {
            throw new Error('Destination differs in ' + ref.path + '. Resolve the conflict before cutover.');
          }
          if (process.argv.includes('--verify') && !existing[i].exists) throw new Error('Missing document in ' + ref.path);
          if (apply && !existing[i].exists) tx.create(ref, value);
        }
      });
    }
    rows += data.length;
    cursor = data.at(-1)[primaryKey];
  }
  console.log(table, rows, apply ? 'copied or matched' : 'inspected');
}

for (const table of ['club_events','system_config','users','staff_users','registrants','notification_jobs','event_seat_holds']) {
  await copyTable(table, ['notification_jobs','event_seat_holds'].includes(table));
}
