const art = {
  pipette: 'pipette-hand.webp',
  tips: 'tip-box.webp',
  open: 'icebox-open.webp',
  closed: 'icebox-closed.webp',
  rack: 'rack-in-hand.webp',
  reactionRack: 'reaction-rack.webp',
  tube: 'reaction-tube.webp',
  stocks: 'cold-block.webp',
  reagent: 'reagent-vial.webp'
};
let images, ready;
function loadProps(){
  if(images)return;
  images=Object.fromEntries(Object.entries(art).map(([key,file])=>{
    const image=new Image();
    image.src=new URL(file,import.meta.url).href;
    return [key,image];
  }));
  ready=Promise.allSettled(Object.values(images).map(image=>image.decode()));
}
const available=key=>images[key].complete&&images[key].naturalWidth>0;

function shadow(ctx,x,y,width,height){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(width,height);
  const falloff=ctx.createRadialGradient(0,0,.15,0,0,1);
  falloff.addColorStop(0,'#14161688');
  falloff.addColorStop(1,'#14161600');
  ctx.fillStyle=falloff;
  ctx.fillRect(-1,-1,2,2);
  ctx.restore();
}

const propMasks={
  tube:new Path2D('M.10 .065 Q.11 .017 .18 .014 Q.224 .008 .277 .052 Q.34 .052 .385 .118 Q.433 .191 .356 .239 L.38 .279 L.42 .294 Q.60 .24 .724 .295 Q.817 .32 .758 .376 L.73 .41 Q.71 .57 .70 .666 Q.67 .80 .622 .937 Q.58 .995 .526 .966 Q.495 .948 .475 .902 Q.419 .744 .414 .64 L.395 .41 Q.355 .38 .365 .337 L.315 .322 L.288 .276 Q.178 .263 .139 .167 Z'),
  reagent:new Path2D('M.229 .08 Q.245 .014 .49 .012 Q.75 .012 .76 .077 L.77 .24 Q.76 .267 .749 .275 L.74 .312 L.714 .343 L.709 .913 Q.699 .979 .51 .99 Q.31 .984 .285 .929 L.278 .351 L.248 .325 L.245 .272 Q.224 .258 .224 .237 Z')
};
function drawMasked(ctx,key,x,y,width,height){
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(width,height);
  ctx.clip(propMasks[key]);
  ctx.drawImage(images[key],0,0,1,1);
  ctx.restore();
}

function drawCooler(ctx,objects,project){
  const cooler=objects.find(item=>item.kind==='cooler');
  if(!cooler)return;
  const key=cooler.open?'open':'closed';
  if(!available(key))return;
  const anchor=project([cooler.x,0,cooler.z]);
  const left=anchor.x-334, top=anchor.y-215, width=670, height=279;
  shadow(ctx,anchor.x,top+height-2,177,16);
  ctx.save();
  if(cooler.open){
    // Keep the portable cooler silhouette while removing the studio edge lighting.
    ctx.translate(left,top);
    ctx.scale(width,height);
    const shape=new Path2D('M.27 .09 Q.28 .02 .36 .02 L.45 .02 L.46 .012 L.55 .012 L.56 .02 L.68 .02 Q.74 .02 .739 .10 L.72 .38 L.69 .405 Q.72 .423 .736 .49 L.766 .65 L.758 .724 L.727 .956 Q.719 .985 .681 .986 L.31 .986 Q.258 .985 .251 .945 L.222 .723 L.222 .641 L.278 .456 Q.295 .407 .327 .399 Q.286 .395 .282 .35 Z');
    ctx.clip(shape);
    ctx.drawImage(images[key],0,0,1,1);
  }else{
    ctx.translate(left,top);
    ctx.scale(width,height);
    const shape=new Path2D('M.251 .466 Q.267 .394 .312 .382 L.345 .382 L.35 .37 L.39 .37 L.395 .382 L.606 .382 L.61 .369 L.65 .369 L.655 .382 L.682 .382 Q.727 .387 .739 .452 L.772 .577 Q.78 .623 .774 .677 L.746 .888 Q.74 .963 .71 .982 L.297 .982 Q.264 .981 .249 .941 L.226 .728 Q.213 .664 .219 .599 Z');
    ctx.clip(shape);
    ctx.drawImage(images[key],0,0,1,1);
  }
  ctx.restore();
}

