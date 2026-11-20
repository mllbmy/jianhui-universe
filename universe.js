import GSAP from './assets/vendor/gsap.module.js';
import * as THREE from './assets/vendor/three.module.min.js';
import {systems} from './content.js?v=personal-1';
import {certificateGallery,projectExhibit} from './exhibits.js?v=personal-2';
import {createWaterIntro} from './water-intro.js?v=personal-3';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)'), gs=GSAP.gsap;
const linkedSystem = systems.findIndex(system => location.hash === '#' + system.id);
let mobile=innerWidth<701,index=0,overview=false,flying=false,opening=true,renderer,scene,camera,frame=0,frames=0,paused=false,raf=0,lastFrame=0,flight=null,lastWheel=0,wheelDir=0,wheelMagnitude=0,openingTimer,certificateData=[];
const launchObjects=[],meshes=[],labels=[],satellites=[],animated=[],planetMaterials=[],dustUniforms=[],projected=new THREE.Vector3(),aim=new THREE.Vector3(),pose={x:0,y:1.5,z:14,tx:-3,ty:0,tz:0},pointer={x:0,y:0},launchUniform={value:1};
let water=null,entering=false;
let detailState=null,detailFlight=null,detailExhibit=null,proofExhibit=null;
const interaction={point:new THREE.Vector3(99,99,99),strength:0},interactionPlane=new THREE.Plane(),interactionHit=new THREE.Vector3();
const colors=['#7ebcff','#58f5ec','#e29bff','#68ffb5','#ffd15b','#b1a2ff'];
let fallback=false,transit=null;const effects={phase:0,bank:0,fov:0};const clickObjects=[],raycaster=new THREE.Raycaster(),screenPointer=new THREE.Vector2();
const v=a=>new THREE.Vector3(...a), clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const noiseGLSL=`float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}float fbm(vec3 p){float n=0.,a=.5;for(int i=0;i<5;i++){n+=a*noise(p);p=p*2.03+vec3(1.7,9.2,4.8);a*=.5;}return n;}`;
function makeGlow(){const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(220,245,255,1)');g.addColorStop(.08,'rgba(180,220,255,.8)');g.addColorStop(.25,'rgba(100,170,255,.2)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
const glowTexture=makeGlow();
function glow(color,size,opacity){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false}));s.scale.set(size,size,1);return s;}
function makePoints(count,kind){
 const pos=new Float32Array(count*3),sizes=new Float32Array(count),seeds=new Float32Array(count);let seed=kind==='launch'?114:417;
 const rand=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 for(let i=0;i<count;i++){let x,y,z;if(kind==='launch'){const height=rand()*50-15,a=rand()*Math.PI*2,r=Math.pow(rand(),.65)*(2.5+height*.04);x=Math.sin(height*.23)*1.6+Math.cos(a)*r;y=height;z=14+Math.cos(height*.12)*1.2+Math.sin(a)*r;sizes[i]=.035+Math.pow(rand(),7)*.6;}else{z=rand()*580-330;const angle=rand()*Math.PI*2,r=28+Math.pow(rand(),.65)*240;x=Math.cos(angle)*r;y=Math.sin(angle)*r*.72;sizes[i]=.12+Math.pow(rand(),7)*1.8;}pos.set([x,y,z],i*3);seeds[i]=rand();}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geo.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
 const uniforms={uTime:{value:0},uOpacity:kind==='launch'?launchUniform:{value:1},uScale:{value:innerHeight*(devicePixelRatio>1?1.2:1)},uLaunch:{value:kind==='launch'?1:0}};
 const mat=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`attribute float aSize;attribute float aSeed;uniform float uTime;uniform float uScale;uniform float uLaunch;varying float intensity;void main(){vec3 p=position;if(uLaunch>.5){float oldY=p.y;p.y=mod(p.y+15.-uTime*(2.2+aSeed*1.9),50.)-15.;p.x-=sin(oldY*.23)*1.6;p.x+=sin(p.y*.23+uTime*.12)*1.6+sin(p.y*.73+uTime*.7+aSeed*5.)*.34;p.z+=sin(p.y*.3+uTime*.32+aSeed*6.)*.38;}vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uScale/max(1.,-mv.z),.7,uLaunch>.5?54.:9.);intensity=.5+aSeed*.5+sin(uTime*.6+aSeed*90.)*.12;if(mv.z>-.1)gl_PointSize=0.;}`,fragmentShader:`uniform float uOpacity;uniform float uLaunch;varying float intensity;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float core=exp(-r*r*18.);float halo=pow(1.-r,3.)*.48;float a=(core+halo)*intensity*uOpacity;vec3 color=mix(vec3(.32,.63,1.),vec3(.83,.95,1.),core);gl_FragColor=vec4(color,a);}`});
 dustUniforms.push(uniforms);const points=new THREE.Points(geo,mat);points.frustumCulled=false;scene.add(points);return points;
}
const TAU=2*Math.PI;
function stagePoint(system,radius,index,random){
 const u=random(1),v=random(2),angle=u*TAU;
 if(system===0){
  // Three curved arms and a dense nucleus read as one galaxy from the approach.
  const distance=radius*(.095+1.29*Math.pow(u,.8));
  const sweep=index%3*TAU/3+u*5.8+(v-.5)*(.95-u*.52);
  const y=Math.sin(sweep)*distance;
  return [Math.cos(sweep)*distance,y*.57,y*.29+(random(3)-.5)*radius*.15];
 }
 if(system===1){
  // Rounded paths cradle the live screen while leaving the project imagery clear.
  const corner=index%4,arc=corner*Math.PI/2+u*Math.PI/2;
  const isInner=v<.78,spread=isInner?.065:.19;
  const halfWidth=radius*(isInner?.96:1.1),halfHeight=radius*(isInner?.68:.80);
  const rounding=radius*.19;
  const phase=random(3);
  const cornerX=Math.sign(Math.cos((corner+.5)*Math.PI/2))*(halfWidth-rounding);
  const cornerY=Math.sign(Math.sin((corner+.5)*Math.PI/2))*(halfHeight-rounding);
  let x=cornerX+rounding*Math.cos(arc),y=cornerY+rounding*Math.sin(arc);
  if(phase>.30){
   if(corner%2===0){x=(u*2-1)*(halfWidth-rounding);y=Math.sign(cornerY)*halfHeight;}
   else{x=Math.sign(cornerX)*halfWidth;y=(u*2-1)*(halfHeight-rounding);}
  }
  return [x+(v-.5)*spread,y+(random(4)-.5)*spread,-.35+(random(5)-.5)*radius*.43];
 }
 if(system===2){
  // Separate curved wavefronts from the phone stack with a recessed parallax layer.
  const wave=index%3,arc=angle+wave*.47;
  const rim=radius*(.92+wave*.13+Math.sin(arc*6+wave*.9)*.045)+(v-.5)*.14;
  const y=Math.sin(arc)*rim;
  return [Math.cos(arc)*rim,y*.68,y*.18+(random(3)-.5)*.48-.35];
 }
 if(system===3){
  // A set of ordered contours gives the terrain visible ridges and valleys.
  const row=index%39/38,z=(row-.5)*radius*1.72;
  const x=(u-.5)*radius*2.54;
  const peaks=Math.exp(-Math.pow(x*.58+z*.14,2))*1.56+Math.exp(-Math.pow((x-2.14)*.84,2))*.88;
  return [x,Math.sin(x*.88+z*.72)*.47+Math.cos(x*1.7-z)*.19+peaks-.96,z+(v-.5)*.055];
 }
 if(system===4){
  // Golden ribbons pass behind the rotating awards and fan out at the sides.
  const ribbon=index%5,arc=angle+ribbon*.35;
  const distance=radius*(.83+ribbon*.10)+(v-.5)*.10;
  return [Math.cos(arc)*distance,Math.sin(arc)*distance*.60+(ribbon-2)*.28,-.7+Math.sin(arc+ribbon)*distance*.37];
 }
 // Paired trajectories converge and continue in depth, like a signal being relayed.
 const strand=index%2,along=(u-.5)*radius*2.56;
 const bend=Math.sin(u*Math.PI)*radius*(strand===0?.45:-.45);
 return [along,bend+.32*Math.sin(angle*2)+(v-.5)*.32,(strand===0?1:-1)*Math.sin(angle)*radius*.72+(random(3)-.5)*.38];
}

