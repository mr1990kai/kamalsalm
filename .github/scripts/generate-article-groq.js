const fs=require("fs"), path=require("path"), {spawnSync}=require("child_process");
const ROOT=process.cwd(), SEARCH=path.join(ROOT,".github/scripts/search-web.js"), LOG=path.join(ROOT,"web-search-log.json"), AUDIT=path.join(ROOT,"research-audit.md");
const TODAY=process.env.TODAY||new Date().toISOString().slice(0,10), MODEL=process.env.GROQ_MODEL||"openai/gpt-oss-20b";
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function stop(m){console.error("ARTICLE GENERATOR ERROR: "+m);process.exit(1)}
function out(k,v){if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,k+"="+v+"\n")}
function json(s){try{return JSON.parse(String(s||"").trim())}catch(e){throw Error("Groq response wasn't valid JSON: "+e.message+"; "+String(s).slice(0,200))}}
function clean(v,n=240){return String(v??"").replace(/\s+/g," ").trim().slice(0,n)}
async function ask(messages,maxTokens){
 const key=process.env.GROQ_API_KEY;if(!key)stop("Missing GROQ_API_KEY secret. Add it under GitHub Settings > Secrets and variables > Actions.");
 const res=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{authorization:"Bearer "+key,"content-type":"application/json"},body:JSON.stringify({model:MODEL,messages,temperature:.25,max_completion_tokens:maxTokens,response_format:{type:"json_object"},stream:false}),signal:AbortSignal.timeout(180000)});
 const raw=await res.text();let b;try{b=JSON.parse(raw)}catch(_){}
 if(!res.ok)throw Error("Groq API HTTP "+res.status+": "+(b?.error?.message||raw.slice(0,500)));
 const c=b?.choices?.[0]?.message?.content;if(!c)throw Error("Groq returned empty response");return json(c);
}
function readPosts(){global.window={};try{require(path.join(ROOT,"posts-data.js"))}catch(e){stop("Cannot read posts-data.js: "+e.message)}if(!Array.isArray(global.window.POSTS))stop("posts-data.js has no window.POSTS array");return global.window.POSTS}
function oldPosts(posts){return posts.slice(0,30).map(p=>({slug:p.slug,title:p.title,category:p.category,excerpt:clean(p.excerpt,140)}))}
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
function validateArticle(a,openedUrls,searchUrls){
 if(typeof a!=="string"||a.length<3500)throw Error("Article is shorter than 3,500 characters");
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
   clean(c.aq+" شرح تجربة تطبيق نصائح "+c.topic+" مصر",220),
   clean(c.aq+" التسويق الإلكتروني التجارة الإلكترونية البراندينج",220)
  ];
  for(const q of englishQueries)en.push(await search(q,"en"));
  for(const q of arabicQueries)ar.push(await search(q,"ar"));
  if(en.some(x=>!x.entry.ok)||ar.some(x=>!x.entry.ok)){
   console.log("Alternate candidate "+c.id+" skipped because one of its searches returned no usable results.");
   continue;
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
    {role:"user",content:"Date "+TODAY+"\nExisting posts: "+JSON.stringify(existing)+"\nAlternate candidate and real searches: "+JSON.stringify(research)+"\nReturn JSON: decision ('PUBLISH'/'SKIP'), decisionReason, arabicMarketSummary, duplicateCheck, title in Arabic, slug in English kebab-case, excerpt in Arabic <=220 characters, category, read integer, articleMarkdown.\nPublish a practical article unless its sources are unusable, the topic is clearly unrelated to the site, or the same topic already exists in our posts. No need for numerical proof or a measurable case study. Prefer insights from known specialist sites such as Shopify, HubSpot, Think with Google, Meta Business, TikTok for Business, Google Ads, Semrush, Ahrefs, BigCommerce, Adobe, WARC, Marketing Week, Nielsen, McKinsey, HBR or other established industry publishers when the actual search results support that choice. Do not claim novelty is proven; note the search scope honestly. Category must exactly equal "+JSON.stringify(c.category)+". Article must exceed 3500 characters in Egyptian-friendly Arabic, explain the foreign-source idea simply, show a concrete example and practical steps for applying it in Egypt, and clearly distinguish source facts from your recommendations. Include at least 3 direct Markdown source links; at least 2 must be from openedOriginalEnglishPages and every link must be from supplied search results or opened pages. If one candidate is unsuitable, SKIP and let the system try the next candidate."}
   ],6000);
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
  const article=String(draft.articleMarkdown||"").trim();
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

