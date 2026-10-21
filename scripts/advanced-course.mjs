// The course index has its own presentation; unit and activity pages keep their shells.
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const types = { simulation: 'INTERACTIVE SIMULATION', inquiry: 'INQUIRY ACTIVITY', design: 'MOLECULAR DESIGN STUDIO', resource: 'LEARNING RESOURCE', external: 'EXTERNAL ACTIVITY' };
export const advancedDescription = '세포 대사부터 유전자 발현까지. 생명과학 자료를 분석하고, 분자 구조와 생체 시스템을 탐색합니다.';

// Approved conceptual artwork; not measured data or molecular-coordinate renders.
const unitArt = {
  'cell-energy': '미토콘드리아의 이중막과 크리스타를 보여주는 개념도',
  'regulation-defense': '신경세포와 혈액–뇌 장벽을 보여주는 개념도',
  'gene-expression': 'DNA 전사와 RNA 생성을 보여주는 개념도',
  biotechnology: '플라스미드와 유전자 삽입을 보여주는 개념도'
};
function diagram(id) {
  return `<img class="research-unit-art" src="/assets/biology-art-v1/unit-${esc(id)}.webp" alt="${esc(unitArt[id] || '')}" width="800" height="600" loading="lazy" decoding="async">`;
}

export function advancedCourse(course) {
  const cards = course.units.map((unit, i) => {
    const activities = unit.activities;
    const typeLabels = [...new Set(activities.map(a => types[a.type]))];
    const topics = activities.length ? `<ul class="research-activity-list">${activities.slice(0, 2).map(a => `<li>${esc(a.title)}</li>`).join('')}</ul>${activities.length > 2 ? `<p class="research-more">외 ${activities.length - 2}개 활동</p>` : ''}` : '<p class="research-preparing">새로운 자료와 탐구 도구를<br>준비하고 있습니다.</p>';
    return `<a class="research-unit research-unit-${esc(unit.id)}" href="/${esc(course.id)}/${esc(unit.id)}/"><div class="research-card-heading"><span class="research-unit-number">${String(i + 1).padStart(2, '0')}</span><span class="research-unit-english" lang="en">${esc(unit.english)}</span><span class="research-arrow" aria-hidden="true">↗</span></div><h3>${esc(unit.title)}</h3><div class="research-card-content"><div class="research-card-details">${topics}<div class="research-types" lang="en">${typeLabels.map(t => `<span>${esc(t)}</span>`).join('')}</div></div><div class="research-card-figure">${diagram(unit.id)}</div></div><div class="research-card-footer"><span>${activities.length ? `${activities.length}개 활동` : '준비 중'}</span><span class="research-card-action">단원 살펴보기 <span aria-hidden="true">→</span></span></div></a>`;
  }).join('');
  return `<section class="research-intro"><p class="research-eyebrow" lang="en">ADVANCED LIFESCIENCE</p><h1>${esc(course.title)}</h1><p class="research-description">세포 대사부터 유전자 발현까지.<br>생명과학 자료를 분석하고, 분자 구조와 생체 시스템을 탐색합니다.</p></section><section id="units" class="research-units"><div class="research-section-heading"><h2 lang="en">Select a unit</h2><span>${course.units.length}개 단원</span></div><div class="research-unit-grid">${cards}</div></section>`;
}
