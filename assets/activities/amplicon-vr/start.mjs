const lab = document.getElementById('amp-lab');
const view = new URLSearchParams(location.search).get('room');
if (view === 'legacy') {
  const {createPerspective} = await import('./room.mjs?v=5');
  lab.perspective = createPerspective();
  await import('../amplicon/lab.mjs?v=vr5');
} else {
  try{
    const {mountWalkthrough} = await import('./walkthrough/walkthrough.mjs?v=5');
    if(view==='preview')mountWalkthrough(lab);
    else{
      const response=await fetch(lab.dataset.scenario);
      if(!response.ok)throw Error('Scenario unavailable');
      const {createPreparation}=await import('./walkthrough/preparation.mjs');
      mountWalkthrough(lab,createPreparation(await response.json()));
    }
  }catch{
    const message=lab.querySelector('[role="status"]');
    if(message)message.textContent='실험실을 불러오지 못했습니다. 새로고침해 주세요.';
  }
}
