import * as ort from './vendor/onnxruntime/ort.wasm.min.mjs';
import {MODEL_VERSION,features,initialState,advance,reconstruct,toPdb} from './rnabpflow-math.js';
let sessionPromise,constantsPromise;
export async function loadEngine(onDownload=()=>{}){
  ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
  ort.env.wasm.wasmPaths=new URL('./vendor/onnxruntime/',import.meta.url).href;
  constantsPromise??=fetch(new URL('./vendor/rnabpflow/constants.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('원자 구성 정보를 불러오지 못했습니다.');return r.json();});
  sessionPromise??=(async()=>{
    const response=await fetch(new URL('./vendor/rnabpflow/rnabpflow-casp16-f32.onnx',import.meta.url),{cache:'force-cache'});
    if(!response.ok)throw Error('예측 모델을 내려받지 못했습니다.');
    const total=Number(response.headers.get('Content-Length'))||68455757,reader=response.body.getReader(),chunks=[];let loaded=0;
    for(;;){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.length;onDownload(loaded,total);}
    const bytes=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    return ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
  })().catch(error=>{sessionPromise=null;throw error;});
  const [session,constants]=await Promise.all([sessionPromise,constantsPromise]);return {session,constants};
}
export async function denoise(session,sequence,structure,state,t){
  const n=sequence.length,{ss,onehot}=features(sequence,structure),f=(data,dims)=>new ort.Tensor('float32',data,dims);
  const out=await session.run({trans:f(state.trans,[1,n,3]),rot:f(state.rot,[1,n,3,3]),t:f(Float32Array.of(t),[1,1]),ss:f(ss,[1,n,n,3]),onehot:f(onehot,[1,n,4])});
  const result=Object.fromEntries(Object.entries(out).map(([key,value])=>[key,new Float32Array(value.data)]));
  Object.values(out).forEach(tensor=>tensor.dispose());return result;
}
export async function predict(sequence,structure,{onDownload,onProgress=()=>{},seed=420}={}){
  features(sequence,structure);const {session,constants}=await loadEngine(onDownload),started=performance.now();
  let state=initialState(sequence.length,seed),pred;
  const times=Float32Array.from({length:50},(_,i)=>.01+i*.99/49);
  for(let i=0;i<50;i++){
    pred=await denoise(session,sequence,structure,state,times[i]);
    if(Object.values(pred).some(array=>array.some(x=>!Number.isFinite(x))))throw Error('예측 계산에서 유효한 좌표를 얻지 못했습니다.');
    if(i<49)state=advance(state,pred,times[i],times[i+1]-times[i]);
    onProgress((i+1)/50);
  }
  return {pdb:toPdb(reconstruct(sequence,pred,constants)),model:'RNAbpFlow · CASP16',seconds:(performance.now()-started)/1000,settings:{engine:MODEL_VERSION,steps:50,seed,secondary:structure,conditioning:'single dot-bracket map repeated over three channels',rng:'mulberry32-boxmuller'}};
}
