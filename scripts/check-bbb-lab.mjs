import assert from 'node:assert/strict';
import {defaults,neutralFraction,permeability,experiment,simulate} from '../assets/activities/bbb-lab/model.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(const kind of ['acid','base'])near(neutralFraction(kind,7.4,7.4),.5);
near(neutralFraction('base',7,8),10/11);near(neutralFraction('acid',7,8),1/11);
near(neutralFraction('neutral',11,6),1);
const neutral={...defaults,kind:'neutral'};
assert.ok(permeability({...neutral,psa:40}).rate>permeability({...neutral,psa:140}).rate);
assert.ok(permeability({...neutral,mw:200}).rate>permeability({...neutral,mw:800}).rate);
assert.ok(permeability({...neutral,hbd:0}).rate>permeability({...neutral,hbd:6}).rate);
assert.ok(permeability({...neutral,logp:2}).rate>permeability({...neutral,logp:6}).rate);
assert.ok(permeability({...defaults,pka:6}).rate>permeability({...defaults,pka:10}).rate);
for(const kind of ['acid','base','neutral'])for(const route of ['mask','carrier'])for(const blood of ['stable','fragile'])for(const release of ['slow','fast'])for(const ph of [6,9])for(const pka of [3,11]){
  const samples=simulate({...defaults,kind,route,blood,release,ph,pka,logp:6,mw:800,psa:180,hbd:6},true);
  assert.equal(samples.length,121);
  for(const {y} of samples){near(y.reduce((a,b)=>a+b,0),100);assert.ok(y.every(v=>Number.isFinite(v)&&v>=-1e-9));}
}
const quick=simulate({...defaults,release:'fast'},true).at(-1).y;
const slow=simulate({...defaults,release:'slow'},true).at(-1).y;
assert.ok(quick[4]>slow[4]);assert.ok(quick[5]<slow[5]);
const ex=experiment({...defaults,pro:true});
assert.deepEqual(ex.direct,simulate(defaults,false));
near(ex.selected[0].y[1],100);near(ex.direct[0].y[0],100);
console.log('BBB: 산·염기 평형, 물성 경향, 96개 극한 조건의 물질량 보존, 전구약물 활성화·비교군 검사 통과');
