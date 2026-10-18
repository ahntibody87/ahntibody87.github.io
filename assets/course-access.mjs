import {verifyPassword} from './course-password.mjs';

const config=JSON.parse(document.getElementById('course-access-config').textContent);
const gates=new Map(config.map(g=>[g.id,g]));
const grants=new Set();
let storageAvailable=false;
try{sessionStorage.setItem('atll-entry-test','1');sessionStorage.removeItem('atll-entry-test');storageAvailable=true;}catch{}
const key=gate=>`atll-course-entry:${gate.id}`;
function unlocked(gate){
  if(grants.has(gate.id))return true;
  try{return storageAvailable&&sessionStorage.getItem(key(gate))===gate.digest;}catch{return false;}
}
function grant(gate){
  grants.add(gate.id);
  try{if(storageAvailable)sessionStorage.setItem(key(gate),gate.digest);}catch{}
}
function bindForm(form,onSuccess){
  const input=form.querySelector('[name="password"]');
  const submit=form.querySelector('button[type="submit"]');
  const message=form.querySelector('.course-access-message');
  let attempt=0;
  const clear=()=>{attempt++;input.value='';input.disabled=false;input.removeAttribute('aria-invalid');submit.disabled=false;submit.textContent='입장하기 →';message.textContent='';};
  input.disabled=false;submit.disabled=false;
  input.addEventListener('input',()=>{input.removeAttribute('aria-invalid');message.textContent='';});
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(submit.disabled || !form.reportValidity())return;
    const gate=gates.get(form.dataset.entryCourse);
    if(!gate)return;
    const ticket=++attempt;
    submit.disabled=true;submit.textContent='확인 중…';message.textContent='';
    try{
      const valid=await verifyPassword(input.value,gate);
      if(ticket!==attempt)return;
      if(valid){input.value='';grant(gate);onSuccess(gate);}
      else{message.textContent='비밀번호가 맞지 않습니다. 다시 입력해 주세요.';input.setAttribute('aria-invalid','true');input.select();}
    }catch{
      if(ticket===attempt)message.textContent='비밀번호를 확인하지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.';
    }finally{
      if(ticket===attempt){submit.disabled=false;submit.textContent='입장하기 →';}
    }
  });
  return clear;
}

const screen=document.querySelector('.course-entry-screen');
if(screen){
  const gate=gates.get(screen.dataset.entryCourse);
  const content=document.querySelector('.course-access-content');
  const showContent=(focus=true)=>{screen.hidden=true;content.hidden=false;content.inert=false;if(focus)content.focus({preventScroll:true});};
  if(gate&&unlocked(gate))showContent(false);
  else bindForm(screen.querySelector('form'),()=>showContent());
}

// One accessible native dialog handles course cards and shared navigation alike.
const dialog=document.createElement('dialog');
dialog.className='course-access-dialog';dialog.setAttribute('aria-labelledby','course-dialog-title');
dialog.innerHTML='<div class="course-entry-card"><p class="entry-eyebrow" lang="en">COURSE ACCESS</p><h2 id="course-dialog-title"></h2><p class="entry-description">입장하려면 비밀번호를 입력해 주세요.</p><form class="course-access-form"><label for="course-dialog-password">입장 비밀번호</label><input id="course-dialog-password" type="password" name="password" autocomplete="current-password" maxlength="128" required aria-describedby="course-dialog-message"><p id="course-dialog-message" class="course-access-message" role="alert"></p><div class="course-dialog-actions"><button type="button" class="course-dialog-cancel">취소</button><button type="submit">입장하기 →</button></div></form><p class="course-access-hint">입장 상태는 이 탭을 닫을 때까지 유지됩니다.</p></div>';
document.body.append(dialog);
const form=dialog.querySelector('form');
let destination=null,opener=null;
const clear=bindForm(form,()=>{const url=destination;dialog.close();if(url)location.assign(url.href);});
dialog.querySelector('.course-dialog-cancel').addEventListener('click',()=>{clear();dialog.close();});
dialog.addEventListener('cancel',()=>clear());
dialog.addEventListener('close',()=>{clear();destination=null;if(opener?.isConnected)opener.focus({preventScroll:true});opener=null;});
document.addEventListener('click',event=>{
  if(event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
  const anchor=event.target.closest('a[href]');
  if(!anchor || anchor.hasAttribute('download') || anchor.target==='_blank')return;
  const url=new URL(anchor.href,location.href);
  if(url.origin!==location.origin)return;
  const gate=config.find(g=>url.pathname.startsWith(g.path)||url.pathname===g.path.slice(0,-1));
  // Without tab storage, enter at the destination screen to avoid a second prompt.
  if(!gate || unlocked(gate) || !storageAvailable)return;
  event.preventDefault();clear();destination=url;opener=anchor;form.dataset.entryCourse=gate.id;
  dialog.querySelector('h2').textContent=gate.title;
  dialog.showModal();form.querySelector('input').focus();
});
document.documentElement.dataset.courseAccess='ready';
