import {verifyPassword} from './course-password.mjs?v=f95ecdd82a1f';
import {rememberedEntry,rememberEntry,forgetEntry} from './course-entry-state.mjs?v=d21901121ebf';

const config=JSON.parse(document.getElementById('course-access-config').textContent);
const gates=new Map(config.map(g=>[g.id,g]));
const grants=new Set();
let storageAvailable=false;
try{sessionStorage.setItem('atll-entry-test','1');sessionStorage.removeItem('atll-entry-test');storageAvailable=true;}catch{}
const key=gate=>`atll-course-entry:${gate.id}`;
function unlocked(gate){
  if(grants.has(gate.id))return true;
  try{if(storageAvailable&&sessionStorage.getItem(key(gate))===gate.digest)return true;}catch{}
  try{return rememberedEntry(gate,localStorage);}catch{return false;}
}
function grant(gate,remember=false){
  grants.add(gate.id);
  document.documentElement.dataset.courseEntryGranted=gate.id;
  try{if(storageAvailable)sessionStorage.setItem(key(gate),gate.digest);}catch{}
  let persisted=false;
  try{if(remember)persisted=rememberEntry(gate,localStorage);else forgetEntry(gate,localStorage);}catch{}
  document.dispatchEvent(new CustomEvent('atll-entry-granted',{detail:{id:gate.id}}));
  return {remember,persisted};
}
function rememberChoice(id){return '<label class="course-remember-choice" for="'+id+'"><input type="checkbox" id="'+id+'" name="remember"> <span>이 브라우저에서 7일간 입장 유지</span></label>';}
function bindForm(form,onSuccess){
  const input=form.querySelector('[name="password"]');
  const submit=form.querySelector('button[type="submit"]');
  const message=form.querySelector('.course-access-message');
  const remember=form.querySelector('[name="remember"]');
  let attempt=0;
  const clear=()=>{attempt++;input.value='';input.disabled=false;input.removeAttribute('aria-invalid');if(remember)remember.checked=false;submit.disabled=false;submit.textContent='입장하기 →';message.textContent='';};
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
      if(valid){input.value='';const result=grant(gate,!!remember?.checked);onSuccess(gate,result);}
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
  const showContent=(focus=true,result)=>{
    screen.hidden=true;content.hidden=false;content.inert=false;if(focus)content.focus({preventScroll:true});
    if(result?.remember&&!result.persisted){const note=document.createElement('p');note.className='course-storage-warning';note.setAttribute('role','status');note.textContent='이 기기에서는 입장 기록을 저장할 수 없어 현재 탭에서만 유지됩니다.';content.prepend(note);}

  };
  document.addEventListener('atll-entry-granted',e=>{if(e.detail.id===gate?.id)showContent(false);});
  if(gate&&unlocked(gate))showContent(false);
  else bindForm(screen.querySelector('form'),(_,result)=>showContent(true,result));
}

// One accessible native dialog handles course cards and shared navigation alike.
const dialog=document.createElement('dialog');
dialog.className='course-access-dialog';dialog.setAttribute('aria-labelledby','course-dialog-title');
dialog.innerHTML='<div class="course-entry-card"><p class="entry-eyebrow" lang="en">COURSE ACCESS</p><h2 id="course-dialog-title"></h2><p class="entry-description">입장하려면 비밀번호를 입력해 주세요.</p><form class="course-access-form"><label for="course-dialog-password">입장 비밀번호</label><input id="course-dialog-password" type="password" name="password" autocomplete="current-password" maxlength="128" required aria-describedby="course-dialog-message">'+rememberChoice('course-dialog-remember')+'<p id="course-dialog-message" class="course-access-message" role="alert"></p><div class="course-dialog-actions"><button type="button" class="course-dialog-cancel">취소</button><button type="submit">입장하기 →</button></div></form><p class="course-access-hint">공용 기기에서는 선택하지 마세요. 선택하지 않으면 현재 탭에서만 입장 상태를 유지합니다.</p></div>';
document.body.append(dialog);
const form=dialog.querySelector('form');
let destination=null,opener=null;
function openDestination(url){
  if(url.pathname===location.pathname&&url.hash==='#units'&&document.querySelector('#course-units-panel')){history.pushState(null,'',url.pathname+url.hash);document.dispatchEvent(new Event('atll-open-units'));}
  else location.assign(url.href);
}
const clear=bindForm(form,()=>{const url=destination;dialog.close();if(url)openDestination(url);});
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
  if(gate?.id==='advanced-life-science'&&(url.pathname===gate.path||url.pathname===gate.path.slice(0,-1))&&!anchor.hasAttribute('data-course-open-units'))return;
  if(anchor.hasAttribute('data-course-open-units')&&gate&&unlocked(gate)){event.preventDefault();openDestination(url);return;}
  if(!gate || unlocked(gate) || !storageAvailable)return;
  event.preventDefault();clear();destination=url;opener=anchor;form.dataset.entryCourse=gate.id;
  dialog.querySelector('h2').textContent=gate.title;
  dialog.showModal();form.querySelector('input').focus();
});
document.documentElement.dataset.courseAccess='ready';
