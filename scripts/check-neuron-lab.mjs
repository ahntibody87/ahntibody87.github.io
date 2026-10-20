import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {preset,simulateNetwork,simulateCurrent,metrics,validateCircuit,soundExperiment,sweepCircuit,parameters} from '../assets/activities/neuron-lab/engine.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=r=>r.neurons.find(n=>n.id==='out');
const c=preset();
assert.equal(output(simulateNetwork(c,{enabledInputs:['a']})).count,0,'subthreshold A alone');
assert.equal(output(simulateNetwork(c,{enabledInputs:['b']})).count,0,'subthreshold B alone');
assert.equal(output(simulateNetwork(c)).count,1,'simultaneous subthreshold inputs sum above threshold');
const separated=structuredClone(c);separated.edges[1].delay=20;
assert.equal(output(simulateNetwork(separated)).count,0,'separated EPSPs do not reach threshold');
const inhib=preset('inhibition');
assert.ok(output(simulateNetwork(inhib,{enabledInputs:['a']})).count>0,'excitation control fires');
assert.equal(output(simulateNetwork(inhib)).count,0,'simultaneous inhibition suppresses');
inhib.edges[1].delay=20;
assert.ok(output(simulateNetwork(inhib)).count>0,'late inhibition cannot cancel an emitted spike');
const noInput=simulateNetwork(c,{enabledInputs:[]});
assert.ok(noInput.neurons.every(n=>n.spikes.length===0),'no spontaneous spikes at rest');
assert.ok(output(noInput).voltage.every(v=>Math.abs(v+65)<1e-10),'rest is stationary');

// Analytical response to an exponentially decaying PSC: a biological unit/sign check.
const single=simulateNetwork(c,{enabledInputs:['a']});const out=output(single);
let error=0;single.time.forEach((t,i)=>{const s=t-21;const expected=s<=0?-65:-65+400/(200/20)*5/(5-20)*(Math.exp(-s/5)-Math.exp(-s/20));error=Math.max(error,Math.abs(out.voltage[i]-expected));});
assert.ok(error<1e-8,`exponential PSC response matches exact passive solution, error ${error}`);
const finer=structuredClone(c);finer.params.dt=.05;
assert.equal(output(simulateNetwork(finer)).count,output(simulateNetwork(c)).count,'spike count stable on time-step halving');
assert.ok(Math.abs(output(simulateNetwork(finer)).spikes[0]-output(simulateNetwork(c)).spikes[0])<.2,'spike time stable within integration resolution');
const noisy={seed:173,jitter:1.2};
assert.deepEqual(simulateNetwork(c,noisy).neurons.map(n=>n.spikes),simulateNetwork(c,noisy).neurons.map(n=>n.spikes),'seeded noise reproducibility');
assert.notDeepEqual(simulateNetwork(c,{...noisy,seed:174}).neurons.map(n=>n.spikes),simulateNetwork(c,noisy).neurons.map(n=>n.spikes),'seed affects jitter');
const dt=.1,times=Array.from({length:12001},(_,i)=>i*dt);
const stimulus=times.map(t=>t>=100&&t<1100?250:0),sweep={timeMS:times,stimulusPA:stimulus,stimulusStartMS:100,stimulusEndMS:1100};
const lif=simulateCurrent(sweep),adaptive=simulateCurrent(sweep,{model:'adaptive'});
assert.ok(lif.count>adaptive.count&&adaptive.count>1,'adaptation reduces sustained firing');
assert.ok(Math.abs(lif.lateISI-lif.earlyISI)<.1,'basic LIF has no spike-frequency adaptation');
assert.ok(adaptive.lateISI>adaptive.earlyISI,'spike-triggered adaptation lengthens intervals');
assert.ok(lif.spikes.slice(1).every((t,i)=>t-lif.spikes[i]>=2),'absolute refractory period');
const linear=simulateCurrent({...sweep,stimulusPA:times.map(t=>t>=100&&t<1100?10:0)});
assert.equal(linear.count,0,'weak injected current remains subthreshold');
assert.ok(Math.abs(linear.voltage[10000]-(-64))<.001,'pA/pF/nS unit conversion');
assert.throws(()=>validateCircuit({...c,nodes:[c.nodes[0],c.nodes[0]]}),/중복/);
assert.throws(()=>validateCircuit({...c,edges:[{from:'a',to:'b',weight:100,delay:1}]}),/입력 뉴런/);
assert.throws(()=>validateCircuit({...c,edges:[{from:'a',to:'out',weight:-20,delay:1}]}),/강도/);
assert.ok(parameters({threshold:-90,rest:-50}).threshold>-50,'threshold ordering');
const grid=sweepCircuit(c,{count:3,weightCount:3,min:0,max:16,weightMin:200,weightMax:600});
assert.equal(grid.rows.length,9);assert.ok(grid.rows.some(r=>r.count===0)&&grid.rows.some(r=>r.count>0),'sweep includes firing and nonfiring conditions');
const sound=soundExperiment({weight:370,jitter:.05});
assert.ok(sound.accuracy>.7,'auditory effective circuit distinguishes direction');
assert.ok(soundExperiment({weight:200}).miss>sound.miss,'weak excitation misses responses');
assert.ok(soundExperiment({weight:600}).ambiguous>sound.ambiguous,'strong excitation increases both-channel responses');
assert.deepEqual(sound,soundExperiment({weight:370,jitter:.05}),'auditory trials reproducible');
assert.equal(sound.correct+sound.miss+sound.falseResponse+sound.ambiguous,sound.total,'auditory classification partitions all trials');

