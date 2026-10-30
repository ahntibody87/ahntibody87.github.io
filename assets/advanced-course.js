(() => {
 const intro=document.querySelector('#course-intro'),panel=document.querySelector('#course-units-panel');
 if(!intro||!panel)return;
 const reduce=matchMedia('(prefers-reduced-motion:reduce)');let switching=false;
 async function show(units){
  if(switching)return;
  if(units&&!document.documentElement.dataset.courseEntryGranted){panel.hidden=false;intro.hidden=true;return;}
  const from=units?intro:panel,to=units?panel:intro;if(!to.hidden)return;
  switching=true;
  if(!reduce.matches)await from.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-12px)'}],{duration:180,easing:'ease-out'}).finished;
  from.hidden=true;to.hidden=false;to.scrollIntoView({block:'start',behavior:'instant'});
  if(!reduce.matches)await to.animate([{opacity:0,transform:'translateY(18px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.2,.7,.2,1)'}).finished;
  (units?document.querySelector('#units'):document.querySelector('#course-title')).focus({preventScroll:true});switching=false;
 }
 addEventListener('hashchange',()=>show(location.hash==='#units'));
 document.addEventListener('atll-entry-granted',e=>{if(e.detail.id==='advanced-life-science')show(true);});
 document.querySelector('.course-intro-back').addEventListener('click',()=>{history.replaceState(null,'',location.pathname);show(false);});
 if(location.hash==='#units')show(true);
 const figure=document.querySelector('.course-cell'),plane=document.querySelector('.cell-parallax'),toggle=document.querySelector('.cell-motion-toggle');
 toggle.addEventListener('click',()=>{const paused=toggle.getAttribute('aria-pressed')!=='true';toggle.setAttribute('aria-pressed',String(paused));toggle.textContent=paused?'모션 재생':'모션 일시정지';figure.classList.toggle('motion-paused',paused);plane.style.transform='';});
 figure.addEventListener('pointermove',e=>{if(reduce.matches||e.pointerType!=='mouse'||figure.classList.contains('motion-paused'))return;const r=figure.getBoundingClientRect();plane.style.transform=`perspective(1000px) rotateY(${(e.clientX-r.left-r.width/2)/r.width*7}deg) rotateX(${-(e.clientY-r.top-r.height/2)/r.height*5}deg)`;});
 figure.addEventListener('pointerleave',()=>plane.style.transform='');
 document.addEventListener('visibilitychange',()=>figure.classList.toggle('motion-background',document.hidden));
})();
