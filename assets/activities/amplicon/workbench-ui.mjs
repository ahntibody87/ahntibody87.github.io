const stockColors=['#6ca7c6','#9c98cb','#4eae94','#829aa9'];
const reagentColors=['#649daf','#ac83bc','#4389bb','#d9975b'];
const columns=[-3.05,-1.02,1.02,3.05];
const sampleName=(sample,index)=>['A','B','양성 대조군','음성 대조군'][index]??sample.label;
const target=(id,x,z,text,kind,options={})=>({id,x,z,text,kind,...options});

export function coolerObjects(scenario,open,transfer){
  const x=-2.8+transfer*6.0;
  const z=.46+transfer*.38;
  const base=.46-transfer*.26+Math.sin(transfer*Math.PI)*1.25;
  const box=target(open?'':'lid',-2.8,.42,'아이스박스 뚜껑 열기','cooler',{open,labelHeight:.94});
  const pad=target(open&&transfer<1?'shelf':'',3.2,.84,'랙 놓는 자리','receivingPad',{labelHeight:.16});
  if(!open)return [box,pad];
  return [box,pad,
    target('rack',x,z,transfer===1?'꺼낸 냉각 랙':'냉각 랙 꺼내기','coldRack',
      {base,width:4.45,labelHeight:base-.46,annotation:transfer===1}),
    ...scenario.samples.map((sample,i)=>target('stock:'+sample.id,x+(i-1.5)*1.08,z,sampleName(sample,i),'tube',
      {base:base+.24,color:stockColors[i],annotation:true,labelHeight:base+.27}))
  ];
}

export function preparationObjects(state,scenario){
  const stocks=scenario.samples.map((sample,i)=>target(
    'sample:'+sample.id,columns[i],-2.06,
    sampleName(sample,i)+' 원본',
    'bottle',{color:stockColors[i],title:sample.material,base:.50,toolHeight:1.29,labelHeight:.52}
  ));
  const reagents=scenario.reagents.map((reagent,i)=>target(
    reagent.id,columns[i],reagent.enzyme&&!state.ice?.18:-.47,
    ['버퍼·dNTP','프라이머','역전사 효소','Taq'][i]??reagent.label,
    'bottle',{color:reagentColors[i],title:reagent.label,base:reagent.enzyme&&!state.ice?0:.32,toolHeight:reagent.enzyme&&!state.ice?.78:1.10,labelHeight:.32}
  ));
  const reactions=scenario.samples.map((sample,i)=>target(
    'tube:'+sample.id,columns[i],1.35,sampleName(sample,i)+' 반응관','tube',
    {color:stockColors[i],title:sample.label+' 반응 튜브',base:.36,fill:.05+state.tubes[sample.id].additions.length*.086,toolHeight:.89,labelHeight:.36}
  ));
  return [{kind:'ice',x:0,z:-1.24},{kind:'coldRack',x:0,z:-2.06,width:7.15,base:.30},
    {kind:'rack',x:0,z:1.35},...stocks,...reagents,...reactions,
    target('tips',-5.15,1.1,'팁 박스','tips',{toolHeight:.62}),
    target('bin',5.15,1.1,'폐기통','bin',{toolHeight:.65})
  ];
}

export function electrophoresisObjects(state,scenario,progress=null){
  const sources=['marker',...scenario.samples.map(sample=>sample.id)];
  const wellZ=.18,wellSpacing=1.7;
  return [{kind:'tank',x:0,z:1.02,wellZ,wellSpacing,wellCount:sources.length,
      reverse:state.polarity==='reverse',progress:state.gelRun?1:progress},
    ...sources.map((id,i)=>target('load:'+id,(i-2)*wellSpacing,-1.9,i===0?'크기 마커':sampleName(scenario.samples[i-1],i-1)+' 산물','bottle',
      {color:i===0?'#ac83bc':stockColors[i-1],toolHeight:.9,labelHeight:.26})),
    ...state.lanes.map((id,i)=>target('well:'+i,(i-2)*wellSpacing,wellZ,(i+1)+'번 웰'+(id?' ✓':''),'well',
      {color:id?'#53788a':'#365856',toolHeight:.56,labelHeight:.35,title:(i+1)+'번 웰 · '+(i===0?'DNA 크기 마커':scenario.samples[i-1].label)}))
  ];
}

export function sceneMarkup(objects,kind,escape,busy,overlay=''){
  return '<div class="amp-bench-scene" data-bench-scene="'+kind+'">'+
    '<canvas width="1000" height="440" aria-hidden="true"></canvas>'+
    objects.filter(o=>o.id).map(o=>o.annotation?
      '<span class="amp-bench-label" data-bench-label="'+o.id+'">'+escape(o.text)+'</span>':
      '<button type="button" class="amp-bench-target amp-target-'+o.kind+'" id="amp-target-'+o.id.replace(':','-')+
      '" data-bench-target="'+o.id+'" aria-label="'+escape(o.title??o.text)+'"'+(busy||o.disabled?' disabled':'')+
      '><span>'+escape(o.text)+'</span></button>'
    ).join('')+overlay+'</div>';
}
