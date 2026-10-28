import {predict} from './rnabpflow-engine.js';
import {readRnaPdb} from './tertiary-core.js?v=2';
import {inspectGeometry,refineGeometry,writeCoordinates} from './tertiary-geometry.js?v=2';
let busy=false;
onmessage=async({data})=>{
  if(data.type!=='fold'||busy)return;busy=true;
  const send=(type,detail={})=>postMessage({type,id:data.id,sequence:data.sequence,...detail});
  try{
    send('status',{message:'RNAbpFlow 모델을 준비합니다…'});
    const result=await predict(data.sequence,data.structure,{onDownload:(loaded,total)=>send('download',{loaded,total}),onProgress:value=>send('progress',{value})});
    const parsed=readRnaPdb(result.pdb);if(parsed.sequence!==data.sequence)throw Error('예측 좌표와 입력 서열이 다릅니다.');
    send('status',{message:'골격과 원자 충돌을 확인합니다…'});
    const refinement=refineGeometry(parsed.residues),rawPdb=result.pdb;
    if(refinement.applied)result.pdb=writeCoordinates(rawPdb,refinement.residues,'BOUNDED GEOMETRIC CLEANUP <=0.301 ANGSTROM; NOT MOLECULAR DYNAMICS.');
    const quality=inspectGeometry(readRnaPdb(result.pdb).residues);
    send('complete',{...result,rawPdb:refinement.applied?rawPdb:undefined,quality,refinement:{applied:refinement.applied,maxDisplacement:refinement.maxDisplacement}});
  }catch(error){send('error',{message:error.message||'예측을 완료하지 못했습니다.'});}
  finally{busy=false;}
};
