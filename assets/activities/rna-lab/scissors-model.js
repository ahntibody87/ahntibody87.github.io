// Minimal trans-cleaving hammerhead teaching scaffold. This checks design
// constraints, never catalytic activity or a two-strand thermodynamic fold.
// https://doi.org/10.1038/334585a0
// https://doi.org/10.1186/1471-2105-8-469
export const TARGETS = [
  {id:'signal', name:'신호 단백질의 mRNA', left:'ACAGGU', cut:'C', right:'AUGCUA', purpose:'신호 단백질의 생산을 줄이는 RNA 가위를 구상해 보세요.'},
  {id:'pigment', name:'색소 합성 효소의 mRNA', left:'UGACGU', cut:'C', right:'CUAGAC', purpose:'색소 합성 효소의 생산을 줄이면 어떤 변화가 생길지 상상해 보세요.'},
  {id:'reporter', name:'형광 단백질의 mRNA', left:'CAGUGU', cut:'C', right:'GACUAG', purpose:'형광 단백질의 생산을 줄이는 스위치를 구상해 보세요.'}
];
export const COMPLEMENT = {A:'U', U:'A', G:'C', C:'G'};
export const reverseComplement = s => [...s].reverse().map(b=>COMPLEMENT[b] || 'N').join('');
export const INITIAL_DESIGN = Object.freeze({arm5:'NNNNNN', arm3:'NNNNNN', stem5:'GNNN', stem3:'NNNC'});
export const HAIRPIN_STRUCTURE = '((((....))))';
export function hairpinSequence(d){return d.stem5+'GAAA'+d.stem3;}
export function ribozymeSequence(d){return d.arm5+'CUGAUGA'+hairpinSequence(d)+'GAA'+d.arm3;}
export function validDesign(d){
  return !!d && ['arm5','arm3'].every(k=>typeof d[k]==='string'&&/^[ACGUN]{6}$/.test(d[k])) &&
    /^G[ACGUN]{3}$/.test(d.stem5) && /^[ACGUN]{3}C$/.test(d.stem3);
}
export function gradeScissors(target,d,prediction=null){
  const arm5Pairs=[...target.right].map((base,i)=>COMPLEMENT[base]===d.arm5[5-i]);
  const arm3Pairs=[...target.left].map((base,i)=>COMPLEMENT[base]===d.arm3[5-i]);
  const stemPairs=[...d.stem5].map((base,i)=>COMPLEMENT[base]===d.stem3[3-i]);
  const complete=validDesign(d)&&!ribozymeSequence(d).includes('N');
  const hairpin=hairpinSequence(d);
  const predicted=prediction?.sequence===hairpin;
  const hairpinOk=predicted&&prediction.structure===HAIRPIN_STRUCTURE;
  const leftOk=arm3Pairs.every(Boolean),rightOk=arm5Pairs.every(Boolean),stemOk=stemPairs.every(Boolean);
  return {complete,leftOk,rightOk,stemOk,hairpinOk,predicted,arm5Pairs,arm3Pairs,stemPairs,
    solved:complete&&leftOk&&rightOk&&stemOk&&hairpinOk};
}
