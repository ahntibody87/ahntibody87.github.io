(() => {
 const intro=document.querySelector('#course-intro'),panel=document.querySelector('#course-units-panel');
 if(!intro||!panel)return;
 const reduce=matchMedia('(prefers-reduced-motion:reduce)');let switching=false;
 async function show(units){
  if(switching)return;
  if(units&&!document.documentElement.dataset.courseEntryGranted){panel.hidden=false;intro.hidden=true;window.scrollTo({top:0,behavior:'instant'});return;}
  const from=units?intro:panel,to=units?panel:intro;if(!to.hidden)return;
  switching=true;
  if(!reduce.matches)await from.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-12px)'}],{duration:180,easing:'ease-out'}).finished;
  from.hidden=true;to.hidden=false;window.scrollTo({top:0,behavior:'instant'});
  if(!reduce.matches)await to.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.2,.7,.2,1)'}).finished;
  (units?document.querySelector('#units'):document.querySelector('#course-title')).focus({preventScroll:true});switching=false;
 }
 document.addEventListener('atll-open-units',()=>show(true));
 addEventListener('popstate',()=>show(location.hash==='#units'));
 addEventListener('load',()=>{if(location.hash==='#units')requestAnimationFrame(()=>window.scrollTo({top:0,behavior:'instant'}));},{once:true});
 addEventListener('hashchange',()=>show(location.hash==='#units'));
 document.addEventListener('atll-entry-granted',e=>{if(e.detail.id==='advanced-life-science')show(true);});
 document.querySelector('.course-intro-back').addEventListener('click',()=>{history.replaceState(null,'',location.pathname);show(false);});
 if(location.hash==='#units')show(true);
 const figure=document.querySelector('.course-cell'),plane=document.querySelector('.cell-parallax');
 let pointerFrame=0;
 const resetScene=()=>{cancelAnimationFrame(pointerFrame);plane.style.transform='';figure.style.removeProperty('--scene-x');figure.style.removeProperty('--scene-y');};
 figure.addEventListener('pointermove',e=>{
  if(reduce.matches||e.pointerType!=='mouse')return;
  const r=figure.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/r.width,y=(e.clientY-r.top-r.height/2)/r.height;
  cancelAnimationFrame(pointerFrame);pointerFrame=requestAnimationFrame(()=>{plane.style.transform=`perspective(1200px) rotateY(${x*3.5}deg) rotateX(${-y*2.5}deg)`;figure.style.setProperty('--scene-x',`${x*12}px`);figure.style.setProperty('--scene-y',`${y*9}px`);});
 });
 figure.addEventListener('pointerleave',resetScene);reduce.addEventListener('change',resetScene);
 new IntersectionObserver(entries=>figure.classList.toggle('motion-offscreen',!entries[0].isIntersecting),{threshold:.05}).observe(figure);
 document.addEventListener('visibilitychange',()=>{figure.classList.toggle('motion-background',document.hidden);if(document.hidden)resetScene();});
})();
