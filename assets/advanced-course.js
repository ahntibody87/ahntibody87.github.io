(() => {
 const figure=document.querySelector('.course-cell'),plane=document.querySelector('.cell-parallax');
 if(!figure||!plane)return;
 const reduce=matchMedia('(prefers-reduced-motion:reduce)');
 let pointerFrame=0;
 const resetScene=()=>{cancelAnimationFrame(pointerFrame);plane.style.transform='';figure.style.removeProperty('--scene-x');figure.style.removeProperty('--scene-y');};
 figure.addEventListener('pointermove',e=>{
  if(reduce.matches||e.pointerType!=='mouse')return;
  const r=figure.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/r.width,y=(e.clientY-r.top-r.height/2)/r.height;
  cancelAnimationFrame(pointerFrame);pointerFrame=requestAnimationFrame(()=>{plane.style.transform=`perspective(1200px) rotateY(${x*3.5}deg) rotateX(${-y*2.5}deg)`;figure.style.setProperty('--scene-x',`${x*12}px`);figure.style.setProperty('--scene-y',`${y*9}px`);});
 });
 figure.addEventListener('pointerleave',resetScene);reduce.addEventListener('change',resetScene);
 new IntersectionObserver(entries=>figure.classList.toggle('motion-offscreen',!entries[0].isIntersecting),{threshold:.05}).observe(figure);
 const visibility=()=>{figure.classList.toggle('motion-background',document.hidden);if(document.hidden)resetScene();};
 document.addEventListener('visibilitychange',visibility);visibility();
})();
