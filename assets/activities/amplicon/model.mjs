// No persistence: a new document always starts a new experiment.
export const freshTube = () => ({received:false, additions:[], mixed:false, spun:false});
export function createState(scenario) {
  return {step:0, tubes:Object.fromEntries(scenario.samples.map(s=>[s.id,freshTube()])),
    tip:null, ice:true, program:{...scenario.program.defaults}, pcrLoaded:[], amplified:false,
    lanePlan:['marker',...scenario.samples.map(s=>s.id)], lanes:[null,null,null,null,null],
    polarity:'normal', gelRun:false, viewed:false, answer:'', reason:'', submitted:false};
}
export function freshTip(state) { state.tip={used:false,contacts:[]}; }
export function addReagent(state, id, reagent, dispose=true) {
  const tube=state.tubes[id];
  if(!tube?.received || !state.tip) return false;
  tube.additions.push({reagent, reused:state.tip.used, cold:state.ice, contacts:[...state.tip.contacts],
    previousTransfer:state.tip.lastTransfer});
  state.tip.used=true;
  state.tip.contacts.push(id);
  state.tip.lastTransfer={tube:id,reagent};
  if(dispose) state.tip=null;
  tube.mixed=false; tube.spun=false;
  return true;
}
// Resume clean preparations after the student completes the A reaction.
export function planRemainingTransfers(state,scenario) {
  const common=scenario.reagents.map(reagent=>reagent.id);
  if(state.tubes.A.additions.length!==common.length+1)return null;
  const transfers=[];
  for(const {id} of scenario.samples){
    const tube=state.tubes[id];
    const recipe=[...common,`sample:${id}`];
    if(!tube.received||tube.additions.length>recipe.length)return null;
    const invalid=tube.additions.some((addition,index)=>
      addition.reagent!==recipe[index] || addition.reused ||
      (scenario.reagents.find(r=>r.id===addition.reagent)?.enzyme&&!addition.cold));
    if(invalid)return null;
    for(const reagent of recipe.slice(tube.additions.length))transfers.push({tube:id,reagent});
  }
  return transfers;
}
export function resetTube(state,id) {
  state.tubes[id]={...freshTube(),received:state.tubes[id].received};
  // Replacing a tube does not clean a contaminated tip.
}
export function issues(state,scenario,step=state.step) {
  const out=[];
  const add=(rule,tube='')=>{if(!out.some(x=>x.rule===rule&&x.tube===tube))out.push({rule,tube});};
  const ids=scenario.samples.map(s=>s.id);
  const present=ids.filter(id=>state.tubes[id].received);
  if(step>=1) {
    if(scenario.samples.some(s=>s.control&&!state.tubes[s.id].received))add('controls');
    if(present.length!==ids.length)add('receipt');
  }
  if(step>=2) for(const id of present) {
    const a=state.tubes[id].additions;
    for(const reagent of scenario.reagents) {
      const matches=a.filter(x=>x.reagent===reagent.id);
      if(!matches.length)add(reagent.missingRule,id);
      if(matches.length>1)add('duplicate',id);
    }
    const samples=a.filter(x=>x.reagent.startsWith('sample:'));
    if(samples.length!==1||samples[0]?.reagent!==`sample:${id}`)add('sample',id);
    if(a.some(x=>x.reused))add('tip',id);
    if(a.some(x=>scenario.reagents.find(r=>r.id===x.reagent)?.enzyme&&!x.cold))add('ice',id);
    const expected=[...scenario.reagents.map(r=>r.id),`sample:${id}`];
    // Missing ingredients get their own warning; order is checked independently.
    const ranks=a.map(x=>expected.indexOf(x.reagent)).filter(x=>x>=0);
    if(ranks.some((v,i)=>i>0&&v<ranks[i-1]))add('order',id);
  }
  if(step>=3) {
    for(const id of present) {
      if(!state.tubes[id].mixed)add('mix',id);
      if(!state.tubes[id].spun)add('spin',id);
    }
  }
  if(step>=4) {
    if(ids.some(id=>!state.pcrLoaded.includes(id)))add('pcrLoad');
    const p=state.program, limits=scenario.program.limits;
    if(!p.rtEnabled)add('rtDeleted');
    for(const [key,range] of Object.entries(limits)) {
      const v=Number(p[key]);
      if(!Number.isFinite(v)||v<range.min||v>range.max||(key==='cycles'&&!Number.isInteger(v)))
        add(key==='anneal'?(v<range.min?'annealLow':'annealHigh'):range.rule);
    }
  }
  if(step>=5) {
    if(!state.amplified)add('pcrRun');
    if(!state.lanes.includes('marker'))add('marker');
    if(state.lanes.some((id,i)=>id!==state.lanePlan[i])||state.lanes.some(id=>id===null))add('laneMismatch');
    if(state.polarity!=='normal')add('polarity');
  }
  return out;
}
export function nextIssues(state,scenario) {
  const out=issues(state,scenario);
  if(state.step===4&&!state.amplified)out.push({rule:'pcrRun',tube:''});
  if(state.step===5&&!state.gelRun)out.push({rule:'gelRun',tube:''});
  return out;
}
export function timeline(program) {
  const frames=[{phase:'rt',label:'역전사',temp:program.rt,cycle:0,duration:4000},
    {phase:'initial',label:'초기 변성',temp:program.initial,cycle:0,duration:2500}];
  for(let cycle=1;cycle<=program.cycles;cycle++)for(const [phase,label,key] of [['denature','변성','denature'],['anneal','결합','anneal'],['extend','연장','extend']])
    frames.push({phase,label,temp:program[key],cycle,duration:cycle<=2?1800:cycle===3?900:100});
  frames.push({phase:'final',label:'최종 연장',temp:program.final,cycle:program.cycles,duration:1800});
  let time=0;return frames.map(f=>({...f,start:time,end:time+=f.duration}));
}
export function frameAt(frames,time) {return frames.find(f=>time<f.end)||frames.at(-1);}
export function bands(scenario,id) {
  if(id==='marker')return scenario.markerBp;
  const sample=scenario.samples.find(s=>s.id===id);
  return sample?.bandsBp??(sample?.positive?[scenario.productBp]:[]);
}
