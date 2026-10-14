/* Scroll-based atmosphere. No guide image, position, float or trail is changed here. */
(() => {
 'use strict';
 const root=document.documentElement;
 const chapters=[...document.querySelectorAll('.chapter')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0;
 function update(){
  frame=0;
  const enabled=!reduced.matches&&!root.classList.contains('motion-off');
  const pageHeight=document.documentElement.scrollHeight-innerHeight;
  root.style.setProperty('--reading-progress',pageHeight>0?Math.min(1,Math.max(0,scrollY/pageHeight)):0);
  for(const chapter of chapters){
   const box=chapter.getBoundingClientRect();
   const progress=Math.min(1,Math.max(0,(innerHeight-box.top)/(innerHeight+box.height)));
   chapter.style.setProperty('--section-progress',enabled?Math.min(1,progress*2):1);
   chapter.style.setProperty('--light-position',enabled?`${15+progress*70}%`:'55%');
   chapter.style.setProperty('--diagram-scale',enabled?String(.9+progress*.2):'1');
  }
 }
 function schedule(){if(!frame&&!document.hidden)frame=requestAnimationFrame(update);}
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule,{passive:true});
 reduced.addEventListener('change',schedule);
 new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();});
 schedule();
})();
