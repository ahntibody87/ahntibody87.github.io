export const patients = [
  {id:'A', quote:'산소는 충분히 공급되고 있는데, ATP 생산이 급격히 감소했습니다.', drug:'cyanide'},
  {id:'B', quote:'산소 소비는 증가했지만, ATP 생산은 오히려 감소했습니다.', drug:'dnp'},
  {id:'C', quote:'ATP 생산과 산소 소비가 모두 감소했지만, 전자 전달계 자체는 고장이 없었습니다.', drug:'oligomycin'}
];
export const drugs = [
  {id:'cyanide', name:'농약', image:'drug-pesticide.png', alt:'잎과 곤충 표시가 있는 농약 용기', mechanism:'전자 전달계의 마지막에서 산소로 전자가 전달되는 것을 막는다.', substance:'청산가리 · 시안화 칼륨(KCN)', summary:'산소에 전자를 넘기는 마지막 단계가 막혔습니다.', detail:'시안화 이온이 복합체 IV인 사이토크롬 c 산화효소를 저해합니다. 전자 전달이 정체되고 NADH가 축적됩니다. H⁺ 기울기도 시간이 지나며 감소하여 산화적 ATP 합성이 크게 줄어듭니다.'},
  {id:'oligomycin', name:'항생 물질', image:'drug-antibiotic.png', alt:'연구용 항생 물질 바이알과 페트리 접시', mechanism:'ATP 합성 효소를 통한 H⁺의 이동을 막는다.', substance:'올리고마이신', summary:'ATP 합성 효소의 H⁺ 통로가 막혔습니다.', detail:'H⁺가 ATP 합성 효소를 통해 돌아오지 못하여 기울기가 커집니다. 전자 전달계가 추가로 H⁺를 펌핑하기 어려워져 전자 전달과 산소 소비도 느려집니다. 전자 전달계를 직접 저해하는 것은 아닙니다.'},
  {id:'dnp', name:'불법 다이어트 약물', image:'drug-diet-drug.png', alt:'주의 표시가 있는 약병과 캡슐', mechanism:'H⁺가 ATP 합성 효소를 거치지 않고 내막을 건너 돌아오게 한다.', substance:'DNP · 2,4-다이니트로페놀', summary:'H⁺가 ATP 합성 효소를 우회해 돌아옵니다.', detail:'짝풀림제는 H⁺ 전기화학적 기울기를 소실시킵니다. 이 모델에서는 전자 전달과 산소 소비가 증가하지만 산화적 ATP 합성은 감소합니다. 에너지가 열로 더 많이 방출됩니다. DNP는 1930년대 체중 감량 목적으로 사용되었으나 과열 등 심각한 부작용과 사망을 일으켰습니다.'}
];
export const metrics = [
  {id:'oxygen', name:'산소 소비 속도', hint:'얼마나 빠르게 산소를 사용하는가', values:['거의 멈춤','증가','감소']},
  {id:'gradient', name:'H⁺ 전기화학적 기울기', hint:'내막 양쪽에 어느 정도의 기울기가 형성되는가', values:['시간이 지나며 감소','감소','증가']},
  {id:'nadh', name:'NADH/NAD⁺ 비율', hint:'전자 운반체의 환원 상태는 어떠한가', values:['증가','감소','증가']},
  {id:'atp', name:'산화적 ATP 합성 속도', hint:'산화적 인산화로 ATP를 얼마나 만드는가', values:['크게 감소','크게 감소','크게 감소']}
];
export function newInvestigation(random=Math.random) {
  const order=drugs.map(d=>d.id);
  for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  return {version:1,started:false,order,tests:[],answers:Object.fromEntries(patients.map(p=>[p.id,{drug:'',reason:''}])),uncertainty:'',exit:'',submittedAt:null};
}
export function submissionErrors(state) {
  const errors=[];
  if(state.tests.length!==2) errors.push({field:'ce-test-options',text:'서로 다른 두 검사를 먼저 완료하세요.'});
  for(const p of patients){
    if(!drugs.some(d=>d.id===state.answers[p.id]?.drug)) errors.push({field:'ce-choice-'+p.id,text:'환자 '+p.id+'의 약물을 선택하세요.'});
    if(!state.answers[p.id]?.reason?.trim()) errors.push({field:'ce-reason-'+p.id,text:'환자 '+p.id+'의 근거를 작성하세요.'});
  }
  return errors;
}
export function addTest(state, metric, reason) {
  if(state.submittedAt||state.tests.length>=2||state.tests.some(t=>t.metric===metric)) throw new Error('서로 다른 검사 두 종류까지만 선택할 수 있습니다.');
  if(!metrics.some(m=>m.id===metric)) throw new Error('검사를 선택하세요.');
  if(!reason.trim()) throw new Error('이 검사를 고른 이유를 작성하세요.');
  state.tests.push({metric,reason:reason.trim().slice(0,600)});
}
export function restoreInvestigation(raw) {
  if(!raw||raw.version!==1||!Array.isArray(raw.order)||raw.order.length!==3||new Set(raw.order).size!==3||!raw.order.every(id=>drugs.some(d=>d.id===id)))return null;
  const state=newInvestigation();
  state.order=raw.order;state.started=raw.started===true;
  try{for(const t of raw.tests||[])addTest(state,t.metric,t.reason);}catch{return null;}
  for(const p of patients){const a=raw.answers?.[p.id];state.answers[p.id]={drug:drugs.some(d=>d.id===a?.drug)?a.drug:'',reason:typeof a?.reason==='string'?a.reason.slice(0,1500):''};}
  state.uncertainty=typeof raw.uncertainty==='string'?raw.uncertainty.slice(0,1000):'';
  state.exit=typeof raw.exit==='string'?raw.exit.slice(0,2000):'';
  if(typeof raw.submittedAt==='string'&&!submissionErrors(state).length)state.submittedAt=raw.submittedAt;
  return state;
}
