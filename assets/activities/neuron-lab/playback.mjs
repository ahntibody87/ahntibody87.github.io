const NS='http://www.w3.org/2000/svg';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function upperBound(values,time){let lo=0,hi=values.length;while(lo<hi){const mid=(lo+hi)>>>1;if(values[mid]<=time+1e-8)lo=mid+1;else hi=mid;}return lo;}
export function valueAt(time,values,t){return values[Math.max(0,upperBound(time,t)-1)];}
export function playbackTimeline(result){
  const duration=result.circuit.duration;
  const spikes=result.neurons.flatMap(n=>n.spikes.filter(t=>t>=0&&t<=duration).map(time=>({type:'spike',time,node:n.id,label:n.label})));
  const arrivals=(result.arrivals||[]).filter(a=>a.time<=duration).map(a=>({...a,type:'arrival',label:result.neurons.find(n=>n.id===a.to)?.label||a.to}));
  const events=[...spikes,...arrivals].sort((a,b)=>a.time-b.time);
  const times=[...new Set(events.map(e=>e.time))];
  const focus=events.length?[Math.max(0,events[0].time-6),Math.min(duration,events.at(-1).time+18)]:[0,Math.min(duration,50)];
  return {duration,events,times,focus};
}
export function signalsAt(result,time){
  return (result.arrivals||[]).filter(a=>a.weight!==0&&a.depart<=time&&a.time>time&&a.time>a.depart).map(a=>({...a,progress:clamp((time-a.depart)/(a.time-a.depart),0,1)}));
}
function svg(tag,attrs={}){const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));return el;}

