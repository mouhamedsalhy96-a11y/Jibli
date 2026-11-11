import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function load(path, dependencies={}) {
 const source=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const loaded={exports:{}};new Function('module','exports','require',source)(loaded,loaded.exports,id=>{if(!(id in dependencies))throw new Error(id);return dependencies[id];});return loaded.exports;
}
const domain=load('../src/lib/domain.ts');
const filters=load('../src/lib/inbox-filters.ts',{'./domain':domain});
test('inbox parameters reject invalid statuses and pages and bound search input',()=>{
 for(const page of ['-1','0','1.5','1e3','NaN','999999999999'])assert.equal(filters.inboxFilters({page}).page,1);
 assert.equal(filters.inboxFilters({page:'999999'}).page,10000);
 assert.deepEqual(filters.inboxFilters({q:['  Tunis\nCentre  ','ignored'],status:'constructor',page:'2'}),{q:'Tunis Centre',status:'all',page:2});
 assert.equal(filters.inboxFilters({q:'a'.repeat(200)}).q.length,80);
 assert.equal(filters.inboxFilters({status:'delivered'}).status,'delivered');
});
test('search values cannot add filter expressions and literal percent/underscore characters are escaped',()=>{
 const input='Dupont",status.eq.ordered),email.ilike.%_\\';
 const result=filters.inboxSearchFilter(input);
 const entries=[...result.matchAll(/([a-z_]+)\.ilike\.("(?:[^"\\]|\\.)*")(?:,|$)/g)];
 assert.equal(entries.length,5);
 assert.deepEqual(entries.map(match=>match[1]),['reference','customer_name','email','phone','city']);
 for(const entry of entries)assert.equal(JSON.parse(entry[2]),'%Dupont",status.eq.ordered),email.ilike.\\%\\_\\\\%');
 assert.equal(entries.map(entry=>entry[0]).join(''),result,'all syntax belongs to the five quoted predicates');
});
test('pagination and quick filter links preserve the query while resetting changed filters to page one',()=>{
 const current={q:'client+test@example.com',status:'payment_review',page:3};
 const next=new URL(filters.inboxHref(current,{page:4}),'https://jibli.example');
 assert.equal(next.pathname,'/gestion');assert.equal(next.searchParams.get('q'),current.q);assert.equal(next.searchParams.get('status'),'payment_review');assert.equal(next.searchParams.get('page'),'4');
 const quick=new URL(filters.inboxHref(current,{status:'all',page:1}),'https://jibli.example');assert.equal(quick.searchParams.get('q'),current.q);assert.equal(quick.searchParams.has('page'),false);assert.equal(quick.searchParams.has('status'),false);
});
function workspace({admin=true,roleError=null,responses=[]}={}) {
 const calls=[]; let index=0;
 const query={};
 for(const method of ['select','order','range','eq','or','limit'])query[method]=(...args)=>{calls.push([method,...args]);return query;};
 query.then=(resolve,reject)=>Promise.resolve(responses[index++]??{data:[],error:null,count:0}).then(resolve,reject);
 const supabase={rpc:async()=>({data:admin,error:roleError}),from:table=>{calls.push(['from',table]);return query;}};
 const api=load('../src/lib/requests.ts',{'server-only':{},'./supabase/server':{requireUser:async()=>({user:{id:'owner'},supabase})},'./inbox-filters':filters});
 return {api,calls};
}
test('admin inbox validates the role before querying any request data',async()=>{
 const {api,calls}=workspace({admin:false});const result=await api.requestWorkspace(true,{q:'secret',status:'all',page:1});assert.equal(result.forbidden,true);assert.deepEqual(calls,[]);
});
test('search and status are applied on the database query before pagination',async()=>{
 const {api,calls}=workspace({responses:[{data:[],error:null,count:80}]});const result=await api.requestWorkspace(true,{q:'Tunis',status:'awaiting_quote',page:2});
 assert.ok(calls.some(call=>call[0]==='eq'&&call[1]==='status'&&call[2]==='awaiting_quote'));
 assert.ok(calls.some(call=>call[0]==='or'&&call[1]===filters.inboxSearchFilter('Tunis')));
 assert.ok(calls.some(call=>call[0]==='range'&&call[1]===25&&call[2]===49));assert.equal(result.total,80);assert.equal(result.page,2);
});
test('out-of-range inbox pages recover to the last valid page without exposing an error',async()=>{
 const {api,calls}=workspace({responses:[{data:null,error:{code:'PGRST103'},count:null},{data:[],error:null,count:26},{data:[],error:null,count:26}]});
 const result=await api.requestWorkspace(true,{q:'',status:'all',page:999});assert.equal(result.error,false);assert.equal(result.page,2);assert.equal(result.total,26);assert.deepEqual(calls.filter(call=>call[0]==='range').map(call=>call.slice(1)),[[24950,24974],[0,24],[25,49]]);
});
test('customer workspace stays owner-scoped even if admin filters are supplied',async()=>{
 const {api,calls}=workspace({admin:true});await api.requestWorkspace(false,{q:'other customer',status:'delivered',page:4});
 assert.ok(calls.some(call=>call[0]==='eq'&&call[1]==='owner_id'&&call[2]==='owner'));
 assert.equal(calls.some(call=>call[0]==='or'||call[0]==='range'),false);
});
