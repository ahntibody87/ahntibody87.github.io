import {AMINO_ACIDS} from './amino-acids.js';
import {atomResidueKey} from './core.js?v=5';

const amino=Object.fromEntries(AMINO_ACIDS.map(a=>[a.code,a]));
const describe=r=>`${amino[r.one]?.name??r.res} · ${amino[r.one]?.three??r.res} / ${r.one} · 서열 위치 ${r.position} · 사슬 ${r.chain.trim()||'(이름 없음)'} · PDB ${r.resid}${r.plddt===null?' · pLDDT 정보 없음':` · pLDDT ${r.plddt.toFixed(1)}`}`;

// One controller owns transient hover and persistent click/touch selection.
// Information stays outside the canvas, so no overlay intercepts viewer gestures.
export function createResidueInspector({viewer,container,groups,restore,distance,onActive=()=>{},onClear=()=>{}}){
  let pinned=null,hovered=null,active=null,disposed=false;
  const buttons=[],lookup=new Map();
  const tools=document.createElement('div');tools.className='pl-inspect-tools';
  const info=document.createElement('p');info.className='pl-residue-info';info.setAttribute('role','status');
  const clear=document.createElement('button');clear.type='button';clear.textContent='선택 해제';
  tools.append(info,clear);container.replaceChildren(tools);
  const help=document.createElement('p');help.className='pl-help';help.textContent='구조·서열에 마우스를 올려 관찰 · 클릭/터치로 선택 유지 · 다시 누르거나 선택 해제 · Esc로 해제';container.append(help);
  for(const [g,group] of groups.entries()){
    lookup.set(group.model,new Map(group.rows.map(r=>[r.key,r])));
    const section=document.createElement('div'),label=document.createElement('strong'),strip=document.createElement('div');
    section.className='pl-inspect-sequence';label.textContent=group.label;strip.className='pl-sequence-strip';strip.setAttribute('aria-label',group.label+' 서열');
    group.rows.forEach(r=>{
      const b=document.createElement('button');b.className='pl-residue';b.type='button';b.textContent=r.one;b.dataset.position=r.position;b.dataset.chain=r.chain;
      b.title=describe(r);b.setAttribute('aria-label',group.label+' · '+b.title);b.setAttribute('aria-pressed','false');
      if((r.position-1)%10===0){const n=document.createElement('span');n.className='pl-pos';n.textContent=r.position;b.append(n);}
      const target={g,row:r};
      b.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')hover(target);});b.addEventListener('pointerleave',()=>hover(null));
      b.addEventListener('focus',()=>hover(target));b.addEventListener('blur',()=>hover(null));b.addEventListener('click',()=>select(target));
      buttons.push({b,target});strip.append(b);
    });
    section.append(label,strip);container.append(section);
  }
  function same(a,b){return !!a&&!!b&&a.g===b.g&&a.row.key===b.row.key;}
  function corresponding(target){
    if(!target)return [];
    return distance?groups.flatMap((group,g)=>{const row=group.rows[target.row.position-1];return row?[{g,row}]:[];}):[target];
  }
  function paint(){
    if(disposed)return;
    active=hovered??pinned;restore();
    const targets=corresponding(active);
    for(const {g,row} of targets){
      const group=groups[g];if(group.visible&&!group.visible())continue;
      const select={model:group.model,predicate:a=>atomResidueKey(a)===row.key};
      viewer.addStyle(select,{cartoon:{color:'#ffe66b'},stick:{radius:.22,color:'#ffe66b'}});
      viewer.addStyle({...select,atom:'CA'},{sphere:{radius:.85,color:g===1?'#f4a45c':'#fff18b'}});
    }
    for(const {b,target} of buttons){
      b.classList.toggle('inspected',targets.some(t=>same(t,target)));
      b.classList.toggle('pinned',corresponding(pinned).some(t=>same(t,target)));
      b.setAttribute('aria-pressed',String(corresponding(pinned).some(t=>same(t,target))));
    }
    info.textContent=active?`${same(active,pinned)?'선택 유지 · ':''}${distance?`가리킨 구조 ${groups[active.g].label} ｜ `:''}`+targets.map(t=>`${groups[t.g].label}: ${describe(t.row)}`).join(' ｜ ')+(distance?` ｜ 대응 Cα 거리 ${distance(active.row.position-1).toFixed(3)} Å · RMSD 겹침 기준`:''):'구조 또는 서열에서 아미노산을 가리켜 보세요.';
    clear.disabled=!pinned&&!hovered;onActive(active);viewer.render();
  }
  function hover(target){hovered=target;paint();}
  function select(target){pinned=same(pinned,target)?null:target;hovered=null;paint();}
  function reset(){pinned=null;hovered=null;onClear();paint();}
  clear.addEventListener('click',reset);
  const escape=e=>{if(e.key==='Escape')reset();};container.closest('.pl-panel').addEventListener('keydown',escape);
  for(const [g,group] of groups.entries()){
    const targetFor=atom=>{const row=lookup.get(group.model).get(atomResidueKey(atom));return row?{g,row}:null;};
    viewer.setHoverable({model:group.model},true,atom=>{const t=targetFor(atom);if(t&&(!group.visible||group.visible()))hover(t);},()=>hover(null));
    viewer.setClickable({model:group.model},true,atom=>{const t=targetFor(atom);if(t&&(!group.visible||group.visible()))select(t);});
  }
  viewer.setHoverDuration(100);paint();
  return {paint,reset,hoverRow:key=>hover(key?{g:0,row:groups[0].rows.find(r=>r.key===key)}:null),selectRow:key=>{const row=groups[0].rows.find(r=>r.key===key);if(row)select({g:0,row});},selectPosition:(position,g=0)=>select({g,row:groups[g].rows[position-1]}),dispose(){disposed=true;container.closest('.pl-panel').removeEventListener('keydown',escape);container.replaceChildren();}};
}
