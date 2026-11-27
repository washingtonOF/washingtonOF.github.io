import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const js=fs.readFileSync('vinas/portal-security-v1.js','utf8');
const html=fs.readFileSync('vinas/index.html','utf8');
const start=js.indexOf('function inspectStatement(');
const end=js.indexOf('function renderIntelligence(',start);
assert.ok(start>=0&&end>start);
const inspect=vm.runInNewContext(js.slice(start,end)+';inspectStatement');
const row={type:'credit',amountCents:100,date:'2026-11-01',id:'a'};
const make=(entries,totals)=>({statementSchema:2,statementEntries:entries,statementTotalsCents:totals});
const cases=[
['valid',make([row],{credit:100,debit:0}),true],
['missing',null,false],
['negative',make([{...row,amountCents:-1}]),false],
['fraction',make([{...row,amountCents:1.5}]),false],
['invalid date',make([{...row,date:'2026-02-30'}]),false],
['invalid type',make([{...row,type:'unknown'}]),false],
['mismatch',make([row],{credit:99,debit:0}),false],
['empty',make([],{credit:0,debit:0}),true],
['unsafe sum',make([{...row,amountCents:Number.MAX_SAFE_INTEGER},row]),false],
['leap date',make([{...row,date:'2024-02-29'}]),true]];
for(const [name,data,expected] of cases){assert.equal(inspect(data).ok,expected,name);console.log('PASS',name);}
assert.equal(inspect(make([row,row])).repeated,1);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'duplicate HTML IDs');
for(const menu of ['audit','backup','documents','intelligence'])assert.equal([...html.matchAll(/data-master="([^"]+)"/g)].filter(m=>m[1]===menu).length,1,menu);
console.log('PASS HTML IDs, menus and repeated identifiers');

const cryptoStart=js.indexOf('async function encryptPortalBackup(');
const cryptoEnd=js.indexOf('function renderBackup(',cryptoStart);
assert.ok(cryptoStart>=0&&cryptoEnd>cryptoStart);
const encrypt=vm.runInNewContext(js.slice(cryptoStart,cryptoEnd)+';encryptPortalBackup',{crypto:globalThis.crypto,TextEncoder,Uint8Array,btoa});
const password='test-only-long-password';
const payload={records:[{path:'demo/one',data:{value:123}}]};
const encrypted=await encrypt(payload,password);
const decode=v=>Buffer.from(v,'base64');
const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:decode(encrypted.salt),iterations:encrypted.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(encrypted.iv)},key,decode(encrypted.ciphertext));
assert.deepEqual(JSON.parse(new TextDecoder().decode(clear)),payload);
const damaged=decode(encrypted.ciphertext);damaged[0]^=1;
await assert.rejects(crypto.subtle.decrypt({name:'AES-GCM',iv:decode(encrypted.iv)},key,damaged));
const second=await encrypt(payload,password);
assert.notEqual(second.iv,encrypted.iv);
assert.notEqual(second.salt,encrypted.salt);
console.log('PASS backup encryption roundtrip, tamper rejection and randomized parameters');
assert.ok(html.includes('isamig-app-check-site-key'));
assert.ok(js.includes('ReCaptchaEnterpriseProvider'));
console.log('PASS App Check configuration markers');
