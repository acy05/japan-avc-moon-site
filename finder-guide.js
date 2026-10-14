/* The original approved image floats gently; no rig or action system. */
export function createFinderGuide(){
 const row=document.querySelector('.finder-guide-row'),button=document.querySelector('#finder-motion-toggle');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=false;
 function label(){const moving=!paused&&!reduced.matches&&!document.hidden;row.classList.toggle('guide-paused',!moving);document.documentElement.dataset.motionSetting=reduced.matches?'reduced':paused?'paused':'full';button.textContent=reduced.matches?'端末設定により演出OFF':paused?'動きを再開':'動きを止める';button.disabled=reduced.matches;button.setAttribute('aria-pressed',String(!moving));}
 button.addEventListener('click',()=>{paused=!paused;label();});reduced.addEventListener('change',label);document.addEventListener('visibilitychange',label);label();
 return {react(_emotion,phrase){document.querySelector('#finder-guide-phrase').textContent=phrase;}};
}
