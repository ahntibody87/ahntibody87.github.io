export const roomSize={width:10.8,depth:9.6,height:3.18};
export const spawn={x:5.45,z:8.75,yaw:0};
export const benches=[
  {x:2.85,z:5.65,w:3.55,d:1.35},
  {x:3.30,z:2.77,w:2.75,d:1.30},
  {x:8.05,z:4.2,w:2.50,d:1.35},
  {x:8.07,z:6.85,w:2.45,d:1.25}
];
export const stools=[
  {x:2.65,z:6.29}, {x:3.66,z:6.29}, {x:2.85,z:3.36}, {x:3.86,z:3.36},
  {x:7.56,z:4.83}, {x:8.53,z:4.83}, {x:8.15,z:7.42}
];
export const stations=[
  {id:'ice',name:'아이스박스',x:1.88,z:5.67,standZ:6.83,viewZ:6.57,eye:1.62,tilt:-.41,action:'뚜껑을 내려다보는 위치'},
  {id:'prep',name:'피펫 작업대',x:3.64,z:5.78,standZ:6.87,viewZ:6.50,eye:1.19,tilt:-.24,action:'의자에 앉은 높이'},
  {id:'pcr',name:'PCR 기기',x:8.06,z:4.15,standZ:5.46,viewZ:5.16,eye:1.56,tilt:-.32,action:'조작 패널을 마주 보는 위치'},
  {id:'gel',name:'전기영동 장치',x:3.29,z:2.80,standZ:4.00,viewZ:3.67,eye:1.64,tilt:-.49,action:'수조와 웰을 내려다보는 위치'}
];
const solid=[
  ...benches,
  ...stools.map(({x,z})=>({x,z,w:.43,d:.43})),
  {x:.36,z:4.18,w:.72,d:7.5},
  {x:5.4,z:.32,w:9.45,d:.64},
  {x:10.5,z:3.07,w:.6,d:4.5}
];

export function canStand(x,z,radius=.19){
  if(x<radius||x>roomSize.width-radius||z<radius||z>roomSize.depth-radius)return false;
  return !solid.some(item=>{
    const dx=Math.max(Math.abs(x-item.x)-item.w/2,0);
    const dz=Math.max(Math.abs(z-item.z)-item.d/2,0);
    return Math.hypot(dx,dz)<radius;
  });
}
