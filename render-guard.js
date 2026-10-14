/* Keep visible content readable if an entrance animation stops advancing. */
(() => {
  let timer;
  function recoverEntrance() {
    clearTimeout(timer);
    timer=setTimeout(() => {
      const gs=window.gsap;
      if(!gs)return;
      const elements=[...document.querySelectorAll('.hero .title-line,.hero .hero-english,.hero .hero-description,.hero .hero-paths,.guide,.reveal')].filter(element=>{
        const bounds=element.getBoundingClientRect();
        return bounds.bottom>0 && bounds.top<innerHeight;
      });
      const hidden=elements.filter(element=>{
        const style=getComputedStyle(element);
        return style.visibility==='hidden'||Number(style.opacity)<0.05;
      });
      // Finish only existing entrance tweens; floating and scroll motion remain intact.
      gs.getTweensOf(hidden).forEach(tween=>tween.progress(1));
      // Reverting an animation context can restore a hidden inline style without a tween.
      // Only restore opacity/visibility; keep the approved guide position and motion.
      hidden.forEach(element=>{
        const style=getComputedStyle(element);
        if(style.visibility==='hidden'||Number(style.opacity)<0.05)gs.set(element,{autoAlpha:1});
      });
    },2500);
  }
  document.addEventListener('DOMContentLoaded',recoverEntrance,{once:true});
  window.addEventListener('pageshow',event=>{if(event.persisted)recoverEntrance();});
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',recoverEntrance);
  document.getElementById('motion-toggle')?.addEventListener('click',recoverEntrance);
  window.addEventListener('resize',recoverEntrance,{passive:true});
  window.addEventListener('scroll',recoverEntrance,{passive:true});
  window.addEventListener('hashchange',recoverEntrance);
})();
