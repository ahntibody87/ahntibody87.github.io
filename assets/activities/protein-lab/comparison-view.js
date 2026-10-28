import {residueRows,transformPdb,atomResidueKey} from './core.js?v=5';
import {createResidueInspector} from './residue-inspector.js?v=7';

// Both panels use the same transformed coordinates and camera. View modes never refit data.
export function createComparisonView(root){
  const $=id=>root.querySelector('#pl-'+id);
  let viewers=[],inspector=null,data=null,mode='overlay',flip=0,active=null,pinnedPosition=null,lockedMax=null,lastSize='';
  const colors=['#477ba9','#ca791e'];
  const visible=(panel,model)=>mode==='side'?panel===model:panel===0&&(mode==='flip'?model===flip:$(model?'show-b':'show-a').checked);
  const render=()=>viewers.forEach((v,i)=>{if(i===0||mode==='side')v.render();});
  const facade={
    addStyle(sel,style){viewers.forEach((v,i)=>{if(visible(i,sel.model))v.addStyle(sel,style);});},
    setHoverable(sel,enabled,enter,leave){viewers.forEach((v,i)=>v.setHoverable(sel,enabled,(...args)=>{if(visible(i,sel.model))enter(...args);},leave));},
    setClickable(sel,enabled,click){viewers.forEach((v,i)=>v.setClickable(sel,enabled,(...args)=>{if(visible(i,sel.model))click(...args);}));},
    setHoverDuration(ms){viewers.forEach(v=>v.setHoverDuration(ms));},render
  };
  function style(){
    if(!data)return;
    viewers.forEach((v,panel)=>{
      [0,1].forEach(model=>{
        const show=visible(panel,model);
        v.setStyle({model},show?{cartoon:{color:colors[model],thickness:model?.22:.16}}:{});
        if(show)v.setStyle({model,ss:['h','s']},{cartoon:{color:colors[model],thickness:model?.22:.16,width:model?.9:.75}});
      });
    });
  }
  function resize(){
    const rect=$('compare-viewer').getBoundingClientRect();if(!rect.width||!rect.height)return;
    const size=`${Math.round(rect.width)}:${Math.round(rect.height)}`,changed=lastSize!==size;lastSize=size;
    viewers.forEach((v,i)=>{if(i===0||mode==='side')v.resize();});
    if(changed&&data)fit();else render();
  }
  function applyMode(){
    const view=viewers[0]?.getView();
    $('compare-scene').classList.toggle('pl-side-by-side',mode==='side');
    $('compare-second-stage').hidden=mode!=='side';
    $('overlay-tools').hidden=mode!=='overlay';$('flip-tools').hidden=mode!=='flip';
    $('compare-panel-label').textContent=mode==='side'?'A · 기준 구조':mode==='flip'?(flip?'B · 비교 구조':'A · 기준 구조'):'A + B · 겹쳐 보기';
    root.querySelectorAll('[data-compare-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.compareMode===mode)));
    $('flip-a').setAttribute('aria-pressed',String(flip===0));$('flip-b').setAttribute('aria-pressed',String(flip===1));
    $('mode-help').textContent=mode==='side'?'두 화면이 같은 방향과 확대율로 함께 움직입니다.':mode==='flip'?'A와 B 버튼으로 전환하세요. 방향과 확대율은 그대로 유지됩니다.':'파랑은 기준 A, 주황은 비교 B입니다. 드래그하여 회전하고 휠로 확대하세요.';
    if(view){resize();inspector?.paint();render();}
  }
  root.querySelectorAll('[data-compare-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.compareMode;applyMode();}));
  ['a','b'].forEach((key,i)=>{
    $('flip-'+key).addEventListener('click',()=>{flip=i;applyMode();});
    $('show-'+key).addEventListener('change',()=>inspector?.paint());
  });
  function fit(selection={}){
    if(!data)return;
    viewers[0].zoomTo(selection);const view=viewers[0].getView();viewers.forEach(v=>v.setView(view,true));render();
  }
  $('compare-fit').addEventListener('click',()=>fit());
  $('focus-position').addEventListener('click',()=>{
    if(!active||!data)return;
    const n=active.row.position,rows=data.rows;
    // Include neighbouring residues and both structures to retain local context.
    const selections=rows.map((group,model)=>{const keys=new Set(group.filter(r=>Math.abs(r.position-n)<=2).map(r=>r.key));return {model,predicate:a=>keys.has(atomResidueKey(a))};});
    fit({or:selections});
  });
  function choosePosition(n){inspector?.selectPosition(n);}
  $('next-mutation').addEventListener('click',()=>{
    const changes=data?.comparison.changes??[];if(!changes.length)return;
    choosePosition(changes.find(n=>n>(pinnedPosition??0))??changes[0]);
  });
  $('largest-difference').addEventListener('click',()=>{
    if(!data)return;const ds=data.comparison.distances;choosePosition(ds.indexOf(Math.max(...ds))+1);
  });
  function paintSelection(target){
    active=target;
    const pinned=$('compare-inspector').querySelector('.pinned');pinnedPosition=pinned?Number(pinned.dataset.position):null;
    $('focus-position').disabled=!target;
    $('distance-chart').querySelectorAll('button').forEach(b=>b.classList.toggle('inspected',Number(b.dataset.position)===target?.row.position));
    $('distance-readout').textContent=target?`위치 ${target.row.position} · ${data.comparison.a[target.row.position-1].one} → ${data.comparison.b[target.row.position-1].one} · ${data.comparison.distances[target.row.position-1].toFixed(2)} Å`:'막대를 선택하면 서열과 3D의 같은 위치를 함께 강조합니다.';
  }
  function chart(){
    if(!data)return;
    const c=data.comparison,maximum=Math.max(...c.distances);
    const automatic=maximum<=1?1:Math.ceil(maximum/4)*4;
    if($('lock-scale').checked&&lockedMax===null)lockedMax=automatic;
    const top=$('lock-scale').checked?lockedMax:automatic;
    $('distance-panel').style.setProperty('--chart-width',`${Math.max(280,c.distances.length*7)}px`);
    $('distance-panel').style.setProperty('--chart-count',c.distances.length);
    $('distance-chart').replaceChildren();$('distance-y').replaceChildren();$('distance-x').replaceChildren();
    [1,.75,.5,.25,0].forEach(f=>{const label=document.createElement('span');label.textContent=Number((top*f).toFixed(2));$('distance-y').append(label);});
    c.distances.forEach((d,i)=>{
      const cell=document.createElement('div');cell.className='pl-distance-column';
      const b=document.createElement('button');b.type='button';b.dataset.position=i+1;b.className='pl-distance-bar';
      b.style.setProperty('--bar-height',`${Math.min(d/top,1)*100}%`);
      b.classList.toggle('pl-clipped',d>top);b.title=`${i+1}번 · ${c.a[i].one} → ${c.b[i].one} · ${d.toFixed(2)} Å${d>top?' · 눈금 상한 초과':''}`;b.setAttribute('aria-label',b.title);
      b.addEventListener('click',()=>choosePosition(i+1));
      if(c.changes.includes(i+1)){cell.classList.add('pl-has-mutation');b.setAttribute('aria-label',b.title+' · 치환 위치');}
      cell.append(b);$('distance-chart').append(cell);
    });
    const labels=new Set([1,...Array.from({length:Math.floor(c.distances.length/10)},(_,i)=>(i+1)*10),c.distances.length]);
    for(const n of labels){if(n!==1&&n!==c.distances.length&&c.distances.length-n<4)continue;const label=document.createElement('span');label.textContent=n;label.style.left=`${(n-.5)/c.distances.length*100}%`;$('distance-x').append(label);}
    $('scale-note').textContent=maximum>top?`▲ ${top} Å보다 큰 막대는 위쪽에 표시됩니다. 정확한 값은 위치를 선택해 확인하세요.`:$('lock-scale').checked?`눈금 상한 ${top} Å 고정 · 다음 비교에도 같은 눈금을 사용합니다.`:'이 결과에 맞춘 눈금입니다. 실험끼리 비교하려면 눈금을 고정하세요.';
    paintSelection(active);
  }
  $('lock-scale').addEventListener('change',()=>{lockedMax=null;chart();});
  function clear(){
    inspector?.dispose();inspector=null;data=null;active=null;pinnedPosition=null;
    viewers.forEach(v=>{v.removeAllModels();v.removeAllLabels();});render();
    $('comparison-tools').disabled=true;$('compare-empty').hidden=false;$('compare-summary').textContent='두 구조를 불러온 뒤 비교를 시작하세요.';
    $('selection-info').replaceChildren();$('focus-position').disabled=true;$('next-mutation').disabled=true;$('largest-difference').disabled=true;
    $('distance-readout').textContent='';$('distance-chart').replaceChildren();
  }
  function load(comparison,slots,ca,cb){
    clear();
    const rows=[residueRows(slots.a.parsed,slots.a).filter(r=>r.chain===ca),residueRows(slots.b.parsed,slots.b).filter(r=>r.chain===cb)];
    data={comparison,rows};
    if(!viewers.length){
      $('compare-second-stage').hidden=false;$('compare-scene').classList.add('pl-side-by-side');
      viewers=['compare-viewer','compare-viewer-b'].map(id=>{const v=$3Dmol.createViewer($(id),{backgroundColor:'#fafcfe',antialias:true});v.setProjection('orthographic');return v;});
      viewers[0].linkViewer(viewers[1]);viewers[1].linkViewer(viewers[0]);
    }
    const pdbs=[transformPdb(slots.a.pdb,p=>p,ca),transformPdb(slots.b.pdb,comparison.transform,cb)];
    viewers.forEach(v=>pdbs.forEach(p=>v.addModel(p,'pdb')));
    $('comparison-tools').disabled=false;$('compare-empty').hidden=true;$('next-mutation').disabled=!comparison.changes.length;$('largest-difference').disabled=false;
    $('compare-summary').textContent=`${comparison.a.length}개 위치를 같은 순서로 비교 · ${comparison.changes.length}개 위치에서 아미노산이 다릅니다.`;
    applyMode();style();fit();
    inspector=createResidueInspector({viewer:facade,container:$('compare-inspector'),infoContainer:$('selection-info'),groups:rows.map((r,i)=>({model:i,label:i?'비교 B':'기준 A',rows:r,visible:()=>viewers.some((_,p)=>visible(p,i))})),restore:style,distance:i=>comparison.distances[i],onActive:paintSelection});
    chart();
  }
  return {load,clear,resize};
}
