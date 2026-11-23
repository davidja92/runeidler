const assert=require('node:assert/strict'),E=require('../dist/engine.js'),D=E.D;
let s=E.fresh();assert.equal(D.items.essence.name,'Pure essence');assert.equal(E.methods['mine-essence'].name,'Pure essence');
assert.equal(D.methods.filter(m=>m.skill==='Fishing').length,18);assert.equal(D.spells.length,20);assert.equal(D.methods.filter(m=>m.rune).length,15);
for(const m of D.methods.filter(m=>m.rune)){assert.deepEqual(m.inputs,{essence:1});assert(!D.shop[m.rune]);assert.match(E.buy(s,m.rune,1),/must be crafted/);}
s.style='Magic';assert.match(E.start(s,'chicken'),/runes|rune/);assert.equal(s.stats.actions,0);
E.enqueue(s,'mine-essence',100);E.enqueue(s,'air',50);E.enqueue(s,'craft-mind-rune',50);E.runQueue(s);E.advance(s,1000000);assert.equal(s.bank.essence,0);assert.equal(s.bank['air-rune'],50);assert.equal(s.bank['mind-rune'],50);assert(E.level(s.xp.Runecraft)>=2);
const p=E.combat(s,E.monsters.chicken);assert(p.casts>0);assert.equal(p.runes['mind-rune'],p.casts);assert.equal(E.start(s,'chicken'),'');E.advance(s,Math.ceil(p.seconds*1000)+1);assert(s.xp.Magic>0);assert.equal(s.bank['air-rune'],50-p.casts);assert.equal(s.bank['mind-rune'],50-p.casts);assert(s.bank.feather>=5);
s=E.fresh();s.style='Magic';s.bank['air-rune']=100;s.bank['mind-rune']=0;s.running=true;s.task={kind:'combat',id:'chicken',remaining:null};const r=E.advance(s,8*3600000);assert(r.blocked);assert(!s.running);assert.equal(s.bank['air-rune'],100);assert.equal(s.xp.Magic,0);
s=E.fresh();s.style='Magic';s.spell='fire-surge';assert.match(E.start(s,'chicken'),/Magic level 95/);
s=E.fresh();s.xp.Runecraft=E.xpFor(22);assert.equal(E.outputs(s,E.methods.air)['air-rune'],3);
s=E.fresh();s.stats.methods['cut-logs']=100;assert.equal(E.mastery(s,'cut-logs'),1);assert(E.duration(s,E.methods['cut-logs'])<2400);
assert.deepEqual(E.loot(E.monsters.cow),{bones:1,cowhide:1});assert.deepEqual(E.loot(E.monsters.dragon),{'dragon-bones':1,scale:1});
s=E.fresh();s.bank['supply-crate']=1;assert.equal(E.openCrate(s,'supply-crate'),'');assert.equal(s.bank.leather,5);assert.equal(s.bank['supply-crate'],0);
s=E.fresh();s.bank['attack-potion']=1;assert.equal(E.drink(s,'attack-potion'),'');assert.equal(s.buff.remaining,50);assert.equal(s.bank['attack-potion'],0);
s=E.fresh();s.bank.staff=1;s.equipped='staff';s.bank['leather-body']=1;s.body='leather-body';s.spell='water-strike';const restored=E.restore(JSON.parse(JSON.stringify(s)));assert.equal(restored.equipped,'staff');assert.equal(restored.body,'leather-body');assert.equal(restored.spell,'water-strike');
console.log('Expansion passed: pure essence supply chain, 15 handmade runes, 20 spell costs, no free Magic/offline casts, 18 fish, mastery, loot, caches, potions and save migration.');
