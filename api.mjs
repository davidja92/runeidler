const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
export async function identity(request,env){
 if(env.AUTH_MODE==='device'){
  const token=request.headers.get('Authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];if(!token)return null;
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));return 'device:'+Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
 }
 return request.headers.get('oai-authenticated-user-id')||null;
}
function code(){return 'RI-'+Array.from(crypto.getRandomValues(new Uint8Array(8)),v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();}
export function snapshot(body,E){
 const name=String(body.name||'').trim();if(!name||name.length>32||/[<>\x00-\x1f]/.test(name))throw Error('Choose a display name from 1 to 32 characters.');
 const xp={};for(const k of E.D.skills){const n=body.xp?.[k];if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>2e9)throw Error('Invalid skill XP.');xp[k]=n;}
 const totalLevel=E.D.skills.reduce((n,k)=>n+E.level(xp[k]),0),totalXp=Object.values(xp).reduce((n,v)=>n+v,0);
 const kills=Number(body.kills)||0,pets=Number(body.pets)||0;if(!Number.isInteger(kills)||kills<0||kills>1e12||!Number.isInteger(pets)||pets<0||pets>23)throw Error('Invalid profile statistics.');
 return {name,xp,totalLevel,totalXp,kills,pets};
}
function publicProfile(row,E){if(!row)return null;const xp=JSON.parse(row.xp_json);return {name:row.display_name,code:row.friend_code,totalLevel:row.total_level,totalXp:row.total_xp,kills:row.kills,pets:row.pets,updatedAt:row.updated_at,xp,levels:Object.fromEntries(E.D.skills.map(k=>[k,E.level(xp[k])]))};}
export async function handleApi(request,env,E){
 const url=new URL(request.url),origin=request.headers.get('Origin'),allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(origin&&origin!==url.origin&&!allowed.includes(origin))return json({error:'This website is not allowed to use the social API.'},403);
 const cors=r=>{if(origin){r.headers.set('Access-Control-Allow-Origin',origin);r.headers.set('Vary','Origin');}r.headers.set('Access-Control-Allow-Headers','Content-Type, Authorization');r.headers.set('Access-Control-Allow-Methods','GET, POST, DELETE, OPTIONS');return r;};
 if(request.method==='OPTIONS')return cors(new Response(null,{status:204}));
 const uid=await identity(request,env);if(!uid)return cors(json({error:'Sign in to this site to use friends and highscores.'},401));
 if(!env.DB)return cors(json({error:'Shared leaderboard storage is not configured on this host.'},503));
 const db=env.DB;
 try{
  const me=await db.prepare('SELECT * FROM idle_profiles WHERE account_id = ?').bind(uid).first();
  const read=async()=>{if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')throw Error('Send JSON.');if(Number(request.headers.get('Content-Length')||0)>24000)throw Error('Request is too large.');const text=await request.text();if(text.length>24000)throw Error('Request is too large.');return JSON.parse(text);};
  if(url.pathname==='/api/social/me'&&request.method==='GET'){
   const rows=me?await db.prepare('SELECT p.* FROM idle_profiles p JOIN idle_follows f ON f.target_id=p.account_id WHERE f.owner_id=? ORDER BY p.display_name').bind(uid).all():{results:[]};
   return cors(json({profile:publicProfile(me,E),friends:rows.results.map(r=>publicProfile(r,E)),rankingMode:'casual-self-reported',authMode:env.AUTH_MODE==='device'?'device':'site'}));
  }
  if(url.pathname==='/api/social/profile'&&request.method==='POST'){
   const b=snapshot(await read(),E),now=Date.now();
   if(me&&now-me.updated_at<10000)return cors(json({error:'Please wait a few seconds before syncing again.'},429));
   await db.prepare('INSERT INTO idle_profiles (account_id,friend_code,display_name,xp_json,total_level,total_xp,kills,pets,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET display_name=excluded.display_name,xp_json=excluded.xp_json,total_level=excluded.total_level,total_xp=excluded.total_xp,kills=excluded.kills,pets=excluded.pets,updated_at=excluded.updated_at').bind(uid,me?.friend_code||code(),b.name,JSON.stringify(b.xp),b.totalLevel,b.totalXp,b.kills,b.pets,me?.created_at||now,now).run();
   return cors(json({profile:publicProfile(await db.prepare('SELECT * FROM idle_profiles WHERE account_id=?').bind(uid).first(),E)}));
  }
  if(url.pathname==='/api/social/profile'&&request.method==='DELETE'){
   await db.batch([db.prepare('DELETE FROM idle_follows WHERE owner_id=? OR target_id=?').bind(uid,uid),db.prepare('DELETE FROM idle_profiles WHERE account_id=?').bind(uid)]);return cors(json({removed:true}));
  }
  if(url.pathname==='/api/social/friends'&&request.method==='POST'){
   if(!me)return cors(json({error:'Create your competition profile first.'},409));
   const b=await read(),friendCode=String(b.code||'').trim().toUpperCase();if(!/^RI-[A-F0-9]{16}$/.test(friendCode))throw Error('Enter the complete RI- friend code.');
   const friend=await db.prepare('SELECT * FROM idle_profiles WHERE friend_code=?').bind(friendCode).first();if(!friend)return cors(json({error:'No published profile has that friend code.'},404));
   if(friend.account_id===uid)throw Error('That is your own friend code.');
   const count=await db.prepare('SELECT COUNT(*) AS n FROM idle_follows WHERE owner_id=?').bind(uid).first();if(count.n>=100)throw Error('Your friends list holds 100 players.');
   await db.prepare('INSERT OR IGNORE INTO idle_follows (owner_id,target_id,created_at) VALUES (?,?,?)').bind(uid,friend.account_id,Date.now()).run();return cors(json({friend:publicProfile(friend,E)}));
  }
  if(url.pathname==='/api/social/friends'&&request.method==='DELETE'){
   const b=await read();await db.prepare('DELETE FROM idle_follows WHERE owner_id=? AND target_id IN (SELECT account_id FROM idle_profiles WHERE friend_code=?)').bind(uid,String(b.code||'').trim().toUpperCase()).run();return cors(json({removed:true}));
  }
  if(url.pathname==='/api/social/leaderboard'&&request.method==='GET'){
   const skill=url.searchParams.get('skill')||'Overall',scope=url.searchParams.get('scope')==='friends'?'friends':'all';if(skill!=='Overall'&&!E.D.skills.includes(skill))throw Error('Unknown skill.');
   const sort=skill==='Overall'?'total_level DESC,total_xp DESC':`CAST(json_extract(xp_json,'$.${skill}') AS REAL) DESC`;
   const where=scope==='friends'?'WHERE p.account_id=? OR EXISTS (SELECT 1 FROM idle_follows f WHERE f.owner_id=? AND f.target_id=p.account_id)':'';
   const base=`WITH ranked AS (SELECT p.*,DENSE_RANK() OVER (ORDER BY ${sort}) AS place FROM idle_profiles p ${where}) `;
   const args=scope==='friends'?[uid,uid]:[];
   const rows=await db.prepare(base+'SELECT * FROM ranked ORDER BY place,display_name,friend_code LIMIT 100').bind(...args).all();
   const mine=await db.prepare(base+'SELECT place FROM ranked WHERE account_id=?').bind(...args,uid).first();
   return cors(json({skill,scope,myRank:mine?.place||null,rows:rows.results.map(r=>({...publicProfile(r,E),rank:r.place,isYou:r.account_id===uid})),rankingMode:'casual-self-reported'}));
  }
  return cors(json({error:'API route not found.'},404));
 }catch(e){return cors(json({error:/SQL|D1|database|constraint/i.test(e.message)?'The shared database is not ready. Check the deployment migrations.':e.message},400));}
}
