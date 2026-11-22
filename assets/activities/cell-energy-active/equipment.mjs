const labels=['대조군','A','B','C'];
const liquid=['#7799a2','#cf897a','#70aca0','#a091bb'];
const art={
 scope:'<path d="M24 12v10q0 23 16 23t16-23V12M40 46v7q0 16 15 16 16 0 16-17" fill="none" stroke="#466773" stroke-width="5"/><circle cx="71" cy="48" r="8" fill="#bbcfcd" stroke="#496d79" stroke-width="4"/><circle cx="24" cy="12" r="4"/><circle cx="56" cy="12" r="4"/>',
 vial:'<rect x="30" y="9" width="30" height="10" rx="3" fill="#478486"/><path d="M33 20h24v40q-1 13-12 15-11-2-12-15z" fill="#eff7f6" stroke="#688991" stroke-width="2"/><path d="M35 46h20v14q-1 10-10 13-9-3-10-13z" fill="var(--fluid,#81b6ad)"/>',
 pipette:'<g transform="rotate(22 46 40)"><path d="M41 4h12v7H41zM44 11h6v8h-6z" fill="#34747b"/><rect x="35" y="17" width="22" height="36" rx="7" fill="#e7eeed" stroke="#657b83" stroke-width="2"/><rect x="40" y="26" width="12" height="9" rx="2" fill="#375965"/><path d="M39 51h14l-3 14h-8z" fill="#44818b"/><path d="M43 65h6l-3 14z" fill="var(--fluid,#c6d8d7)" stroke="#718a90"/></g>',
 tips:'<path d="m10 43 18-13 52 4-13 15z" fill="#b5d2ce"/><path d="m10 43 57 6v19l-57-6z" fill="#52998e"/><path d="m67 49 13-15v18L67 68z" fill="#3c827a"/>'+[20,32,44,56,66].map((x,i)=>'<path d="m'+x+' '+(24+i*.7)+' 4 16 3-18" fill="#e2efed" stroke="#88aaa7" stroke-width="2"/>').join(''),
 cell:'<path d="M28 17h35v53H28z" fill="#f2f7f7" stroke="#74929a" stroke-width="2"/><path d="m29 16 9-7h34l-9 8z" fill="#dfebea" stroke="#74929a"/><path d="m63 17 9-8v53l-9 8z" fill="#bbd2d1"/><rect x="31" y="43" width="29" height="24" fill="var(--fluid,#e4edeb)"/>',
 rack:'<path d="m6 35 16-12 61 4-14 15z" fill="#d9e5e2"/><path d="m6 35 63 7v20L6 55z" fill="#67918f"/><path d="m69 42 14-15v23L69 62z" fill="#4c7474"/>'+[19,31,43,55].map(x=>'<ellipse cx="'+x+'" cy="35" rx="5" ry="3" fill="#365b64"/>').join(''),
 reader:'<path d="m8 39 16-22h49l10 28-7 19H13z" fill="#9eb7b8"/><path d="m8 39 13-19h52l-7 25z" fill="#e0e9e5"/><path d="M15 44h59v17H15z" fill="#587a80"/><rect x="24" y="48" width="39" height="6" rx="2" fill="#233f47"/><path d="m35 25 22 1-3 8-23-2z" fill="#5f958c"/>'
};
function illustration(name){return '<svg aria-hidden="true" viewBox="0 0 90 82">'+art[name]+'</svg>';}
function item(key,label,icon,type='drop',style=''){
  return '<button type="button" class="eq '+type+'" data-'+type+'="'+key+'" style="'+style+'">'+illustration(icon)+'<span>'+label+'</span></button>';
}
export function examScene(s){
  const i=s.bed,id='ABC'[i],exam=s.examined.includes(i),collected=s.seen.includes(i);
  return '<div class="exam-room"><div class="exam-patient"><img alt="침상에 누운 환자 '+id+'" src="/assets/activities/cell-energy-active/patient-'+i+'.webp"><button type="button" class="chest" data-drop="chest" aria-label="청진 위치">＋</button></div><div class="exam-cart"><h3>침상 '+id+'</h3><p>'+(exam?'호흡음을 확인했습니다.':'청진기를 환자의 가슴 표시로 옮기세요.')+'</p>'+item('scope','청진기','scope','drag')+
  (exam?'<div class="breaths" aria-label="호흡음 확인"><i></i><i></i><i></i></div><div class="exam-tray">'+(collected?'<b>검체 인계 완료</b>':item('vial','검체 '+id,'vial','drag')+item('carrier','운반대','rack'))+'</div>':'')+'</div></div>';
}
export function workstation(s){
  const ready=s.loaded.length===4;
  return '<div class="apparatus"><div class="instrument-bar"><b>미토콘드리아 분석기</b><span>'+s.loaded.length+' / 4 시료</span></div><div class="tabletop"><div class="four">'+labels.map((name,i)=>s.loaded.includes(i)?'<b>'+name+' ✓</b>':item('sample'+i,name,'vial','drag','--fluid:'+liquid[i])).join('')+'</div>'+item('reader','분석기','reader')+'</div><p class="instruction">'+(ready?'네 시료가 준비되었습니다.':'검체를 분석기로 옮기세요. 대조군과 세 환자를 같은 조건에서 측정합니다.')+'</p>'+(ready?'<button type="button" data-act="measure">측정하고 그래프 비교</button>':'')+'</div>';
}
export function transfer(s,from,to){
  if(s.stage===0){
    if(from==='scope'&&to==='chest'){if(!s.examined.includes(s.bed))s.examined.push(s.bed);return '호흡음을 확인했습니다. 검체를 운반대로 옮기세요.';}
    if(from==='vial'&&to==='carrier'&&s.examined.includes(s.bed)){if(!s.seen.includes(s.bed))s.seen.push(s.bed);return '검체를 운반대에 실었습니다.';}
    return '도구를 사용할 위치를 확인하세요.';
  }
  if(to==='reader'&&/^sample[0-3]$/.test(from)){
    const i=Number(from.slice(-1));if(!s.loaded.includes(i))s.loaded.push(i);
    return labels[i]+' 시료를 장착했습니다.';
  }
  return '검체를 분석기로 옮기세요.';
}
// Pointer capture keeps a physical prop under the finger. Tap-pair and keyboard share the same transfer rules.
export function attachHandling(room,apply){
  const container=room.querySelector('.apparatus,.exam-room');if(!container)return;
  let picked=null,drag=null,ghost=null,skipClick=false;
  function select(el){container.querySelector('.held')?.classList.remove('held');picked=el;el?.classList.add('held');}
  const hit=(x,y)=>document.elementFromPoint(x,y)?.closest('[data-drop]');
  function clean(){ghost?.remove();ghost=null;container.querySelector('.aim')?.classList.remove('aim');drag=null;}
  container.onpointerdown=e=>{
    const obj=e.target.closest('[data-drag]');if(!obj||e.button!==0)return;
    drag={obj,id:e.pointerId,x:e.clientX,y:e.clientY};obj.setPointerCapture(e.pointerId);
  };
  container.onpointermove=e=>{
    if(!drag||drag.id!==e.pointerId)return;
    if(!ghost&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<5)return;
    if(!ghost){ghost=drag.obj.querySelector('svg').cloneNode(true);ghost.classList.add('er-prop');ghost.style.setProperty('--fluid',drag.obj.style.getPropertyValue('--fluid'));document.body.append(ghost);}
    ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';container.querySelector('.aim')?.classList.remove('aim');hit(e.clientX,e.clientY)?.classList.add('aim');
  };
  container.onpointerup=e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const obj=drag.obj,target=hit(e.clientX,e.clientY),moved=!!ghost;clean();
    if(moved){skipClick=true;setTimeout(()=>{skipClick=false;},0);if(target&&container.contains(target))apply(obj.dataset.drag,target.dataset.drop);else select(obj);}
  };
  container.onpointercancel=clean;
  container.onclick=e=>{
    if(skipClick)return;
    const obj=e.target.closest('[data-drag]'),dest=e.target.closest('[data-drop]');
    if(obj){select(obj);return;}if(dest&&picked){const source=picked.dataset.drag;select(null);apply(source,dest.dataset.drop);}
  };
}
