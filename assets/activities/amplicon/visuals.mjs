export const stations=[
  {id:'ice',label:'아이스박스',x:1.5,y:2,color:'#74bad6'},
  {id:'bench',label:'작업대',x:4.5,y:1.2,color:'#a6b3cc'},
  {id:'vortex',label:'볼텍스 믹서',x:7.2,y:1,color:'#90b9aa'},
  {id:'spin',label:'미니 원심분리기',x:9,y:4.5,color:'#bdabd4'},
  {id:'pcr',label:'PCR 기기',x:7.5,y:7.5,color:'#829cf0'},
  {id:'gel',label:'전기영동 장치',x:4,y:8.3,color:'#78c2c2'},
  {id:'uv',label:'UV 관찰기',x:1.2,y:6,color:'#b99fe0'}
];
export const project=(x,y)=>({x:480+(x-y)*38,y:85+(x+y)*21});
export const unproject=(x,y)=>({x:((x-480)/38+(y-85)/21)/2,y:((y-85)/21-(x-480)/38)/2});
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function device(id) {
  if(id==='ice')return '<path d="M-40-37 5-57 45-35 0-14Z" fill="#d9f1fa"/><path d="M-40-37 0-14 0 16-40-7Z" fill="#61a8c6"/><path d="M0-14 45-35 45-5 0 16Z" fill="#3d779e"/><path d="M-31-43 8-60 40-42" fill="none" stroke="white" stroke-width="7"/><text x="0" y="-22" fill="#27617d" font-size="19">❄</text>';
  if(id==='bench')return '<path d="M-60-27 0-55 64-23 0 8Z" fill="#f0e6d7"/><path d="M-60-27 0 8 64-23 64-14 0 18-60-18Z" fill="#b9aa98"/><path d="M-48-14V24M49-9V26M0 14V49" stroke="#78879b" stroke-width="7"/><path d="M-25-27 3-40 22-29-6-15Z" fill="#5e80ba"/><path d="M-16-33v-14m10 20v-14m10 8v-14" stroke="#e4fbff" stroke-width="6"/><path d="M29-28 40-33 48-25 38-19Z" fill="#8ab4cb"/><path d="m-39-20 9 5" stroke="#315efb" stroke-width="7"/><ellipse cx="40" cy="7" rx="10" ry="5" fill="#6a768c"/><path d="M30 7 33 28 47 28 50 7" fill="#8e9aac"/>';
  if(id==='vortex')return '<path d="M-31-10 0-26 34-9 0 10Z" fill="#d9eee3"/><path d="M-31-10 0 10 34-9 34 7 0 26-31 8Z" fill="#659b86"/><ellipse cy="-20" rx="20" ry="12" fill="#394a56"/><ellipse cy="-25" rx="14" ry="8" fill="#263844"/><circle cx="15" cy="9" r="4" fill="#d7f4a0"/>';
  if(id==='spin')return '<ellipse cy="2" rx="44" ry="24" fill="#9988b7"/><path d="M-44 2v-21a44 24 0 0 1 88 0V2" fill="#e8e0f4"/><ellipse cy="-19" rx="44" ry="24" fill="#c5b9da"/><ellipse cy="-20" rx="25" ry="13" fill="#566277"/><path d="M-20-20h40M0-31v22M-14-28l28 16M-14-12l28-16" stroke="#e9edf6" stroke-width="5"/><circle cy="-20" r="5" fill="#315efb"/>';
  if(id==='pcr')return '<path d="M-45-39 0-62 48-37 2-13Z" fill="#e6ecff"/><path d="M-45-39 2-13 2 25-45-1Z" fill="#8ca3dd"/><path d="M2-13 48-37 48 0 2 25Z" fill="#5c79b9"/><path d="M-32-40 0-56 34-38 1-21Z" fill="#b7c7f2"/><path d="M10-8 37-22 37-7 10 7Z" fill="#243c68"/><path d="m14-3 18-9" stroke="#83e4c2" stroke-width="3"/>';
  if(id==='gel')return '<path d="M-54-19-5-45 45-17-4 10Z" fill="#c5f2ed" fill-opacity=".8" stroke="#3b969e" stroke-width="3"/><path d="M-54-19v22l50 28 49-27v-21M-4 10v21" fill="#83c7c9" fill-opacity=".65" stroke="#3b969e" stroke-width="2"/><path d="m-30-20 22 13m-15-17 22 13m-15-17 22 13" stroke="#fff" stroke-width="4"/><path d="M41-17q30-36 32-6M-48-12q-25-30-3-42" fill="none" stroke="#dc6274" stroke-width="3"/><rect x="48" y="-40" width="33" height="24" rx="4" fill="#485b75"/><path d="M54-32h19" stroke="#86e9c7" stroke-width="4"/><text x="-50" y="-23" fill="#25485b">−</text><text x="28" y="14" fill="#ac3459">+</text>';
  return '<path d="M-43-25 0-48 45-24 0 0Z" fill="#584e81"/><path d="M-43-25 0 0 45-24 45-5 0 20-43-4Z" fill="#8875b1"/><path d="M-29-25 0-40 29-25 0-10Z" fill="#c1a2f5"/><path d="m-14-28 15 8m-2-14 15 8" stroke="#f4ecff" stroke-width="3"/><path d="M-43-25v-34L0-81 45-57v33" fill="#d3c8e8" fill-opacity=".3" stroke="#9c89bc" stroke-width="3"/>';
}
export function labMap(carrying=false){
  const grid=Array.from({length:11},(_,i)=>{const a=project(i,0),b=project(i,10),c=project(0,i),d=project(10,i);return `<path d="M${a.x} ${a.y}L${b.x} ${b.y}M${c.x} ${c.y}L${d.x} ${d.y}"/>`;}).join('');
  return `<svg class="amp-room" viewBox="0 0 960 570" role="group" aria-label="웹 구현 실험실. 방향키 또는 WASD로 이동하고 E로 가까운 기기를 엽니다." tabindex="0">
  <defs><linearGradient id="amp-floor" x2="0" y2="1"><stop stop-color="#edf2fc"/><stop offset="1" stop-color="#d9e3f4"/></linearGradient></defs>
  <path d="M100 295 480 85 860 295 480 505Z" fill="url(#amp-floor)"/><path d="M100 295v18l380 210 380-210v-18L480 505Z" fill="#c2cfdf"/>
  <path d="M100 295V190L480-20 860 190v105L480 85Z" fill="#eef2f7"/>
  <path d="M480-20V85L860 295V190Z" fill="#e1e8f1"/>
  <path d="m155 180 125-69v62l-125 69Z" fill="#c6e7f1" stroke="white" stroke-width="7"/><path d="m217 146v62" stroke="white" stroke-width="5"/>
  <g stroke="#bfcde1" stroke-opacity=".48" fill="none">${grid}</g>
  <text x="480" y="533" text-anchor="middle" fill="#5b6d89" font-size="14" letter-spacing="3">분자 진단 실험실</text>
  ${stations.map(s=>{const p=project(s.x,s.y);return `<g class="amp-equipment" data-station="${s.id}" tabindex="0" role="button" aria-label="${s.label} 열기" transform="translate(${p.x} ${p.y})"><ellipse cy="22" rx="65" ry="23" fill="#435b7e" opacity=".10"/>${device(s.id)}<rect class="amp-station-halo" x="-67" y="-72" width="134" height="128" rx="15" fill="none" stroke="#315efb" stroke-width="3" opacity="0"/><g transform="translate(0 53)"><rect x="-65" y="-15" width="130" height="27" rx="6" fill="white" fill-opacity=".94"/><text text-anchor="middle" y="3" fill="#2a3d58" font-size="13" font-weight="600">${s.label}</text></g></g>`;}).join('')}
  <g id="amp-player" aria-label="학생 캐릭터"><ellipse cy="9" rx="17" ry="8" fill="#263b62" opacity=".17"/><path d="m-7-4-3 15m15-15 3 15" stroke="#34465d" stroke-width="7" stroke-linecap="round"/><path d="M-11-29Q0-34 11-29L13-3H-13Z" fill="white" stroke="#b4c4dc" stroke-width="2"/><path d="M0-29V-4" stroke="#d2daea"/><path d="m-12-23-7 16m31-16 6 16" stroke="#f3c4a2" stroke-width="6" stroke-linecap="round"/><circle cy="-43" r="12" fill="#f3c4a2"/><path d="M-12-43q-2-19 15-14 10 2 9 15L3-48Z" fill="#35445c"/><path d="M-5-38h10" stroke="#85bbcf" stroke-width="6"/>${carrying?'<g aria-label="운반 중인 냉각 랙"><path d="M-16-15h32v12h-32Z" fill="#79c6dc" stroke="#26556b"/><path d="M-11-22v11m7-11v11m8-11v11m7-11v11" stroke="#e8f8ff" stroke-width="4"/><path d="M-18-13h36" stroke="#26556b" stroke-width="3"/></g>':''}</g>
  <g id="amp-near" transform="translate(480 550)"><text text-anchor="middle" font-size="14" fill="#315efb"></text></g></svg>`;
}
export function equipmentArt(id){return `<svg viewBox="-100 -100 200 170" aria-label="${stations.find(s=>s.id===id)?.label}" role="img">${device(id)}</svg>`;}
export function handArt(){return `<svg class="amp-hand-scene" viewBox="0 0 600 145" role="img" aria-label="손으로 피펫에 팁을 끼우고 흡입·분주한 뒤 팁을 버리는 과정">
  <path d="M20 113H580" stroke="#bfcadd" stroke-width="3"/>
  <g fill="#d2dff4" stroke="#8097b4"><rect x="32" y="86" width="68" height="27" rx="4"/><path d="m45 85 3-15 3 15m12 0 3-15 3 15m12 0 3-15 3 15"/><rect x="188" y="74" width="42" height="39" rx="5"/><path d="M362 76v27q13 24 26 0V76Z"/><path d="M508 77h49l-5 36h-39Z"/></g>
  <path d="M366 96h18l-9 15Z" fill="#8caaf0"/><text x="63" y="136" text-anchor="middle">팁 박스</text><text x="209" y="136" text-anchor="middle">선택 용액</text><text x="375" y="136" text-anchor="middle">반응 튜브</text><text x="534" y="136" text-anchor="middle">폐기통</text>
  <g id="amp-hand" transform="translate(65 10)"><path d="m-28-10 19 22 19 2 10-12-4-10-21-6Z" fill="#f1c9aa" stroke="#ca997b" stroke-width="1.5"/><path d="M-39-18-15 7-30 19-54-6Z" fill="#f8fbff" stroke="#aabbd4"/><rect x="-4" y="0" width="11" height="42" rx="4" fill="#f5f8fc" stroke="#4c729a" stroke-width="2"/><path d="M-2 42 1 60 5 42" fill="#9fc9df"/><path d="M0 5h5" stroke="#315efb" stroke-width="3"/></g></svg>`;}
