// All times ms, voltages mV, currents pA, capacitance pF, conductance nS.
export const VERSION = '1.0.0';
export const DEFAULTS = Object.freeze({model:'lif',rest:-65,threshold:-55,reset:-65,tau:20,capacitance:200,refractory:2,adaptation:60,adaptTau:150,synTau:5,dt:0.1});
const clamp = (x,a,b) => Math.min(b,Math.max(a,x));
export function parameters(raw={}) {
  const p={...DEFAULTS};
  const bounds={rest:[-90,-40],threshold:[-70,-30],reset:[-90,-40],tau:[2,80],capacitance:[30,500],refractory:[1,8],adaptation:[0,200],adaptTau:[10,600],synTau:[0.5,20],dt:[0.025,0.2]};
  for(const [k,[a,b]] of Object.entries(bounds)) if(Number.isFinite(Number(raw[k]))) p[k]=clamp(Number(raw[k]),a,b);
  p.model=raw.model==='adaptive'?'adaptive':'lif';
  if(p.threshold<=p.rest+1) p.threshold=p.rest+1;
  p.reset=Math.min(p.reset,p.threshold-1);
  return p;
}
export function random(seed=42) {
  let s=Number(seed)>>>0;
  return () => {s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function gaussian(rng) {return Math.sqrt(-2*Math.log(Math.max(1e-12,rng())))*Math.cos(2*Math.PI*rng());}
export const isInput = n => n.role==='inputE'||n.role==='inputI';
export const isInhibitory = n => n.role==='inh'||n.role==='inputI';
export function preset(kind='summation') {
  const inhibitory=kind==='inhibition';
  return {version:VERSION,kind,duration:180,params:{...DEFAULTS},nodes:[{id:'a',label:'입력 A',role:'inputE',times:[20]},{id:'b',label:inhibitory?'억제 입력 B':'입력 B',role:inhibitory?'inputI':'inputE',times:[20]},{id:'out',label:'출력 뉴런',role:'exc',times:[]}],edges:[{from:'a',to:'out',weight:inhibitory?850:400,delay:1},{from:'b',to:'out',weight:400,delay:1}]};
}
export function validateCircuit(raw) {
  if(!raw||!Array.isArray(raw.nodes)||!Array.isArray(raw.edges)) throw Error('회로 파일 형식을 확인하세요.');
  if(raw.nodes.length<2||raw.nodes.length>12||raw.edges.length>48) throw Error('뉴런은 2~12개, 연결은 48개까지 사용할 수 있습니다.');
  const ids=new Set();
  const nodes=raw.nodes.map((n,i)=>{
    if(typeof n.id!=='string'||!/^[a-zA-Z0-9_-]{1,24}$/.test(n.id)||ids.has(n.id))throw Error('뉴런의 식별자가 잘못되었거나 중복됩니다.');
    ids.add(n.id);
    return {id:n.id,label:String(n.label||`뉴런 ${i+1}`).slice(0,32),role:['inputE','inputI','exc','inh'].includes(n.role)?n.role:'exc',times:(Array.isArray(n.times)?n.times:[]).slice(0,100).map(Number).filter(t=>Number.isFinite(t)&&t>=0&&t<=1000).sort((a,b)=>a-b)};
  });
  const duration=clamp(Number(raw.duration)||180,40,1000);
  const edges=raw.edges.map(e=>{
    if(!ids.has(e.from)||!ids.has(e.to))throw Error('연결의 시작과 끝 뉴런을 확인하세요.');
    if(isInput(nodes.find(n=>n.id===e.to)))throw Error('입력 뉴런은 정해진 발화 시점을 사용하므로 연결의 도착점이 될 수 없습니다.');
    const weight=Number(e.weight),delay=Number(e.delay);
    if(!Number.isFinite(weight)||weight<0||weight>2000||!Number.isFinite(delay)||delay<0.1||delay>40)throw Error('연결 강도는 0~2000 pA, 전달 지연은 0.1~40 ms입니다.');
    return {from:e.from,to:e.to,weight,delay};
  });
  return {version:VERSION,kind:String(raw.kind||'custom').slice(0,24),duration,params:parameters(raw.params),nodes,edges};
}
export function metrics(spikes,start=0,end=1000) {
  const s=spikes.filter(t=>t>=start&&t<end);
  const isi=s.slice(1).map((t,i)=>t-s[i]);
  const mean=isi.length?isi.reduce((a,b)=>a+b,0)/isi.length:null;
  const half=Math.max(1,Math.min(3,Math.floor(isi.length/2)));
  const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
  return {count:s.length,rate:s.length/Math.max(1e-9,(end-start)/1000),latency:s.length?s[0]-start:null,meanISI:mean,earlyISI:isi.length>=2?avg(isi.slice(0,half)):null,lateISI:isi.length>=2?avg(isi.slice(-half)):null,adaptRatio:isi.length>=2?avg(isi.slice(-half))/avg(isi.slice(0,half)):null,spikes:s};
}
export function simulateNetwork(raw,{seed=42,jitter=0,gainNoise=0,enabledInputs=null,record=true}={}) {
  const c=validateCircuit(raw),p=c.params,dt=p.dt,steps=Math.ceil(c.duration/dt),rng=random(seed);
  const index=new Map(c.nodes.map((n,i)=>[n.id,i]));
  const n=c.nodes.length,voltage=Array(n).fill(p.rest),adapt=Array(n).fill(0),refractory=Array(n).fill(-Infinity);
  const spikes=Array.from({length:n},()=>[]),traces=Array.from({length:n},()=>[]),arrivals=[];
  const queue=Array.from({length:steps+1},()=>[]);
  const outgoing=c.nodes.map(node=>c.edges.filter(e=>e.from===node.id));
  const syn=c.edges.map(e=>({target:index.get(e.to),current:0}));
  const edgeIndex=new Map(c.edges.map((e,i)=>[e,i]));
  const emit=(i,t)=>{
    spikes[i].push(t);
    for(const e of outgoing[i]) {
      const arrival=t+e.delay,step=Math.max(0,Math.round(arrival/dt));
      if(step<=steps) queue[step].push({ei:edgeIndex.get(e),value:(isInhibitory(c.nodes[i])?-1:1)*e.weight*Math.max(0,1+gainNoise*gaussian(rng))});
      if(record)arrivals.push({from:e.from,to:e.to,time:arrival,sign:isInhibitory(c.nodes[i])?-1:1});
    }
  };
  const scheduled=Array.from({length:steps+1},()=>[]);
  c.nodes.forEach((node,i)=>{if(isInput(node)&&(!enabledInputs||enabledInputs.includes(node.id)))for(const t of node.times){const eventTime=clamp(t+jitter*gaussian(rng),0,c.duration);scheduled[Math.min(steps,Math.round(eventTime/dt))].push(i);}});
  const leak=Math.exp(-dt/p.tau),synDecay=Math.exp(-dt/p.synTau),adaptDecay=Math.exp(-dt/p.adaptTau),g=p.capacitance/p.tau;
  const kernel=tau=>Math.abs(tau-p.tau)<1e-9?dt/p.tau*leak:tau/(tau-p.tau)*(Math.exp(-dt/tau)-leak);
  const synKernel=kernel(p.synTau),adaptKernel=kernel(p.adaptTau);
  const sampleEvery=Math.max(1,Math.round(0.2/dt)),time=[];
  for(let k=0;k<=steps;k++){
    const t=k*dt;
    for(const i of scheduled[k])emit(i,t);
    // Events emitted by an input at this step are available to this queue.
    for(const ev of queue[k])syn[ev.ei].current+=ev.value;
    if(record&&k%sampleEvery===0){time.push(t);for(let i=0;i<n;i++)traces[i].push(voltage[i]);}
    if(k===steps)break;
    const current=Array(n).fill(0);for(const s of syn)current[s.target]+=s.current;
    for(let i=0;i<n;i++){
      if(isInput(c.nodes[i]))continue;
      if(t<refractory[i])voltage[i]=p.reset;
      else {
        const next=p.rest+(voltage[i]-p.rest)*leak+current[i]/g*synKernel-adapt[i]/g*adaptKernel;
        if(next>=p.threshold){emit(i,t+dt);voltage[i]=p.reset;refractory[i]=t+dt+p.refractory;if(p.model==='adaptive')adapt[i]+=p.adaptation;}
        else voltage[i]=next;
      }
      adapt[i]*=adaptDecay;
    }
    for(const s of syn)s.current*=synDecay;
  }
  return {circuit:c,time,neurons:c.nodes.map((node,i)=>({...node,voltage:traces[i],spikes:spikes[i],...metrics(spikes[i],0,c.duration)})),arrivals,seed};
}
export function simulateCurrent(sweep,rawParams={}) {
  const p=parameters(rawParams),ts=sweep.timeMS,stim=sweep.stimulusPA;
  if(!Array.isArray(ts)||ts.length<2||!Array.isArray(stim)||ts.length!==stim.length)throw Error('기록의 시간과 자극 배열을 확인하세요.');
  let v=p.rest,w=0,until=-Infinity;
  const voltage=[v],spikes=[];const g=p.capacitance/p.tau;
  for(let k=1;k<ts.length;k++){
    const span=ts[k]-ts[k-1];if(span<0||span>100)throw Error('기록의 시간 간격이 잘못되었습니다.');
    const substeps=Math.max(1,Math.ceil(span/0.05)),dt=span/substeps,decay=Math.exp(-dt/p.tau),wd=Math.exp(-dt/p.adaptTau);
    for(let j=0;j<substeps;j++){
      const t=ts[k-1]+j*dt;
      if(t<until)v=p.reset;
      else {const steady=p.rest+(stim[k-1]-w)/g;v=steady+(v-steady)*decay;if(v>=p.threshold){spikes.push(t+dt);v=p.reset;until=t+dt+p.refractory;if(p.model==='adaptive')w+=p.adaptation;}}
      w*=wd;
    }
    voltage.push(v);
  }
  return {time:ts,voltage,spikes,...metrics(spikes,sweep.stimulusStartMS,sweep.stimulusEndMS)};
}
export function sweepCircuit(raw,{axis='delay',min=0,max=16,count=17,weightMin=200,weightMax=700,weightCount=11,seed=42,jitter=0,trials=1}={}){
  const c=validateCircuit(raw),target=c.nodes.findLast(n=>!isInput(n));
  if(!target||c.edges.length<2)throw Error('조건 비교에는 계산 뉴런과 연결 두 개가 필요합니다.');
  const xs=Array.from({length:count},(_,i)=>min+(max-min)*i/(count-1));
  const ys=Array.from({length:weightCount},(_,i)=>weightMin+(weightMax-weightMin)*i/(weightCount-1));
  const rows=[];
  for(const weight of ys)for(const x of xs){
    const cc=structuredClone(c);
    // Arrival offset is changed through input spike timing, leaving axonal delays fixed.
    const first=cc.nodes.find(n=>isInput(n)),second=cc.nodes.filter(isInput)[1];
    if(!first||!second)throw Error('시간 차이 비교에는 입력 뉴런 두 개가 필요합니다.');
    const base=first.times[0]??20;first.times=[base];second.times=[Math.max(0,base+x)];
    if(axis==='inhibition')cc.edges[1].weight=weight;else for(const e of cc.edges)if(!isInhibitory(cc.nodes.find(n=>n.id===e.from)))e.weight=weight;
    let hit=0,total=0;
    for(let j=0;j<trials;j++){const r=simulateNetwork(cc,{record:false,seed:seed+j,jitter});const m=r.neurons.find(n=>n.id===target.id);if(m.count>0)hit++;total+=m.count;}
    rows.push({x,weight,probability:hit/trials,count:total/trials});
  }
  return {xs,ys,rows,target:target.label,trials,jitter,seed};
}
// Two competition-free coincidence channels. This is an effective circuit, not an anatomical reconstruction.
export function soundCircuit(offsetMS=0,weight=370,inhWeight=0,inhDelay=0.5){
  const c=preset();c.duration=40;c.params={...DEFAULTS,tau:2,capacitance:50,threshold:-60.4,synTau:0.5,dt:0.025};
  c.nodes=[{id:'left',label:'왼쪽 입력',role:'inputE',times:[8]},{id:'right',label:'오른쪽 입력',role:'inputE',times:[8+offsetMS]},{id:'li',label:'왼쪽 억제',role:'inputI',times:[8]},{id:'ri',label:'오른쪽 억제',role:'inputI',times:[8+offsetMS]},{id:'dl',label:'왼쪽 검출',role:'exc',times:[]},{id:'dr',label:'오른쪽 검출',role:'exc',times:[]}];
  const add=(from,to,delay,w=weight)=>({from,to,weight:w,delay});
  c.edges=[add('left','dl',1.45),add('right','dl',1),add('left','dr',1),add('right','dr',1.45),add('li','dr',inhDelay,inhWeight),add('ri','dl',inhDelay,inhWeight)];
  return c;
}
export function soundExperiment({weight=370,inhWeight=0,inhDelay=0.5,jitter=0.05,seed=42,trials=20,spacing=0.2}={}){
  const angles=[-75,-60,-45,-30,-15,0,15,30,45,60,75];const rows=[];let correct=0,miss=0,falseResponse=0,ambiguous=0,total=0;
  for(const angle of angles){
    // Negative angle: source to the left, hence left ear event is earlier (positive right-minus-left delay).
    const offset=-spacing/343*Math.sin(angle*Math.PI/180)*1000;let hits=0,none=0,both=0,wrong=0;
    for(let j=0;j<trials;j++){
      const r=simulateNetwork(soundCircuit(offset,weight,inhWeight,inhDelay),{record:false,seed:seed+1000*(angle+90)+j,jitter});
      const l=r.neurons.find(n=>n.id==='dl').count>0,rr=r.neurons.find(n=>n.id==='dr').count>0;
      const answer=l&&rr?'both':l?'left':rr?'right':'none';const expected=angle<0?'left':angle>0?'right':'both';
      if(answer===expected){hits++;correct++;}else if(answer==='none'){none++;miss++;}else if(answer==='both'){both++;ambiguous++;}else{wrong++;falseResponse++;}total++;
    }
    rows.push({angle,offsetMS:offset,accuracy:hits/trials,miss:none/trials,ambiguous:both/trials,wrong:wrong/trials});
  }
  return {rows,correct,miss,falseResponse,ambiguous,total,trials,seed,jitter,spacing,accuracy:correct/total};
}
