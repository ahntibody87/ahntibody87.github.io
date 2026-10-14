// Fictional classroom model: no natural target or catalytic sequence.
// Predict the entire joined teaching model as ONE chain, not a cofold.
import {gradeMission, pairing} from './grading.js?v=6';
export const GOAL='(((..(((....)))..)))....(((..(((....)))..)))';
export const TARGET='CAUCAGCA';
export const TARGET_LENGTH=TARGET.length;
export const CUT_AFTER=3;
export const START='CAUCAGCAACACUGACAAUAACACUGCCAAUGACACCAACAGAA';
export const LOCKED=Array.from({length:TARGET_LENGTH},(_,i)=>i);
export const LOOP_A=[3,4,15,16];
export const LOOP_B=[27,28,39,40];
export const validSequence=s=>typeof s==='string'&&s.length===GOAL.length&&/^[ACGU]+$/.test(s)&&s.startsWith(TARGET);
export function topology(structure){
  const mates=pairing(structure),stems=[],loops=[];
  function visit(i,j){
    const pairs=[];
    while(i<j&&mates[i]===j){pairs.push([i,j]);i++;j--;}
    stems.push(pairs);
    const children=[],unpaired=[];
    for(let k=i;k<=j;k++){
      if(mates[k]>k){children.push([k,mates[k]]);k=mates[k];}
      else unpaired.push(k);
    }
    if(children.length===1&&children[0][0]>i&&children[0][1]<j)loops.push(unpaired);
    children.forEach(([a,b])=>visit(a,b));
  }
  for(let i=0;i<mates.length;i++)if(mates[i]>i){visit(i,mates[i]);i=mates[i];}
  return {stems,loops};
}
export function gradeScissors(sequence,prediction){
  const current=prediction?.sequence===sequence?prediction.structure:null;
  const grade=gradeMission({target:GOAL,start:START,locked:LOCKED},sequence,current);
  const shape=current?topology(current):{stems:[],loops:[]};
  const targetOk=grade.structureOk&&LOCKED.every(i=>grade.nodeMap.get(i)===i);
  return {...grade,...shape,targetOk,solved:validSequence(sequence)&&grade.solved&&targetOk};
}
