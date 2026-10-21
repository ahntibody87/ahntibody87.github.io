// Progressive enhancement: every activity remains available without JavaScript.
const grid=document.querySelector('.workspace-card-grid');
if(grid){
  const cards=[...grid.querySelectorAll('.workspace-card')];
  const input=document.querySelector('.workspace-search input');
  const filters=document.querySelector('.workspace-filters');
  let selected='all';
  filters.hidden=false;
  function update(){
    const query=input.value.trim().toLocaleLowerCase();
    let count=0;
    for(const card of cards){const match=(selected==='all'||card.dataset.toolType===selected)&&card.dataset.toolSearch.toLocaleLowerCase().includes(query);card.hidden=!match;if(match)count++;}
    document.querySelector('.workspace-count').textContent=`${count} tools`;
    document.querySelector('.workspace-no-results').hidden=count!==0;
  }
  filters.addEventListener('click',event=>{const button=event.target.closest('button[data-filter]');if(!button)return;selected=button.dataset.filter;for(const b of filters.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));update();});
  input.addEventListener('input',update);
}
