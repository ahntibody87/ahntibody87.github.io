import * as T from '../../embryo-atlas/vendor/three.module.min.js';
import {roomSize,benches,stools,stations} from './layout.mjs';

function surface(kind){
  const canvas=document.createElement('canvas');
  const size=384;
  canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');
  let seed=91;
  const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const base={stone:[49,49,47],tile:[184,178,167],oak:[174,134,92],wall:[227,222,211],ceiling:[224,223,214]}[kind];
  const pixels=ctx.createImageData(size,size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4;
    const grain=kind==='oak'?3*Math.sin(.38*x+2*Math.sin(y/37))+3*Math.sin(x*.083+y*.01):0;
    const mottling=kind==='tile'?3*Math.sin(x*.045+Math.cos(y*.035))+3*Math.cos(y*.04):0;
    const noise=(random()-.5)*(kind==='stone'?42:11)+grain+mottling;
    for(let c=0;c<3;c++)pixels.data[i+c]=base[c]+noise;
    pixels.data[i+3]=255;
  }
  ctx.putImageData(pixels,0,0);
  if(kind==='tile'||kind==='ceiling'){
    ctx.strokeStyle=kind==='tile'?'#8b8780':'#a6a49c';
    ctx.lineWidth=kind==='tile'?4:2;
    ctx.strokeRect(0,0,size,size);
  }
  if(kind==='stone'){
    for(let i=0;i<4200;i++){
      ctx.fillStyle=i%3?'#e3e2d439':'#191a1966';
      ctx.fillRect(random()*size,random()*size,1+random()*2,1+random());
    }
  }
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  texture.wrapS=texture.wrapT=T.RepeatWrapping;
  texture.anisotropy=8;
  return texture;
}

function photographMaterials(stone){
  const canvas=document.createElement('canvas');
  canvas.width=640;canvas.height=384;
  const ctx=canvas.getContext('2d');
  const sky=ctx.createLinearGradient(0,0,0,384);
  sky.addColorStop(0,'#b9dbea');sky.addColorStop(1,'#97a967');
  ctx.fillStyle=sky;ctx.fillRect(0,0,640,384);
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  const photo=new Image();
  photo.src=new URL('../bench-daylight.webp',import.meta.url).href;
  const ready=photo.decode().then(()=>{
    ctx.drawImage(photo,photo.width*.052,photo.height*.118,photo.width*.129,photo.height*.196,0,0,640,384);
    texture.needsUpdate=true;
    const worktop=stone.image;
    const worktopContext=worktop.getContext('2d');
    worktopContext.globalAlpha=.72;
    worktopContext.drawImage(photo,photo.width*.39,photo.height*.81,photo.width*.22,photo.height*.17,0,0,worktop.width,worktop.height);
    worktopContext.globalAlpha=1;
    stone.wrapS=stone.wrapT=T.MirroredRepeatWrapping;
    stone.repeat.set(2.2,1.35);
    stone.needsUpdate=true;
  }).catch(()=>{});
  return {texture,ready};
}

