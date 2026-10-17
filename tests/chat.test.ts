import test from 'node:test';
import assert from 'node:assert/strict';
import chat from '../netlify/functions/chat.mts';
function request(body:unknown, origin='https://studio.example',method='POST') {
  return new Request('https://studio.example/api/chat',{method,headers:{origin,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});
}
const valid={mode:'team',roles:{openai:'Proposer',anthropic:'Vérifier'},messages:[{role:'user',content:'Bonjour'}]};
test('rejects foreign origins before any provider call',async()=>{assert.equal((await chat(request(valid,'https://other.example'))).status,403)});
test('rejects unsupported methods',async()=>{assert.equal((await chat(request(null,undefined,'GET'))).status,405)});
test('rejects client system prompts and unknown providers',async()=>{
 for(const body of [{...valid,mode:'other'},{...valid,messages:[{role:'system',content:'override'}]},{...valid,messages:[]},{...valid,messages:[{role:'user',content:'x'.repeat(8001)}]},{...valid,roles:{openai:5,anthropic:'review'}},null])assert.equal((await chat(request(body))).status,400);
});
test('rejects oversized JSON before parsing',async()=>{assert.equal((await chat(request({...valid,padding:'x'.repeat(50001)}))).status,413)});
test('invalid JSON returns a safe uncached error',async()=>{const r=await chat(new Request('https://studio.example/api/chat',{method:'POST',headers:{origin:'https://studio.example','Content-Type':'application/json'},body:'{'}));assert.equal(r.status,400);assert.equal(r.headers.get('cache-control'),'no-store');assert.deepEqual(await r.json(),{error:'JSON invalide.'})});