function particleSphere(radius,data,i,count){
 const pos=new Float32Array(count*3),sizes=new Float32Array(count),seeds=new Float32Array(count);const golden=Math.PI*(3-Math.sqrt(5));
 for(let k=0;k<count;k++){const y=1-k/(count-1)*2,r=Math.sqrt(1-y*y),a=golden*k;pos.set([Math.cos(a)*r*radius,y*radius,Math.sin(a)*r*radius],k*3);const n=(Math.sin(k*127.1)*43758.5453)%1;seeds[k]=Math.abs(n);const jitter=(seeds[k]-.5)*.045;const q=new THREE.Vector3(pos[k*3],pos[k*3+1],pos[k*3+2]);q.x+=Math.sin(k*4.13)*radius*.018;q.y+=jitter*radius;q.z+=Math.cos(k*2.71)*radius*.018;q.normalize().multiplyScalar(radius*(.975+.025*Math.sin(k*.91)));pos.set(q.toArray(),k*3);sizes[k]=.028+seeds[k]*.035;}
 const targets=new Float32Array(count*3);
 for(let k=0;k<count;k++){
  const random=n=>{const x=Math.sin(k*12.9898+n*78.233+i*17.1)*43758.5453;return x-Math.floor(x);};
  targets.set(stagePoint(i,radius,k,random),k*3);
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('aTarget',new THREE.BufferAttribute(targets,3));geometry.setAttribute('position' ,new THREE.BufferAttribute(pos,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
 const material=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uReveal:{value:0},uKind:{value:i},uRadius:{value:radius},uPointer:{value:new THREE.Vector3(99,99,99)},uHover:{value:0},uPresence:{value:1},base:{value:new THREE.Color(data.color)},accent:{value:new THREE.Color(data.accent)},seed:{value:i*7.7},uScale:{value:innerHeight*1.35}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`attribute vec3 aTarget;attribute float aSize;attribute float aSeed;uniform float uTime;uniform float uScale;uniform float seed;uniform float uReveal;uniform float uPresence;uniform float uKind;uniform float uRadius;uniform vec3 uPointer;uniform float uHover;varying float brightness;varying float warm;${noiseGLSL}void main(){vec3 q=normalize(position);float field=fbm(q*4.+seed);float morph=smoothstep(0.,1.,uReveal);vec3 target=aTarget;float t=uTime;
if(uKind<.5){float a=sin(t*.18)*.23;mat2 rot=mat2(cos(a),-sin(a),sin(a),cos(a));target.xz=rot*target.xz;target.z+=sin(t*.85+length(target.xy)*2.4)*.11;}
else if(uKind<1.5){target.z+=sin(t*.65+target.x*1.4)*.13;}
else if(uKind<2.5){float wave=sin(t*1.9-length(target.xy)*1.5+aSeed*.3);target.xy*=1.+wave*.035;target.z+=wave*.14;}
else if(uKind<3.5){target.y+=sin(target.x*.95+target.z*.7-t*.48)*.15;}
else if(uKind<4.5){target.z+=sin(t*.62+target.x*.72)*.19;}
else {target.y+=sin(target.x*1.3-t*.85)*.24;target.z+=sin(target.x-t*.67)*.21;}
vec3 p=mix(position,target,morph);vec2 diff=p.xy-uPointer.xy;float influence=exp(-dot(diff,diff)*.6)*uHover*morph;vec2 dir=normalize(diff+vec2(.001));p.xy+=(dir*.7+vec2(-dir.y,dir.x)*.48)*influence;p.z+=influence*.7;
float turn=sin(morph*3.14159265)*.28;mat2 spiral=mat2(cos(turn),-sin(turn),sin(turn),cos(turn));p.xy=spiral*p.xy;
p+=q*sin(t*.42+aSeed*6.)*(.018+morph*.045);
vec4 mv=modelViewMatrix*vec4(p,1.);vec3 n=normalize(normalMatrix*q);
float facing=max(0.,dot(n,normalize(vec3(-.32,.68,.64))));
float depth=smoothstep(-uRadius,uRadius,p.z);
float ripple=pow(.5+.5*sin(t*.83-dot(p,vec3(.60,.26,.40))),6.);
brightness=mix(.3+facing*.70,.38+depth*.44+ripple*.24,morph)*(.74+field*.56);
brightness*=uPresence*(.92+influence*1.45)*(.12+.88*(1.-smoothstep(22.,130.,-mv.z)));
warm=field*.76+depth*.24;gl_Position=projectionMatrix*mv;
gl_PointSize=clamp(aSize*uScale/max(1.,-mv.z)*(1.+influence*.60),.72,6.);}`,fragmentShader:`uniform vec3 base;uniform vec3 accent;varying float brightness;varying float warm;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float light=exp(-r*r*12.)+pow(1.-r,3.)*.36;vec3 col=mix(base,accent,smoothstep(.16,.68,warm));col=mix(col,vec3(.64,.79,1.),smoothstep(.68,.93,warm)*.34);gl_FragColor=vec4(col,light*brightness);}`});
 planetMaterials.push(material);return new THREE.Points(geometry,material);
}
const orbitProfiles=[
 {tilt:.85,bank:.30,yaw:-.18,reach:1.87,thickness:.64,turn:5.8,speed:.24,arms:3},
 {tilt:.77,bank:-.31,yaw:.28,reach:1.98,thickness:.58,turn:-5.3,speed:.20,arms:3},
 {tilt:.96,bank:.27,yaw:-.10,reach:1.90,thickness:.70,turn:6.2,speed:.27,arms:2},
 {tilt:1.10,bank:-.28,yaw:-.33,reach:1.84,thickness:.85,turn:-5.25,speed:.21,arms:3},
 {tilt:.70,bank:.20,yaw:.26,reach:1.94,thickness:.62,turn:5.6,speed:.22,arms:3},
 {tilt:.96,bank:-.26,yaw:.35,reach:1.84,thickness:.81,turn:-5.8,speed:.25,arms:2}
];
function makeStellarStreams(system,profile,station){
 const count=mobile?3500:7900;
 const coordinates=new Float32Array(count*3),features=new Float32Array(count*2);
 let seed=2117+station*389;
 const random=()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646;};
 const step=TAU/profile.arms;
 const particlesPerTail=20, tailCount=mobile?11:19;
 const armParticles=count-particlesPerTail*tailCount;
 for(let n=0;n<armParticles;n++){
  const haze=n%7===0;
  const lane=n%4<2;
  const distance=.40+.73*Math.pow(random(),.84);
  const armOffset=(n%profile.arms)*step+(random()+random()-1)*(lane?.17:.34+distance*.44);
  const height=(random()+random()+random()-1.5)*(haze?1.8:lane?.41:1.2);
  coordinates.set([distance,haze?random()*TAU:armOffset,height],n*3);
  features.set([random(),haze?-.45:0],n*2);
 }
 for(let tail=0;tail<tailCount;tail++){
  const distance=.56+random()*.37;
  const armOffset=(tail%profile.arms)*step+(random()-.5)*.32;
  const height=(random()-.43)*1.3;
  for(let j=0;j<particlesPerTail;j++){
   const n=armParticles+tail*particlesPerTail+j;
   const trail=j/particlesPerTail;
   coordinates.set([distance+trail*.12+(random()-.5)*.035,armOffset+(random()-.5)*.07,height+(random()-.5)*.14],n*3);
   features.set([random(),1-trail],n*2);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(coordinates,3));
 geometry.setAttribute('aFlow',new THREE.BufferAttribute(features,2));
 const uniforms={
  uTime:{value:0},uPresence:{value:1},uReveal:{value:0},uHover:{value:0},
  uPointer:{value:new THREE.Vector3(99,99,99)},uScale:{value:innerHeight*1.16},
  uRadius:{value:system.radius*profile.reach},uThickness:{value:system.radius*profile.thickness},
  uTurn:{value:profile.turn},uSpeed:{value:Math.sign(profile.turn)*profile.speed},
  uColor:{value:new THREE.Color(system.color)},uAccent:{value:new THREE.Color(system.accent)}
 };
 const material=new THREE.ShaderMaterial({
  uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`
   attribute vec2 aFlow;
   uniform float uTime,uScale,uHover,uRadius,uThickness,uTurn,uSpeed,uReveal;
   uniform vec3 uPointer;
   varying float vLight,vFront,vTrail;
   void main(){
    float drift=uTime*uSpeed;
    float radius=position.x+.024*sin(drift+position.y);
    float azimuth=position.y+sqrt(radius)*uTurn+drift;
    float distance=radius*uRadius*(1.+.045*sin(azimuth*2.));
    float thickness=position.z*(.55+radius*.45)+sin(azimuth*2.+radius*3.)*.22;
    vec3 point=vec3(cos(azimuth)*distance,sin(azimuth)*distance,thickness*uThickness);
    vec2 delta=point.xy-uPointer.xy;
    float response=exp(-dot(delta,delta)*.48)*uHover;
    point.xy+=vec2(-delta.y,delta.x)*response*.36;
    point.z+=response*.48;
    vec4 view=modelViewMatrix*vec4(point,1.);
    float centerDepth=modelViewMatrix[3].z;
    vFront=smoothstep(-uRadius*.50,uRadius*.55,view.z-centerDepth);
    vTrail=max(0.,aFlow.y);
    float pulse=pow(.5+.5*cos(azimuth*2.-uTime*uSpeed*4.+radius*6.),5.);
    float edge=smoothstep(.38,.55,radius)*(1.-smoothstep(.93,1.15,radius));
    vLight=(.34+vTrail*.75+pulse*.70+response*.40)*edge;
    vLight*=mix(.39,1.,vFront)*(.44+.56*uReveal)*(aFlow.y<0.? .32:1.);
    gl_Position=projectionMatrix*view;
    float size=.040+pow(aFlow.x,3.)*.060+vFront*.021+vTrail*.039;
    gl_PointSize=clamp(size*uScale/max(1.,-view.z),.86,8.4);
   }`,
  fragmentShader:`
   uniform vec3 uColor,uAccent;
   uniform float uPresence;
   varying float vLight,vFront,vTrail;
   void main(){
    float radius=length(gl_PointCoord-.5)*2.;
    if(radius>1.)discard;
    float sharpness=mix(6.,14.,vFront);
    float falloff=exp(-radius*radius*sharpness)+pow(1.-radius,3.)*.28;
    vec3 color=mix(uColor,uAccent,.3+vFront*.55);
    color=mix(color,vec3(.71,.85,1.),vTrail*vFront*.32);
    gl_FragColor=vec4(color,falloff*vLight*uPresence);
    #include <colorspace_fragment>
   }`
 });
 dustUniforms.push(uniforms);
 const streams=new THREE.Points(geometry,material);
 streams.frustumCulled=false;
 return streams;
}
function satellitePosition(i,j){
 const positions=mobile
  ? (i===4?[[-2.8,2.4,3],[2.7,1.95,3],[0,-2.1,4]]:[[-2.7,2.3,3],[2.7,1.1,3],[-.4,-1.4,4]])
  : [[-4,2.8,3],[3.6,1.8,3],[0,-3,3]];
 return positions[j];
}
function makeSystem(d,i){
 const group=new THREE.Group();group.position.copy(v(d.position));scene.add(group);
 const planet=particleSphere(d.radius,d,i,mobile?8500:19000);group.add(planet);const occluder=new THREE.Mesh(new THREE.SphereGeometry(d.radius*.975,40,28),new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:true}));occluder.renderOrder=-2;group.add(occluder);
 const halo=glow(d.accent,d.radius*4.9,.12);group.add(halo);
 const orbit=new THREE.Group(),profile=orbitProfiles[i];
 const streams=makeStellarStreams(d,profile,i);
 orbit.rotation.set(.69,profile.yaw,profile.bank);
 orbit.add(streams);group.add(orbit);
 const sats=[];[.35,2.5,4.4].forEach((a,j)=>{const sg=new THREE.Group(),r=d.radius*1.85;sg.position.set(...satellitePosition(i,j));group.add(sg);const moon=particleSphere(.15+j*.035,d,i,mobile?600:1400);sg.add(moon);sg.add(glow(d.accent,1.1,.6));sg.userData.focus={scale:1};sats.push(sg);const b=document.createElement('button');b.className='world-label';b.textContent=d.satellites[j];b.style.setProperty('--label-color',colors[i]);b.setAttribute('aria-label',d.name+'：'+d.satellites[j]);b.onclick=()=>openDetail(i,j);b.onpointerenter=()=>{if(!reduced.matches)gs.to(sg.userData.focus,{scale:1.8,duration:.3,overwrite:true});};b.onpointerleave=()=>{if(!detailState)gs.to(sg.userData.focus,{scale:1,duration:reduced.matches?0:.4,overwrite:true});};$('#world-labels').append(b);labels.push({el:b,object:sg,index:i,kind:'satellite',j});});
 const b=document.createElement('button');b.className='world-label system-label';b.innerHTML=d.name+`<small>${String(i+1).padStart(2,'0')}</small>`;b.style.setProperty('--label-color',colors[i]);b.onclick=()=>go(i);$('#world-labels').append(b);labels.push({el:b,object:group,index:i,kind:'system'});
 const state={reveal:0,presence:1};const core=new THREE.Group();core.position.z=.5;group.add(core);meshes.push({group,planet,orbit,streams,halo,occluder,state,core});satellites.push(sats);
 localDust(group,d);
}
function framePoints(w,h,color){const n=500,arr=new Float32Array(n*3);for(let k=0;k<n;k++){const t=k/n*4;let x,y;if(t<1){x=-w/2+t*w;y=-h/2;}else if(t<2){x=w/2;y=-h/2+(t-1)*h;}else if(t<3){x=w/2-(t-2)*w;y=h/2;}else{x=-w/2;y=h/2-(t-3)*h;}arr.set([x,y,.015],k*3);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(arr,3));return new THREE.Points(g,new THREE.PointsMaterial({color,map:glowTexture,size:.06,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));}
function buildExhibit(parent,d,i,core){core.userData.loaded=true;core.userData.ready=0;core.userData.failed=[];
 const image=(path,w,h,position,rotation=0)=>{const mount=new THREE.Group();mount.position.set(...position);mount.rotation.y=rotation;mount.userData.exhibit=true;mount.userData.ready=false;mount.userData.source=path;mount.userData.rest={position:mount.position.clone(),rotation};core.add(mount);
  const material=new THREE.MeshBasicMaterial({color:0x17334b,side:THREE.DoubleSide,transparent:true,opacity:.98,depthWrite:false,depthTest:i!==4});material.userData.originalOpacity=.98;
  const screen=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);screen.userData.system=i;screen.userData.section=i===4?2:0;screen.renderOrder=i===4?25:0;mount.add(screen);clickObjects.push(screen);
  const backingMaterial=new THREE.MeshBasicMaterial({color:0x091426,transparent:true,opacity:1,depthTest:i!==4});backingMaterial.userData.originalOpacity=1;
  const backing=new THREE.Mesh(new THREE.BoxGeometry(w+.1,h+.1,i===2?.16:.09),backingMaterial);backing.position.z=i===2?-.09:-.055;backing.renderOrder=i===4?24:0;mount.add(backing);
  let frame=framePoints(w+.06,h+.06,d.accent);frame.material.userData.originalOpacity=.8;frame.renderOrder=i===4?26:0;mount.add(frame);
  new THREE.TextureLoader().load(path,tex=>{tex.colorSpace=THREE.SRGBColorSpace;if(i===4){const ratio=tex.image.width/tex.image.height;w=Math.min(2.45,2.4*ratio);h=w/ratio;screen.geometry.dispose();screen.geometry=new THREE.PlaneGeometry(w,h);backing.geometry.dispose();backing.geometry=new THREE.BoxGeometry(w+.1,h+.1,.09);mount.remove(frame);frame.geometry.dispose();frame.material.dispose();frame=framePoints(w+.06,h+.06,d.accent);frame.material.userData.originalOpacity=.8;frame.renderOrder=26;frame.material.depthTest=false;mount.add(frame);}
   material.color.setHex(0xffffff);material.map=tex;material.needsUpdate=true;mount.userData.ready=true;core.userData.ready++;
   if(i===1){const bar=new THREE.Mesh(new THREE.PlaneGeometry(w,.18),new THREE.MeshBasicMaterial({color:0x17283e}));bar.position.set(0,h/2+.09,0);mount.add(bar);for(let k=0;k<3;k++){const dot=glow(d.accent,.08,.8);dot.position.set(-w/2+.16+k*.12,h/2+.09,.02);mount.add(dot);}}
  },undefined,()=>{core.userData.failed.push(path);});return mount;
 };
 if(i===1)image('assets/images/career-live.webp',4.75,4.75*764/1100,[0,.06,1.25],-.085);
 else if(i===2){
  const sizes=[1.3,1.53];
  const phoneHeight=width=>width*1558/720;
  image('assets/images/soundlane-guard.webp',sizes[0],phoneHeight(sizes[0]),[-1.53,-.08,.92],-.24);
  image('assets/images/soundlane-navigation.webp',sizes[0],phoneHeight(sizes[0]),[1.53,-.08,.92],.24);
  image('assets/images/soundlane-home.webp',sizes[1],phoneHeight(sizes[1]),[0,.12,1.62]);
 }
 else if(i===4){const proofs=['mati-national-silver','mati-regional-gold','outsourcing-national-third','challenge-cup-bronze','soundlane-mobile-first','robot-vision-third','huawei-hcia-ai','china-us-maker','lions-innovation'];proofs.forEach((id,k)=>{const portrait=[0,1,4,7,8].includes(k),a=k/proofs.length*Math.PI*2;image('assets/certificates/'+id+'.jpg',portrait?1.5:2.3,portrait?2.12:1.63,[Math.sin(a)*2.6,0,Math.cos(a)*1.5],-a);const mount=core.children[core.children.length-1];mount.userData.certificateIndex=k;});}
 else if(i===0||i===5){
  const count=mobile?1080:2400,positions=new Float32Array(count*3);
  const nucleus=i===0,spread=nucleus?1.32:.72;
  for(let k=0;k<count;k++){
   const angle=k*2.39996323,distance=spread*Math.pow((k+.5)/count,1.7);
   positions.set([Math.cos(angle)*distance,Math.sin(angle)*distance*(nucleus?.52:.73),Math.sin(k*2.13)*distance*.65],k*3);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const light=new THREE.PointsMaterial({map:glowTexture,color:d.accent,size:.082,transparent:true,opacity:.53,depthWrite:false,blending:THREE.AdditiveBlending});
  core.add(new THREE.Points(geometry,light));
 }
 const light=glow(d.accent,i===3?5:5.5,i===0?.28:.20);light.position.set(-.35,.10,-.92);core.add(light);return core;}
function localDust(parent,d){const n=mobile?600:1400,arr=new Float32Array(n*3);for(let k=0;k<n;k++){const a=k*2.39996323,r=d.radius*(1.3+(k%61)/38);arr.set([Math.cos(a)*r,Math.sin(a*1.03)*r*.75,Math.sin(k*3.71)*4],k*3);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(arr,3));const cloud=new THREE.Points(g,new THREE.PointsMaterial({map:glowTexture,color:d.accent,size:mobile?.09:.065,transparent:true,opacity:.36,depthWrite:false,blending:THREE.AdditiveBlending}));parent.add(cloud);animated.push(cloud);}
function buildMist(){systems.forEach((d,i)=>{const uniforms={uTime:{value:0},color:{value:new THREE.Color(d.color)},seed:{value:i*4.7}};const mat=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`varying vec2 q;void main(){q=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`varying vec2 q;uniform float uTime;uniform vec3 color;uniform float seed;${noiseGLSL}void main(){vec2 p=q-.5;float edge=max(0.,1.-length(p*vec2(1.,1.5))*2.);float cloud=fbm(vec3(q*4.+vec2(uTime*.012,-uTime*.008),seed));float alpha=pow(edge,2.1)*smoothstep(.29,.72,cloud)*.31;gl_FragColor=vec4(color,alpha);}`});const m=new THREE.Mesh(new THREE.PlaneGeometry(48,31),mat);m.position.copy(v(d.position)).add(new THREE.Vector3(3,-2,-16));m.rotation.z=i*.7;scene.add(m);dustUniforms.push(uniforms);});}
function revealSystems(active,tl=null,duration=.9,at=0){if(active>=0&&meshes[active]&&!meshes[active].core.userData.loaded)buildExhibit(meshes[active].group,systems[active],active,meshes[active].core);meshes.forEach((m,i)=>{const reveal=active===i?1:0;const presence=active===-1||active===i?1:.045;if(tl)tl.to(m.state,{reveal,presence,duration,ease:'power2.inOut'},at);else Object.assign(m.state,{reveal,presence});});}

function clearTransit(){if(!transit)return;scene?.remove(transit);transit.geometry.dispose();transit.material.dispose();transit=null;}
function makeTransit(curve){const n=mobile?2400:5500,pos=new Float32Array(n*3);for(let k=0;k<n;k++){const t=(k+.5)/n,p=curve.getPoint(t),tangent=curve.getTangent(t),right=new THREE.Vector3().crossVectors(tangent,new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(right,tangent).normalize(),a=k*2.399963,r=.5+(k%41)/10;p.addScaledVector(right,Math.cos(a)*r);p.addScaledVector(up,Math.sin(a)*r);pos.set(p.toArray(),k*3);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));transit=new THREE.Points(g,new THREE.PointsMaterial({map:glowTexture,color:systems[index].accent,size:mobile?.14:.18,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));transit.frustumCulled=false;scene.add(transit);}
function buildGalaxy(){const n=mobile?3500:8000,pos=new Float32Array(n*3),col=new Float32Array(n*3);for(let k=0;k<n;k++){const t=k/n,a=t*Math.PI*19+(k%3)*Math.PI*2/3,r=Math.sqrt(t)*125;pos.set([Math.cos(a)*r,Math.sin(a)*r*.34+(Math.sin(k*31.7)*3),-310+Math.sin(a)*r*.35],k*3);const c=new THREE.Color(k%5===0?0x7c76df:0x5aa5ca);col.set([c.r,c.g,c.b],k*3);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));const galaxy=new THREE.Points(g,new THREE.PointsMaterial({map:glowTexture,size:.8,vertexColors:true,transparent:true,opacity:.6,fog:false,depthWrite:false,blending:THREE.AdditiveBlending}));galaxy.rotation.z=-.35;scene.add(galaxy);}
function init3D(){
 scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x03060f,.006);
 camera=new THREE.PerspectiveCamera(mobile?53:48,innerWidth/innerHeight,.1,1200);
 renderer=new THREE.WebGLRenderer({antialias:!mobile,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.2:1.6));renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0x03060f);renderer.outputColorSpace=THREE.SRGBColorSpace;$('#cosmos').append(renderer.domElement);
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();showFallback();});
 makePoints(mobile?6000:13000,'stars');water=createWaterIntro(renderer);
 systems.forEach(makeSystem);buildMist();buildGalaxy();
 const path=new THREE.CatmullRomCurve3(systems.map(d=>v(d.position)));const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.getPoints(200)),new THREE.LineDashedMaterial({color:0x5f9bd8,transparent:true,opacity:.17,dashSize:.5,gapSize:1.4}));line.computeLineDistances();scene.add(line);
 // Large translucent cloud sprites supply an atmospheric field behind each destination.
 systems.forEach((d,i)=>{for(let k=0;k<3;k++){const cloud=glow(d.color,50+k*13,.045);cloud.position.copy(v(d.position)).add(new THREE.Vector3((k-1)*12,8-k*7,-22-k*5));cloud.scale.x*=1.6;scene.add(cloud);}});
 const pos=destination(0);Object.assign(pose,pos);start();
}
function destination(i,wide=false){if(wide)return mobile?{x:25,y:360,z:-60,tx:0,ty:0,tz:-100}:{x:90,y:145,z:55,tx:0,ty:0,tz:-100};const p=systems[i].position;return mobile?{x:p[0],y:p[1]+2,z:p[2]+25.5,tx:p[0],ty:p[1]-5.7,tz:p[2]}:{x:p[0]+[.6,1.4,-.8,1.2,-.4,.6][i],y:p[1]+[1.3,1.7,.9,2.1,1.2,1.3][i],z:p[2]+16.7,tx:p[0]-3.1,ty:p[1],tz:p[2]};}
function projectLabels(){if(!camera)return;const storyTop=mobile&&!overview?$('#story').getBoundingClientRect().top:innerHeight;for(const l of labels){const visible=!opening&&!flying&&!detailState&&(overview?l.kind==='system':l.kind==='satellite'&&l.index===index);if(!visible){l.el.hidden=true;continue;}l.object.getWorldPosition(projected);if(l.kind==='satellite')projected.y-=.45;if(l.kind==='system')projected.y+=systems[l.index].radius+1.3;projected.project(camera);const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;const inView=projected.z<1&&x>15&&x<innerWidth-15&&y>(mobile?(overview?158:94):100)&&y<innerHeight-(mobile?100:95)&&(!mobile||overview||y+25<storyTop);l.el.hidden=!inView;if(inView){l.el.style.left=clamp(x,l.el.offsetWidth/2+8,innerWidth-l.el.offsetWidth/2-8)+'px';l.el.style.top=y+'px';}}}
function render(now){raf=0;if(paused)return;const interval=mobile?30:16;if(now-lastFrame<interval){raf=requestAnimationFrame(render);return;}lastFrame=now;const time=reduced.matches?0:now*.001;frames++;if(opening&&!entering&&!fallback&&water){water.update(time,pointer,reduced.matches);renderer.domElement.style.opacity='1';renderer.render(water.scene,water.camera);const entry = water.info();
 if (entry.imageReady) document.body.classList.add('has-water-frame');
 if (entry.labelReady) document.body.classList.add('cover-settled');raf=requestAnimationFrame(render);return;}if(!fallback){for(const u of dustUniforms){if(u.uTime)u.uTime.value=time;}planetMaterials.forEach(m=>m.uniforms.uTime.value=time);
if(camera&&!opening&&!flying&&!overview&&!detailState&&!reduced.matches){screenPointer.set(pointer.x*2,pointer.y*2);raycaster.setFromCamera(screenPointer,camera);interactionPlane.set(new THREE.Vector3(0,0,1),-systems[index].position[2]);const hit=raycaster.ray.intersectPlane(interactionPlane,interactionHit);if(hit){interaction.point.copy(hit);meshes[index].group.worldToLocal(interaction.point);const within=interaction.point.length()<systems[index].radius*2.5;interaction.strength+=(Number(within)-interaction.strength)*.13;}}else interaction.strength*=.85;
satellites.forEach(sats=>sats.forEach(sat=>sat.scale.setScalar(sat.userData.focus.scale)));
meshes.forEach((m,i)=>{
const r=m.state.reveal,profile=orbitProfiles[i];
// Distant stations fade to the ambient field and stop drawing when out of focus.
m.group.visible=m.state.presence>.05;
if(!m.group.visible)return;
if(i===4&&index===4&&r>.85&&m.core.userData.ready>0&&m.core.userData.galleryStarted===undefined)m.core.userData.galleryStarted=time;m.group.traverse(o=>{const mat=o.material;if(!mat)return;if(mat.uniforms?.uPresence)mat.uniforms.uPresence.value=m.state.presence;else if(mat.transparent&&!mat.isShaderMaterial){if(mat.userData.originalOpacity===undefined)mat.userData.originalOpacity=mat.opacity;mat.opacity=mat.userData.originalOpacity*m.state.presence;}});m.planet.material.uniforms.uReveal.value=r;m.planet.material.uniforms.uPointer.value.copy(interaction.point);m.planet.material.uniforms.uHover.value=i===index?interaction.strength:0;m.planet.rotation.y=reduced.matches?0:Math.sin(time*.16+i)*.05;
m.orbit.rotation.x=.69+(profile.tilt-.69)*r;
m.orbit.rotation.y=profile.yaw+Math.sin(time*.24+i)*.16*r;
m.orbit.scale.setScalar(1-.035*r);
m.orbit.rotation.z=profile.bank+Math.sin(time*.16+i)*.075;
const streamUniforms=m.streams.material.uniforms;
streamUniforms.uReveal.value=r;
streamUniforms.uHover.value=i===index?interaction.strength:0;
if(streamUniforms.uHover.value>.005){
 streamUniforms.uPointer.value.copy(interactionHit);
 m.streams.worldToLocal(streamUniforms.uPointer.value);
}
m.occluder.visible=r<.08&&m.state.presence>.5;m.occluder.scale.setScalar(1-r*.96);m.core.visible=r>.015&&!detailState;m.core.scale.setScalar(.42+.70*r);m.core.position.y=(1-r)*-.7+Math.sin(time*.65+i)*.09*r;m.core.rotation.y=(mobile?0:pointer.x*.14)*r;m.core.rotation.x=(mobile?0:-pointer.y*.08)*r;m.core.children.forEach((child,j)=>{if(!child.userData.exhibit)return;const rest=child.userData.rest;child.position.y=rest.position.y-(1-r)*(1.1+j*.3)+Math.sin(time*.7+j)*.025*r;child.position.z=rest.position.z-(1-r)*1.6;child.rotation.y=rest.rotation+(1-r)*.55+Math.sin(time*.36+j)*.075*r;child.rotation.x=Math.sin(time*.48+j)*.025*r;
if(child.userData.certificateIndex!==undefined){
 const cycle=Math.max(0,time-(m.core.userData.galleryStarted??time))/3.2,base=Math.floor(cycle),u=clamp(((cycle-base)-.60)/.40,0,1),phase=base+u*u*(3-2*u);
 const angle=(child.userData.certificateIndex-phase)*Math.PI*2/9,front=Math.cos(angle),focus=Math.max(0,front),fade=clamp((front-.08)/.35,0,1);
 child.visible=front>.08;child.position.set(Math.sin(angle)*1.9,-Math.abs(Math.sin(angle))*.12,.9+(front-1)*1.65);child.rotation.set(0,-angle,0);child.scale.setScalar(1.08);
 const order=100+Math.round((front+1)*20)*3;child.children.forEach((o,k)=>{o.renderOrder=order+(k===0?1:k===1?0:2);if(o.material){o.material.transparent=true;o.material.opacity=(o.material.userData.originalOpacity??.98)*m.state.presence*(.25+.75*focus)*fade;}});
}

});m.halo.material.opacity=(.085+r*.055)*m.state.presence;});animated.forEach((m,i)=>{m.rotation.y=time*.018*(i%2?1:-1);m.rotation.z=Math.sin(time*.07+i)*.04;});camera.position.set(pose.x+(flying||opening||reduced.matches?0:pointer.x*.22),pose.y+(flying||opening||reduced.matches?0:pointer.y*.12),pose.z);aim.set(pose.tx,pose.ty,pose.tz);camera.lookAt(aim);camera.rotateZ(effects.bank);const fov=(mobile?53:48)+effects.fov;if(Math.abs(camera.fov-fov)>.01){camera.fov=fov;camera.updateProjectionMatrix();}camera.updateMatrixWorld();renderer.render(scene,camera);if(opening&&water){water.update(time,pointer,reduced.matches);renderer.autoClear=false;renderer.clearDepth();renderer.render(water.scene,water.camera);renderer.autoClear=true;}projectLabels();}raf=requestAnimationFrame(render);}
function start(){if(!raf&&!paused)raf=requestAnimationFrame(render);}
function showFallback(){
  fallback = true;
  flying = false;
  cancelAnimationFrame(raf);
  raf = 0;
  flight?.kill();
  detailFlight?.kill();
  clearTransit();
  document.body.classList.add('fallback');
  document.body.classList.remove('is-loading', 'is-flying', 'has-water-frame', 'cover-settled');
  if (renderer) renderer.domElement.hidden = true;
  if (entering) finishOpening(index);
  if (detailState) gs.set('.detail-layout', {opacity:1, scale:1, filter:'none'});
  gs.set('.story-inner', {opacity:1, y:0, filter:'none'});
  enableEntry();
  setStory();
}
function setStory(){const d=systems[index];document.body.style.setProperty('--station-accent', colors[index]);updateSectionLinks(d);$('#chapter').textContent=d.chapter;$('#headline').innerHTML=d.title;$('#description').innerHTML=d.description;$('#achievement').textContent=d.achievement;$('#footnote').innerHTML=d.footnote;$('#explore span').textContent=index===0?'认识我与协作方法':index===5?'联系我':index===1||index===2?'查看功能与成果':index===3?'研究与协作':'探索这个星系';$('#next-inline').hidden=index===5;$('#next-inline span').textContent=index===0?'浏览作品':'下一站';$('#planet-title').textContent=d.name;$('#planet-caption span:last-child').textContent='点击卫星，进入展区';$('#flight-label').textContent=overview?'全景预览':d.name;$('#flight-count').textContent=String(index+1).padStart(2,'0')+' / 06';$('#prev').disabled=!overview&&index===0;$('#next').disabled=!overview&&index===5;$('#flight-progress').style.width=(index+1)/6*100+'%';$$('.route button').forEach((b,i)=>{if(i===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});$('#announcer').textContent=overview?'全景预览，选择星系进入':d.name;}
function finishFlight(){clearTransit();effects.phase=effects.bank=effects.fov=0;revealSystems(overview?-1:index);flying=false;document.body.classList.remove('is-flying');$('#flight-label').textContent=overview?'全景预览':systems[index].name;}
function travel(target,wide){
 flight?.kill();clearTransit();gs.killTweensOf('.story-inner');flying=true;document.body.classList.add('is-flying');$('#flight-label').textContent=wide?'正在拉远视角':'正在前往 '+systems[index].name;
 const duration=reduced.matches||fallback?0:wide?2:2.2;const fromEffects={...effects};const from={...pose};const mid={x:(from.x+target.x)*.5+(wide?15:6),y:Math.max(from.y,target.y)+(wide?10:3.6),z:(from.z+target.z)*.5+(wide?12:6)};const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(from.x,from.y,from.z),new THREE.Vector3(mid.x,mid.y,mid.z),new THREE.Vector3(target.x,target.y,target.z)]);const progress={t:0};if(duration&&!wide&&!fallback)makeTransit(curve);
 flight=gs.timeline({onComplete:()=>{Object.assign(pose,target);finishFlight();if(detailState)focusSatellite(detailState.i,detailState.j);}});revealSystems(wide?-1:index,flight,duration?1.15:0,duration?(wide?0:.58):0);flight.to(progress,{t:1,duration,ease:'power2.inOut',onUpdate:()=>{const envelope=Math.sin(progress.t*Math.PI);effects.phase=envelope;effects.bank=fromEffects.bank*(1-progress.t)+(wide?-.025:.045)*envelope*(index%2?1:-1);effects.fov=fromEffects.fov*(1-progress.t)+(wide?4:8)*envelope;if(transit)transit.material.opacity=Math.pow(envelope,.65)*.65;const point=curve.getPoint(progress.t);pose.x=point.x;pose.y=point.y;pose.z=point.z;const f=progress.t;pose.tx=from.tx+(target.tx-from.tx)*f;pose.ty=from.ty+(target.ty-from.ty)*f;pose.tz=from.tz+(target.tz-from.tz)*f;}},0);
 if(!wide){flight.to('.story-inner',{opacity:1,y:0,filter:'blur(0px)',duration:duration?.55:0,ease:'power2.out'},Math.max(0,duration-.5));}return flight;
}
function go(i){if($('#details').open||$('#proof').open||opening)return;i=clamp(i,0,5);if(i===index&&!overview&&!flying)return;index=i;overview=false;document.body.classList.remove('is-overview');$('#overview-copy').hidden=true;$('#story').hidden=false;$('#overview span').textContent='全景预览';$('#overview').setAttribute('aria-pressed','false');gs.set('.story-inner',{opacity:0,y:0,filter:'none'});setStory();history.replaceState(null,'','#'+systems[index].id);travel(destination(i),false);}
function toggleOverview(){if(opening)return;if($('#details').open)return;if(overview){go(index);return;}overview=true;document.body.classList.add('is-overview');$('#story').hidden=true;$('#overview-copy').hidden=false;$('#overview span').textContent='返回近景';$('#overview').setAttribute('aria-pressed','true');setStory();travel(destination(index,true),true);}
function finishOpening(destinationIndex = 0){
  flight?.kill();
  clearTransit();
  opening = false;
  entering = false;
  effects.phase = effects.bank = effects.fov = 0;
  water?.dispose();
  water = null;
  document.body.classList.remove('is-opening', 'has-water-frame', 'cover-settled');
  $('#launch').hidden = true;
  $('#experience').inert = false;
  index = destinationIndex;
  history.replaceState(null, '', '#' + systems[index].id);
  Object.assign(pose, destination(index));
  if (!fallback) revealSystems(index);
  setStory();
  gs.fromTo('.story-inner', {opacity:0,y:0}, {opacity:1,y:0,filter:'none',duration:reduced.matches?0:.42,ease:'power2.out'});
  $('#headline').focus({preventScroll:true});
}
function enableEntry(){
  $('#enter-universe').disabled = false;
  $('#meet-entry').disabled = false;
  if (linkedSystem > 0) $('#enter-universe').firstChild.nodeValue = '进入' + systems[linkedSystem].name;
}
function openingSequence(){
  document.body.classList.remove('is-loading');
  $('#experience').inert = true;
  enableEntry();
  Object.assign(pose, destination(0));
  revealSystems(-1);
}
function enterUniverse(){
  if (!opening || entering) return;
  const requested = Math.max(0, linkedSystem);
  if (reduced.matches || fallback || requested > 0 || !water?.info().imageReady) {
    finishOpening(requested);
    return;
  }
  entering = true;
  $('#enter-universe').disabled = true;
  $('#meet-entry').disabled = true;
  const arrival = destination(0);
  Object.assign(pose, {...arrival, x:arrival.x + (mobile ? 1.5 : 3.4), y:arrival.y + 1.9, z:arrival.z + 9.5});
  const cover = gs.timeline({onComplete: () => finishOpening(0)});
  flight = cover;
  cover.to('#launch', {opacity:0, duration:.87, ease:'power2.out'}, 0);
  cover.to(water.state, {exit:1, duration:1.42, ease:'power2.inOut'}, .09);
  cover.to(pose, {...arrival, duration:1.78, ease:'power2.inOut'}, .04);
  revealSystems(0, cover, .98, .46);
}
function focusSatellite(i,j){
 detailFlight?.kill();gs.set('.detail-layout',{opacity:1,scale:1,filter:'none'});const sg=satellites[i]?.[j];if(!sg||fallback)return;sg.getWorldPosition(projected);const point=projected.clone();
 const target=mobile?{x:point.x,y:point.y+1,z:point.z+9,tx:point.x,ty:point.y-1,tz:point.z}:{x:point.x+.8,y:point.y+.8,z:point.z+8.6,tx:point.x+2.3,ty:point.y,tz:point.z};
 detailFlight=gs.timeline();detailFlight.to(pose,{...target,duration:reduced.matches?0:1.15,ease:'power3.inOut'},0);satellites[i].forEach((sat,k)=>detailFlight.to(sat.userData.focus,{scale:k===j?13:1,duration:reduced.matches?0:1.15,ease:'power3.inOut'},0));
 if(!reduced.matches)detailFlight.fromTo('.detail-layout',{opacity:0,scale:.92,filter:'blur(10px)'},{opacity:1,scale:1,filter:'blur(0px)',duration:.65,ease:'power3.out'},.5);
}
function openDetail(i,section=0){if(flying||opening||detailState)return;const d=systems[i];detailState={i,j:section,returnPose:{...pose}};document.body.classList.add('is-detail');$('#detail-location').textContent=d.name;$('#detail-tabs').replaceChildren();d.sections.forEach((s,j)=>{const b=document.createElement('button');b.textContent=s.label;b.setAttribute('role','tab');b.id='detail-tab-'+j;b.setAttribute('aria-controls','detail-content');b.onclick=()=>{detailState.j=j;renderDetail(i,j);focusSatellite(i,j);};$('#detail-tabs').append(b);});renderDetail(i,section);$('#details').showModal();focusSatellite(i,section);}
function leaveDetail(){if(!detailState)return;detailFlight?.kill();detailExhibit?.destroy();detailExhibit=null;const current=detailState;detailState=null;document.body.classList.remove('is-detail');flying=true;document.body.classList.add('is-flying');detailFlight=gs.timeline({onComplete:()=>{flying=false;document.body.classList.remove('is-flying');lastWheel=0;}});detailFlight.to(pose,{...current.returnPose,duration:reduced.matches?0:.75,ease:'power3.inOut'},0);satellites[current.i]?.forEach(sat=>detailFlight.to(sat.userData.focus,{scale:1,duration:reduced.matches?0:.75},0));}
function renderDetail(i,j){const d=systems[i],s=d.sections[j];$$('#detail-tabs button').forEach((b,k)=>{b.setAttribute('aria-selected',String(k===j));b.tabIndex=k===j?0:-1;});const div=$('#detail-content');div.setAttribute('role','tabpanel');div.setAttribute('aria-labelledby','detail-tab-'+j);div.innerHTML=`<h2 id="detail-title">${s.title}</h2>`+(s.text?`<p>${s.text}</p>`:'')+(s.facts?'<dl class="project-facts">'+s.facts.map(a=>`<div><dt>${a[0]}</dt><dd>${a[1]}</dd></div>`).join('')+'</dl>':'')+(s.tags?'<div class="tag-row">'+s.tags.map(t=>`<span>${t}</span>`).join('')+'</div>':'')+(s.steps?s.steps.map(a=>`<h3>${a[0]}</h3><p>${a[1]}</p>`).join(''):'')+(s.bullets?'<ul>'+s.bullets.map(b=>`<li>${b}</li>`).join('')+'</ul>':'')+(s.proof?`<button class="proof-button" data-proof="${s.proof}">进入证书展厅</button>`:'')+(s.contact?'<p><a class="contact-email" href="mailto:3282016034@qq.com">3282016034@qq.com</a></p><button class="copy-button">复制邮箱</button>':'');if(s.awards){const grid=document.createElement('div');grid.className='award-list';certificateData.filter(c=>c.category==='competition').forEach(c=>{const a=document.createElement('article');a.className='award-entry';a.innerHTML=`<h3>${c.title}</h3><strong>${c.id==='robot-vision-third'?'智能机器人视觉系统挑战赛初赛三等奖':c.award}</strong><p>${c.context} ${c.experience}</p><button class="proof-button" data-proof="${c.id}">查看证书</button>`;grid.append(a);});grid.insertAdjacentHTML('beforeend','<article class="award-entry"><h3>高教社杯全国大学生数学建模竞赛</h3><strong>广东省二等奖</strong><p>将实际问题转化为可分析的模型，实践数学建模与问题求解。</p></article>');div.append(grid);}detailExhibit?.destroy();const visual=$('#detail-visual');visual.className='detail-visual';if((s.proof||i===4)&&certificateData.length){detailExhibit=certificateGallery(visual,certificateData,s.proof||(i===4&&j===1?'outsourcing-national-third':undefined));}else detailExhibit=projectExhibit(visual,d,j);$('#detail-scroll').scrollTop=0;$('.detail-layout').scrollTop=0;if(reduced.matches)gs.set('#detail-content',{opacity:1,y:0});if(!reduced.matches)gs.fromTo('#detail-content',{opacity:.15,y:12},{opacity:1,y:0,duration:.3,ease:'power2.out',overwrite:true});}
function toast(t){$('#toast').textContent=t;gs.to('#toast',{opacity:1,duration:.2});gs.to('#toast',{opacity:0,duration:.3,delay:2.5});}
fetch('assets/certificates.json').then(r=>r.json()).then(data=>{certificateData=data;if(detailState)renderDetail(detailState.i,detailState.j);}).catch(()=>toast('证书资料暂未加载，请稍后重试'));
$('#close-detail').onclick=()=>$('#details').close();$('#details').addEventListener('close',leaveDetail);$('#proof').addEventListener('close',()=>{proofExhibit?.destroy();proofExhibit=null;});$('#close-proof').onclick=()=>$('#proof').close();$$('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const b=d.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)d.close();}});d.addEventListener('close',()=>{lastWheel=0;});});
document.addEventListener('click',async e=>{const goBtn=e.target.closest('[data-go]');if(goBtn)go(+goBtn.dataset.go);const proof=e.target.closest('[data-proof]');if(proof){const c=certificateData.find(x=>x.id===proof.dataset.proof);if(!c){toast('证书正在加载，请稍后再试');return;}$('#proof-title').textContent='荣誉星环 · 证书展厅';proofExhibit?.destroy();proofExhibit=certificateGallery($('#proof-gallery'),certificateData,c.id);$('#proof').showModal();if(!reduced.matches)gs.fromTo('#proof',{scale:.9,opacity:0},{scale:1,opacity:1,duration:.7,ease:'power3.out',overwrite:true});}if(e.target.closest('.copy-button'))try{await navigator.clipboard.writeText('3282016034@qq.com');toast('邮箱已复制');}catch{toast('邮箱：3282016034@qq.com');}});
$('#cosmos').addEventListener('click',e=>{if(flying||opening||overview||fallback||$('#details').open)return;screenPointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(screenPointer,camera);const hit=raycaster.intersectObjects(clickObjects).find(x=>x.object.userData.system===index&&x.object.parent.visible&&meshes[index].core.visible);if(hit)openDetail(index,hit.object.userData.section);});
$('#detail-tabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const tabs=$$('#detail-tabs button'),at=tabs.indexOf(document.activeElement),next=(at+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();});
systems.forEach((system, i) => {
  const button = document.createElement('button');
  button.dataset.go = i;
  button.setAttribute('aria-label', system.name);
  $('#route').append(button);
  const indexButton = document.createElement('button');
  indexButton.dataset.go = i;
  indexButton.textContent = system.name;
  indexButton.style.setProperty('--item-accent', colors[i]);
  $('#overview-index').append(indexButton);
});

function updateSectionLinks(system){
  const links = system.sections.map((section, i) => {
    const button = document.createElement('button');
    button.textContent = section.label;
    button.onclick = () => openDetail(index, i);
    return button;
  });
  $('#section-links').replaceChildren(...links);
  $('#story').scrollTop = 0;
}
$('#meet-entry').onclick=()=>{if(!opening||entering)return;water?.complete();finishOpening();openDetail(0,0);};$('#overview').onclick=toggleOverview;$('#prev').onclick=()=>overview?go(index):go(index-1);$('#next').onclick=()=>overview?go(index):go(index+1);$('#next-inline').onclick=()=>go(index+1);$('#explore').onclick=()=>openDetail(index,0);$('#enter-universe').onclick=enterUniverse;
addEventListener('wheel',e=>{if($('#details').open||$('#proof').open||canScrollStory(e.target,e.deltaY)||e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;if(e.cancelable)e.preventDefault();if(Math.abs(e.deltaY)<2)return;const now=performance.now(),gap=now-lastWheel,dir=Math.sign(e.deltaY),mag=Math.abs(e.deltaY),fresh=dir!==wheelDir||gap>850||(gap>210&&mag>=wheelMagnitude);lastWheel=now;wheelDir=dir;wheelMagnitude=mag;if(opening)return;if(flying||overview||!fresh)return;go(index+dir);},{passive:false});
function canScrollStory(target, delta){
  if (flying) return false;
  const story = target.closest('#story');
  if (!story || story.scrollHeight <= story.clientHeight + 4) return false;
  if (!delta) return true;
  return delta < 0 ? story.scrollTop > 0 : story.scrollTop + story.clientHeight < story.scrollHeight - 2;
}
let touch=null;addEventListener('touchstart',e=>{if(e.target.closest('dialog')||canScrollStory(e.target)||e.touches.length!==1)return;touch={x:e.touches[0].clientX,y:e.touches[0].clientY,fired:false};},{passive:true});addEventListener('touchmove',e=>{if(!touch||e.target.closest('dialog'))return;const dx=e.touches[0].clientX-touch.x,dy=e.touches[0].clientY-touch.y;if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){if(e.cancelable)e.preventDefault();if(!touch.fired&&Math.abs(dy)>25){touch.fired=true;if(!opening&&!flying&&!overview)go(index+(dy<0?1:-1));}}},{passive:false});addEventListener('touchend',()=>touch=null,{passive:true});
addEventListener('keydown', event => {
  if (opening || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('dialog,input,textarea,select,[contenteditable]')) return;
  const key = event.key;
  if (key === 'Escape') {
    if (overview) go(index);
    return;
  }
  if (!['ArrowDown','PageDown','ArrowUp','PageUp','Home','End',' '].includes(key)) return;
  if (key === ' ' && event.target.closest('button,a')) return;
  const story = $('#story');
  if (story.contains(event.target) && story.scrollHeight > story.clientHeight + 4 && ['ArrowDown','ArrowUp','PageDown','PageUp'].includes(key)) return;
  event.preventDefault();
  if (key === 'Home') go(0);
  else if (key === 'End') go(systems.length-1);
  else if (!flying && !overview) go(index + (['ArrowDown','PageDown',' '].includes(key) ? 1 : -1));
});
addEventListener('pointermove',e=>{pointer.x=e.clientX/innerWidth-.5;pointer.y=.5-e.clientY/innerHeight;},{passive:true});
addEventListener('resize',()=>{mobile=innerWidth<701;if(renderer){renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.2:1.6));camera.aspect=innerWidth/innerHeight;camera.fov=mobile?53:48;camera.updateProjectionMatrix();water?.resize();dustUniforms.forEach(u=>{if(u.uScale)u.uScale.value=innerHeight*(devicePixelRatio>1?1.2:1);});}satellites.forEach((sats,i)=>sats.forEach((sat,j)=>sat.position.set(...satellitePosition(i,j))));planetMaterials.forEach(m=>m.uniforms.uScale.value=innerHeight*1.35);if(detailState)focusSatellite(detailState.i,detailState.j);else if(!opening&&!flying)Object.assign(pose,destination(index,overview));},{passive:true});
document.addEventListener('visibilitychange',()=>{paused=document.hidden;if(paused){cancelAnimationFrame(raf);raf=0;}else start();});reduced.addEventListener('change',()=>{if(reduced.matches){if(opening){if(entering)finishOpening();return;}flight?.kill();Object.assign(pose,destination(index,overview));finishFlight();if(detailState)focusSatellite(detailState.i,detailState.j);}});
window.universe={enter:enterUniverse,go,overview:toggleOverview,skip:()=>finishOpening(),detail:openDetail,getState:()=>({version:'personal-3',certificates:{ready:meshes[4]?.core.userData.ready||0,failed:meshes[4]?.core.userData.failed||[],cards:meshes[4]?.core.children.filter(c=>c.userData.certificateIndex!==undefined).map(c=>({index:c.userData.certificateIndex,visible:c.visible,ready:c.userData.ready,opacity:c.children[0]?.material.opacity,world:c.position.toArray()}))||[]},water:water?.info()||null,entering,detail:detailState?{i:detailState.i,j:detailState.j}:null,hover:interaction.strength,transition:{...effects},index,overview,flying,opening,fallback,frames,position:{x:pose.x,y:pose.y,z:pose.z},systems:systems.length,renderer:renderer?.info.render.calls,resources:renderer?{...renderer.info.memory}:null,reveal:meshes.map(m=>Number(m.state.reveal.toFixed(3)))})};
setStory();try{init3D();openingSequence();}catch(e){console.error(e);showFallback();}
