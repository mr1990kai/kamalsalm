const fs=require("fs"), path=require("path"), {spawnSync}=require("child_process");
const ROOT=process.cwd(), SEARCH=path.join(ROOT,".github/scripts/search-web.js"), LOG=path.join(ROOT,"web-search-log.json"), AUDIT=path.join(ROOT,"research-audit.md");
const TODAY=process.env.TODAY||new Date().toISOString().slice(0,10), MODEL=process.env.GROQ_MODEL||"openai/gpt-oss-20b";
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function retryDelayMs(res){
 const after=Number(res.headers.get("retry-after"));
 if(Number.isFinite(after)&&after>0)return Math.max(1500,Math.min(90000,after*1000+1200));
 const reset=String(res.headers.get("x-ratelimit-reset-tokens")||res.headers.get("x-ratelimit-reset-requests")||"");
 const minutes=Number((reset.match(/(\d+(?:\.\d+)?)m/i)||[])[1]||0);
 const seconds=Number((reset.match(/(\d+(?:\.\d+)?)s/i)||[])[1]||0);
 const total=minutes*60+seconds;
 return total>0?Math.max(1500,Math.min(90000,total*1000+1500)):65000;
}
function stop(m){console.error("ARTICLE GENERATOR ERROR: "+m);process.exit(1)}
function out(k,v){if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,k+"="+v+"\n")}
function json(s){try{return JSON.parse(String(s||"").trim())}catch(e){throw Error("Groq response wasn't valid JSON: "+e.message+"; "+String(s).slice(0,200))}}
function clean(v,n=240){return String(v??"").replace(/\s+/g," ").trim().slice(0,n)}
async function ask(messages,maxTokens){
 const key=process.env.GROQ_API_KEY;if(!key)stop("Missing GROQ_API_KEY secret. Add it under GitHub Settings > Secrets and variables > Actions.");
 let lastError;
 for(let attempt=0;attempt<3;attempt++){
  const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{authorization:"Bearer "+key,"content-type":"application/json"},body:JSON.stringify({model:MODEL,messages,temperature:attempt===0?.25:0,max_completion_tokens:maxTokens,response_format:{type:"json_object"},stream:false}),signal:AbortSignal.timeout(180000)});
  const raw=await res.text();let b;try{b=JSON.parse(raw)}catch(_){}
  if(!res.ok){
   const message="Groq API HTTP "+res.status+": "+(b?.error?.message||raw.slice(0,500));
   lastError=Error(message);
   if((res.status===429||(res.status===413&&/TPM|tokens per minute|rate limit/i.test(message)))&&attempt<2){
    const delay=retryDelayMs(res);
    console.log("Groq rate limit (429); waiting "+Math.ceil(delay/1000)+"s before retry "+(attempt+2)+"/3.");
    await wait(delay);
    continue;
   }
   if(attempt===0&&res.status===400&&/validate JSON|failed_generation|invalid json/i.test(message)){
    console.log("Groq rejected one structured response; retrying once with lower temperature.");
    await wait(1500);continue;
   }
   throw lastError;
  }
  if(b?.usage)console.log("Groq token usage — prompt: "+(b.usage.prompt_tokens??"?")+", completion: "+(b.usage.completion_tokens??"?")+", total: "+(b.usage.total_tokens??"?"));
  const c=b?.choices?.[0]?.message?.content;
  if(!c){
   lastError=Error("Groq returned empty response");
   if(attempt===0){await wait(1500);continue}
   throw lastError;
  }
  try{return json(c)}catch(error){
   lastError=error;
   if(attempt===0){console.log("Groq returned malformed JSON; retrying once.");await wait(1500);continue}
   throw error;
  }
 }
 throw lastError||Error("Groq response failed after automatic retry");
}
function readPosts(){global.window={};try{require(path.join(ROOT,"posts-data.js"))}catch(e){stop("Cannot read posts-data.js: "+e.message)}if(!Array.isArray(global.window.POSTS))stop("posts-data.js has no window.POSTS array");return global.window.POSTS}
function oldPosts(posts){return posts.map(p=>({slug:clean(p.slug,100),title:clean(p.title,180),category:clean(p.category,40),date:clean(p.date,20),excerpt:clean(p.excerpt,180)}))}
function log(){try{const a=JSON.parse(fs.readFileSync(LOG,"utf8"));return Array.isArray(a)?a:[]}catch(_){return []}}
function runSearch(q){const r=spawnSync(process.execPath,[SEARCH,q],{cwd:ROOT,encoding:"utf8",timeout:45000,maxBuffer:2*1024*1024});const entries=log().filter(x=>x.type==="search"&&x.query===q);const e=entries.at(-1);return e?.ok&&e.results?.length?e:{type:"search",query:q,language:/[\u0600-\u06FF]/.test(q)?"ar":"en",ok:false,results:[],error:clean(r.stderr||r.stdout||e?.error||"No results",300)}}
async function search(q,lang){q=clean(q,220);let e=runSearch(q);if(e.ok)return{asked:q,query:q,entry:e};const retry=q+(lang==="ar"?" التسويق الرقمي":" original international case study outside MENA US Europe Japan China South Korea");e=runSearch(retry);return{asked:q,query:retry,entry:e}}
function pack(s,n=3){return{query:s.entry.query,language:s.entry.language,ok:s.entry.ok,results:(s.entry.results||[]).slice(0,n).map(r=>({title:clean(r.title,180),url:r.url,snippet:clean(r.snippet,250)}))}}
function norm(u){try{const x=new URL(u);x.hash="";x.search="";x.pathname=x.pathname.replace(/\/+$/,"")||"/";return x.origin.toLowerCase()+x.pathname}catch(_){return String(u||"").replace(/[.,;]+$/,"")}}
function host(u){try{return new URL(u).hostname.replace(/^www\./,"")}catch(_){return""}}
function sources(ss){const o=[],seen=new Set();for(const s of ss)for(const r of s.entry.results||[]){if(!/^https?:\/\//i.test(r.url||""))continue;const k=norm(r.url);if(!seen.has(k)){seen.add(k);o.push({title:clean(r.title,180),url:r.url,snippet:clean(r.snippet,250)})}}return o}
function isForeignEvidence(s){
 const h=host(s.url), title=String(s.title||"");
 const arabicCountryTld=/(^|\.)(?:eg|sa|ae|qa|kw|bh|om|jo|lb|iq|ma|dz|tn|ly|sd|ye|ps)(?:\.|$)/i;
 const localPublisher=/(^|[.-])(?:egypt|cairo|middleeast|middle-east|mena|arabnews|arabic|alarabiya|dailynewsegypt|egypttoday|egyptindependent|gulfnews|khaleejtimes|zawya|wam|thenational|thepeninsula|youm7|masrawy)([.-]|$)/i;
 const localTitle=/\b(?:Egypt|Egyptian|Cairo|MENA|Middle East|North Africa|Arab world|Saudi Arabia|Saudi|UAE|United Arab Emirates|Dubai|Abu Dhabi|Qatar|Kuwait|Bahrain|Oman|Jordan|Lebanon|Iraq|Morocco|Algeria|Tunisia|Libya|Sudan|Yemen|Palestine|Riyadh|Jeddah|Doha|Casablanca|Rabat|Amman|Beirut|Muscat|Manama)\b/i;
 return !!h && !/[\u0600-\u06FF]/.test(title) && !arabicCountryTld.test(h) && !localPublisher.test(h) && !localTitle.test(title);
}
function foreignSources(ss){return sources(ss).filter(isForeignEvidence)}
function compactResearch(r){
 const c=r?.candidate||{};
 return {
  candidate:{topic:clean(c.topic,140),angle:clean(c.angle,180),category:clean(c.category,60),foreignCountry:clean(c.foreignCountry,50),sourceType:clean(c.sourceType,70)},
  englishSearches:(r?.englishSearches||[]).slice(0,5).map(s=>({query:clean(s.query,90),results:(s.results||[]).slice(0,2).map(x=>({title:clean(x.title,100),url:x.url,snippet:clean(x.snippet,130)}))})),
  arabicSearches:(r?.arabicSearches||[]).slice(0,3).map(s=>({query:clean(s.query,90),results:(s.results||[]).slice(0,2).map(x=>({title:clean(x.title,90)}))})),
  openedOriginalEnglishPages:(r?.openedOriginalEnglishPages||[]).slice(0,3).map(x=>({url:x.url,title:clean(x.title,120),text:clean(x.text,850)}))
 };
}
function fetchPage(u){const r=spawnSync(process.execPath,[SEARCH,"--fetch",u],{cwd:ROOT,encoding:"utf8",timeout:25000,maxBuffer:2*1024*1024});if(r.status!==0)return null;try{const x=JSON.parse(r.stdout);return{url:x.url||u,title:clean(x.title,180),text:clean(x.text,2600)}}catch(_){return null}}
function auditText(x){
 const qEn=x.en.map(s=>"- query: "+s.query).join("\n"),qAr=x.ar.map(s=>"- query: "+s.query).join("\n");
 const sourceLines=x.sources.slice(0,4).map(s=>"- "+s.title+" — الناشر: "+host(s.url)+"؛ تاريخ النشر: يُراجع في الصفحة الأصلية؛ الرابط: "+s.url).join("\n");
 const ar=x.ar.map(s=>"- نتائج "+s.query+"\n"+(s.entry.results||[]).slice(0,3).map(r=>"  - "+clean(r.title,130)+" — "+r.url).join("\n")).join("\n");
 const en=x.en.map(s=>"- Results: "+s.query+"\n"+(s.entry.results||[]).slice(0,3).map(r=>"  - "+clean(r.title,130)+" — "+r.url).join("\n")).join("\n");
 return["## English Search Queries",qEn,"## Arabic Market Search Queries",qAr,"## English Source Articles",sourceLines,"## Arabic-Market Results",clean(x.arSummary,1800),"","نتائج البحث العربي الفعلية:",ar,"","نتائج البحث الإنجليزي الفعلية:",en,"## Existing Site Duplicate Check","- "+clean(x.duplicate,1200)+" تمت مقارنة الفكرة بعناوين وملخصات المقالات السابقة في posts-data.js؛ اختلاف العنوان وحده لا يكفي لاعتبار الموضوع جديدًا. موضوع الفحص: "+x.topic,"## Decision","DECISION: "+x.decision+" — "+clean(x.reason,450),""].join("\n");
}
function slug(v){return clean(v,100).normalize("NFKD").toLowerCase().replace(/['’]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,72).replace(/-+$/g,"")||"marketing-insight"}
function uniqueSlug(v,posts){let s=slug(v),used=new Set(posts.map(p=>p.slug));if(!used.has(s))return s;s+="-"+TODAY;if(!used.has(s))return s;let i=2;while(used.has(s+"-"+i))i++;return s+"-"+i}
function addPost(p,posts){const file=path.join(ROOT,"posts-data.js");let s=fs.readFileSync(file,"utf8"),end=s.lastIndexOf("];");if(end<0)stop("posts-data.js does not end with ];");if(posts.some(x=>x.slug===p.slug))stop("Duplicate slug.");const item="  {\n    slug: "+JSON.stringify(p.slug)+",\n    title: "+JSON.stringify(p.title)+",\n    excerpt: "+JSON.stringify(p.excerpt)+",\n    date: "+JSON.stringify(TODAY)+",\n    category: "+JSON.stringify(p.category)+",\n    lang: \"ar\",\n    read: "+p.read+"\n  }\n";s=s.slice(0,end).replace(/\s*$/,"")+(posts.length?",":"")+"\n"+item+s.slice(end);fs.writeFileSync(file,s,"utf8")}

function articleBodyLength(article){
 return String(article||"").split(/\n\s*##\s*(?:المصادر|المراجع|sources|references)(?=\s|$)/i)[0].trim().length;
}
async function ensureArticleLength(article,research,category){
 const original=String(article||"").trim();
 const marker=/\n\s*##\s*(?:المصادر|المراجع|sources|references)(?=\s|$)/i;
 const cut=original.search(marker);
 let body=cut>=0?original.slice(0,cut).trim():original;
 const sourceFooter=cut>=0?original.slice(cut).trim():"";
 if(body.length>=3000)return original;
 console.log("Article body is short ("+body.length+" chars); adding distinct sections from verified research.");
 const brief=JSON.stringify(compactResearch(research));
 const plans=[
  {
   system:"You are an Egyptian-Arabic practical editor. The supplied draft is too short. Write additional, non-repetitive sections that can be appended to it, not a replacement article. Use only verified source context for factual claims. Never invent statistics, named companies, customer success stories, quotes or URLs. A local example must be explicitly hypothetical. Return JSON only with one key: additionalSections.",
   user:"Write 3 useful new sections in conversational Egyptian Arabic totaling at least 1400 characters. Do not repeat the introduction, summary, or points already covered in the existing draft. Deepen the idea with a worked hypothetical example relevant to Egypt, a practical step-by-step checklist, how to measure results, and mistakes to avoid. Every factual claim must be supported by the research below or phrased as advice, not fact. Do not include source links or a sources heading; sources will be appended separately. Category: "+category+"\nVerified research (compact): "+brief+"\nExisting article body — avoid repeating it:\n"+body
  },
  {
   system:"You are a careful translator and editor for a useful Egyptian-Arabic marketing blog. Add new sections by paraphrasing and explaining relevant information from the provided foreign English sources. This is a source-adaptation fallback, not an invitation to invent facts. Never invent figures, case studies, company results, quotations or URLs. Return JSON only with one key: additionalSections.",
   user:"The article still needs more depth. Write 3 DIFFERENT new headed sections in conversational Egyptian Arabic, at least 1400 characters total, to append to the draft. Translate/adapt the verified foreign-source ideas into plain Arabic if necessary, then explain the practical steps an Egyptian business can take, a clearly hypothetical example, what to measure, and common errors. Do not repeat the draft, do not include a conclusion, and do not include links or a sources heading. Category: "+category+"\nVerified foreign research excerpts: "+brief+"\nSections already in article:\n"+body
  }
 ];
 for(let i=0;i<plans.length;i++){
  await wait(62000);
  try{
   const generated=await ask([{role:"system",content:plans[i].system},{role:"user",content:plans[i].user}],1800);
   let addition=String(generated.additionalSections||"").trim();
   if(!addition&&generated.articleMarkdown){
    const whole=String(generated.articleMarkdown).trim();
    const wholeCut=whole.search(marker);
    const wholeBody=wholeCut>=0?whole.slice(0,wholeCut).trim():whole;
    if(wholeBody.length>body.length)body=wholeBody;
   }else if(addition){
    const addCut=addition.search(marker);
    if(addCut>=0)addition=addition.slice(0,addCut).trim();
    if(addition.length>250)body=body+"\n\n"+addition;
   }
   console.log("Article body after fallback "+(i+1)+": "+body.length+" characters.");
   if(body.length>=3000)return body+(sourceFooter?"\n\n"+sourceFooter:"");
  }catch(error){
   console.log("Additional-section pass "+(i+1)+" failed: "+clean(error.message,200));
  }
 }
 if(body.length>=2600){console.log("Using expanded body at "+body.length+" characters.");return body+(sourceFooter?"\n\n"+sourceFooter:"");}
 console.log("No draft reached the minimum quality length; refusing to publish an extremely short article.");
 return "";
}

function validateArticle(a,openedUrls,searchUrls){
 if(typeof a!=="string"||articleBodyLength(a)<2600)throw Error("Article body is shorter than 2,600 characters");
 if(!/[\u0600-\u06FF]/.test(a))throw Error("Article isn't Arabic");
 const links=a.match(/\]\(https?:\/\/[^)\s]+\)/g)||[];
 if(links.length<3)throw Error("Article needs at least 3 direct source links");
 const opened=new Set(openedUrls.map(norm));
 const allowed=new Set([...(searchUrls||[]),...(openedUrls||[])].map(norm));
 const used=[...a.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map(m=>norm(m[1]));
 if(used.some(u=>!allowed.has(u)))throw Error("Every citation must come from an actual foreign English search result or an opened source page");
 if(new Set(used.filter(u=>allowed.has(u))).size<3)throw Error("Article must cite at least three distinct verified foreign source URLs");
 if(new Set(used.filter(u=>opened.has(u))).size<2)throw Error("Article must cite at least two opened and verified source pages");
}


function prepareArticleCitations(article,openedUrls,searchUrls){
 const allowed=new Map();
 for(const url of [...(openedUrls||[]),...(searchUrls||[])])if(/^https?:\/\//i.test(String(url||""))&&!allowed.has(norm(url)))allowed.set(norm(url),String(url));
 const sources=[],seen=new Set();
 function add(label,url){const actual=allowed.get(norm(url));if(!actual)return;const key=norm(actual);if(seen.has(key))return;seen.add(key);sources.push({label:clean(label||host(actual),180),url:actual})}
 let lines=String(article||"").replace(/\r\n?/g,"\n").split("\n");
 if(lines.length&&/^#\s+/.test(lines[0].trim()))lines=lines.slice(1);
 const isHeader=line=>{const t=line.trim().replace(/^>\s*/,"").replace(/^#{1,3}\s*/,"").replace(/^\*\*(.*?)\*\*$/,"$1").replace(/:$/,"").trim();return /^(?:المصادر(?:\s|$)|المراجع(?:\s|$)|مصادر وقراءات إضافية(?:\s|$)|Sources(?:\s+and\s+.*)?|References|Further Reading)/i.test(t)};
 const footer=lines.findIndex(isHeader),bodyLines=footer>=0?lines.slice(0,footer):lines,footerLines=footer>=0?lines.slice(footer+1):[];
 const linkRe=/\[\[([^\]]+)\]\]\((https?:\/\/[^)\s]+)\)|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
 for(const line of footerLines)for(const m of line.matchAll(linkRe))add(m[1]||m[3],m[2]||m[4]);
 const body=bodyLines.join("\n").replace(linkRe,(_m,a,u,b,v)=>{add(a||b,u||v);return a||b}).replace(/^\s*>\s*\*\*(?:المصدر|المصادر|المراجع|Source|Sources)[^*]*\*\*\s*$/gim,"").replace(/(?:\n\s*---+\s*)+$/g,"").replace(/\n{3,}/g,"\n\n").trim();
 const opened=[...(openedUrls||[])].filter(u=>allowed.has(norm(u))).map(u=>allowed.get(norm(u)));
 const openedAdded=new Set(sources.map(x=>norm(x.url)).filter(u=>opened.some(o=>norm(o)===u)));
 for(const url of opened){if(openedAdded.size>=2)break;if(!seen.has(norm(url))){add(host(url),url);openedAdded.add(norm(url))}}
 for(const url of [...(openedUrls||[]),...(searchUrls||[])]){if(sources.length>=3)break;if(!seen.has(norm(url)))add(host(url),url)}
 if(sources.length<3)throw Error("Fewer than three usable source URLs were found in the real search results.");
 return body+"\n\n## المصادر\n\n"+sources.map(x=>"- ["+x.label+"]("+x.url+")").join("\n")+"\n";
}
async function tryAlternateCandidates({candidates,excludeId,posts,existing}){
 const specialistSites="Shopify HubSpot Think with Google Meta Business TikTok for Business Google Ads Semrush Ahrefs BigCommerce Adobe Marketing Week WARC Nielsen McKinsey Harvard Business Review";
 for(const c of candidates.filter(x=>x.id!==excludeId)){
  console.log("Trying alternate candidate "+c.id+": "+c.topic+" ("+c.country+").");
  const en=[c.en],ar=[c.ar];
  const englishQueries=[
   clean(c.topic+" "+c.country+" practical marketing ecommerce advice "+specialistSites,220),
   clean(c.topic+" "+c.country+" site:shopify.com OR site:hubspot.com OR site:thinkwithgoogle.com OR site:semrush.com OR site:bigcommerce.com",220)
  ];
  const arabicQueries=[
   clean("بحث تطبيقي: "+c.aq+" "+c.topic+" مصر",220),
   clean("أمثلة عملية: "+c.aq+" "+c.topic+" التسويق الرقمي",220)
  ];
  for(const q of englishQueries)en.push(await search(q,"en"));
  for(const q of arabicQueries)ar.push(await search(q,"ar"));
  if(en.some(x=>!x.entry.ok)||ar.some(x=>!x.entry.ok)){
   console.log("One follow-up search for alternate candidate "+c.id+" returned no results; checking the sources that did work.");
  }
  const enSources=foreignSources(en),opened=[],openedHosts=new Set();
  // Prefer well-known specialist publishers, but do not require a quantified case study.
  const preferred=/(shopify|hubspot|thinkwithgoogle|google\.com|meta\.com|facebook\.com|tiktok\.com|semrush|ahrefs|bigcommerce|adobe|marketingweek|warc|nielsen|mckinsey|hbr\.org|forrester|salesforce|mailchimp|klaviyo|qualtrics|sproutsocial|searchenginejournal|searchengineland)/i;
  enSources.sort((a,b)=>Number(preferred.test(host(b.url))) - Number(preferred.test(host(a.url))));
  for(const src of enSources){
   const p=fetchPage(src.url);
   if(p?.text&&p.text.length>250&&isForeignEvidence({url:p.url||src.url,title:p.title||src.title})){
    const h=host(p.url||src.url);
    if(!openedHosts.has(h)){opened.push(p);openedHosts.add(h)}
   }
   if(opened.length>=4)break;
  }
  if(opened.length<2){
   console.log("Alternate candidate "+c.id+" skipped because fewer than two useful foreign pages could be opened.");
   continue;
  }
  const research={
   candidate:{topic:c.topic,angle:c.angle,category:c.category,foreignCountry:c.country,sourceType:c.sourceType},
   englishSearches:en.map(x=>({query:x.entry.query,language:"en",ok:x.entry.ok,results:(x.entry.results||[]).filter(isForeignEvidence).slice(0,4).map(r=>({title:clean(r.title,180),url:r.url,snippet:clean(r.snippet,250)}))})),
   arabicSearches:ar.map(x=>pack(x,3)),
   openedOriginalEnglishPages:opened
  };
  await wait(61000);
  let draft;
  try{
   draft=await ask([
    {role:"system",content:"Return JSON only. You are an experienced Arabic marketing editor. Write useful, clear, original practical guidance based on well-known specialist marketing and ecommerce publishers and the source pages actually provided. A quantified case study, ROAS uplift, experiment or measured result is NOT required. A reputable how-to guide, platform documentation, expert analysis, buyer-behavior insight or practical framework is sufficient. Do not fabricate statistics, quotes, studies, URLs or claims. If a source makes a claim, attribute it to that source and do not exaggerate it. Primary sources must be non-Arab foreign-market publishers; use the Arabic searches only to avoid an obvious duplicate, not to demand proof that no similar article exists anywhere."},
    {role:"user",content:"Date "+TODAY+"\nExisting posts: "+JSON.stringify(existing)+"\nAlternate candidate and real searches: "+JSON.stringify(compactResearch(research))+"\nReturn JSON: decision ('PUBLISH'/'SKIP'), decisionReason, arabicMarketSummary, duplicateCheck, title in Arabic, slug in English kebab-case, excerpt in Arabic <=220 characters, category, read integer, articleMarkdown.\nPublish a practical article unless its sources are unusable, the topic is clearly unrelated to the site, or the same topic already exists in our posts. No need for numerical proof or a measurable case study. Prefer insights from known specialist sites such as Shopify, HubSpot, Think with Google, Meta Business, TikTok for Business, Google Ads, Semrush, Ahrefs, BigCommerce, Adobe, WARC, Marketing Week, Nielsen, McKinsey, HBR or other established industry publishers when the actual search results support that choice. Do not claim novelty is proven; note the search scope honestly. Category must exactly equal "+JSON.stringify(c.category)+". Article body MUST contain at least 3,000 characters before the sources footer; aim for 3,200–4,200 characters with at least 5 useful sections in Egyptian-friendly Arabic, open with a lively hook, explain the foreign-source idea simply, include a concrete example, practical steps, a short checklist or decision guide, and common mistakes for applying it in Egypt. Keep the writing conversational and useful, not academic or repetitive. Do not require statistics, ROAS figures, quantified results, or a measured case study. Do not repeat the article title as an H1. Do not include source links or inline citations in the article body. Put all source links together in exactly one final section named ## المصادر, with at least 3 links; at least 2 must be from openedOriginalEnglishPages and every link must be from supplied search results or opened pages. If one candidate is unsuitable, SKIP and let the system try the next candidate."}
   ],3200);
  }catch(error){
   console.log("Drafting alternate candidate "+c.id+" failed: "+clean(error.message,180));
   continue;
  }
  if(String(draft.decision||"").toUpperCase()!=="PUBLISH"){
   console.log("Alternate candidate "+c.id+" skipped: "+clean(draft.decisionReason||"not suitable",200));
   continue;
  }
  const title=clean(draft.title),excerpt=clean(draft.excerpt,220),category=clean(draft.category||c.category,80);
  if(!title||!excerpt||category!==c.category){
   console.log("Alternate candidate "+c.id+" skipped because article metadata is incomplete or category changed.");
   continue;
  }
  let rawArticle=String(draft.articleMarkdown||"").trim();
  if(articleBodyLength(rawArticle)<3000){try{rawArticle=await ensureArticleLength(rawArticle,research,c.category)}catch(error){console.log("Expansion attempt failed: "+clean(error.message,180));continue;}}
  if(!rawArticle){console.log("Alternate candidate "+c.id+" skipped after short draft and failed expansion.");continue;}
  const article=prepareArticleCitations(rawArticle,opened.map(x=>x.url),enSources.map(x=>x.url));
  try{validateArticle(article,opened.map(x=>x.url),enSources.map(x=>x.url));}
  catch(error){console.log("Alternate candidate "+c.id+" failed link/length checks: "+clean(error.message,220));continue;}
  const id=uniqueSlug(draft.slug||title,posts);
  fs.writeFileSync(path.join(ROOT,"posts",id+".md"),article+"\n","utf8");
  addPost({slug:id,title,excerpt,category:c.category,read:Math.max(3,Math.min(30,parseInt(draft.read,10)||7))},posts);
  fs.writeFileSync(AUDIT,auditText({
   en,ar,sources:enSources,topic:c.topic+" — السوق الأصلي: "+c.country,
   decision:"PUBLISH",
   reason:"تم اختيار موضوع بديل عملي من مصادر متخصصة معروفة؛ لا يشترط وجود دراسة حالة بأرقام.",
   arSummary:draft.arabicMarketSummary||"تم فحص نتائج البحث العربية المحددة لاكتشاف التكرار الواضح فقط، ولا يُدّعى أن البحث شمل كل الإنترنت.",
   duplicate:draft.duplicateCheck||"تمت مقارنة الفكرة بالعناوين والملخصات الحالية قبل النشر."
  }),"utf8");
  out("publish","true");
  console.log("Prepared alternate practical article "+id+" for validation and cover generation.");
  return true;
 }
 return false;
}

const CATEGORIES = [
 {name:"البراندينج",topic:"branding brand strategy identity rebrand",queries:[
  "latest branding and brand strategy articles 2026 WARC Contagious Brand New",
  "site:contagious.com OR site:underconsideration.com OR site:warc.com branding brand identity rebrand 2026"
 ]},
 {name:"التصميم",topic:"graphic design visual identity packaging typography art direction",queries:[
  "latest graphic design visual identity packaging articles 2026 Adobe The Dieline Brand New",
  "site:thedieline.com OR site:adobe.com OR site:underconsideration.com OR site:itsnicethat.com design packaging typography 2026"
 ]},
 {name:"التسويق",topic:"marketing strategy campaigns consumer behavior content creators",queries:[
  "latest marketing strategy campaigns consumer trends articles 2026 Digiday HubSpot WARC",
  "site:digiday.com OR site:hubspot.com OR site:warc.com OR site:marketingweek.com marketing strategy campaign 2026"
 ]},
 {name:"الميديا باينج",topic:"media buying paid media advertising PPC search social ads",queries:[
  "latest paid media media buying advertising platform articles 2026 Search Engine Land IAB",
  "site:searchengineland.com OR site:iab.com OR site:thinkwithgoogle.com OR site:ads.tiktok.com media buying paid ads 2026"
 ]}
];

async function main(){
 if(!fs.existsSync(SEARCH))stop("Missing .github/scripts/search-web.js");
 fs.writeFileSync(LOG,"[]\n","utf8");
 const posts=readPosts(),existing=oldPosts(posts);
 const startIndex=Math.floor(Math.random()*CATEGORIES.length);
 const ordered=CATEGORIES.slice(startIndex).concat(CATEGORIES.slice(0,startIndex));
 let chosen=null,opened=[],en=[],enSources=[];
 for(const category of ordered){
  console.log("Trying random international category: "+category.name);
  const qset=category.queries.map(q=>clean(q+" October 2026",290));
  const found=[];
  for(const q of qset) found.push(await search(q,"en"));
  const candidates=foreignSources(found);
  const preferred=/(warc|contagious|brandnew|underconsideration|system1|ipa\.co\.uk|searchengineland|thinkwithgoogle|tiktok\.com|thedieline|ehrenberg-bass|adobe|digiday|hubspot|iab\.com|marketingweek|adweek|campaignlive|itsnicethat|creativebloq|designweek|marketingdive|google\.com|meta\.com)/i;
  candidates.sort((a,b)=>Number(preferred.test(host(b.url)))-Number(preferred.test(host(a.url))));
  const pages=[],hosts=new Set();
  for(const source of candidates.slice(0,10)){
   const page=fetchPage(source.url);
   if(!page||page.text.length<300)continue;
   const pageHost=host(page.url||source.url);
   if(!pageHost||hosts.has(pageHost))continue;
   hosts.add(pageHost);
   pages.push({title:clean(page.title||source.title,180),url:page.url||source.url,host:pageHost,text:clean(page.text,2500)});
   if(pages.length>=4)break;
  }
  if(pages.length){
   chosen=category;opened=pages;en=found;enSources=candidates;
   break;
  }
  console.log("No readable source page for "+category.name+"; trying the next category.");
 }
 if(!chosen||!opened.length){
  fs.writeFileSync(AUDIT,"# Article source log\n\nDate: "+TODAY+"\n\nNo readable international source was available.\n\n## Decision\nDECISION: SKIP — no readable source page.\n","utf8");
  out("publish","false");
  console.log("No article created because all source pages were unavailable.");
  return;
 }
 const pageBrief=opened.map((p,i)=>{
  const date=(p.text.match(/\b(?:20\d{2}[-/]\d{1,2}[-/]\d{1,2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+20\d{2})\b/i)||[])[0]||"not clearly visible";
  return{id:i+1,title:p.title,url:p.url,publisher:p.host,visibleDate:date,text:p.text.slice(0,2300)};
 });
 console.log("Opened "+opened.length+" original pages. Selected random category: "+chosen.name);
 let result;
 try{
  result=await ask([
   {role:"system",content:"Return JSON only. You are an Arabic translator/editor for a blog that publishes translation digests of recent international articles about branding, design, marketing, and media buying. Create a faithful, clear Arabic rendering of the important points in the selected source material. This is not an Egyptian-market adaptation, an opinion column, a fact-checking report, or a how-to article invented by you. Do not add Egypt/Arab-specific examples, hypothetical applications, unsupported recommendations, critiques about evidence, or a generic conclusion. Keep all names, dates, and numerical claims exactly as the source presents them; do not invent or silently change them. Do not reproduce or translate an entire copyrighted article verbatim or paragraph-by-paragraph; write a concise translation digest in fresh Arabic wording, keeping close paraphrase from any one source under 200 words. Use only supplied source pages. Put source links only at the end, never inline. Write natural professional Arabic, without filler."},
   {role:"user",content:"Blog date: "+TODAY+"\nRandomly selected category: "+chosen.name+" — topic area: "+chosen.topic+"\nExisting site articles (ALL posts; avoid the same source/article/core topic even if a new title would sound different): "+JSON.stringify(existing)+"\nRecent search results: "+JSON.stringify(en.flatMap(s=>(s.entry.results||[]).map(x=>({title:clean(x.title,160),url:x.url,snippet:clean(x.snippet,240)}))).slice(0,20))+"\nOpened original pages: "+JSON.stringify(pageBrief)+"\nChoose the newest relevant distinct original article among these pages, using a publication date only if it is visible in the supplied text. If the date is not visible, do not make one up. Return JSON fields: decision ('PUBLISH'/'SKIP'), title (Arabic translation of the headline), slug (English kebab-case), excerpt (Arabic <=220 characters), read (integer), sourceIds (array of page IDs actually used), articleMarkdown (Arabic body without H1 and without source links). If all available topics repeat an existing post, return SKIP and explain briefly in decisionReason. Keep the body a complete translation-style digest around 3,000–4,500 characters, with source-faithful subheadings. Do not add an Egypt application, hypothetical examples, your own recommendations, proof requirements, research-limitations sections, or a long analysis. No Arabic searches are wanted. The category metadata will remain exactly: "+chosen.name+"."}
  ],6200);
 }catch(error){
  stop("Could not prepare the translation digest: "+clean(error.message,260));
 }
 if(String(result.decision||"").toUpperCase()!=="PUBLISH"){
  fs.writeFileSync(AUDIT,"# Article source log\n\nDate: "+TODAY+"\nCategory: "+chosen.name+"\n\n"+
   pageBrief.map(p=>"- "+p.title+" — "+p.url).join("\n")+
   "\n\n## Existing Site Duplicate Check\n"+clean(result.decisionReason||"The available topics overlap with existing posts.",700)+
   "\n\n## Decision\nDECISION: SKIP — source topic is not distinct enough.\n","utf8");
  out("publish","false");
  console.log("Skipped the run because source topics overlap with existing articles.");
  return;
 }
 const title=clean(result.title,180),excerpt=clean(result.excerpt,220);
 let body=String(result.articleMarkdown||"").trim();
 if(!title||!excerpt||bodyLength(body)<2600||!/[\u0600-\u06ff]/.test(body)){
  console.log("The first draft was short; requesting one focused expansion without adding local examples.");
  const expansion=await ask([
   {role:"system",content:"Return JSON only. Expand an Arabic translation digest using only the supplied original source text. Do not add local examples, new analysis, opinions, fact checks, unsupported claims, or a generic conclusion. Do not copy source paragraphs verbatim. Preserve meaning. Return one key: articleMarkdown."},
   {role:"user",content:"Expand the draft to at least 3,000 characters by translating and explaining additional distinct points present in the source pages. Do not repeat sections. Source pages: "+JSON.stringify(pageBrief)+"\nCurrent draft: "+body}
  ],5000);
  body=String(expansion.articleMarkdown||body).trim();
 }
 if(bodyLength(body)<2600||!/[\u0600-\u06ff]/.test(body))stop("Article remained too short after the translation-only expansion. Nothing was written.");
 let used=Array.isArray(result.sourceIds)?result.sourceIds.map(id=>opened[Number(id)-1]).filter(Boolean):[];
 if(!used.length)used=[opened[0]];
 used=used.filter((p,i,a)=>a.findIndex(x=>norm(x.url)===norm(p.url))===i).slice(0,4);
 const footer="\n\n## المصادر الأصلية\n\n"+used.map(p=>"- ["+clean(p.title,180)+"]("+p.url+") — "+host(p.url)).join("\n")+"\n";
 body=body.replace(/\n\s*##\s*(?:المصادر|المراجع|المصادر الأصلية|sources|references)\b[\s\S]*$/i,"").trim()+footer;
 const slugValue=uniqueSlug(result.slug||opened[0].title,posts);
 const articlePath=path.join(ROOT,"posts",slugValue+".md");
 if(fs.existsSync(articlePath))stop("Refusing to overwrite existing file: "+slugValue);
 fs.mkdirSync(path.dirname(articlePath),{recursive:true});
 fs.writeFileSync(articlePath,"# "+title+"\n\n**تاريخ النشر على المدونة: "+TODAY+"**\n\n"+body+"\n","utf8");
 addPost({slug:slugValue,title,excerpt,category:chosen.name,read:Math.max(3,Math.min(30,parseInt(result.read,10)||7))},posts);
 fs.writeFileSync(AUDIT,"# Article source log\n\nDate: "+TODAY+"\nRandom category: "+chosen.name+"\n\n## English Searches\n"+
  en.map(x=>"- "+x.query+" ("+(x.entry.ok?"results found":"no results")+")").join("\n")+
  "\n\n## Selected Original Sources\n"+used.map(p=>"- "+p.title+" — "+p.url).join("\n")+
  "\n\n## Existing Site Duplicate Check\nCompared the topic against all "+existing.length+" current article records before writing; the selected source topic was not identified as a repeat.\n\n## Decision\nDECISION: PUBLISH — Arabic translation digest prepared from the selected original source pages.\n","utf8");
 out("publish","true");
 console.log("Prepared one translation digest: "+slugValue+" ("+chosen.name+").");
}

main().catch(e=>stop(e&&e.stack?e.stack:String(e)));
