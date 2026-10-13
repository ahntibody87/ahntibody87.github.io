// Compare structural shape, independent of absolute nucleotide positions.
// A ribozyme pass certifies design constraints, not biochemical activity.
export function pairing(structure) {
  const mates = Array(structure.length).fill(-1), stack = [];
  for (let i = 0; i < structure.length; i++) {
    if (structure[i] === '(') stack.push(i);
    else if (structure[i] === ')') {
      const j = stack.pop();
      if (j === undefined) throw new Error('Unbalanced structure');
      mates[i] = j; mates[j] = i;
    } else if (structure[i] !== '.') throw new Error('Invalid structure');
  }
  if (stack.length) throw new Error('Unbalanced structure');
  return mates;
}

export function shape(structure) {
  pairing(structure); // Validate before normalizing.
  let depth=0;const indices=[];
  for(let i=0;i<structure.length;i++){
    const c=structure[i];
    if(c==='(')depth++;
    if(c!=='.'||depth>0)indices.push(i);
    if(c===')')depth--;
  }
  // Exterior tails and unpaired spacers can move a motif without changing it.
  // Interior loops, bulges, stem lengths and branch order remain significant.
  return {text:indices.map(i=>structure[i]).join(''),indices};
}

function alignShapes(a,b){
  const cost=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++)cost[i][0]=i;
  for(let j=0;j<=b.length;j++)cost[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)
    cost[i][j]=Math.min(cost[i-1][j]+1,cost[i][j-1]+1,cost[i-1][j-1]+Number(a[i-1]!==b[j-1]));
  const matches=[];let i=a.length,j=b.length;
  while(i||j){
    if(i&&j&&cost[i][j]===cost[i-1][j-1]+Number(a[i-1]!==b[j-1])){
      if(a[i-1]===b[j-1])matches.push([i-1,j-1]);i--;j--;
    }else if(i&&cost[i][j]===cost[i-1][j]+1)i--;else j--;
  }
  return {matches,distance:cost[a.length][b.length]};
}

export function gradeMission(mission, sequence, structure = null) {
  const lengthOk = sequence.length === mission.target.length;
  const complete = lengthOk && /^[ACGU]+$/.test(sequence);
  const assigned = [...sequence].filter(base => /[ACGU]/.test(base)).length;
  const lockedOk = lengthOk && mission.locked.every(i => sequence[i] === mission.start[i]);
  const changes = [...sequence].filter((base, i) => base !== mission.start[i]).length;
  const budgetOk = mission.maxChanges == null || changes <= mission.maxChanges;
  const target = pairing(mission.target);
  const targetPairs = target.flatMap((j, i) => j > i ? [[i, j]] : []);
  const hasPrediction = complete && typeof structure === 'string' && structure.length === sequence.length;
  const current = hasPrediction ? pairing(structure) : null;
  const wanted=shape(mission.target),actual=hasPrediction?shape(structure):{text:'',indices:[]};
  const aligned=alignShapes(wanted.text,actual.text);
  const nodeMap=new Map(aligned.matches.map(([i,j])=>[wanted.indices[i],actual.indices[j]]));
  const matchedPairs=current?targetPairs.filter(([i,j])=>nodeMap.has(i)&&nodeMap.has(j)&&current[nodeMap.get(i)]===nodeMap.get(j)):[];
  const missing=targetPairs.filter(pair=>!matchedPairs.includes(pair));
  const matchedCurrentPairs=new Set(matchedPairs.map(([i,j])=>`${nodeMap.get(i)}-${nodeMap.get(j)}`));
  const extra=current?current.flatMap((j,i)=>j>i&&!matchedCurrentPairs.has(`${i}-${j}`)?[[i,j]]:[]):[];
  let mismatches=current?[...new Set([...actual.indices.filter(i=>![...nodeMap.values()].includes(i)),...extra.flat(),...missing.flatMap(pair=>pair.flatMap(i=>nodeMap.has(i)?[nodeMap.get(i)]:[]))])]:[];
  const total=Math.max(wanted.text.length,actual.text.length,1);
  const correct=hasPrediction?total-aligned.distance:0;
  const shapePercent=hasPrediction?Math.round(correct/total*100):0;
  const structureOk=hasPrediction&&wanted.text===actual.text;
  if(hasPrediction&&!structureOk&&!mismatches.length)mismatches=[...actual.indices];
  return {complete, assigned, lockedOk, changes, budgetOk, hasPrediction, structureOk,
    correct, total, shapePercent, nodeMap, mismatches, missing, extra, targetPairs,
    solved: structureOk && lockedOk && budgetOk};
}
