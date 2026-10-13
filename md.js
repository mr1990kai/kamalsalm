/* محوّل Markdown محلي محدود وآمن: يعرض HTML النصي ك نص، ويسمح بروابط http/https فقط. */
(function(){
  'use strict';
  function esc(value){
    return String(value==null?'':value).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function inline(value){
    var links=[];
    var text=String(value==null?'':value).replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,function(_m,label,url){
      var token='LINKTOKEN'+links.length+'END';
      links.push({token:token,html:'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(label)+'</a>'});
      return token;
    });
    text=esc(text);
    text=text.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    text=text.replace(/\*([^*]+)\*/g,'<em>$1</em>');
    links.forEach(function(item){text=text.replace(item.token,item.html)});
    return text;
  }
  window.md=function(source){
    var lines=String(source==null?'':source).replace(/\r\n?/g,'\n').split('\n');
    var out=[],para=[],list=[],listType='',quote=[];
    function p(){if(para.length){out.push('<p>'+inline(para.join(' '))+'</p>');para=[]}}
    function l(){if(list.length){out.push('<'+listType+'>'+list.map(function(x){return '<li>'+inline(x)+'</li>'}).join('')+'</'+listType+'>');list=[];listType=''}}
    function q(){if(quote.length){out.push('<blockquote><p>'+inline(quote.join(' '))+'</p></blockquote>');quote=[]}}
    function all(){p();l();q()}
    lines.forEach(function(line){
      var s=line.trim(),h=/^(#{1,3})\s+(.+)$/.exec(s),u=/^[-*]\s+(.+)$/.exec(s),o=/^\d+[.)]\s+(.+)$/.exec(s),b=/^>\s?(.*)$/.exec(s);
      if(!s){all();return}
      if(h){all();var n=h[1].length;out.push('<h'+n+'>'+inline(h[2])+'</h'+n+'>');return}
      if(/^---+$/.test(s)){all();out.push('<hr>');return}
      if(b){p();l();quote.push(b[1]);return}
      if(u||o){p();q();var nt=u?'ul':'ol';if(listType&&listType!==nt)l();listType=nt;list.push((u||o)[1]);return}
      l();q();para.push(s);
    });
    all();return out.join('\n');
  };
})();
