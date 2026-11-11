import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync(new URL('../src/lib/auth-feedback.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const loaded = {exports:{}};
new Function('module','exports',source)(loaded,loaded.exports);
const {signupError,recoverAuthResponse} = loaded.exports;

test('an interrupted auth response becomes a recoverable error without leaking raw details',async()=>{
  const state = await recoverAuthResponse(async()=>{throw new Error('sensitive internal request details');});
  assert.ok(state.error.includes('Rechargez'));
  assert.ok(!JSON.stringify(state).includes('sensitive'));
  assert.equal(state.next,undefined);
});
test('successful auth navigation and expected validation responses are preserved',async()=>{
  assert.deepEqual(await recoverAuthResponse(async()=>({next:'/espace'})),{next:'/espace'});
  assert.deepEqual(await recoverAuthResponse(async()=>({next:'/compte'})),{next:'/compte'});
  assert.deepEqual(await recoverAuthResponse(async()=>({error:'Validation'})),{error:'Validation'});
});
test('email restrictions, delivery failures and rate limits have actionable French messages',()=>{
  assert.match(signupError('email_address_not_authorized'),/propriétaire Supabase/);
  assert.match(signupError('over_email_send_rate_limit'),/limite/);
  assert.match(signupError('unexpected_failure'),/SMTP incomplet/);
  assert.ok(!signupError('private internal error').includes('private internal'));
});
