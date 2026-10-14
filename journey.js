/* V14: continuous GPU environment; prefetched scroll atlas, high-resolution resting frames. */
(() => {
'use strict';
const root=document.documentElement,track=document.querySelector('.e-journey-track'),view=document.querySelector('.e-journey-viewport'),canvas=document.querySelector('#spatial-world');
const sections=[...document.querySelectorAll('.e-scene')],ids=sections.map(e=>e.id),reduced=matchMedia('(prefers-reduced-motion:reduce)'),mobile=matchMedia('(max-width:800px)');
const starts=[0,1.45,3.05,4.65,6.35,8.1],exits=[.5,2.12,3.92,5.48,7.02,9.15],anchors=[.36,1.6,3.25,4.8,6.6,9.15],end=13.2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=(a,b,x)=>{const n=clamp((x-a)/(b-a),0,1);return n*n*(3-2*n)};
// Add 30% scroll distance to the cloud voyage without adding input latency.
const scrollFor=x=>x+2.1*smooth(1.6,8.6,x);
const phaseFor=y=>{let lo=0,hi=end;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(scrollFor(mid)<y)lo=mid;else hi=mid;}return (lo+hi)/2;};
let gpu,manifest,mode=false,t=0,target=0,top=0,vh=innerHeight,active=-1,raf=0,last=0,lastScroll=0,world='machine',oldWorld='machine',navigation=0,modeToken=0,arrival=0,holdDone=0,idleClock=0,scenePrepare=false,worldElapsed=0,worldAnimating=false,clock=0,lastUI=-1,restKey='',settledAt=0,oldFrame=null,rasterScale=1,qualitySamples=[],lastHigh=null;
const entry=ids.indexOf(location.hash.slice(1));if(entry>0)t=anchors[entry];
const backgroundFilms={pause(){},update(){}};
let moon; // Create the GPU world only when motion is enabled.
const cache=new Map(),pending=new Map(),controllers=new Set();let generation=0;const prefix=()=>mobile.matches?'sp':'pc';
const url=(clip,index)=>`film/${prefix()}/${clip}/${String(index).padStart(4,'0')}.webp?v=13`;
function trim(){while(cache.size>6){const [key,im]=cache.entries().next().value;im.close();cache.delete(key);}canvas.dataset.cached=cache.size;}
function want(clip,index){index=clamp(Math.floor(index),0,manifest.clips[clip]-1);const key=url(clip,index);if(cache.has(key)){const v=cache.get(key);cache.delete(key);cache.set(key,v);return {im:v,key};}if(!pending.has(key)&&pending.size<3){const gen=generation,controller=new AbortController();controllers.add(controller);const job=fetch(key,{cache:'force-cache',signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Frame '+r.status);return r.blob();}).then(b=>createImageBitmap(b)).then(im=>{if(gen!==generation){im.close();return;}cache.set(key,im);trim();request();}).catch(e=>{if(e.name!=='AbortError')canvas.dataset.loadError='true';}).finally(()=>{if(pending.get(key)===job)pending.delete(key);controllers.delete(controller);});pending.set(key,job);}return null;}
function pair(clip,f){const n=Math.floor(f),next=clip.startsWith('idle')?(n+1)%manifest.clips[clip]:Math.min(n+1,manifest.clips[clip]-1),lo=want(clip,n),hi=want(clip,next);if(!lo||!hi)return null;return {a:gpu.single(lo.im,lo.key),b:gpu.single(hi.im,hi.key),blend:f-n,key:lo.key};}
function motionState(paused){
 const isCase=t>5.9&&t<7.6,worldNumber=isCase?['machine','ev','energy','marine','space'].indexOf(world):-1;
 let u,v,size;
 if(t<.5){u=.73;v=mobile.matches?.48:.37;size=mobile.matches?.37:.2;}else if(t<2.12){const q=smooth(.5,1.45,t);u=.73-.04*q;v=.37+.06*q;size=mobile.matches?.29:.15;}else if(t<5.48){u=mobile.matches?.8:.82;v=mobile.matches?.34:.24;size=mobile.matches?.22:.095;}else if(t<7.1){u=mobile.matches?.3:.58;v=mobile.matches?.33:.22;size=mobile.matches?.23:.095;}else{const q=smooth(7.1,8.1,t);u=.58+.16*q;v=.22+.21*q;size=mobile.matches?.23+.12*q:.095+.085*q;}
 const water=isCase?[.15,.35,.6,1.3,0][worldNumber]:1;
 return {clock,paused,water,cloud:isCase?[.22,.45,.5,.5,0][worldNumber]:1,sky:isCase?(worldNumber===4?1:.15):1,world:worldNumber,scene:active,guide:[u,v],guideSize:size*.7,change:worldAnimating&&!paused?worldElapsed/1100:0,old:oldFrame};
}
function ui(x){let next=0;for(let i=1;i<6;i++)if(x>=(exits[i-1]+starts[i])/2)next=i;if(x>=12.45)next=0;
 const paused=root.classList.contains('motion-off');
 sections.forEach((e,i)=>{let a=1;if(i>0)a*=smooth(exits[i-1]+(starts[i]-exits[i-1])*.6,starts[i],x);if(i<5)a*=1-smooth(exits[i],exits[i]+(starts[i+1]-exits[i])*.32,x);if(i===0&&x>11.7)a=smooth(11.7,13.05,x);if(i===5)a*=1-smooth(9.35,9.85,x);if(paused)a=i===next?1:0;e.classList.toggle('guide-arrived',a>.72);e.inert=a<.75;e.style.visibility=a>.002?'visible':'hidden';e.style.setProperty('--scene-alpha',a.toFixed(4));e.style.setProperty('--scene-shift',`${(1-a)*12}px`);e.style.setProperty('--p',i===0&&x>11.7?.72:clamp((x-starts[i])/(exits[i]-starts[i]),0,1));e.style.setProperty('--text-reveal','0%');e.style.setProperty('--console-mask','0%');});
 if(next!==active){active=next;root.dataset.journeyScene=ids[next];document.querySelector('#scene-index').textContent=sections[next].dataset.number;document.querySelector('#scene-name').textContent=sections[next].dataset.name;document.querySelectorAll('.chapter-nav a').forEach((a,i)=>i===next?a.setAttribute('aria-current','location'):a.removeAttribute('aria-current'));document.dispatchEvent(new CustomEvent('avc:scene',{detail:{index:next}}));}
 view.dataset.phase=ids[next];root.style.setProperty('--e-progress',clamp(x/end,0,1));root.style.setProperty('--journey-ink','#d4e7f3');root.style.setProperty('--journey-flash',paused?'0':String(0));root.style.setProperty('--world-pass','0');document.querySelector('.site-header').classList.toggle('scrolled',x>.05);
 const footer=document.querySelector('.footer');const fa=smooth(8.6,9.05,x)*(1-smooth(9.35,9.85,x));footer.style.setProperty('--footer-alpha',fa);footer.inert=fa<.8;root.classList.toggle('journey-ending',x>8.6&&x<12.45);root.classList.toggle('journey-returning',x>9.35);view.dataset.finished=String(x>=13.05);
 if(x>4.5&&!scenePrepare){scenePrepare=true;document.dispatchEvent(new CustomEvent('avc:prepare-cases'));}
 canvas.dataset.position=x.toFixed(4);canvas.dataset.world=world;
}

// Optional local frame audit. Publishes read-only DOM telemetry once per second.
const auditEnabled=new URLSearchParams(location.search).has('perf');let auditLast=0,auditReport=0,auditFrames=[];
function auditFrame(now){if(!auditEnabled)return;if(auditLast&&now-auditLast<1000)auditFrames.push(now-auditLast);auditLast=now;if(auditFrames.length>240)auditFrames.shift();if(now-auditReport<1000||!moon)return;auditReport=now;const a=[...auditFrames].sort((a,b)=>a-b),n=a.length;if(!n)return;Object.assign(moon.canvas.dataset,{frameMean:(a.reduce((s,x)=>s+x,0)/n).toFixed(2),frameP95:a[Math.min(n-1,Math.floor(n*.95))].toFixed(2),slowFrames:(a.filter(x=>x>34).length/n*100).toFixed(1),frameSamples:String(n),pageVisibility:document.visibilityState,pageFocused:String(document.hasFocus()),viewport:innerWidth+'x'+innerHeight});}
function render(now){auditFrame(now);raf=0;if(!mode||document.hidden)return;const elapsed=now-(last||now),dt=clamp(elapsed,0,50);last=now;const paused=root.classList.contains('motion-off');target=phaseFor(clamp((scrollY-top)/vh,0,scrollFor(end)));const moving=Math.abs(target-t)>.0005;
 // Input follows the camera immediately; no network or decode barrier.
 if(paused){arrival=0;t=target;}else if(arrival&&target<.01){arrival+=dt;t=anchors[0]*smooth(1,1000,arrival);if(arrival>=1000){scrollTo({top:top+scrollFor(anchors[0])*vh,behavior:'instant'});arrival=0;}}else{arrival=0;t+= (target-t)*(1-Math.exp(-dt/42));if(Math.abs(target-t)<.0005)t=target;}
 // Stay at the physical end of the page; never wrap scroll position or reset the scene.
 if(!paused){clock+=clamp(elapsed,0,250)/1000;idleClock+=dt/1000;if(worldAnimating&&gpu.packs.has(prefix()+'/world-'+world)){worldElapsed+=dt;if(worldElapsed>=1100){worldAnimating=false;oldFrame=null;gpu.retained=new Set(['world-'+world]);gpu.trim();}}}
 if(Math.abs(t-lastUI)>.0001||paused!==render.wasPaused){ui(t);lastUI=t;render.wasPaused=paused;}
 if(moon?.loaded){
 if(!root.classList.contains('moon-active'))root.classList.add('moon-active');moon.canvas.style.display='block';moon.render(t,clock);
 canvas.dataset.position=t.toFixed(4);canvas.dataset.clip='moon-flight';canvas.dataset.paused=String(paused);canvas.dataset.buffering='false';canvas.dataset.motion='scroll-driven-moon-flight';
 render.count=(render.count||0)+1;render.duration=(render.duration||0)+elapsed;if(render.duration>1000){moon.canvas.dataset.fps=(render.count*1000/render.duration).toFixed(1);render.count=0;render.duration=0;}
 if(!paused||moving||arrival)request();return;
 }
 if(root.classList.contains('moon-active'))root.classList.remove('moon-active');if(moon)moon.canvas.style.display='none';
 const charge=Number(document.querySelector('#connect-light').style.getPropertyValue('--charge'))||0,held=active===1&&(charge>0||holdDone>now);
 let frame=gpu.main(t),clip='main',key='atlas:main:'+t.toFixed(3);
 if(t>=7.1&&t<=8.1){clip='exit-'+world;frame=gpu.world(world,t-7.1,true);key='atlas:'+clip+':'+t.toFixed(3);}
 else if(t>=6.35&&t<7.1){clip='case-'+world;frame=gpu.world(world,clamp((t-6.35)/.75,0,1));key='atlas:'+clip+':'+t.toFixed(3);}
 const resting=!moving&&now-lastScroll>160&&!arrival&&!worldAnimating;
 if(resting&&!paused){const nextKey=held?'hold':(t>=6.35&&t<7.1?'idle-world-'+world:Math.abs(t-anchors[active])<.025?'idle-'+active:'main@'+Math.round(t/end*239));if(nextKey!==restKey){restKey=nextKey;settledAt=now;lastHigh=null;}
  let high=null;
  if(held){clip='hold';high=pair(clip,(holdDone>now?1:charge)*(manifest.clips.hold-1));}
  else if(nextKey.startsWith('idle')){clip=nextKey;high=pair(clip,paused?0:(idleClock*.16%1)*manifest.clips[clip]);}
  else{const n=Math.round(t/end*239);high=pair('main',n);}
  if(high){lastHigh=high;}if(lastHigh){frame=lastHigh;key=lastHigh.key;}
 }else{restKey='';lastHigh=null;}
 if(!frame?.a||!frame?.b){const fallback=want('main',Math.round(t/end*239));if(fallback){frame={a:gpu.single(fallback.im,fallback.key),blend:0};key=fallback.key;}}
 if(paused&&render.frozen&&Math.abs(t-render.frozen.t)<.0005&&world===render.frozen.world){frame=render.frozen.frame;key=render.frozen.key;}
 if(paused&&frame?.a&&!render.frozen&&(t<6.35||t>8.1||gpu.packs.has(prefix()+'/world-'+world)))render.frozen={t,world,frame,key};else if(!paused||render.frozen&&(Math.abs(t-render.frozen.t)>=.0005||world!==render.frozen.world))render.frozen=null;
 const state=motionState(paused);state.key=key;gpu.render(frame,state);backgroundFilms.update({t,active,world,paused,moving,arrival,worldAnimating,held,clock});
 canvas.dataset.position=t.toFixed(4);canvas.dataset.world=world;canvas.dataset.actualWorld=t>=6.35&&t<=8.1&&gpu.packs.has(prefix()+'/world-'+world)?world:'main';canvas.dataset.clip=clip;canvas.dataset.paused=String(paused);canvas.dataset.buffering=String(!frame?.a);canvas.dataset.waitingForCamera='false';canvas.dataset.character='original-baked-2d-guide';canvas.dataset.transition=worldAnimating?'cloud-occlusion':'none';canvas.dataset.clock=clock.toFixed(3);canvas.dataset.motion='original-camera-and-guide; background-video-pending';
 if(!paused&&canvas.dataset.atlasReady==='true'){qualitySamples.push(elapsed);if(qualitySamples.length>90)qualitySamples.shift();const total=qualitySamples.reduce((n,x)=>n+x,0);if(total>2000&&qualitySamples.length>12&&total/qualitySamples.length>26&&rasterScale>.5){rasterScale=Math.max(.5,rasterScale*.82);qualitySamples=[];resize();canvas.dataset.rasterScale=rasterScale.toFixed(2);}}render.count=(render.count||0)+1;render.duration=(render.duration||0)+elapsed;if(render.duration>1000){canvas.dataset.fps=(render.count*1000/render.duration).toFixed(1);render.count=0;render.duration=0;}if(!paused||moving||arrival||worldAnimating)request();
}
function request(){if(!raf&&mode&&!document.hidden){if(performance.now()-last>100)last=performance.now();raf=requestAnimationFrame(render);}}
function resize(){const old=vh,at=(scrollY-top)/old;vh=innerHeight;top=track.getBoundingClientRect().top+scrollY;const d=Math.min(devicePixelRatio,mobile.matches?1.5:1.25,1440/innerWidth,1920/innerHeight);if(gpu)gpu.resize(Math.round(innerWidth*d*rasterScale),Math.round(innerHeight*d*rasterScale));if(mode&&old!==vh)scrollTo({top:top+clamp(at,0,scrollFor(end))*vh,behavior:'instant'});request();}
function clear(){lastHigh=null;generation++;for(const controller of controllers)controller.abort();pending.clear();for(const v of cache.values())v.close();cache.clear();gpu?.clear();render.frozen=null;}
async function setMode(on){const footer=document.querySelector('.footer');if(on)view.append(footer);else{document.querySelector('main').after(footer);footer.inert=false;}const token=++modeToken,was=mode;if(!on){backgroundFilms.pause();if(moon)moon.canvas.style.display='none';root.classList.remove('moon-active');mode=false;navigation++;root.classList.remove('journey-pending','journey-ready');root.classList.add('static-world');cancelAnimationFrame(raf);raf=0;sections.forEach(e=>{e.inert=false;e.style.removeProperty('visibility');});clear();if(active>=0)sections[active].scrollIntoView({block:'start'});window.dispatchEvent(new Event('resize'));document.dispatchEvent(new CustomEvent('avc:static-world'));return;}
 try{moon ||= new AVCMoonFlight(view);await moon.ready;if(!moon.loaded)throw Error('Lunar renderer unavailable');
  // Present the current world as soon as its assets are ready. The retired
  // film decoder and its first frame must not delay or cover the first paint.
  if(moon?.loaded){
   if(token!==modeToken)return;
   mode=true;history.scrollRestoration='manual';
   root.classList.remove('journey-pending','static-world');
   root.classList.add('moon-active','journey-ready','sequence-ready','living-world-ready');
   moon.canvas.style.display='block';resize();ui(t);moon.render(t,clock);
   canvas.dataset.atlasReady='true';canvas.dataset.initialRenderer='moon-flight';
   last=0;lastScroll=performance.now();arrival=t===0&&(!location.hash||location.hash==='#hero')?1:0;
   scrollTo({top:top+scrollFor(t)*vh,behavior:'instant'});request();return;
  }
  manifest ||= await fetch('film/manifest.json?v=13').then(r=>r.json());gpu ||= new AVCLivingWorld(canvas);gpu.setVariant(prefix());const n=Math.round(t/end*239),first='assets/chapter-reference.webp',blob=await fetch(first).then(r=>{if(!r.ok)throw Error('First frame');return r.blob()}),im=await createImageBitmap(blob);if(token!==modeToken){im.close();return;}cache.set(first,im);trim();mode=true;if(moon?.loaded){root.classList.add('moon-active');moon.canvas.style.display='block';moon.render(t,clock);}root.classList.remove('journey-pending','static-world');root.classList.add('journey-ready','sequence-ready','living-world-ready');history.scrollRestoration='manual';resize();ui(t);gpu.render({a:gpu.single(im,first),blend:0},{...motionState(root.classList.contains('motion-off')),key:first});last=0;lastScroll=performance.now();arrival=t===0&&(!location.hash||location.hash==='#hero')?1:0;request();
  Promise.all(moon?.loaded?[]:[gpu.pack('world-'+world)]).then(()=>{if(token===modeToken){canvas.dataset.atlasReady='true';request();}}).catch(()=>{canvas.dataset.atlasError='true';});
  if(was||active>=0){scrollTo({top:top+scrollFor(t)*vh,behavior:'instant'});request();}else if(location.hash!=='#hero'&&ids.includes(location.hash.slice(1)))go(location.hash.slice(1),true);
 }catch(error){if(token===modeToken){console.warn('Live environment unavailable',error.message);setMode(false);root.dataset.sequenceError='true';}}}
function go(id,instant=false){const i=ids.indexOf(id);if(i<0||!mode)return;const y=top+scrollFor(anchors[i])*vh;history.replaceState(null,'','#'+id);arrival=0;const nav=++navigation;if(instant||root.classList.contains('motion-off')){scrollTo({top:y,behavior:'instant'});request();return;}const from=scrollY,began=performance.now(),duration=clamp(Math.abs(y-from)/vh*350,700,1900);function step(now){if(nav!==navigation||!mode)return;scrollTo({top:from+(y-from)*smooth(began,began+duration,now),behavior:'instant'});if(now<began+duration)requestAnimationFrame(step);}requestAnimationFrame(step);}
for(const name of ['wheel','touchstart'])window.addEventListener(name,()=>{navigation++;arrival=0;},{passive:true});window.addEventListener('pointerdown',e=>{if(!e.target.closest('#motion-toggle')){navigation++;arrival=0;}},{passive:true});document.querySelector('.e-product-console').addEventListener('focusin',()=>{navigation++;arrival=0;});
window.addEventListener('keydown',e=>{if(['PageDown','PageUp','ArrowDown','ArrowUp','Home','End',' '].includes(e.key)){navigation++;arrival=0;}});
window.addEventListener('scroll',()=>{lastScroll=performance.now();request();},{passive:true});window.addEventListener('resize',resize);window.addEventListener('hashchange',()=>go(location.hash.slice(1),true));
new MutationObserver(()=>{if(root.classList.contains('motion-off')){navigation++;if(mode&&gpu?.last)render.frozen={t,world,frame:gpu.last,key:canvas.dataset.frame};}request();}).observe(root,{attributes:true,attributeFilter:['class']});new MutationObserver(request).observe(document.querySelector('#connect-light'),{attributes:true,attributeFilter:['style']});
document.addEventListener('avc:connect',()=>{if(!mode)return;holdDone=performance.now()+700;request();const inputVersion=navigation;setTimeout(()=>{if(mode&&navigation===inputVersion&&!root.classList.contains('motion-off'))go('products');},750);});
document.addEventListener('avc:world',e=>{if(!mode||!gpu||moon?.loaded){world=e.detail.name;canvas.dataset.world=world;request();return;}if(e.detail.name===world)return;oldWorld=world;oldFrame=gpu?.last;world=e.detail.name;gpu.retained=new Set(['world-'+world,'world-'+oldWorld]);worldElapsed=0;worldAnimating=!root.classList.contains('motion-off');render.frozen=null;restKey='';gpu?.pack('world-'+world).then(()=>request()).catch(()=>canvas.dataset.atlasError='true');request();});
document.querySelectorAll('[data-world]').forEach(b=>{const hint=()=>{if(mode&&!moon?.loaded&&!worldAnimating)gpu.pack('world-'+b.dataset.world).catch(()=>{});};b.addEventListener('pointerenter',hint);b.addEventListener('focus',hint);});
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const id=a.getAttribute('href').slice(1);if(mode&&ids.includes(id)){e.preventDefault();go(id);}}));
document.addEventListener('avc:background-ready',request);
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;navigation++;}else{last=0;request();}});reduced.addEventListener('change',()=>setMode(!reduced.matches));mobile.addEventListener('change',()=>{clear();setMode(!reduced.matches);});document.addEventListener('avc:gpu-lost',()=>setMode(false));
if(reduced.matches)setMode(false);else setMode(true);
})();
