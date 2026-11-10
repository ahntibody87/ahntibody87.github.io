const stages=[
  ['역전사 · cDNA 만들기','RNA를 주형으로 cDNA가 만들어집니다.'],
  ['95°C · DNA 가닥 분리','역전사 뒤 만들어진 이중가닥 DNA가 갈라져 각각 주형이 됩니다.'],
  ['55°C · 프라이머 결합','짧은 프라이머가 주형에서 짝이 맞는 위치에 붙습니다.'],
  ['72°C · DNA 합성','중합효소가 프라이머 끝에서부터 새 DNA 가닥을 늘립니다.']
];
const length=340;
const repeats=5;
const detailedTime=2400;
const fastTime=5100;
const color={rna:'#ffa24d',dna:'#80b6ff',primer:'#ffdc70',copy:'#57e6c5'};
const line=(id,stroke,y,start=95,end=435)=>`<path id="${id}" d="M${start} ${y}H${end}" stroke="${stroke}" stroke-width="9" stroke-linecap="round"/>`;

export function createPcrLesson(root,wake){
  root.innerHTML=`<section class="lab-observation lab-pcr-lesson" hidden aria-labelledby="lab-pcr-title">
    <header><span class="lab-observation-kicker">반응관 안에서 일어나는 일 · 모식도</span><strong class="lab-cycle"></strong></header>
    <h3 id="lab-pcr-title" tabindex="-1"></h3><p class="lab-molecule-note"></p>
    <svg viewBox="0 0 530 180" class="lab-molecule-graphic" role="img" aria-label="PCR 단계별 분자 모식도"></svg>
    <ul class="lab-molecule-legend"><li style="--ink:${color.rna}">RNA</li><li style="--ink:${color.dna}">DNA 주형</li><li style="--ink:${color.primer}">프라이머</li><li style="--ink:${color.copy}">새 DNA</li></ul>
    <div class="lab-observation-controls">
      <button type="button" data-pcr="back">이전 장면</button>
      <button type="button" data-pcr="pause">일시정지</button>
      <button type="button" data-pcr="fast" hidden>반복 구간 빨리감기</button>
    </div>
  </section>`;
  const panel=root.firstElementChild,title=panel.querySelector('h3'),description=panel.querySelector('.lab-molecule-note');
  const cycle=panel.querySelector('.lab-cycle'),graphic=panel.querySelector('svg');
  const back=panel.querySelector('[data-pcr=back]'),pause=panel.querySelector('[data-pcr=pause]'),fast=panel.querySelector('[data-pcr=fast]');
  let active=false,playing=false,index=0,elapsed=0,last=0,fastMode=false,waiting=false,shown=-1;
  const clamp=x=>Math.max(0,Math.min(1,x));
  function draw(step,t){
    if(shown!==step){
      shown=step;title.textContent=stages[step][0];description.textContent=stages[step][1];
      const primers=line('primer-a',color.primer,67,116,161)+line('primer-b',color.primer,126,369,414);
      const polymerase=`<g id="polymerase"><rect x="-31" y="-11" width="62" height="22" rx="10" fill="#49736e"/><text text-anchor="middle" y="4" fill="white" font-size="11">${step===0?'역전사 효소':'중합효소'}</text></g>`;
      graphic.innerHTML=step===0?line('template',color.rna,68)+line('new-a',color.copy,113)+polymerase
        :step===1?line('top',color.dna,83)+line('bottom',color.dna,97)+`<path id="ties" d="${Array.from({length:18},(_,i)=>'M'+(104+i*19)+' 83v14').join(' ')}" stroke="#8db4cd" stroke-width="2"/>`
        :line('top',color.dna,54)+line('bottom',color.dna,139)+primers+
          (step===3?line('new-a',color.copy,67,161,435)+line('new-b',color.copy,126,95,369)+polymerase:'');
    }
    const attr=(id,name,value)=>graphic.querySelector('#'+id)?.setAttribute(name,value);
    const growing=(id,size,amount)=>{
      attr(id,'stroke-dasharray',size);
      attr(id,'stroke-dashoffset',size*(1-amount));
      attr(id,'opacity',amount>.015?1:0);
    };
    if(step===0){
      growing('new-a',length,t);
      attr('polymerase','transform',`translate(${95+t*length} 143)`);
    }else if(step===1){
      attr('top','transform',`translate(0 ${-29*t})`);
      attr('bottom','transform',`translate(0 ${42*t})`);
      attr('ties','opacity',1-t);
    }else if(step===2){
      attr('primer-a','transform',`translate(0 ${30*(1-t)})`);
      attr('primer-b','transform',`translate(0 ${-30*(1-t)})`);
      attr('primer-a','opacity',t);attr('primer-b','opacity',t);
    }else{
      growing('new-a',274,t);
      growing('new-b',274,t);
      attr('new-b','transform','translate(464 0) scale(-1 1)');
      attr('polymerase','transform',`translate(${161+t*274} 93)`);
    }
  }
  function controls(){
    back.disabled=fastMode||index===0;
    pause.hidden=waiting;
    pause.textContent=playing?'일시정지':'계속 보기';
    fast.hidden=!waiting;
  }
  panel.addEventListener('click',event=>{
    const action=event.target.closest('[data-pcr]')?.dataset.pcr;
    if(action==='back'&&index>0&&!fastMode){index--;elapsed=0;last=0;waiting=false;playing=true;}
    else if(action==='pause'){playing=!playing;last=0;}
    else if(action==='fast'&&waiting){fastMode=true;waiting=false;playing=true;elapsed=0;last=0;pause.focus();}
    else return;
    controls();wake();
  });
  return {
    open(){
      active=playing=true;index=elapsed=last=0;fastMode=waiting=false;shown=-1;
      panel.hidden=false;controls();draw(0,0);cycle.textContent='사이클 전 · 역전사';title.focus({preventScroll:true});
    },
    close(){active=playing=false;panel.hidden=true;},
    get playing(){return playing;},
    update(now){
      if(!active)return {progress:0,done:false};
      if(playing&&last)elapsed+=Math.min(200,now-last);
      last=now;
      if(fastMode){
        const amount=clamp(elapsed/fastTime);
        const pass=Math.min(repeats-.001,amount*repeats);
        const phase=(pass%1)*3;
        const count=Math.floor(pass)+2;
        cycle.textContent=`빨리감기 · 예시 사이클 ${count} · 모식도 사본 ×${2**count}`;
        draw(1+Math.floor(phase),phase%1);
        return {progress:.5+amount*.5,done:amount===1};
      }
      if(playing&&elapsed>=detailedTime){
        if(index<3){index++;elapsed=0;}
        else{elapsed=detailedTime;waiting=true;playing=false;controls();fast.focus({preventScroll:true});}
        controls();
      }
      cycle.textContent=index===0?'사이클 전 · 역전사':'첫 번째 사이클';
      draw(index,clamp(elapsed/detailedTime));
      return {progress:(index+clamp(elapsed/detailedTime))/8,done:false};
    }
  };
}
