// The course index has its own presentation; unit and activity pages keep their shells.
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const types = { simulation: 'INTERACTIVE SIMULATION', inquiry: 'INQUIRY ACTIVITY', design: 'MOLECULAR DESIGN STUDIO', resource: 'LEARNING RESOURCE', external: 'EXTERNAL ACTIVITY' };
export const advancedDescription = '세포 대사부터 유전자 발현까지. 생명과학 자료를 분석하고, 분자 구조와 생체 시스템을 탐색합니다.';

// Schematic illustrations, not experimental observations or measured data.
function diagram(id) {
  const text = (x, y, value, extra = '') => `<text x="${x}" y="${y}" ${extra}>${value}</text>`;
  let marks = '';
  if (id === 'cell-energy') {
    marks = '<path class="structure" d="M10 61H220M10 91H220"/>';
    for (let x = 14; x <= 220; x += 9) marks += `<path class="lipid" d="M${x} 66v8m0 3v8"/><circle class="lipid-head" cx="${x}" cy="62" r="2"/><circle class="lipid-head" cx="${x}" cy="90" r="2"/>`;
    for (const [x, label] of [[38, 'I'], [91, 'III'], [144, 'IV']]) marks += `<rect class="complex" x="${x - 12}" y="48" width="24" height="57" rx="5"/>${text(x, 80, label, 'text-anchor="middle" class="strong"')}<path class="signal" d="M${x} 44V27m-3 5 3-5 3 5"/>${text(x, 20, 'H⁺', 'text-anchor="middle"')}`;
    marks += '<path class="signal" d="M52 76H77m28 0h25"/><rect class="complex" x="191" y="51" width="15" height="51" rx="3"/><rect class="complex" x="180" y="101" width="37" height="14" rx="6"/><path class="signal" d="M198 26V44m-3-5 3 5 3-5"/>' + text(198, 20, 'H⁺', 'text-anchor="middle"') + text(12, 132, 'NADH → e⁻') + text(159, 132, 'ADP → ATP');
  } else if (id === 'regulation-defense') {
    marks = '<path class="structure" d="M17 25 47 58 22 91M8 58H47m0 0 43 0m-30-5 25 0m-25 10h25M115 58H156m-18 0 25-31 35-6m-35 6 8-15M156 58l29 27 30 4m-30-4 7 18"/><path class="complex" d="M44 47q-12 9 0 20l15-5 6-9-10-8z"/><circle class="node" cx="51" cy="55" r="4"/><path class="signal" d="M77 58h37m-6-3 6 3-6 3"/><path class="grid" d="M17 127H219"/><path class="signal" d="M17 126H81l7-2 8-30 8 40 9-11 13 3h93"/>' + text(17, 18, 'SYNAPTIC INPUT') + text(17, 147, 'MEMBRANE POTENTIAL');
  } else if (id === 'gene-expression') {
    marks = text(13, 18, 'DNA → RNA') + '<path class="structure" d="M16 42H217M16 58H217"/>';
    for (let x = 20; x < 214; x += 11) marks += `<path class="basepair" d="M${x} 43V57"/>`;
    marks += '<ellipse class="complex" cx="100" cy="50" rx="22" ry="16"/><path class="signal" d="M105 68q-4 14 18 17h24v37q0 20 20 20t20-20V96q0-13 14-13h16"/>';
    for (let y = 101; y <= 127; y += 7) marks += `<path class="basepair" d="M148 ${y}H186"/>`;
    marks += text(15, 105, 'TRANSCRIPTION') + text(15, 120, 'RNA FOLDING');
  } else {
    marks = '<circle class="structure" cx="116" cy="77" r="46"/><path class="vector-segment" d="M80 48A46 46 0 0 1 148 44"/><path class="vector-segment secondary" d="M160 90A46 46 0 0 1 96 119"/><path class="structure" d="M91 39 78 21H27m125 32 19-13h32M105 122l-8 19H41"/><path class="signal" d="M149 42l-7 0 4-7"/>' + text(116, 75, 'VECTOR', 'text-anchor="middle" class="strong"') + text(116, 89, 'DESIGN', 'text-anchor="middle"') + text(22, 15, 'INSERT') + text(186, 34, 'ori') + text(28, 136, 'MARKER');
  }
  return `<svg class="research-diagram" viewBox="0 0 230 160" aria-hidden="true" focusable="false">${marks}</svg>`;
}

export function advancedCourse(course) {
  const cards = course.units.map((unit, i) => {
    const activities = unit.activities;
    const typeLabels = [...new Set(activities.map(a => types[a.type]))];
    const topics = activities.length ? `<ul class="research-activity-list">${activities.slice(0, 2).map(a => `<li>${esc(a.title)}</li>`).join('')}</ul>${activities.length > 2 ? `<p class="research-more">외 ${activities.length - 2}개 활동</p>` : ''}` : '<p class="research-preparing">새로운 자료와 탐구 도구를<br>준비하고 있습니다.</p>';
    return `<a class="research-unit research-unit-${esc(unit.id)}" href="/${esc(course.id)}/${esc(unit.id)}/"><div class="research-card-heading"><span class="research-unit-number">${String(i + 1).padStart(2, '0')}</span><span class="research-unit-english" lang="en">${esc(unit.english)}</span><span class="research-arrow" aria-hidden="true">↗</span></div><h3>${esc(unit.title)}</h3><div class="research-card-content"><div class="research-card-details">${topics}<div class="research-types" lang="en">${typeLabels.map(t => `<span>${esc(t)}</span>`).join('')}</div></div><div class="research-card-figure">${diagram(unit.id)}</div></div><div class="research-card-footer"><span>${activities.length ? `${activities.length}개 활동` : '준비 중'}</span><span class="research-card-action">단원 살펴보기 <span aria-hidden="true">→</span></span></div></a>`;
  }).join('');
  return `<section class="research-intro"><p class="research-eyebrow" lang="en">ADVANCED LIFESCIENCE</p><h1>${esc(course.title)}</h1><p class="research-description">세포 대사부터 유전자 발현까지.<br>생명과학 자료를 분석하고, 분자 구조와 생체 시스템을 탐색합니다.</p></section><section id="units" class="research-units"><div class="research-section-heading"><h2>탐구 주제</h2><span>${course.units.length}개 단원</span></div><div class="research-unit-grid">${cards}</div></section>`;
}