const data=JSON.parse(fs.readFileSync(path.join(root,'assets/activities/neuron-lab/data/allen-recordings.json'),'utf8'));
assert.equal(data.schemaVersion,1);assert.equal(data.cells.length,2);assert.match(data.source.license,/Allen/);
for(const cell of data.cells){
 assert.match(cell.rawDataSha256,/^[a-f0-9]{64}$/);assert.ok(cell.sweeps.some(s=>s.role==='fit')&&cell.sweeps.some(s=>s.role==='test'));
 for(const s of cell.sweeps){
  assert.equal(s.timeMS.length,s.voltageMV.length);assert.equal(s.timeMS.length,s.stimulusPA.length);
  assert.ok(s.timeMS.every((t,i)=>Number.isFinite(t)&&(!i||t>s.timeMS[i-1])),'nonuniform times are strictly ordered');
  assert.ok(s.voltageMV.every(Number.isFinite));assert.ok(s.stimulusPA.every(Number.isFinite));
  const m=metrics(s.spikeTimesMS,s.stimulusStartMS,s.stimulusEndMS);
  assert.equal(m.count,s.metrics.spikeCount,'source spike counts');
  assert.ok(s.peakTimesMS.every(t=>s.timeMS.includes(t)),'original AP peaks retained');
  const simulation=simulateCurrent(s,{rest:s.baselineMV,reset:s.baselineMV,threshold:-50,tau:40,capacitance:100});
  assert.equal(simulation.voltage.length,s.timeMS.length);assert.ok(simulation.voltage.every(Number.isFinite),'nonuniform stimulus integration finite');
 }
}
const adaptationData=data.cells[1].sweeps.at(-1);const m=metrics(adaptationData.spikeTimesMS,100,1100);
assert.ok(m.lateISI/m.earlyISI>1.8,'real adaptation example');
const html=fs.readFileSync(path.join(root,'content/advanced-life-science/regulation-defense/neuron-lab.html'),'utf8');
const js=fs.readFileSync(path.join(root,'assets/activities/neuron-lab/lab.mjs'),'utf8');
for(const id of [...js.matchAll(/\$\('([a-zA-Z0-9_-]+)'\)/g)].map(m=>m[1])){
 if(['grid-readout','sound-circuit'].includes(id))continue;
 assert.ok(html.includes(`id="nl-${id}"`),`UI hook exists: ${id}`);
}
assert.ok(!js.includes('eval(')&&!js.includes('new Function('),'no dynamic execution of imported configuration');
console.log('신경회로 검사 통과: 가중·억제·정확해·계산간격·불응기·적응·시드·청각 판별·실측 10조건·UI 연결');
