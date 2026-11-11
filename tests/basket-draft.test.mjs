import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
function load(file, dependencies = {}) {
  const source=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const loaded={exports:{}};
  new Function('module','exports','require',source)(loaded,loaded.exports,id=>{if(!(id in dependencies))throw new Error(id);return dependencies[id];});
  return loaded.exports;
}
const domain=load('../src/lib/domain.ts');
const {createBasketDraft}=load('../src/lib/basket-draft.ts',{'./domain':domain});
const item=()=>domain.makeItem({url:'https://fr.shein.com/example.html',title:'Chemise test',variant:'M',quantity:2,note:''},'item-1');
function memoryStorage() {
  const data=new Map();
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key),data};
}
test('an unsent basket survives a page reload and is removed after successful submission or reset',()=>{
  const storage=memoryStorage(); const first=createBasketDraft(()=>storage);
  first.update(()=>[item()]);
  const reloaded=createBasketDraft(()=>storage);
  assert.deepEqual(reloaded.getSnapshot(),[item()]);
  reloaded.update(()=>[]);
  assert.deepEqual(createBasketDraft(()=>storage).getSnapshot(),[]);
});
test('draft hydration has a stable empty server snapshot and notifies subscribers on edits',()=>{
  const storage=memoryStorage(); const store=createBasketDraft(()=>storage); let changes=0;
  assert.strictEqual(store.getServerSnapshot(),store.getServerSnapshot());
  const unsubscribe=store.subscribe(()=>changes++);
  store.update(()=>[item()]); assert.equal(changes,1);
  assert.deepEqual(store.getServerSnapshot(),[]);
  assert.strictEqual(store.getSnapshot(),store.getSnapshot());
  unsubscribe(); store.update(()=>[]); assert.equal(changes,1);
});
test('invalid and tampered draft storage cannot bypass product validation',()=>{
  for (const value of ['not-json',JSON.stringify([{...item(),url:'https://evil.example/'}]),JSON.stringify(Array(21).fill(item())),JSON.stringify([item(),item()]),JSON.stringify([{...item(),quantity:0}])]) {
    const storage=memoryStorage(); storage.setItem('jibli:basket:v1',value);
    assert.deepEqual(createBasketDraft(()=>storage).getSnapshot(),[]);
  }
});
test('blocked browser storage falls back to an editable in-memory basket',()=>{
  const store=createBasketDraft(()=>{throw new Error('storage blocked');});
  assert.deepEqual(store.getSnapshot(),[]);
  store.update(()=>[item()]); assert.deepEqual(store.getSnapshot(),[item()]);
});
