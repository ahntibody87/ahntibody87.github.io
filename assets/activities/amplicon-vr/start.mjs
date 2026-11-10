import {mountScreeningIntro,mountBriefing} from '../amplicon/intro.mjs?v=3-nodot1';

const lab=document.getElementById('amp-lab');

function showError(){
  let status=lab.querySelector('[role="status"]');
  if(!status){
    status=document.createElement('p');
    status.setAttribute('role','status');
    lab.append(status);
  }
  status.textContent='실험실을 불러오지 못했습니다. 새로고침해 주세요.';
}

async function startExperiment(scenario,button,quality){
  button.disabled=true;
  try{
    const [{createPreparation},{mountWalkthrough}]=await Promise.all([
      import('./walkthrough/preparation.mjs?v=7-nodot1'),
      import('./walkthrough/walkthrough.mjs?v=18-nodot1')
    ]);
    mountWalkthrough(lab,createPreparation(scenario),{lowMotion:quality==='low',reviewSteps:scenario.steps});
    lab.querySelector('.lab-viewport')?.focus({preventScroll:true});
  }catch{
    button.disabled=false;
    showError();
  }
}

try{
  const response=await fetch(lab.dataset.scenario,{cache:'no-cache'});
  if(!response.ok)throw new Error('Scenario unavailable');
  const scenario=await response.json();
  mountScreeningIntro(lab,()=>mountBriefing(lab,scenario,(button,quality)=>startExperiment(scenario,button,quality)));
}catch{
  showError();
}
