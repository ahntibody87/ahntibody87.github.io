const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types = {simulation:'Interactive Simulation',inquiry:'Inquiry Activity',design:'Molecular Design Studio',resource:'Learning Resource',external:'External Activity'};
const summaries = {
  'cell-energy':'세포 대사를 분석하고, 단백질의 서열과 구조를 탐색합니다.',
  'regulation-defense':'분자 전달과 신경 신호를 조절하며 생체 시스템을 탐색합니다.',
  'gene-expression':'RNA와 염색질, 사람의 발생과 세포 분화를 탐구합니다.',
  biotechnology:'생명공학 기술로 유전 정보를 읽고, 비교하고, 조작합니다.'
};
const previews = {
  'mitochondria-lab':['RESPIRATION ASSAY','호흡 분석 개념도'],
  'protein-lab':['STRUCTURE COMPARISON','서열·구조 비교 개념도'],
  'bbb-lab':['BLOOD–BRAIN BARRIER','장벽 통과 개념도'],
  'neuron-lab':['NEURAL CIRCUIT','신경 신호 개념도'],
  'rna-lab':['RNA STRUCTURE','RNA 접힘 개념도'],
  'x-inactivation':['XIST & CHROMATIN','X 불활성화 개념도'],
  'embryo-atlas':['HUMAN DEVELOPMENT','사람의 발생과 세 배엽 개념도','/assets/activities/embryo-atlas/preview.svg']
};
export function unitNavigation(course, unit) {
  return `<nav class="workspace-units" aria-label="고급 생명과학 단원">${course.units.map((u,i)=>`<a href="/${course.id}/${u.id}/"${u.id===unit.id?' aria-current="page"':''}><span>${String(i+1).padStart(2,'0')}</span>${esc(u.title)}</a>`).join('')}</nav>`;
}
export function workspaceCard(course, unit, activity, destination) {
  const preview=previews[activity.id];
  return `<a class="workspace-card" href="${esc(destination)}" data-tool-type="${esc(activity.type)}" data-tool-search="${esc(activity.title+' '+(activity.description||'')+' '+types[activity.type])}"${destination.startsWith('https://')?' target="_blank" rel="noopener noreferrer"':''}>${preview?`<div class="workspace-preview"><div class="workspace-preview-label" lang="en">${preview[0]}</div><img src="${preview[2]||`/assets/biology-art-v1/tool-${activity.id}.webp`}" alt="${esc(preview[1])}" width="640" height="360" loading="lazy" decoding="async"></div>`:''}<div class="workspace-card-body"><p class="workspace-type" lang="en">${esc(types[activity.type])}</p><h3>${esc(activity.title)}</h3><p class="workspace-card-description">${esc(activity.description||'')}</p><span class="workspace-card-footer">${preview?`<span>${esc(preview[1])}</span>`:'<span></span>'}<strong>활동 열기 <span aria-hidden="true">↗</span></strong></span></div></a>`;
}
export function unitWorkspace(course,unit,index,cards) {
  const filters=[...new Set(unit.activities.map(a=>a.type))];
  return `${unitNavigation(course,unit)}<section class="workspace-heading"><p class="workspace-eyebrow" lang="en">UNIT ${String(index+1).padStart(2,'0')} / ${esc(unit.english)}</p><h1>${esc(unit.title)}</h1><p>${esc(summaries[unit.id]||'이 주제의 자료와 탐구 도구를 살펴보세요.')}</p></section><section class="workspace-tools" aria-labelledby="workspace-tools-title"><div class="workspace-toolbar"><h2 id="workspace-tools-title">자료와 탐구 도구 <span class="workspace-count" aria-live="polite">${cards.length} tools</span></h2>${cards.length?'<label class="workspace-search"><span class="workspace-sr-only">도구 검색</span><input type="search" placeholder="도구 이름, 키워드 검색" aria-label="도구 검색"></label>':''}</div>${cards.length?`<div class="workspace-filters" role="group" aria-label="도구 유형" hidden><button type="button" data-filter="all" aria-pressed="true" lang="en">All tools</button>${filters.map(t=>`<button type="button" data-filter="${esc(t)}" aria-pressed="false" lang="en">${esc(types[t])}</button>`).join('')}</div><div class="workspace-card-grid${cards.length<3?' workspace-few':''}">${cards.join('')}</div><p class="workspace-no-results" role="status" hidden>검색 결과가 없습니다. 다른 키워드를 입력해 보세요.</p>`:'<div class="workspace-empty"><p class="workspace-eyebrow" lang="en">IN PREPARATION</p><h3>자료와 탐구 도구를 준비하고 있습니다.</h3><p>새로운 활동이 등록되면 이곳에서 바로 열 수 있습니다.</p><a href="/advanced-life-science/">다른 탐구 주제 살펴보기 <span aria-hidden="true">→</span></a></div>'}</section>`;
}
export function activityWorkspace(course,unit,activity,body) {
  return `${unitNavigation(course,unit)}<header class="workspace-heading workspace-activity-heading"><p class="workspace-eyebrow" lang="en">${esc(types[activity.type])}</p><h1>${esc(activity.title)}</h1><p>${esc(activity.description||'')}</p><a class="workspace-return" href="/${course.id}/${unit.id}/">← ${esc(unit.title)} · 전체 도구</a></header><section class="section activity-content" aria-label="활동 본문">${body}</section><a class="back-link" href="/${course.id}/${unit.id}/">← ${esc(unit.title)} 도구 목록</a>`;
}
