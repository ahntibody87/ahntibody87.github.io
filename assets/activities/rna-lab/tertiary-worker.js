import {loadAf3Weights,foldAf3} from './vendor/localfold/web/af3-model.js';
import {requestAlphaFoldDevice} from './vendor/localfold/src/runtime/device.js';
import {readRnaPdb} from './tertiary-core.js?v=2';
import {inspectGeometry,refineGeometry,writeCoordinates,rankCandidates,QUALITY_VERSION} from './tertiary-geometry.js?v=2';
let busy=false;
onmessage=async({data})=>{
  if(data.type!=='fold'||busy)return;
  busy=true;let device;const send=(type,detail={})=>postMessage({type,id:data.id,sequence:data.sequence,...detail});
  try{
    if(!/^[ACGU]{8,120}$/.test(data.sequence))throw Error('A·U·G·C 8~120개 서열을 먼저 적용하세요.');
    if(!navigator.gpu)throw Error('이 브라우저는 WebGPU를 지원하지 않습니다. 2차 구조 탐구는 계속 사용할 수 있습니다.');
    const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
    if(!adapter)throw Error('이 기기에서 3D 계산용 그래픽 장치를 사용할 수 없습니다.');
    device=await requestAlphaFoldDevice(adapter,{memoryBudgetBytes:1.5*1024**3});
    let gpuError=null;
    device.addEventListener('uncapturederror',e=>{gpuError=e.error.message;});
    device.lost.then(info=>{if(info.reason!=='destroyed')send('error',{message:'그래픽 장치 연결이 끊겼습니다. 더 짧은 서열로 다시 시도하세요.'});});
    send('status',{message:'예측 모델을 준비합니다. 처음 약 266 MiB를 내려받습니다.'});
    const family='rosettafold3';
    const weights=await loadAf3Weights(p=>send('download',{loaded:p.loadedBytes,total:p.totalBytes}),family);
    const started=performance.now(),candidates=[],seeds=[0,1,2];let reusable;
    for(const [index,seed] of seeds.entries()){
      send('status',{message:`입체 구조 후보 ${index+1}/${seeds.length}을 계산합니다.`});
      try{
        const result=await foldAf3({sequence:data.sequence,chainKinds:['rna'],alignment:null,weights,device,mode:'diffusion',calls:200,recycles:1,seed,maxMsaSequences:1,reuse:reusable,
          remark:['RNA STRUCTURE LAB - RoseTTAFold3 via LocalFold, int5','Single RNA sequence; no MSA or template. Prediction, not experiment.',`diffusion=200; recycles=1; seed=${seed}`],
          onStatus:()=>{},onProgress:value=>send('progress',{value:(index+value)/seeds.length,candidate:index+1,total:seeds.length})});
        if(gpuError)throw Error('기기에서 3D 계산을 완료하지 못했습니다: '+gpuError);
        if(!result.pdb||/NaN|Infinity/.test(result.pdb))throw Error('유효한 원자 좌표를 얻지 못했습니다.');
        reusable=result.reusable;
        const parsed=readRnaPdb(result.pdb);if(parsed.sequence!==data.sequence)throw Error('예측 좌표의 서열이 입력과 다릅니다.');
        send('status',{message:`후보 ${index+1}/${seeds.length}의 결합·당 고리·원자 충돌을 검사하고 작은 이상을 보정합니다.`});
        const refinement=refineGeometry(parsed.residues);
        const pdb=refinement.applied?writeCoordinates(result.pdb,refinement.residues,'BOUNDED GEOMETRIC CLEANUP <=0.301 ANGSTROM; NOT MD. pLDDT IS PRE-CLEANUP.'):result.pdb;
        const quality=inspectGeometry(readRnaPdb(pdb).residues);
        const candidate={seed,pdb,rawPdb:refinement.applied?result.pdb:undefined,quality,meanPlddt:Number.isFinite(result.meanPlddt)?result.meanPlddt:null,refinement:{applied:refinement.applied,maxDisplacement:refinement.maxDisplacement,iterations:refinement.iterations,before:refinement.before,after:quality}};
        candidates.push(candidate);
        send('candidate',{candidate:{seed,quality,refinement:candidate.refinement}});
      }catch(e){if(gpuError)throw e;candidates.push({seed,error:e.message||'후보 계산 실패'});send('candidate',{candidate:{seed,error:e.message||'후보 계산 실패'}});}
    }
    const summaries=candidates.map(({seed,quality,refinement,error})=>({seed,quality,refinement,error}));
    const best=rankCandidates(candidates)[0];
    if(!best){send('rejected',{candidates:summaries,seconds:(performance.now()-started)/1000,message:'세 후보 모두 구조 검사를 통과하지 못했습니다. 비정상적인 좌표를 정상 RNA 구조로 표시하지 않습니다. 다른 서열이나 위의 16개 염기 예측 연습을 시도해 보세요.'});return;}
    send('complete',{...best,candidates:summaries,seconds:(performance.now()-started)/1000,model:'RoseTTAFold3 / LocalFold int5',settings:{steps:200,recycles:1,seed:best.seed,seeds,qualityVersion:QUALITY_VERSION,cleanup:'bounded-geometric-0.3A'}});
  }catch(e){send('error',{message:e.message||'계산하지 못했습니다.'});}
  finally{device?.destroy();busy=false;}
};
