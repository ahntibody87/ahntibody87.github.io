import {patients,drugs,metrics,newInvestigation,restoreInvestigation,addTest,submissionErrors} from './model.mjs';
const $=id=>document.getElementById(id);
const root=$('energy-lab');
const key='ahntibody.cell-energy.v1';
let state=newInvestigation(),analysing=false,storageAvailable=true;
try{const saved=localStorage.getItem(key);if(saved)state=restoreInvestigation(JSON.parse(saved))||state;}catch{storageAvailable=false;}
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ordered=()=>state.order.map(id=>drugs.find(d=>d.id===id));
const number=id=>state.order.indexOf(id)+1;
function save(){
  try{localStorage.setItem(key,JSON.stringify(state));}catch{storageAvailable=false;}
  $('ce-storage').hidden=storageAvailable;
  if(!storageAvailable)$('ce-storage').textContent='이 브라우저에서는 자동 저장을 사용할 수 없습니다. 페이지를 닫기 전에 조사 기록을 내려받으세요.';
}
function error(id,message,focus){
  $(id).textContent=message;$(id).hidden=!message;
  if(message){$(id).scrollIntoView({block:'center',behavior:'auto'});if(focus){const target=$(focus);(target.matches('textarea,input')?target:target.querySelector('input'))?.focus({preventScroll:true});}}
}
function render(){
  $('ce-welcome').hidden=state.started;$('ce-investigation').hidden=!state.started;
  $('ce-progress').textContent=state.submittedAt?'최종 판정 완료 · 기록은 이 브라우저에 저장됩니다':state.tests.length+' / 2 검사 완료 · 이 브라우저에 자동 저장';
  $('ce-patients').innerHTML=patients.map(p=>'<article class="ce-panel ce-patient"><h3><span class="ce-badge">'+p.id+'</span>환자 '+p.id+'</h3><p>'+p.quote+'</p></article>').join('');
  $('ce-drugs').innerHTML=ordered().map((d,i)=>'<article class="ce-panel ce-drug"><header><span class="ce-number">약물 '+(i+1)+'</span><h3>'+d.name+'</h3></header><img src="/assets/activities/cell-energy/'+d.image+'" width="1024" height="1024" alt="'+d.alt+'" loading="lazy"><div class="ce-mechanism"><p class="ce-muted">미토콘드리아에 미치는 영향</p><p>'+d.mechanism+'</p></div></article>').join('');
  $('ce-tests').hidden=state.tests.length===2;
  $('ce-test-step').textContent='검사 '+(state.tests.length+1)+' / 2';
  $('ce-test-title').textContent=state.tests.length?'무엇을 더 확인해야 할까요?':'첫 번째 검사를 선택하세요';
  $('ce-test-options').innerHTML=metrics.filter(m=>!state.tests.some(t=>t.metric===m.id)).map(m=>'<label class="ce-option"><input type="radio" name="ce-metric" value="'+m.id+'"><span><strong>'+m.name+'</strong><small>'+m.hint+'</small></span></label>').join('');
  $('ce-results').hidden=!state.tests.length;
  $('ce-result-body').innerHTML=state.tests.map(t=>{const m=metrics.find(m=>m.id===t.metric);return '<tr><th scope="row">'+m.name+'</th>'+m.values.map(v=>'<td>'+v+'</td>').join('')+'</tr>';}).join('');
  $('ce-test-records').innerHTML=state.tests.map((t,i)=>'<div class="ce-record"><h3>'+ (i+1)+'차 · '+metrics.find(m=>m.id===t.metric).name+'</h3><p class="ce-preserve">'+escape(t.reason)+'</p></div>').join('');
  $('ce-verdict').hidden=state.tests.length!==2;
  $('ce-answers').innerHTML=patients.map(p=>'<fieldset '+(state.submittedAt?'disabled':'')+'><legend><span class="ce-badge">'+p.id+'</span>환자 '+p.id+'의 노출 물질</legend><div id="ce-choice-'+p.id+'" class="ce-answer-options">'+ordered().map(d=>'<label class="ce-option"><input type="radio" name="ce-drug-'+p.id+'" value="'+d.id+'" '+(state.answers[p.id].drug===d.id?'checked':'')+'><span>약물 '+number(d.id)+' · '+d.name+'</span></label>').join('')+'</div><label class="ce-label" for="ce-reason-'+p.id+'">검사 결과를 연결한 근거 (필수)</label><textarea id="ce-reason-'+p.id+'" data-patient="'+p.id+'" rows="3" maxlength="1500" placeholder="관찰한 변화가 이 약물의 작용과 어떻게 연결되나요? (1~3문장)">'+escape(state.answers[p.id].reason)+'</textarea></fieldset>').join('');
  $('ce-uncertainty').value=state.uncertainty;$('ce-uncertainty').disabled=!!state.submittedAt;
  $('ce-submit').hidden=!!state.submittedAt;$('ce-submitted').hidden=!state.submittedAt;
  $('ce-verdict-title').textContent=state.submittedAt?'제출한 최종 판정':'최종 판정';
  $('ce-reveal').hidden=!state.submittedAt;
  if(state.submittedAt)$('ce-solutions').innerHTML=patients.map(p=>{const correct=drugs.find(d=>d.id===p.drug);const selected=drugs.find(d=>d.id===state.answers[p.id].drug);return '<article class="ce-panel ce-solution"><p class="ce-kicker">환자 '+p.id+' · 약물 '+number(correct.id)+'</p><h3>'+correct.substance+'</h3><p class="ce-match">'+(selected.id===correct.id?'판정 일치':'자신의 판정과 비교해 보세요')+' · 내 선택: 약물 '+number(selected.id)+' ('+selected.name+')</p><p><strong>'+correct.summary+'</strong></p><p>'+correct.detail+'</p></article>';}).join('');
  $('ce-exit').value=state.exit;
  $('ce-storage').hidden=storageAvailable;
  if(!storageAvailable)$('ce-storage').textContent='이 브라우저에서는 자동 저장을 사용할 수 없습니다. 페이지를 닫기 전에 조사 기록을 내려받으세요.';
}
$('ce-start').addEventListener('click',()=>{state.started=true;save();render();$('ce-progress').scrollIntoView({block:'start'});});
$('ce-test-form').addEventListener('submit',async event=>{
  event.preventDefault();if(analysing)return;
  const metric=root.querySelector('input[name="ce-metric"]:checked')?.value;
  const reason=$('ce-test-reason').value;
  try{addTest(state,metric,reason);}catch(e){error('ce-test-error',e.message,!metric?'ce-test-options':'ce-test-reason');return;}
  analysing=true;error('ce-test-error','');save();
  $('ce-test-controls').disabled=true;$('ce-reset').disabled=true;$('ce-download').disabled=true;
  $('ce-analysis').hidden=false;$('ce-analysis').scrollIntoView({block:'center'});
  await new Promise(resolve=>setTimeout(resolve,2500));
  analysing=false;$('ce-analysis').hidden=true;$('ce-test-controls').disabled=false;$('ce-reset').disabled=false;$('ce-download').disabled=false;
  $('ce-test-reason').value='';render();$('ce-results').scrollIntoView({block:'center'});
});
$('ce-verdict-form').addEventListener('input',event=>{
  if(state.submittedAt)return;
  const el=event.target;
  if(el.name?.startsWith('ce-drug-'))state.answers[el.name.slice(-1)].drug=el.value;
  if(el.dataset.patient)state.answers[el.dataset.patient].reason=el.value;
  if(el.id==='ce-uncertainty')state.uncertainty=el.value;
  error('ce-submit-error','');save();
});
$('ce-verdict-form').addEventListener('submit',event=>{
  event.preventDefault();if(state.submittedAt||analysing)return;
  const errors=submissionErrors(state);
  if(errors.length){error('ce-submit-error',errors.map(e=>e.text).join(' '),errors[0].field);return;}
  state.submittedAt=new Date().toISOString();save();render();$('ce-reveal').scrollIntoView({block:'start'});
});
$('ce-exit').addEventListener('input',event=>{state.exit=event.target.value;save();});
$('ce-reset').addEventListener('click',()=>{
  if(analysing||!confirm('이 브라우저의 현재 조사 기록을 지우고 새로 시작할까요? 필요하면 먼저 조사 기록을 저장하세요.'))return;
  state=newInvestigation();$('ce-test-reason').value='';error('ce-submit-error','');error('ce-test-error','');save();render();$('ce-welcome').scrollIntoView({block:'center'});
});
$('ce-download').addEventListener('click',()=>{
  const lines=['미토콘드리아 응급 분석실','저장 시각: '+new Date().toLocaleString('ko-KR'),'상태: '+(state.submittedAt?'최종 판정 완료':'조사 중'),'','[약물 후보]',...ordered().map(d=>'약물 '+number(d.id)+' · '+d.name+' — '+d.mechanism),'','[검사와 결과]'];
  state.tests.forEach((t,i)=>{const m=metrics.find(m=>m.id===t.metric);lines.push((i+1)+'차 · '+m.name,'선택 이유: '+t.reason,...patients.map((p,j)=>'환자 '+p.id+': '+m.values[j]),'');});
  lines.push('[나의 판정]');
  patients.forEach(p=>{const a=state.answers[p.id],d=drugs.find(d=>d.id===a.drug);lines.push('환자 '+p.id+': '+(d?'약물 '+number(d.id)+' · '+d.name:'미선택'),'근거: '+(a.reason||'미작성'),'');});
  lines.push('아직 확신하기 어려운 점: '+(state.uncertainty||'미작성'),'');
  if(state.submittedAt){lines.push('[물질의 정체]');patients.forEach(p=>{const d=drugs.find(d=>d.id===p.drug);lines.push('환자 '+p.id+': '+d.substance,d.detail,'');});lines.push('[마지막 한 문장]',state.exit||'미작성');}
  const url=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='미토콘드리아-조사기록.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
render();
