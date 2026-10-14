import {shape,pairing} from './grading.js?v=7';
export const GOAL='....((.((....)).))..((.((....)).))....';
export const TARGET='ACAA'+'GAGA'+'AA'+'UUUG'+'UACA';
export const TARGET_LENGTH=TARGET.length;
export const CUT_AFTER=8;
export const LEFT=[4,5,6,7],RIGHT=[10,11,12,13];
export const START='CAAAGGAGGUUACACCCCACCGAGCCCACGAGCGUCUC';
export const validSequence=s=>typeof s==='string'&&/^[ACGU]{8,80}$/.test(s);
export const complement={A:'U',U:'A',G:'C',C:'G'};
export function topology(structure){
 const mates=pairing(structure),stems=[],loops=[];
 function visit(i,j){const pairs=[];while(i<j&&mates[i]===j){pairs.push([i,j]);i++;j--;}stems.push(pairs);const children=[],unpaired=[];for(let k=i;k<=j;k++){if(mates[k]>k){children.push([k,mates[k]]);k=mates[k];}else unpaired.push(k);}if(children.length===1&&children[0][0]>i&&children[0][1]<j)loops.push(unpaired);children.forEach(([a,b])=>visit(a,b));}
 for(let i=0;i<mates.length;i++)if(mates[i]>i){visit(i,mates[i]);i=mates[i];}return {stems,loops};
}
export function gradeScissors(sequence,prediction){
 const hasPrediction=validSequence(sequence)&&prediction?.sequence===sequence;
 const current=hasPrediction?prediction.structure:null,parts=current?topology(current):{stems:[],loops:[]};
 const arm5=RIGHT.map((j,i)=>sequence[3-i]===complement[TARGET[j]]);
 const arm3=LEFT.map((j,i)=>sequence[sequence.length-1-i]===complement[TARGET[j]]);
 const leftOk=arm3.every(Boolean),rightOk=arm5.every(Boolean);
 const structureOk=!!current&&shape(current).text===shape(GOAL).text;
 const exposed=!!current&&current.slice(0,4)==='....'&&current.slice(-4)==='....';
 const checks=[hasPrediction,leftOk,rightOk,structureOk,exposed];
 return {...parts,hasPrediction,leftOk,rightOk,arm5,arm3,structureOk,exposed,shapePercent:Math.round(checks.filter(Boolean).length/5*100),solved:checks.every(Boolean)};
}
