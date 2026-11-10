import { getFirestore } from '../config/firebase.js';
import { createRegistrantRepository } from './registrantRepoCore.js';

export const registrantRepo = createRegistrantRepository({
  getFirestore,
});
