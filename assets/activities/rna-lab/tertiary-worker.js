import {loadAf3Weights,foldAf3} from './vendor/localfold/web/af3-model.js';
import {requestAlphaFoldDevice} from './vendor/localfold/src/runtime/device.js';
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
    send('status',{message:'서열에서 입체 구조를 예측하고 있습니다.'});
    const result=await foldAf3({sequence:data.sequence,chainKinds:['rna'],alignment:null,weights,device,mode:'diffusion',calls:200,recycles:1,seed:0,maxMsaSequences:1,
      remark:['RNA STRUCTURE LAB - RoseTTAFold3 via LocalFold, int5','Single RNA sequence; no MSA or template. Prediction, not experiment.','diffusion=200; recycles=1; seed=0'],
      onStatus:()=>{},onProgress:value=>send('progress',{value})});
    if(gpuError)throw Error('기기에서 3D 계산을 완료하지 못했습니다: '+gpuError);
    if(!result.pdb||/NaN|Infinity/.test(result.pdb))throw Error('유효한 원자 좌표를 얻지 못했습니다.');
    send('complete',{pdb:result.pdb,seconds:result.seconds,meanPlddt:Number.isFinite(result.meanPlddt)?result.meanPlddt:null,model:'RoseTTAFold3 / LocalFold int5',settings:{steps:200,recycles:1,seed:0}});
  }catch(e){send('error',{message:e.message||'계산하지 못했습니다.'});}
  finally{device?.destroy();busy=false;}
};
