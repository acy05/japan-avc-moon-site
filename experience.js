/* Native scrolling, one decorative frame loop, fixed 2D artwork. */
(() => {
 'use strict';
 const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
 const root=document.documentElement, reduced=matchMedia('(prefers-reduced-motion: reduce)'), mobile=matchMedia('(max-width:800px)');
 const scenes=$$('.e-scene'), button=$('#motion-toggle');
 let paused=false, raf=0, lastFrame=0, dirty=true, active=0, pointer={x:0,y:0}, metrics=[], entrance=performance.now(), holdStart=0, charge=0, connected=false, burst=null, settling=false;const cameraState=new Map();
 const canvas=$('#atmosphere'), ctx=canvas.getContext('2d'); let particles=[];
 const enabled=()=>!paused&&!reduced.matches;
 const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
 const set=(el,key,value)=>el.style.setProperty(key,value);
 function measure(){metrics=scenes.map(el=>({el,top:el.getBoundingClientRect().top+scrollY,height:el.offsetHeight,stage:$('.e-stage',el).offsetHeight}));dirty=true;const dpr=Math.min(devicePixelRatio,1.5);canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);particles=Array.from({length:mobile.matches?20:44},(_,i)=>({x:(i*0.61803398875%1)*innerWidth,y:(i*.371%1)*innerHeight,r:.4+(i%3)*.3,v:.025+(i%5)*.015}));schedule();}
 function updateScenes(now){
  if(root.classList.contains('journey-ready')){dirty=false;settling=false;return;}
  const moving=enabled(), scroll=scrollY, vh=innerHeight;
  set(root,'--e-progress',clamp(scroll/(root.scrollHeight-vh)));
  $('.site-header').classList.toggle('scrolled',scroll>45);
  let next=0;settling=false;
  metrics.forEach((m,i)=>{
   if(scroll+vh*.4>=m.top)next=i;
   if(m.top>scroll+vh*1.3||m.top+m.height<scroll-vh*.3)return;
   const span=m.height>m.stage?m.height-m.stage:Math.max(vh*.8,m.height-vh), target=moving?clamp((scroll-m.top)/span):.5;const old=cameraState.get(m.el)??target;const p=moving?old+(target-old)*.24:.5;cameraState.set(m.el,p);if(Math.abs(target-p)>.0005)settling=true;
   const entry=moving?clamp((scroll+vh-m.top)/(vh*.85)):1;
   const frame=moving?clamp((scroll-m.top+vh*.4)/(m.height+vh*.4)):.5;
   set(m.el,'--p',p.toFixed(3));set(m.el,'--text-reveal',(100*(1-clamp(entry*1.2))).toFixed(1)+'%');set(m.el,'--portal-radius',(25+clamp(entry)*140).toFixed(1)+'%');set(m.el,'--world-y',`${(-p*(i===3?16:85)).toFixed(1)}px`);set(m.el,'--world-x',`${(pointer.x*.4).toFixed(1)}px`);
   set(m.el,'--world-scale',(i===5?1.2-p*.2:i===1?1.12+p*.08:1+p*.18).toFixed(3));set(m.el,'--copy-y',`${(-p*20).toFixed(1)}px`);
   set(m.el,'--camera-depth',p.toFixed(3));const travel=mobile.matches?.28:1;set(m.el,'--far-x',`${((p-.5)*(i===5?-45:55)*travel+pointer.x*.25).toFixed(2)}px`);set(m.el,'--far-y',`${(-p*65*travel).toFixed(2)}px`);set(m.el,'--mid-x',`${((.5-p)*180*travel+pointer.x*.7).toFixed(2)}px`);set(m.el,'--mid-y',`${(-p*110*travel).toFixed(2)}px`);set(m.el,'--near-x',`${((.5-p)*340*travel+pointer.x*1.2).toFixed(2)}px`);set(m.el,'--near-y',`${(-p*160*travel).toFixed(2)}px`);set(m.el,'--lens-scale',(i===5?1.45-p*.4:1.06+p*(i===3?.08:.3)*travel).toFixed(4));set(m.el,'--lens-angle',`${(p-.5)*(i===3?0:2.2)*travel}deg`);set(m.el,'--flight-reveal',`${(1-p)*2100}`);set(m.el,'--lens-glow',(.18+Math.sin(p*Math.PI)*.38).toFixed(3));set(m.el,'--copy-x',`${i===0?-p*24:0}px`);set(m.el,'--plane-y',`${-p*65}px`);set(m.el,'--plane-scale',(1.16-p*.16).toFixed(3));set(m.el,'--diagram-shift',`${moving?(1-p)*45:0}px`);set(m.el,'--diagram-scale',(moving?1.15-p*.15:1).toFixed(3));set(m.el,'--scan-x',`${30+p*62}%`);set(m.el,'--tech-y',`${moving?-p*18:0}px`);set(m.el,'--final-copy-y',`${moving?-p*25:0}px`);set(m.el,'--orbit-scale',(1-p*.3).toFixed(3));set(m.el,'--orbit-angle',`${-22+p*15}deg`);
   set(m.el,'--line-offset',(moving?1200*(1-clamp(entry*.65+p*.7)):0).toFixed(0));
   set(m.el,'--product-ring',(moving?1.8-clamp(entry*.2+p*.8)*.8:1).toFixed(3));
   set(m.el,'--object-x',`${moving?(1-p)*40:0}px`);set(m.el,'--object-rotate',`${moving?-9*(1-p):0}deg`);set(m.el,'--console-mask',`${moving&&!mobile.matches?100*(1-clamp((p+.15)*2.5)):0}%`);set(m.el,'--object-y',`${moving?(1-entry)*75-p*15:0}px`);set(m.el,'--object-scale',(moving?.8+entry*.2:1).toFixed(3));
   set(m.el,'--console-y',`${moving?(1-clamp(entry+p*.6))*45:0}px`);
   set(m.el,'--diagram-offset',(moving?1800*(1-clamp(entry*.6+p*.8)):0).toFixed(0));set(m.el,'--grid-opacity',(.25+frame*.55).toFixed(3));
   if(i===0){const arrival=moving?clamp((now-entrance)/1900):1;set(m.el,'--guide-scale',(.18+.82*(1-Math.pow(1-arrival,3))).toFixed(3));set(m.el,'--guide-x',`${(1-arrival)*100+p*30}px`);set(m.el,'--guide-y',`${-(1-arrival)*150+p*40}px`);set(m.el,'--horizon-scale',(.3+p*.7+arrival*.4).toFixed(3));}
   else if(i===1){set(m.el,'--guide-x',`${clamp(p)*(mobile.matches?68:150)}px`);set(m.el,'--guide-y',`${-p*15}px`);}
   else if(i===5){set(m.el,'--guide-x',`${p*50}px`);set(m.el,'--guide-y',`${-p*35}px`);set(m.el,'--guide-scale',(1-p*.14).toFixed(3));}
  });
  if(next!==active||dirty){active=next;$('#scene-index').textContent=scenes[next].dataset.number;$('#scene-name').textContent=scenes[next].dataset.name;$$('.chapter-nav a').forEach((a,i)=>{a.classList.toggle('active',i===next);if(i===next)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});set(root,'--thread-opacity',next===3?'.1':'.3');}
  dirty=false;
 }
 function paint(now){ctx.clearRect(0,0,innerWidth,innerHeight);if(!enabled())return;for(const p of root.classList.contains('journey-ready')?[]:particles){const y=(p.y-now*p.v*(active===3?.015:.08)+innerHeight*100)%innerHeight;ctx.beginPath();ctx.arc(p.x+pointer.x*.2,y,p.r,0,Math.PI*2);ctx.fillStyle=active===2?'rgba(45,89,114,.17)':'rgba(193,229,249,.35)';ctx.fill();}if(burst){const age=(now-burst.time)/1800;if(age>=1){burst=null;return;}for(let i=0;i<30;i++){const angle=i*2.39996,r=(15+(i%9)*8)*age*4;ctx.fillStyle=`rgba(201,241,255,${(1-age)*.75})`;ctx.beginPath();ctx.arc(burst.x+Math.cos(angle)*r,burst.y+Math.sin(angle)*r*.65,1+(i%3)*.5,0,Math.PI*2);ctx.fill();}}}
 function frame(now){raf=0;if(document.hidden)return;if(dirty||settling||now-entrance<2000)updateScenes(now);if(now-lastFrame>=32){lastFrame=now;paint(now);}if(holdStart){charge=clamp((now-holdStart)/950);set($('#connect-light'),'--charge',charge.toFixed(3));if(charge===1)connect();}if((!root.classList.contains('journey-ready')&&enabled())||holdStart||burst)raf=requestAnimationFrame(frame);}
 function schedule(){if(!raf&&!document.hidden)raf=requestAnimationFrame(frame);}
 function motion(){root.classList.toggle('motion-off',!enabled());button.setAttribute('aria-pressed',String(!enabled()));button.disabled=reduced.matches;$('.motion-icon').textContent=enabled()?'Ⅱ':'▷';$('.motion-label').textContent=reduced.matches?'端末設定により演出OFF':paused?'演出を再開':'演出を止める';ctx.clearRect(0,0,innerWidth,innerHeight);measure();}
 button.addEventListener('click',()=>{paused=!paused;motion();});reduced.addEventListener('change',motion);
 window.addEventListener('scroll',()=>{dirty=true;schedule();},{passive:true});let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(measure,120);});
 window.addEventListener('pointermove',e=>{if(!enabled()||mobile.matches)return;pointer={x:(e.clientX/innerWidth-.5)*16,y:(e.clientY/innerHeight-.5)*12};set(root,'--pointer-x',pointer.x+'px');set(root,'--pointer-y',pointer.y+'px');dirty=true;schedule();},{passive:true});
 document.addEventListener('visibilitychange',()=>{root.classList.toggle('page-hidden',document.hidden);if(document.hidden){cancelAnimationFrame(raf);raf=0;releaseHold();}else{dirty=true;schedule();}});
 // The light interaction is optional: core content and routes are always available.
 const light=$('#connect-light');
 function connect(){const wasConnected=connected;holdStart=0;charge=1;connected=true;$('#about').classList.add('connected');light.setAttribute('aria-pressed','true');set(light,'--charge','1');$('.e-light-label',light).innerHTML='つながった光 <span>✓</span>';$('#light-result').textContent='人と技術、今日と未来。ひとつの接続から。';document.dispatchEvent(new CustomEvent('avc:connect'));if(enabled()){const r=light.getBoundingClientRect();burst={time:performance.now(),x:r.left+r.width/2,y:r.top+r.height/2};if(wasConnected){const wave=$('.e-light-wave');wave.getAnimations().forEach(a=>{a.cancel();a.play();});}schedule();}}
 function releaseHold(){if(holdStart){holdStart=0;charge=connected?1:0;set(light,'--charge',charge);}}
 light.addEventListener('pointerdown',e=>{if(e.button!==0)return;holdStart=performance.now();light.setPointerCapture(e.pointerId);schedule();});
 light.addEventListener('pointerup',releaseHold);light.addEventListener('pointercancel',releaseHold);light.addEventListener('lostpointercapture',releaseHold);light.addEventListener('click',connect);
 // Standard keyboard activation triggers the same click; there is no hold-only path.
 const menuButton=$('.menu-toggle'),menu=$('#mobile-menu'),menuClose=$('.menu-close',menu);
 let menuClosing=false,menuAnimation=null;
 const menuReduced=()=>reduced.matches||root.classList.contains('motion-off');
 async function closeMenu(focus=true){
  if(!menu.open||menuClosing)return;menuClosing=true;
  const visible=getComputedStyle(menu),from={opacity:visible.opacity,transform:visible.transform};
  menuAnimation?.cancel();menu.classList.remove('is-open');
  menuAnimation=menu.animate([from,{opacity:0,transform:'translateY(-12px)'}],{duration:menuReduced()?0:720,easing:'cubic-bezier(.4,0,.2,1)',fill:'forwards'});
  try{await menuAnimation.finished;}catch{}
  menu.close();menuAnimation.cancel();menuClosing=false;document.body.classList.remove('menu-open');menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','メニューを開く');if(focus)menuButton.focus({preventScroll:true});
 }
 menuButton.addEventListener('click',()=>{
  if(menu.open)return;menu.showModal();document.body.classList.add('menu-open');menuButton.setAttribute('aria-expanded','true');
  menuAnimation=menu.animate([{opacity:0,transform:'translateY(-16px)'},{opacity:1,transform:'translateY(0)'}],{duration:menuReduced()?0:950,easing:'cubic-bezier(.22,1,.36,1)'});
  requestAnimationFrame(()=>menu.classList.add('is-open'));menuClose.focus({preventScroll:true});
 });
 menuClose.addEventListener('click',()=>closeMenu());menu.addEventListener('cancel',e=>{e.preventDefault();closeMenu();});
 $$('a',menu).forEach(a=>a.addEventListener('click',()=>closeMenu(false)));
 menu.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const items=[menuClose,...$$('a',menu)];if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}});
 mobile.addEventListener('change',measure);
 const topics={water:['01','接続部を、水や粉塵から守る。','IP規格と防水保護等級を確認。実際の使用条件での試験・評価も大切です。'],heat:['02','温度と材質の条件を照らし合わせる。','使用温度や油・薬品の影響を整理し、品番ごとの仕様と材料の物性を確認します。'],vibration:['03','正しい取付と固定を考える。','取付穴径、締め付けトルク、配線ルートを確認。振動などの使用環境に合わせて評価します。']};
 const tabs=$$('[data-topic]');function chooseTopic(tab,focus=false){const data=topics[tab.dataset.topic];$('#technology').dataset.topic=tab.dataset.topic;tabs.forEach(t=>{t.setAttribute('aria-selected',String(t===tab));t.tabIndex=t===tab?0:-1;});const panel=$('#tech-panel');panel.setAttribute('aria-labelledby',tab.id);$('.e-data-key',panel).textContent='CHECK / '+data[0];$('h3',panel).textContent=data[1];$('p',panel).textContent=data[2];if(focus)tab.focus();}
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>chooseTopic(tab));tab.addEventListener('keydown',e=>{let n;if(e.key==='ArrowRight')n=(i+1)%tabs.length;if(e.key==='ArrowLeft')n=(i-1+tabs.length)%tabs.length;if(e.key==='Home')n=0;if(e.key==='End')n=tabs.length-1;if(n!==undefined){e.preventDefault();chooseTopic(tabs[n],true);}});});
 const worlds={machine:{n:'01 / INDUSTRY',title:'止まらない日常を、\n足元から。',copy:'機械とケーブルの接続部を、取付と保守の視点から考える。',points:['ケーブルの外径と取付穴径を照合する','材質・ネジ規格を確認する','取付手順と締め付けトルクを確認する']},ev:{n:'02 / MOBILITY',title:'次の移動を、\nつなぐ接続。',copy:'EVや充電設備の環境を想定し、必要な規格と接続の条件を考える。',points:['想定する設備と使用環境を整理する','必要な規格・認証を個別に確認する','対象用途への適合はメーカーへ相談する']},energy:{n:'03 / ENERGY',title:'自然の力を、\n社会の力へ。',copy:'雨、粉塵、温度。屋外設備を取り巻く環境から、接続部の条件を整理する。',points:['雨・粉塵・温度などの環境条件を整理する','ケーブルと取付部の仕様を照合する','実際の設置条件で試験・評価する']},marine:{n:'04 / MARINE',title:'海とともに、\nつながり続ける。',copy:'水や塩分にさらされる場所で、材質・取付・保守の条件を考える。',points:['水・塩分・材質の条件を整理する','必要な規格と評価資料を確認する','設置と保守の条件をメーカーへ相談する']},space:{n:'05 / SPACE & COMMUNICATION',title:'見えない未来へ、\n接続を想う。',copy:'宇宙・通信は未来を描くコンセプト。求められる要件から、接続の可能性を考える。',points:['接続部に必要な要件を整理する','要求される規格と試験条件を確認する','具体的な用途は個別に相談する']}};
 function loadWorld(name){if(root.classList.contains('journey-ready'))return;const img=$('.world-'+name);if(img.dataset.src){img.srcset=img.dataset.srcset;delete img.dataset.srcset;img.src=img.dataset.src;delete img.dataset.src;}}const caseObserver=new IntersectionObserver(entries=>{if(!root.classList.contains('journey-ready')&&entries.some(e=>e.isIntersecting)){loadWorld('machine');loadWorld('ev');loadWorld('energy');caseObserver.disconnect();}},{rootMargin:'250px'});caseObserver.observe($('#cases'));document.addEventListener('avc:prepare-cases',()=>loadWorld('machine'));document.addEventListener('avc:scene',e=>{active=e.detail.index;if(active===4){loadWorld('machine');loadWorld('ev');loadWorld('energy');caseObserver.disconnect();}});let currentWorld='machine';document.addEventListener('avc:static-world',()=>{loadWorld(currentWorld);});const caseStage=$('#cases .e-stage');$$('.e-case-selector button').forEach(b=>b.addEventListener('click',()=>{currentWorld=b.dataset.world;loadWorld(currentWorld);const w=worlds[currentWorld];caseStage.dataset.world=currentWorld;$('.e-case-world').dataset.world=currentWorld;document.dispatchEvent(new CustomEvent('avc:world',{detail:{name:currentWorld}}));$$('.e-case-selector button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));$('#case-number').textContent=w.n;$('#case-title').replaceChildren(...w.title.split('\n').flatMap((s,i)=>i?[document.createElement('br'),document.createTextNode(s)]:[document.createTextNode(s)]));$('#case-copy').textContent=w.copy;}));
 const dialog=$('#case-dialog');$('#case-detail').addEventListener('click',()=>{const w=worlds[currentWorld];$('#case-dialog-title').textContent=w.title.replace('\n','');$('#case-dialog-copy').textContent=w.copy;$('#case-dialog-points').replaceChildren(...w.points.map(s=>{const li=document.createElement('li');li.textContent=s;return li;}));dialog.showModal();});$('.dialog-close',dialog).addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))dialog.close();});dialog.addEventListener('close',()=>$('#case-detail').focus());
 motion();window.addEventListener('load',measure,{once:true});document.fonts?.ready.then(measure);
})();
