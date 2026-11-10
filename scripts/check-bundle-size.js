import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
const html = readFileSync('frontend/dist/index.html', 'utf8');
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)];
if (!scripts.length) throw new Error('No entry scripts found');
const bytes = scripts.reduce((sum, match) => sum + statSync(resolve('frontend/dist', `.${match[1]}`)).size, 0);
if (bytes > 230000) throw new Error(`Entry JS ${bytes} bytes exceeds 230 KB budget`);
console.log(`Entry JS budget passed: ${bytes} / 230000 bytes`);