// Visual playback reads recorded simulation events. It never injects new spikes.
export class NeuralPlayback {
  constructor({host,scene,plots=[],result,label='회로',speed=.01,autoplay=false}){
    this.host=host;this.scene=scene;this.result=result;this.label=label;this.timeline=playbackTimeline(result);this.time=0;this.running=false;this.frame=null;this.lastWall=null;this.loopWait=null;this.destroyed=false;this.stale=false;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id=host.id;
    host.innerHTML=`<div class="nl-play-heading"><strong>발화 재생</strong><span class="nl-play-clock" aria-live="off">0.00 ms</span></div><div class="nl-play-controls"><button type="button" data-action="play" class="nl-primary" aria-label="${esc(label)} 발화 재생">▶ 재생</button><button type="button" data-action="restart" aria-label="${esc(label)} 처음부터 다시 재생">↺ 다시</button><button type="button" data-action="next" aria-label="${esc(label)} 다음 발화 또는 신호 도착">다음 사건 ›</button><label for="${id}-speed">재생 속도<select id="${id}-speed" data-control="speed">${[.002,.01,.05,.1,.2,1].map(v=>`<option value="${v}"${v===speed?' selected':''}>${v}×${v<1?' · '+Math.round(1/v)+'배 느리게':''}</option>`).join('')}</select></label></div><label class="nl-play-scrub" for="${id}-time">시간 이동<input id="${id}-time" data-control="time" type="range" min="0" max="${this.timeline.duration}" step="0.025" value="0" aria-label="${esc(label)} 재생 시간 (ms)"></label><div class="nl-play-options"><label><input type="checkbox" data-control="focus" checked>발화 주변 구간</label><label><input type="checkbox" data-control="loop"${this.reduced?'':' checked'}>반복 재생</label><span data-control="window"></span></div><p class="nl-play-event" data-control="event" aria-live="off">재생을 누르거나 다음 사건을 선택하세요.</p><p class="nl-play-note">계산한 발화·도착 시점에 맞춘 재생입니다. 뉴런 안 숫자는 막전위(mV)입니다. 관찰을 위해 빛의 지속 시간을 늘렸으며 실제 활동전위의 폭·이동 거리와는 다릅니다.${this.reduced?' 움직임 감소 설정에 따라 자동 재생을 껐습니다.':''}</p>`;
    this.playButton=host.querySelector('[data-action=play]');this.slider=host.querySelector('[data-control=time]');this.speedControl=host.querySelector('[data-control=speed]');this.focusControl=host.querySelector('[data-control=focus]');this.loopControl=host.querySelector('[data-control=loop]');this.clock=host.querySelector('.nl-play-clock');this.event=host.querySelector('[data-control=event]');
    this.nodeElements=new Map([...scene.querySelectorAll('[data-neuron]')].map(el=>[el.dataset.neuron,el]));
    this.edgeElements=new Map([...scene.querySelectorAll('path[data-edge]')].map(el=>[Number(el.dataset.edge),{path:el,length:el.getTotalLength()}]));
    this.signalLayer=svg('g',{'aria-hidden':'true',class:'nl-travel-signals'});scene.querySelector('svg')?.append(this.signalLayer);this.particles=[];
    this.overlays=plots.flatMap(container=>[...container.querySelectorAll('svg')].map(chart=>{
      const W=chart.viewBox.baseVal.width,H=chart.viewBox.baseVal.height,L=60,R=22,T=30,B=43;
      const overlay=svg('g',{'aria-hidden':'true',class:'nl-play-overlay'}),future=svg('rect',{x:L,y:T,width:W-L-R,height:H-T-B,fill:'#fff',opacity:.68}),cursor=svg('line',{x1:L,x2:L,y1:1,y2:H-B,stroke:'#d48a36','stroke-width':2,'stroke-dasharray':'4 3'});
      overlay.append(future,cursor);chart.append(overlay);return {overlay,future,cursor,L,R,W,start:result.time[0]||0,end:result.time.at(-1)||this.timeline.duration};
    }));
    this.listener=e=>{
      const action=e.target.closest('button')?.dataset.action;
      if(action==='play'){this.running?this.pause():this.play();}
      if(action==='restart'){this.pause();this.seek(this.bounds()[0]);this.play();}
      if(action==='next'){this.pause();const next=this.timeline.times.find(t=>t>this.time+1e-6);this.seek(next??this.bounds()[1]);}
    };
    host.addEventListener('click',this.listener);
    this.scrub=()=>{this.pause();this.seek(Number(this.slider.value));};this.slider.addEventListener('input',this.scrub);
    this.focusChange=()=>{this.pause();this.seek(this.bounds()[0]);};this.focusControl.addEventListener('change',this.focusChange);
    this.visibility=()=>{if(document.hidden)this.pause();};document.addEventListener('visibilitychange',this.visibility);
    this.speedControl.addEventListener('change',()=>{this.lastWall=null;this.render(this.time);});
    this.seek(this.bounds()[0]);
    if(autoplay&&!this.reduced)this.play();
  }
  bounds(){return this.focusControl.checked?this.timeline.focus:[0,this.timeline.duration];}
  seek(t){this.time=clamp(t,0,this.timeline.duration);this.render(this.time);}
  render(previous=this.time){
    const t=this.time,speed=Number(this.speedControl.value),glowMS=Math.max(.2,160*speed);
    this.host.dataset.playbackTime=t.toFixed(3);this.host.dataset.playing=String(this.running);this.slider.value=String(t);this.slider.setAttribute('aria-valuetext',`${t.toFixed(2)} ms`);this.clock.textContent=`${t.toFixed(2)} / ${this.timeline.duration.toFixed(0)} ms`;
    const [start,end]=this.bounds();this.host.querySelector('[data-control=window]').textContent=`${start.toFixed(1)}–${end.toFixed(1)} ms`;
    for(const n of this.result.neurons){
      const el=this.nodeElements.get(n.id);if(!el)continue;const count=upperBound(n.spikes,t),last=n.spikes[count-1],crossed=previous<t&&n.spikes.some(s=>s>previous&&s<=t);
      const active=last!=null&&t-last<glowMS||crossed;
      el.classList.toggle('nl-firing',active);el.dataset.fired=String(active);el.dataset.spikeCount=String(count);
      const body=el.querySelector('[data-live-voltage]');if(body){const v=valueAt(this.result.time,n.voltage,t);body.textContent=n.role?.startsWith('input')?(active?'발화':'IN'):Number.isFinite(v)?`${v.toFixed(1)}`:'—';}
      const halo=el.querySelector('.nl-spike-halo');if(halo)halo.setAttribute('opacity',active?'1':'0');
    }
    const signals=signalsAt(this.result,t);
    let particleIndex=0;for(const signal of signals){const edge=this.edgeElements.get(signal.edgeIndex);if(!edge)continue;let particle=this.particles[particleIndex];if(!particle){particle=svg('circle',{r:6,class:'nl-signal-particle'});this.signalLayer.append(particle);this.particles.push(particle);}const p=edge.path.getPointAtLength(edge.length*signal.progress);particle.setAttribute('cx',p.x);particle.setAttribute('cy',p.y);particle.setAttribute('fill',signal.sign<0?'#ff9298':'#8fffe4');particle.setAttribute('stroke',signal.sign<0?'#ffdadc':'#e0fff9');particle.setAttribute('visibility','visible');particleIndex++;}
    for(let i=particleIndex;i<this.particles.length;i++)this.particles[i].setAttribute('visibility','hidden');
    for(const [i,e] of this.edgeElements){const arrival=(this.result.arrivals||[]).some(a=>a.edgeIndex===i&&a.weight!==0&&a.time<=t&&t-a.time<glowMS);e.path.classList.toggle('nl-synapse-active',arrival);}
    for(const o of this.overlays){const x=o.L+clamp((t-o.start)/(o.end-o.start),0,1)*(o.W-o.L-o.R);o.cursor.setAttribute('x1',x);o.cursor.setAttribute('x2',x);o.future.setAttribute('x',x);o.future.setAttribute('width',Math.max(0,o.W-o.R-x));}
    const recent=this.timeline.events.filter(e=>e.time<=t&&t-e.time<Math.max(glowMS,.3));
    this.event.textContent=this.stale?'조건이 바뀌었습니다. 실험을 다시 실행하세요.':recent.length?recent.slice(-4).map(e=>`${e.time.toFixed(2)} ms ${e.label} ${e.type==='spike'?'발화':e.sign<0?'억제성 신호 도착':'흥분성 신호 도착'}`).join(' · '):this.timeline.events.length?'입력을 누적하는 동안 막전위 변화를 관찰하세요.':'이 조건에서는 발화·도착 사건이 없습니다.';
  }
  play(){
    if(this.stale||this.destroyed)return;const [start,end]=this.bounds();if(this.time<start||this.time>=end)this.seek(start);this.running=true;this.lastWall=null;this.loopWait=null;this.playButton.textContent='❚❚ 일시정지';this.playButton.setAttribute('aria-label',`${this.label} 발화 재생 일시정지`);this.host.dataset.playing='true';
    const tick=wall=>{
      if(!this.running||this.destroyed)return;
      if(document.hidden||!this.host.isConnected||this.host.closest('[hidden]')){this.pause();return;}
      const before=this.time;
      if(this.loopWait!=null){if(wall>=this.loopWait){this.time=this.bounds()[0];this.loopWait=null;}this.lastWall=wall;}
      else{const elapsed=this.lastWall==null?0:Math.min(100,Math.max(0,wall-this.lastWall));this.lastWall=wall;this.time=Math.min(this.bounds()[1],this.time+elapsed*Number(this.speedControl.value));}
      this.render(before);
      if(this.time>=this.bounds()[1]){if(this.loopControl.checked)this.loopWait??=wall+450;else{this.pause();return;}}
      this.frame=requestAnimationFrame(tick);
    };this.frame=requestAnimationFrame(tick);
  }
  pause(){this.running=false;if(this.frame!=null)cancelAnimationFrame(this.frame);this.frame=null;this.lastWall=null;this.playButton.textContent='▶ 재생';this.playButton.setAttribute('aria-label',`${this.label} 발화 재생`);this.host.dataset.playing='false';}
  invalidate(){this.pause();this.stale=true;for(const control of this.host.querySelectorAll('button,input,select'))control.disabled=true;this.render();}
  destroy(){this.pause();this.destroyed=true;this.host.removeEventListener('click',this.listener);this.slider.removeEventListener('input',this.scrub);this.focusControl.removeEventListener('change',this.focusChange);document.removeEventListener('visibilitychange',this.visibility);for(const o of this.overlays)o.overlay.remove();this.signalLayer.remove();}
}
