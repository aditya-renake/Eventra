#!/usr/bin/env node
/**
 * ============================================================================
 * DATABASE MANAGEMENT CLI TOOL (manageDb.js)
 * ============================================================================
 * Purpose:
 *   Command-line utility for developers and devops engineers to inspect, query,
 *   delete, or dump attendee data directly from the terminal without opening a GUI.
 *
 * Usage:
 *   node backend/src/scripts/manageDb.js list
 *   node backend/src/scripts/manageDb.js delete <email-or-passId>
 *   node backend/src/scripts/manageDb.js export-json > attendees.json
 * ============================================================================
 */

import { registrantRepo } from '../models/registrantRepo.js';
import dotenv from 'dotenv';
dotenv.config();

const command = process.argv[2];
const target = process.argv[3];

async function main() {
  try {
    if (command === 'list') {
      const data = await registrantRepo.getAll({ limit: 100 });
      console.log(`\n📋 Total Registrants in Database: ${data.stats.totalRegistrants}\n`);
      if (data.items.length === 0) {
        console.log('No registrants found.');
      } else {
        console.table(data.items.map(r => ({
          'Pass ID': r.uniqueId,
          'Name': r.name,
          'Email': r.email,
          'Phone': r.phone || 'N/A',
          'Pass Type': r.ticketType,
          'Status': r.paymentStatus || (r.verified ? 'VERIFIED' : 'PENDING'),
          'Amount': `₹${r.amountPaid ?? 0}`,
          'Created': r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A'
        })));
      }
    } else if (command === 'delete') {
      if (!target) {
        console.error('❌ Please specify an Email or Pass ID to delete.');
        console.log('Usage: node backend/src/scripts/manageDb.js delete <email-or-passId>');
        process.exit(1);
      }
      const existing = await registrantRepo.findByIdOrEmail(target);
      if (!existing) {
        console.error(`❌ Attendee with ID/Email "${target}" was not found.`);
        process.exit(1);
      }
      await registrantRepo.delete(existing.uniqueId);
      console.log(`✅ Successfully deleted attendee: ${existing.name} (${existing.email}, ID: ${existing.uniqueId}) from the database.`);
    } else if (command === 'export-json') {
      const data = await registrantRepo.getAll({ limit: 5000 });
      console.log(JSON.stringify(data.items, null, 2));
    } else {
      console.log(`
HackSeries Database Manager CLI:
--------------------------------
1. View all collected data:
   node backend/src/scripts/manageDb.js list

2. Delete a user by Email or Pass ID:
   node backend/src/scripts/manageDb.js delete <email-or-passId>
   e.g.: node backend/src/scripts/manageDb.js delete aditya.renake@outlook.com

3. Export full data as JSON:
   node backend/src/scripts/manageDb.js export-json > attendees.json
      `);
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
