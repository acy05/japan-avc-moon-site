/* V41 — original blue / gold world, real water reflections and world-space clouds.
   One displaced lunar globe, one material, one continuous camera path.
   NASA SVS / LROC + LOLA maps. No backdrop zoom, terrain replacement or crossfade. */
(() => {
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
 const settle=v=>{v=clamp(v);return v*v*v*(v*(v*6-15)+10)};
 const norm=v=>{const l=Math.hypot(...v);return v.map(x=>x/l)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],sub=(a,b)=>a.map((x,i)=>x-b[i]);
 // Hermite segments share a nonzero speed at the middle of the journey.
 const travelAlong=t=>{if(t<=1.6)return 0;if(t>=8.6)return 1.42;const second=t>5.5,d=second?3.1:3.9,x=clamp((t-(second?5.5:1.6))/d),a=second?1:0,b=second?1.42:1,m0=second?.20:0,m1=second?0:.20;return (2*x*x*x-3*x*x+1)*a+(x*x*x-2*x*x+x)*d*m0+(-2*x*x*x+3*x*x)*b+(x*x*x-x*x)*d*m1;};
 const point=(lon,lat,r)=>[Math.cos(lat)*Math.sin(lon)*r,Math.sin(lat)*r,Math.cos(lat)*Math.cos(lon)*r];
 class AVCMoonFlight{
 constructor(view){
  this.canvas=document.createElement('canvas');this.canvas.id='moon-flight';this.canvas.setAttribute('aria-hidden','true');view.prepend(this.canvas);
  const g=this.gl=this.canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});if(!g)throw Error('WebGL unavailable');
  const compile=(type,src)=>{let s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s};
  const program=(v,f)=>{let p=g.createProgram();g.attachShader(p,compile(g.VERTEX_SHADER,v));g.attachShader(p,compile(g.FRAGMENT_SHADER,f));g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));return {p,loc:{},attr:{}}};
  const common=`precision highp float;uniform sampler2D albedo,detailMap,cloudMap,groundColor,groundNormal;uniform vec3 camera,right,up,forward;uniform float aspect,shiftX,shiftY,time,immersion,atmosphere;const vec3 SUN=vec3(-.93,.29,-.22);float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}vec2 moonUV(vec3 n){return vec2(atan(n.x,n.z)/6.2831853+.5,asin(clamp(n.y,-1.,1.))/3.14159265+.5);}vec2 groundUV(vec2 uv){return (uv-vec2(.39,.24))/vec2(.16,.40);}
float groundWeight(vec2 uv){vec2 p=groundUV(uv);return smoothstep(0.,.045,p.x)*smoothstep(0.,.045,p.y)*(1.-smoothstep(.955,1.,p.x))*(1.-smoothstep(.955,1.,p.y))*immersion;}
vec3 shade(vec3 n,vec2 uv){vec2 local=(uv-vec2(.36,.18))/vec2(.22,.29);float inside=smoothstep(0.,.04,local.x)*smoothstep(0.,.04,local.y)*(1.-smoothstep(.96,1.,local.x))*(1.-smoothstep(.96,1.,local.y));vec3 tex=pow(mix(texture2D(albedo,uv).rgb,texture2D(detailMap,clamp(local,0.,1.)).rgb,inside),vec3(.8));tex=mix(tex,pow(texture2D(groundColor,clamp(groundUV(uv),0.,1.)).rgb,vec3(.8)),groundWeight(uv));float diffuse=max(dot(n,SUN),0.);return tex*vec3(.22,.48,.87)*(.42+diffuse*1.7)+tex*vec3(.36,.27,.13)*pow(diffuse,5.);}`;
  const lunar=`
   const vec3 LN=vec3(-.1542544,-.6051864,.7809962);
   const vec3 LT=vec3(-.1172649,.7960838,.5937167);
   const vec3 LR=vec3(.9810477,0.,.1937665);
   vec3 lunarLight(){return normalize(LT+LR*.52+LN*.2);}
   vec3 airColor(vec3 ray){float horizon=exp(-abs(dot(ray,LN)+.06)*3.5);float glow=pow(max(0.,dot(ray,lunarLight())),22.);return vec3(.025,.068,.14)+vec3(.075,.16,.27)*horizon+vec3(.38,.25,.105)*glow;}
  `;
  const world=`
   const vec3 CLOUD_RIGHT=vec3(.929,0.,.370);
   const vec3 CLOUD_NORMAL=vec3(-.370,0.,.929);
   vec3 cloudCenter(float layer){return mix(vec3(-8.,23.,-85.),vec3(-8.,-1.,30.),layer);}
   vec2 cloudSize(float layer){return mix(vec2(300.,100.),vec2(180.,52.),layer);}
   vec4 cloudSample(vec2 st,float layer){float edge=smoothstep(0.,.035,st.x)*(1.-smoothstep(.965,1.,st.x));vec4 c=texture2D(cloudMap,clamp(st,0.,1.));c.rgb*=vec3(.87,.90,1.02);c.rgb+=pow(max(c.r,max(c.g,c.b)),4.)*vec3(.26,.10,.0);c.rgb+=vec3(.98,.60,.25)*exp(-pow((st.x-.49)*8.,2.)-pow(st.y*5.,2.));c.a*=edge*smoothstep(0.,.055,st.y)*(1.-smoothstep(.88,1.,st.y));return c;}
   vec4 cloudRay(vec3 origin,vec3 ray,float layer,float limit){vec3 center=cloudCenter(layer);float d=dot(center-origin,CLOUD_NORMAL)/dot(ray,CLOUD_NORMAL);if(d<0.||d>limit)return vec4(0.);vec3 hit=origin+ray*d-center;vec2 st=vec2(dot(hit,CLOUD_RIGHT),hit.y)/cloudSize(layer)+.5;st.x+=sin(time*.075+layer)*.002;return cloudSample(st,layer);}
   vec3 skyColor(vec3 d){float horizon=exp(-abs(d.y)*9.);vec3 lightDir=normalize(vec3(.3,.02,-1.));float glow=pow(max(0.,dot(d,lightDir)),36.);float dust=pow(max(0.,1.-abs(d.x*.7+d.y*.5+.12)),18.);float stars=step(.9984,hash(floor(d*850.)))*(.18+.3*hash(floor(d*900.)));return vec3(.014,.039,.088)+vec3(.027,.075,.14)*dust+vec3(.035,.075,.12)*horizon+vec3(.9,.62,.30)*glow*horizon+stars*vec3(.55,.7,1.);}
   vec3 reflectedWorld(vec3 origin,vec3 ray){vec3 col=skyColor(ray);float b=dot(origin,ray),det=b*b-dot(origin,origin)+900.,limit=10000.;if(det>0.){float d=-b-sqrt(det);if(d>0.){vec3 n=normalize(origin+ray*d);col=shade(n,moonUV(n));limit=d;}}vec4 farCloud=cloudRay(origin,ray,0.,limit);col=mix(col,farCloud.rgb,farCloud.a);vec4 nearCloud=cloudRay(origin,ray,1.,limit);return mix(col,nearCloud.rgb,nearCloud.a);}
  `;
  const water=`
   // Directional height spectrum, dispersion-linked phase and analytic derivatives.
   // See GPU Gems 1, chapter 1. A gentle second harmonic sharpens broad wave crests.
   vec3 wave(vec2 p,vec2 dir,float wavelength,float amplitude,float phase,float distanceToEye){
    float k=6.2831853/wavelength;float omega=sqrt(2.4*k);float a=amplitude*(1.-smoothstep(wavelength*70.,wavelength*260.,distanceToEye));
    float v=dot(p,dir)*k-omega*time+phase;float height=a*(sin(v)+.14*sin(2.*v));float slope=a*k*(cos(v)+.28*cos(2.*v));return vec3(height,dir*slope);
   }
   vec3 sea(vec2 p,float d){vec3 v=wave(p,normalize(vec2(.28,.96)),12.7,.115,.4,d);
    v+=wave(p,normalize(vec2(-.18,.98)),7.3,.062,2.1,d);
    v+=wave(p,normalize(vec2(.58,.82)),4.1,.031,4.7,d);
    v+=wave(p,normalize(vec2(-.52,.85)),2.05,.012,1.3,d);
    v+=wave(p,normalize(vec2(.75,.66)),.93,.0046,5.2,d);
    v+=wave(p,normalize(vec2(-.36,.93)),.41,.0017,3.4,d);
    return v;
   }
`;
  this.sky=program(`attribute vec2 pos;varying vec2 uv;void main(){uv=pos;gl_Position=vec4(pos,1.,1.);}`,`${common}${world}${lunar}${water}varying vec2 uv;
   void main(){vec3 ray=normalize(forward+(uv.x-shiftX)*.52*aspect*right+(uv.y-shiftY)*.52*up);vec3 col=skyColor(ray);float closest=length(cross(camera,ray));float ahead=smoothstep(-3.,3.,-dot(camera,ray));float halo=exp(-abs(closest-30.15)*1.15)*ahead;col+=vec3(.12,.30,.60)*halo*.55;
    // Intersect the moving height field, then reflect from that same surface normal.
    float waterDistance=(-27.-camera.y)/ray.y;
    if(ray.y<-.002&&waterDistance>0.){
     vec3 hit=camera+ray*waterDistance;
     for(int i=0;i<2;i++){vec3 h=sea(hit.xz,waterDistance);waterDistance=(-27.+h.x-camera.y)/ray.y;hit=camera+ray*waterDistance;}
     vec3 h=sea(hit.xz,waterDistance);vec3 wn=normalize(vec3(-h.y,1.,-h.z));vec3 ref=reflect(ray,wn);vec3 wc=reflectedWorld(hit,ref);
     float fresnel=.025+.975*pow(1.-max(dot(-ray,wn),0.),5.);float sheen=pow(max(0.,dot(ref,normalize(vec3(.3,.02,-1.)))),110.);
     col=wc*vec3(.72,.85,.99)*fresnel+vec3(.012,.033,.065)*(1.-fresnel)+vec3(.42,.28,.12)*sheen;
     // Distant water meets the same sky continuously at the grazing horizon.
     col=mix(col,skyColor(ray),smoothstep(350.,1800.,waterDistance));
    }
    col+=airColor(ray)*atmosphere*.62;
    gl_FragColor=vec4(col,1.);
   }`);
  this.clouds=program(`precision highp float;attribute vec2 pos;uniform vec3 camera,right,up,forward;uniform float aspect,shiftX,shiftY,layer;uniform sampler2D cloudMap;uniform vec3 referenceCamera;varying vec2 uv;varying vec3 cloudWorld;void main(){uv=pos*.5+.5;vec3 center=mix(vec3(-8.,23.,-85.),vec3(-8.,-1.,30.),layer);vec2 size=mix(vec2(300.,100.),vec2(180.,52.),layer);vec3 world=center+vec3(.929,0.,.370)*pos.x*size.x*.5+vec3(0.,pos.y*size.y*.5,0.);vec3 detail=(texture2D(cloudMap,uv+vec2(.008,0.)).rgb+texture2D(cloudMap,uv-vec2(.008,0.)).rgb+texture2D(cloudMap,uv+vec2(0.,.024)).rgb+texture2D(cloudMap,uv-vec2(0.,.024)).rgb)*.25;float relief=(.30+dot(detail,vec3(.25,.45,.3))*.70)*mix(3.,4.5,layer);world-=normalize(world-referenceCamera)*relief;cloudWorld=world;vec3 p=world-camera;float z=dot(p,forward);gl_Position=vec4(dot(p,right)/(.52*aspect)+shiftX*z,dot(p,up)/.52+shiftY*z,1.00002*z-.0200002,z);}`,`${common}${world}uniform float layer;varying vec2 uv;varying vec3 cloudWorld;void main(){vec4 col=cloudSample(uv+vec2(sin(time*.075+layer)*.002,0.),layer);col.a*=smoothstep(4.,26.,dot(camera-cloudCenter(layer),CLOUD_NORMAL))*smoothstep(8.,30.,length(camera-cloudWorld));col.a*=1.-smoothstep(.72,1.,immersion);gl_FragColor=col;}`);
  this.moon=program(`precision highp float;attribute vec3 pos,normal;attribute vec2 texcoord;uniform vec3 camera,right,up,forward;uniform float aspect,shiftX,shiftY;varying vec3 world,norm;varying vec2 uv;void main(){world=pos;norm=normal;uv=texcoord;vec3 p=pos-camera;float z=dot(p,forward);gl_Position=vec4(dot(p,right)/(.52*aspect)+shiftX*z,dot(p,up)/.52+shiftY*z,1.00002*z-.0200002,z);}`,`${common}${lunar}varying vec3 world,norm;varying vec2 uv;
   float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+1.),f.x),f.y),f.z);}
   void main(){if(world.y< -27.)discard;vec3 n=normalize(mix(normalize(norm),normalize(texture2D(groundNormal,clamp(groundUV(uv),0.,1.)).rgb*2.-1.),groundWeight(uv)));float grain;if(immersion<.98){grain=noise(world*110.)*.6+noise(world*237.)*.4;float close=1.-smoothstep(3.,14.,length(camera-world));float bump=noise(world*20.);vec3 grad=vec3(noise(world*20.+vec3(.07,0,0)),noise(world*20.+vec3(0,.07,0)),noise(world*20.+vec3(0,0,.07)))-bump;n=normalize(n+grad*close*mix(1.5,.32,immersion));}else{grain=.45+.10*texture2D(detailMap,uv*vec2(32.,16.)).r;}vec3 col=shade(n,uv);col*=.78+grain*.4;float rim=pow(1.-max(dot(n,normalize(camera-world)),0.),4.);col+=mix(vec3(.12,.30,.60),vec3(1.,.78,.47),smoothstep(0.,.45,dot(n,SUN)))*rim*1.05;float distanceFog=(1.-exp(-length(camera-world)*.065))*immersion;col=mix(col,airColor(normalize(world-camera)),distanceFog*.7);gl_FragColor=vec4(col,1.);}`);
  // Cloud banks belong to the lunar world: they remain beyond the curved terrain.
  this.lunarClouds=program(`precision highp float;attribute vec2 pos;uniform vec3 camera,right,up,forward;uniform float aspect,shiftX,shiftY,bank;varying vec2 uv;varying float distanceToCloud;varying float bankDepth;${lunar}void main(){uv=pos*.5+.5;float spread=clamp(aspect/1.6,.28,1.);vec3 center=LN*mix(26.,29.,bank)+LT*mix(34.,15.,bank)+LR*mix(-18.*(1.-spread),-29.+8.*(1.-spread),bank);vec2 size=mix(vec2(65.,34.),vec2(42.,20.),bank);if(bank>1.5&&bank<2.5){center=LN*30.+LT*9.+LR*18.;size=vec2(29.,12.);}else if(bank>2.5&&bank<3.5){center=LN*27.+LT*21.-LR*20.;size=vec2(35.,16.);}else if(bank>3.5){center=LN*24.+LT*33.+LR*20.;size=vec2(40.,20.);}vec3 world=center+LR*pos.x*size.x*.5+LN*pos.y*size.y*.5;vec3 p=world-camera;distanceToCloud=length(p);bankDepth=dot(center-camera,LT);float z=dot(p,forward);gl_Position=vec4(dot(p,right)/(.52*aspect)+shiftX*z,dot(p,up)/.52+shiftY*z,1.00002*z-.0200002,z);}`,`${common}${lunar}uniform float bank;varying vec2 uv;varying float distanceToCloud;varying float bankDepth;void main(){vec2 st=uv+vec2(sin(time*.035+bank*2.)*.007,cos(time*.023+bank)*.003);vec4 c=texture2D(cloudMap,clamp(st,0.,1.));float edge=smoothstep(0.,.07,st.x)*(1.-smoothstep(.93,1.,st.x))*smoothstep(0.,.12,st.y)*(1.-smoothstep(.84,1.,st.y));float light=exp(-pow((st.x-.72)*5.,2.)-pow((st.y-.25)*3.,2.));c.rgb=c.rgb*vec3(.87,.90,1.02)+vec3(.20,.13,.055)*light;c.a*=edge*atmosphere*(bank<.5?.92:bank<1.5?.42:.70)*smoothstep(2.,9.,distanceToCloud)*smoothstep(1.,6.,bankDepth);gl_FragColor=c;}`);

  // True local cloud volumes: sample density and optical depth along the view ray.
  // The opening artwork remains untouched; nearby clouds have no image-facing surface.
  this.cumulus=program(`attribute vec2 pos;varying vec2 screen;void main(){screen=pos;gl_Position=vec4(pos,0.,1.);}`,`${common}
   uniform sampler2D cloudVolume;uniform vec3 cloudCenter,cloudRight,cloudUp,cloudForward,cloudScale;uniform float passage,cloudSide,cloudSteps,cloudMist;uniform vec3 cloudFlow;varying vec2 screen;
   vec3 volume(vec3 p){p+=cloudFlow*vec3(p.y*p.z+.25,p.x*p.z+.25,p.x*p.y+.25);vec3 uv=clamp(p*.5+.5,0.,1.);float z=uv.z*191.;float a=floor(z),b=min(191.,a+1.);vec2 xy=uv.xy*191.+1.5;
    vec2 sa=(vec2(mod(a,16.),floor(a/16.))*194.+xy)/vec2(3104.,2328.);vec2 sb=(vec2(mod(b,16.),floor(b/16.))*194.+xy)/vec2(3104.,2328.);return mix(texture2D(cloudVolume,sa).rgb,texture2D(cloudVolume,sb).rgb,fract(z));}
   void main(){vec3 ray=normalize(forward+(screen.x-shiftX)*.52*aspect*right+(screen.y-shiftY)*.52*up);vec3 delta=camera-cloudCenter;
    vec3 ro=vec3(dot(delta,cloudRight),dot(delta,cloudUp),dot(delta,cloudForward))/cloudScale;
    vec3 rd=vec3(dot(ray,cloudRight),dot(ray,cloudUp),dot(ray,cloudForward))/cloudScale;
    vec3 inv=1./(sign(rd)*max(abs(rd),vec3(.00001)));vec3 a=(-1.-ro)*inv,b=(1.-ro)*inv;vec3 lo=min(a,b),hi=max(a,b);float near=max(.01,max(lo.x,max(lo.y,lo.z))),far=min(hi.x,min(hi.y,hi.z));
    float planetB=dot(camera,ray),det=planetB*planetB-dot(camera,camera)+29.9*29.9;if(det>0.){float hit=-planetB-sqrt(det);if(hit>0.)far=min(far,hit);}
    if(far<=near)discard;
    float dt=(far-near)/cloudSteps;vec4 sum=vec4(0.);float offset=.5;
    for(int i=0;i<128;i++){if(float(i)>=cloudSteps)break;float d=near+(float(i)+offset)*dt;vec3 p=ro+rd*d;vec3 v=volume(p);if(v.r<.003)continue;float baseFade=smoothstep(-.94,-.76,p.y)*smoothstep(29.95,30.45,length(camera+ray*d));float mist=(1.-smoothstep(3.,24.,d))*cloudMist;float density=mix(v.r,pow(v.r,.86),mist*.3);float extinction=mix(4.8,mix(.24,1.65,1.-mist),cloudMist);float envelope=1.-smoothstep(.72,1.,max(abs(p.x),max(abs(p.y),abs(p.z))));float cameraFeather=smoothstep(.12,2.8,d);density*=mix(1.,envelope*cameraFeather,cloudMist);float alpha=(1.-exp(-density*baseFade*dt*extinction))*passage;
     float sun=mix(v.b,v.g,step(0.,cloudSide));float rim=pow(sun,3.1)*(1.-.28*v.r);vec3 light=vec3(.17,.22,.30)+vec3(.18,.22,.28)*pow(sun,.8)+vec3(.58,.50,.37)*rim;light*=mix(.92,1.,smoothstep(-.5,.5,p.y));float fog=1.-exp(-d*.018);light=mix(light,vec3(.14,.20,.29),fog*.48);light=mix(light,vec3(.32,.39,.48),mist*.42);
     sum.rgb+=(1.-sum.a)*alpha*light;sum.a+=(1.-sum.a)*alpha;if(sum.a>.985)break;
    }
    // Keep foreground veils transmissive so deeper banks remain visible through them.
    float veil=mix(1.,mix(.52,.82,smoothstep(8.,26.,length(delta))),cloudMist);gl_FragColor=sum*veil;
   }`);
  this.cloudComposite=program(`attribute vec2 pos;varying vec2 uv;void main(){uv=pos*.5+.5;gl_Position=vec4(pos,0.,1.);}`,`precision highp float;uniform sampler2D clouds;uniform vec2 cloudPixels;varying vec2 uv;
   // Cubic B-spline reconstruction from four bilinear samples removes enlarged pixel blocks.
   void main(){vec2 p=uv*cloudPixels-.5,f=fract(p),base=floor(p);vec2 w0=pow(1.-f,vec2(3.))/6.,w1=(3.*f*f*f-6.*f*f+4.)/6.,w2=(-3.*f*f*f+3.*f*f+3.*f+1.)/6.,w3=f*f*f/6.;vec2 g0=w0+w1,g1=w2+w3;vec2 a=(base-1.+w1/g0+.5)/cloudPixels,b=(base+1.+w3/g1+.5)/cloudPixels;gl_FragColor=texture2D(clouds,a)*g0.x*g0.y+texture2D(clouds,vec2(b.x,a.y))*g1.x*g0.y+texture2D(clouds,vec2(a.x,b.y))*g0.x*g1.y+texture2D(clouds,b)*g1.x*g1.y;}`);
  this.volumeTarget=g.createTexture();this.volumeFbo=g.createFramebuffer();
  const grid=[],indices=[],nx=48,ny=48;for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)grid.push(x/nx*2-1,y/ny*2-1);
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const i=y*(nx+1)+x;indices.push(i,i+1,i+nx+1,i+1,i+nx+2,i+nx+1);}
  this.cloudGrid=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.cloudGrid);g.bufferData(g.ARRAY_BUFFER,new Float32Array(grid),g.STATIC_DRAW);
  this.cloudIndices=g.createBuffer();g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,this.cloudIndices);g.bufferData(g.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),g.STATIC_DRAW);this.cloudIndexCount=indices.length;
  this.cloudShells=[];
  let cloudIndex=0;
  for(const [lat,side] of [[-.56,-1],[-.45,1],[-.30,-1],[-.16,1],[.01,-1],[.29,1],[.41,-1]]){
   const lon=-.17,radial=norm(point(lon,lat,1)),east=[Math.cos(lon),0,-Math.sin(lon)],north=cross(radial,east),spacing=lat>-.05?9.2:7.4;
   const angle=side*.22,axis=east.map((v,k)=>v*Math.cos(angle)+north[k]*Math.sin(angle)),depth=north.map((v,k)=>v*Math.cos(angle)-east[k]*Math.sin(angle));
   const center=point(lon,lat,32.7).map((v,k)=>v+east[k]*side*spacing);
   this.cloudShells.push({center,right:axis,up:radial,forward:depth,side,east,spacing,seed:cloudIndex*1.79,range:34,scale:[6.5+(cloudIndex%2)*.4,4.8,7.2+(cloudIndex%3)*.4]});cloudIndex++;
  }
  // Deep banks replace the former flat lunar cloud panels during close flight.
  for(const [lat,side,size,height] of [[.15,-1,12,40],[.25,1,13,41],[.70,-1,14,45],[.80,1,14,46]]){
   const lon=-.17,radial=norm(point(lon,lat,1)),east=[Math.cos(lon),0,-Math.sin(lon)],north=cross(radial,east),spacing=18;
   const center=point(lon,lat,height).map((v,k)=>v+east[k]*side*spacing);
   this.cloudShells.push({center,right:east,up:radial,forward:north,side,east,spacing,seed:cloudIndex++*1.79,range:65,scale:[size,9.5,10]});
  }
  this.quad=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,this.quad);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),g.STATIC_DRAW);
  this.ready=this.load().then(()=>{this.loaded=true;this.canvas.dataset.readyMs=performance.now().toFixed(1)});
  this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.loaded=false;document.dispatchEvent(new Event('avc:gpu-lost'))});
 }
 async load(){const g=this.gl,base='assets/moon-v21/';
  // Begin independent assets together; geometry waits only for its own manifest.
  const metadata=fetch(base+'mesh.json').then(r=>{if(!r.ok)throw Error('Lunar mesh unavailable');return r.json()});
  const readBinary=async url=>{
   const compressed=typeof DecompressionStream==='function';
   const r=await fetch(url+(compressed?'.gz':''));if(!r.ok)throw Error('Lunar asset unavailable: '+url);
   if(!compressed)return r.arrayBuffer();
   // A host may already decode Content-Encoding; inspect the gzip signature.
   const data=await r.arrayBuffer(),signature=new Uint8Array(data,0,Math.min(2,data.byteLength));
   if(signature[0]!==31||signature[1]!==139)return data;
   return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  };
  const volume=readBinary('assets/cloud-v34/density-light.rgba').then(bytes=>{if(bytes.byteLength!==3104*2328*4)throw Error('Invalid cloud volume');this.volumeTex=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.volumeTex);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,3104,2328,0,g.RGBA,g.UNSIGNED_BYTE,new Uint8Array(bytes));g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);});
  const hd=Promise.all([['groundColor','ground-color.jpg'],['groundNormal','ground-normal.webp']].map(([key,file])=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{this[key]=g.createTexture();g.bindTexture(g.TEXTURE_2D,this[key]);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGB,g.RGB,g.UNSIGNED_BYTE,im);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.generateMipmap(g.TEXTURE_2D);const ext=g.getExtension('EXT_texture_filter_anisotropic');if(ext)g.texParameterf(g.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(16,g.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));resolve();};im.onerror=reject;im.src='assets/moon-v24/'+file;})));
  const clouds=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{this.cloudTex=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.cloudTex);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,im);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);resolve()};im.onerror=reject;im.src='assets/cloud-foreground-v12.png'});
  const detail=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{this.detail=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.detail);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGB,g.RGB,g.UNSIGNED_BYTE,im);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.generateMipmap(g.TEXTURE_2D);resolve()};im.onerror=reject;im.src=base+'landing-detail.jpg'});
  const texture=new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{this.tex=g.createTexture();g.bindTexture(g.TEXTURE_2D,this.tex);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGB,g.RGB,g.UNSIGNED_BYTE,im);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.REPEAT);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);g.generateMipmap(g.TEXTURE_2D);const ext=g.getExtension('EXT_texture_filter_anisotropic');if(ext)g.texParameterf(g.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,g.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));resolve()};im.onerror=reject;im.src=base+'albedo.jpg'});
  // Attach rejection handlers to all parallel asset loads immediately.
  // Reject incomplete geometry instead of uploading a 404 body to WebGL.
  const geometry=(async()=>{
   const read=async file=>{const r=await fetch(base+file);if(!r.ok)throw Error('Lunar geometry unavailable: '+file);return r.arrayBuffer();};
   this.meta=await metadata;
   const chunks=await Promise.all(this.meta.chunks.map(async c=>({c,buffers:await Promise.all([read(c.vertices),read(c.indices)])})));
   this.parts=[];
   for(const {c,buffers:[v,i]} of chunks){
    if(!v.byteLength||v.byteLength%32||i.byteLength!==c.count*2)throw Error('Invalid lunar geometry: '+c.vertices);
    const vertexCount=v.byteLength/32;
    if(new Uint16Array(i).some(index=>index>=vertexCount))throw Error('Invalid lunar index: '+c.indices);
    const vb=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,vb);g.bufferData(g.ARRAY_BUFFER,v,g.STATIC_DRAW);
    const ib=g.createBuffer();g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,ib);g.bufferData(g.ELEMENT_ARRAY_BUFFER,i,g.STATIC_DRAW);
    this.parts.push({vb,ib,count:c.count});
   }
  })();
  await Promise.all([texture,detail,clouds,hd,volume,geometry]);
 }
 render(t,clock){const g=this.gl,c=this.canvas;// Spread actual distance gain across the return instead of accelerating at its end.
  const returnZoom=Math.max(1,Math.min(2.5,innerHeight/innerWidth)),retreat=settle((t-9.55)/3.5),falloff=5.8+Math.log(returnZoom),orbRemaining=Math.pow(-Math.log(Math.exp(-falloff)*(1-retreat)+retreat)/falloff,1/1.25);const homecoming=t<=9.55?0:t>=13.05?1:.5+Math.sin(Math.asin(clamp(1-2*orbRemaining,-1,1))/3);const approach=smooth((clamp((t-.36)/1.24)*(1-homecoming)-.65)/.35),fullWidth=Math.min(innerWidth*devicePixelRatio,1920),nearWidth=Math.min(fullWidth,innerWidth*(innerWidth<=800?1:1.15),1440);
  // Use two stable surfaces. Interpolating the canvas size reallocated GPU
  // buffers on almost every approach/return frame on high-DPI phones.
  if(approach>.98)this.nearSurface=true;else if(approach<.15)this.nearSurface=false;
  let w=Math.round(this.nearSurface?nearWidth:fullWidth),h=Math.round(w*innerHeight/innerWidth);
  if(h>1920){w=Math.round(w*1920/h);h=1920}
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;g.viewport(0,0,w,h);this.surfaceResizes=(this.surfaceResizes||0)+1;c.dataset.surfaceResizes=String(this.surfaceResizes)}
  // All progress values address this one globe; nothing is replaced at arrival.
  const travel=travelAlong(t)*(1-settle((t-9.35)/3.7));const q=clamp((t-.36)/1.24)*(1-homecoming),orb=smooth(q),lon=-.38+.185*orb+.055*Math.sin(travel*Math.PI),lat=(-.25/Math.max(1,Math.min(2.5,h/w)))*(1-orb)-.65*orb+.55*travel,hi=Math.min(999,Math.floor(orb*1000)),hf=orb*1000-hi,heights=this.meta.camera_heights[hi].map((v,i)=>v*(1-hf)+this.meta.camera_heights[hi+1][i]*hf);
  const mobileZoom=Math.max(1,Math.min(2.5,h/w));const altitude=64*mobileZoom*Math.exp(-(5.8+Math.log(mobileZoom))*Math.pow(orb,1.25))+1.2+.5*travel+.65*smooth((t-7.2)/1.4)*(1-homecoming),cam=point(lon,lat,30+heights[0]+altitude);const ahead=Math.acos(30/(30+altitude))*.6+.08;const at=point(lon+.025,lat+ahead,30+heights[1]);const lean=smooth(q/.65);const target=at.map(v=>v*lean);const f=norm(sub(target,cam)),radial=norm(cam),worldUp=norm(radial.map((v,i)=>v*lean+(i===1?1:0)*(1-lean))),r=norm(cross(f,worldUp)),u=cross(r,f);const shift=(1-smooth(q/.75));
  c.dataset.travel=travel.toFixed(4);c.dataset.resolution=c.width+'x'+c.height;c.dataset.groundDetail='4096-color-and-LOLA-normal';c.dataset.position=t.toFixed(4);c.dataset.phase=t>=13.05?'journey-finished':t>9.35?(homecoming<.15?'return-through-clouds':'return-to-blue-moon'):q<.6?'orbital-approach':q<.94?'crater-approach':travel>.001?'lunar-cloud-journey':'same-moon-surface';c.dataset.clock=clock.toFixed(3);c.dataset.renderer='single-displaced-lunar-sphere';c.dataset.altitude=altitude.toFixed(3);c.dataset.camera=cam.map(n=>n.toFixed(4)).join(',');c.dataset.mesh='lola-sphere-v21';c.dataset.world='continuous-blue-world-v41';c.dataset.immersion=smooth((q-.08)/.62).toFixed(4);c.dataset.triangles=this.meta.triangles;
  const set=(p)=>{g.useProgram(p.p);const loc=n=>p.loc[n]??(p.loc[n]=g.getUniformLocation(p.p,n));g.uniform3fv(loc('camera'),cam);g.uniform3fv(loc('right'),r);g.uniform3fv(loc('up'),u);g.uniform3fv(loc('forward'),f);g.uniform1f(loc('aspect'),w/h);g.uniform1f(loc('shiftX'),shift*(w/h<1?.04:.23));g.uniform1f(loc('shiftY'),shift*.22);g.uniform1f(loc('time'),clock);g.uniform1f(loc('immersion'),smooth((q-.08)/.62));g.uniform1f(loc('atmosphere'),Math.exp(-Math.max(0,altitude-2)/14));g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,this.tex);g.uniform1i(loc('albedo'),0);g.activeTexture(g.TEXTURE1);g.bindTexture(g.TEXTURE_2D,this.detail);g.uniform1i(loc('detailMap'),1);g.activeTexture(g.TEXTURE2);g.bindTexture(g.TEXTURE_2D,this.cloudTex);g.uniform1i(loc('cloudMap'),2);g.activeTexture(g.TEXTURE3);g.bindTexture(g.TEXTURE_2D,this.groundColor);g.uniform1i(loc('groundColor'),3);g.activeTexture(g.TEXTURE4);g.bindTexture(g.TEXTURE_2D,this.groundNormal);g.uniform1i(loc('groundNormal'),4);};
  const attr=(p,name,size,stride,offset)=>{const a=p.attr[name]??(p.attr[name]=g.getAttribLocation(p.p,name));if(a>=0){g.enableVertexAttribArray(a);g.vertexAttribPointer(a,size,g.FLOAT,false,stride,offset)}};
  g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.enable(g.DEPTH_TEST);g.disable(g.BLEND);
  g.enable(g.DEPTH_TEST);if(q>.7){g.enable(g.CULL_FACE);g.cullFace(g.BACK);}set(this.moon);for(const p of this.parts){g.bindBuffer(g.ARRAY_BUFFER,p.vb);attr(this.moon,'pos',3,32,0);attr(this.moon,'normal',3,32,12);attr(this.moon,'texcoord',2,32,24);g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,p.ib);g.drawElements(g.TRIANGLES,p.count,g.UNSIGNED_SHORT,0)}
  g.disable(g.CULL_FACE);
  // The opaque moon writes depth first, so hidden water pixels need no shading.
  g.depthFunc(g.LEQUAL);set(this.sky);g.bindBuffer(g.ARRAY_BUFFER,this.quad);attr(this.sky,'pos',2,0,0);g.drawArrays(g.TRIANGLE_STRIP,0,4);g.depthFunc(g.LESS);
  if(q<.86){set(this.clouds);g.uniform3fv(g.getUniformLocation(this.clouds.p,'referenceCamera'),point(-.38,-.25/mobileZoom,30+this.meta.camera_heights[0][0]+64*mobileZoom+1.2));g.bindBuffer(g.ARRAY_BUFFER,this.cloudGrid);g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,this.cloudIndices);attr(this.clouds,'pos',2,0,0);g.enable(g.BLEND);g.blendFunc(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA);g.depthMask(false);for(let layer=0;layer<2;layer++){g.uniform1f(g.getUniformLocation(this.clouds.p,'layer'),layer);g.drawElements(g.TRIANGLES,this.cloudIndexCount,g.UNSIGNED_SHORT,0)}
  set(this.lunarClouds);g.bindBuffer(g.ARRAY_BUFFER,this.quad);attr(this.lunarClouds,'pos',2,0,0);for(const bank of [0,4,3,1,2]){g.uniform1f(g.getUniformLocation(this.lunarClouds.p,'atmosphere'),Math.exp(-Math.max(0,altitude-2)/14)*(1-smooth((q-.38)/.48)));g.uniform1f(g.getUniformLocation(this.lunarClouds.p,'bank'),bank);g.drawArrays(g.TRIANGLE_STRIP,0,4)}g.depthMask(true);g.disable(g.BLEND);}
  const passage=smooth((q-.12)/.6)*Math.exp(-Math.max(0,altitude-2)/14);c.dataset.cloudVolume=passage>0?'11-evolving-world-space-cloud-volumes':'inactive-at-top';
  if(passage>.0001){
   // Cloud-only reduced resolution target keeps the volume work bounded; scene/text stay sharp.
   const cloudScale=Math.min(.60,innerWidth*.42/w,Math.sqrt(160000/(w*h)));const vw=Math.max(1,Math.round(w*cloudScale)),vh=Math.max(1,Math.round(h*cloudScale));c.dataset.cloudResolution=vw+'x'+vh;
   if(this.volumeWidth!==vw||this.volumeHeight!==vh){this.volumeWidth=vw;this.volumeHeight=vh;g.bindTexture(g.TEXTURE_2D,this.volumeTarget);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,vw,vh,0,g.RGBA,g.UNSIGNED_BYTE,null);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.bindFramebuffer(g.FRAMEBUFFER,this.volumeFbo);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.volumeTarget,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('Cloud framebuffer unavailable');}
   g.bindFramebuffer(g.FRAMEBUFFER,this.volumeFbo);g.viewport(0,0,vw,vh);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.disable(g.DEPTH_TEST);
   set(this.cumulus);g.bindBuffer(g.ARRAY_BUFFER,this.quad);attr(this.cumulus,'pos',2,0,0);g.activeTexture(g.TEXTURE5);g.bindTexture(g.TEXTURE_2D,this.volumeTex);g.enable(g.BLEND);g.blendFunc(g.ONE,g.ONE_MINUS_SRC_ALPHA);
   const loc=n=>this.cumulus.loc[n]??(this.cumulus.loc[n]=g.getUniformLocation(this.cumulus.p,n));g.uniform1i(loc('cloudVolume'),5);
   const spread=Math.max(.76,Math.min(1,w/h/1.4));const clouds=this.cloudShells.map(cloud=>({...cloud,center:cloud.center.map((v,k)=>v-cloud.east[k]*cloud.side*cloud.spacing*(1-spread))})).sort((a,b)=>sub(b.center,a.center).reduce((v,n,i)=>v+n*f[i],0));
   for(const cloud of clouds){const delta=sub(cloud.center,cam),distance=Math.hypot(...delta),depth=delta.reduce((v,n,i)=>v+n*f[i],0);const extent=Math.abs(f.reduce((v,n,i)=>v+n*cloud.right[i],0))*cloud.scale[0]+Math.abs(f.reduce((v,n,i)=>v+n*cloud.up[i],0))*cloud.scale[1]+Math.abs(f.reduce((v,n,i)=>v+n*cloud.forward[i],0))*cloud.scale[2];if(depth+extent<.01||distance>cloud.range)continue;const trailing=cloud.range>34?1:settle((depth+extent)/(extent+4));
    g.uniform1f(loc('cloudSteps'),cloud.range>34?32:56);g.uniform1f(loc('cloudMist'),cloud.range>34?0:1);g.uniform3fv(loc('cloudFlow'),[Math.sin(clock*.11+cloud.seed)*.035,Math.sin(clock*.09+cloud.seed*2)*.028,Math.sin(clock*.08+cloud.seed)*.035]);g.uniform1f(loc('cloudSide'),cloud.side);g.uniform3fv(loc('cloudCenter'),cloud.center);g.uniform3fv(loc('cloudRight'),cloud.right);g.uniform3fv(loc('cloudUp'),cloud.up);g.uniform3fv(loc('cloudForward'),cloud.forward);g.uniform3fv(loc('cloudScale'),cloud.scale);g.uniform1f(loc('passage'),passage*trailing*(1-settle((distance-(cloud.range-14))/14)));g.drawArrays(g.TRIANGLE_STRIP,0,4);
   }
   g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,w,h);g.useProgram(this.cloudComposite.p);g.activeTexture(g.TEXTURE5);g.bindTexture(g.TEXTURE_2D,this.volumeTarget);g.uniform1i(g.getUniformLocation(this.cloudComposite.p,'clouds'),5);g.uniform2f(g.getUniformLocation(this.cloudComposite.p,'cloudPixels'),vw,vh);attr(this.cloudComposite,'pos',2,0,0);g.drawArrays(g.TRIANGLE_STRIP,0,4);g.disable(g.BLEND);g.enable(g.DEPTH_TEST);
  }

 }
 }
 window.AVCMoonFlight=AVCMoonFlight;
})();
