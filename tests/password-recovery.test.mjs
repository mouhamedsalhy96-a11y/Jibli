import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
function load(path, dependencies = {}) {
 const source=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const loaded={exports:{}};
 new Function('module','exports','require',source)(loaded,loaded.exports,id=>{if(!(id in dependencies))throw new Error('Unexpected dependency '+id);return dependencies[id];});
 return loaded.exports;
}
const form=values=>{const result=new FormData();for(const [key,value] of Object.entries(values))result.set(key,value);return result;};
function actions(auth) { return load('../src/app/compte/password-actions.ts',{'@/lib/supabase/server':{serverClient:async()=>({auth})},'@/lib/app-origin':{appOrigin:()=> 'https://jibli.example'}}); }
test('password recovery validates email and uses a configured callback without revealing account existence',async()=>{
 const calls=[];
 const known=actions({resetPasswordForEmail:async(...args)=>{calls.push(args);return {error:null};}});
 assert.ok((await known.requestPasswordReset({},form({email:'invalid'}))).error);assert.equal(calls.length,0);
 const success=await known.requestPasswordReset({},form({email:' CLIENT@EXAMPLE.COM '}));
 assert.deepEqual(calls,[['client@example.com',{redirectTo:'https://jibli.example/auth/recuperation'}]]);
 for(const code of ['user_not_found','email_address_not_authorized','over_email_send_rate_limit']) {
   const failing=actions({resetPasswordForEmail:async()=>({error:{code}})});
   assert.deepEqual(await failing.requestPasswordReset({},form({email:'unknown@example.com'})),success);
 }
 assert.ok(success.done);assert.ok(!JSON.stringify(success).includes('client@example.com'));
});
test('password updates require a verified session and matching passwords before modifying credentials',async()=>{
 let changes=0;
 const api=actions({getUser:async()=>({data:{user:null},error:null}),updateUser:async()=>{changes++;return {error:null};}});
 for(const input of [{password:'short',confirmation:'short'},{password:'a-unique-test-passphrase',confirmation:'mismatch'},{password:'a-unique-test-passphrase',confirmation:'a-unique-test-passphrase'}])assert.ok((await api.updatePassword({},form(input))).error);
 assert.equal(changes,0);
});
test('successful password update preserves current session, revokes other refresh sessions and never returns passwords',async()=>{
 const calls=[];
 const api=actions({getUser:async()=>({data:{user:{id:'owner'}},error:null}),updateUser:async input=>{calls.push(input);return {error:null};},signOut:async input=>{calls.push(input);return {error:null};}});
 const password='a-unique-test-passphrase';const state=await api.updatePassword({},form({password,confirmation:password}));
 assert.equal(state.done,true);assert.deepEqual(calls,[{password},{scope:'others'}]);assert.ok(!JSON.stringify(state).includes(password));
});
test('provider and transport errors are sanitized, and partial logout failure does not claim the password update failed',async()=>{
 const reset=actions({resetPasswordForEmail:async()=>{throw new Error('PRIVATE provider details');}});
 assert.ok(!JSON.stringify(await reset.requestPasswordReset({},form({email:'client@example.com'}))).includes('PRIVATE'));
 const password='a-unique-test-passphrase';
 const api=actions({getUser:async()=>({data:{user:{id:'owner'}},error:null}),updateUser:async()=>({error:null}),signOut:async()=>({error:{message:'PRIVATE'}})});
 const state=await api.updatePassword({},form({password,confirmation:password}));assert.equal(state.done,true);assert.ok(!JSON.stringify(state).includes('PRIVATE'));
 for(const code of ['weak_password','same_password','unknown']) {
   const bad=actions({getUser:async()=>({data:{user:{id:'owner'}},error:null}),updateUser:async()=>({error:{code,message:'PRIVATE'}})});
   const result=await bad.updatePassword({},form({password,confirmation:password}));assert.ok(result.error);assert.ok(!JSON.stringify(result).includes('PRIVATE'));
 }
});
test('recovery callback accepts only a server-exchanged session and ignores arbitrary redirect destinations',async()=>{
 let exchanges=0;
 const route=load('../src/app/auth/recuperation/route.ts',{'@/lib/app-origin':{appOrigin:()=> 'https://jibli.example'},'next/server':{NextResponse:{redirect:url=>new Response(null,{status:307,headers:{location:url.toString()}})}},'@/lib/supabase/server':{serverClient:async()=>({auth:{exchangeCodeForSession:async code=>{exchanges++;return code==='valid-code'?{data:{session:{user:{id:'owner'}}},error:null}:{data:{session:null},error:{message:'PRIVATE'}};}}})}});
 for(const suffix of ['', '?error=expired', '?code='+ 'x'.repeat(2049)]) {
   const response=await route.GET({nextUrl:new URL('https://jibli.example/auth/recuperation'+suffix),url:'http://localhost:3004/auth/recuperation'+suffix});
   assert.equal(response.headers.get('location'),'https://jibli.example/compte/recuperation-expiree');
 }
 assert.equal(exchanges,0);
 for(const [code,target] of [['expired-code','recuperation-expiree'],['valid-code','nouveau-mot-de-passe']]) {
   const url='https://jibli.example/auth/recuperation?code='+code+'&next=https://evil.example/';
   const response=await route.GET({nextUrl:new URL(url),url});
   assert.equal(response.headers.get('location'),'https://jibli.example/compte/'+target);
   assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('referrer-policy'),'no-referrer');
 }
});
test('authentication origins cannot contain credentials, paths or insecure production URLs',()=>{
 const {appOrigin}=load('../src/lib/app-origin.ts');
 const previousOrigin=process.env.APP_ORIGIN, previousMode=process.env.NODE_ENV;
 try {
   process.env.NODE_ENV='production';
   for(const origin of ['http://127.0.0.1:3004','https://user:pass@jibli.example','https://jibli.example/path','https://jibli.example/?next=x','javascript:alert(1)']) {process.env.APP_ORIGIN=origin;assert.throws(appOrigin);}
   process.env.APP_ORIGIN='https://jibli.example/';assert.equal(appOrigin(),'https://jibli.example');
   process.env.NODE_ENV='development';delete process.env.APP_ORIGIN;assert.equal(appOrigin(),'http://127.0.0.1:3004');
 } finally {if(previousOrigin===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=previousOrigin;if(previousMode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previousMode;}
});
