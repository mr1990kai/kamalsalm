(function(){
"use strict";
var d=document,P=window.PROJECTS||[];
var $=function(s){return d.querySelector(s)};
var stack=$("#stack");
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function render(){
  var l=window.MS.lang;
  stack.innerHTML=P.map(function(p,i){
    var n=String(i+1).length<2?"0"+(i+1):i+1;
    return '<article class="sc" style="--i:'+i+'"><a class="sc-img" href="'+esc(p.href)+'" tabindex="-1" aria-hidden="true"><img src="'+esc(p.cover)+'" alt="" loading="'+(i<2?"eager":"lazy")+'" decoding="async"></a>'+
    '<div class="sc-b"><div><div class="sc-top"><span>'+n+' / '+(P.length<10?"0":"")+P.length+'</span><span>'+esc(p.platform)+(p.year?' · '+esc(p.year):"")+'</span></div></div>'+
    '<div><h3>'+esc(p.title[l])+'</h3><p>'+esc(p.desc[l])+'</p><p class="sc-w">'+esc(p.workType[l])+'</p></div>'+
    '<a class="btn btn-p" href="'+esc(p.href)+'"><span class="t"><span>'+(l==="ar"?"شوف المشروع":"View project")+'</span><span aria-hidden="true">'+(l==="ar"?"شوف المشروع":"View project")+'</span></span><span class="ar">'+window.MS.ARW+'</span></a></div></article>';
  }).join("");
  cards=[].slice.call(stack.children);scrollFx();
}
var cards=[];
function scrollFx(){
  if(!cards.length||innerWidth<=860&&false)return;
  for(var i=0;i<cards.length;i++){
    var nx=cards[i+1];if(!nx){cards[i].style.transform="";continue}
    var r=nx.getBoundingClientRect(),vh=innerHeight;
    var p=Math.max(0,Math.min(1,1-(r.top-100)/(vh*.8)));
    cards[i].style.transform="scale("+(1-p*.06).toFixed(4)+")";
    cards[i].style.filter="brightness("+(1-p*.45).toFixed(3)+")";
  }
}
d.addEventListener("msscroll",scrollFx);
d.addEventListener("mslang",render);
if(window.MS&&document.readyState!=="loading")render();
/* hero pointer parallax */
var cut=$("#cut"),gh=$("[data-gh]");
var mx=0,my=0,cx=0,cy=0,run=false;
function loop(){cx+=(mx-cx)*.07;cy+=(my-cy)*.07;
  var flip=document.documentElement.dir==="rtl"?-1:1;
  cut.style.transform="translateX(calc(-50% + "+(cx*14).toFixed(2)+"px)) translateY("+(cy*8).toFixed(2)+"px) scaleX("+flip+")";
  gh.style.transform="translate("+(cx*-22).toFixed(2)+"px,"+(cy*-10).toFixed(2)+"px)";
  if(Math.abs(mx-cx)>.001||Math.abs(my-cy)>.001)requestAnimationFrame(loop);else run=false}
if(matchMedia("(hover:hover) and (pointer:fine)").matches&&!matchMedia("(prefers-reduced-motion: reduce)").matches){
  addEventListener("pointermove",function(e){mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5;if(!run){run=true;requestAnimationFrame(loop)}},{passive:true});
}
/* preloader */
var pre=$("#pre"),pn=$("#preN");
function done(){d.documentElement.classList.remove("hold");pre.classList.add("done");setTimeout(function(){pre.style.display="none"},1300);cut.style.opacity=1}
var seen=false;try{seen=sessionStorage.getItem("msSeen")}catch(e){}
if(seen||matchMedia("(prefers-reduced-motion: reduce)").matches){pre.style.display="none";cut.style.opacity=1}
else{
  try{sessionStorage.setItem("msSeen","1")}catch(e){}
  var t0=null;(function f(t){if(!t0)t0=t;var k=Math.min(1,(t-t0)/1100);pn.textContent=Math.round(100*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(f);else setTimeout(done,150)})(performance.now());
}
setTimeout(function(){cut.style.opacity=1},3000);
})();
