import {roomMarkup,mountRoom,initialPoint} from './ward.mjs';
import {examScene,workstation,newKit,transfer,setPiston,attachHandling} from './equipment.mjs';
import {signals,names,mechanisms,ids,colors,value,direction,chart,membrane} from './signals.mjs';
const root=document.querySelector('#er-lab');
const asset='/assets/activities/cell-energy-active/';
const key='atll.cell-energy-active.ward.v1';
const fresh=()=>({stage:0,arrived:false,position:initialPoint(),atBed:false,kit:newKit(),seen:[],examined:[],bed:0,tests:[],metric:'oxygen',loaded:[],patient:0,probe:10,reads:{},choices:{},evidence:{},notes:{},review:0});
let s=fresh(),message='',storageOK=true;
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&[0,1,2,3,4].includes(saved.stage))s={...s,...saved};}catch{}
const save=()=>{try{localStorage.setItem(key,JSON.stringify(s));}catch{storageOK=false;}};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const btn=(label,action,n='',opts='')=>'<button type="button" data-act="'+action+'" data-n="'+n+'" '+opts+'>'+label+'</button>';
const main=(label,action,enabled=true)=>btn(label,action,'','class="primary" '+(enabled?'':'disabled'));
const selected=v=>'aria-pressed="'+Boolean(v)+'"';
const options=(arr,v)=>arr.map(([k,label])=>'<option value="'+esc(k)+'" '+(String(v)===String(k)?'selected':'')+'>'+esc(label)+'</option>').join('');
const area=(title,body)=>'<section class="box"><h3>'+title+'</h3>'+body+'</section>';
const phases=['응급실 인계','검사 준비','결과 판독','최종 판정','내막 모형'];
function ward(){
  if(s.atBed)return '<h2>환자 '+ids[s.bed]+' 진찰</h2>'+examScene(s)+'<p class="feedback" role="status">'+esc(message)+'</p><div>'+btn('응급실로 돌아가기','return')+'</div>';
  return '<h2>응급실</h2>'+(!s.arrived?'<div class="row" data-intro-text><b>구급대 인계 · 환자 3명 이송 중</b><button type="button" data-skip>건너뛰기</button></div>':'')+roomMarkup(s)+'<p>바닥을 눌러 이동하세요. 침상이나 검사대를 누르면 캐릭터가 그곳까지 걸어갑니다. PC에서는 방향키와 Enter도 사용할 수 있습니다.</p><div class="row"><button type="button" data-near></button>'+btn('이송 장면 다시 보기','replay')+'<b>검체 '+s.seen.length+' / 3</b></div><p class="feedback" role="status">'+esc(message)+'</p>';
}
function reference(){
  return '<details><summary>현장 물질과 검사 조건</summary><p>세 환자는 각각 서로 다른 물질에 노출되었습니다. 후보는 전자 전달의 마지막 단계를 막는 시안화 이온, H⁺가 내막을 우회해 이동하게 하는 짝풀림제, ATP 합성 효소의 H⁺ 통로를 막는 올리고마이신입니다.</p><p>기질·산소·ADP·무기 인산이 충분한 교육용 모형입니다. 수치는 상대적 경향을 보여 주는 임의 단위이며, 전기화학적 기울기는 크기로 나타냅니다.</p></details>';
}
function records(){
  if(!s.tests.length)return '';
  return '<details><summary>검사 기록지 · '+s.tests.length+'건</summary>'+s.tests.map(t=>'<p><b>'+signals[t.metric].name+'</b><br>'+ids.map((id,i)=>id+' '+t.reads[i]).join(' · ')+'</p>').join('')+'</details>';
}
function bench(){
  const remaining=Object.entries(signals).filter(([k])=>!s.tests.some(t=>t.metric===k));
  return '<h2>'+ (s.tests.length+1)+'차 검사</h2><div class="tabs">'+remaining.map(([k,m])=>btn(m.name,'metric',k,selected(k===s.metric))).join('')+'</div>'+workstation(s)+'<p class="feedback" role="status">'+esc(message)+'</p>'+records()+reference();

}
function probe(){
  const line=root.querySelector('#er-probe');if(!line)return;
  const x=54+s.probe*42;line.setAttribute('x1',x);line.setAttribute('x2',x);
  const m=signals[s.metric],v=i=>value(m,i,s.probe).toFixed(1);
  root.querySelector('#er-values').textContent='시점 '+s.probe+'  ·  대조군 '+v(0)+'  ·  환자 '+ids[s.patient]+' '+v(s.patient+1);
}
function reading(){
  const m=signals[s.metric],i=s.patient;
  return '<h2>'+m.name+' 판독</h2><p>'+m.note+'</p><div class="tabs">'+ids.map((id,j)=>btn('환자 '+id+(s.reads[j]?' ✓':''),'patient',j,selected(i===j))).join('')+'</div>'+
    '<div class="box"><div class="row"><b style="color:'+colors[0]+'">━ 정상 대조군</b><b style="color:'+colors[i+1]+'">━ 환자 '+ids[i]+'</b></div>'+chart(s.metric,i)+'<label>측정 시점 <input id="er-slider" type="range" min="0" max="10" value="'+s.probe+'"></label><output id="er-values"></output></div>'+
    area('환자 '+ids[i]+'의 '+m.name+'는 정상 대조군에 비해?', '<div class="tabs">'+['증가','감소','같음'].map(v=>btn(v,'interpret',v,selected(s.reads[i]===v))).join('')+'</div><p class="feedback" role="status">'+esc(message)+'</p>')+
    '<div>'+main(s.tests.length?'판정으로 이동':'기록하고 두 번째 검사 선택','record',Object.keys(s.reads).length===3)+'</div>'+records();
}
function comparison(i){
  return '<details><summary>환자 '+ids[i]+'의 두 그래프 비교</summary><p class="sub">회색은 정상 대조군, 색 곡선은 환자입니다.</p><div class="compare">'+s.tests.map(t=>'<div><b>'+signals[t.metric].name+'</b>'+chart(t.metric,i).replace(/<line id="er-probe"[^>]*\/>/,'')+'</div>').join('')+'</div></details>';
}
function verdict(){
  return '<h2>노출 물질 판정</h2><p>두 검사에서 얻은 근거로 각 환자의 노출 물질을 판정하세요. 근거가 부족하면 판정을 보류하고 이유를 기록할 수 있습니다.</p>'+records()+reference()+
    ids.map((id,i)=>area('환자 '+id,comparison(i)+'<label>추정 물질<select data-field="choices" data-i="'+i+'">'+options([['','선택하세요'],...names.map((n,j)=>[j,n]),['hold','판정 보류']],s.choices[i])+'</select></label><label>검사 근거<select data-field="evidence" data-i="'+i+'">'+options([['','검사 결과 선택'],...s.tests.map(t=>[t.metric,signals[t.metric].name+' '+t.reads[i]])],s.evidence[i])+'</select></label><label>판정 이유<textarea data-field="notes" data-i="'+i+'" maxlength="600">'+esc(s.notes[i])+'</textarea></label>')).join('')+
    '<p class="feedback" role="status">'+esc(message)+'</p><div>'+main('판정 제출','submit')+'</div>';
}
function review(){
  const i=s.review,c=s.choices[i],t=s.tests.find(t=>t.metric===s.evidence[i]);
  return '<h2>미토콘드리아 내막 비교</h2><div class="tabs">'+ids.map((id,j)=>btn('환자 '+id,'review',j,selected(i===j))).join('')+'</div>'+
    area('환자 '+ids[i]+' · '+names[i],'<p>나의 판정 · '+(c==='hold'?'판정 보류':names[Number(c)])+'</p><p class="record">'+esc(signals[t.metric].name+' '+t.reads[i])+'<br>'+esc(s.notes[i])+'</p><p>'+mechanisms[i]+'</p>')+
    '<div class="box"><h3>정상 대조군</h3>'+membrane(-1)+'<h3>환자 '+ids[i]+'</h3>'+membrane(i)+'<p class="sub">점은 H⁺의 상대적 분포를, 움직이는 표지는 이동 경로를 나타냅니다. 입자 수와 속도는 정성 모형입니다.</p><div>'+btn('모션 재생 / 정지','motion')+'</div></div>'+records()+'<div>'+btn('응급실에서 다시 시작','restart')+'</div>';
}
function render(){
  root.innerHTML='<div class="bar"><b>'+phases[s.stage]+'</b><span>'+ (storageOK?'이 기기에 자동 저장':'이 기기의 저장 공간을 사용할 수 없습니다')+'</span></div><div class="room">'+[ward,bench,reading,verdict,review][s.stage]()+'</div>';
  if(s.stage===0&&!s.atBed)mountRoom(root,s,z=>{
    if(z===3){if(s.seen.length===3)stage(1);else message='세 환자의 검체를 먼저 운반대에 실으세요.';}
    else{s.bed=z;s.atBed=true;message='';}
    save();render();
  },save,p=>{s.position={...p};save();});
  attachHandling(root,(from,to)=>{message=transfer(s,from,to);save();render();});
  probe();if(matchMedia('(prefers-reduced-motion: reduce)').matches)root.querySelectorAll('.model').forEach(el=>{el.setCurrentTime(0.55);el.pauseAnimations();});
}
function stage(n){s.stage=n;message='';}
root.addEventListener('input',e=>{
  if(e.target.matches('[data-piston]')){e.target.closest('label').querySelector('output').textContent=e.target.value+' µL';}

  if(e.target.id==='er-slider'){s.probe=Number(e.target.value);probe();save();}
  if(e.target.dataset.field){s[e.target.dataset.field][e.target.dataset.i]=e.target.value;save();}
});
root.addEventListener('change',e=>{
  if(!e.target.matches('[data-piston]'))return;
  const complete=setPiston(s,Number(e.target.value));save();
  if(complete){message=s.kit.source===null?'분주 완료 · 새 팁으로 교체하세요.':'50 µL 흡입 완료';render();}
  else{const msg=root.querySelector('.feedback');if(msg)msg.textContent=s.kit.source===null?'동일한 시료량 50 µL에 맞추세요.':'피스톤을 0 µL까지 미세요.';}
});
root.addEventListener('click',e=>{
  const graph=e.target.closest('.graph');
  if(graph&&s.stage===2){
    const point=new DOMPoint(e.clientX,e.clientY).matrixTransform(graph.getScreenCTM().inverse());
    s.probe=Math.max(0,Math.min(10,Math.round((point.x-54)/42)));
    root.querySelector('#er-slider').value=s.probe;probe();save();return;
  }
  const b=e.target.closest('button[data-act]');if(!b)return;
  const before=s.stage,n=b.dataset.n,i=Number(n);
  switch(b.dataset.act){
    case 'return':s.atBed=false;message='';break;
    case 'replay':s.arrived=false;s.atBed=false;message='';break;
    case 'metric':s.metric=n;message='';break;
    case 'patient':s.patient=i;message='';break;
    case 'interpret':
      if(direction(s.metric,s.patient)===n){s.reads[s.patient]=n;message='환자 '+ids[s.patient]+'의 판독을 기록했습니다.';}
      else{delete s.reads[s.patient];message=signals[s.metric].note+' 두 곡선을 다시 확인하세요.';}break;
    case 'record':
      if(Object.keys(s.reads).length!==3)return;
      s.tests.push({metric:s.metric,reads:{...s.reads}});s.reads={};s.loaded=[];s.kit=newKit();
      if(s.tests.length===2)stage(3);
      else{s.metric=Object.keys(signals).find(k=>k!==s.tests[0].metric);stage(1);}break;
    case 'submit':
      if(ids.some((_,j)=>!s.choices[j]||!s.evidence[j]||!s.notes[j]?.trim()))message='각 환자의 추정 물질, 검사 근거, 판정 이유를 모두 기록하세요.';
      else stage(4);break;
    case 'review':s.review=i;break;
    case 'motion':root.querySelectorAll('.model').forEach(el=>el.animationsPaused()?el.unpauseAnimations():el.pauseAnimations());return;
    case 'restart':if(!confirm('이번 검사 기록을 지우고 다시 시작할까요?'))return;s=fresh();break;
  }
  save();render();if(before!==s.stage){root.scrollIntoView({block:'start'});const h=root.querySelector('h2');h.tabIndex=-1;h.focus({preventScroll:true});}
  else{const next=[...root.querySelectorAll('button')].find(el=>el.dataset.act===b.dataset.act&&el.dataset.n===n&&!el.disabled);next?.focus({preventScroll:true});}
});
render();
