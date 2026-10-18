import fs from 'node:fs';
import {createHash} from 'node:crypto';

const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function accessConfig(site) {
  return site.courses.filter(c=>c.entryGate).map(c=>{
    const g=c.entryGate;
    if(Object.keys(g).some(k=>!['salt','iterations','digest'].includes(k)) ||
       !/^[a-f0-9]{32}$/.test(g.salt) || !/^[a-f0-9]{64}$/.test(g.digest) ||
       !Number.isInteger(g.iterations) || g.iterations<100000 || g.iterations>1000000)
      throw new Error(`${c.id}: 잘못된 입장 비밀번호 확인 설정`);
    return {id:c.id,title:c.title,path:`/${c.id}/`,...g};
  });
}
export function accessHead(site) {
  const config=accessConfig(site);
  if(!config.length)return '';
  const hash=createHash('sha256');
  for(const file of ['course-access.css','course-access.mjs','course-password.mjs'])
    hash.update(fs.readFileSync(new URL(`../assets/${file}`,import.meta.url),'utf8'));
  const version=hash.digest('hex').slice(0,12);
  return `<link rel="stylesheet" href="/assets/course-access.css?v=${version}"><script id="course-access-config" type="application/json">${JSON.stringify(config).replace(/</g,'\\u003c')}</script><script type="module" src="/assets/course-access.mjs?v=${version}"></script>`;
}
export function accessContent(course,content) {
  if(!course.entryGate)return content;
  return `<section class="course-entry-screen" data-entry-course="${esc(course.id)}" aria-labelledby="course-entry-title"><div class="course-entry-card"><p class="entry-eyebrow" lang="en">COURSE ACCESS</p><h2 id="course-entry-title">${esc(course.title)}</h2><p class="entry-description">입장하려면 비밀번호를 입력해 주세요.</p><form class="course-access-form" data-entry-course="${esc(course.id)}"><label for="course-entry-password">입장 비밀번호</label><input id="course-entry-password" type="password" name="password" autocomplete="current-password" maxlength="128" required disabled aria-describedby="course-entry-message"><p id="course-entry-message" class="course-access-message" role="alert"></p><button type="submit" disabled>입장하기 <span aria-hidden="true">→</span></button></form><p class="course-access-hint">입장 상태는 이 탭을 닫을 때까지 유지됩니다.</p><a class="course-access-home" href="/">← 홈페이지로 돌아가기</a><noscript><p>비밀번호를 입력하려면 자바스크립트를 켜 주세요.</p></noscript></div></section><div class="course-access-content" hidden inert tabindex="-1">${content}</div>`;
}
