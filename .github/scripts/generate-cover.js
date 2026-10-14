const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execFileSync } = require("child_process");

const root = process.cwd();
const auditPath = path.join(root, "research-audit.md");
if (!fs.existsSync(auditPath)) {
  console.log("No research audit found; cover generation skipped.");
  process.exit(0);
}
const audit = fs.readFileSync(auditPath, "utf8");
if (!/DECISION:\s*PUBLISH\b/i.test(audit)) {
  console.log("Research decision is not PUBLISH; cover generation skipped.");
  process.exit(0);
}
const untracked = execFileSync("git", [
  "ls-files", "--others", "--exclude-standard", "--", "posts/*.md"
], { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);
if (untracked.length !== 1) throw new Error("Expected exactly one new article file.");

const slug = path.basename(untracked[0], ".md");
global.window = {};
require(path.join(root, "posts-data.js"));
const posts = global.window.POSTS;
if (!Array.isArray(posts)) throw new Error("posts-data.js did not expose window.POSTS.");
const post = posts.find(function(item) { return item.slug === slug; });
if (!post) throw new Error("New article metadata not found for slug: " + slug);

const coverDir = path.join(root, "images", "covers");
fs.mkdirSync(coverDir, { recursive: true });
const coverRelative = "images/covers/" + slug + ".svg";
const coverPath = path.join(root, coverRelative);
const seedHex = crypto.createHash("sha256")
  .update([slug, post.title, post.category].join("|")).digest("hex");
let seed = parseInt(seedHex.slice(0, 8), 16) >>> 0;
function rand() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}
function pick(items) { return items[Math.floor(rand() * items.length)]; }
function esc(value) {
  return String(value == null ? "" : value).replace(/&/g, "&amp;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function wrap(text, maxChars, maxLines) {
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? line + " " + word : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else line = next;
  }
  if (line && lines.length < maxLines) lines.push(line);
  const original = words.join(" ");
  if (lines.join(" ").length < original.length && lines.length) {
    let last = lines[lines.length - 1];
    while (last.length > 2 && (last + "…").length > maxChars) last = last.slice(0, -1);
    lines[lines.length - 1] = last.replace(/[،,;:.\s]+$/, "") + "…";
  }
  return lines.length ? lines : ["مقال جديد"];
}
const title = String(post.title || "مقال جديد").trim();
const category = String(post.category || "التسويق").trim();
const combined = (category + " " + title).toLowerCase();
let scene = "analytics";
if (/media|paid|ad |ads|advert|campaign|باينج|إعلان|إعلانات|حملة|حملات|ميديا/.test(combined)) scene = "ads";
if (/ecommerce|e-commerce|shop|store|order|price|discount|profit|تجارة|متجر|طلبات|خصم|ربح|سعر|مبيعات/.test(combined)) scene = "commerce";
if (/brand|branding|براند|هوية|علامة تجارية/.test(combined)) scene = "brand";
if (/conversion|landing|funnel|تحويل|صفحة هبوط|تجربة المستخدم/.test(combined)) scene = "conversion";
const palettes = [
 {bg:"#F3E9DB",ink:"#2B1810",accent:"#D97845",second:"#E8B84B",mint:"#83A99A",paper:"#FFF9F0"},
 {bg:"#E8EDE6",ink:"#1E342E",accent:"#D76E55",second:"#E0B84D",mint:"#8CAFA3",paper:"#F9F7ED"},
 {bg:"#EEE6F1",ink:"#30213B",accent:"#C86B58",second:"#D8AD4D",mint:"#8FA7C4",paper:"#FCF8F1"},
 {bg:"#E8EDF4",ink:"#1C2D46",accent:"#E17849",second:"#E6C35A",mint:"#79A9A5",paper:"#FFF9F0"},
 {bg:"#F0E7E1",ink:"#38251D",accent:"#B85D55",second:"#D8AC58",mint:"#84A99B",paper:"#FFFAF4"}
];
const palette = palettes[parseInt(seedHex.slice(8, 10), 16) % palettes.length];
const art = [];
function rect(x,y,w,h,fill,rx,extra) { art.push('<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+(rx||0)+'" fill="'+fill+'" '+(extra||"")+'/>'); }
function circle(cx,cy,r,fill,extra) { art.push('<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="'+fill+'" '+(extra||"")+'/>'); }
function line(x1,y1,x2,y2,stroke,width,extra) { art.push('<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+stroke+'" stroke-width="'+width+'" stroke-linecap="round" '+(extra||"")+'/>'); }
function pathSvg(d,fill,extra) { art.push('<path d="'+d+'" fill="'+fill+'" '+(extra||"")+'/>'); }
function textSvg(x,y,value,size,fill,extra) { art.push('<text x="'+x+'" y="'+y+'" font-family="Arial, sans-serif" font-size="'+size+'" font-weight="700" fill="'+fill+'" '+(extra||"")+'>'+esc(value)+'</text>'); }

rect(82,78,470,474,palette.ink,34);
rect(110,106,414,418,palette.paper,25);
for (let i=0;i<7;i++) for (let j=0;j<5;j++) circle(135+i*56,130+j*54,1.6+rand()*1.2,palette.ink,'opacity="'+(0.12+rand()*0.1)+'"');

if (scene === "ads") {
  rect(157,168,318,246,palette.bg,17);
  rect(157,168,318,43,palette.ink,17); rect(157,194,318,17,palette.ink,0);
  for(let i=0;i<3;i++) circle(179+i*17,189,4,i===0?palette.accent:palette.second);
  rect(181,230,112,55,"#FFFFFF",9); rect(304,230,147,55,"#FFFFFF",9);
  rect(195,243,49,5,palette.mint,3); rect(195,255,78,8,palette.ink,3,'opacity="0.16"');
  textSvg(323,252,"ROAS",12,palette.ink);
  textSvg(323,273,["2.4x","3.1x","4.2x","1.8x"][parseInt(seedHex.slice(10,12),16)%4],19,palette.accent);
  for(let i=0;i<7;i++){const h=28+rand()*78;rect(186+i*36,385-h,19,h,[palette.accent,palette.second,palette.mint][i%3],5);}
  pathSvg("M181 347 C222 329 239 350 269 324 S327 310 354 292 S408 296 451 260","none",'stroke="'+palette.accent+'" stroke-width="5" stroke-linecap="round"');
  circle(451,260,7,palette.second);
} else if (scene === "commerce") {
  rect(163,226,156,164,palette.accent,18);
  pathSvg("M199 229 C199 178 283 178 283 229","none",'stroke="'+palette.ink+'" stroke-width="12" stroke-linecap="round"');
  rect(190,256,101,10,palette.paper,4); rect(190,275,76,8,palette.paper,4,'opacity="0.7"'); rect(190,294,88,8,palette.paper,4,'opacity="0.7"');
  circle(376,267,63,palette.second); circle(376,267,48,palette.paper);
  textSvg(376,278,"EGP",21,palette.ink,'text-anchor="middle"');
  rect(334,342,112,72,palette.mint,12); rect(350,359,80,7,palette.ink,3,'opacity="0.65"'); rect(350,376,55,7,palette.ink,3,'opacity="0.45"');
  circle(164+rand()*26,180+rand()*20,15,palette.mint); circle(434+rand()*24,198+rand()*20,10,palette.accent);
  pathSvg("M333 214 L350 197 L366 212","none",'stroke="'+palette.ink+'" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"');
} else if (scene === "brand") {
  circle(252,270,105,palette.accent); circle(318,270,105,palette.second,'opacity="0.88"'); circle(283,330,90,palette.mint,'opacity="0.88"');
  rect(159,165,280,52,palette.paper,10); textSvg(299,198,"BRAND / STORY",17,palette.ink,'text-anchor="middle"');
  rect(166,433,70,27,palette.ink,6); rect(247,433,70,27,palette.accent,6); rect(328,433,70,27,palette.mint,6); rect(409,433,31,27,palette.second,6);
  circle(441,357,23,palette.paper); circle(441,357,12,palette.ink);
} else if (scene === "conversion") {
  rect(160,157,330,288,palette.bg,18); rect(160,157,330,39,palette.ink,18); rect(160,180,330,16,palette.ink,0);
  for(let i=0;i<3;i++) circle(181+i*16,177,4,palette.second);
  rect(185,219,115,12,palette.ink,5,'opacity="0.13"'); rect(185,239,190,8,palette.ink,4,'opacity="0.11"'); rect(185,257,165,8,palette.ink,4,'opacity="0.11"');
  pathSvg("M185 283 L454 283 L401 340 L238 340 Z",palette.accent); pathSvg("M238 352 L401 352 L373 390 L268 390 Z",palette.second); pathSvg("M268 401 L373 401 L351 431 L291 431 Z",palette.mint);
  circle(421,244,37,palette.paper,'stroke="'+palette.ink+'" stroke-width="4"'); circle(421,244,22,"none",'stroke="'+palette.accent+'" stroke-width="6'); line(446,269,468,291,palette.ink,8);
} else {
  rect(153,157,328,288,palette.bg,18);
  for(let i=0;i<4;i++) line(180,218+i*48,452,218+i*48,palette.ink,1,'opacity="0.13"');
  for(let i=0;i<6;i++){const h=48+rand()*140;rect(187+i*41,414-h,24,h,[palette.accent,palette.second,palette.mint][(i+parseInt(seedHex.slice(12,14),16))%3],6);}
  pathSvg("M183 335 C223 305 246 330 275 291 S325 286 347 256 S402 270 453 210","none",'stroke="'+palette.ink+'" stroke-width="5" stroke-linecap="round'); circle(453,210,8,palette.accent);
  circle(430,174,14,palette.second);
}
for(let i=0;i<10;i++){const x=125+rand()*380,y=125+rand()*380;circle(x,y,2+rand()*2.5,pick([palette.accent,palette.second,palette.mint]),'opacity="'+(0.4+rand()*0.45)+'"');}
circle(504,480,24,palette.second); textSvg(504,487,String((parseInt(seedHex.slice(14,16),16)%8)+1).padStart(2,"0"),15,palette.ink,'text-anchor="middle"');

const titleLines = wrap(title,22,3);
const titleStartY = titleLines.length===3?310:titleLines.length===2?330:350;
const titleSize = title.length>65?32:title.length>42?36:40;
const titleSvg = titleLines.map(function(value,index){
  return '<text x="1115" y="'+(titleStartY+index*61)+'" text-anchor="end" direction="rtl" unicode-bidi="plaintext" font-family="Arial, sans-serif" font-size="'+titleSize+'" font-weight="700" fill="'+palette.ink+'">'+esc(value)+'</text>';
}).join("\n");
const categoryText = category.length>30?category.slice(0,29)+"…":category;
const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">' +
'<title id="title">'+esc(title)+'</title><desc id="desc">غلاف مرسوم خصيصًا لمقال '+esc(category)+' بتكوين بصري فريد مرتبط بموضوع المقال.</desc>' +
'<rect width="1200" height="630" fill="'+palette.bg+'"/><circle cx="1110" cy="82" r="190" fill="'+palette.second+'" opacity="0.18"/><circle cx="720" cy="610" r="170" fill="'+palette.accent+'" opacity="0.10"/><path d="M580 0 H594 V630 H580 Z" fill="'+palette.ink+'" opacity="0.08"/>' +
'<g>'+art.join("\n")+'</g><rect x="730" y="116" width="385" height="44" rx="22" fill="'+palette.ink+'"/>' +
'<text x="1088" y="144" text-anchor="end" direction="rtl" unicode-bidi="plaintext" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="'+palette.paper+'">'+esc(categoryText)+'</text>' +
titleSvg+'<line x1="812" y1="512" x2="1115" y2="512" stroke="'+palette.ink+'" stroke-width="2" opacity="0.22"/>' +
'<text x="1115" y="548" text-anchor="end" font-family="Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="3" fill="'+palette.ink+'">KAMAL ELNHRAWY</text>' +
'<text x="1115" y="577" text-anchor="end" direction="rtl" unicode-bidi="plaintext" font-family="Arial, sans-serif" font-size="15" fill="'+palette.ink+'" opacity="0.68">أفكار تسويقية من الواقع</text>' +
'<circle cx="752" cy="536" r="6" fill="'+palette.accent+'"/><circle cx="773" cy="536" r="6" fill="'+palette.second+'"/><circle cx="794" cy="536" r="6" fill="'+palette.mint+'"/></svg>';

fs.writeFileSync(coverPath, svg, "utf8");
const sourcePath = path.join(root, "posts-data.js");
let source = fs.readFileSync(sourcePath, "utf8");
const found = new RegExp("slug\\s*:\\s*(['\"])" + slug + "\\1").exec(source);
if (!found) throw new Error("Could not locate metadata for slug: " + slug);
const open = source.lastIndexOf("  {", found.index);
const closingLine = source.indexOf("\n  }", found.index);
if (open < 0 || closingLine < 0) throw new Error("Could not safely isolate post metadata.");
let block = source.slice(open, closingLine + 4);
if (/cover\s*:/.test(block)) {
  block = block.replace(/^\s*cover:\s*['"][^'"]*['"],?\s*$/m, "");
}
const ending = block.match(/(\n[ \t]*[A-Za-z_$][\w$]*:\s*[^\n,]+),?(\n  \})$/);
if (!ending) throw new Error("Could not safely add cover metadata.");
block = block.replace(/(\n[ \t]*[A-Za-z_$][\w$]*:\s*[^\n,]+),?(\n  \})$/, "$1,\n    cover: '" + coverRelative + "'$2");
source = source.slice(0, open) + block + source.slice(closingLine + 4);
fs.writeFileSync(sourcePath, source, "utf8");
console.log("Generated unique SVG cover: " + coverRelative);
console.log("Updated metadata for article: " + slug);
