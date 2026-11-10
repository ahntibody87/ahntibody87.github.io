import {equipmentArt} from './visuals.mjs?v=pcr21-nodot1';

const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountScreeningIntro(root,onFinish){
  const $=selector=>root.querySelector(selector);
  root.innerHTML=`<section class="amp-screening-intro" aria-label="도입 영상">
    <p class="amp-screening-caption">바이러스 감염 의심 환자의 검체를 채취하였습니다. 감염 여부를 직접 실험을 통해 확인하세요.</p>
    <video width="1080" height="608" muted playsinline controls preload="metadata" aria-label="선별진료소에서 A와 B의 코 검체를 채취하고 PCR 실험실로 옮기는 장면">
      <source src="/assets/activities/amplicon/screening-intro.webm?v=swab26" type="video/webm">
      영상 재생을 지원하지 않는 환경에서는 영상 건너뛰기를 선택하세요.
    </video>
    <div class="amp-screening-actions"><button type="button" id="amp-skip-intro">영상 건너뛰기 →</button></div>
    <p id="amp-intro-status" role="status" hidden></p>
  </section>`;
  const video=$('.amp-screening-intro video');
  const finish=()=>{
    if(!video.isConnected)return;
    playback?.disconnect();
    video.pause();onFinish();
    $('#amp-brief-title')?.focus({preventScroll:true});
  };
  const playback=reducedMotion()?null:new IntersectionObserver(entries=>{
    if(!entries.some(entry=>entry.isIntersecting))return;
    playback.disconnect();
    video.muted=true;
    video.play().catch(()=>{});
  },{threshold:.25});
  video.addEventListener('ended',finish,{once:true});
  video.querySelector('source').addEventListener('error',()=>{
    const status=$('#amp-intro-status');
    if(!status)return;
    status.hidden=false;
    status.textContent='영상을 불러오지 못했습니다. 영상 건너뛰기를 눌러 실험으로 이동하세요.';
  },{once:true});
  $('#amp-skip-intro').onclick=finish;
  playback?.observe(video);
}

export function briefingMarkup(scenario,art=equipmentArt('pcr')){return `<section class="amp-brief"><div class="amp-brief-visual">${art}<div><h3 id="amp-brief-title" tabindex="-1">${esc(scenario.title)}</h3><p>${esc(scenario.brief)}</p></div></div><div class="amp-facts"><article><span>01 / 시료</span><h4>감염 의심자 A와 B</h4><p>핵산 추출을 완료하여 아이스박스에 보관하였습니다.<br>과학실에서 감염 여부를 판단하세요.</p></article><article><span>02 / 표적</span><h4>${esc(scenario.target)}(약 ${scenario.productBp}bp)</h4><p>${esc(scenario.virus)}는 RNA 바이러스입니다.<br>RT-PCR(RNA → cDNA → DNA 증폭)을 진행해야 합니다.</p></article><article><span>03 / 대조군</span><h4>대조군별 기대 결과</h4><p><strong>양성 대조군(표적 바이러스 RNA)</strong> — 표적 밴드가 나타나면 역전사와 증폭이 정상적으로 진행됐음을 확인할 수 있습니다.<br><br><strong>음성 대조군(증류수, 무주형 대조군)</strong> — 표적 밴드가 나타나지 않아야 합니다. 표적 밴드가 나타나면 오염 가능성을 의심합니다.</p></article></div><div class="amp-route">시약 조제 <b>→</b> 역전사와 PCR <b>→</b> 전기영동 <b>→</b> 근거로 판정</div><p>한 튜브에서 역전사와 PCR을 이어서 하는 <strong>RT-PCR</strong>을 사용합니다. 완성된 겔과 추출 RNA가 준비되어 있습니다.</p></section>`;}

export function mountBriefing(root,scenario,onStart){
  const quality=reducedMotion()?'low':'normal';
  const step=scenario.steps[0];
  root.innerHTML=`<div class="amp-top"><div><span class="amp-kicker">분자 진단 탐구 / 10~20분</span><h2>AMPLICON <span>웹 구현 실험실</span></h2></div><label>애니메이션 <select id="amp-quality"><option value="normal" ${quality==='normal'?'selected':''}>표준</option><option value="low" ${quality==='low'?'selected':''}>저사양 / 움직임 줄이기</option></select></label></div>
  <div class="amp-layout"><aside class="amp-progress"><span class="amp-kicker">현재 단계 0 / 6</span><h3>${esc(step.title)}</h3><ol class="amp-step-list">${scenario.steps.map((s,i)=>`<li ${i===0?'aria-current="step"':''}><span>${i}</span>${esc(s.title)}</li>`).join('')}</ol><details><summary>왜 이 과정을 할까요?</summary><p>${esc(step.why)}</p></details><div class="amp-side-actions"><button type="button" data-action="next" class="amp-primary">실험 시작하기 →</button></div><p class="amp-small">실제 반응 시간은 단축했습니다.<br>답안은 저장되지 않으며 새로고침하면 처음부터 시작합니다.</p></aside>
    <div class="amp-main">${briefingMarkup(scenario)}</div></div>
    <p class="amp-status" role="status" aria-live="polite"></p>`;
  const start=root.querySelector('[data-action="next"]');
  start.addEventListener('click',()=>onStart(start,root.querySelector('#amp-quality').value));
}
