import {createState,freshTip,addReagent,planRemainingTransfers,issues,bands} from '../../amplicon/model.mjs?v=pcr17';

export function createPreparation(scenario){
  const state=createState(scenario);
  const names=['A','B','양성 대조군','음성 대조군'];
  const samples=scenario.samples.map((sample,i)=>({...sample,name:names[i]}));
  const reagents=scenario.reagents;
  const laneNames=['DNA 마커',...samples.map(sample=>sample.name)];
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

  for(const [id,label] of Object.entries({
    dockGel:'랙 내려놓기',swapGel:'전극 연결 바꾸기',runGel:'전기영동 시작',
    collectGel:'겔 들어 옮기기',dockLed:'관찰판에 겔 놓기',viewLed:'덮개 닫고 LED 켜기',
    inspectLed:'밴드 확대해서 보기'
  }))actions.set(id,label);
  state.lanePlan.forEach((id,index)=>{
    actions.set('gelSource:'+id,laneNames[index]+(id==='marker'?'':' PCR 산물'));
    actions.set('well:'+index,(index+1)+'번 웰 · '+laneNames[index]);
  });

  let phase='ice',lid=false,liquid=null,prepared=false;
  let vortexTube=null,selected=null,spinOpen=false;
  const slots=Array(samples.length).fill(null);
  let pcrOpen=false,gelSource=null;
  for(const sample of samples)actions.set('handle:'+sample.id,sample.name+' 반응관');
  for(let i=0;i<slots.length;i++)actions.set('slot:'+i,(i+1)+'번 로터 자리');
  for(const [id,label] of Object.entries({collect:'반응관 랙 들기',dockMix:'랙 내려놓기',holdMix:'접촉판에 누르고 있기',removeMix:'반응관을 랙에 되돌리기',carrySpin:'혼합한 랙 들기',dockSpin:'랙 내려놓기',openSpin:'원심분리기 뚜껑 열기',closeSpin:'뚜껑 닫기',runSpin:'원심분리 시작',collectSpin:'반응관을 랙에 회수하기',dockPcr:'랙 내려놓기',openPcr:'PCR 기기 뚜껑 열기',loadPcr:'네 반응관 장착하기',closePcr:'PCR 뚜껑 닫기',runPcr:'PCR 시작',recoverPcr:'PCR 뚜껑 열기',collectPcr:'반응관을 랙에 회수하기'}))actions.set(id,label);
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
    if(phase!=='prep'||prepared||liquid||state.tip&&!state.tip.used)return [];
    const remaining=planRemainingTransfers(state,scenario);
    if(!remaining?.length)return [];
    return [...(state.tip?['discard']:[]),
      ...remaining.flatMap(({tube,reagent})=>['tips',reagent,'tube:'+tube,'discard'])];
  }
  function blocked(text){message=text;return null;}
  function finish(){
    if(!state.tip&&issues(state,scenario,2).length===0){
      prepared=true;
      message='반응액 준비 완료 · 반응관 랙을 드세요.';
    }
  }

  function perform(id){
    if(id==='collect'&&phase==='prep'&&prepared){
      phase='toMix';message='E를 누르고 물러나 볼텍스 믹서로 가세요.';return id;
    }
    if(id==='dockMix'&&phase==='toMix'){
      phase='mix';message='랙에서 반응관 하나를 골라 접촉판에 올리세요.';return id;
    }
    if(phase==='mix'){
      if(id.startsWith('handle:')&&!vortexTube){
        const tube=id.slice(7);
        if(!state.tubes[tube]||state.tubes[tube].mixed)return null;
        vortexTube=tube;message='접촉판의 버튼을 눌러 혼합이 끝날 때까지 유지하세요.';return 'seatMix';
      }
      if(id==='holdMix'&&vortexTube&&!state.tubes[vortexTube].mixed){
        state.tubes[vortexTube].mixed=true;
        message='혼합 완료 · 반응관을 랙에 되돌리세요.';return id;
      }
      if(id==='removeMix'&&vortexTube&&state.tubes[vortexTube].mixed){
        vortexTube=null;
        message=allMixed()?'모두 혼합했습니다. 랙을 들어 원심분리기로 가세요.':'다음 반응관을 선택하세요.';
        return id;
      }
      if(id==='carrySpin'&&allMixed()&&!vortexTube){
        phase='toSpin';message='E를 누르고 물러나 원심분리기로 가세요.';return id;
      }
    }
    if(id==='dockSpin'&&phase==='toSpin'){
      phase='spin';message='랙을 내려놓았습니다. 원심분리기 뚜껑을 여세요.';return id;
    }
    if(phase==='spin'){
      if(id==='openSpin'&&!spinOpen){
        spinOpen=true;message='반응관을 선택하고 로터의 빈 자리에 넣으세요.';return id;
      }
      if(id.startsWith('handle:')&&spinOpen){
        const tube=id.slice(7);
        if(!state.tubes[tube]?.mixed||slots.includes(tube))return null;
        selected=tube;message=actions.get(id)+'을 넣을 빈 자리를 선택하세요.';return 'selectSpin';
      }
      if(id.startsWith('slot:')&&spinOpen&&selected){
        const slot=Number(id.slice(5));
        if(slot<0||slot>=slots.length||slots[slot])return null;
        slots[slot]=selected;selected=null;
        message=slots.every(Boolean)?'네 자리를 채웠습니다. 뚜껑을 닫으세요.':'다음 반응관과 빈 자리를 선택하세요.';
        return 'loadSpin';
      }
      if(id==='closeSpin'&&spinOpen&&slots.every(Boolean)){
        spinOpen=false;phase='readySpin';message='뚜껑이 닫혔습니다. 원심분리를 시작하세요.';return id;
      }
    }
    if(id==='runSpin'&&phase==='readySpin'){
      phase='spinning';message='원심분리 중 · 로터가 멈출 때까지 기다리세요.';return id;
    }
    if(id==='collectSpin'&&phase==='recoverSpin'){
      phase='toPcr';slots.fill(null);message='E를 누르고 물러나 PCR 기기로 가세요.';return id;
    }
    if(id==='dockPcr'&&phase==='toPcr'){
      phase='pcr';message='PCR 기기 뚜껑을 여세요.';return id;
    }
    if(id==='openPcr'&&phase==='pcr'){
      pcrOpen=true;phase='loadPcr';message='네 반응관을 장착하세요.';return id;
    }
    if(id==='loadPcr'&&phase==='loadPcr'&&!issues(state,scenario,3).length){
      state.pcrLoaded=samples.map(sample=>sample.id);
      phase='closePcr';message='반응관을 장착했습니다. 뚜껑을 닫으세요.';return id;
    }
    if(id==='closePcr'&&phase==='closePcr'){
      pcrOpen=false;phase='readyPcr';message='뚜껑이 닫혔습니다. PCR을 시작하세요.';return id;
    }
    if(id==='runPcr'&&phase==='readyPcr'){
      phase='runningPcr';message='PCR 진행 중 · 기기 화면에서 증폭을 관찰하세요.';return id;
    }
    if(id==='recoverPcr'&&phase==='recoverPcr'){
      pcrOpen=true;phase='collectPcr';message='반응관을 랙에 회수하세요.';return id;
    }
    if(id==='collectPcr'&&phase==='collectPcr'){
      state.pcrLoaded=[];phase='toGel';message='E를 누르고 물러나 전기영동 장치로 가세요.';return id;
    }

    if(id==='dockGel'&&phase==='toGel'){
      phase='gel';message='DNA 마커를 선택하세요.';return id;
    }
    if(phase==='gel'){
      if(id.startsWith('gelSource:')){
        const source=id.slice(10);
        if(!state.lanePlan.includes(source)||state.lanes.includes(source))return null;
        gelSource=source;
        message=(state.lanePlan.indexOf(source)+1)+'번 웰에 넣으세요.';
        return 'selectGel';
      }
      if(id.startsWith('well:')&&gelSource){
        const index=Number(id.slice(5));
        if(state.lanePlan[index]!==gelSource)return blocked('표시된 레인 이름과 일치하는 웰을 고르세요.');
        if(state.lanes[index])return blocked('이미 채운 웰입니다.');
        state.lanes[index]=gelSource;gelSource=null;
        const next=state.lanes.indexOf(null);
        message=next===-1?'전극 연결을 확인하고 전기영동을 시작하세요.':actions.get('gelSource:'+state.lanePlan[next])+'을 선택하세요.';
        return 'loadGel';
      }
      if(id==='swapGel'){
        state.polarity=state.polarity==='normal'?'reverse':'normal';
        message=state.polarity==='normal'?'웰이 −극 쪽입니다.':'웰이 +극 쪽입니다. 연결을 다시 확인하세요.';
        return id;
      }
      if(id==='runGel'&&state.lanes.every(Boolean)){
        if(state.polarity!=='normal')return blocked('웰이 −극 쪽에 오도록 전극을 바꾸세요.');
        phase='runningGel';message='전기영동 중 · 추적 색소가 +극 쪽으로 이동합니다.';return id;
      }
    }
    if(id==='collectGel'&&phase==='recoverGel'){
      phase='toLed';message='E를 누르고 물러나 LED 관찰기로 가세요.';return id;
    }
    if(id==='dockLed'&&phase==='toLed'){
      phase='led';message='보호 덮개를 닫고 LED를 켜세요.';return id;
    }
    if(id==='viewLed'&&phase==='led'){
      phase='observe';state.viewed=true;message='마커와 대조군을 비교해 밴드를 판독하세요.';return id;
    }
    if(id==='inspectLed'&&state.viewed)return id;

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
    if(phase!=='prep'||prepared)return null;
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

  const allMixed=()=>samples.every(sample=>state.tubes[sample.id].mixed);
  const availableTubes=filter=>samples.filter(({id})=>filter(id)).map(({id})=>'handle:'+id);
  function completeSpin(){
    if(phase!=='spinning')return;
    for(const id of slots)state.tubes[id].spun=true;
    spinOpen=true;phase='recoverSpin';message='로터가 멈췄습니다. 반응관을 랙에 회수하세요.';
  }
  function completePcr(){
    if(phase!=='runningPcr')return;
    state.amplified=true;phase='recoverPcr';message='PCR이 끝났습니다. 뚜껑을 열어 반응관을 꺼내세요.';
  }
  function completeGel(){
    if(phase!=='runningGel')return;
    state.gelRun=true;phase='recoverGel';message='전기영동이 끝났습니다. 겔을 들어 옮기세요.';
  }
  function result(answer,reason){
    if(!state.viewed||!['A','B','both','neither'].includes(answer)||!reason.trim())return null;
    state.answer=answer;state.reason=reason.trim();state.submitted=true;
    phase='done';message='탐구 완료 · 판정과 근거를 모범 해석과 비교하세요.';
    return {correct:answer===scenario.answer,model:scenario.modelInterpretation};
  }
  function controls(station){
    if(station==='gel'){
      if(phase==='toGel')return ['dockGel'];
      if(phase==='recoverGel')return ['collectGel'];
      if(phase==='gel'){
        if(state.lanes.every(Boolean))return ['swapGel','runGel'];
        if(gelSource)return [...state.lanes.flatMap((id,i)=>id?[]:['well:'+i]),
          ...state.lanePlan.filter(id=>!state.lanes.includes(id)).map(id=>'gelSource:'+id)];
        return state.lanePlan.filter(id=>!state.lanes.includes(id)).map(id=>'gelSource:'+id);
      }
    }
    if(station==='led'){
      if(phase==='toLed')return ['dockLed'];
      if(phase==='led')return ['viewLed'];
      if(state.viewed)return ['inspectLed'];
    }
    if(station==='pcr'){
      const action={toPcr:'dockPcr',pcr:'openPcr',loadPcr:'loadPcr',closePcr:'closePcr',
        readyPcr:'runPcr',recoverPcr:'recoverPcr',collectPcr:'collectPcr'}[phase];
      return action?[action]:[];
    }
    if(station==='prep'&&phase==='prep'&&prepared)return ['collect'];
    if(station==='vortex'){
      if(phase==='toMix')return ['dockMix'];
      if(phase==='mix')return vortexTube?[state.tubes[vortexTube].mixed?'removeMix':'holdMix']:
        allMixed()?['carrySpin']:availableTubes(id=>!state.tubes[id].mixed);
    }
    if(station==='spin'){
      if(phase==='toSpin')return ['dockSpin'];
      if(phase==='readySpin')return ['runSpin'];
      if(phase==='recoverSpin')return ['collectSpin'];
      if(phase==='spin'){
        if(!spinOpen)return ['openSpin'];
        if(slots.every(Boolean))return ['closeSpin'];
        const tubes=availableTubes(id=>!slots.includes(id));
        return selected?[...tubes,...slots.flatMap((id,i)=>id?[]:['slot:'+i])]:tubes;
      }
    }
    if(station==='ice'&&phase==='ice')return [lid?'rack':'lid'];
    if(station==='prep'&&phase==='carry')return ['place'];
    if(station!=='prep'||phase!=='prep'||prepared)return [];
    if(!state.tip)return autoActions().length?['tips','auto']:['tips'];
    if(state.tip.used)return autoActions().length?['discard','auto']:['discard'];
    return liquid?[...samples.map(item=>'tube:'+item.id),'discard']:[...sources.map(item=>item.id),'discard'];
  }

  return {
    state,samples,reagents,actions,perform,controls,autoActions,completeSpin,completePcr,completeGel,result,
    laneNames,markerBp:scenario.markerBp,productBp:scenario.productBp,
    bandRows:()=>state.lanes.map(id=>bands(scenario,id)),
    get gelSource(){return gelSource;},
    get phase(){return phase;},get lid(){return lid;},get liquid(){return liquid;},
    get finished(){return phase==='done';},get vortexTube(){return vortexTube;},get slots(){return slots;},
    get spinOpen(){return spinOpen;},get pcrOpen(){return pcrOpen;},get selected(){return selected;},
    get carrying(){return ['carry','toMix','toSpin','toPcr','toGel','toLed'].includes(phase);},get message(){return message;},
    get destination(){
      if(['toGel','gel','runningGel','recoverGel'].includes(phase))return 'gel';
      if(['toLed','led','observe','done'].includes(phase))return 'led';
      if(['toPcr','pcr','loadPcr','closePcr','readyPcr','runningPcr','recoverPcr','collectPcr'].includes(phase))return 'pcr';
      return phase==='ice'?'ice':['carry','prep'].includes(phase)?'prep':['toMix','mix'].includes(phase)?'vortex':'spin';
    }
  };
}
