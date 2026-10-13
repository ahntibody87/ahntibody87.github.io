// Grade pairing relationships, never an answer sequence or drawing coordinates.
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
  const mismatches = current ? current.flatMap((j, i) => j !== target[i] ? [i] : []) : [];
  const missing = current ? targetPairs.filter(([i, j]) => current[i] !== j) : targetPairs;
  const extra = current ? current.flatMap((j, i) => j > i && target[i] !== j ? [[i, j]] : []) : [];
  const correct = current ? sequence.length - mismatches.length : 0;
  const structureOk = hasPrediction && mismatches.length === 0;
  return {complete, assigned, lockedOk, changes, budgetOk, hasPrediction, structureOk,
    correct, mismatches, missing, extra, targetPairs,
    solved: structureOk && lockedOk && budgetOk};
}
