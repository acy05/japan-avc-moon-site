/* Native decoded background films. No wave deformation or lighting overlays. */
(() => {
 'use strict';
 class BackgroundVideos {
  constructor(view) {
   this.view=view;this.nodes=new Map();this.clips={};this.active=null;this.variant='';
   this.layer=document.createElement('div');this.layer.className='background-films';this.layer.setAttribute('aria-hidden','true');view.append(this.layer);
   this.ready=fetch('media/backgrounds.json?v=15').then(r=>{if(!r.ok)throw Error('Background manifest');return r.json()}).then(m=>{this.clips=m.clips||{};this.layer.dataset.manifest=m.status;document.dispatchEvent(new Event('avc:background-ready'));}).catch(()=>this.layer.dataset.manifest='unavailable');
   document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const item of this.nodes.values())item.video.pause();});
  }
  ensure(key,variant) {
   const id=variant+'/'+key,clip=this.clips[id];if(!clip?.src)return null;
   if(this.nodes.has(id))return this.nodes.get(id);
   const node=document.createElement('div');node.className='background-film';node.dataset.clip=id;
   const video=document.createElement('video');video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.preload='auto';video.setAttribute('playsinline','');video.src=clip.src;video.setAttribute('aria-hidden','true');
   const image=document.createElement('img');image.className='background-film-foreground';image.alt='';image.decoding='async';image.src=clip.foreground;
   node.append(video,image);this.layer.append(node);
   const item={id,node,video,image,ready:false};this.nodes.set(id,item);
   const mark=()=>{item.ready=video.readyState>=2&&image.complete&&image.naturalWidth>0;node.dataset.ready=String(item.ready);document.dispatchEvent(new Event('avc:background-ready'));};video.addEventListener('loadeddata',mark);image.addEventListener('load',mark);video.addEventListener('error',()=>{node.dataset.failed='true';item.ready=false;document.dispatchEvent(new Event('avc:background-ready'));});
   if(video.requestVideoFrameCallback){let previous=0;const frame=(now,metadata)=>{node.dataset.mediaTime=metadata.mediaTime.toFixed(3);node.dataset.presentedFrames=String(metadata.presentedFrames);node.dataset.frameDelta=previous?(metadata.mediaTime-previous).toFixed(4):'0';previous=metadata.mediaTime;video.requestVideoFrameCallback(frame);};video.requestVideoFrameCallback(frame);}
   while(this.nodes.size>2){const entry=[...this.nodes].find(([k,v])=>v!==this.active&&k!==id);if(!entry)break;const [k,v]=entry;v.video.pause();v.video.removeAttribute('src');v.video.load();v.node.remove();this.nodes.delete(k);}
   return item;
  }
  update(state) {
   const variant=matchMedia('(max-width:800px)').matches?'sp':'pc';
   if(variant!==this.variant){for(const x of this.nodes.values()){x.video.pause();x.video.removeAttribute('src');x.video.load();x.node.remove();}this.nodes.clear();this.active=null;this.variant=variant;}
   const names=['hero','about','products','technology',state.world,'contact'],anchors=[.36,1.6,3.25,4.8,6.6,8.6];
   const key=names[state.active],wanted=key?this.ensure(key,variant):null;
   // Film and source sequence share the exact exported camera pose. Move back
   // to the scroll sequence while the camera passes between those poses.
   const settled=!state.arrival&&!state.worldAnimating&&!state.held&&Math.abs(state.t-anchors[state.active])<.055;
   const selected=settled&&wanted?.ready?wanted:null;
   for(const item of this.nodes.values()){
    const shown=item===selected;item.node.classList.toggle('is-active',shown);
    if(shown&&!state.paused&&!document.hidden){if(item.video.paused)item.video.play().catch(()=>{item.node.classList.remove('is-active');item.node.dataset.autoplay='blocked';});}
    else item.video.pause();
   }
   this.active=selected;this.layer.dataset.active=selected?.id||'sequence';this.layer.dataset.paused=String(state.paused);
   if(!state.paused)this.layer.style.setProperty('--guide-y',Math.sin(state.clock)*2+'px');
  }
  pause(){for(const item of this.nodes.values())item.video.pause();this.layer.dataset.active='sequence';for(const item of this.nodes.values())item.node.classList.remove('is-active');}
 }
 window.AVCBackgroundVideos=BackgroundVideos;
})();
