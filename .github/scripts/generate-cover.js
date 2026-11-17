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
    while (last.length > 3 && (last + "…").length > maxChars) last = last.slice(0, -1);
    lines[lines.length - 1] = last.replace(/[،,;:. \t]+$/, "") + "…";
  }
  return lines.length ? lines : ["مقال جديد"];
}

const title = String(post.title || "مقال جديد").trim();
const category = String(post.category || "التسويق").trim();
const combined = (category + " " + title + " " + slug).toLowerCase();
let scene = "insight";
if (/media|paid|ad |ads|advert|campaign|باينج|إعلان|إعلانات|حملة|حملات|ميديا/.test(combined)) scene = "ads";
if (/ecommerce|e-commerce|shop|store|order|price|discount|profit|تجارة|متجر|طلبات|خصم|ربح|سعر|مبيعات|منتج/.test(combined)) scene = "commerce";
if (/brand|branding|براند|هوية|علامة تجارية|شعار|تغليف/.test(combined)) scene = "brand";
if (/conversion|landing|funnel|تحويل|صفحة هبوط|تجربة المستخدم|تجربة العميل/.test(combined)) scene = "conversion";

const ink = "#111111";
const paper = "#F3F2EE";
const red = "#B42318";
const mutedRed = "#E7B4AF";
const ochre = "#D8B96A";
const sage = "#73877C";
const grey = "#777773";
const art = [];
function rect(x,y,w,h,fill,rx,extra) {
  art.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
    '" rx="' + (rx || 0) + '" fill="' + fill + '" ' + (extra || "") + '/>');
}
function circle(cx,cy,r,fill,extra) {
  art.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r +
    '" fill="' + fill + '" ' + (extra || "") + '/>');
}
function line(x1,y1,x2,y2,stroke,width,extra) {
  art.push('<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
    '" stroke="' + stroke + '" stroke-width="' + width +
    '" stroke-linecap="round" ' + (extra || "") + '/>');
}
function pathSvg(d,fill,extra) {
  art.push('<path d="' + d + '" fill="' + (fill || "none") + '" ' + (extra || "") + '/>');
}

rect(92, 128, 400, 370, "#1E1E1E", 20);
rect(112, 148, 360, 330, "none", 12, 'stroke="#454545" stroke-width="1.5"');
for (let i=0; i<5; i++) {
  line(130, 175 + i*62, 455, 175 + i*62, "#454545", 1, 'opacity=".55"');
}

if (scene === "ads") {
  rect(144, 194, 132, 206, paper, 12);
  rect(291, 170, 150, 230, sage, 12);
  rect(164, 215, 92, 74, red, 8);
  circle(210, 252, 24, ochre);
  rect(164, 305, 92, 8, ink, 4);
  rect(164, 326, 72, 7, grey, 3);
  rect(312, 193, 108, 82, ochre, 8);
  circle(366, 234, 25, red);
  for (let i=0; i<4; i++) rect(312, 294+i*20, 82-i*13, 6, paper, 3);
  pathSvg("M152 447 C215 412 254 444 301 413 S390 380 451 350", "none",
    'stroke="' + red + '" stroke-width="7" stroke-linecap="round"');
} else if (scene === "commerce") {
  rect(154, 228, 140, 175, ochre, 15);
  pathSvg("M184 230 C184 174 265 174 265 230", "none",
    'stroke="' + paper + '" stroke-width="11" stroke-linecap="round"');
  rect(177, 263, 95, 10, ink, 4);
  rect(177, 285, 72, 8, ink, 4, 'opacity=".55"');
  circle(376, 266, 72, red);
  circle(376, 266, 48, paper);
  rect(322, 358, 108, 48, sage, 10);
  rect(342, 375, 69, 7, ink, 3);
  line(293, 310, 321, 358, paper, 5);
  circle(432, 172, 12, mutedRed);
} else if (scene === "brand") {
  circle(268, 306, 103, red);
  circle(326, 306, 103, ochre, 'opacity=".94"');
  circle(297, 366, 83, sage, 'opacity=".95"');
  rect(151, 185, 272, 46, paper, 8);
  rect(176, 201, 70, 13, ink, 4);
  rect(258, 201, 56, 13, red, 4);
  rect(327, 201, 74, 13, sage, 4);
  for(let i=0;i<5;i++) line(160+i*68, 457, 160+i*68, 474, [red,ochre,sage][i%3], 8);
} else if (scene === "conversion") {
  rect(154, 178, 285, 255, paper, 14);
  rect(176, 199, 240, 24, ink, 6);
  pathSvg("M184 252 L412 252 L367 315 L229 315 Z", red);
  pathSvg("M229 328 L367 328 L340 372 L255 372 Z", ochre);
  pathSvg("M255 384 L340 384 L320 416 L274 416 Z", sage);
  circle(396, 260, 30, "none", 'stroke="' + ink + '" stroke-width="5"');
  line(417, 281, 443, 307, ink, 8);
} else {
  rect(152, 194, 284, 202, paper, 14);
  for (let i=0; i<6; i++) {
    const h = 52 + rand()*105;
    rect(177+i*40, 375-h, 23, h, [red,ochre,sage][(i + parseInt(seedHex.slice(10,12),16))%3], 5);
  }
  pathSvg("M174 335 C218 310 247 332 281 288 S344 275 369 242 S411 240 443 209", "none",
    'stroke="' + ink + '" stroke-width="6" stroke-linecap="round"');
  circle(443, 209, 8, red);
  circle(403, 173, 17, ochre);
}
for (let i=0; i<12; i++) {
  const x = 126 + rand()*330;
  const y = 161 + rand()*320;
  circle(x, y, 2 + rand()*2, pick([red, ochre, sage]), 'opacity=".72"');
}

