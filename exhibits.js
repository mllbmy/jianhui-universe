import GSAP from './assets/vendor/gsap.module.js';
// Spatial exhibit layouts and an accessible, gesture-driven certificate orbit.
const gs=GSAP.gsap, reduced=matchMedia('(prefers-reduced-motion: reduce)');
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function certificateGallery(host, certificates, initialId) {
 const priority = ['mati-national-silver', 'outsourcing-national-third', 'soundlane-mobile-first'];
 const rank = certificate => {
  const position = priority.indexOf(certificate.id);
  return position < 0 ? priority.length : position;
 };
 const list = certificates.filter(certificate => certificate.image).sort((a, b) => rank(a) - rank(b));
 if (!list.length) {
  host.replaceChildren();
  return {destroy() {}, select() {}};
 }

 let index = Math.max(0, list.findIndex(certificate => certificate.id === initialId));
 let displayedIndex = index;
 let angle = index;
 let wide = false;
 let drag = null;
 let suppressPointerClick = false;
 let playback = null;
 let lightbox = null;
 const motion = {angle};
 const award = certificate => certificate.id === 'robot-vision-third'
  ? '智能机器人视觉系统挑战赛初赛三等奖'
  : certificate.award;

 host.classList.add('certificate-exhibit');
 host.innerHTML = `<div class="certificate-space" role="group" tabindex="0" aria-label="证书三维展览，可用左右方向键切换">
  <div class="certificate-horizon" aria-hidden="true"></div><div class="certificate-orbit"></div>
 </div>
 <div class="certificate-controls">
  <div class="certificate-pagination" role="group" aria-label="切换证书">
   <button class="cert-prev" aria-label="上一张证书"></button>
   <span class="certificate-count"></span>
   <button class="cert-next" aria-label="下一张证书"></button>
  </div>
  <button class="cert-play" aria-pressed="false">自动轮播</button>
  <button class="cert-wide" aria-pressed="false">全部预览</button>
 </div>
 <div class="certificate-caption">
  <div class="certificate-copy" aria-live="polite"></div>
  <button class="cert-original">查看证书原图</button>
 </div>
 <div class="certificate-grid" hidden></div>`;
 const q = selector => host.querySelector(selector);
 const space = q('.certificate-space');
 const orbit = q('.certificate-orbit');
 const grid = q('.certificate-grid');
 const navigation = q('.certificate-pagination');
 const caption = q('.certificate-caption');
 const captionCopy = q('.certificate-copy');
 const count = q('.certificate-count');
 const playbackButton = q('.cert-play');
 const wideButton = q('.cert-wide');
 const originalButton = q('.cert-original');

 const cards = list.map((certificate, position) => {
  const card = document.createElement('button');
  card.className = 'certificate-card';
  card.innerHTML = `<img src="${esc(certificate.image)}" alt="" draggable="false" decoding="async">`;
  card.onclick = event => {
   if (suppressPointerClick && event.detail > 0) return;
   if (position === displayedIndex) inspect(certificate);
   else select(position);
  };
  orbit.append(card);

  const thumbnail = document.createElement('button');
  thumbnail.className = 'certificate-thumb';
  thumbnail.innerHTML = `<img src="${esc(certificate.image)}" alt="" loading="lazy" decoding="async">
   <strong>${esc(award(certificate))}</strong><span>${esc(certificate.title)}</span>`;
  thumbnail.onclick = () => {
   showOverview(false);
   select(position);
   originalButton.focus({preventScroll: true});
  };
  grid.append(thumbnail);
  return card;
 });

 function inspect(certificate) {
  if (lightbox?.open) return;
  setPlaying(false);
  lightbox = document.createElement('dialog');
  lightbox.className = 'certificate-original';
  lightbox.setAttribute('aria-label', `证书原图：${certificate.title}`);
  lightbox.innerHTML = `<button class="original-close" autofocus>关闭原图</button>
   <img src="${esc(certificate.image)}" alt="${esc(certificate.title + '，' + award(certificate))}">
   <p>${esc(certificate.title)} · ${esc(award(certificate))}</p>`;
  host.append(lightbox);
  lightbox.querySelector('button').onclick = () => lightbox.close();
  lightbox.addEventListener('close', event => {
   event.currentTarget.remove();
   lightbox = null;
  }, {once: true});
  lightbox.showModal();
 }

 function layout() {
  const width = space.clientWidth;
  const height = space.clientHeight;
  if (!width || !height) return;

  const maxHeight = Math.min(320, height * .8);
  const maxWidth = Math.min(284, width * .46);
  const radius = Math.max(0, (width - maxWidth) * .5 - 16);
  const step = Math.PI * 2 / list.length;
  cards.forEach((card, position) => {
   const ratio = list[position].width / list[position].height;
   const cardWidth = Math.min(maxWidth, maxHeight * ratio);
   const offset = (position - angle) * step;
   const front = Math.cos(offset);
   const x = Math.sin(offset) * radius;
   const z = (front - 1) * radius * .8;
   const focus = Math.max(0, front);
   const fade = Math.max(0, Math.min(1, (front - .08) / .35));
   card.style.width = cardWidth + 'px';
   card.style.height = cardWidth / ratio + 'px';
   card.style.transform = `translate(-50%, -50%) translate3d(${x}px,${Math.sin(offset) * -8}px,${z}px) rotateY(${-offset * 180 / Math.PI}deg)`;
   card.style.opacity = String((.25 + .75 * focus) * fade);
   card.style.zIndex = String(Math.round(100 + front * 100));
   card.style.filter = `brightness(${.55 + .45 * focus})`;
   card.style.visibility = front < .12 && position !== displayedIndex ? 'hidden' : 'visible';
   card.style.pointerEvents = front < .12 ? 'none' : 'auto';
   card.tabIndex = position === displayedIndex ? 0 : -1;
   card.setAttribute('aria-current', String(position === displayedIndex));
  });
 }

 function renderCaption() {
  const certificate = list[displayedIndex];
  count.textContent = `${displayedIndex + 1} / ${list.length}`;
  count.setAttribute('aria-label', `第 ${displayedIndex + 1} 张，共 ${list.length} 张`);
  captionCopy.innerHTML = `<h3>${esc(certificate.title)}</h3><strong>${esc(award(certificate))}</strong>
   <p>${esc(certificate.context)} ${esc(certificate.experience)}</p>`;
  caption.scrollTop = 0;
  cards.forEach((card, position) => {
   const action = position === displayedIndex ? '查看原图' : '切换到';
   card.setAttribute('aria-label', `${action} ${list[position].title}，${award(list[position])}`);
  });
 }

 function select(position, manual = true) {
  if (manual) setPlaying(false);
  index = (position % list.length + list.length) % list.length;
  const offset = index - angle;
  const half = list.length * .5;
  const nearest = angle + ((offset % list.length + list.length * 1.5) % list.length - half);
  gs.killTweensOf(motion);
  motion.angle = angle;
  const settle = () => {
   angle = nearest;
   displayedIndex = index;
   layout();
   renderCaption();
  };
  if (reduced.matches || Math.abs(nearest - angle) < .001) {
   settle();
  } else {
   gs.to(motion, {angle: nearest, duration: .62, ease: 'power3.inOut', onUpdate() {
    angle = motion.angle;
    layout();
   }, onComplete: settle});
  }
 }

 function showOverview(next) {
  setPlaying(false);
  wide = next;
  space.hidden = wide;
  grid.hidden = !wide;
  caption.hidden = wide;
  navigation.hidden = wide;
  playbackButton.hidden = wide;
  wideButton.textContent = wide ? '返回三维展厅' : '全部预览';
  wideButton.setAttribute('aria-pressed', String(wide));
  host.classList.toggle('gallery-wide', wide);
  host.scrollTop = 0;
  grid.scrollTop = 0;
  const detailLayout = host.closest('.detail-layout');
  if (detailLayout) detailLayout.scrollTop = 0;
  if (!wide) layout();
 }

 function setPlaying(play) {
  clearInterval(playback);
  playback = null;
  if (play && !reduced.matches) {
   playback = setInterval(() => {
    if (!document.hidden && !space.matches(':hover') && !space.contains(document.activeElement) && !drag) {
     select(index + 1, false);
    }
   }, 3200);
  }
  playbackButton.textContent = playback ? '暂停轮播' : '自动轮播';
  playbackButton.setAttribute('aria-pressed', String(Boolean(playback)));
  playbackButton.disabled = reduced.matches;
 }

 const motionPreference = () => {
  setPlaying(false);
  if (reduced.matches) select(index);
 };
 reduced.addEventListener('change', motionPreference);
 setPlaying(false);
 playbackButton.onclick = () => setPlaying(!playback);
 q('.cert-prev').onclick = () => select(index - 1);
 q('.cert-next').onclick = () => select(index + 1);
 wideButton.onclick = () => showOverview(!wide);
 originalButton.onclick = () => inspect(list[displayedIndex]);

 space.onkeydown = event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  event.stopPropagation();
  // Move focus off a rotating card before it disappears behind the orbit.
  space.focus({preventScroll: true});
  select(index + (event.key === 'ArrowRight' ? 1 : -1));
 };
 space.onpointerdown = event => {
  if (!event.isPrimary || event.button !== 0) return;
  suppressPointerClick = false;
  drag = {id: event.pointerId, x: event.clientX, y: event.clientY, start: angle, active: false};
 };
 space.onpointermove = event => {
  if (drag?.id !== event.pointerId) return;
  const dx = event.clientX - drag.x;
  const dy = event.clientY - drag.y;
  if (!drag.active && Math.abs(dx) > Math.max(7, Math.abs(dy))) {
   setPlaying(false);
   gs.killTweensOf(motion);
   suppressPointerClick = true;
   drag.active = true;
   space.setPointerCapture(event.pointerId);
  }
  if (drag.active) {
   angle = drag.start - dx / 100;
   layout();
  }
 };
 space.onpointerup = event => {
  if (drag?.id !== event.pointerId) return;
  const wasDragging = drag.active;
  drag = null;
  if (space.hasPointerCapture(event.pointerId)) space.releasePointerCapture(event.pointerId);
  if (wasDragging) select(Math.round(angle));
 };
 const cancelDrag = event => {
  if (drag?.id !== event.pointerId) return;
  const wasDragging = drag.active;
  drag = null;
  if (wasDragging) select(index);
 };
 space.onpointercancel = cancelDrag;
 space.onlostpointercapture = event => {
  if (event.target === space) cancelDrag(event);
 };
 space.onpointerleave = event => {
  if (drag && !drag.active) cancelDrag(event);
 };

 const observer = new ResizeObserver(layout);
 observer.observe(space);
 layout();
 renderCaption();
 return {select, destroy() {
  reduced.removeEventListener('change', motionPreference);
  clearInterval(playback);
  gs.killTweensOf(motion);
  observer.disconnect();
  if (lightbox?.open) lightbox.close();
  host.classList.remove('certificate-exhibit', 'gallery-wide');
 }};
}

