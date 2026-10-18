// Display paths only. Oxygen/glucose illustration is independent of the drug model.
export const GLUCOSE_Y = 420;
export const CARRIER_Y = 276;
function interpolate(nodes, phase) {
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1], b = nodes[i];
    if (phase <= b[0]) {
      const t = (phase - a[0]) / (b[0] - a[0]);
      return {x:a[1]+(b[1]-a[1])*t,y:a[2]+(b[2]-a[2])*t};
    }
  }
  return {x:nodes.at(-1)[1],y:nodes.at(-1)[2]};
}
export function basalTransport(kind, seconds, particle = 0) {
  const glucose = kind === 'glucose';
  const duration = glucose ? 24 : 18;
  const phase = ((seconds / duration + particle / (glucose ? 6 : 12)) % 1 + 1) % 1;
  // Safe transverse lanes avoid nuclei and the intercellular junctions.
  const lanes = [92,224,280,426,478,613];
  const y = lanes[particle % lanes.length];
  const nodes = glucose
    ? [[0,150,385+particle*5],[.20,391,GLUCOSE_Y],[.28,418,GLUCOSE_Y],
       [.38,418,GLUCOSE_Y],[.43,439,GLUCOSE_Y],[.57,518,GLUCOSE_Y],
       [.62,539,GLUCOSE_Y],[.72,539,GLUCOSE_Y],[.78,573,GLUCOSE_Y],
       [1,1010,470+particle*15]]
    : [[0,180,y],[.28,400,y],[.46,550,y],[1,1010,y]];
  return {...interpolate(nodes,phase),phase,
    alpha:Math.min(1,phase/.04,(1-phase)/.06),
    luminalBinding:glucose&&phase>=.28&&phase<.43,
    brainBinding:glucose&&phase>=.62&&phase<.78};
}
export function advanceTowards(current, target, distance) {
  const dx=target.x-current.x,dy=target.y-current.y,length=Math.hypot(dx,dy);
  if(length<=distance || length===0)return {...target};
  return {x:current.x+dx/length*distance,y:current.y+dy/length*distance};
}
