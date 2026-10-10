/* يبني صفحة المشروع من إعدادات window.PROJECT الموجودة في ملف كل مشروع */
(function(){
var P=window.PROJECT,lang='ar',$=function(s){return document.querySelector(s)};
var WA='https://wa.me/201123449977',FB='https://facebook.com/hi19man';
var UI={back:['← كل المشاريع','← All projects'],client:['العميل','Client'],services:['الخدمات','Services'],platform:['المنصة','Platform'],year:['السنة','Year'],
 live:['زيارة المتجر','Visit the store'],brief:['المطلوب','The brief'],built:['ما نفّذته','What I built'],
 tour:['جولة داخل المتجر','A walkthrough of the store'],tourp:['معاينة حية لتجربة التصفح والتفاعل.','A live look at browsing and interaction.'],
 review:['رأي العميل','Client feedback'],tap:['اضغط على الصورة لتكبيرها','Tap an image to enlarge'],packs:['ابدأ مشروعك','Start your project'],packsp:['اختر باقة بسعر ثابت وتسليم سريع.','Choose a fixed-price package with fast delivery.'],
 all:['شاهد كل الباقات','See all packages'],pop:['الأكثر طلبًا','Most popular'],next:['المشروع التالي','Next project'],days:['يوم','days']};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function T(a,e,tag,cls){return '<'+(tag||'span')+(cls?' class="'+cls+'"':'')+' data-ar="'+esc(a)+'" data-en="'+esc(e)+'">'+esc(a)+'</'+(tag||'span')+'>'}
function U(k,tag,cls){return T(UI[k][0],UI[k][1],tag,cls)}
function B(o,tag,cls){return T(o.ar,o.en,tag,cls)}
function imgs(list){return (list||[]).map(function(s){return '<div class="shot rv"><img src="'+esc(s)+'" alt="'+esc(P.title.en)+'" loading="lazy" onerror="this.parentNode.hidden=true"></div>'}).join('')}
function list(a,e,tag){var out='';for(var i=0;i<a.length;i++)out+=T(a[i],(e&&e[i])||a[i],tag||'li');return out}

var NEXT=P.next;
if(window.PROJECTS&&P.slug){var ix=-1;window.PROJECTS.forEach(function(q,i){if(q.slug===P.slug)ix=i});
  if(ix>-1){var nx=window.PROJECTS[ix+1];NEXT=nx?{href:nx.href,title:nx.title}:{href:'projects.html',label:{ar:'معرض الأعمال',en:'The portfolio'},title:{ar:'شاهد كل المشاريع',en:'See all projects'}}}}
var h='';
h+='<section class="wrap hero"><h1 class="rv">'+B(P.title,'span')+'</h1><p class="tag rv">'+B(P.tagline,'span')+'</p><dl class="meta rv">'
 +'<div><dt>'+U('client')+'</dt><dd>'+B(P.client)+'</dd></div>'
 +'<div><dt>'+U('services')+'</dt><dd>'+B(P.services)+'</dd></div>'
 +(P.platform?'<div><dt>'+U('platform')+'</dt><dd>'+esc(P.platform)+'</dd></div>':'')
 +(P.year?'<div><dt>'+U('year')+'</dt><dd>'+esc(P.year)+'</dd></div>':'')
 +(P.live?'<div><dt>&nbsp;</dt><dd><a href="'+esc(P.live)+'" target="_blank" rel="noopener">'+U('live')+' ↗</a></dd></div>':'')
 +'</dl></section>';
h+='<div class="wrap">'+imgs([P.hero])+'</div>';
h+='<div class="wrap"><section class="cols rv"><div><h2>'+U('brief')+'</h2>'+list(P.brief.ar,P.brief.en,'p')+'</div>'
 +'<div><h2>'+U('built')+'</h2><ul>'+list(P.built.ar,P.built.en)+'</ul></div></section></div>';
if(P.video&&P.video.length){
 h+='<div class="wrap"><section class="tour rv" id="tour"><h2>'+U('tour')+'</h2><p>'+U('tourp')+'</p><div class="vid" id="vid"><video muted loop playsinline preload="metadata" autoplay>'
  +P.video.map(function(v){return '<source src="'+esc(v)+'" type="video/'+(v.split('.').pop()==='webm'?'webm':'mp4')+'">'}).join('')+'</video></div></section></div>';
}
if(P.gallery&&P.gallery.length)h+='<div class="wrap">'+imgs(P.gallery)+'</div>';
if((P.review&&P.review.quote)||(P.reviews&&P.reviews.length)){
 h+='<div class="wrap"><section class="rev rv" id="rev"><h2>'+U('review')+'</h2>';
 if(P.review&&P.review.quote)h+='<blockquote class="quote"><p>'+B(P.review.quote)+'</p><span>'+B(P.review.author)+'</span></blockquote>';
 if(P.reviews&&P.reviews.length){
  if(P.reviewBy)h+='<p class="by">'+B(P.reviewBy)+'</p>';
  h+='<div class="proofs">'+P.reviews.map(function(r){return '<img src="'+esc(r)+'" alt="'+esc(UI.review[1])+'" loading="lazy">'}).join('')+'</div><p class="by sm">'+U('tap')+'</p>';
 }
 h+='</section></div>';
}
h+='<div class="wrap"><section class="packs rv"><h2>'+U('packs')+'</h2><p>'+U('packsp')+'</p><div class="pg" id="pg"></div><a class="btn" href="packages.html">'+U('all')+'</a></section>';
if(NEXT)h+='<a class="next rv" href="'+esc(NEXT.href)+'"><small>'+(NEXT.label?B(NEXT.label):U('next'))+'</small><h3>'+B(NEXT.title)+'</h3></a>';
h+='</div>';
$('#app').innerHTML=h;

/* بطاقات الباقات من packages-data.js */
if(window.PACKAGES){$('#pg').innerHTML=window.PACKAGES.map(function(p){
  return '<a class="pt'+(p.pop?' pop':'')+'" href="packages.html">'+B(p.name,'b')+'<span class="pr">$'+p.price+'</span><small>'+B(p.days)+'</small></a>'}).join('')}

function apply(){
  document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.documentElement.lang=lang;
  document.body.classList.toggle('en',lang==='en');$('#lang').textContent=lang==='ar'?'EN':'AR';
  document.querySelectorAll('[data-ar]').forEach(function(e){e.textContent=e.getAttribute('data-'+lang)});
  document.title=P.title[lang]+' | Kamal Elnhrawy';
}
$('#lang').onclick=function(){lang=lang==='ar'?'en':'ar';apply()};
apply();

/* ظهور تدريجي مع السكرول */
var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('on');io.unobserve(e.target)}})},{threshold:.08,rootMargin:'0px 0px -30px 0px'});
document.querySelectorAll('.rv').forEach(function(e){io.observe(e)});