const titleLines = wrap(title, 19, 4);
const titleSize = titleLines.some(function(line){ return line.length > 19; }) ? 32 :
  (title.length > 58 ? 34 : 39);
const titleStartY = titleLines.length === 4 ? 242 : titleLines.length === 3 ? 278 :
  titleLines.length === 2 ? 324 : 370;
const titleSvg = titleLines.map(function(value, index) {
  return '<text x="1110" y="' + (titleStartY + index*62) +
    '" text-anchor="end" direction="rtl" unicode-bidi="plaintext" font-family="Arial,Tahoma,sans-serif" font-size="' +
    titleSize + '" font-weight="700" fill="' + ink + '">' + esc(value) + '</text>';
}).join("\n");
const categoryText = category.length > 24 ? category.slice(0, 23) + "…" : category;

const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' +
'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">' +
'<title id="title">' + esc(title) + '</title><desc id="desc">غلاف تحريري عالي التباين لمقال ' + esc(category) + '.</desc>' +
'<rect width="1200" height="630" fill="' + paper + '"/>' +
'<circle cx="1090" cy="70" r="190" fill="' + ochre + '" opacity=".13"/>' +
'<circle cx="610" cy="620" r="170" fill="' + red + '" opacity=".07"/>' +
'<rect x="64" y="58" width="468" height="514" rx="26" fill="' + ink + '"/>' +
'<text x="96" y="91" font-family="Arial,sans-serif" font-size="13" font-weight="700" letter-spacing="3" fill="' + paper + '">KAMAL / FIELD NOTES</text>' +
'<g>' + art.join("\n") + '</g>' +
'<rect x="650" y="106" width="460" height="44" rx="22" fill="' + red + '"/>' +
'<text x="1080" y="135" text-anchor="end" direction="rtl" unicode-bidi="plaintext" font-family="Arial,Tahoma,sans-serif" font-size="19" font-weight="700" fill="#FFFFFF">' + esc(categoryText) + '</text>' +
titleSvg +
'<line x1="650" y1="508" x2="1110" y2="508" stroke="#BDBDB6" stroke-width="2"/>' +
'<circle cx="668" cy="548" r="6" fill="' + red + '"/><circle cx="690" cy="548" r="6" fill="' + ochre + '"/><circle cx="712" cy="548" r="6" fill="' + sage + '"/>' +
'<text x="1110" y="554" text-anchor="end" font-family="Arial,sans-serif" font-size="19" font-weight="700" letter-spacing="3" fill="' + ink + '">KAMAL ELNHAWRY</text>' +
'<text x="1110" y="582" text-anchor="end" direction="rtl" unicode-bidi="plaintext" font-family="Arial,Tahoma,sans-serif" font-size="16" fill="#595959">أفكار تسويقية من الواقع</text></svg>';

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
block = block.replace(/(\n[ \t]*[A-Za-z_$][\w$]*:\s*[^\n,]+),?(\n  \})$/,
  "$1,\n    cover: '" + coverRelative + "'$2");
source = source.slice(0, open) + block + source.slice(closingLine + 4);
fs.writeFileSync(sourcePath, source, "utf8");
console.log("Generated high-contrast editorial SVG cover: " + coverRelative);
console.log("Updated metadata for article: " + slug);