export function createLab(){
  const scene=new T.Scene();
  scene.background=new T.Color('#d9e6ed');
  const {width:w,depth:d,height:h}=roomSize;
  const stone=surface('stone'),tile=surface('tile'),oak=surface('oak');
  tile.repeat.set(w/.58,d/.58);
  const ceiling=surface('ceiling');ceiling.repeat.set(w/.64,d/.64);
  const material=(color,props={})=>new T.MeshStandardMaterial({color,roughness:.56,...props});
  const exterior=photographMaterials(stone);
  const m={
    stone:material('#fff',{map:stone,roughness:.25}),
    floor:material('#fff',{map:tile,roughness:.42}),
    ceiling:material('#fff',{map:ceiling,roughness:.88}),
    wall:material('#fff',{map:surface('wall'),roughness:.84}),
    ivory:material('#dfded3'), wood:material('#fff',{map:oak,roughness:.46}),
    steel:material('#b8c5c8',{metalness:.54,roughness:.28}),
    trim:material('#555b5d',{metalness:.25}), dark:material('#22292b'),
    blue:material('#234d80'), plastic:material('#eeefea',{roughness:.34}),
    glass:new T.MeshPhysicalMaterial({color:'#b7d2d9',roughness:.13,transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide}),
    daylight:new T.MeshBasicMaterial({map:exterior.texture,color:'#e8f4ff',toneMapped:false}),
    light:new T.MeshBasicMaterial({color:'#fff9ed',toneMapped:false}),
    red:material('#a43b35'), amber:material('#b59458'), sage:material('#617a4a'),
    screen:new T.MeshBasicMaterial({color:'#3a82af',toneMapped:false})
  };
  const cube=new T.BoxGeometry(),round=new T.CylinderGeometry(1,1,1,24);
  function add(geometry,key,x,y,z,parent=scene){
    const mesh=new T.Mesh(geometry,m[key]);
    mesh.position.set(x,y,z);
    mesh.castShadow=!['glass','daylight','light'].includes(key);
    mesh.receiveShadow=!['glass','daylight','light'].includes(key);
    parent.add(mesh);
    return mesh;
  }
  function box(x,y,z,sx,sy,sz,key,parent=scene){
    const obj=add(cube,key,x,y,z,parent);
    obj.scale.set(sx,sy,sz);
    return obj;
  }
  function cyl(x,y,z,radius,height,key,parent=scene){
    const obj=add(round,key,x,y,z,parent);
    obj.scale.set(radius,height,radius);
    return obj;
  }
  function rod(from,to,r,key,parent=scene){
    const a=new T.Vector3(...from),b=new T.Vector3(...to),mid=a.clone().lerp(b,.5);
    const mesh=cyl(mid.x,mid.y,mid.z,r,a.distanceTo(b),key,parent);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());
    return mesh;
  }
  function rounded(x,y,z,width,height,depth,key,parent=scene,bevel=.027){
    const a=width/2-bevel,b=height/2-bevel;
    const shape=new T.Shape();
    shape.moveTo(-a,-b);shape.lineTo(a,-b);shape.lineTo(a,b);shape.lineTo(-a,b);shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth:depth-2*bevel,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,steps:1});
    geo.translate(0,0,-depth/2+bevel);
    return add(geo,key,x,y,z,parent);
  }
  function plane(x,y,z,width,height,key,rx=0,ry=0){
    const obj=add(new T.PlaneGeometry(width,height),key,x,y,z);
    obj.rotation.set(rx,ry,0);
    return obj;
  }
  function label(text,x,y,z,width,height,parent=scene){
    const sheet=document.createElement('canvas');sheet.width=512;sheet.height=128;
    const ctx=sheet.getContext('2d');
    ctx.fillStyle='#18272b';ctx.fillRect(0,0,512,128);
    ctx.fillStyle='#eaf5ed';ctx.font='bold 57px Arial';ctx.textAlign='center';
    ctx.fillText(text,256,84,474);
    const map=new T.CanvasTexture(sheet);map.colorSpace=T.SRGBColorSpace;
    const obj=new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map,toneMapped:false}));
    obj.position.set(x,y,z);parent.add(obj);
    return obj;
  }
  plane(w/2,0,d/2,w,d,'floor',-Math.PI/2);
  plane(w/2,h,d/2,w,d,'ceiling',Math.PI/2).castShadow=false;
  box(w/2,h/2,-.09,w+.15,h,.16,'wall').castShadow=false;
  box(w+.08,h/2,d/2,.16,h,d,'wall').castShadow=false;
  box(w/2,h/2,d+.08,w,h,.16,'wall').castShadow=false;
  box(-.10,.46,d/2,.20,.92,d,'wall');
  box(-.10,2.99,d/2,.20,.39,d,'wall');
  for(let i=0;i<5;i++){
    const z=.98+i*1.91;
    plane(-.12,1.86,z,1.79,1.87,'daylight',0,Math.PI/2);
    box(.012,2.17,z,.075,.044,1.87,'trim');
    box(.009,1.38,z,.064,.045,1.87,'trim');
    box(-.027,1.87,z-.935,.15,1.94,.075,'steel');
    box(.015,.93,z,.16,.055,1.87,'ivory');
    if(i===1||i===3)box(.14,1.93,z+.83,.38,1.99,.17,'wall');
  }
  for(const x of [2.25,5.45,8.65])for(const z of [2.2,6.35]){
    box(x,h-.055,z,.43,.09,1.46,'ivory').castShadow=false;
    box(x,h-.106,z,.33,.017,1.34,'light');
  }
  box(5.42,h-.074,4.48,.74,.083,.74,'ivory');
  for(let i=0;i<8;i++)box(5.42,h-.121,4.21+i*.076,.53,.015,.017,'trim');

  function cupboards(start,end,z,glass){
    const count=Math.round((end-start)/.65);
    const step=(end-start)/count;
    for(let i=0;i<count;i++){
      const x=start+(i+.5)*step;
      box(x,.46,z,step-.012,.86,.61,'wood');
      box(x,.53,z+.318,step-.028,.72,.036,'wood');
      rod([x+step*.31,.68,z+.352],[x+step*.31,.82,z+.352],.011,'steel');
      if(!glass)continue;
      const glazed=i<4||i>7;
      if(glazed){
        box(x,1.68,z-.245,step-.012,1.35,.085,'wood');
        for(const sign of [-1,1]){
          box(x+sign*(step/2-.016),1.68,z-.04,.032,1.35,.43,'wood');
          box(x,1.68+sign*.642,z-.04,step-.01,.05,.43,'wood');
        }
        box(x,1.68,z+.17,step-.062,1.18,.04,'glass');
        for(const y of [1.27,1.65,2.02]){
          box(x,y,z+.063,step-.074,.023,.29,'wood');
          for(let j=0;j<3;j++){
            const px=x-step*.28+j*step*.24;
            const height=.11+((i+j)%3)*.032;
            cyl(px,y+height*.5,z+.12,.036,height,j%2?'plastic':'amber');
            cyl(px,y+height,z+.12,.025,.027,'dark');
          }
        }
      }else{
        box(x,1.68,z-.08,step-.008,1.35,.44,'wood');
        box(x,1.68,z+.175,step-.03,1.28,.04,'wood');
      }
      rod([x+step*.31,1.35,z+.21],[x+step*.31,1.54,z+.21],.011,'steel');
    }
  }
  cupboards(.68,10.03,.34,true);
  box(5.35,.94,.36,9.42,.055,.68,'stone');
  box(.35,.93,4.17,.70,.063,7.48,'stone');
  for(let z=.72;z<7.85;z+=.56){
    box(.31,.44,z,.58,.84,.548,'ivory');
    box(.619,.49,z,.035,.72,.524,'ivory');
    rod([.65,.66,z-.15],[.65,.80,z-.15],.010,'steel');
  }
  box(.40,.967,3.95,.47,.022,.72,'steel');
  box(.40,.980,3.95,.39,.014,.61,'dark');
  box(.40,.982,3.95,.32,.015,.53,'steel');
  const faucet=new T.CatmullRomCurve3([[.12,.95,3.92],[.12,1.24,3.92],[.26,1.35,3.92],[.41,1.26,3.92]].map(p=>new T.Vector3(...p)));
  add(new T.TubeGeometry(faucet,18,.023,8,false),'steel',0,0,0);
  for(let i=0;i<5;i++)cyl(.38,.995+i%2*.018,1.3+i*.20,.04,.11,i%2?'amber':'plastic');
  box(10.48,.48,3.06,.60,.91,4.48,'ivory');
  box(10.48,.953,3.06,.64,.062,4.48,'stone');
  box(10.71,1.98,4.0,.11,1.14,2.85,'trim');
  box(10.635,1.98,4.0,.06,1.08,2.77,'plastic');
  box(10.59,1.42,4.0,.11,.03,2.76,'steel');
  box(9.55,1.10,d-.025,1.16,2.18,.10,'trim');
  box(9.55,1.09,d-.092,1.03,2.09,.08,'wood');
  box(9.8,1.61,d-.144,.15,.59,.016,'glass');
  rod([9.22,1.02,d-.18],[9.37,1.02,d-.18],.017,'steel');

  for(const {x,z,w:width,d:depth} of benches){
    box(x,.932,z,width,.07,depth,'stone');
    box(x,.833,z,width-.05,.128,depth-.11,'ivory');
    for(const sx of [-1,1])for(const sz of [-1,1]){
      box(x+sx*(width/2-.105),.405,z+sz*(depth/2-.115),.142,.81,.15,'ivory');
      box(x+sx*(width/2-.105),.06,z+sz*(depth/2-.115),.15,.12,.158,'trim');
    }
  }
  for(const {x,z} of stools){
    cyl(x,.515,z,.212,.065,'wood');
    const hoop=add(new T.TorusGeometry(.16,.012,10,28),'steel',x,.227,z);
    hoop.rotation.x=Math.PI/2;
    for(let i=0;i<4;i++){
      const angle=(i+.5)*Math.PI/2;
      const ax=Math.sin(angle),az=Math.cos(angle);
      rod([x+ax*.12,.49,z+az*.12],[x+ax*.183,.026,z+az*.183],.014,'steel');
      cyl(x+ax*.183,.021,z+az*.183,.019,.03,'dark');
    }
  }

  function device(id){
    const {x,z}=stations.find(item=>item.id===id);
    const group=new T.Group();group.position.set(x,.968,z);scene.add(group);
    return group;
  }
  const cooler=device('ice');
  rounded(0,.138,0,.60,.268,.406,'blue',cooler,.038);
  rounded(0,.292,-.007,.62,.078,.422,'plastic',cooler,.018);
  for(const x of [-.19,-.063,.063,.19])rounded(x,.336,0,.028,.012,.275,'ivory',cooler,.004);
  rounded(0,.227,.215,.102,.105,.038,'ivory',cooler,.008);
  label('ICE BOX',-.15,.148,.213,.125,.038,cooler);

  const prep=device('prep');
  rounded(0,.023,0,.44,.044,.21,'blue',prep,.008);
  for(let row=0;row<5;row++)for(let col=0;col<12;col++)cyl(-.192+col*.035,.046,-.07+row*.035,.011,.003,'dark',prep);
  for(let i=0;i<4;i++){
    const x=-.134+i*.085;
    cyl(x,.074,.037,.013,.061,'glass',prep);
    const rim=add(new T.TorusGeometry(.012,.0025,8,16),'plastic',x,.106,.037,prep);rim.rotation.x=Math.PI/2;
  }
  rounded(-.32,.051,-.06,.17,.095,.14,'blue',prep,.009);
  box(-.32,.105,-.06,.175,.024,.145,'glass',prep);
  for(let i=0;i<8;i++)cyl(-.4+i*.022,.14,-.06,.007,.06,'plastic',prep);
  const pipette=new T.Group();pipette.position.set(.31,.033,.033);pipette.rotation.set(-.16,0,-1.24);prep.add(pipette);
  rounded(0,.055,0,.036,.125,.043,'plastic',pipette,.008);
  cyl(0,.135,0,.011,.033,'blue',pipette);
  cyl(0,.153,0,.016,.008,'blue',pipette);
  cyl(0,-.026,0,.010,.060,'ivory',pipette);
  label('10.0',0,.063,.022,.026,.018,pipette);
  for(let i=0;i<4;i++){
    cyl(-.14+i*.075,.038,-.20,.023,.075,'glass',prep);
    cyl(-.14+i*.075,.084,-.20,.024,.020,'blue',prep);
  }

  const pcr=device('pcr');
  rounded(0,.137,0,.60,.268,.475,'plastic',pcr,.035);
  rounded(0,.29,-.060,.50,.074,.344,'ivory',pcr,.024);
  rounded(0,.276,-.057,.46,.016,.30,'dark',pcr,.007);
  rounded(0,.33,-.050,.28,.035,.061,'plastic',pcr,.011);
  const panel=new T.Group();panel.position.set(0,.213,.268);panel.rotation.x=-.39;pcr.add(panel);
  rounded(0,0,0,.31,.134,.034,'dark',panel,.009);
  label('RT-PCR',0,.008,.018,.265,.091,panel);
  for(let i=0;i<8;i++)box(-.215+i*.026,.086,.239,.012,.027,.004,'trim',pcr);

  const gel=device('gel');
  box(0,.016,0,.51,.029,.30,'dark',gel);
  box(0,.048,0,.47,.035,.265,'glass',gel);
  for(const sign of [-1,1]){
    box(sign*.228,.095,0,.012,.128,.267,'glass',gel);
    box(0,.095,sign*.134,.463,.128,.011,'glass',gel);
  }
  box(0,.072,0,.31,.026,.194,'glass',gel);
  for(let i=0;i<6;i++)box(-.12+i*.048,.086,-.053,.021,.004,.036,'dark',gel);
  rounded(.395,.071,-.01,.219,.138,.215,'dark',gel,.012);
  label('POWER',.395,.084,.099,.145,.044,gel);
  for(const [index,key] of ['red','dark'].entries()){
    const x=.16-index*.32;
    cyl(x,.17,-.10,.021,.05,key,gel);
    const curve=new T.CatmullRomCurve3([[x,.19,-.10],[x+.02,.27,-.22],[.31,.16,-.25],[.38+index*.05,.10,-.115]].map(p=>new T.Vector3(...p)));
    add(new T.TubeGeometry(curve,20,.008,7,false),key,0,0,0,gel);
  }

  scene.add(new T.HemisphereLight('#e6f3ff','#a9a398',2.0));
  scene.add(new T.AmbientLight('#fff0da',.52));
  const sun=new T.DirectionalLight('#fff1d3',2.55);
  sun.position.set(-3.5,5,1.65);sun.target.position.set(5,0,5.3);
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.2,far:22});
  sun.shadow.bias=-.0002;sun.shadow.normalBias=.022;sun.shadow.radius=2;
  scene.add(sun,sun.target);

  cyl(.37,.995,2.59,.071,.076,'ivory');
  for(let i=0;i<13;i++){
    const spread=Math.sin(i*1.48)*.15;
    const y=1.06+i*.031;
    const z=2.59+Math.cos(i*1.73)*.11;
    rod([.37,1.023,2.59],[.37+spread,y,z],.004,'sage');
    const leaf=add(new T.SphereGeometry(1,10,7),'sage',.37+spread,y,z);
    leaf.scale.set(.059,.019,.030);
    leaf.rotation.z=Math.sin(i)*.72;
  }
  batchStaticGeometry(scene,[cube,round]);

  const carried=new T.Group();
  rounded(0,-.215,-.46,.29,.063,.115,'blue',carried,.01);
  for(let i=0;i<4;i++){
    const x=-.10+i*.067;
    cyl(x,-.167,-.46,.015,.055,'glass',carried);
    cyl(x,-.136,-.46,.018,.012,'plastic',carried);
  }
  for(const x of [-.147,.147])rounded(x,-.218,-.433,.083,.054,.086,'blue',carried,.017);
  carried.scale.setScalar(.81);
  carried.position.y=-.075;
  carried.visible=false;
  return {scene,carried,ready:exterior.ready};
}

function batchStaticGeometry(scene,geometries){
  scene.updateMatrixWorld(true);
  const groups=new Map();
  scene.traverse(object=>{
    if(!object.isMesh||object.material.transparent||!geometries.includes(object.geometry))return;
    const key=[object.geometry.id,object.material.id,object.castShadow,object.receiveShadow].join(':');
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(object);
  });
  for(const objects of groups.values()){
    if(objects.length<3)continue;
    const {geometry,material,castShadow,receiveShadow}=objects[0];
    const batch=new T.InstancedMesh(geometry,material,objects.length);
    batch.castShadow=castShadow;
    batch.receiveShadow=receiveShadow;
    objects.forEach((object,index)=>{
      batch.setMatrixAt(index,object.matrixWorld);
      object.removeFromParent();
    });
    scene.add(batch);
  }
}