function drawPipette(ctx,tool,tip,liquid,project){
  if(!tool||!available('pipette'))return;
  const point=project([tool.x,tool.y,tool.z]);
  const width=625,height=340;
  const x=point.x-width*(tip?.309:.338);
  const y=point.y-height*(tip?.987:.763);
  ctx.save();
  if(!tip){
    // Mask the removable clear tip without cutting through the coat sleeve.
    ctx.beginPath();
    ctx.moveTo(x,y);ctx.lineTo(x+width,y);
    ctx.lineTo(x+width,y+height);ctx.lineTo(x+width*.37,y+height);
    ctx.lineTo(x+width*.37,y+height*.762);ctx.lineTo(x,y+height*.762);
    ctx.closePath();ctx.clip();
  }
  ctx.drawImage(images.pipette,x,y,width,height);
  const cuff=y+height;
  if(cuff<440&&cuff>260){
    const image=images.pipette;
    const edge=32;
    ctx.drawImage(image,0,image.naturalHeight-edge,image.naturalWidth,edge,x,cuff-7,width,448-cuff);
  }
  ctx.restore();
  if(tip&&liquid){
    ctx.beginPath();
    ctx.moveTo(point.x+2,point.y-5);
    ctx.lineTo(point.x+7,point.y-25);
    ctx.strokeStyle='#7abed3b0';
    ctx.lineWidth=2;
    ctx.stroke();
  }
}

export function benchVisual(kind){
  if(kind!=='prep'&&kind!=='cooler')return null;
  loadProps();
  function usesPhoto(object){
    if(object.kind==='receivingPad'||object.kind==='ice')return true;
    if(object.kind==='tips')return available('tips');
    if(object.kind==='rack')return available('reactionRack');
    if(object.kind==='coldRack'||object.id?.startsWith('stock:')||object.id?.startsWith('sample:'))return available('stocks');
    if(object.id?.startsWith('tube:'))return available('tube');
    if(object.kind==='bottle')return available('reagent');
    return object.kind==='cooler'&&available(object.open?'open':'closed');
  }
  return {
    offset:kind==='prep'?109:85,
    scale:kind==='prep'?.77:1,
    ready,
    hasPipette:()=>kind==='prep'&&available('pipette'),
    replaces:usesPhoto,
    drawBase(ctx,objects,project){
      drawCooler(ctx,objects,project);
      for(const item of objects){
        if(!usesPhoto(item))continue;
        const point=project([item.x,item.base??0,item.z]);
        if(item.kind==='coldRack'){
          const travelling=kind==='cooler'&&item.x>-2.8&&item.x<3.2&&available('rack');
          if(!travelling){
            const width=kind==='cooler'?320:470;
            const height=kind==='cooler'?94:80;
            ctx.drawImage(images.stocks,point.x-width/2,point.y-height+14,width,height);
          }
        }else if(item.kind==='rack'){
          shadow(ctx,point.x,point.y+30,215,14);
          ctx.drawImage(images.reactionRack,point.x-190,point.y-51,380,105);
        }else if(item.id?.startsWith('tube:')){
          drawMasked(ctx,'tube',point.x-21,point.y-52,37,60);
          if(item.fill>.06){
            ctx.fillStyle='#86bbd666';
            ctx.beginPath();
            ctx.ellipse(point.x+3,point.y-4,4,3+item.fill*8,0,0,Math.PI*2);
            ctx.fill();
          }
        }else if(item.kind==='bottle'&&!item.id?.startsWith('sample:')){
          drawMasked(ctx,'reagent',point.x-25,point.y-49,50,55);
        }
      }
    },
    drawForeground(ctx,objects,tool,tip,liquid,project){
      const tips=objects.find(item=>item.kind==='tips');
      if(tips&&available('tips')){
        const point=project([tips.x,0,tips.z]);
        shadow(ctx,point.x,point.y+17,88,12);
        ctx.drawImage(images.tips,point.x-108,point.y-108,216,122);
      }
      const rack=kind==='cooler'&&objects.find(item=>item.kind==='coldRack');
      if(rack&&rack.x>-2.8&&rack.x<3.2&&available('rack')){
        const progress=(rack.x+2.8)/6;
        const point=project([rack.x,rack.base+.24,rack.z]);
        ctx.save();
        ctx.globalAlpha=Math.min(1,progress*10,(1-progress)*10);
        ctx.drawImage(images.rack,point.x-220,point.y-83,440,248);
        ctx.restore();
      }
      drawPipette(ctx,tool,tip,liquid,project);
    }
  };
}
