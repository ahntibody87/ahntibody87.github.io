import { loadEsmfold2Weights, languageModelRunner } from './vendor/localfold/web/esmfold2-model.js';
import { foldEsmfold2 } from './vendor/localfold/src/esmfold2/fold.js';
import { toDensePositions } from './vendor/localfold/src/esmfold2/featurise.js';
import { requestAlphaFoldDevice } from './vendor/localfold/src/runtime/device.js';
import { GpuBufferAllocator } from './vendor/localfold/src/runtime/allocator.js';

const THREE={A:'ALA',R:'ARG',N:'ASN',D:'ASP',C:'CYS',Q:'GLN',E:'GLU',G:'GLY',H:'HIS',I:'ILE',L:'LEU',K:'LYS',M:'MET',F:'PHE',P:'PRO',S:'SER',T:'THR',W:'TRP',Y:'TYR',V:'VAL'};
const MODEL='ESMFold2 Experimental Fast 300M / LocalFold';
let device,loaded,busy=false;
const send=(type,detail={})=>postMessage({type,...detail});

function pdbOf(result,sequence){
  const f=result.features,b=f.batch,positions=toDensePositions(f,result.coordinates);
  const plddt=result.confidence?.plddt;
  const lines=[`HEADER    PROTEIN DESIGN LAB PREDICTION`,`REMARK   1 MODEL ${MODEL}`,
    'REMARK   1 QUANTIZED EXPERIMENTAL CHECKPOINT. NOT ESMFOLD V1 OR FULL 6B.',
    'REMARK   1 B-FACTOR: pLDDT 0-100 FROM SYNTHYRA CONFIDENCE HEAD.'];
  let serial=1;
  for(let t=0;t<b.tokens;t++)for(let a=0;a<b.dense;a++){
    const slot=t*b.dense+a;if(!b.predDenseAtomMask[slot])continue;
    let name='';const names=b.displayAtomNameChars??b.refAtomNameChars;
    for(let c=0;c<4;c++){const code=names[slot*4+c];if(code>0)name+=String.fromCharCode(code+32);}
    name=name.trim();const xyz=Array.from(positions.subarray(slot*3,slot*3+3));
    if(xyz.some(v=>!Number.isFinite(v)))throw Error('예측 좌표가 올바르지 않습니다.');
    const atom=name.length<4?(' '+name).padEnd(4):name.slice(0,4);
    const element=name.replace(/[0-9]/g,'')[0];
    lines.push('ATOM  '+String(serial++).padStart(5)+' '+atom+' '+THREE[sequence[t]]+' A'+String(t+1).padStart(4)+'    '+xyz.map(v=>v.toFixed(3).padStart(8)).join('')+'  1.00'+((plddt?.[t]??0)*100).toFixed(2).padStart(6)+'          '+element.padStart(2)+'  ');
  }
  lines.push('TER','END');return lines.join('\n')+'\n';
}

async function prepare(){
  if(!device){
    if(!navigator.gpu)throw Error('이 브라우저에서 WebGPU를 지원하지 않습니다. 최신 Chrome 또는 Edge에서 열어 주세요.');
    const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});
    if(!adapter)throw Error('사용할 수 있는 그래픽 장치를 찾지 못했습니다. 이 기기에서는 PDB 파일을 불러와 구조를 관찰·비교할 수 있습니다.');
    device=await requestAlphaFoldDevice(adapter,{memoryBudgetBytes:1.4*1024**3});
    device.lost.then(info=>{send('device-lost',{message:info.message||'그래픽 장치 연결이 끊겼습니다.'});device=null;loaded=null;});
    device.addEventListener('uncapturederror',event=>send('gpu-error',{message:event.error.message}));
  }
  if(!loaded){
    send('phase',{text:'예측 모델을 내려받고 있습니다. 처음 한 번 약 270 MB가 필요합니다.'});
    loaded=await loadEsmfold2Weights(p=>send('download',{loaded:p.loadedBytes,total:p.totalBytes}),{family:'ef2-fast-300m',languageModel:true});
  }
}

onmessage=async({data})=>{
  if(data.type!=='fold'||busy)return;busy=true;
  try{
    if(!/^[ACDEFGHIKLMNPQRSTVWY]{10,256}$/.test(data.sequence))throw Error('20종 아미노산의 1레터 코드로 10~256개를 입력하세요.');
    await prepare();send('phase',{text:'서열의 특징을 읽고 입체 구조를 계산하고 있습니다.'});
    let last=0;
    const result=await foldEsmfold2(device,{
      sequence:data.sequence,weights:loaded.weights,shape:loaded.shape,confidenceWeights:loaded.confidenceWeights,
      tower:languageModelRunner(device,new GpuBufferAllocator(device),loaded,loaded.shape.pairChannels),
      sampler:'diffusion-15',seed:0,languageModel:true,languageModelMiB:loaded.language.megabytes,
      onProgress:f=>{const now=performance.now();if(now-last>250){last=now;send('progress',{value:f});}},
      onStatus:text=>send('engine-status',{text}),
    });
    const pdb=pdbOf(result,data.sequence);
    const confidence=result.confidence;
    const plddt=confidence?Array.from(confidence.plddt,v=>v*100):null;
    send('complete',{pdb,sequence:data.sequence,model:MODEL,plddt,meanPlddt:plddt?.reduce((a,b)=>a+b,0)/plddt?.length,ptm:confidence?.ptm,elapsed:result.elapsedMilliseconds,seed:0});
  }catch(error){send('error',{message:error.message||String(error)});}
  finally{busy=false;}
};
