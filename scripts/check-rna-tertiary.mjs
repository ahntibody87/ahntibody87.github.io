import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {readRnaPdb,dotPairs,comparePairs,geometricPairs,validateResult} from '../assets/activities/rna-lab/tertiary-core.js';
assert.deepEqual(dotPairs('((....))'),[[1,6],[0,7]]);
assert.throws(()=>dotPairs('((....).'));
assert.deepEqual(comparePairs([[0,7],[1,6]],[[0,7],[2,5]]),{shared:[[0,7]],only2d:[[1,6]],only3d:[[2,5]]});
// Independent synthetic donor geometry: reject stacking and distant contacts.
const a={base:'A',atoms:{N1:[0,0,0],C2:[1,0,0],C6:[0,1,0],N6:[0,2,0],"C1'":[-4,0,0]}};
const u={base:'U',atoms:{N1:[3,0,0],C2:[4,0,0],C6:[3,1,0],N3:[2.9,0,0],O4:[2.9,2,0],"C1'":[6,0,0]}};
const blank={base:'C',atoms:{}};
assert.deepEqual(geometricPairs([a,blank,blank,blank,u]),[[0,4]]);
const stacked=structuredClone(u);for(const p of Object.values(stacked.atoms))p[2]+=3.4;
assert.deepEqual(geometricPairs([a,blank,blank,blank,stacked]),[]);
assert.throws(()=>readRnaPdb('ATOM NaN'));
assert.throws(()=>validateResult({format:'rna-lab-3d-v1',sequence:'AAAAAAAA',model:'test',pdb:''},'GGGGCCCC'));
// Walk the shipped imports rather than trusting the vendor copy inventory.
const root=path.resolve('assets/activities/rna-lab/vendor/localfold');
let count=0;function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(f.endsWith('.js')){count++;for(const m of fs.readFileSync(f,'utf8').matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"](\.[^'"]+)['"]/g))assert.ok(fs.existsSync(path.resolve(path.dirname(f),m[1])),`Missing ${f}: ${m[1]}`);}}}walk(root);
console.log(`3D 검사 통과: 구조 비교, 잘못된 파일 거부, 겹친 염기 배제, ${count}개 엔진 모듈 연결`);