async function main(){
 if(!fs.existsSync(SEARCH))stop("Missing .github/scripts/search-web.js");fs.writeFileSync(LOG,"[]\n","utf8");const posts=readPosts(),existing=oldPosts(posts);
 console.log("1/3: Groq proposes three candidates.");
 const a=await ask([{role:"system",content:"Return JSON only. You are an editor for a practical Arabic marketing blog. Propose specific useful topics on media buying, branding and ecommerce based on major, well-known specialist websites and industry publishers. Research markets should be outside Egypt and the Arab world; prioritise the US, UK/Europe, China, Japan, South Korea, Singapore and Australia. A useful expert guide, platform documentation, strategy, framework or industry analysis is enough; do not require numerical results or a measured case study. Never invent facts, statistics, quotations or URLs."},{role:"user",content:"Egypt date "+TODAY+"\nExisting posts "+JSON.stringify(existing)+"\nReturn exactly 3 candidates from 3 different foreign countries/markets: candidates:[{id:'A',topic,angle,category,foreign_country,source_type,english_query,arabic_query},...]. Each candidate should be a useful practical insight supported by established specialist websites; a numerical case study is not required. The English query should find useful information from major publishers such as Shopify, HubSpot, Think with Google, Meta Business, TikTok for Business, Google Ads, Semrush, Ahrefs, BigCommerce, Adobe, WARC, Marketing Week or other known industry sources. The Arabic query is only a quick duplicate check, not a reason to demand proof of uniqueness. Category must be exactly one of: الميديا باينج، البراندينج، التجارة الإلكترونية. Core source links must be from foreign non-Arab websites."}],2200);
 if(!Array.isArray(a.candidates)||a.candidates.length<3)stop("Groq returned fewer than 3 candidates.");
 const cs=a.candidates.slice(0,3).map((c,i)=>({id:String(c.id||["A","B","C"][i]),topic:clean(c.topic),angle:clean(c.angle,350),category:clean(c.category||"التجارة الإلكترونية",80),country:clean(c.foreign_country,80),sourceType:clean(c.source_type,100),eq:clean(c.english_query,200),aq:clean(c.arabic_query,200)}));
 const forbiddenMarkets=/(egypt|cairo|arab|mena|middle east|north africa|saudi|uae|emirates|dubai|qatar|kuwait|bahrain|oman|jordan|lebanon|iraq|morocco|algeria|tunisia|libya|sudan|yemen|palestine|riyadh|jeddah|doha|casablanca|rabat|amman|beirut|muscat|manama)/i; const allowedCategories=new Set(["الميديا باينج","البراندينج","التجارة الإلكترونية"]); if(cs.some(c=>!c.country||forbiddenMarkets.test(c.country)||!allowedCategories.has(c.category)))stop("Each candidate must name a non-Arab foreign country and one valid blog category."); if(new Set(cs.map(c=>c.country.toLowerCase())).size<3||new Set(cs.map(c=>c.eq)).size<3||new Set(cs.map(c=>c.aq)).size<3)stop("Candidates must use 3 different foreign markets and distinct search queries."); for(const c of cs){if(!c.eq.toLowerCase().includes(c.country.toLowerCase()))c.eq=clean(c.eq+" "+c.country,200);if(!/(مصر|مصري|المصري)/.test(c.aq))c.aq=clean(c.aq+" مصر",200);}
 for(const c of cs){c.en=await search(c.eq,"en");c.ar=await search(c.aq,"ar");console.log("Searched candidate "+c.id+": English "+c.en.entry.ok+", Arabic "+c.ar.entry.ok)}
 const evidence=cs.map(c=>({id:c.id,topic:c.topic,angle:c.angle,english:pack(c.en),arabic:pack(c.ar)}));
 console.log("2/3: Groq selects a candidate based on the initial market check.");
 await wait(61000);
 const choose=await ask([{role:"system",content:"Return JSON only. Compare the search results and existing site coverage. Choose a genuinely useful, writable topic supported by well-known marketing/ecommerce specialist publishers. Do not require a specific country case study, ROAS numbers, experiments or numerical outcomes. Core links must be from foreign non-Arab websites. Prefer practical topics with clear application over overly narrow stories."},{role:"user",content:"Existing articles "+JSON.stringify(existing)+"\nCandidate search results "+JSON.stringify(evidence)+"\nReturn {selected_id:'A',reason:'...',english_followup_queries:['...','...'],arabic_followup_queries:['...','...']}. Select one supplied ID and give exactly two additional nonduplicate queries per language. English follow-ups should find practical guidance or analysis from established specialist sites and may use broader industry sources. Arabic follow-ups are a quick duplicate check only; they must not block a useful topic just because similar general advice exists. Arabic queries must contain Arabic characters."}],1800);
 const chosen=cs.find(c=>c.id===String(choose.selected_id||"").trim());if(!chosen)stop("No selected topic.");
 const e2=(choose.english_followup_queries||[]).slice(0,2).map(q=>{const query=clean(q,200);return query.toLowerCase().includes(chosen.country.toLowerCase())?query:clean(query+" "+chosen.country,200)}),a2=(choose.arabic_followup_queries||[]).slice(0,2).map(q=>{const query=clean(q,200);return /(مصر|مصري|المصري)/.test(query)?query:clean(query+" مصر",200)});
 if(e2.length!==2||a2.length!==2||a2.some(q=>!/[\u0600-\u06FF]/.test(q)))stop("Invalid follow-up searches.");
 const en=[chosen.en],ar=[chosen.ar];for(const q of e2)en.push(await search(q,"en"));for(const q of a2)ar.push(await search(q,"ar"));
 if(en.some(s=>!s.entry.ok)||ar.some(s=>!s.entry.ok))stop("A required English/Arabic search failed; nothing will be published.");
 const enSources=foreignSources(en),opened=[],openedHosts=new Set();for(const s of enSources.slice(0,8)){const p=fetchPage(s.url);if(p?.text&&p.text.length>500&&isForeignEvidence({url:p.url||s.url,title:p.title||s.title})){const h=host(p.url||s.url);if(!openedHosts.has(h)){opened.push(p);openedHosts.add(h)}}if(opened.length>=3)break} if(new Set(enSources.map(s=>host(s.url))).size<2||openedHosts.size<2){console.log("Primary candidate lacks enough open source pages; trying alternatives.");if(await tryAlternateCandidates({candidates:cs,excludeId:chosen.id,posts,existing}))return;const reason="لم يتم العثور على صفحتين أصليتين قابلتين للفتح من مصدرين أجنبيين مستقلين خارج مصر والمنطقة العربية؛ تم إيقاف النشر بدل الاعتماد على مصادر ضعيفة أو غير قابلة للتحقق.";fs.writeFileSync(AUDIT,auditText({en,ar,sources:enSources,topic:chosen.topic+" — السوق الأصلي: "+chosen.country,decision:"SKIP",reason,arSummary:"تم تنفيذ بحث عربي عن الفكرة المحددة ومراجعة النتائج الظاهرة، لكن لم تتوفر أدلة أجنبية مستقلة كافية ومفتوحة للتحقق من تفاصيل الحالة. لذلك لم يتم إنشاء مقال أو نشره.",duplicate:"تمت مقارنة الفكرة بالعناوين والملخصات الموجودة في posts-data.js؛ قرار التخطي هنا سببه عدم كفاية المصادر الأجنبية القابلة للتحقق."}),"utf8");out("publish","false");console.log("Editorial decision: SKIP — not enough verifiable foreign source pages.");return}
 const research={candidate:{topic:chosen.topic,angle:chosen.angle,category:chosen.category,foreignCountry:chosen.country,sourceType:chosen.sourceType},englishSearches:en.map(s=>({query:s.entry.query,language:"en",ok:s.entry.ok,results:(s.entry.results||[]).filter(isForeignEvidence).slice(0,3).map(r=>({title:clean(r.title,180),url:r.url,snippet:clean(r.snippet,250)}))})),arabicSearches:ar.map(s=>pack(s,3)),openedOriginalEnglishPages:opened};
 console.log("3/3: Groq makes the publication decision and drafts the article.");
 await wait(61000);
 const result=await ask([{role:"system",content:"Return JSON only. You are the lead practical editor for Kamal Elnhrawy's Arabic marketing blog. Use well-known specialist marketing/ecommerce publishers and the actual source pages/search results supplied. A how-to guide, official platform explanation, industry framework or expert analysis is perfectly publishable; numerical results or an experimental case study are not required. Never invent companies, statistics, quotes, sources or URLs. Do not overstate a source's claims. Write original, easy-to-understand Arabic analysis, not a translation, and turn the idea into practical steps and an example suitable for Egypt. Skip only if sources are unusable, topic is irrelevant, or the same core topic is already covered by the site."},{role:"user",content:"Egypt date "+TODAY+"\nExisting articles "+JSON.stringify(existing)+"\nActual research results "+JSON.stringify(research)+"\nReturn JSON fields decision ('PUBLISH'/'SKIP'), decisionReason, arabicMarketSummary, duplicateCheck, title (Arabic), slug (English kebab case), excerpt (Arabic <=220 chars), category (Arabic), read (integer), articleMarkdown.\nPUBLISH when at least two useful foreign specialist source pages can be opened and the article is practically helpful. Do not require quantified results, a measured case study, or proof that the whole Arabic internet lacks the idea. Check existing posts to avoid an exact duplicate, but general overlap is acceptable. Never claim absolute uniqueness or say \"first in Egypt\"; describe the limited search scope honestly.\nIf PUBLISH, category must match the chosen candidate and be exactly one of الميديا باينج، البراندينج، التجارة الإلكترونية. Article must exceed 3500 characters, explain the main idea from the foreign specialist sources simply, include a concrete example and give practical steps to apply it in Egypt. A quantified foreign case is optional. Include at least 3 direct Markdown source links; at least 2 MUST be URLs from openedOriginalEnglishPages. Cite stats only if shown in those opened pages. No fabricated sources, numbers, citations or cover path."}],6000);
 const decision=String(result.decision||"").toUpperCase()==="PUBLISH"?"PUBLISH":"SKIP",reason=clean(result.decisionReason||"الأدلة غير كافية للنشر.",450);
 fs.writeFileSync(AUDIT,auditText({en,ar,sources:enSources,topic:chosen.topic+" — السوق الأصلي: "+chosen.country,decision,reason,arSummary:result.arabicMarketSummary||"تمت مراجعة النتائج العربية المعروضة فقط؛ لا يمكن ضمان تغطية كل مواقع الإنترنت.",duplicate:result.duplicateCheck||"تمت مقارنة الفكرة بالعناوين والملخصات الموجودة في posts-data.js."}),"utf8");
 if(decision==="SKIP"){
   console.log("Editorial decision: SKIP — "+reason);
   console.log("Trying other researched candidates before abandoning today’s article.");
   if(await tryAlternateCandidates({candidates:cs,excludeId:chosen.id,posts,existing}))return;
   console.log("All candidate fallbacks were checked; one final review of the same useful specialist sources remains.");
   await wait(61000);
   let retry;
   try {
     retry=await ask([
       {role:"system",content:"Return JSON only. Reconsider whether the same topic can become a useful, original practical article based on the supplied major specialist sources. Do not invent facts, statistics or URLs; measured outcomes are not required. If this candidate is unsuitable, return SKIP so another candidate can be tried. Cite only supplied source URLs. Never claim absolute uniqueness."},
       {role:"user",content:"The first draft chose SKIP. Give one final independent editorial review. Date "+TODAY+". Existing posts: "+JSON.stringify(existing)+"\\nVerified evidence: "+JSON.stringify(research)+"\\nReturn decision, decisionReason, arabicMarketSummary, duplicateCheck, title, slug, excerpt, category, read, articleMarkdown. If PUBLISH, article must be over 3500 characters, cite at least 3 direct URLs from supplied sources, at least 2 URLs must be from openedOriginalEnglishPages, and category must exactly equal "+JSON.stringify(chosen.category)+". Do not publish if evidence is insufficient."}
     ],6000);
   } catch(error) { console.log("Final evidence review failed: "+clean(error.message,180)); }
   if(String(retry?.decision||"").toUpperCase()!=="PUBLISH"){
     fs.appendFileSync(AUDIT,"\\n## Final Review\\n- أُعيد تقييم الأدلة مرة أخيرة؛ لم تتوفر أدلة كافية للنشر دون اختلاق معلومات.\\n");
     out("publish","false");return;
   }
   result.decision="PUBLISH";result.decisionReason=retry.decisionReason;result.arabicMarketSummary=retry.arabicMarketSummary;result.duplicateCheck=retry.duplicateCheck;result.title=retry.title;result.slug=retry.slug;result.excerpt=retry.excerpt;result.category=retry.category;result.read=retry.read;result.articleMarkdown=retry.articleMarkdown;
   const retryArticle=String(result.articleMarkdown||"").trim();
   try { validateArticle(retryArticle,opened.map(s=>s.url),enSources.map(s=>s.url)); }
   catch(error) { fs.appendFileSync(AUDIT,"\\n## Final Review\\n- فشل المقال البديل في التحقق: "+clean(error.message,300)+"\\n");out("publish","false");return; }
   fs.writeFileSync(AUDIT,auditText({en,ar,sources:enSources,topic:chosen.topic+" — السوق الأصلي: "+chosen.country,decision:"PUBLISH",reason:"اجتاز مراجعة تحريرية إضافية باستخدام نفس الأدلة الأجنبية المفتوحة.",arSummary:result.arabicMarketSummary||"تم فحص نتائج البحث العربية المحددة فقط.",duplicate:result.duplicateCheck||"تمت مقارنة الفكرة بالمقالات الحالية."}),"utf8");
   const retrySlug=uniqueSlug(result.slug||result.title,posts);
   fs.writeFileSync(path.join(ROOT,"posts",retrySlug+".md"),retryArticle+"\\n","utf8");
   addPost({slug:retrySlug,title:clean(result.title),excerpt:clean(result.excerpt,220),category:chosen.category,read:Math.max(3,Math.min(30,parseInt(result.read,10)||7))},posts);
   out("publish","true");console.log("Prepared reviewed retry article "+retrySlug+" for validation and cover generation.");return;
 }
 const title=clean(result.title),excerpt=clean(result.excerpt,220),category=clean(result.category||chosen.category,80),readTime=Math.max(3,Math.min(30,parseInt(result.read,10)||7));
 if(!title||!excerpt||!category)stop("Missing title/excerpt/category.");if(category!==chosen.category)stop("Article category must match the selected editorial branch: "+chosen.category);
 const article=String(result.articleMarkdown||"").trim();try{validateArticle(article,opened.map(s=>s.url),enSources.map(s=>s.url))}catch(e){stop(e.message)}
 const id=uniqueSlug(result.slug||title,posts),pathName=path.join(ROOT,"posts",id+".md");if(fs.existsSync(pathName))stop("Refusing to overwrite an existing article "+id);
 fs.writeFileSync(pathName,article+"\n","utf8");addPost({slug:id,title,excerpt,category,read:readTime},posts);out("publish","true");console.log("Prepared article "+id+" for validation and cover generation.");
}
main().catch(e=>stop(e&&e.stack?e.stack:String(e)));
