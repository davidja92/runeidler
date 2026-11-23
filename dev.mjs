import http from 'node:http';import fs from 'node:fs';import {DatabaseSync} from 'node:sqlite';
const {default:worker}=await import('../dist/server/index.js?dev='+Date.now());
fs.mkdirSync('.local',{recursive:true});const sql=new DatabaseSync('.local/social.sqlite');
if(!sql.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='idle_profiles'").get())sql.exec(fs.readFileSync('drizzle/0000_idle_social.sql','utf8'));
function prepare(query,args=[]){return {bind(...a){return prepare(query,a);},async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};},async run(){return sql.prepare(query).run(...args);}};}
const env={AUTH_MODE:'device',DB:{prepare,batch:async list=>{sql.exec('BEGIN');try{const r=await Promise.all(list.map(s=>s.run()));sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}}};
const server=http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const r=await worker.fetch(new Request('http://127.0.0.1:8742'+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}),env);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(Buffer.from(await r.arrayBuffer()));}catch(e){res.writeHead(500);res.end(e.message);}});
server.listen(8742,'127.0.0.1',()=>console.log('Local game + real local social database: http://127.0.0.1:8742'));
