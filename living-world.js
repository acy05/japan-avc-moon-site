/* Original artwork, continuously animated on the GPU. No per-frame downloads. */
(() => {
'use strict';
const vertex = `attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=vec2((aPosition.x+1.0)*.5,(1.0-aPosition.y)*.5);gl_Position=vec4(aPosition,0.,1.);}`;
const fragment = `precision highp float;
varying vec2 vUv;
uniform sampler2D uA,uB,uOld;
uniform vec4 uRectA,uRectB,uRectOld;
uniform vec2 uCover;
uniform float uBlend,uChange;
vec3 tex(sampler2D img,vec4 rect,vec2 uv){vec2 p=clamp(uv,vec2(.002),vec2(.998));return texture2D(img,rect.xy+p*rect.zw).rgb;}
void main(){vec2 uv=(vUv-.5)*uCover+.5;vec3 color=mix(tex(uA,uRectA,uv),tex(uB,uRectB,uv),uBlend);if(uChange>.001)color=mix(tex(uOld,uRectOld,uv),color,smoothstep(0.,1.,uChange));gl_FragColor=vec4(color,1.);}`;
class LivingWorld {
 constructor(canvas){
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
  if(!this.gl)throw Error('WebGL unavailable');const gl=this.gl;
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(this.program,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  this.uniforms={};for(const name of ['uA','uB','uOld','uRectA','uRectB','uRectOld','uCover','uResolution','uGuide','uBlend','uTime','uMotion','uWater','uCloud','uSky','uWorld','uGuideSize','uScene','uChange','uPortrait'])this.uniforms[name]=gl.getUniformLocation(this.program,name);
  this.packs=new Map();this.requests=new Map();this.singles=new Map();this.frameCount=0;this.last=null;this.variant='';this.lastTime=0;this.lost=false;this.retained=new Set(['world-machine']);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;document.dispatchEvent(new CustomEvent('avc:gpu-lost'));});
 }
 texture(image){const gl=this.gl,tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);return tex;}
 async pack(name){const key=this.variant+'/'+name;if(this.packs.has(key))return this.packs.get(key);if(this.requests.has(key))return this.requests.get(key);const variant=this.variant;const p=fetch('motion/'+key+'.webp?v=14').then(r=>{if(!r.ok)throw Error('Motion atlas '+r.status);return r.blob();}).then(b=>createImageBitmap(b)).then(im=>{if(this.variant!==variant){im.close();return null;}const pack={tex:this.texture(im),width:im.width,height:im.height,name};im.close();this.packs.set(key,pack);this.trim();return pack;}).finally(()=>this.requests.delete(key));this.requests.set(key,p);return p;}
 trim(){const worlds=[...this.packs].filter(([key])=>key.includes('world-'));const remove=worlds.filter(([key])=>!this.retained.has(key.split('/')[1]));while(worlds.length>2&&remove.length){const [key,p]=remove.shift();this.gl.deleteTexture(p.tex);this.packs.delete(key);worlds.pop();}}
 single(image,key){let item=this.singles.get(key);if(!item){item={tex:this.texture(image),width:image.width,height:image.height};this.singles.set(key,item);}else{this.singles.delete(key);this.singles.set(key,item);}while(this.singles.size>4){const [k,v]=this.singles.entries().next().value;this.gl.deleteTexture(v.tex);this.singles.delete(k);}return {...item,rect:[0,0,1,1]};}
 tile(name,index){const p=this.packs.get(this.variant+'/'+name);if(!p)return null;const w=this.variant==='sp'?384:768,h=this.variant==='sp'?680:432;const x=index%5,y=Math.floor(index/5);return {...p,width:w,height:h,rect:[(x*w+.5)/p.width,(y*h+.5)/p.height,(w-1)/p.width,(h-1)/p.height],key:name+':'+index};}
 main(position){const f=Math.max(0,Math.min(59,position/9.4*59)),n=Math.floor(f),n2=Math.min(59,n+1);return {a:this.tile(n<30?'main-a':'main-b',n%30),b:this.tile(n2<30?'main-a':'main-b',n2%30),blend:f-n};}
 world(name,position,exit=false){const f=Math.max(0,Math.min(11,position*11)),n=Math.floor(f),n2=Math.min(11,n+1),offset=exit?12:0;return {a:this.tile('world-'+name,n+offset),b:this.tile('world-'+name,n2+offset),blend:f-n};}
 worldIdle(name,clock){const f=clock*.16%1*6,n=Math.floor(f);return {a:this.tile('world-'+name,24+n),b:this.tile('world-'+name,24+(n+1)%6),blend:f-n};}
 setVariant(variant){if(variant===this.variant)return;for(const v of this.packs.values())this.gl.deleteTexture(v.tex);for(const v of this.singles.values())this.gl.deleteTexture(v.tex);this.packs.clear();this.singles.clear();this.last=null;this.variant=variant;}
 resize(width,height){this.canvas.width=width;this.canvas.height=height;this.gl.viewport(0,0,width,height);}
 render(frame,state){if(this.lost)return;const gl=this.gl;if(!frame?.a){frame=this.last;if(!frame?.a)return;}if(!frame.b)frame.b=frame.a;this.last=frame;const a=frame.a,b=frame.b,old=state.old?.a||a;
  for(const [i,item]of [a,b,old].entries()){gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,item.tex);}
  const u=this.uniforms;gl.uniform1i(u.uA,0);gl.uniform1i(u.uB,1);gl.uniform1i(u.uOld,2);gl.uniform4fv(u.uRectA,a.rect);gl.uniform4fv(u.uRectB,b.rect);gl.uniform4fv(u.uRectOld,old.rect);
  const source=a.width/a.height,target=this.canvas.width/this.canvas.height;gl.uniform2f(u.uCover,target<source?target/source:1,target>source?source/target:1);gl.uniform2f(u.uResolution,this.canvas.width,this.canvas.height);
  gl.uniform1f(u.uBlend,frame.blend||0);gl.uniform1f(u.uTime,state.clock);gl.uniform1f(u.uMotion,state.paused?0:1);gl.uniform1f(u.uWater,state.water);gl.uniform1f(u.uCloud,state.cloud);gl.uniform1f(u.uSky,state.sky);gl.uniform1f(u.uWorld,state.world);gl.uniform1f(u.uScene,state.scene);gl.uniform2fv(u.uGuide,state.guide);gl.uniform1f(u.uGuideSize,state.guideSize);gl.uniform1f(u.uChange,state.change||0);gl.uniform1f(u.uPortrait,this.variant==='sp'?1:0);gl.drawArrays(gl.TRIANGLES,0,6);
  this.canvas.dataset.frames=String(++this.frameCount);this.canvas.dataset.frame=state.key||a.key||'high-resolution';this.canvas.dataset.background='original-frames-no-overlay';this.canvas.dataset.gpuTextures=String(this.packs.size+this.singles.size);
 }
 clear(){for(const v of this.singles.values())this.gl.deleteTexture(v.tex);this.singles.clear();this.last=null;}
}
window.AVCLivingWorld=LivingWorld;
})();
