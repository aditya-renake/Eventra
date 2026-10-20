import { staffRepo } from '../models/staffRepo.js';
import { configRepo } from '../models/configRepo.js';

export const seedDatabase = async () => {
  try {
    await staffRepo.seedDefaultAdmin();
    await configRepo.getConfig();
    console.log('✅ [DynamoDB] Seed check complete.');
  } catch (error) {
    console.error('❌ Seed error:', error.message);
  }
};
