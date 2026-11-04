const stockColors=['#6ca7c6','#9c98cb','#4eae94','#829aa9'];
const reagentColors=['#649daf','#ac83bc','#4389bb','#d9975b'];
const columns=[-3.05,-1.02,1.02,3.05];
const sampleName=(sample,index)=>['A','B','양성','NTC'][index]??sample.label;
const target=(id,x,z,text,kind,options={})=>({id,x,z,text,kind,...options});

export function preparationObjects(state,scenario){
  const receiving=state.step===1;
  const stocks=scenario.samples.map((sample,i)=>target(
    'sample:'+sample.id,columns[i],-2.06,
    sampleName(sample,i)+(receiving?(state.tubes[sample.id].received?' 확인 ✓':' 확인'):' 원본'),
    'bottle',{color:stockColors[i],title:sample.material,base:.32,toolHeight:1.16,labelHeight:.42}
  ));
  const reagents=scenario.reagents.map((reagent,i)=>target(
    reagent.id,columns[i],reagent.enzyme&&!state.ice?.18:-.47,
    ['버퍼·dNTP','프라이머','역전사 효소','Taq'][i]??reagent.label,
    'bottle',{color:reagentColors[i],title:reagent.label,base:reagent.enzyme&&!state.ice?0:.32,toolHeight:reagent.enzyme&&!state.ice?.78:1.10,labelHeight:.32}
  ));
  const reactions=scenario.samples.map((sample,i)=>target(
    'tube:'+sample.id,columns[i],1.35,sampleName(sample,i)+' 반응관','tube',
    {color:stockColors[i],title:sample.label+' 반응 튜브',base:.36,fill:.05+state.tubes[sample.id].additions.length*.086,toolHeight:.89,labelHeight:.36,disabled:receiving}
  ));
  return [{kind:'ice',x:0,z:-1.24},{kind:'rack',x:0,z:1.35},...stocks,...reagents,...reactions,
    target('tips',-5.15,1.1,'팁 박스','tips',{disabled:receiving,toolHeight:.62}),
    target('bin',5.15,1.1,'폐기통','bin',{disabled:receiving,toolHeight:.65})
  ].map(o=>receiving&&scenario.reagents.some(r=>r.id===o.id)?{...o,disabled:true}:o);
}

export function electrophoresisObjects(state,scenario){
  const sources=['marker',...scenario.samples.map(sample=>sample.id)];
  return [{kind:'tank',x:0,z:.95},
    ...sources.map((id,i)=>target('load:'+id,(i-2)*1.7,-1.86,i===0?'크기 마커':sampleName(scenario.samples[i-1],i-1)+' 산물','bottle',
      {color:i===0?'#ac83bc':stockColors[i-1],toolHeight:.9,labelHeight:.26})),
    ...state.lanes.map((id,i)=>target('well:'+i,(i-2)*1.7,.63,(i+1)+'번 웰'+(id?' ✓':''),'well',
      {color:id?'#387da6':'#516e76',toolHeight:.43,labelHeight:.13})),
    target('bin',5.12,1.32,'폐기통','bin',{toolHeight:.65})
  ];
}

export function sceneMarkup(objects,kind,escape,busy){
  return '<div class="amp-bench-scene" data-bench-scene="'+kind+'">'+
    '<canvas width="1000" height="440" aria-hidden="true"></canvas>'+
    objects.filter(o=>o.id).map(o=>
      '<button type="button" class="amp-bench-target amp-target-'+o.kind+'" id="amp-target-'+o.id.replace(':','-')+
      '" data-bench-target="'+o.id+'" aria-label="'+escape(o.title??o.text)+'"'+(busy||o.disabled?' disabled':'')+
      '><span>'+escape(o.text)+'</span></button>'
    ).join('')+'</div>';
}
