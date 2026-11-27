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
