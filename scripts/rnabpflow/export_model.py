# RNAbpFlow ONNX export and parity validation. GPL-3.0.
# Use only the official, checksum-verified CASP16 checkpoint.
import pathlib,sys,types,json,time,argparse,hashlib
parser=argparse.ArgumentParser()
parser.add_argument('--checkpoint',type=pathlib.Path,required=True)
parser.add_argument('--output',type=pathlib.Path,required=True)
args=parser.parse_args()
expected='8ed7deadcea6a7fd025454ab8a4ef542d6d9c4a4365ef7319fc17b5b1d599a66'
assert hashlib.sha256(args.checkpoint.read_bytes()).hexdigest()==expected,'Unexpected checkpoint checksum'
args.output.mkdir(parents=True,exist_ok=True)
repo=pathlib.Path(__file__).resolve().parents[2]
root=args.output
sys.path.insert(0,str(repo/'assets/activities/rna-lab/vendor/rnabpflow/source'))
scatter=types.ModuleType('torch_scatter')
def unavailable(*a,**k):raise RuntimeError('Training-only scatter called')
scatter.scatter=scatter.scatter_add=unavailable;sys.modules['torch_scatter']=scatter
import torch,numpy as np,onnxruntime as ort,onnx
from omegaconf import OmegaConf
from src.models.flow_model import FlowModel
from src.data import rigid_utils as ru
torch.set_num_threads(4);torch.backends.mha.set_fastpath_enabled(False)
ck=torch.load(args.checkpoint,map_location='cpu',weights_only=False)
cfg=OmegaConf.create(ck['hyper_parameters']['cfg'])
model=FlowModel(cfg.model).eval()
model.load_state_dict({k.removeprefix('model.'):v for k,v in ck['state_dict'].items() if k.startswith('model.')},strict=True)
class Wrapper(torch.nn.Module):
 def __init__(self):super().__init__();self.model=model
 def forward(self,trans,rot,t,ss,onehot):
  out=self.model({'res_mask':torch.ones_like(trans[...,0]),'trans_t':trans,'rotmats_t':rot,'t':t,'ss':ss,'onehot':onehot})
  return out['pred_trans'],out['pred_rotmats'],out['pred_torsions']
wrapper=Wrapper().eval()
def inputs(n):
 torch.manual_seed(n)
 trans=torch.randn(1,n,3)*10
 q=torch.randn(1,n,4);q=q/q.norm(dim=-1,keepdim=True)
 rot=ru.quat_to_rot(q)
 onehot=torch.nn.functional.one_hot(torch.arange(n)%4,4).float()[None]
 return trans,rot,torch.tensor([[.37]]),torch.zeros(1,n,n,3),onehot
with torch.no_grad():native=wrapper(*inputs(12))
# Equivalent right-composition with normalized (1,x,y,z), avoiding the
# eigendecomposition used only to convert an input rotation matrix to a quaternion.
def matrix_update(self,vec,normalize_quats=True,update_mask=None):
 if update_mask is not None:vec=vec*update_mask
 q=torch.cat((torch.ones_like(vec[...,:1]),vec),dim=-1)
 q=q/torch.linalg.vector_norm(q,dim=-1,keepdim=True)
 return ru.Rotation(rot_mats=torch.matmul(self.get_rot_mats(),ru.quat_to_rot(q)))
ru.Rotation.compose_q_update_vec=matrix_update
with torch.no_grad():patched=wrapper(*inputs(12))
errors=[float((a-b).abs().max()) for a,b in zip(native,patched)]
composition_errors=list(errors)
print('Matrix composition vs original max errors',errors,flush=True)
assert max(errors)<.002
names=['trans','rot','t','ss','onehot'];outputs=['pred_trans','pred_rot','torsions']
dynamic={'trans':{1:'length'},'rot':{1:'length'},'ss':{1:'length',2:'length'},'onehot':{1:'length'},**{n:{1:'length'} for n in outputs}}
dest=root/'rnabpflow-casp16-f32.onnx'
torch.onnx.export(wrapper,inputs(12),dest,input_names=names,output_names=outputs,dynamic_axes=dynamic,opset_version=17,dynamo=False)
# PyTorch emits legal Python negative permutation axes that ONNX requires positive.
graph=onnx.load(dest)
for node in graph.graph.node:
 if node.op_type=='Transpose':
  for attr in node.attribute:
   if attr.name=='perm':
    rank=len(attr.ints);attr.ints[:]=[v%rank for v in attr.ints]
onnx.checker.check_model(graph);onnx.save(graph,dest)
print('Exported',dest.stat().st_size,flush=True)
options=ort.SessionOptions();options.intra_op_num_threads=4
session=ort.InferenceSession(str(dest),options,providers=['CPUExecutionProvider'])
reports=[]
for n in [8,12,19,60,120]:
 args=inputs(n)
 with torch.no_grad():ref=wrapper(*args)
 actual=session.run(None,{k:v.numpy() for k,v in zip(names,args)})
 errors=[float(np.max(np.abs(a.numpy()-b))) for a,b in zip(ref,actual)]
 print('ONNX',n,errors,flush=True);assert max(errors)<.01
 reports.append({'length':n,'maxAbsoluteError':dict(zip(outputs,errors))})
 if n==19:
  np.savez(root/'step-reference.npz',**{k:v.numpy() for k,v in zip(names,args)},**{k:v.numpy() for k,v in zip(outputs,ref)})
  (root/'step-reference.json').write_text(json.dumps({'inputs':{k:{'dims':list(v.shape),'data':v.flatten().tolist()} for k,v in zip(names,args)},'outputs':{k:{'dims':list(v.shape),'data':v.flatten().tolist()} for k,v in zip(outputs,ref)}}))
(root/'export-validation.json').write_text(json.dumps({'originalVsMatrixComposition':composition_errors,'onnx':reports},indent=2))
