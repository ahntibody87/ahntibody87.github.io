const beds=[170,355,540], floor={left:42,right:768,top:217,bottom:316};
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
export const initialPoint=()=>({x:84,y:273});
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
function staff(colour='#327f83',hair='#394452'){
  return '<ellipse cy="1" rx="13" ry="5" fill="#334951" opacity=".2"/><g class="walker"><path d="M-6 -9v9m12 -9v9" stroke="#334657" stroke-width="7" stroke-linecap="round"/><path d="M-12 -29q12 -8 24 0l2 19q-13 6 -28 0z" fill="'+colour+'"/><path d="M-10 -27l-5 13m26 -13 5 13" stroke="'+colour+'" stroke-width="6" stroke-linecap="round"/><path d="m-5 -29 5 5 5 -5" fill="none" stroke="#e2efeb" stroke-width="2"/><rect x="5" y="-23" width="5" height="6" rx="1" fill="#eef4ed"/><circle cy="-39" r="11" fill="#e8ba98"/><path d="M-11 -39q-3 -18 14 -13 9 1 8 14l-5 -6q-7 5 -17 5" fill="'+hair+'"/></g>';
}
function stretcher(i){
  const hair=['#343c43','#554239','#8c8b85'][i];
  return '<ellipse cy="-2" rx="43" ry="10" fill="#506a71" opacity=".18"/><g stroke="#415969" stroke-width="6"><path d="M-28 -9v9m56 -9v9"/></g><rect x="-39" y="-90" width="78" height="84" rx="10" fill="#829fa6"/><rect x="-35" y="-93" width="70" height="80" rx="9" fill="#e3ece8"/><rect x="-26" y="-89" width="52" height="23" rx="7" fill="#fafaf0"/><circle cy="-75" r="12" fill="#e3b495"/><path d="M-12 -73q-4 -21 15 -16 11 3 9 18l-5 -9q-9 5 -19 7" fill="'+hair+'"/><path d="M-22 -58q21 -11 44 0l7 37h-58z" fill="#a2c6cf"/><path d="M-31 -48q29 -4 61 0v27h-61z" fill="#7fb0ad"/><path d="M-34 -59v36m68 -36v36" stroke="#f3faf7" stroke-width="4" stroke-linecap="round"/>';
}
function bay(x,i){
  return '<g transform="translate('+x+' 0)"><rect x="-79" y="56" width="158" height="145" rx="5" fill="#e0ebe8" stroke="#b5cccb"/><path d="M-80 58v126m160 -126v126" stroke="#9bbdbb" stroke-width="4"/><path d="M-76 58v78q4 8 9 0V60m5 1v66" fill="#abd1c8" stroke="#8eb9af" stroke-width="3"/><rect x="35" y="75" width="35" height="24" rx="3" fill="#48616c"/><path d="M38 89h6l3 -6 3 10 3 -5h13" fill="none" stroke="#a2dec6" stroke-width="2"/><path d="M53 101v17m-8 0h16" stroke="#81989b" stroke-width="3"/><text x="0" y="80" text-anchor="middle">침상 '+('ABC'[i])+'</text></g>';
}
function label(x,y,txt){return '<text x="'+x+'" y="'+y+'" text-anchor="middle">'+txt+'</text>';}
export function roomMarkup(s){
  return '<div class="er-world-scroll"><svg class="er-world" viewBox="0 0 820 360" tabindex="0" role="group" aria-label="응급실. 바닥을 누르거나 방향키로 이동하고 가까운 곳에서 Enter를 누르세요."><defs><pattern id="floor-tile" width="42" height="34" patternUnits="userSpaceOnUse"><rect width="42" height="34" fill="#edf2ef"/><path d="M0 34V0h42" fill="none" stroke="#d5e0dc"/></pattern></defs><rect width="820" height="360" fill="url(#floor-tile)"/><path d="M0 0h820v49H0z" fill="#c9ddda"/><path d="M0 45h820" stroke="#97b3b2" stroke-width="7"/><rect x="20" y="9" width="120" height="28" rx="4" fill="#365b63"/><path d="M34 15v16m-8 -8h16" stroke="#edf9f3" stroke-width="4"/><text x="50" y="29" style="fill:white">응급실</text>'+beds.map(bay).join('')+
  '<g transform="translate(723 156)">'+staff('#597a90')+'</g><path d="M653 151h143v42H653z" fill="#87aaa9"/><path d="M645 145h157v12H645z" fill="#dce9e5"/><rect x="664" y="110" width="33" height="25" rx="3" fill="#3b5967"/><path d="M680 135v10" stroke="#546e78" stroke-width="4"/>'+label(722,182,'검사대')+
  '<path d="M0 224h42v82H0" fill="#c6dedb"/><path d="M14 231v65m14 -65v65" stroke="#8aa9ad" stroke-width="3"/>'+label(65,345,'이송 입구')+'<path d="M118 337H774" stroke="#9dbdb6" stroke-width="3" stroke-dasharray="12 8"/>'+
  beds.map((x,i)=>'<g data-zone="'+i+'" role="button" tabindex="0" aria-label="침상 '+('ABC'[i])+'로 이동"><rect x="'+(x-75)+'" y="58" width="150" height="150" fill="transparent"/><g data-gurney="'+i+'" transform="translate('+x+' 198)"><g>'+stretcher(i)+'<g class="porter" transform="translate(-49 5)">'+staff('#547fa1')+'</g></g></g></g>').join('')+
  '<g data-zone="3" role="button" tabindex="0" aria-label="검사대로 이동"><rect x="636" y="63" width="175" height="141" fill="transparent"/></g><g id="er-avatar" pointer-events="none"><ellipse cy="2" rx="18" ry="7" fill="none" stroke="#21675c" stroke-width="2"/>'+staff()+'</g></svg></div>';
}
export function mountRoom(root,s,open,finishIntro,remember){
  const svg=root.querySelector('.er-world');if(!svg)return;
  const avatar=svg.querySelector('#er-avatar'), prompt=root.querySelector('[data-near]'),stop=root.querySelector('[data-skip]');
  const p=s.position||initialPoint(),target=[...beds,722],g=[...svg.querySelectorAll('[data-gurney]')];
  let frame=0,goal=null,walking=false,intro=!s.arrived,prev=0,started=0,keys=new Set();
  const nearest=()=>target.findIndex(x=>Math.hypot(x-p.x,222-p.y)<59);
  function draw(){
    avatar.setAttribute('transform','translate('+p.x+' '+p.y+')');
    avatar.classList.toggle('moving',walking);
    const n=nearest();prompt.disabled=intro||n<0;prompt.textContent=n<0?'침상 또는 검사대에 접근하세요':n===3?'검사대 사용':'환자 '+('ABC'[n])+' 진찰';
  }
  function finish(){intro=false;s.arrived=true;stop?.remove();root.querySelector('[data-intro-text]')?.remove();g.forEach((el,i)=>{el.setAttribute('transform','translate('+beds[i]+' 198)');el.querySelector('.porter').style.display='none';});draw();finishIntro();}
  function tick(now){
    if(!svg.isConnected)return;
    const dt=Math.min((now-prev)/1000,.05);prev=now;
    if(intro){
      if(!started)started=now;
      g.forEach((el,i)=>{
        const f=clamp(((now-started)/1000-i*1.6)/3.2,0,1),u=Math.min(1,f/.73),v=Math.max(0,(f-.73)/.27);
        el.setAttribute('transform','translate('+(-85+(beds[i]+85)*u)+' '+(283-85*v)+')');el.querySelector('.porter').style.opacity=String(1-v);
      });
      if(now-started>6550)finish();
    }else{
      let dx=Number(keys.has('ArrowRight'))-Number(keys.has('ArrowLeft')),dy=Number(keys.has('ArrowDown'))-Number(keys.has('ArrowUp'));
      if(dx||dy)goal=null;
      else if(goal){dx=goal.x-p.x;dy=goal.y-p.y;}
      const d=Math.hypot(dx,dy),step=200*dt;
      walking=!!d;
      if(goal&&d<=step){const z=goal.zone;p.x=goal.x;p.y=goal.y;goal=null;walking=false;remember(p);if(z!==undefined){draw();open(z);return;}}
      else if(d){p.x=clamp(p.x+step*dx/d,floor.left,floor.right);p.y=clamp(p.y+step*dy/d,floor.top,floor.bottom);}
      draw();
    }
    if(intro||goal||keys.size)frame=requestAnimationFrame(tick);else frame=0;
  }
  function start(){if(!frame){prev=performance.now();frame=requestAnimationFrame(tick);}}
  function go(zone){goal={x:target[zone],y:222,zone};start();}
  function act(){const z=nearest();if(!intro&&z>=0){remember(p);open(z);}}
  prompt.onclick=act;
  svg.onclick=e=>{
    if(intro)return;svg.focus({preventScroll:true});
    const zone=e.target.closest('[data-zone]');if(zone){go(Number(zone.dataset.zone));return;}
    const pt=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    goal={x:clamp(pt.x,floor.left,floor.right),y:clamp(pt.y,floor.top,floor.bottom)};start();
  };
  svg.onkeydown=e=>{if(intro)return;if(e.key.startsWith('Arrow')){e.preventDefault();keys.add(e.key);start();}else if(e.key==='Enter'||e.key===' '){e.preventDefault();const z=e.target.closest('[data-zone]');if(z)go(Number(z.dataset.zone));else act();}};
  svg.onkeyup=e=>{keys.delete(e.key);remember(p);};svg.onblur=()=>{keys.clear();};
  if(stop)stop.onclick=finish;
  if(!intro||reduced())finish();else{draw();start();}
}
