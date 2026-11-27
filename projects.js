(function(){
"use strict";
var P=window.PROJECTS||[],g=document.getElementById("grid"),f="all";
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function render(){
  var l=window.MS.lang;
  g.innerHTML=P.map(function(p,i){
    var n=i<9?"0"+(i+1):i+1;
    return '<a class="pcard rv" data-p="'+esc(p.platform)+'" data-k="'+esc(p.kind)+'" href="'+esc(p.href)+'"><span class="pn">'+n+'</span><div class="pi"><img src="'+esc(p.cover)+'" alt="'+esc(p.title.en)+'" loading="'+(i<2?"eager":"lazy")+'" decoding="async"></div><div class="pb"><h3>'+esc(p.title[l])+'</h3><span class="pm">'+esc(p.platform)+(p.year?" · "+esc(p.year):"")+'</span><p>'+esc(p.desc[l])+'</p></div></a>';
  }).join("");
  apply();
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}})},{threshold:.1});
  [].forEach.call(g.children,function(c,i){c.style.setProperty("--d",i%2);io.observe(c)});
}
function apply(){
  var shown=0;
  [].forEach.call(g.children,function(c){var ok=f==="all"||c.dataset.p===f||c.dataset.k===f;c.classList.toggle("hide",!ok);if(ok)shown++});
  document.getElementById("cnt").textContent=shown+" / "+P.length+" PROJECTS";
  document.getElementById("empty").hidden=shown>0;
}
document.getElementById("flt").addEventListener("click",function(e){
  var b=e.target.closest("button");if(!b)return;f=b.dataset.f;
  [].forEach.call(this.querySelectorAll("button"),function(x){var on=x===b;x.classList.toggle("on",on);x.setAttribute("aria-pressed",on)});apply();
});
document.addEventListener("mslang",render);
if(window.MS)render();
})();
