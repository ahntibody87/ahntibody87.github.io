const color={rna:'#ffa24d',dna:'#80b6ff',primer:'#ffdc70',copy:'#57e6c5'};
const targetStart=82,targetEnd=158,primerLength=17;
const detailedTime=2500,fastTime=5000,totalCycles=30;
const stages=[
  ['95°C · DNA 가닥 분리','이중가닥 DNA가 갈라지면 기존 가닥과 직전 사이클에서 합성된 가닥이 각각 주형이 됩니다.'],
  ['55°C · 프라이머 결합','두 프라이머가 각 주형의 상보적인 위치에 붙습니다.'],
  ['72°C · DNA 합성','각 주형에 새 가닥이 합성됩니다. 이렇게 생긴 이중가닥에는 기존 가닥 하나와 새 가닥 하나가 들어 있습니다.']
];
const initial=[[{start:18,end:222,forward:true},{start:18,end:222,forward:false}]];
const copyOf=strand=>strand.forward?{start:strand.start,end:targetEnd,forward:false}:{start:targetStart,end:strand.end,forward:true};
const generations=[initial];
for(let i=0;i<3;i++)generations.push(generations[i].flatMap(pair=>pair.map(strand=>[strand,copyOf(strand)])));
const exact=strand=>strand.start===targetStart&&strand.end===targetEnd;
const clamp=value=>Math.max(0,Math.min(1,value));
const line=(x1,x2,y,stroke,width=5)=>'<path d="M'+x1+' '+y+'H'+x2+'" stroke="'+stroke+'" stroke-width="'+width+'" stroke-linecap="round"/>';
const strandLine=(strand,y,stroke)=>line(strand.start,strand.end,y,stroke);

function molecules(cycle,stage,progress){
  return generations[cycle-1].map((pair,index)=>{
    const x=12+index%2*258,y=10+Math.floor(index/2)*82;
    const strands=pair.map((strand,row)=>{
      const together=30+row*12,separated=17+row*42;
      const axis=stage===0?together+(separated-together)*progress:separated;
      const product=copyOf(strand);
      let markup=strandLine(strand,axis,stage===0&&cycle>1&&row===1?color.copy:color.dna);
      if(stage===0)return markup;
      const childY=axis+10;
      const from=product.forward?product.start:product.end;
      const primerEnd=from+(product.forward?primerLength:-primerLength);
      const end=product.forward?product.end:product.start;
      if(stage===1)return markup+'<g opacity="'+progress+'">'+line(from,primerEnd,childY+(1-progress)*9,color.primer)+'</g>';
      if(cycle===3&&exact(strand)&&exact(product)&&progress>.9){
        markup='<rect x="74" y="'+(axis-6)+'" width="92" height="23" rx="5" fill="#255451" stroke="#8df5d7"/>'+markup;
      }
      return markup+line(from,primerEnd,childY,color.primer)+line(primerEnd,primerEnd+(end-primerEnd)*progress,childY,color.copy);
    }).join('');
    return '<g transform="translate('+x+' '+y+')">'+strands+'</g>';
  }).join('');
}

