// Illustrative offers only. Nothing in this gallery writes to the restaurant's Sheet.
const offers = [
  {name:'Don Pedro',price:'$100',description:'Orange juice, gin & Sprite.',hero:'media/don-pedro.webp',thumb:'media/demo-don-pedro-thumb.webp',heroBytes:47810,thumbBytes:6918,kind:'DRINK'},
  {name:'Al pastor tacos',price:'$150',description:'Three corn tortillas with marinated pork, onion, cilantro & lime.',hero:'media/demo-tacos-al-pastor.webp',thumb:'media/demo-tacos-al-pastor-thumb.webp',heroBytes:74252,thumbBytes:11772,kind:'FOOD'},
  {name:'Churros & chocolate',price:'$75',description:'Cinnamon-sugar churros with a little chocolate for dipping.',hero:'media/demo-churros.webp',thumb:'media/demo-churros-thumb.webp',heroBytes:90512,thumbBytes:11352,kind:'SOMETHING SWEET'},
  {name:'Tequila lime soda',price:'$100',description:'Tequila, fresh lime & sparkling soda over ice.',hero:'media/demo-lime-tequila-soda.webp',thumb:'media/demo-lime-tequila-soda-thumb.webp',heroBytes:67686,thumbBytes:8754,kind:'DRINK'},
  {name:'Street corn',price:'$65',description:'Grilled corn, crema, cotija, chili & lime.',hero:'media/demo-street-corn.webp',thumb:'media/demo-street-corn-thumb.webp',heroBytes:88672,thumbBytes:13214,kind:'A LITTLE EXTRA'}
];
const designs = document.querySelector('#designs');
const panels = [...document.querySelectorAll('[data-panel]')];
const names = ['Focus','Quick list','Spotlight'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let active = 0;
let count = 3;
let imageObserver;
let scrollFrame;
let renderFrame;
let rendering=false;
const escapeText = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function item(offer,index,layout) {
  const large = layout === 0 || (layout === 2 && index === 0);
  const classes = layout === 2 ? (index === 0 ? ' featured' : ' compact') : '';
  return `<article class="demo-item${classes}"><div class="demo-photo"><img data-src="${escapeText(large ? offer.hero : offer.thumb)}" width="${large ? 800 : 240}" height="${large ? 1000 : 300}" alt="${escapeText(offer.name)} · demo photo" decoding="async" /></div><div class="offer-copy"><p class="offer-meta">${index === 0 ? 'TODAY’S PICK' : escapeText(offer.kind)} · DEMO</p><div class="offer-title"><h3>${escapeText(offer.name)}</h3><span class="offer-price">${escapeText(offer.price)}</span></div><p class="offer-description">${escapeText(offer.description)}</p><p class="server-note">Ask your server to order · sample offer</p></div></article>`;
}
function loadImage(image) {
  if (image.hasAttribute('src')) return;
  image.src = image.dataset.src;
  image.onerror = () => {image.hidden=true;};
}
function activateImages() {
  imageObserver?.disconnect();
  const root = panels[active].querySelector('.preview-content');
  const images = [...root.querySelectorAll('img[data-src]')];
  imageObserver = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {loadImage(entry.target);imageObserver.unobserve(entry.target);}
  },{root,rootMargin:'60px 0px'});
  images.forEach((image,index) => {
    image.loading = 'lazy';
    if (index === 0) {image.loading='eager';image.fetchPriority='high';loadImage(image);}
    else imageObserver.observe(image);
  });
}
function render() {
  rendering=true;
  designs.style.scrollSnapType='none';
  imageObserver?.disconnect();
  ['focusMenu','quickMenu','spotlightMenu'].forEach((id,layout) => {
    const target=document.getElementById(id);
    target.innerHTML=offers.slice(0,count).map((offer,index) => item(offer,index,layout)).join('');
    target.scrollTop=0;
  });
  document.querySelectorAll('.count-label').forEach(label => {label.textContent=`${count} demo offer${count===1?'':'s'}`;});
  cancelAnimationFrame(renderFrame);
  renderFrame=requestAnimationFrame(() => {
    designs.scrollTo({left:active*designs.clientWidth,behavior:'instant'});
    designs.style.scrollSnapType='x mandatory';
    rendering=false;
    updateDesign(active);activateImages();
  });
}
function updateDesign(index) {
  const changed=active!==index;
  active=index;
  document.querySelectorAll('[data-layout]').forEach(button => {button.setAttribute('aria-current',String(Number(button.dataset.layout)===active));});
  document.querySelector('#previousDesign').disabled=active===0;
  document.querySelector('#nextDesign').disabled=active===panels.length-1;
  document.querySelector('#designStatus').textContent=`Design ${active+1} of ${panels.length} · ${names[active]}`;
  if(changed) activateImages();
}
function goTo(index) {
  index=Math.max(0,Math.min(index,panels.length-1));
  updateDesign(index);
  designs.scrollTo({left:index*designs.clientWidth,behavior:reduced.matches?'instant':'smooth'});
}
document.querySelectorAll('[data-count]').forEach(button => {button.onclick=() => {
  count=Number(button.dataset.count);
  document.querySelectorAll('[data-count]').forEach(other => {other.setAttribute('aria-pressed',String(other===button));});
  render();
};});
document.querySelectorAll('[data-layout]').forEach(button => {button.onclick=() => goTo(Number(button.dataset.layout));});
document.querySelector('#previousDesign').onclick=() => goTo(active-1);
document.querySelector('#nextDesign').onclick=() => goTo(active+1);
designs.addEventListener('scroll',() => {
  if(scrollFrame||rendering)return;
  scrollFrame=requestAnimationFrame(() => {scrollFrame=undefined;updateDesign(Math.max(0,Math.min(panels.length-1,Math.round(designs.scrollLeft/designs.clientWidth))));});
},{passive:true});
designs.addEventListener('keydown',event => {
  if(event.key==='ArrowRight'||event.key==='ArrowLeft') {event.preventDefault();goTo(active+(event.key==='ArrowRight'?1:-1));}
});
let lastWidth=designs.clientWidth;
const resizeObserver=new ResizeObserver(() => {
  if(designs.clientWidth===lastWidth)return;
  lastWidth=designs.clientWidth;
  designs.scrollTo({left:active*lastWidth,behavior:'instant'});
});
resizeObserver.observe(designs);
document.querySelector('#assetList').innerHTML=offers.map(offer => `<li>${escapeText(offer.name)}: <a href="${offer.hero}" target="_blank" rel="noopener">800px WebP</a> ${Math.round(offer.heroBytes/1000)} KB · <a href="${offer.thumb}" target="_blank" rel="noopener">240px thumbnail</a> ${Math.round(offer.thumbBytes/1000)} KB</li>`).join('');
render();updateDesign(0);
