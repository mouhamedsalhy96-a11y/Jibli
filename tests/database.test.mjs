import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('request transactions and RLS isolate customers and reserve administrator access', async () => {
  const db = new PGlite();
  const alice = '00000000-0000-4000-8000-000000000001';
  const bob = '00000000-0000-4000-8000-000000000002';
  const admin = '00000000-0000-4000-8000-000000000003';
  const unconfirmed = '00000000-0000-4000-8000-000000000004';
  const first = '10000000-0000-4000-8000-000000000001';
  const second = '10000000-0000-4000-8000-000000000002';
  const third = '10000000-0000-4000-8000-000000000003';
  const item = { title:'Chemise', variant:'Beige M', quantity:2, shop:'shein', url:'https://fr.shein.com/example.html', note:'' };
  const count = async table => Number((await db.query(`select count(*) as n from public.${table}`)).rows[0].n);
  const session = async (role, id = '') => {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    await db.exec(`set role ${role}`);
  };
  const submit = (id, items = [item]) => db.query('select public.jibli_create_request($1,$2,$3,$4,$5::jsonb) as id', [id, 'Client test','20202020','Tunis',JSON.stringify(items)]);
  try {
    // Only Supabase Auth's minimum database contract is mocked; policies and RPC
    // run unchanged inside actual PostgreSQL with non-superuser database roles.
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid; $$;
      grant usage on schema auth, public to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
    `);
    await db.query('insert into auth.users values ($1,$2,now()),($3,$4,now()),($5,$6,now()),($7,$8,null)', [alice,'alice@example.com',bob,'bob@example.com',admin,'admin@example.com',unconfirmed,'unconfirmed@example.com']);
    await db.exec(await readFile(new URL('../supabase/migrations/202611110001_accounts_requests.sql',import.meta.url),'utf8'));
    await db.query('insert into public.jibli_admins values ($1)',[admin]);

    await session('anon');
    await assert.rejects(count('jibli_requests'), /permission denied/);
    await assert.rejects(count('jibli_request_items'), /permission denied/);
    await assert.rejects(submit(first), /permission denied/);

    await session('authenticated',unconfirmed);
    await assert.rejects(submit(first), /Compte confirmé requis/);

    await session('authenticated',alice);
    assert.equal((await submit(first)).rows[0].id,first);
    assert.equal((await submit(first)).rows[0].id,first);
    assert.equal(await count('jibli_requests'),1,'retry does not duplicate request');
    assert.equal(await count('jibli_request_items'),1,'retry does not duplicate items');
    const saved = (await db.query('select owner_id, email, status from public.jibli_requests')).rows[0];
    assert.deepEqual(saved,{owner_id:alice,email:'alice@example.com',status:'awaiting_quote'});
    assert.equal((await db.query('select public.jibli_is_admin() as admin')).rows[0].admin,false);
    await assert.rejects(db.query('insert into public.jibli_admins values ($1)',[alice]), /permission denied/);
    await assert.rejects(db.exec("update public.jibli_requests set status = 'ordered'"), /permission denied/);
    await assert.rejects(db.exec('delete from public.jibli_requests'), /permission denied/);
    await assert.rejects(db.exec('insert into public.jibli_requests default values'), /permission denied/);
    await assert.rejects(db.exec('insert into public.jibli_request_items default values'), /permission denied/);

    for (const bad of [[], Array(21).fill(item), [{...item,quantity:0}], [{...item,quantity:1.5}], [{...item,url:'https://shein.com.evil.example/x'}], [{...item,url:'https://user@shein.com/x'}], [{...item,shop:'aliexpress'}], [{...item,title:''}], [{...item,variant:''}]]) {
      await assert.rejects(submit(third,bad));
      assert.equal(await count('jibli_requests'),1,'invalid basket rolls back request');
    }
    await assert.rejects(submit(third,[item,{...item,quantity:0}]));
    assert.equal(await count('jibli_request_items'),1,'invalid second item rolls back first item');

    await session('authenticated',bob);
    assert.equal(await count('jibli_requests'),0,'Bob cannot read Alice request');
    assert.equal(await count('jibli_request_items'),0,'Bob cannot read Alice items');
    await assert.rejects(submit(first), /Identifiant indisponible/);
    await submit(second);
    assert.equal(await count('jibli_requests'),1,'Bob sees his own request only');

    await session('authenticated',admin);
    assert.equal((await db.query('select public.jibli_is_admin() as admin')).rows[0].admin,true);
    assert.equal(await count('jibli_requests'),2,'admin sees both requests');
    assert.equal(await count('jibli_request_items'),2,'admin sees both sets of items');
    await session('postgres');
    await db.query('delete from public.jibli_admins where user_id = $1',[admin]);
    await session('authenticated',admin);
    assert.equal(await count('jibli_requests'),0,'revoked admin loses access');
  } finally { await db.close(); }
});