export function projectExhibit(host,system,section){
 host.className='detail-visual';host.innerHTML='';const d=system.sections[section];
 if(system.id==='career'&&section===0){host.innerHTML=`<div class="screen-showcase"><div class="screen-aura"></div><figure class="floating-browser"><div class="browser-bar"><i></i><i></i><i></i><span>职业规划智能体</span></div><img src="assets/images/career-live.webp" alt="职业规划智能体实际界面"><figcaption>独立开发 · 从企业命题到可运行网站</figcaption></figure><span class="exhibit-orbit orbit-one"></span><span class="exhibit-orbit orbit-two"></span></div>`;}
 else if(system.id==='soundlane'&&section===0){host.innerHTML=`<div class="phone-showcase">${['guard','home','navigation'].map((p,i)=>`<figure class="floating-phone phone-${i}"><img src="assets/images/soundlane-${p}.webp" alt="SoundLane ${['守护人','首页','导航'][i]}界面"><figcaption>${['守护人协同','语音交互','导航反馈'][i]}</figcaption></figure>`).join('')}<span class="sound-wave wave-one"></span><span class="sound-wave wave-two"></span></div>`;}
 else if(d.steps){host.innerHTML=`<div class="process-constellation">${d.steps.map((a,k)=>`<div class="process-node" style="--n:${k}"><span>${String(k+1).padStart(2,'0')}</span><h3>${esc(a[0])}</h3></div>`).join('')}<div class="process-path"></div></div>`;}
 else{host.innerHTML=`<div class="word-sculpture"><span>${esc(system.id==='research'?'探索 · 验证':system.id==='contact'?'连接 · 共创':'思考 · 构建')}</span><h2>${esc(d.label)}</h2><div class="sculpture-ring"></div><div class="sculpture-ring second"></div></div>`;}
 const elements=[...host.children];if(!reduced.matches)gs.fromTo(elements,{opacity:0,rotationY:-12,z:-120},{opacity:1,rotationY:0,z:0,duration:.8,ease:'power3.out',onComplete:()=>gs.set(elements,{clearProps:'transform,opacity'})});
 const move=e=>{if(reduced.matches||e.pointerType==='touch')return;const b=host.getBoundingClientRect();host.style.setProperty('--rx',((e.clientY-b.top)/b.height-.5)*-10+'deg');host.style.setProperty('--ry',((e.clientX-b.left)/b.width-.5)*12+'deg');};host.addEventListener('pointermove',move);host.onpointerleave=()=>{host.style.setProperty('--rx','0deg');host.style.setProperty('--ry','0deg');};
 return {destroy(){gs.killTweensOf(elements);host.removeEventListener('pointermove',move);}};
}
