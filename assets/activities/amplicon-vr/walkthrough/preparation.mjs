import {createState,freshTip,addReagent,planRemainingTransfers,issues} from '../../amplicon/model.mjs?v=pcr17';

export function createPreparation(scenario){
  const state=createState(scenario);
  const names=['A','B','양성 대조군','음성 대조군'];
  const samples=scenario.samples.map((sample,i)=>({...sample,name:names[i]}));
  const reagents=scenario.reagents;
  const sources=[
    ...reagents.map(item=>({id:item.id,label:item.label})),
    ...samples.map(item=>({id:'sample:'+item.id,label:item.name+' 원본'}))
  ];
  const actions=new Map(sources.map(item=>[item.id,item.label]));
  for(const sample of samples)actions.set('tube:'+sample.id,sample.name+' 반응관');
  for(const [id,label] of Object.entries({
    lid:'아이스박스 열기',rack:'냉각 랙 집기',place:'작업대에 랙 놓기',
    tips:'새 팁 끼우기',discard:'사용한 팁 버리기',auto:'나머지 반응관에 자동으로 주입할까요?'
  }))actions.set(id,label);

  let phase='ice',lid=false,liquid=null,finished=false;
  let message='아이스박스로 이동하세요.';
  const completed=id=>state.tubes[id].additions.length===reagents.length+1;
  const expected=id=>reagents[state.tubes[id].additions.length]?.id??'sample:'+id;
  const nextTube=()=>samples.find(sample=>!completed(sample.id));
  const sourceName=id=>({primer:'프라이머',buffer:'버퍼·dNTP',rt:'역전사 효소',taq:'Taq'}[id]??actions.get(id));
  function expectedSource(){
    const next=nextTube();
    if(!next)return '준비한 반응관을 확인하세요.';
    const source=expected(next.id);
    return sourceName(source)+(source.startsWith('sample:')?'을':'를')+' 선택해 흡입하세요.';
  }
  function autoActions(){
    if(phase!=='prep'||finished||liquid||state.tip&&!state.tip.used)return [];
    const remaining=planRemainingTransfers(state,scenario);
    if(!remaining?.length)return [];
    return [...(state.tip?['discard']:[]),
      ...remaining.flatMap(({tube,reagent})=>['tips',reagent,'tube:'+tube,'discard'])];
  }
  function blocked(text){message=text;return null;}
  function finish(){
    if(!state.tip&&issues(state,scenario,2).length===0){
      finished=true;
      message='반응액 준비 완료 · 다음 작업 위치는 볼텍스 믹서입니다.';
    }
  }

  function perform(id){
    if(id==='lid'&&phase==='ice'&&!lid){
      lid=true;
      message='아이스박스 안의 냉각 랙을 집으세요.';
      return 'lid';
    }
    if(id==='rack'&&phase==='ice'&&lid){
      phase='carry';
      for(const tube of Object.values(state.tubes))tube.received=true;
      message='E를 누르고 물러나 피펫 작업대로 가세요.';
      return 'rack';
    }
    if(id==='place'&&phase==='carry'){
      phase='prep';
      message='팁 박스에서 새 팁을 끼우세요.';
      return 'place';
    }
    if(phase!=='prep'||finished)return null;
    if(id==='tips'){
      if(state.tip)return blocked('현재 팁을 폐기한 뒤 새 팁을 끼우세요.');
      freshTip(state);message=expectedSource();return 'tips';
    }
    if(id==='discard'){
      if(!state.tip)return blocked('피펫에 버릴 팁이 없습니다.');
      state.tip=null;liquid=null;message='팁 박스에서 새 팁을 끼우세요.';finish();return 'discard';
    }
    if(!state.tip||state.tip.used)return blocked('팁 박스에서 새 팁을 끼우세요.');
    if(id.startsWith('tube:')){
      const tube=id.slice(5);
      if(!state.tubes[tube])return null;
      if(tube!=='A'&&!completed('A'))return blocked('A 반응관부터 완성하세요.');
      const count=state.tubes[tube].additions.length;
      const expected=reagents[count]?.id??(count===reagents.length?'sample:'+tube:null);
      if(!expected)return blocked('이미 완성된 반응관입니다.');
      if(!liquid)return blocked('먼저 시약이나 원본을 흡입하세요.');
      if(liquid!==expected)return blocked('이 반응관에 넣을 차례인 성분은 '+actions.get(expected)+'입니다.');
      addReagent(state,tube,liquid,false);liquid=null;
      message='사용한 팁을 버리세요.';
      return 'dispense';
    }
    if(!sources.some(source=>source.id===id))return null;
    if(liquid)return blocked('피펫에 든 액체를 분주하거나 팁과 함께 버리세요.');
    const eligible=samples.filter(sample=>(sample.id==='A'||completed('A'))&&!completed(sample.id));
    if(!eligible.some(({id:tube})=>(reagents[state.tubes[tube].additions.length]?.id??'sample:'+tube)===id))
      return blocked('지금은 '+expectedSource());
    liquid=id;
    const destination=eligible.find(({id:tube})=>expected(tube)===id);
    message=destination.name+' 반응관에 주입하세요.';
    return 'aspirate';
  }

  function controls(station){
    if(station==='ice'&&phase==='ice')return [lid?'rack':'lid'];
    if(station==='prep'&&phase==='carry')return ['place'];
    if(station!=='prep'||phase!=='prep'||finished)return [];
    if(!state.tip)return autoActions().length?['tips','auto']:['tips'];
    if(state.tip.used)return autoActions().length?['discard','auto']:['discard'];
    return liquid?[...samples.map(item=>'tube:'+item.id),'discard']:[...sources.map(item=>item.id),'discard'];
  }

  return {
    state,samples,reagents,actions,perform,controls,autoActions,
    get phase(){return phase;},get lid(){return lid;},get liquid(){return liquid;},
    get finished(){return finished;},get message(){return message;},
    get destination(){return phase==='ice'?'ice':finished?'vortex':'prep';}
  };
}
