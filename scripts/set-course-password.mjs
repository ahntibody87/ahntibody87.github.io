// Passwords are read without echo from stdin and never written to files or stdout.
import fs from 'node:fs';
import {randomBytes,pbkdf2Sync} from 'node:crypto';

const file=new URL('../data/site.json',import.meta.url);
let source=fs.readFileSync(file,'utf8');
const site=JSON.parse(source);
const ids=process.argv.slice(2);
if(!ids.length || ids.some(id=>!site.courses.some(c=>c.id===id)))throw new Error('변경할 과목 id를 지정하세요.');
if(process.stdin.isTTY)process.stdin.setRawMode(true);
process.stdin.setEncoding('utf8');
process.stdout.write('새 입장 비밀번호를 입력하세요 (화면에 표시되지 않습니다):\n');
const password=await new Promise((resolve,reject)=>{
  let value='';
  const receive=data=>{
    for(const char of data.toString('utf8')){
      if(char==='\u0003'){cleanup();reject(new Error('취소했습니다.'));return;}
      if(char==='\r'||char==='\n'){cleanup();resolve(value);return;}
      if(char==='\u007f'||char==='\b')value=value.slice(0,-1);else value+=char;
    }
  };
  const cleanup=()=>{process.stdin.off('data',receive);if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();};
  process.stdin.on('data',receive);process.stdin.resume();
});
if(!password || password.length>128)throw new Error('비밀번호는 1~128자로 입력하세요.');
for(const id of ids){
  const salt=randomBytes(16).toString('hex'),iterations=210000;
  const digest=pbkdf2Sync(password,Buffer.from(salt,'hex'),iterations,32,'sha256').toString('hex');
  const marker=new RegExp(`"id"\\s*:\\s*"${id}"`).exec(source);
  const start=source.lastIndexOf('{',marker.index);
  let depth=0,inString=false,escaped=false,end=start;
  for(;end<source.length;end++){
    const char=source[end];
    if(inString){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')inString=false;continue;}
    if(char==='"')inString=true;else if(char==='{')depth++;else if(char==='}'&&--depth===0){end++;break;}
  }
  let block=source.slice(start,end);
  const previous=JSON.parse(block).entryGate;
  if(previous && !/^      "entryGate":.*\r?$/m.test(block))throw new Error('입장 설정의 줄 형식을 확인하세요.');
  block=block.replace(/^      "entryGate":.*\r?\n/m,'');
  if(!/^      "status":/m.test(block))throw new Error('과목 상태 설정을 찾지 못했습니다.');
  block=block.replace(/^      "status":/m,`      "entryGate": ${JSON.stringify({salt,iterations,digest})},\n      "status":`);
  source=source.slice(0,start)+block+source.slice(end);
}
JSON.parse(source);
fs.writeFileSync(file,source);
process.stdout.write(`입장 비밀번호 확인값 갱신 완료: ${ids.join(', ')}. build와 check 후 게시하세요.\n`,()=>process.exit(0));
