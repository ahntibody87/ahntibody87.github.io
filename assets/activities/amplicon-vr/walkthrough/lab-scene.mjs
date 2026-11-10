import * as T from '../../embryo-atlas/vendor/three.module.min.js';
import {roomSize,benches,stools,stations} from './layout.mjs?v=4';

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

export function createLab(experiment){
  const scene=new T.Scene();
  scene.background=new T.Color('#d9e6ed');
  const {width:w,depth:d,height:h}=roomSize;
  const stone=surface('stone'),tile=surface('tile'),oak=surface('oak');
  tile.repeat.set(w/.58,d/.58);
  const ceiling=surface('ceiling');ceiling.repeat.set(w/.64,d/.64);
  const material=(color,props={})=>new T.MeshStandardMaterial({color,roughness:.56,...props});
  const exterior=photographMaterials(stone);
  let finishReflection;
  const reflectionReady=new Promise(resolve=>{finishReflection=resolve;});
  const reflected=new T.TextureLoader().load(new URL('../room-surround.webp',import.meta.url).href,finishReflection,undefined,finishReflection);
  reflected.mapping=T.EquirectangularReflectionMapping;
  reflected.colorSpace=T.SRGBColorSpace;
  scene.environment=reflected;
  scene.environmentIntensity=.42;
  const woodDoors=Array.from({length:5},(_,index)=>{
    const grain=oak.clone();
    grain.offset.x=index*.183;
    grain.repeat.set(.82,1);
    grain.needsUpdate=true;
    return material('#fff',{map:grain,roughness:.43});
  });
  const m={
    stone:material('#fff',{map:stone,roughness:.25}),
    floor:material('#fff',{map:tile,roughness:.42}),
    ceiling:material('#fff',{map:ceiling,roughness:.88}),
    wall:material('#fff',{map:surface('wall'),roughness:.84}),
    ivory:material('#dfded3'), wood:material('#fff',{map:oak,roughness:.46}),
    steel:material('#b8c5c8',{metalness:.54,roughness:.28}),
    trim:material('#555b5d',{metalness:.25}), dark:material('#22292b'),
    blue:material('#234d80'), plastic:material('#eeefea',{roughness:.34}),
    cabinetGlass:new T.MeshPhysicalMaterial({color:'#d5e4e7',metalness:.12,roughness:.13,transparent:true,opacity:.19,depthWrite:false}),
    chrome:material('#f3f7fa',{metalness:.9,roughness:.18}),
    rubber:material('#242529',{roughness:.94}),
    glove:material('#3365b3',{roughness:.55}),
    cuff:material('#edf1f2',{roughness:.9}),
    tubeGlass:new T.MeshPhysicalMaterial({color:'#d9f1f6',roughness:.17,transparent:true,opacity:.47,depthWrite:false}),
    filter:material('#cf9342',{roughness:.24,transparent:true,opacity:.53,depthWrite:false}),
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
    mesh.castShadow=!m[key].transparent&&!['daylight','light'].includes(key);
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

  function handle(x,y,z,length){
    const front=z+.026;
    for(const offset of [-length/2,length/2]){
      rod([x,y+offset,z],[x,y+offset,front],.008,'chrome');
    }
    rod([x,y-length/2,front],[x,y+length/2,front],.009,'chrome');
  }
  function cupboards(start,end,z){
    const count=Math.round((end-start)/.65);
    const step=(end-start)/count;
    for(let i=0;i<count;i++){
      const x=start+(i+.5)*step;
      box(x,.51,z,step-.009,.79,.61,'wood');
      box(x,.49,z+.323,step-.040,.72,.039,'wood').material=woodDoors[i%5];
      handle(x+step*.30,.73,z+.344,.128);
      const glazed=i<4||i>7;
      if(glazed){
        box(x,1.68,z-.245,step-.012,1.35,.085,'wood');
        for(const sign of [-1,1]){
          box(x+sign*(step/2-.016),1.68,z-.04,.032,1.35,.43,'wood');
          box(x,1.68+sign*.642,z-.04,step-.01,.05,.43,'wood');
        }
        const pane=z+.201;
        box(x,1.68,pane,step-.088,1.218,.012,'cabinetGlass');
        for(const sign of [-1,1]){
          box(x+sign*(step/2-.025),1.68,pane,.032,1.28,.028,'steel');
          box(x,1.68+sign*.626,pane,step-.044,.028,.028,'steel');
        }
        for(const y of [1.27,1.65,2.02]){
          box(x,y,z+.063,step-.074,.023,.29,'wood');
          for(let j=0;j<3;j++){
            const px=x-step*.28+j*step*.24;
            const height=.092+((i+j*3+Math.round(y*10))%5)*.024;
            const radius=.026+((i+j)%3)*.007;
            const depth=z+.057+((i+j)%3)*.022;
            cyl(px,y+.012+height*.5,depth,radius,height,j%3===0?'glass':j%2?'plastic':'amber');
            cyl(px,y+.012+height,depth,radius*.76,.024,j%2?'blue':'dark');
            box(px,y+.042+height*.29,depth+radius*.94,radius*1.36,.031,.005,'plastic');
          }
        }
      }else{
        box(x,1.68,z-.08,step-.008,1.35,.44,'wood');
        box(x,1.68,z+.175,step-.038,1.28,.04,'wood').material=woodDoors[(i+2)%5];
      }
      handle(x+step*.31,1.45,z+.219,.142);
    }
  }
  cupboards(.68,10.03,.34);
  box(5.35,.064,.34,9.37,.12,.54,'trim');
  box(5.35,.94,.36,9.42,.055,.68,'stone');
  const sinkZ=3.95, openingStart=3.56, openingEnd=4.34;
  for(const [low,high] of [[.43,openingStart],[openingEnd,7.91]]){
    box(.35,.93,(low+high)/2,.70,.063,high-low,'stone');
  }
  box(.055,.93,sinkZ,.11,.063,.78,'stone');
  box(.658,.93,sinkZ,.084,.063,.78,'stone');
  box(.035,.998,4.17,.046,.082,7.48,'stone');
  box(.29,.068,4.17,.52,.125,7.48,'trim');
  for(let z=.72;z<7.85;z+=.56){
    const underSink=Math.abs(z-sinkZ)<.72;
    box(.31,underSink?.34:.46,z,.58,underSink?.55:.81,.548,'ivory');
    box(.619,.49,z,.035,.72,.516,'ivory');
    for(const y of [.68,.79])rod([.635,y,z-.15],[.669,y,z-.15],.008,'chrome');
    rod([.669,.68,z-.15],[.669,.79,z-.15],.008,'chrome');
  }
  const sinkX=.365;
  const rimShape=new T.Shape();
  rimShape.moveTo(-.284,-.414);rimShape.lineTo(.284,-.414);rimShape.lineTo(.284,.414);rimShape.lineTo(-.284,.414);rimShape.closePath();
  function bowlOutline(target,a,b,r){
    target.moveTo(-a+r,-b);target.lineTo(a-r,-b);target.quadraticCurveTo(a,-b,a,-b+r);
    target.lineTo(a,b-r);target.quadraticCurveTo(a,b,a-r,b);target.lineTo(-a+r,b);
    target.quadraticCurveTo(-a,b,-a,b-r);target.lineTo(-a,-b+r);target.quadraticCurveTo(-a,-b,-a+r,-b);
    target.closePath();
  }
  const sinkHole=new T.Path();
  bowlOutline(sinkHole,.246,.369,.063);
  rimShape.holes.push(sinkHole);
  const rim=add(new T.ShapeGeometry(rimShape),'steel',sinkX,.967,sinkZ);
  rim.rotation.x=-Math.PI/2;
  const inside=new T.Path();
  bowlOutline(inside,.195,.315,.064);
  const upper=sinkHole.getPoints(8),lower=inside.getPoints(8),verts=[];
  for(let i=0;i<upper.length-1;i++){
    const top=p=>[p.x,.966,-p.y], bottom=p=>[p.x,.753,-p.y];
    verts.push(...top(upper[i]),...bottom(lower[i+1]),...bottom(lower[i]),
      ...top(upper[i]),...top(upper[i+1]),...bottom(lower[i+1]));
  }
  const slope=new T.BufferGeometry();
  slope.setAttribute('position',new T.Float32BufferAttribute(verts,3));
  slope.computeVertexNormals();
  const bowlMaterial=m.steel.clone();bowlMaterial.side=T.DoubleSide;
  add(slope,'steel',sinkX,0,sinkZ).material=bowlMaterial;
  const baseShape=new T.Shape();
  bowlOutline(baseShape,.195,.315,.064);
  add(new T.ShapeGeometry(baseShape),'steel',sinkX,.753,sinkZ).rotation.x=-Math.PI/2;
  cyl(sinkX,.757,sinkZ+.093,.052,.007,'chrome');
  cyl(sinkX,.762,sinkZ+.093,.036,.004,'dark');
  for(let i=0;i<7;i++)box(sinkX-.026+i*.009,.765,sinkZ+.093,.003,.003,.044,'chrome');
  cyl(.085,.983,3.92,.049,.026,'chrome');
  const faucet=new T.CatmullRomCurve3([[.085,.99,3.92],[.085,1.24,3.92],[.225,1.365,3.92],[.381,1.28,3.92],[.391,1.23,3.92]].map(p=>new T.Vector3(...p)));
  add(new T.TubeGeometry(faucet,36,.018,14,false),'chrome',0,0,0);
  cyl(.391,1.226,3.92,.023,.030,'chrome');
  cyl(.10,1.015,4.061,.024,.078,'chrome');
  rod([.10,1.055,4.061],[.183,1.067,4.061],.009,'chrome');
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
  const targets=new Map();
  const hidden=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
  function target(id,parent,x,y,z,width,height,depth){
    const hit=new T.Mesh(cube,hidden);
    hit.position.set(x,y,z);
    hit.scale.set(width,height,depth);
    hit.userData.action=id;
    hit.userData.moving=true;
    parent.add(hit);
    targets.set(id,hit);
  }
  function rack(parent){
    const group=new T.Group();
    parent.add(group);
    rounded(0,.032,0,.292,.062,.105,'blue',group,.009);
    for(let i=0;i<4;i++){
      const x=-.104+i*.070;
      cyl(x,.091,0,.017,.064,'glass',group);
      cyl(x,.126,0,.019,.015,'plastic',group);
      box(x,.096,.017,.026,.019,.002,'plastic',group);
    }
    return group;
  }

  const cooler=device('ice');
  rounded(0,.037,0,.60,.070,.406,'blue',cooler,.021);
  for(const sign of [-1,1]){
    rounded(sign*.28,.147,0,.042,.222,.399,'blue',cooler,.017);
    rounded(0,.147,sign*.184,.564,.222,.037,'blue',cooler,.016);
    box(sign*.256,.160,0,.018,.19,.358,'ivory',cooler);
    box(0,.160,sign*.164,.50,.19,.018,'ivory',cooler);
    rounded(sign*.21,.144,-.04,.055,.14,.22,'blue',cooler,.012);
  }
  const lid=new T.Group();lid.position.set(0,.256,-.208);cooler.add(lid);
  rounded(0,.039,.201,.62,.078,.422,'plastic',lid,.018);
  for(const x of [-.19,-.063,.063,.19])rounded(x,.082,.208,.028,.012,.275,'ivory',lid,.004);
  rounded(0,-.022,.423,.102,.095,.036,'ivory',lid,.008);
  label('ICE BOX',-.15,.148,.207,.125,.038,cooler);
  const coldRack=rack(cooler);coldRack.position.set(0,.085,.036);
  target('lid',cooler,0,.298,.035,.62,.115,.43);
  target('rack',coldRack,0,.087,0,.31,.17,.14);

  const prep=device('prep');
  const prepRack=rack(prep);
  prepRack.position.set(-.05,0,-.24);
  prepRack.visible=!experiment;
  const sampleIds=experiment?.samples.map(sample=>sample.id)??['A','B','positive','negative'];
  const reagentIds=experiment?.reagents.map(reagent=>reagent.id)??['buffer','primer','rt','taq'];
  const sampleLabels=['A','B','+','−'];
  const reactionLiquid=[];
  rounded(0,.023,.045,.47,.044,.20,'blue',prep,.008);
  for(let row=0;row<5;row++)for(let col=0;col<12;col++)cyl(-.192+col*.035,.046,-.026+row*.035,.011,.003,'dark',prep);
  rounded(-.32,.051,-.035,.17,.095,.14,'blue',prep,.009);
  box(-.32,.105,-.035,.175,.024,.145,'glass',prep);
  for(let i=0;i<8;i++)cyl(-.4+i*.022,.14,-.035,.007,.06,'plastic',prep);
  target('tips',prep,-.32,.112,-.035,.18,.16,.15);
  rounded(.368,.054,-.055,.14,.105,.14,'ivory',prep,.011);
  rounded(.368,.109,-.055,.108,.008,.101,'dark',prep,.003);
  target('discard',prep,.368,.105,-.055,.14,.14,.15);
  target('place',prep,-.05,.065,-.24,.30,.13,.13);
  rounded(0,.015,-.104,.51,.028,.123,'steel',prep,.008);
  for(let i=0;i<4;i++){
    const x=-.159+i*.106;
    const rim=add(new T.TorusGeometry(.019,.0038,8,20),'plastic',x,.144,.065,prep);rim.rotation.x=Math.PI/2;
    const vial=add(new T.CylinderGeometry(.019,.012,.092,20,1,true),'tubeGlass',x,.097,.065,prep);
    vial.material.side=T.DoubleSide;
    cyl(x,.052,.065,.012,.009,'plastic',prep);
    reactionLiquid.push(cyl(x,.056,.065,.012,.010,'screen',prep));
    label(sampleLabels[i],x,.046,.094,.049,.027,prep);
    target('tube:'+sampleIds[i],prep,x,.126,.065,.075,.16,.076);
    cyl(x,.065,-.103,.025,.084,'glass',prep);
    cyl(x,.108,-.103,.026,.020,i%2?'blue':'ivory',prep);
    label(['BUF','PR','RT','TAQ'][i],x,.066,-.076,.039,.023,prep);
    target(reagentIds[i],prep,x,.077,-.103,.069,.134,.078);
    label(sampleLabels[i],-.104+i*.070,.09,.018,.030,.018,prepRack);
    target('sample:'+sampleIds[i],prepRack,-.104+i*.070,.10,0,.062,.14,.08);
  }
  const pipette=new T.Group();pipette.position.set(.29,.038,.102);pipette.rotation.set(-.16,0,-1.24);prep.add(pipette);
  rounded(0,.063,0,.046,.146,.051,'plastic',pipette,.011);
  const plunger=cyl(0,.149,0,.012,.042,'blue',pipette);
  const button=cyl(0,.174,0,.019,.009,'blue',pipette);
  cyl(0,-.027,0,.013,.060,'ivory',pipette);
  label('µL',0,.065,.026,.030,.024,pipette);
  const pipetteTip=add(new T.CylinderGeometry(.008,.002,.055,18),'glass',0,-.082,0,pipette);
  const tipLiquid=cyl(0,-.087,0,.003,.021,'screen',pipette);
  pipetteTip.visible=tipLiquid.visible=false;
  const animated=[lid,coldRack,prepRack,pipette,...reactionLiquid];
  animated.forEach(group=>group.traverse(object=>{object.userData.moving=true;}));

  let motion=null;
  function prepareAction(effect,id,now,duration){
    if(effect==='lid'){
      motion={start:now,duration,apply:t=>{lid.rotation.x=-1.94*t;}};
      return;
    }
    if(effect==='rack'){
      motion={start:now,duration,apply:t=>{
        coldRack.position.set(0,.085+t*.31,.036+t*.105);
        coldRack.visible=t<1;
      }};
      return;
    }
    if(effect==='place'){
      motion={start:now,duration,apply:t=>{
        prepRack.position.set(-.05,(1-t)*.12,-.24+(1-t)*.45);
      }};
      return;
    }
    if(effect==='auto')return;
    const point=targets.get(id);
    if(!point)return;
    const position=prep.worldToLocal(point.getWorldPosition(new T.Vector3()));
    const initial=pipette.position.clone();
    const rotation=pipette.rotation.clone();
    const end=new T.Vector3(position.x,position.y+.137,position.z+.008);
    motion={start:now,duration,apply:t=>{
      pipette.position.lerpVectors(initial,end,t);
      pipette.position.y+=Math.sin(Math.PI*t)*.06;
      pipette.rotation.set(rotation.x*(1-t),0,rotation.z*(1-t));
      plunger.position.y=.149-.012*Math.sin(Math.PI*t);
      button.position.y=.174-.012*Math.sin(Math.PI*t);
    }};
  }
  function updatePreparation(now,preparation){
    if(motion){
      const t=motion.duration?Math.min(1,(now-motion.start)/motion.duration):1;
      motion.apply(t*t*(3-2*t));
      if(t===1)motion=null;
    }
    if(preparation){
      coldRack.visible=preparation.phase==='ice'||!!motion&&preparation.phase==='carry'&&coldRack.position.y>.085;
      prepRack.visible=preparation.phase==='prep';
      if(!motion){
        pipetteTip.visible=!!preparation.state.tip;
        tipLiquid.visible=!!preparation.liquid;
        reactionLiquid.forEach((mesh,i)=>{
          const count=preparation.state.tubes[sampleIds[i]].additions.length;
          mesh.visible=count>0;
          mesh.scale.y=.008+count*.006;
          mesh.position.y=.047+mesh.scale.y/2;
        });
      }
    }
    return !!motion;
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

  const viewer=device('led');
  rounded(0,.065,0,.50,.128,.39,'dark',viewer,.019);
  rounded(0,.135,-.015,.452,.023,.327,'screen',viewer,.008);
  for(const x of [-.206,.206])box(x,.148,-.01,.023,.013,.31,'trim',viewer);
  rounded(0,.162,-.045,.454,.016,.29,'filter',viewer,.007);
  label('BLUE LED',-.094,.068,.197,.179,.032,viewer);
  rounded(.16,.066,.199,.044,.032,.013,'screen',viewer,.005);
  rod([-.21,.151,-.177],[.21,.151,-.177],.008,'steel',viewer);

  const vortex=device('vortex');
  rounded(0,.068,0,.31,.134,.286,'blue',vortex,.022);
  rounded(0,.131,-.013,.287,.025,.247,'plastic',vortex,.01);
  cyl(0,.171,-.036,.098,.072,'rubber',vortex);
  cyl(0,.210,-.036,.072,.012,'dark',vortex);
  const grip=add(new T.TorusGeometry(.051,.0035,8,24),'trim',0,.218,-.036,vortex);
  grip.rotation.x=Math.PI/2;
  const speed=cyl(.092,.071,.155,.035,.028,'rubber',vortex);speed.rotation.x=Math.PI/2;
  box(.092,.089,.169,.004,.021,.003,'plastic',vortex);
  label('VORTEX',-.050,.070,.147,.136,.028,vortex);

  const centrifuge=device('spin');
  rounded(0,.105,0,.445,.206,.405,'plastic',centrifuge,.033);
  rounded(0,.211,-.026,.404,.026,.343,'dark',centrifuge,.011);
  rounded(0,.253,-.031,.400,.075,.339,'plastic',centrifuge,.025);
  rounded(0,.287,-.035,.284,.022,.226,'cabinetGlass',centrifuge,.008);
  rounded(0,.211,.15,.105,.032,.031,'dark',centrifuge,.008);
  const spinPanel=new T.Group();spinPanel.position.set(0,.114,.214);spinPanel.rotation.x=-.25;centrifuge.add(spinPanel);
  rounded(0,0,0,.285,.08,.017,'dark',spinPanel,.006);
  label('CENTRIFUGE',-.027,.004,.011,.193,.033,spinPanel);
  rounded(.104,.002,.012,.038,.028,.012,'screen',spinPanel,.005);
  for(let i=0;i<7;i++)box(-.168+i*.023,.045,.204,.011,.020,.005,'trim',centrifuge);

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
  rack(carried).position.set(0,-.22,-.46);
  const joint=new T.SphereGeometry(1,18,12);
  function softPart(x,y,z,sx,sy,sz,key,parent=carried){
    const mesh=add(joint,key,x,y,z,parent);
    mesh.scale.set(sx,sy,sz);
    return mesh;
  }
  function sleeve(start,end){
    const a=new T.Vector3(...start),b=new T.Vector3(...end);
    const mid=a.clone().lerp(b,.5);
    const part=add(new T.CylinderGeometry(.044,.072,a.distanceTo(b),24),'cuff',mid.x,mid.y,mid.z,carried);
    part.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());
  }
  for(const sign of [-1,1]){
    sleeve([sign*.34,-.27,-.22],[sign*.222,-.151,-.392]);
    rod([sign*.222,-.151,-.39],[sign*.164,-.185,-.408],.035,'glove',carried);
    const palm=softPart(sign*.159,-.184,-.413,.043,.032,.063,'glove');
    palm.rotation.y=sign*.29;
    for(let i=0;i<4;i++){
      const z=-.49+i*.022;
      const outer=sign*(.161+i*.004);
      rod([outer,-.171,z],[sign*.147,-.153,z-.009],.010,'glove',carried);
      rod([sign*.147,-.153,z-.009],[sign*.124,-.162,z-.012],.009,'glove',carried);
      softPart(sign*.124,-.162,z-.012,.010,.009,.010,'glove');
    }
    rod([sign*.168,-.18,-.397],[sign*.130,-.184,-.395],.013,'glove',carried);
    softPart(sign*.125,-.184,-.397,.017,.013,.012,'glove');
  }
  carried.traverse(object=>{object.castShadow=false;});
  carried.scale.setScalar(.90);
  carried.position.y=-.012;
  carried.visible=false;
  return {scene,carried,targets,prepareAction,updatePreparation,ready:Promise.all([exterior.ready,reflectionReady])};
}

function batchStaticGeometry(scene,geometries){
  scene.updateMatrixWorld(true);
  const groups=new Map();
  scene.traverse(object=>{
    if(!object.isMesh||object.userData.moving||object.material.transparent||!geometries.includes(object.geometry))return;
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
