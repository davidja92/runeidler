import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(),publicDir=path.join(root,'dist');
const data=fs.readFileSync(path.join(publicDir,'data.js'),'utf8'),content=fs.readFileSync(path.join(publicDir,'content.js'),'utf8'),engine=fs.readFileSync(path.join(publicDir,'engine.js'),'utf8'),api=fs.readFileSync('server/api.mjs','utf8');
const assets={};for(const name of fs.readdirSync(publicDir)){const p=path.join(publicDir,name);if(fs.statSync(p).isFile())assets['/'+name]=fs.readFileSync(p,'utf8');}
const moduleSource='const window=globalThis;\n'+data+'\n'+content+'\n'+engine+'\n'+api+'\nconst STATIC_ASSETS='+JSON.stringify(assets)+';\n'+String.raw`
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/'))return handleApi(request,env,globalThis.IdleEngine);
 if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
 const p=url.pathname==='/'?'/index.html':url.pathname;
 if(p==='/config.js')return new Response('window.IDLE_CONFIG='+JSON.stringify({API_BASE_URL:'',AUTH_MODE:env.AUTH_MODE==='device'?'device':'site'})+';',{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache'}});
 if(!(p in STATIC_ASSETS))return new Response('Not found',{status:404});
 const ext=p.split('.').pop(),mime={html:'text/html',js:'application/javascript',css:'text/css',svg:'image/svg+xml',json:'application/json'}[ext]||'text/plain';
 return new Response(request.method==='HEAD'?null:STATIC_ASSETS[p],{headers:{'Content-Type':mime+'; charset=utf-8','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});
}};
`;
fs.mkdirSync('dist/server',{recursive:true});fs.writeFileSync('dist/server/index.js',moduleSource);
fs.mkdirSync('dist/.openai',{recursive:true});fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
console.log('Built Worker with',Object.keys(assets).length,'embedded game assets and shared social API.');
