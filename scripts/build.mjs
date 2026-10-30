import { socialMeta } from './social.mjs';
import { siteHeader } from './header.mjs';
import { unitWorkspace, activityWorkspace, workspaceCard } from './advanced-workspace.mjs';
import { advancedCourse, advancedDescription } from './advanced-course.mjs';
import { faviconLinks } from './favicon.mjs';
import fs from 'node:fs';
import { homePage } from './home.mjs';
import { accessHead, accessContent } from './course-access.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Change the stylesheet URL whenever its content changes, avoiding stale browser caches.
// Mixed historical CRLF blobs can acquire CRCRLF on a Windows text checkout.
// Equivalent line endings must not invalidate every page's asset version.
const styleVersion = createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/style.css'), 'utf8').replace(/\r+\n/g, '\n')).digest('hex').slice(0, 12);
const sharedVersion = createHash('sha256').update(['assets/theme.css', 'assets/navigation.js'].map(file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r+\n/g, '\n')).join('')).digest('hex').slice(0, 12);
const homeHash = createHash('sha256');
for (const file of ['assets/home.css', 'assets/home.js', 'assets/home-protein.js', 'assets/overview.css', 'scripts/overview.mjs', 'assets/overview/protein-comparison.svg', 'assets/overview/rna-design.svg', 'assets/overview/bbb-simulation.svg', 'assets/overview/inquiry-evidence.svg', 'assets/overview/protein-comparison-mobile.svg', 'assets/overview/rna-design-mobile.svg', 'assets/overview/bbb-simulation-mobile.svg', 'assets/overview/inquiry-evidence-mobile.svg']) {
  homeHash.update(fs.readFileSync(path.join(root, file), 'utf8').replace(/\r+\n/g, '\n'));
}
const homeVersion = homeHash.digest('hex').slice(0, 12);
const advancedVersion = createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/advanced-course.css'), 'utf8').replace(/\r+\n/g, '\n')).digest('hex').slice(0, 12);
const workspaceVersion = createHash('sha256').update(['assets/advanced-workspace.css','assets/advanced-workspace.js'].map(f => fs.readFileSync(path.join(root,f),'utf8').replace(/\r+\n/g,'\n')).join('')).digest('hex').slice(0,12);
const site = JSON.parse(fs.readFileSync(path.join(root, 'data/site.json'), 'utf8'));
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const types = { simulation: 'INTERACTIVE SIMULATION', inquiry: 'INQUIRY ACTIVITY', design: 'MOLECULAR DESIGN STUDIO', resource: 'LEARNING RESOURCE', external: 'EXTERNAL ACTIVITY' };
const slug = value => { if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw new Error(`잘못된 id: ${value}`); };
const unique = items => { const ids = new Set(); for (const item of items) { slug(item.id); if (ids.has(item.id)) throw new Error(`중복 id: ${item.id}`); ids.add(item.id); } };
const courseUrl = course => `/${course.id}/`;
const unitUrl = (course, unit) => `${courseUrl(course)}${unit.id}/`;
const number = index => String(index + 1).padStart(2, '0');
const art = '<div class="hero-art" aria-hidden="true"><div class="orbit o1"></div><div class="orbit o2"></div><div class="orbit o3"></div><span class="nucleus"></span><span class="particle p1"></span><span class="particle p2"></span><span class="particle p3"></span></div>';
const notice = (title, description) => `<div class="notice"><span class="notice-icon" aria-hidden="true">↳</span><div><h3>${esc(title)}</h3><p>${esc(description)}</p></div></div>`;
const section = (id, english, title, body, count = '') => `<section id="${id}" class="section"><div class="section-title"><div><p class="eyebrow">${english}</p><h2>${esc(title)}</h2></div>${count ? `<span class="count">${esc(count)}</span>` : ''}</div>${body}</section>`;
const card = ({ url, index, english, title, description = '', label, theme = '', external = false }) => `<a class="portal-card ${theme}" href="${esc(url)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}><div class="card-top"><span class="card-number">${number(index)}</span><span class="card-arrow" aria-hidden="true">↗</span></div><p class="eyebrow">${esc(english)}</p><h3>${esc(title)}</h3>${description ? `<p class="card-description">${esc(description)}</p>` : ''}<span class="card-label">${esc(label)}${external ? ' · 새 창' : ''}</span></a>`;

