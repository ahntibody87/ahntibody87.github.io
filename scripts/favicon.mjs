import fs from 'node:fs';
import { createHash } from 'node:crypto';

// Use new file paths as well as query versions: bookmark caches can retain old paths.
const version = createHash('sha256').update(fs.readFileSync(new URL('../assets/favicon.svg', import.meta.url))).digest('hex').slice(0, 12);
export const faviconLinks = `<link rel="icon" href="/assets/favicon-light.ico?v=${version}" type="image/x-icon" sizes="16x16 32x32 48x48"><link rel="icon" href="/assets/favicon-light-32.png?v=${version}" type="image/png" sizes="32x32"><link rel="icon" href="/assets/favicon-light.svg?v=${version}" type="image/svg+xml" sizes="any"><link rel="apple-touch-icon" href="/assets/apple-touch-icon.png?v=${version}" sizes="180x180">`;