export function createPcrLesson(root,wake){
  root.innerHTML=`<section class="lab-observation lab-pcr-lesson" hidden aria-labelledby="lab-pcr-title">
    <header><span class="lab-observation-kicker">반응관 안에서 일어나는 일 · 모식도</span><strong class="lab-cycle"></strong></header>
    <h3 id="lab-pcr-title" tabindex="-1"></h3><p class="lab-molecule-note"></p>
    <svg viewBox="0 0 530 180" class="lab-molecule-graphic" role="img" aria-label="PCR 단계별 분자 모식도"></svg>
    <ul class="lab-molecule-legend"><li style="--ink:${color.rna}">RNA</li><li style="--ink:${color.dna}">DNA 주형</li><li style="--ink:${color.primer}">프라이머</li><li style="--ink:${color.copy}">새 DNA</li></ul>
    <div class="lab-observation-controls">
      <button type="button" data-pcr="back">이전 장면</button>
      <button type="button" data-pcr="pause">일시정지</button>
      <button type="button" data-pcr="fast" hidden>건너뛰기</button>
    </div>
  </section>`;
  const panel=root.firstElementChild,title=panel.querySelector('h3'),description=panel.querySelector('.lab-molecule-note');
  const cycleLabel=panel.querySelector('.lab-cycle'),graphic=panel.querySelector('svg');
  const back=panel.querySelector('[data-pcr=back]'),pause=panel.querySelector('[data-pcr=pause]'),skip=panel.querySelector('[data-pcr=fast]');
  const summaryIndex=10,fastIndex=11;
  let active=false,playing=false,index=0,elapsed=0,last=0,skipped=false,shown=-1;

  function render(){
    const cycle=Math.ceil(index/3),stage=(index-1)%3;
    const progress=clamp(elapsed/(index===fastIndex?fastTime:detailedTime));
    if(shown!==index){
      shown=index;
      const [heading,note]=index===0?['역전사 · cDNA 만들기','RNA를 주형으로 cDNA가 만들어집니다.']
        :index===summaryIndex?['표적 이중가닥 DNA가 처음 완성되었습니다','2번째 사이클에서는 표적 길이의 단일가닥이 생기고, 3번째 사이클에서는 양쪽 가닥이 모두 표적 길이인 DNA가 처음 생깁니다.']
        :index===fastIndex?['PCR 반복 · 증폭','온도를 바꾸는 과정을 반복할 때마다 표적 DNA 사본이 빠르게 늘어납니다.']
        :stages[stage];
      title.textContent=heading;description.textContent=note;
      cycleLabel.textContent=index===0?'사이클 전 · 역전사':index===summaryIndex?'3번째 사이클 완료':cycle+'번째 사이클';
    }
    if(index===0){
      graphic.setAttribute('viewBox','0 0 530 132');
      graphic.innerHTML=line(85,445,49,color.rna,8)+line(85,85+360*progress,82,color.copy,8);
    }else if(index===fastIndex){
      const completed=Math.min(totalCycles,3+Math.floor(progress*(totalCycles-3)));
      cycleLabel.textContent=completed+' / '+totalCycles+' 사이클';
      const visible=Math.min(80,Math.floor(2*40**progress));
      graphic.setAttribute('viewBox','0 0 530 160');
      graphic.innerHTML=Array.from({length:visible},(_,i)=>{
        const x=24+(i%10)*50,y=17+Math.floor(i/10)*18;
        return line(x,x+22,y,color.dna,3)+line(x,x+22,y+5,color.copy,3);
      }).join('');
    }else{
      const rows=index===summaryIndex||cycle===3?2:1;
      graphic.setAttribute('viewBox',rows===2?'0 0 530 184':cycle===1?'0 0 266 96':'0 0 530 96');
      graphic.innerHTML=index===summaryIndex?molecules(3,2,1):molecules(cycle,stage,progress);
    }
  }

  function controls(){
    back.disabled=index===0||index===fastIndex;
    pause.textContent=playing?'일시정지':'계속 보기';
    skip.hidden=index!==fastIndex;
  }
  panel.addEventListener('click',event=>{
    const action=event.target.closest('[data-pcr]')?.dataset.pcr;
    if(action==='back'&&index>0&&index<fastIndex){index--;elapsed=0;last=0;playing=true;render();}
    else if(action==='pause'){playing=!playing;last=0;}
    else if(action==='fast'&&index===fastIndex){skipped=true;}
    else return;
    controls();wake();
  });
  return {
    open(){
      active=playing=true;index=elapsed=last=0;shown=-1;skipped=false;
      panel.hidden=false;controls();render();title.focus({preventScroll:true});
    },
    close(){active=playing=false;panel.hidden=true;},
    get playing(){return playing;},
    update(now){
      if(!active)return {progress:0,done:false};
      if(playing&&last)elapsed+=index===fastIndex?now-last:Math.min(200,now-last);
      last=now;
      if(index<fastIndex&&elapsed>=detailedTime){index++;elapsed=0;controls();}
      render();
      const done=index===fastIndex&&(skipped||elapsed>=fastTime);
      const progress=index===fastIndex?.65+.35*clamp(elapsed/fastTime):.65*(index+clamp(elapsed/detailedTime))/fastIndex;
      return {progress:done?1:progress,done};
    }
  };
}
