export function createGelObservation(root,experiment,onResult,onClose){
  root.innerHTML=`<section class="lab-observation lab-gel-observation" hidden aria-labelledby="lab-gel-title">
    <header><span class="lab-observation-kicker">LED 관찰기 · 밴드 판독</span><button type="button" data-gel-close>관찰 창 닫기</button></header>
    <h3 id="lab-gel-title" tabindex="-1">전기영동 결과</h3>
    <div class="lab-gel-diagram"></div>
    <p class="lab-gel-guide"></p>
    <form class="lab-gel-result">
      <label>감염 여부 판정
        <select name="answer" required>
          <option value="">판정을 선택하세요</option><option value="A">A만</option><option value="B">B만</option>
          <option value="both">A와 B 모두</option><option value="neither">둘 다 아님</option>
        </select>
      </label>
      <label>밴드와 대조군을 근거로 설명하세요.
        <textarea name="reason" rows="2" maxlength="3000" required></textarea>
      </label>
      <button type="submit">판정 제출</button>
    </form>
    <section class="lab-gel-feedback" aria-live="polite" hidden></section>
  </section>`;
  const panel=root.firstElementChild;
  const form=panel.querySelector('form'),feedback=panel.querySelector('.lab-gel-feedback');
  const guide=panel.querySelector('.lab-gel-guide'),diagram=panel.querySelector('.lab-gel-diagram');
  const y=bp=>64+181*(1-Math.log(bp/75)/Math.log(8));
  guide.textContent='표적 밴드 · 약 '+experiment.productBp+' bp. DNA 마커와 두 대조군을 비교하세요.';
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const data=new FormData(form);
    const reason=String(data.get('reason')??'');
    const result=experiment.result(String(data.get('answer')??''),reason);
    if(!result){
      const field=form.elements.reason;
      field.setCustomValidity('판정 근거를 적어 주세요.');
      field.reportValidity();
      return;
    }
    const title=document.createElement('h4');
    title.className=result.correct?'lab-answer-correct':'lab-answer-review';
    title.tabIndex=-1;
    title.textContent=result.correct?'정답입니다!':'판정을 다시 비교해 보세요';
    feedback.replaceChildren(title,...result.model.map(text=>{
      const p=document.createElement('p');p.textContent=text;return p;
    }));
    feedback.hidden=false;
    title.focus();
    onResult();
  });
  form.elements.reason.addEventListener('input',()=>form.elements.reason.setCustomValidity(''));
  panel.querySelector('[data-gel-close]').addEventListener('click',()=>{
    panel.hidden=true;onClose();
  });
  return {
    open(){
      const names=['마커','A','B','양성','음성'];
      const rows=experiment.bandRows();
      diagram.innerHTML=`<svg viewBox="0 0 550 278" role="img" aria-label="DNA 마커, A, B, 양성 및 음성 대조군의 밴드">
        <rect x="45" y="29" width="485" height="233" rx="9" fill="#0b2741"/>
        ${rows.map((bands,index)=>{
          const x=97+index*90;
          return `<text x="${x}" y="19" text-anchor="middle" fill="#d6f2f7" font-size="14">${names[index]}</text>
          <rect x="${x-21}" y="38" width="42" height="10" rx="3" fill="#315b7e"/>
          ${bands.map(bp=>`<rect x="${x-20}" y="${y(bp)}" width="40" height="5" rx="2" fill="#a4efbd"/>`).join('')}`;
        }).join('')}
        ${experiment.markerBp.map(bp=>`<text x="48" y="${y(bp)+4}" fill="#c8e4ed" font-size="9">${bp}</text>`).join('')}
      </svg>`;
      panel.hidden=false;panel.querySelector('h3').focus({preventScroll:true});
    }
  };
}
