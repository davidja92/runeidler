import assert from 'node:assert/strict';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';import {createRequire} from 'node:module';import {handleApi} from '../server/api.mjs';
const require=createRequire(import.meta.url),E=require('../dist/engine.js');const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync(new URL('../drizzle/0000_idle_social.sql',import.meta.url),'utf8'));
function prepare(sql,args=[]){return {bind(...values){return prepare(sql,values);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return sqlite.prepare(sql).run(...args);}};}
const env={DB:{prepare,batch:async list=>{sqlite.exec('BEGIN');try{const r=await Promise.all(list.map(s=>s.run()));sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}},ALLOWED_ORIGINS:'https://davidja92.github.io'};
async function call(uid,path,method='GET',body,extra={}){const headers={'Content-Type':'application/json',...extra};if(uid)headers['oai-authenticated-user-id']=uid;const response=await handleApi(new Request('https://game.example/api/social/'+path,{method,headers,body:body?JSON.stringify(body):undefined}),env,E);return {response,data:await response.json()};}
const snap=(name,level)=>({name,xp:{...E.fresh().xp,Woodcutting:E.xpFor(level)},kills:3,pets:0});
assert.equal((await call(null,'me')).response.status,401);
let a=await call('account-A','profile','POST',snap('Alice',10));assert.equal(a.response.status,200);assert.match(a.data.profile.code,/^RI-[A-F0-9]{16}$/);const ac=a.data.profile.code;
let b=await call('account-B','profile','POST',snap('Bob',20));const bc=b.data.profile.code;assert.notEqual(ac,bc);
assert.equal((await call('account-A','profile','POST',snap('Alice',11))).response.status,429);
let rows=(await call('account-A','leaderboard?scope=all&skill=Woodcutting')).data;assert.equal(rows.rows[0].name,'Bob');assert.equal(rows.myRank,2);
assert.equal((await call('account-A','leaderboard?scope=friends')).data.rows.length,1);
assert.equal((await call('account-A','friends','POST',{code:bc})).response.status,200);assert.equal((await call('account-A','leaderboard?scope=friends')).data.rows.length,2);
let me=(await call('account-A','me')).data;assert.equal(me.friends[0].name,'Bob');assert(!JSON.stringify(me).includes('account-B'));assert(!JSON.stringify(me).includes('authenticated-user-email'));
assert.equal((await call('account-A','friends','POST',{code:ac})).response.status,400);
assert.equal((await call('account-A','friends','POST',{code:'RI-0000000000000000'})).response.status,404);
assert.equal((await call('account-A','leaderboard?skill=DROP%20TABLE')).response.status,400);
assert.equal((await call('account-C','profile','POST',{...snap('Invalid',1),xp:{Attack:-1}})).response.status,400);
assert.equal((await call('account-A','profile','POST',snap('Alice',12),{Origin:'https://evil.example'})).response.status,403);
let allowed=await call('account-A','me','GET',null,{Origin:'https://davidja92.github.io'});assert.equal(allowed.response.headers.get('Access-Control-Allow-Origin'),'https://davidja92.github.io');
const deviceEnv={...env,AUTH_MODE:'device'},token='a'.repeat(64);
const d=await handleApi(new Request('https://game.example/api/social/profile',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(snap('Portable',2))}),deviceEnv,E);assert.equal(d.status,200);
assert.equal((await handleApi(new Request('https://game.example/api/social/me'),deviceEnv,E)).status,401);
await call('account-A','friends','DELETE',{code:bc});assert.equal((await call('account-A','me')).data.friends.length,0);
await call('account-A','profile','DELETE');assert.equal((await call('account-A','me')).data.profile,null);assert.equal((await call('account-B','me')).data.profile.name,'Bob');
console.log('Social API passed: authentication, separate player records, friend codes/follows, skill/overall ranks, private ownership, no identity leakage, CORS, rate limit, device portability and profile deletion.');
