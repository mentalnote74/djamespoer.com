(() => {
  'use strict';
  const initStart=performance.now();
  const manifest = window.TOWN_SCENE;
  let castSeen={};try{castSeen=JSON.parse(sessionStorage.getItem('creative-town-seen')||'{}');}catch{}
  const leastSeen=ids=>ids.map(id=>({id,score:(castSeen[id]||0)+Math.random()})).sort((a,b)=>a.score-b.score).map(x=>x.id);
  function face(art,id,desired){const f=manifest.facing[id]||{source:'right',mirrorSafe:true};const flip=f.mirrorSafe&&desired!=='front'&&(f.source==='front'?desired==='left':f.source!==desired);art.style.transform=flip?'scaleX(-1)':'none';art.dataset.mirrored=String(!!flip);}
  const sceneChoices = manifest.scenes.filter(s => s.enabled);
  const chosenScene = sceneChoices[Math.floor(Math.random() * sceneChoices.length)];
  window.currentTownScene = chosenScene.id;
  document.querySelector('.plate').src = chosenScene.background;
  const world = document.getElementById('world');
  const viewport = document.querySelector('.viewport');
  const humanName = id => id.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join(' ');
  const image = (id, cls) => {
    const el = document.createElement('img'); el.src = `assets/${id}.webp`; el.alt = humanName(id); if (cls) el.className = cls; return el;
  };
  function resize() { world.style.transform = `scale(${viewport.clientWidth / 1664})`; }
  new ResizeObserver(resize).observe(viewport); resize();
  function addDiv(parent, cls) { const d=document.createElement('div');d.className=cls;parent.append(d);return d; }
  function renderTables(tables) {
    const root=document.getElementById('tables'); root.replaceChildren();
    const used=new Set([...manifest.fixedDynamicCast,...(window.currentCommittee||[]),...(window.currentStreetGuests||[])]);
    if(tables.length!==2 || new Set(tables.map(t=>t.theme)).size!==2)throw new Error('Two distinct table themes required');
    tables.forEach((table, index) => {
      const theme=manifest.tableThemes.find(t=>t.id===table.theme);
      const game=manifest.games.find(g=>g.id===table.game);
      const eligible=theme.fixed||theme.pool;
      if(!game||table.members.length!==game.players||new Set(table.members).size!==game.players)throw new Error('Game-specific cast count failed');
      for(const id of table.members){if(!eligible.includes(id)||used.has(id)||(manifest.exclusivePairs||[]).some(pair=>pair.includes(id)&&pair.some(other=>other!==id&&used.has(other))))throw new Error('Invalid or duplicate cast member '+id);used.add(id);}
      const group=addDiv(root,`table-group table-${index===0?'a':'b'} seats-${game.players} game-${game.id}`);group.dataset.theme=table.theme;group.dataset.game=game.id;group.dataset.activity=table.activity;group.setAttribute('aria-label',`${theme.label} · ${game.label}: ${table.members.map(humanName).join(', ')}`);
      // Furniture follows the actual source cutouts rather than clipping bodies into seats.
      const furniture=document.createElement('img');furniture.className='table-furniture';furniture.src=`assets/table-${game.id}.svg`;furniture.alt=game.label+' table';group.append(furniture);
      table.members.forEach((id,i)=>{
        const performer=table.activity==='charades'&&i===0;
        const halfBody=new Set(manifest.halfBodyAssets);
        const place=performer?'performer':`participant slot-${i} ${halfBody.has(id)?'half-body':'full-body'}`;
        const actor=addDiv(group,place);actor.dataset.actor=id;const art=image(id);actor.append(art);
        actor.dataset.player='true';
        if(id==='marmaduke')actor.classList.add('great-dane');
        const desired = performer ? 'right' : (i===table.members.length-1 ? 'left' : 'right');
        face(art,id,desired);
        actor.dataset.facing = desired;
      });
      const props=addDiv(group,'game-props');
      if(game.id==='poker'||game.id==='pinochle'){
        ['♠','♥','♣','♦','♠'].forEach((s,i)=>{const card=addDiv(props,'cards');card.textContent=s;card.style.left=`${25+i*20}px`;card.style.top=`${5+(i%2)*3}px`;card.style.transform=`rotate(${(i-2)*9}deg)`;if(i%2===0)card.style.color='#1c2930';});
        for(let j=0;j<7;j++){const chip=addDiv(props,'chip');chip.style.left=`${9+(j%4)*35}px`;chip.style.top=`${33+(j%2)*4}px`;}
      }else if(game.id==='charades'){
        for(const left of [35,120]){const glass=addDiv(props,'glass');glass.style.left=left+'px';}
      }
    });
    document.getElementById('table-caption').textContent=tables.map(t=>manifest.tableThemes.find(g=>g.id===t.theme).label+' — '+manifest.games.find(g=>g.id===t.game).label).join(' · ');
    window.currentTownTables=JSON.parse(JSON.stringify(tables));
  }
  function rand(n){return Math.floor(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296*n);}
  function sample(a,count){const values=[...a];for(let i=values.length-1;i>0;i--){const j=rand(i+1);[values[i],values[j]]=[values[j],values[i]];}return values.slice(0,count);}
  document.getElementById('shuffle').addEventListener('click',shuffleScene);
  let paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setMotion(){world.classList.toggle('paused',paused);document.getElementById('sanitation').src=paused?'assets/sanitation-still.webp':'assets/sanitation-engineer-animated.webp';const b=document.getElementById('motion');b.textContent=paused?'Resume motion':'Pause motion';b.setAttribute('aria-pressed',String(paused));}
  document.getElementById('motion').addEventListener('click',()=>{paused=!paused;setMotion();});
  document.getElementById('inspect').addEventListener('click',()=>document.getElementById('balloon-detail').showModal());
  document.getElementById('close-detail').addEventListener('click',()=>document.getElementById('balloon-detail').close());
  function shuffleScene(){
    let previous='';try{previous=sessionStorage.getItem('creative-town-last-episode')||'';}catch{}
    let episode;
    for(let attempt=0;attempt<24;attempt++){
      const committee=sample(manifest.committeePool,manifest.committeeCount);
      const occupied=new Set([...manifest.fixedDynamicCast,...committee]);
      const valid=id=>!occupied.has(id)&&!(manifest.exclusivePairs||[]).some(p=>p.includes(id)&&p.some(other=>other!==id&&occupied.has(other)));
      const usedThemes=new Set();
      const tables=[];
      const games=manifest.games.filter(g=>g.enabled);
      for(const game of sample(games,games.length)){
        const themes=manifest.tableThemes.filter(t=>!usedThemes.has(t.id)&&(game.fixedRoster?!!t.fixed&&game.fixedRoster.every(id=>t.fixed.includes(id)):!t.fixed)&&((t.fixed||t.pool).filter(id=>valid(id)&&(!game.requiresFullBody||!manifest.halfBodyAssets.includes(id))).length>=game.players));
        if(!themes.length)continue;
        const t=sample(themes,1)[0];const members=t.fixed||sample(t.pool.filter(id=>valid(id)&&(!game.requiresFullBody||!manifest.halfBodyAssets.includes(id))),game.players);
        members.forEach(id=>occupied.add(id));usedThemes.add(t.id);tables.push({theme:t.id,game:game.id,activity:game.id,members});if(tables.length===2)break;
      }
      if(tables.length!==2)continue;
      const catCall=tables.some(t=>t.theme==='cats');
      const catExtras=catCall?manifest.catFamily.filter(id=>!occupied.has(id)):[];
      catExtras.forEach(id=>occupied.add(id));
      const catWindows=catExtras.filter(id=>id!=='battle-cat'&&!manifest.halfBodyAssets.includes(id));
      const catTorso=catExtras.filter(id=>manifest.halfBodyAssets.includes(id));
      const guests=sample(manifest.streetGuestPool.filter(g=>valid(g.id)),manifest.streetGuestCount);
      guests.forEach(g=>occupied.add(g.id));
      const availableCast=manifest.repertoire.filter(id=>valid(id)&&!manifest.windowIneligible.includes(id)&&!manifest.halfBodyAssets.includes(id)&&!manifest.spotlightCast.includes(id)&&id!=='gargamel');
      const windowGuests=[...catWindows];
      for(const id of sample(availableCast,availableCast.length)){if(windowGuests.length>=Math.max(manifest.additionalTownCastCount,catWindows.length))break;if(valid(id)){windowGuests.push(id);occupied.add(id);}}
      const groundExtras=catExtras.includes('battle-cat')?['battle-cat']:[];
      const groundFeature=sample(manifest.windowIneligible.filter(id=>valid(id)&&id!=='superman'),1);
      groundFeature.forEach(id=>occupied.add(id));
      const tableSpectators=[...catTorso];
      for(const id of leastSeen(manifest.halfBodyAssets.filter(valid))){if(tableSpectators.length>=Math.max(2,catTorso.length))break;if(valid(id)){tableSpectators.push(id);occupied.add(id);}}
      const townExtras=[];
      const spotlight=manifest.spotlightCast.filter(valid);
      const other=manifest.repertoire.filter(id=>valid(id)&&!spotlight.includes(id)&&!manifest.halfBodyAssets.includes(id));
      const target=manifest.targetCastCount;
      for(const id of [...leastSeen(spotlight),...leastSeen(other)]){if([...occupied].filter(x=>manifest.repertoire.includes(x)).length>=target)break;if(valid(id)&&!manifest.halfBodyAssets.includes(id)){townExtras.push(id);occupied.add(id);}}
      const residents={elvis:rand(3),animals:rand(2),larry:rand(3),pizza:rand(3),sanitation:rand(3),flight:rand(manifest.flightRoutes.length)};
      const signature=JSON.stringify({scene:chosenScene.id,committee,guests:guests.map(g=>g.id),windowGuests,groundExtras,groundFeature,tableSpectators,townExtras,residents,tables});
      episode={committee,guests,windowGuests,groundExtras,groundFeature,tableSpectators,townExtras,residents,tables,signature};if(signature!==previous)break;
    }
    if(!episode)throw new Error('Insufficient compatible assets for a complete scene');
    window.currentCommittee=episode.committee;window.currentStreetGuests=[...episode.guests.map(g=>g.id),...episode.windowGuests,...episode.groundExtras,...episode.groundFeature,...episode.tableSpectators,...episode.townExtras];
    const committeeRoot=document.getElementById('committee-members');committeeRoot.replaceChildren();
    const full=episode.committee.filter(id=>['andy-capp','gargamel'].includes(id));
    const busts=episode.committee.filter(id=>!full.includes(id));
    const slots=new Map();full.forEach((id,i)=>slots.set(id,i===0?0:2));busts.forEach((id,i)=>slots.set(id,full.length===2?1:i+1));
    for(const id of episode.committee){const slot=slots.get(id);const bust=busts.includes(id);const art=image(id,'argument-member');art.dataset.actor=id;const desired=slot===0?'right':'left';Object.assign(art.style,{left:([0,95,205][slot]-(id==='gargamel'?30:0))+'px',top:(id==='gargamel'?15:bust?25:34)+'px',width:(id==='gargamel'?190:bust?112:100)+'px',height:(id==='gargamel'?190:bust?126:172)+'px'});face(art,id,desired);committeeRoot.append(art);}
    const residentsRoot=document.getElementById('resident-actors');residentsRoot.replaceChildren();
    for(const r of manifest.alwaysResidents){const p=r.spots[rand(r.spots.length)];const actor=addDiv(residentsRoot,'actor');actor.dataset.actor=r.id;Object.assign(actor.style,{left:p[0]+'px',top:p[1]+'px',width:r.w+'px',height:r.h+'px',zIndex:String(r.z)});const art=image(r.id);face(art,r.id,p[0]>830?'left':'right');actor.append(art);}
    const guestsRoot=document.getElementById('street-guests');guestsRoot.replaceChildren();
    for(const g of episode.guests){const actor=addDiv(guestsRoot,'actor');actor.dataset.actor=g.id;actor.dataset.facing=g.facing;Object.assign(actor.style,{left:(g.x+rand(9)-4)+'px',top:(g.y+rand(5)-2)+'px',width:g.w+'px',height:g.h+'px',zIndex:String(g.z||71)});const art=image(g.id);face(art,g.id,g.facing);actor.append(art);}
    episode.windowGuests.forEach((id,i)=>{const actor=addDiv(guestsRoot,'actor window-guest');actor.dataset.actor=id;Object.assign(actor.style,{left:(episode.windowGuests.length>4?[510,567,624,681,738]:[515,590,665,740])[i]+'px',top:'460px',width:'53px',height:'69px',zIndex:'55'});actor.append(image(id));const sill=addDiv(actor,'window-sill');sill.setAttribute('aria-hidden','true');});
    for(const id of episode.groundExtras){const actor=addDiv(guestsRoot,'actor');actor.dataset.actor=id;Object.assign(actor.style,{left:'930px',top:'545px',width:'115px',height:'79px',zIndex:'61'});actor.append(image(id));}
    for(const id of episode.groundFeature){const actor=addDiv(guestsRoot,'actor');actor.dataset.actor=id;Object.assign(actor.style,{left:'40px',top:id==='scoob-and-shag'?'650px':'676px',width:id==='marmaduke'?'280px':id==='scoob-and-shag'?'270px':'220px',height:id==='marmaduke'?'200px':id==='scoob-and-shag'?'245px':'150px',zIndex:'75'});const art=image(id);face(art,id,'right');actor.append(art);}
    episode.townExtras.forEach((id,i)=>{const p=manifest.roamSlots[i%manifest.roamSlots.length];let [x,y,w,h,z]=p;const foot=y+h;if(id==='gargamel'){w=190;h=190;}if(id==='marmaduke'){w=280;h=200;}if(id==='scoob-and-shag'){w=270;h=245;}if(id==='papa-smurf'){w=95;h=130;}y=foot-h;const actor=addDiv(guestsRoot,'actor town-extra');actor.dataset.actor=id;Object.assign(actor.style,{left:x+'px',top:y+'px',width:w+'px',height:h+'px',zIndex:String(z)});const art=image(id);face(art,id,x>830?'left':'right');actor.append(art);});
    const place=(id,p)=>{const el=document.querySelector(`[data-actor="${id}"]`);if(el)Object.assign(el.style,{left:p[0]+'px',top:p[1]+'px',width:p[2]+'px',height:p[3]+'px'});};
    place('elvis-like',[[725,522,88,173],[1200,626,70,137],[721,517,88,173]][episode.residents.elvis]);
    if(episode.residents.animals){place('pig-prime',[332,746,220,184]);place('emotional-support-donkey',[135,714,210,197]);}
    else{place('pig-prime',[140,735,225,188]);place('emotional-support-donkey',[335,714,210,197]);}
    renderTables(episode.tables);
    const spectatorRoot=document.getElementById('table-spectators');spectatorRoot.replaceChildren();
    const spectatorCounts=new Map();
    for(const id of episode.tableSpectators){const cat=manifest.catFamily.includes(id);const tables=[...document.querySelectorAll('.table-group')];const host=(cat?tables.find(t=>t.dataset.theme==='cats'):tables[spectatorCounts.size%tables.length])||tables[0];const index=spectatorCounts.get(host)||0;spectatorCounts.set(host,index+1);const s=getComputedStyle(host);const actor=addDiv(spectatorRoot,'table-spectator');actor.dataset.actor=id;actor.dataset.role='spectator';Object.assign(actor.style,{left:(parseFloat(s.left)+[50,170,110][index%3])+'px',top:(parseFloat(s.top)-15)+'px'});const art=image(id);face(art,id,index%2?'left':'right');actor.append(art);}
    const reserved=[];
    const elvis=document.querySelector('[data-actor="elvis-like"]');
    if(elvis)reserved.push([parseFloat(elvis.style.left),parseFloat(elvis.style.top),parseFloat(elvis.style.width),parseFloat(elvis.style.height)]);
    for(const table of document.querySelectorAll('.game-ping-pong,.game-pool')){const s=getComputedStyle(table);reserved.push([parseFloat(s.left)-52,parseFloat(s.top),457,270]);}
    const collision=(a,b)=>{const area=Math.max(0,Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]));return area/Math.min(a[2]*a[3],b[2]*b[3])>.24;};
    for(const [id,key]of[['larry','larry'],['pizza-courier','pizza'],['sanitation-engineer','sanitation']]){const options=manifest.roleLocations[id];const rotated=options.map((_,i)=>options[(i+episode.residents[key])%options.length]);const p=rotated.find(candidate=>!reserved.some(r=>collision(candidate,r)))||rotated[0];place(id,p);reserved.push(p);}
    setFlightRoute(episode.residents.flight,true);
    document.documentElement.dataset.episode=episode.signature;
    const displayed=new Set([...manifest.fixedDynamicCast,...episode.committee,...window.currentStreetGuests,...episode.tables.flatMap(t=>t.members)].filter(id=>manifest.repertoire.includes(id)));
    document.documentElement.dataset.castCount=String(displayed.size);document.documentElement.dataset.castPercent=(100*displayed.size/manifest.repertoire.length).toFixed(1);
    for(const id of displayed)castSeen[id]=(castSeen[id]||0)+1;
    const counter=document.getElementById('cast-count');if(counter)counter.textContent=`${displayed.size}/${manifest.repertoire.length} cast this draw (${(100*displayed.size/manifest.repertoire.length).toFixed(1)}%); ${Object.keys(castSeen).filter(id=>manifest.repertoire.includes(id)).length}/${manifest.repertoire.length} seen across draws`;
    try{sessionStorage.setItem('creative-town-seen',JSON.stringify(castSeen));}catch{}
    try{sessionStorage.setItem('creative-town-last-episode',episode.signature);}catch{}
  }
  let flightIndex=0;
  function setFlightRoute(index,initial=false){
    const el=document.querySelector('[data-actor="superman"]');const r=manifest.flightRoutes[index];flightIndex=index;
    for(const [k,v]of Object.entries({left:'0px',top:r.top+'px',width:r.width+'px',height:r.height+'px','z-index':String(r.z)}))el.style.setProperty(k,v,'important');
    el.style.animation=`${r.name} 14s linear infinite`;el.style.animationDelay=initial?'-3s':'0s';el.dataset.distance=r.distance;el.dataset.route=r.name;el.querySelector('img').style.transform=r.facing==='left'?'scaleX(-1)':'none';
  }
  document.querySelector('[data-actor="superman"]').addEventListener('animationiteration',()=>setFlightRoute((flightIndex+1+rand(manifest.flightRoutes.length-1))%manifest.flightRoutes.length));
  shuffleScene();setMotion();
  document.documentElement.dataset.sceneInitMs=(performance.now()-initStart).toFixed(2);
})();
