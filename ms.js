/* Kamal Elnhrawy: shared motion + chrome */
(function(){
"use strict";
var d=document,root=d.documentElement,body=d.body;
var reduced=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
var $=function(s,r){return(r||d).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||d).querySelectorAll(s))};
root.classList.add("js");
var lang="ar";try{lang=localStorage.getItem("msLang")||"ar"}catch(e){}
if(lang!=="ar"&&lang!=="en")lang="ar";
if(body.hasAttribute("data-nolang"))lang="ar";
var ARW='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
window.MS={ARW:ARW,get lang(){return lang}};
var NAV=[["index.html#work","الأعمال","Work"],["index.html#services","الخدمات","Services"],["packages.html","الباقات","Packages"],["blog.html","المقالات","Articles"]];
var page=(location.pathname.split("/").pop()||"index.html");
function chrome(){
  if(!body.hasAttribute("data-ms"))return;
  var h='<div class="nav" id="nav"><div class="nav-in glass"><a class="logo" href="index.html" aria-label="Kamal Elnhrawy">KAMAL ELNHRAWY<sup>®</sup></a><nav class="nav-links" aria-label="Main">';
  NAV.forEach(function(n){var cur=(n[0].split("#")[0]===page&&n[0].indexOf("#")<0)?' aria-current="page"':"";h+='<a href="'+n[0]+'"'+cur+' data-ar="'+n[1]+'" data-en="'+n[2]+'">'+n[1]+"</a>"});
  h+='</nav><div class="nav-act"><button class="lg" type="button" data-lg aria-label="Language">EN</button><a class="btn btn-p" style="padding-block:4px;font-size:14px" href="https://wa.me/201123449977" target="_blank" rel="noopener"><span class="t"><span data-ar="ابدأ مشروعك" data-en="Start a project">ابدأ مشروعك</span><span aria-hidden="true" data-ar="ابدأ مشروعك" data-en="Start a project">ابدأ مشروعك</span></span><span class="ar" style="width:32px;height:32px">'+ARW+'</span></a><button class="burger" type="button" data-mm aria-label="Menu" aria-expanded="false"><i></i></button></div></div></div>';
  h+='<div class="mm" id="mm" aria-hidden="true"><button class="x" type="button" data-mmx aria-label="Close">×</button>';
  NAV.forEach(function(n){h+='<a href="'+n[0]+'" data-ar="'+n[1]+'" data-en="'+n[2]+'">'+n[1]+"</a>"});
  h+='<a href="https://wa.me/201123449977" data-ar="واتساب" data-en="WhatsApp">واتساب</a></div><div class="grain" aria-hidden="true"></div>';
  body.insertAdjacentHTML("afterbegin",h);
  if(!body.hasAttribute("data-nofoot")){
    body.insertAdjacentHTML("beforeend",'<footer class="foot"><a class="logo" href="index.html">KAMAL ELNHRAWY<sup>®</sup></a><nav><a href="projects.html" data-ar="كل المشاريع" data-en="All projects">كل المشاريع</a><a href="packages.html" data-ar="الباقات" data-en="Packages">الباقات</a><a href="blog.html" data-ar="المقالات" data-en="Articles">المقالات</a><a href="https://wa.me/201123449977" target="_blank" rel="noopener">WhatsApp</a></nav><span>© 2026 Kamal Elnhrawy</span></footer>');
  }
  var mm=$("#mm"),bu=$("[data-mm]");
  function om(o){mm.classList.toggle("open",o);mm.setAttribute("aria-hidden",!o);bu.setAttribute("aria-expanded",o);body.style.overflow=o?"hidden":""}
  bu.addEventListener("click",function(){om(true)});$("[data-mmx]").addEventListener("click",function(){om(false)});
  $$("a",mm).forEach(function(a){a.addEventListener("click",function(){om(false)})});
  addEventListener("keydown",function(e){if(e.key==="Escape")om(false)});
  addEventListener("resize",function(){if(innerWidth>860)om(false)});
  // hide on scroll down, show on up
  var lastY=0,nav=$("#nav");
  addEventListener("scroll",function(){var y=scrollY;nav.classList.toggle("hide",y>lastY&&y>200);lastY=y},{passive:true});
}
function setLang(l){
  lang=l;if(!body.hasAttribute("data-nolang")){try{localStorage.setItem("msLang",l)}catch(e){}}
  root.lang=l;root.dir=l==="ar"?"rtl":"ltr";body.classList.toggle("en",l==="en");
  $$("[data-ar]").forEach(function(n){var v=n.getAttribute("data-"+l);if(v!=null)n.innerHTML=v});
  $$("[data-lg]").forEach(function(b){b.textContent=l==="ar"?"EN":"AR"});
  var t=body.getAttribute("data-title-"+l);if(t)d.title=t;
  $$("[data-fill]").forEach(buildFill);
  d.dispatchEvent(new CustomEvent("mslang",{detail:l}));
  measure();
}
/* word fill */
function buildFill(el){
  var txt=el.getAttribute("data-"+lang)||el.textContent;
  el.innerHTML=txt.split(/\s+/).filter(Boolean).map(function(w){return '<span class="w">'+w+"</span>"}).join(" ");
}
var fills=[];
function updFill(){
  fills.forEach(function(el){
    var r=el.getBoundingClientRect(),vh=innerHeight;
    var p=(vh*.85-r.top)/(r.height+vh*.45);p=Math.max(0,Math.min(1,p));
    var ws=el.children,n=ws.length,pos=p*(n+3);
    for(var i=0;i<n;i++){var o=Math.max(0,Math.min(1,(pos-i)/3));ws[i].style.opacity=.22+.78*o}
  });
}
function measure(){fills=$$("[data-fill]");updFill();upd()}
/* generic scroll */
var parallax=[],marq=[];
function upd(){
  var vh=innerHeight;
  parallax.forEach(function(e){var r=e.getBoundingClientRect();if(r.bottom<-200||r.top>vh+200)return;var p=(r.top+r.height/2-vh/2)/vh;e.style.transform="translate3d(0,"+(p*-(+e.dataset.px||40)).toFixed(1)+"px,0) scale("+(e.dataset.sc||1)+")"});
  marq.forEach(function(e){var r=e.parentNode.getBoundingClientRect();if(r.bottom<0||r.top>vh)return;var p=(r.top+r.height/2-vh/2)/vh,dir=+e.dataset.dir||1;e.style.transform="translate3d("+(p*dir*260).toFixed(1)+"px,0,0)"});
}
var tick=false;
addEventListener("scroll",function(){if(tick)return;tick=true;requestAnimationFrame(function(){tick=false;updFill();upd();d.dispatchEvent(new Event("msscroll"))})},{passive:true});
addEventListener("resize",measure);
/* count up */
function count(el){
  var to=parseFloat(el.getAttribute("data-count")),suf=el.getAttribute("data-suf")||"",pad=+el.getAttribute("data-pad")||0;
  function fmt(v){var s=String(Math.round(v));while(s.length<pad)s="0"+s;return s+suf}
  if(reduced){el.textContent=fmt(to);return}
  var t0=null;function f(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/1500),e=1-Math.pow(1-k,4);el.textContent=fmt(to*e);if(k<1)requestAnimationFrame(f)}requestAnimationFrame(f);
}
/* observers */
function observe(){
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");if(e.target.hasAttribute("data-count"))count(e.target);$$("[data-count]",e.target).forEach(count);io.unobserve(e.target)}})},{threshold:.14,rootMargin:"0px 0px -6% 0px"});
  $$(".rv,.ml,[data-count],.cnt").forEach(function(e){io.observe(e)});
  // failsafe: after 2.5s anything above the fold is shown
  setTimeout(function(){$$(".rv:not(.in)").forEach(function(e){var r=e.getBoundingClientRect();if(r.top<innerHeight)e.classList.add("in")})},2500);
}
function init(){
  chrome();
  $$("[data-lg]").forEach(function(b){b.addEventListener("click",function(){setLang(lang==="ar"?"en":"ar")})});
  parallax=$$("[data-px]");marq=$$("[data-dir]");
  $$(".btn .ar").forEach(function(e){if(!e.innerHTML.trim())e.innerHTML=ARW});
  setLang(lang);
  observe();
  requestAnimationFrame(function(){requestAnimationFrame(function(){root.classList.add("ready");d.dispatchEvent(new Event("msready"))})});
  d.dispatchEvent(new Event("msinit"));
}
if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",init);else init();
})();