function page({ url, title, description, crumbs, course, unit, content }) {
  const advancedIndex = url === '/advanced-life-science/';
  const advancedHead = course.id === 'advanced-life-science' ? `<link rel="preload" href="/assets/fonts/PretendardVariable.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/assets/advanced-course.css?v=${advancedVersion}">` : '';
  const breadcrumb = crumbs.map((item, index) => `<li>${index === crumbs.length - 1 ? `<span aria-current="page">${esc(item.title)}</span>` : `<a href="${item.url}">${esc(item.title)}</a>`}</li>`).join('');
  return `<!doctype html>
<!-- Generated by scripts/build.mjs. Edit data/site.json or the shared template. -->
<html lang="ko" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${esc(description)}"><title>${esc(title === course.title ? title : title + " | " + course.title)}</title><link rel="canonical" href="https://ahntibody87.github.io${url}">${socialMeta({url,title:title+" | ATLL",description})}${faviconLinks}<link rel="stylesheet" href="/assets/style.css?v=${styleVersion}"><link rel="stylesheet" href="/assets/theme.css?v=${sharedVersion}"><script src="/assets/navigation.js?v=${sharedVersion}" defer></script>${accessHead(site)}${advancedHead}${course.id === 'advanced-life-science' && !advancedIndex ? `<link rel="stylesheet" href="/assets/advanced-workspace.css?v=${workspaceVersion}"><script src="/assets/advanced-workspace.js?v=${workspaceVersion}" defer></script>` : ''}</head>
<body${course.id === 'advanced-life-science' ? ' data-course="advanced-life-science"' : ''}${advancedIndex ? ' data-page="advanced-course"' : course.id === 'advanced-life-science' ? ' data-page="advanced-workspace"' : ''}><a class="skip" href="#main">본문 바로가기</a>${siteHeader(site, url)}<div class="page"><header class="topbar"><nav class="breadcrumbs" aria-label="현재 위치"><ol>${breadcrumb}</ol></nav></header><main id="main" tabindex="-1">${accessContent(course,content)}<footer class="portal-footer"><a href="/">통합 수업 포털로 돌아가기</a><button class="portal-back-top" type="button">맨 위로 올라가기 <span aria-hidden="true">↑</span></button></footer></main></div></body></html>
`;
}

const pages = new Map();
function add(options) {
  const file = options.url === '/' ? 'index.html' : `${options.url.slice(1)}index.html`;
  if (pages.has(file)) throw new Error(`중복 페이지: ${file}`);
  pages.set(file, options.url === '/' ? homePage(site, homeVersion, sharedVersion) : page(options));
}
unique(site.courses);
const homeCrumb = { title: '홈', url: '/' };
add({ url: '/' });

