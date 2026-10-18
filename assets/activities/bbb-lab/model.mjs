// Educational, dimensionless compartment model. See docs/bbb-lab.md.
export const defaults = Object.freeze({logp:2.2,mw:320,psa:70,hbd:1,pka:7.8,kind:'base',ph:7.4,pro:false,route:'mask',blood:'stable',release:'balanced'});
export function neutralFraction(kind, pka, ph) {
  if (kind === 'neutral') return 1;
  return 1 / (1 + 10 ** (kind === 'acid' ? ph - pka : pka - ph));
}
export function properties(p, pro = false) {
  if (!pro) return {...p};
  // These illustrative changes are a fictional design card, not calculated chemistry.
  return p.route === 'mask'
    ? {...p,logp:Math.min(7,p.logp+.8),mw:p.mw+42,psa:Math.max(10,p.psa-35),hbd:Math.max(0,p.hbd-1)}
    : {...p,logp:p.logp-.4,mw:p.mw+100,psa:p.psa+25,hbd:p.hbd+1};
}
export function permeability(p) {
  const neutral = neutralFraction(p.kind,p.pka,p.ph);
  const size = Math.exp(-Math.max(0,p.mw-180)/440);
  const polar = Math.exp(-p.psa/110);
  const hydrogen = Math.exp(-.22*p.hbd);
  const membrane = 1/(1+Math.exp(-(p.logp-.8)*1.5));
  const availability = 1/(1+.18*10**Math.max(0,p.logp-2));
  // The downturn at high logP represents limited aqueous availability in this model.
  const rate = .9*size*polar*hydrogen*membrane*availability*(neutral+.015*(1-neutral));
  return {neutral,rate,size,polar,hydrogen,membrane,availability};
}
export function simulate(p, pro = false) {
  const parent = permeability(p).rate;
  const derivative = permeability(properties(p,true)).rate;
  const bloodActivation = {stable:.003,medium:.035,fragile:.16}[p.blood];
  const brainActivation = {slow:.008,balanced:.12,fast:.4}[p.release];
  // Amounts in three effective compartments, initially 100 units in blood.
  // [blood active, blood prodrug, endothelium active, endothelium prodrug,
  //  brain active, brain prodrug, removed]. Bidirectional passive fluxes.
  let y = pro ? [0,100,0,0,0,0,0] : [100,0,0,0,0,0,0];
  const samples = [{t:0,y:[...y]}];
  const dt=.025;
  for(let step=1;step<=2400;step++) {
    const [ba,bp,ea,ep,ca,cp] = y;
    const d=Array(7).fill(0);
    const move=(from,to,amount)=>{d[from]-=amount;d[to]+=amount;};
    move(0,2,parent*(ba-ea));
    move(2,4,.8*parent*(ea-ca));
    move(1,3,derivative*(bp-ep));
    move(3,5,.8*derivative*(ep-cp));
    if(pro && p.route==='carrier') {
      // Saturable lumped delivery, not a literal pore across both membranes.
      move(1,3,1.1*bp/(25+bp));
      move(3,5,.18*ep);
    }
    if(pro) {move(1,0,bloodActivation*bp);move(5,4,brainActivation*cp);}
    move(0,6,.006*ba); move(1,6,.006*bp);
    move(4,6,.004*ca); move(5,6,.004*cp);
    y=y.map((v,i)=>v+dt*d[i]);
    if(step%20===0) samples.push({t:step*dt,y:[...y]});
  }
  return samples;
}
export function experiment(p) {
  const direct=simulate(p,false);
  return {direct,selected:p.pro?simulate(p,true):direct};
}
