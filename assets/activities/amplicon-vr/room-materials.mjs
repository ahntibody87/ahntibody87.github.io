import * as T from '../embryo-atlas/vendor/three.module.min.js';

export const referencePose={x:5,z:8.25,yaw:0,pitch:-.045};
export const eyeHeight=1.61;
export const fieldOfView=49;
export const referenceAspect=16/9;

function imageTexture(file,wrap=false){
  const texture=new T.Texture();
  texture.colorSpace=T.SRGBColorSpace;
  if(wrap)texture.wrapS=T.RepeatWrapping;
  const image=new Image();
  image.src=new URL(file,import.meta.url).href;
  const ready=image.decode().then(()=>{
    texture.image=image;
    texture.needsUpdate=true;
    return image;
  }).catch(()=>null);
  return {texture,ready};
}

export function daylightMaterials(materials){
  const projector=new T.PerspectiveCamera(fieldOfView,referenceAspect,.045,35);
  const origin=new T.Vector3(referencePose.x,eyeHeight,referencePose.z);
  projector.position.copy(origin);
  projector.rotation.set(referencePose.pitch,referencePose.yaw,0,'YXZ');
  projector.updateMatrixWorld();
  const projection=new T.Matrix4().multiplyMatrices(projector.projectionMatrix,projector.matrixWorldInverse);
  const plate=imageTexture('bench-daylight.webp');
  const panorama=imageTexture('room-surround.webp',true);
  const strength={value:0};
  const panoramaStrength={value:0};
  const projected=new Map();
  const viewer=origin.clone();
  let loaded=false,hasSurround=false;

  function photoMaterial(key){
    if(projected.has(key))return projected.get(key);
    const material=materials[key].clone();
    material.onBeforeCompile=shader=>{
      Object.assign(shader.uniforms,{
        labPhoto:{value:plate.texture},labProjection:{value:projection},labPhotoStrength:strength,
        labPanorama:{value:panorama.texture},labPanoramaStrength:panoramaStrength,
        labOrigin:{value:origin},labViewer:{value:viewer}
      });
      shader.vertexShader='uniform mat4 labProjection; varying vec4 labUV; varying vec3 labWorld;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',
        '#include <project_vertex>\nlabWorld=(modelMatrix*vec4(transformed,1.0)).xyz; labUV=labProjection*vec4(labWorld,1.0);');
      shader.fragmentShader=`
        uniform sampler2D labPhoto, labPanorama;
        uniform float labPhotoStrength, labPanoramaStrength;
        uniform vec3 labOrigin,labViewer;
        varying vec4 labUV;
        varying vec3 labWorld;
      `+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>',`
        vec3 labRay=normalize(labWorld-mix(labOrigin,labViewer,.80));
        float azimuth=atan(labRay.x,-labRay.z);
        float az=abs(azimuth);
        float expAz=exp(az*1.80);
        float u=.5035*(expAz-1.0)/(expAz+1.0);
        float elevation=asin(clamp(labRay.y,-1.0,1.0));
        float absElevation=abs(elevation);
        float tail=elevation>0.0?.29:.04;
        float v=.35+sign(elevation)*(min(absElevation,.45)/1.46+max(absElevation-.45,0.0)*tail);
        vec2 labSphere=vec2(.5+sign(azimuth)*u,v);
        if(labPanoramaStrength>0.0){
          gl_FragColor.rgb=mix(gl_FragColor.rgb,texture2D(labPanorama,labSphere).rgb,labPanoramaStrength);
        }
        vec2 labCoord=labUV.xy/max(labUV.w,.0001)*.5+.5;
        float edge=min(min(labCoord.x,1.0-labCoord.x),min(labCoord.y,1.0-labCoord.y));
        if(labUV.w>0.0&&edge>=0.0){
          float blend=smoothstep(0.0,.06,edge)*labPhotoStrength;
          gl_FragColor.rgb=mix(gl_FragColor.rgb,texture2D(labPhoto,labCoord).rgb,blend);
        }
        #include <colorspace_fragment>
      `);
    };
    projected.set(key,material);
    return material;
  }

  const ready=plate.ready.then(image=>{
    if(!image)return;
    loaded=true;
    const crops={
      epoxy:[.44,.82,.17,.15],
      wood:[.64,.28,.05,.09],
      enamel:[.12,.47,.09,.08],
      paint:[.49,.045,.035,.020],
      window:[.023,.084,.052,.14],
      floor:[.64,.46,.068,.12]
    };
    for(const [key,[x,y,w,h]] of Object.entries(crops)){
      const canvas=document.createElement('canvas');
      canvas.width=256;
      canvas.height=256;
      const ctx=canvas.getContext('2d');
      ctx.drawImage(image,image.width*x,image.height*y,image.width*w,image.height*h,0,0,256,256);
      const texture=new T.CanvasTexture(canvas);
      texture.colorSpace=T.SRGBColorSpace;
      if(key==='floor'){
        texture.wrapS=texture.wrapT=T.MirroredRepeatWrapping;
        texture.repeat.set(8,8);
      }
      for(const material of [materials[key],projected.get(key)].filter(Boolean)){
        material.map=texture;
        material.color.set(key==='epoxy'?'#bababa':'#ffffff');
        material.needsUpdate=true;
      }
    }
  });
  return {
    material:photoMaterial,
    ready:Promise.all([ready,panorama.ready.then(image=>{hasSurround=!!image;})]),
    aim(x,z){
      viewer.set(x,eyeHeight,z);
      const distance=Math.hypot(x-referencePose.x,z-referencePose.z);
      strength.value=loaded&&!hasSurround?1-T.MathUtils.smoothstep(distance,.05,1.95):0;
      panoramaStrength.value=hasSurround?1:0;
    }
  };
}