const line=(x1,y1,x2,y2,color,width=5)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
function strand(x1,x2,y,color,left="5′",right="3′"){
  if(x2-x1<3)return '';
  return `${line(x1,y,x2,y,color)}${Array.from({length:Math.max(1,Math.floor((x2-x1)/13))},(_,i)=>line(x1+i*13,y,x1+i*13,y+7,color,2)).join('')}<text x="${x1-10}" y="${y+4}" text-anchor="end">${left}</text><text x="${x2+9}" y="${y+4}">${right}</text>`;
}
export function molecule(frame,progress,positive){
  const p=Math.min(1,Math.max(0,progress));
  const c={rna:'#ce8430',template:'#2885b3',new:'#ce5a87',primer:'#a17b0e'};
  let art='',note='';
  if(!positive){
    art=Array.from({length:4},(_,i)=>{const x=55+i*83,y=65+Math.sin(p*6+i)*22;return strand(x,x+22,y,c.primer,i%2?'3′':'5′',i%2?'5′':'3′');}).join('');
    note='표적 RNA 없음 → 결합·증폭 없음';
  }else if(frame.phase==='rt'){
    art=strand(65,330,56,c.rna)+strand(277,330,88+30*Math.max(0,1-p/.2),c.primer,p>.2?'':'3′','5′');
    const x=277-212*Math.max(0,(p-.2)/.8);
    if(p>.2){art+=strand(x,274,88,c.new,'3′','')+`<ellipse cx="${x}" cy="105" rx="19" ry="12" fill="#b7cbd9" opacity=".8"/><text x="${x}" y="109" text-anchor="middle" font-size="10">역전사</text>`;for(let bx=Math.ceil(x/13)*13;bx<=330;bx+=13)art+=`<path d="M${bx} 64V81" stroke="#8f9bac" stroke-dasharray="2 3"/>`;}
    art+=`<text x="180" y="132" text-anchor="middle">← 새 cDNA 합성: 5′→3′</text>`;
    note=p<.2?'역방향 프라이머가 상보적 서열로 이동':'RNA–cDNA 혼성 이중 가닥 형성';
  }else if(frame.phase==='initial'){
    art=strand(65,330,56-22*p,c.rna)+strand(65,330,88+22*p,c.template,'3′','5′');
    note='RNA와 cDNA 분리 · 역전사 효소 열 비활성화';
  }else{
    const first=frame.cycle===1,phase=frame.phase;
    const gap=phase==='denature'?15+40*p:phase==='anneal'?55:phase==='final'?30:55-25*p;
    if(!first)art+=strand(65,330,70-gap/2,c.template);
    art+=strand(65,330,70+gap/2,c.template,'3′','5′');
    if(phase==='anneal'||phase==='extend'||phase==='final'){
      const extending=phase!=='anneal',growth=phase==='final'?1:extending?p:0;
      art+=strand(65,113,58+gap/2,c.primer,'5′',growth>0?'':'3′');
      if(extending)art+=strand(116,116+214*growth,58+gap/2,c.new,'','3′');
      if(!first){art+=strand(282,330,82-gap/2,c.primer,growth>0?'':'3′','5′');if(extending)art+=strand(282-217*growth,279,82-gap/2,c.new,'3′','');}
      if(extending)art+=`<ellipse cx="${116+214*growth}" cy="${49+gap/2}" rx="17" ry="12" fill="#abd6c8"/><text x="${116+214*growth}" y="${53+gap/2}" text-anchor="middle" font-size="10">Taq</text>`;
    }
    if(phase==='denature'&&!first&&p<.6)for(let x=80;x<320;x+=15)art+=`<path d="M${x} ${70-gap/2+7}V${70+gap/2-5}" stroke="#7b91a7" stroke-dasharray="2 3" opacity="${1-p/.6}"/>`;
    note=phase==='denature'?'염기쌍 사이 수소 결합이 끊어집니다':phase==='anneal'?'프라이머가 주형에 역평행으로 결합합니다':'Taq이 프라이머 3′ 말단에서 5′→3′로 연장';
    art+=`<text x="200" y="139" text-anchor="middle">${first?'첫 사이클: cDNA를 주형으로 DNA 합성':'새 가닥 합성 방향: 위 → / 아래 ←'}</text>`;
  }
  return `<svg viewBox="0 0 400 175" role="img" aria-label="${esc(note)}"><g font-size="12" fill="#34465e">${art}<text x="200" y="166" text-anchor="middle" font-size="11">${esc(note)}</text></g></svg>`;
}
export function temperatureGraph(frames,time){
  const total=frames.at(-1).end,x=t=>42+t/total*600,y=t=>117-(t-40)*1.5;
  const points=frames.flatMap(f=>[`${x(f.start)},${y(f.temp)}`,`${x(f.end)},${y(f.temp)}`]).join(' ');
  return `<svg viewBox="0 0 670 150" role="img" aria-label="온도 그래프와 현재 재생 위치"><path d="M42 15V122H650" fill="none" stroke="#9eacc1"/>${[50,72,95].map(t=>`<text x="35" y="${y(t)+4}" text-anchor="end" font-size="11">${t}°</text>`).join('')}<polyline points="${points}" fill="none" stroke="#93a9e6" stroke-width="2"/><path d="M${x(time)} 15V122" stroke="#315efb" stroke-width="3"/><circle cx="${x(time)}" cy="${y(frames.find(f=>time<f.end)?.temp||frames.at(-1).temp)}" r="5" fill="#315efb"/><text x="42" y="143" font-size="11">0초</text><text x="640" y="143" text-anchor="end" font-size="11">${Math.round(total/1000)}초 · 학습용 재생 시간</text></svg>`;
}
export function quantityGraph(cycle,max){
  const points=Array.from({length:cycle+1},(_,i)=>`${40+i/max*300},${95-i/max*75}`).join(' ');
  return `<svg viewBox="0 0 365 125" role="img" aria-label="이론상 DNA 양 2의 n승, 현재 ${cycle}사이클"><path d="M40 10V95H345" stroke="#9eacc1" fill="none"/><polyline points="${points}" stroke="#ce5a87" stroke-width="3" fill="none"/><text x="35" y="98" text-anchor="end" font-size="11">2⁰</text><text x="35" y="23" text-anchor="end" font-size="11">2<tspan baseline-shift="super">${max}</tspan></text><text x="40" y="113" font-size="11">0</text><text x="325" y="113" font-size="11">${max}회</text><text x="65" y="20" font-size="11">DNA 양 · 로그 눈금</text></svg>`;
}
