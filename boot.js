/* V48: progress follows completed opening asset groups, never a time-based estimate. */
(() => {
 'use strict';
 const root=document.documentElement,overlay=document.querySelector('.boot-status'),count=document.querySelector('#boot-count');
 const complete=new Set();let shown=0,target=0,raf=0,last=0,finished=false,resolveFinish;
 const paint=now=>{
  const dt=Math.min(64,now-(last||now));last=now;
  shown=Math.min(target,shown+dt*.18);
  const value=Math.floor(shown);count.textContent=String(value).padStart(2,'0');overlay.dataset.progress=String(value);overlay.style.setProperty('--boot-progress',value/100);
  if(finished&&shown>=100){raf=0;root.classList.add('boot-revealing');resolveFinish?.();requestAnimationFrame(()=>requestAnimationFrame(()=>{root.classList.add('boot-complete');setTimeout(()=>root.classList.remove('boot-revealing','boot-complete'),750);}));return;}
  raf=requestAnimationFrame(paint);
 };
 window.AVCBoot={
  asset(index){complete.add(index);target=complete.size/5*95;},
  finish(){if(!root.classList.contains('journey-pending'))return Promise.resolve();finished=true;target=100;return new Promise(resolve=>{resolveFinish=resolve;});},
  cancel(){cancelAnimationFrame(raf);root.classList.remove('boot-revealing','boot-complete');resolveFinish?.();}
 };
 if(root.classList.contains('journey-pending'))raf=requestAnimationFrame(paint);
})();
