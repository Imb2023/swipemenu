// Illustrative offers only. Nothing in this gallery writes to the restaurant's Sheet.
const restaurantOffers = [
  {name:'Don Pedro',price:'$100',description:'Orange juice, gin & Sprite.',hero:'media/don-pedro.webp',thumb:'media/demo-don-pedro-thumb.webp',heroBytes:47810,thumbBytes:6918,kind:'DRINK'},
  {name:'Al pastor tacos',price:'$150',description:'Three corn tortillas with marinated pork, onion, cilantro & lime.',hero:'media/demo-tacos-al-pastor.webp',thumb:'media/demo-tacos-al-pastor-thumb.webp',heroBytes:74252,thumbBytes:11772,kind:'FOOD'},
  {name:'Churros & chocolate',price:'$75',description:'Cinnamon-sugar churros with a little chocolate for dipping.',hero:'media/demo-churros.webp',thumb:'media/demo-churros-thumb.webp',heroBytes:90512,thumbBytes:11352,kind:'SOMETHING SWEET'},
  {name:'Tequila lime soda',price:'$100',description:'Tequila, fresh lime & sparkling soda over ice.',hero:'media/demo-lime-tequila-soda.webp',thumb:'media/demo-lime-tequila-soda-thumb.webp',heroBytes:67686,thumbBytes:8754,kind:'DRINK'},
  {name:'Street corn',price:'$65',description:'Grilled corn, crema, cotija, chili & lime.',hero:'media/demo-street-corn.webp',thumb:'media/demo-street-corn-thumb.webp',heroBytes:88672,thumbBytes:13214,kind:'A LITTLE EXTRA'}
];
const businessExamples = {
  restaurant:{title:'Find your menu’s rhythm.',name:'Today’s specials',summary:'One drink, one food special, and something sweet.',contact:'Ask your server',terms:'Prices and content are examples. Replace them with your actual offers.',offers:restaurantOffers},
  barber:{title:'A fresh cut. A clear offer.',name:'The Weekday Cut',summary:'Five weekdays. Five simple reasons to stop by. Sample USD prices.',contact:'Ask your barber',terms:'Sample walk-in offers. Confirm time slots, service inclusions, and prices with the shop.',offers:[
    ['Monday','Weekday haircut','$20','A classic cut and finish. Mon, 10am–2pm. Walk-ins welcome.'],
    ['Tuesday','Beard tidy','$12','A neat trim and line-up. Tue, 10am–2pm.'],
    ['Wednesday','Cut & beard','$30','Haircut, beard trim, and finish. Wed, 10am–3pm.'],
    ['Thursday','Student cut','$18','A classic haircut. Thu, 10am–3pm. Student ID required.'],
    ['Friday','Fresh for the weekend','$35','Haircut and hot-towel finish. Fri, 10am–1pm. Ask about the wait.']
  ].map(([day,name,price,description])=>({day,name,price,description,kind:day.toUpperCase(),hero:'assets/demo-barber.svg',thumb:'assets/demo-barber.svg',art:true}))},
  dentist:{title:'See the offer. Ask the team.',name:'Weekday Dental',summary:'A weekday offer board for a dental practice. Sample USD prices.',contact:'Ask the front desk',terms:'Illustrative prices only. The practice must confirm eligibility, included services, and the care appropriate for each patient. No appointment is booked here.',offers:[
    ['Monday','New-patient exam','$79','An exam to discuss your oral health. Imaging and treatment quoted separately.'],
    ['Tuesday','Routine cleaning','$99','For eligible routine-care patients after an exam. Deep cleaning quoted separately.'],
    ['Wednesday','Meet the team','$0','A short introductory visit to discuss the practice. No exam or treatment included.'],
    ['Thursday','Whitening consultation','$25','Discuss suitability and options with the dentist. Whitening treatment quoted separately.'],
    ['Friday','Family exam visit','$79','Per-person exam price. Ask about available family time slots. Other services quoted separately.']
  ].map(([day,name,price,description])=>({day,name,price,description,kind:day.toUpperCase(),hero:'assets/demo-dental.svg',thumb:'assets/demo-dental.svg',art:true}))}
};
let business='restaurant';
let weekday='all';
let offers=restaurantOffers;
function visibleOffers(){return offers.filter(offer=>weekday==='all'||offer.day===weekday).slice(0,business==='restaurant'?count:5);}
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
  return `<article class="demo-item${classes}"><div class="demo-photo"><img data-src="${escapeText(large ? offer.hero : offer.thumb)}" width="${large ? 800 : 240}" height="${large ? 1000 : 300}" alt="${escapeText(offer.name)} · demo artwork" decoding="async" /></div><div class="offer-copy"><p class="offer-meta">${escapeText(offer.day ? offer.day.toUpperCase() : (index === 0 ? 'TODAY’S PICK' : offer.kind))} · DEMO</p><div class="offer-title"><h3>${escapeText(offer.name)}</h3><span class="offer-price">${escapeText(offer.price)}</span></div><p class="offer-description">${escapeText(offer.description)}</p><p class="server-note">${escapeText(businessExamples[business].contact)} · sample offer</p></div></article>`;
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
    target.innerHTML=visibleOffers().map((offer,index) => item(offer,index,layout)).join('');
    target.scrollTop=0;
  });
  document.querySelectorAll('.count-label').forEach(label => {label.textContent=`${visibleOffers().length} demo offer${visibleOffers().length===1?'':'s'}`;});
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
document.querySelector('#assetList').innerHTML=restaurantOffers.map(offer => `<li>${escapeText(offer.name)}: <a href="${offer.hero}" target="_blank" rel="noopener">800px WebP</a> ${Math.round(offer.heroBytes/1000)} KB · <a href="${offer.thumb}" target="_blank" rel="noopener">240px thumbnail</a> ${Math.round(offer.thumbBytes/1000)} KB</li>`).join('');
function chooseBusiness(value) {
  if(!Object.hasOwn(businessExamples,value))return;
  business=value;weekday='all';offers=businessExamples[business].offers;
  const example=businessExamples[business];
  document.querySelector('#galleryTitle').textContent=example.title;
  document.querySelector('#businessSummary').textContent=example.summary;
  document.querySelector('#galleryDescription').textContent=business==='restaurant'?'Swipe sideways to compare designs. Scroll inside each menu to explore its offers.':'Compare three layouts. View the full weekday board or tap a day for its special.';
  document.querySelector('#weekdayControls').hidden=business==='restaurant';
  document.querySelector('#itemCountControls').hidden=business!=='restaurant';
  document.querySelector('#restaurantRecommendations').hidden=business!=='restaurant';
  document.querySelector('#businessTerms').textContent=example.terms;
  document.querySelector('#businessTemplate').href=business==='restaurant'?'specials-template.csv':business+'-template.csv';
  document.querySelector('#businessTemplate').textContent=(business==='dentist'?'dental':business)+' Sheet template';
  document.querySelector('#businessSetup').href='setup.html?business='+business;
  document.querySelectorAll('.preview-business-name').forEach(el=>el.textContent=example.name);
  document.querySelectorAll('.preview-contact').forEach(el=>el.textContent=example.contact);
  document.querySelectorAll('[data-business]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.business===business)));
  document.querySelectorAll('[data-day]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.day==='all')));
  const url=new URL(location.href);url.searchParams.set('business',business);history.replaceState(null,'',url);
  render();
}
document.querySelectorAll('[data-business]').forEach(el=>el.onclick=()=>chooseBusiness(el.dataset.business));
document.querySelectorAll('[data-day]').forEach(el=>el.onclick=()=>{
  weekday=el.dataset.day;
  document.querySelectorAll('[data-day]').forEach(other=>other.setAttribute('aria-pressed',String(other===el)));
  render();
});
const initialBusiness=new URLSearchParams(location.search).get('business');
chooseBusiness(Object.hasOwn(businessExamples,initialBusiness)?initialBusiness:'restaurant');updateDesign(0);
