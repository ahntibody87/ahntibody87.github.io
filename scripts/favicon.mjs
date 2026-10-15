import fs from 'node:fs';
import { createHash } from 'node:crypto';

// Refresh tab and bookmark icons when the source artwork changes.
const version = createHash('sha256').update(fs.readFileSync(new URL('../assets/favicon.svg', import.meta.url))).digest('hex').slice(0, 12);
export const faviconLinks = `<link rel="icon" href="/favicon.ico?v=${version}" sizes="16x16 32x32 48x48"><link rel="icon" href="/assets/favicon.svg?v=${version}" type="image/svg+xml" sizes="any"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png?v=${version}" sizes="180x180">`;
