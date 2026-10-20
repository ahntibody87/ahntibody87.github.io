import {sweepCircuit,soundExperiment} from './engine.mjs?v=2';
self.onmessage=({data})=>{try{const result=data.type==='sound'?soundExperiment(data.options):sweepCircuit(data.circuit,data.options);self.postMessage({id:data.id,result});}catch(e){self.postMessage({id:data.id,error:e.message});}};
