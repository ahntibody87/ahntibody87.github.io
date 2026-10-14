import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = spawnSync(process.execPath, ['scripts/build.mjs', '--check'], { cwd: root, encoding: 'utf8' });
process.stdout.write(build.stdout);
assert.equal(build.status, 0, build.stderr);
const config = JSON.parse(fs.readFileSync(path.join(root, 'data/site.json'), 'utf8'));
const routes = ['/'];
for (const c of config.courses) {
  routes.push(`/${c.id}/`);
  for (const u of c.units) {
    routes.push(`/${c.id}/${u.id}/`);
    for (const a of u.activities) if (a.content) routes.push(`/${c.id}/${u.id}/${a.id}/`);
  }
}
let links = 0;
for (const route of routes) {
  const file = path.join(root, route, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${route}: h1`);
  assert.match(html, /aria-label="현재 위치"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /name="viewport"/);
  for (const [, raw] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^https:\/\//.test(raw)) continue;
    const url = new URL(raw, `https://example.test${route}`);
    let target = path.join(root, decodeURIComponent(url.pathname));
    if (url.pathname.endsWith('/')) target = path.join(target, 'index.html');
    assert.ok(fs.existsSync(target), `${route}: 없는 경로 ${raw}`);
    if (url.hash) {
      const contents = fs.readFileSync(target, 'utf8');
      assert.ok(contents.includes(`id="${url.hash.slice(1)}"`), `${route}: 없는 앵커 ${raw}`);
    }
    links++;
  }
}
console.log(`${routes.length}개 독립 URL, ${links}개 내부 링크·정적 파일·앵커 검사 통과`);

// Home card artwork is referenced from CSS rather than generated HTML.
const homeStyles = fs.readFileSync(path.join(root, 'assets/home.css'), 'utf8');
for (const [, url] of homeStyles.matchAll(/url\(['"]?(\/assets\/[^)'"\s]+)['"]?\)/g)) {
  assert.ok(fs.existsSync(path.join(root, url)), `메인 배경 이미지 없음: ${url}`);
}
console.log('메인 페이지 CSS 배경 이미지 경로 검사 통과');
