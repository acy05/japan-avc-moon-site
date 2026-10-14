/* AVC guided world. All runtime assets are local; no analytics or external requests. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const root = document.documentElement;
  const osReduced = matchMedia('(prefers-reduced-motion: reduce)');
  const small = matchMedia('(max-width: 800px)');
  const gs = window.gsap;
  const ST = window.ScrollTrigger;
  const guide = $('.guide');
  const chapters = $$('.chapter');
  const motionButton = $('#motion-toggle');
  let userPaused = false;
  let entrancePlayed = false;
  let context;
  let animations = [];
  let activeChapter = 0;
  let idleTimer;
  let canvasRAF = 0;
  let particles = [];
  let trail = [];
  let target = {x: .77 * innerWidth, y: .56 * innerHeight};
  let guidePoint = {...target};
  let lastScroll = scrollY;
  let guideTilt = 0;
  const canvas = $('#atmosphere');
  const ctx = canvas?.getContext('2d', {alpha: true});
  const motionOn = () => !userPaused && !osReduced.matches && !!gs && !!ST;

  const menuButton = $('.menu-toggle');
  const menu = $('#mobile-menu');
  function closeMenu(returnFocus = false) {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'メニューを開く');
    document.body.classList.remove('menu-open');
    if (returnFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => {
    const opening = menu.hidden;
    menu.hidden = !opening;
    menuButton.setAttribute('aria-expanded', String(opening));
    menuButton.setAttribute('aria-label', opening ? 'メニューを閉じる' : 'メニューを開く');
    document.body.classList.toggle('menu-open', opening);
    if (opening) $('a', menu).focus();
  });
  $$('a', menu).forEach(a => a.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !menu.hidden) closeMenu(true);
    if (e.key === 'Tab' && !menu.hidden) {
      const links = $$('a', menu);
      if (e.shiftKey && document.activeElement === links[0]) { e.preventDefault(); menuButton.focus(); }
      else if (!e.shiftKey && document.activeElement === links.at(-1)) { e.preventDefault(); menuButton.focus(); }
      else if (document.activeElement === menuButton) { e.preventDefault(); (e.shiftKey ? links.at(-1) : links[0]).focus(); }
    }
  });
  matchMedia('(min-width: 801px)').addEventListener('change', e => { if (e.matches) closeMenu(); });

  // The diagram is explanatory. Content references existing official technical topics.
  const topics = {
    water:{n:'01',title:'接続部を、水や粉塵から守る。',copy:'IP規格と防水保護等級を確認。実際の使用条件での試験・評価も大切です。'},
    heat:{n:'02',title:'温度と材質の条件を照らし合わせる。',copy:'使用温度や油・薬品の影響を整理し、品番ごとの仕様と材料の物性を確認します。'},
    vibration:{n:'03',title:'正しい取付と固定を考える。',copy:'取付穴径、締め付けトルク、配線ルートを確認。振動などの使用環境に合わせて評価します。'},
    shield:{n:'04',title:'「守る」を、確かな根拠へ。',copy:'製品仕様に加えて、試験・評価や取付方法の資料を確認し、設計の判断につなぎます。'},
    leaf:{n:'05',title:'材料と使われる環境を知る。',copy:'材質・物性・必要な規格を製品ごとに確認し、設置環境に合う接続を考えます。'}
  };
  const tabs = $$('[data-topic]');
  function chooseTopic(tab, focus = false) {
    const item = topics[tab.dataset.topic];
    tabs.forEach(t => { const selected = t === tab; t.setAttribute('aria-selected', String(selected)); t.tabIndex = selected ? 0 : -1; });
    const panel = $('#tech-panel');
    panel.setAttribute('aria-labelledby', tab.id);
    $('.tech-number',panel).textContent = item.n;
    $('h3',panel).textContent = item.title;
    $('p',panel).textContent = item.copy;
    if (motionOn()) gs.fromTo(panel,{opacity:.35,y:6},{opacity:1,y:0,duration:.35,overwrite:true});
    if (focus) tab.focus();
  }
  tabs.forEach((tab,i) => {
    tab.addEventListener('click', () => chooseTopic(tab));
    tab.addEventListener('keydown', e => {
      let index;
      if(e.key==='ArrowRight') index=(i+1)%tabs.length;
      if(e.key==='ArrowLeft') index=(i-1+tabs.length)%tabs.length;
      if(e.key==='Home') index=0;
      if(e.key==='End') index=tabs.length-1;
      if(index !== undefined) { e.preventDefault(); chooseTopic(tabs[index],true); }
    });
  });
  const applicationConcepts = {
    machine:{title:'産業機器の、接続と保護。',copy:'機械とケーブルの接続部を、取付と保守の視点から考えます。',points:['ケーブルの外径と取付穴径を照合する','材質・ネジ規格を確認する','取付手順と締め付けトルクを確認する']},
    ev:{title:'次世代インフラの、接続を考える。',copy:'EVの画像は用途検討のイメージです。自動車・充電設備への適合や採用を表すものではありません。',points:['想定する設備と使用環境を整理する','必要な規格・認証を個別に確認する','対象用途への適合はメーカーへ相談する']},
    energy:{title:'自然と関わる、設備の接続。',copy:'屋外に設置する設備では、接続部がさらされる環境も設計の大切なポイントです。',points:['雨・粉塵・温度などの環境条件を整理する','ケーブルと取付部の仕様を照合する','実際の設置条件で試験・評価する']},
    marine:{title:'海の環境と、接続の条件。',copy:'船舶・海洋の画像は用途検討のイメージです。使用条件や必要な規格への適合は個別に確認します。',points:['水・塩分・材質の条件を整理する','必要な規格と評価資料を確認する','設置と保守の条件をメーカーへ相談する']},
    space:{title:'未来のつながりを、考える。',copy:'宇宙・通信の画像はブランドの可能性を表すコンセプトです。宇宙用途への適合や採用実績を示しません。',points:['接続部に必要な要件を整理する','要求される規格と試験条件を確認する','具体的な用途は個別に相談する']}
  };
  const dialog = $('#case-dialog');
  let dialogOpener;
  $$('[data-case]').forEach(button => button.addEventListener('click', () => {
    const data = applicationConcepts[button.dataset.case];
    $('#case-dialog-title').textContent=data.title;
    $('#case-dialog-copy').textContent=data.copy;
    $('#case-dialog-points').replaceChildren(...data.points.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    dialogOpener=button;
    dialog.showModal();
  }));
  $('.dialog-close',dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => {
    const r=dialog.getBoundingClientRect();
    if(e.target===dialog && (e.clientX<r.left || e.clientX>r.right || e.clientY<r.top || e.clientY>r.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => dialogOpener?.focus());

  function setChapter(index) {
    activeChapter = index;
    const section=chapters[index];
    $('.guide-bubble').textContent=section.dataset.guide;
    guide.classList.toggle('on-light',section.classList.contains('light-section'));
    guide.classList.toggle('docked',index>0);
    $$('.guide-anchor').forEach(el=>el.classList.toggle('active',section.contains(el)));
    $$('.chapter-nav a').forEach((a,i)=>{a.classList.toggle('active',i===index);if(i===index)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
  }
  function guideCoordinates(index) {
    const anchor=$('.guide-anchor',chapters[index]);
    const rect=anchor.getBoundingClientRect();
    return {x:rect.left+rect.width/2,y:rect.top+rect.height/2,size:rect.width};
  }
  
  function updatePosition() {
    let index=0;
    for(let i=0;i<chapters.length;i++) if(chapters[i].getBoundingClientRect().top<=innerHeight*.3) index=i;
    if(index!==activeChapter) setChapter(index);
    target=guideCoordinates(index);
    guide.style.width=target.size+'px';
    if(!motionOn()) {
      guide.style.opacity='1';guidePoint={...target};guide.style.left=target.x+'px';guide.style.top=target.y+'px';}
    $('.site-header').classList.toggle('scrolled',scrollY>55);
    const delta=scrollY-lastScroll;
    if(Math.abs(delta)>1 && motionOn()) {
      guideTilt=delta>0?-8:8;
      gs.to('.guide-figure',{rotation:delta<0?6:-6,duration:.65,ease:'power2.out',overwrite:true});
    }
    lastScroll=scrollY;
  }
  function resizeCanvas() {
    if(!ctx)return;
    const dpr=Math.min(devicePixelRatio,small.matches?1.25:1.5);
    canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    // Fewer particles for mobile and low-memory devices.
    const count=small.matches||navigator.deviceMemory<=4?22:55;
    particles=Array.from({length:count},()=>({x:Math.random()*innerWidth,y:Math.random()*innerHeight,r:Math.random()*.9+.35,v:Math.random()*.13+.03,a:Math.random()*.4+.1,phase:Math.random()*6.3}));
    trail=[];
    updatePosition();
    guidePoint={...target};
    guide.style.left=target.x+'px';guide.style.top=target.y+'px';
  }
  let previousFrame=0;
  function draw(time) {
    canvasRAF=0;
    if(!motionOn() || document.hidden || !ctx) return;
    canvasRAF=requestAnimationFrame(draw);
    // Cap at approximately 30 fps. Animation is decorative; input remains browser native.
    if(time-previousFrame<32)return;
    previousFrame=time;
    ctx.clearRect(0,0,innerWidth,innerHeight);
    const dt=Math.min(2,(time-(draw.lastTime||time))/33);draw.lastTime=time;
    guidePoint.x+=(target.x-guidePoint.x)*.085*dt;
    guidePoint.y+=(target.y-guidePoint.y)*.085*dt;
    guide.style.left=guidePoint.x+'px';guide.style.top=guidePoint.y+'px';
    guideTilt*=.93;
    // The separate float wrapper lets the sprite turn without fighting its floating motion.
    const light=chapters[activeChapter].classList.contains('light-section');
    for(const p of particles) {
      p.y-=p.v*dt;if(p.y<-5){p.y=innerHeight+5;p.x=Math.random()*innerWidth;}
      ctx.fillStyle=light?`rgba(38,105,139,${p.a*.3})`:`rgba(177,220,248,${p.a*(.7+.3*Math.sin(time*.0007+p.phase))})`;
      ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
    }
    const moving=Math.hypot(target.x-guidePoint.x,target.y-guidePoint.y)>2;
    if(moving)trail.push({x:guidePoint.x,y:guidePoint.y+32,life:1});
    trail=trail.filter(p=>(p.life-=.022*dt)>0).slice(-42);
    if(trail.length>1){
      for(let i=1;i<trail.length;i++){
        ctx.strokeStyle=light?`rgba(53,135,171,${trail[i].life*.17})`:`rgba(181,228,255,${trail[i].life*.4})`;
        ctx.lineWidth=trail[i].life*1.5;ctx.beginPath();ctx.moveTo(trail[i-1].x,trail[i-1].y);ctx.lineTo(trail[i].x,trail[i].y);ctx.stroke();
      }
    }
  }
  function startCanvas() { cancelAnimationFrame(canvasRAF); if(motionOn()&&!document.hidden)canvasRAF=requestAnimationFrame(draw); }
  function restartMotion() {
    context?.revert();
    // ScrollTrigger can instantiate deferred from-tweens after a context is created.
    // This page owns all triggers; explicitly dispose them on every motion reset.
    ST?.getAll().forEach(trigger=>trigger.kill());
    animations.forEach(a=>a.kill());animations=[];
    gs?.killTweensOf('.chapter-light,.reveal,.title-line,.hero-english,.hero-description,.hero-paths,.world-image,.mist-one,.world-window,.about-view,.chapter-world,.scene-path,.ring-b,.product-art img,.orbit-two,.final-world,.guide,.guide-float,.guide-figure,.tech-panel');
    ST?.getAll().forEach(trigger=>trigger.kill());
    cancelAnimationFrame(canvasRAF);canvasRAF=0;
    trail=[];
    ctx?.clearRect(0,0,innerWidth,innerHeight);
    root.classList.toggle('motion-off',!motionOn());
    motionButton.setAttribute('aria-pressed',String(!motionOn()));
    motionButton.disabled=osReduced.matches || !gs || !ST;
    $('.motion-icon').textContent=motionOn()?'Ⅱ':'▷';
    $('.motion-label').textContent=osReduced.matches?'端末設定により演出OFF':!gs||!ST?'演出OFF':userPaused?'演出を再開':'演出を止める';
    if(!motionOn()) {
      guide.style.opacity='1';
      if(gs) gs.set('.reveal,.title-line,.hero-english,.hero-description,.hero-paths',{autoAlpha:1,y:0,clearProps:'transform'});
      guide.style.opacity='1';updatePosition();return;
    }
    gs.registerPlugin(ST);
    context=gs.context(()=>{
      $$('.reveal').filter(el=>!el.matches('.product-path,.case-card')&&el.getBoundingClientRect().top>innerHeight).forEach(el=>{
        // Only hide content once the animation engine is ready. No-JS remains readable.
        gs.from(el,{autoAlpha:0,y:small.matches?16:28,duration:.9,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 92%',once:true}});
      });
      ['.product-paths','.case-grid'].forEach(selector=>{
        const group=$(selector);
        const items=$$('.reveal',group).filter(el=>el.getBoundingClientRect().top>innerHeight);
        if(items.length) gs.from(items,{autoAlpha:0,y:small.matches?12:22,stagger:small.matches?.045:.09,duration:.75,ease:'power2.out',scrollTrigger:{trigger:group,start:'top 90%',once:true}});
      });
      $$('.chapter-light').forEach(light=>{
        gs.timeline({scrollTrigger:{trigger:light.closest('.chapter'),start:'top bottom',end:'bottom top',scrub:1}})
          .fromTo(light,{xPercent:-8,opacity:.12},{xPercent:0,opacity:.65,duration:1,ease:'none'})
          .to(light,{xPercent:8,opacity:.12,duration:1,ease:'none'});
      });
      if(!entrancePlayed){
      gs.from('.title-line',{y:24,autoAlpha:0,stagger:.16,duration:1.15,ease:'power3.out',delay:.15});
      gs.from('.hero-english,.hero-description,.hero-paths',{y:12,autoAlpha:0,duration:1,stagger:.12,delay:.3});
      gs.from(guide,{scale:.28,autoAlpha:0,duration:1.7,ease:'power2.out',delay:.6});
        entrancePlayed=true;
      }
      gs.to('.world-image',{yPercent:small.matches?8:14,scale:1.06,ease:'none',scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:1}});
      gs.to('.mist-one',{xPercent:12,yPercent:-15,ease:'none',scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:1.5}});
      gs.to('.about-view',{yPercent:-8,scale:1.10,ease:'none',scrollTrigger:{trigger:'#about',start:'top bottom',end:'bottom top',scrub:1.2}});
      gs.to('#technology .chapter-world',{yPercent:-5,ease:'none',scrollTrigger:{trigger:'#technology',start:'top bottom',end:'bottom top',scrub:1.5}});
      gs.from('.scene-path',{scaleX:.15,opacity:0,transformOrigin:'left center',scrollTrigger:{trigger:'#about',start:'top 65%',end:'top 15%',scrub:1}});
      gs.from('.ring-b',{rotation:55,opacity:.2,scrollTrigger:{trigger:'#technology',start:'top 70%',end:'top 5%',scrub:1}});
      gs.to('.product-art img',{rotation:5,y:-12,ease:'none',scrollTrigger:{trigger:'#products',start:'top bottom',end:'bottom top',scrub:1.2}});
      gs.to('.orbit-two',{rotation:35,ease:'none',scrollTrigger:{trigger:'#products',start:'top bottom',end:'bottom top',scrub:1}});
      gs.to('.final-world',{yPercent:6,ease:'none',scrollTrigger:{trigger:'#contact',start:'top bottom',end:'bottom bottom',scrub:1}});
      animations.push(gs.to('.guide-float',{y:-7,rotation:2,duration:2.5,yoyo:true,repeat:-1,ease:'sine.inOut'}));
    });
    updatePosition();startCanvas();
  }
  motionButton.addEventListener('click',()=>{userPaused=!userPaused;restartMotion();});
  osReduced.addEventListener('change',restartMotion);
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{resizeCanvas();restartMotion();},160);});
  window.addEventListener('scroll',updatePosition,{passive:true});
  function resetIdle(){guide.classList.remove('resting');clearTimeout(idleTimer);if(motionOn())idleTimer=setTimeout(()=>guide.classList.add('resting'),14000);}
  ['pointermove','keydown','scroll'].forEach(event=>window.addEventListener(event,resetIdle,{passive:true}));
  document.addEventListener('visibilitychange',()=>{
    root.classList.toggle('page-hidden',document.hidden);
    animations.forEach(a=>document.hidden?a.pause():a.resume());
    if(document.hidden){cancelAnimationFrame(canvasRAF);canvasRAF=0;}else startCanvas();
  });
  // Gentle look toward the next action, desktop only.
  $$('.path,.pill-link,.button,.product-path,.case-card').forEach(link=>{
    link.addEventListener('pointerenter',()=>{if(motionOn()&&!small.matches)gs.to('.guide-figure',{rotation:-8,duration:.4,overwrite:true});});
    link.addEventListener('pointerleave',()=>{if(motionOn())gs.to('.guide-figure',{rotation:0,duration:.4,overwrite:true});});
  });
  $('.pill-link[href="#about-story"]').addEventListener('click',e=>{
    e.preventDefault();const story=$('#about-story');story.open=!story.open;
    if(story.open)story.scrollIntoView({behavior:motionOn()?'smooth':'auto',block:'center'});
  });
  $('#experience-replay').addEventListener('click',()=>{
    if(!motionOn()){location.hash='about';return;}
    window.scrollTo({top:0,behavior:'smooth'});
    gs.timeline().fromTo('.world-image',{scale:1.035},{scale:1,duration:2.8,ease:'power2.out'}).fromTo('.guide-float',{x:75,y:-50,scale:.55},{x:0,y:0,scale:1,duration:1.6,ease:'power2.out'},0);
  });
  resizeCanvas();setChapter(0);restartMotion();resetIdle();
  window.addEventListener('load',()=>ST?.refresh(),{once:true});
})();
