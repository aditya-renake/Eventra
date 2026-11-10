import { getFirestore } from '../config/firebase.js';
import { getSupabase, isSupabaseConfigured, toCamel, toSnake } from '../config/supabase.js';
import { prepareRegistrantForStorage, hydrateRegistrantMedia, storeCheckinPhoto } from '../services/registrantMediaService.js';
import { createRegistrantRepository } from './registrantRepoCore.js';

export const registrantRepo = createRegistrantRepository({
  getFirestore, getSupabase, isSupabaseConfigured, toCamel, toSnake,
  prepareRegistrantForStorage, hydrateRegistrantMedia, storeCheckinPhoto,
});