/* الفيديو: يتشغل تلقائيًا وهو ظاهر ويقف خارج الشاشة، والنقر يوقفه/يشغله، والفيديو العمودي يُعرض بعرض مناسب */
var v=document.querySelector('#vid video');
if(v){
  var box=$('#vid'),srcs=v.querySelectorAll('source');
  v.addEventListener('loadedmetadata',function(){if(v.videoHeight>v.videoWidth)box.classList.add('portrait')});
  srcs[srcs.length-1].addEventListener('error',function(){$('#tour').hidden=true});
  new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var p=v.play();if(p&&p.catch)p.catch(function(){})}else v.pause()})},{threshold:.35}).observe(box);
  box.onclick=function(){v.paused?v.play():v.pause()};
}
/* صور رأي العميل: تكبير عند الضغط، وإخفاء القسم لو مفيش صور */
var rev=document.querySelector('#rev');
if(rev&&rev.querySelector('.proofs')){
  var pr=rev.querySelectorAll('.proofs img'),bad=0,hasQ=!!rev.querySelector('.quote');
  pr.forEach(function(im){im.addEventListener('error',function(){im.hidden=true;bad++;if(bad===pr.length){rev.querySelector('.proofs').hidden=true;var by=rev.querySelectorAll('.by');by.forEach(function(b){b.hidden=true});if(!hasQ)rev.hidden=true}});
    im.addEventListener('click',function(){var lb=document.createElement('div');lb.className='lb';lb.innerHTML='<img src="'+im.src+'" alt="">';lb.onclick=function(){lb.remove()};document.body.appendChild(lb)})});
}
})();