for (const course of site.courses) {
  unique(course.units);
  const url = courseUrl(course);
  const crumbs = [homeCrumb, { title: course.title, url }];
  const advanced = course.id === 'advanced-life-science';
  const units = course.units.length ? `<div class="card-grid units">${course.units.map((unit, i) => card({ url: unitUrl(course, unit), index: i, english: unit.english, title: unit.title, label: `${unit.activities.length}개 활동 · 단원 살펴보기`, theme: `theme-${i % 3}` })).join('')}</div>` : notice('콘텐츠 준비 중', '수업 자료와 탐구 활동은 준비되는 대로 이곳에서 안내합니다.');
  add({ url, title: course.title, description: advanced ? advancedDescription : course.description, crumbs, course, content: advanced ? advancedCourse(course) : `<section class="hero"><p class="eyebrow">${esc(course.english)}</p><h1>${esc(course.title)}</h1><p class="intro">${esc(course.description)}</p>${course.units.length ? '<a class="button" href="#units">단원 선택하기 <span aria-hidden="true">↓</span></a>' : ''}${art}</section>${section('units', 'COURSE UNITS', '단원별 학습', units, course.units.length ? `${course.units.length}개 단원` : '')}<a class="back-link" href="/">← 통합 수업 포털</a>` });
  for (const [index, unit] of course.units.entries()) {
    unique(unit.activities);
    const unitPath = unitUrl(course, unit);
    const unitCrumbs = [...crumbs, { title: unit.title, url: unitPath }];
    const activities = unit.activities.map((activity, i) => {
      if (!types[activity.type]) throw new Error(`지원하지 않는 활동 형식: ${activity.type}`);
      if (!!activity.url === !!activity.content) throw new Error(`${activity.id}: url 또는 content 중 하나를 지정하세요.`);
      let destination = activity.url;
      if (activity.content) {
        if (!/^content\/[a-zA-Z0-9/_-]+\.html$/.test(activity.content)) throw new Error('content는 content/ 안의 HTML 파일이어야 합니다.');
        destination = `${unitPath}${activity.id}/`;
        const body = fs.readFileSync(path.join(root, activity.content), 'utf8');
        add({ url: destination, title: activity.title, description: activity.description || activity.title, course, unit, crumbs: [...unitCrumbs, { title: activity.title, url: destination }], content: advanced ? activityWorkspace(course,unit,activity,body) : `<section class="hero compact"><p class="eyebrow">${esc(types[activity.type])}</p><h1>${esc(activity.title)}</h1><p class="intro">${esc(activity.description || '')}</p></section><section class="section activity-content" aria-label="활동 본문">${body}</section><a class="back-link" href="${unitPath}">← ${esc(unit.title)}</a>` });
      }
      if (!(destination.startsWith('/') && !destination.startsWith('//') && !/[\\\s]/.test(destination)) && !/^https:\/\/[^\s]+$/.test(destination)) throw new Error(`안전하지 않은 활동 URL: ${destination}`);
      return advanced ? workspaceCard(course,unit,activity,destination) : card({ url: destination, index: i, english: types[activity.type], title: activity.title, description: activity.description, label: '활동 열기', external: destination.startsWith('https://') });
    });
    add({ url: unitPath, title: unit.title, description: `${course.title} ${index + 1}단원 · ${unit.title} 학습 자료와 탐구 활동`, crumbs: unitCrumbs, course, unit, content: advanced ? unitWorkspace(course,unit,index,activities) : `<section class="hero compact"><p class="eyebrow">${esc(course.title)} · UNIT ${number(index)}</p><h1>${esc(unit.title)}</h1><p class="lab-name">${esc(unit.english)}</p><p class="intro">이 단원의 학습 자료와 탐구 활동을 모아 보는 공간입니다.</p>${art}</section>${section('activities', 'LEARNING & EXPLORATION', '학습 자료와 탐구 활동', activities.length ? `<div class="card-grid activities">${activities.join('')}</div>` : notice('등록된 활동이 없습니다', '수업에서 사용할 자료와 탐구 활동이 등록되면 이곳에서 확인할 수 있습니다.'), `${activities.length}개 활동`)}<a class="back-link" href="${url}">← ${esc(course.title)} 단원 목록</a>` });
  }
}

// Validate the entire configuration before writing. Existing, unrelated files are never removed.
let differences = 0;
for (const [file, html] of pages) {
  const target = path.join(root, file);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== html) { console.error(`재생성 필요: ${file}`); differences++; }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, html);
  }
}
if (differences) process.exitCode = 1;
else console.log(`${pages.size}개 페이지 ${process.argv.includes('--check') ? '최신 상태 확인' : '생성 완료'}`);


