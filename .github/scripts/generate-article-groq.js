const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
const SEARCH = path.join(ROOT, ".github/scripts/search-web.js");
const LOG = path.join(ROOT, "web-search-log.json");
const AUDIT = path.join(ROOT, "research-audit.md");
const TODAY = process.env.TODAY || new Date().toISOString().slice(0, 10);
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

function stop(message) {
  console.error("ARTICLE GENERATOR ERROR: " + message);
  process.exit(1);
}
function output(key, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, key + "=" + value + "\n");
}
function clean(value, max) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max || 240);
}
function parseJson(value) {
  try { return JSON.parse(String(value || "").trim()); }
  catch (error) { throw new Error("Model response was not valid JSON: " + error.message); }
}
function retryDelay(response) {
  const after = Number(response.headers.get("retry-after"));
  if (Number.isFinite(after) && after > 0) return Math.max(1500, Math.min(90000, after * 1000 + 1000));
  const reset = String(response.headers.get("x-ratelimit-reset-tokens") || response.headers.get("x-ratelimit-reset-requests") || "");
  const mins = Number((reset.match(/(\d+(?:\.\d+)?)m/i) || [])[1] || 0);
  const secs = Number((reset.match(/(\d+(?:\.\d+)?)s/i) || [])[1] || 0);
  return Math.max(1500, Math.min(90000, (mins * 60 + secs) * 1000 + 1500)) || 65000;
}
async function ask(messages, maxTokens) {
  const key = process.env.GROQ_API_KEY;
  if (!key) stop("Missing GROQ_API_KEY secret in GitHub Actions.");
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: "Bearer " + key, "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        temperature: attempt === 0 ? 0.35 : 0.1,
        max_completion_tokens: maxTokens || 5200,
        response_format: { type: "json_object" },
        stream: false
      }),
      signal: AbortSignal.timeout(180000)
    });
    const raw = await response.text();
    let body;
    try { body = JSON.parse(raw); } catch (_) {}
    if (!response.ok) {
      lastError = new Error("Groq HTTP " + response.status + ": " + (body && body.error && body.error.message || raw.slice(0, 350)));
      if ((response.status === 429 || response.status === 413) && attempt < 2) {
        const delay = retryDelay(response);
        console.log("Groq rate limit; retrying after " + Math.ceil(delay / 1000) + " seconds.");
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (response.status >= 500 && attempt < 2) continue;
      throw lastError;
    }
    const content = body && body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content;
    if (!content) {
      lastError = new Error("Groq returned an empty response.");
      continue;
    }
    try { return parseJson(content); }
    catch (error) { lastError = error; }
  }
  throw lastError || new Error("Groq request failed after retries.");
}
function getPosts() {
  global.window = {};
  try { require(path.join(ROOT, "posts-data.js")); }
  catch (error) { stop("Cannot parse posts-data.js: " + error.message); }
  if (!Array.isArray(global.window.POSTS)) stop("posts-data.js has no window.POSTS array.");
  return global.window.POSTS;
}
function existingPostBrief(posts) {
  return posts.map(function(post) {
    return {
      slug: clean(post.slug, 100),
      title: clean(post.title, 180),
      excerpt: clean(post.excerpt, 180),
      category: clean(post.category, 50),
      date: clean(post.date, 20)
    };
  });
}
function readLog() {
  try {
    const value = JSON.parse(fs.readFileSync(LOG, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch (_) { return []; }
}
function runSearch(query) {
  const result = spawnSync(process.execPath, [SEARCH, query], {
    cwd: ROOT, encoding: "utf8", timeout: 45000, maxBuffer: 2 * 1024 * 1024
  });
  const history = readLog().filter(function(item) { return item.type === "search" && item.query === query; });
  const latest = history[history.length - 1];
  if (latest && latest.ok && Array.isArray(latest.results) && latest.results.length) return latest;
  return latest || {
    type: "search", query: query, language: "en", ok: false, results: [],
    error: clean(result.stderr || result.stdout || "No results", 300)
  };
}
async function search(query) {
  const first = clean(query, 290);
  let result = runSearch(first);
  if (result.ok) return result;
  const retry = clean(first + " recent original article industry publication", 300);
  return runSearch(retry);
}
function host(url) {
  try { return new URL(url).hostname.replace(/^www\./i, "").toLowerCase(); }
  catch (_) { return ""; }
}
function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
    return parsed.origin.toLowerCase() + parsed.pathname;
  } catch (_) { return String(url || "").replace(/[.,;]+$/, ""); }
}
function isInternationalSource(item) {
  const url = String(item.url || "");
  const hostname = host(url);
  const title = String(item.title || "");
  if (!/^https?:\/\//i.test(url) || !hostname || /[\u0600-\u06ff]/.test(title)) return false;
  if (/\.(?:eg|sa|ae|qa|kw|bh|om|jo|lb|iq|ma|dz|tn|ly|sd|ye|ps)$/i.test(hostname)) return false;
  if (/(arabnews|alarabiya|dailynewsegypt|egypttoday|gulfnews|khaleejtimes|youm7|masrawy|thenational|wam\.ae)/i.test(hostname)) return false;
  return true;
}
function collectSources(searches) {
  const all = [];
  const seen = new Set();
  for (const result of searches) {
    for (const item of result.results || []) {
      if (!isInternationalSource(item)) continue;
      const key = normalizeUrl(item.url);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      all.push({
        title: clean(item.title, 180),
        url: item.url,
        snippet: clean(item.snippet, 320),
        host: host(item.url)
      });
    }
  }
  const preferred = /(warc|contagious|brandnew|underconsideration|system1|ipa\.co\.uk|searchengineland|thinkwithgoogle|tiktok\.com|thedieline|ehrenberg-bass|adobe|digiday|hubspot|iab\.com|marketingweek|adweek|campaignlive|itsnicethat|creativebloq|designweek|marketingdive|google\.com|meta\.com)/i;
  all.sort(function(a, b) {
    return Number(preferred.test(b.host)) - Number(preferred.test(a.host));
  });
  return all;
}
function fetchPage(url) {
  const result = spawnSync(process.execPath, [SEARCH, "--fetch", url], {
    cwd: ROOT, encoding: "utf8", timeout: 28000, maxBuffer: 2 * 1024 * 1024
  });
  if (result.status !== 0) return null;
  try {
    const page = JSON.parse(result.stdout);
    const text = clean(page.text, 3200);
    if (!text || text.length < 300) return null;
    const actualUrl = page.url || url;
    return {
      title: clean(page.title || url, 180),
      url: actualUrl,
      host: host(actualUrl),
      text: text
    };
  } catch (_) { return null; }
}
function makeSlug(value) {
  return clean(value, 120).normalize("NFKD").toLowerCase()
    .replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 75).replace(/-+$/g, "") || "international-article";
}
function uniqueSlug(value, posts) {
  const used = new Set(posts.map(function(post) { return post.slug; }));
  const base = makeSlug(value);
  if (!used.has(base)) return base;
  const dated = base + "-" + TODAY;
  if (!used.has(dated)) return dated;
  let index = 2;
  while (used.has(dated + "-" + index)) index++;
  return dated + "-" + index;
}
function addPost(post, posts) {
  const file = path.join(ROOT, "posts-data.js");
  let source = fs.readFileSync(file, "utf8");
  const close = source.lastIndexOf("];");
  if (close < 0) stop("posts-data.js does not end with ];");
  if (posts.some(function(item) { return item.slug === post.slug; })) stop("Duplicate slug: " + post.slug);
  const record = [
    "  {",
    "    slug: " + JSON.stringify(post.slug) + ",",
    "    title: " + JSON.stringify(post.title) + ",",
    "    excerpt: " + JSON.stringify(post.excerpt) + ",",
    "    date: " + JSON.stringify(TODAY) + ",",
    "    category: " + JSON.stringify(post.category) + ",",
    "    lang: \"ar\",",
    "    read: " + post.read,
    "  }"
  ].join("\n");
  source = source.slice(0, close).replace(/\s*$/, "") + (posts.length ? ",\n" : "\n") + record + "\n" + source.slice(close);
  fs.writeFileSync(file, source, "utf8");
}
function articleBodyLength(article) {
  return String(article || "").split(/\n\s*##\s*(?:المصادر|المراجع|المصدر الأصلي|المصادر الأصلية|sources|references)(?=\s|$)/i)[0].trim().length;
}

const CATEGORIES = [
  {
    name: "البراندينج",
    topic: "branding brand strategy identity rebrand brand campaigns",
    queries: [
      "latest branding and brand strategy articles WARC Contagious Brand New",
      "site:contagious.com OR site:underconsideration.com OR site:warc.com branding identity rebrand news"
    ]
  },
  {
    name: "التصميم",
    topic: "graphic design visual identity packaging typography art direction",
    queries: [
      "latest graphic design visual identity packaging articles Adobe The Dieline Brand New",
      "site:thedieline.com OR site:adobe.com OR site:underconsideration.com OR site:itsnicethat.com design packaging typography news"
    ]
  },
  {
    name: "التسويق",
    topic: "marketing strategy campaigns consumer behavior content creators",
    queries: [
      "latest marketing strategy campaigns consumer trends articles Digiday HubSpot WARC",
      "site:digiday.com OR site:hubspot.com OR site:warc.com OR site:marketingweek.com marketing strategy campaign news"
    ]
  },
  {
    name: "الميديا باينج",
    topic: "media buying paid media advertising PPC search social ads",
    queries: [
      "latest paid media media buying advertising platform articles Search Engine Land IAB",
      "site:searchengineland.com OR site:iab.com OR site:thinkwithgoogle.com OR site:ads.tiktok.com paid ads media buying news"
    ]
  }
];

async function main() {
  if (!fs.existsSync(SEARCH)) stop("Missing .github/scripts/search-web.js");
  fs.writeFileSync(LOG, "[]\n", "utf8");
  const posts = getPosts();
  const existing = existingPostBrief(posts);
  const start = crypto.randomInt(0, CATEGORIES.length);
  const order = CATEGORIES.slice(start).concat(CATEGORIES.slice(0, start));

  for (const category of order) {
    console.log("Searching recent international articles in random category: " + category.name);
    const searches = [];
    const dateAnchor = new Date(TODAY + "T12:00:00Z");
    const searchWindow = dateAnchor.toLocaleString("en-US", { month: "long", timeZone: "UTC" }) + " " + dateAnchor.getUTCFullYear();
    for (const query of category.queries) searches.push(await search(clean(query + " " + searchWindow + " latest", 290)));
    const candidates = collectSources(searches);
    const opened = [];
    const usedHosts = new Set();

    for (const candidate of candidates.slice(0, 12)) {
      if (usedHosts.has(candidate.host)) continue;
      const page = fetchPage(candidate.url);
      if (!page) continue;
      if (page.host !== candidate.host) continue;
      usedHosts.add(page.host);
      const dateMatch = page.text.match(/\b(?:20\d{2}[-/]\d{1,2}[-/]\d{1,2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+20\d{2})\b/i);
      opened.push({
        id: opened.length + 1,
        title: page.title,
        url: page.url,
        publisher: page.host,
        visibleDate: dateMatch ? dateMatch[0] : "date not clearly visible",
        text: page.text.slice(0, 2600)
      });
      if (opened.length >= 4) break;
    }

    if (!opened.length) {
      console.log("No readable original article found in " + category.name + "; rotating to next category.");
      continue;
    }

    console.log("Opened " + opened.length + " international source pages in " + category.name + ".");
    let draft;
    try {
      draft = await ask([
        {
          role: "system",
          content: "Return JSON only. You are an Arabic translation editor for a professional blog covering branding, design, marketing, and media buying. Select a recent original international article from the supplied opened pages and create a faithful Arabic translation digest of its main points. This is translation-led content, not an opinion essay, local-market adaptation, or fact-checking report. Do not add country-specific examples, hypothetical businesses, extra recommendations, research-proof requirements, limitations sections, or a generic conclusion. Preserve the source's actual meaning, names, dates, and numerical claims. Never invent facts or citations. Do not reproduce a whole copyrighted article verbatim or translate it paragraph by paragraph; write a concise digest in fresh Arabic wording, keeping close paraphrase from any single source under 200 words. Source links belong only at the end of the article. Use natural Arabic and no filler."
        },
        {
          role: "user",
          content: "Blog date: " + TODAY +
            "\nRandomly selected category: " + category.name + " (" + category.topic + ")" +
            "\nExisting posts: " + JSON.stringify(existing) +
            "\nOriginal pages opened from recent English-language searches: " + JSON.stringify(opened) +
            "\nSelect the newest relevant article with a visible date if available, but do not invent a date. Compare every source topic against all existing titles and excerpts. If your first choice overlaps with an existing post, choose another distinct page from the supplied set. Return JSON: decision ('PUBLISH'/'SKIP'), decisionReason, title (Arabic rendering of the original headline), slug (English kebab-case), excerpt (Arabic <=220 chars), read (integer), sourceIds (IDs actually used), articleMarkdown (Arabic body only; no H1, no source links). If all supplied topics repeat existing posts, return SKIP. Target 3,000–4,500 characters, with a short opening and source-faithful subheadings. No Egypt adaptation, no invented example, no extra proof/limitations section, and no generalized recommendations. Keep the original article's subject and intent; do not change the article into a different theme. Category metadata will be set by workflow to " + category.name + "."
        }
      ], 6200);
    } catch (error) {
      console.log("Could not draft in " + category.name + ": " + clean(error.message, 220));
      continue;
    }

    if (String(draft.decision || "").toUpperCase() !== "PUBLISH") {
      console.log("Candidate selection found overlapping topics in " + category.name + "; trying another category.");
      continue;
    }

    const title = clean(draft.title, 180);
    const excerpt = clean(draft.excerpt, 220);
    let body = String(draft.articleMarkdown || "").trim();
    if (!title || !excerpt || articleBodyLength(body) < 2600 || !/[\u0600-\u06ff]/.test(body)) {
      console.log("Draft too short or missing fields in " + category.name + "; asking for a source-only expansion.");
      try {
        const expansion = await ask([
          {
            role: "system",
            content: "Return JSON only. Expand the supplied Arabic translation digest using only distinct information present in the source pages. Do not add local examples, new opinions, fact checking, claims, or generic advice. Do not repeat existing sections. Do not copy source wording verbatim."
          },
          {
            role: "user",
            content: "Return {articleMarkdown}. Bring this translation digest to at least 2,800 characters by explaining additional distinct points from the source pages, not by padding. Source pages: " + JSON.stringify(opened) + "\nCurrent draft: " + body
          }
        ], 5200);
        body = String(expansion.articleMarkdown || body).trim();
      } catch (error) {
        console.log("Expansion failed in " + category.name + ": " + clean(error.message, 200));
      }
    }

    if (!title || !excerpt || articleBodyLength(body) < 2600 || !/[\u0600-\u06ff]/.test(body)) {
      console.log("No usable article draft in " + category.name + "; trying another category.");
      continue;
    }

    let used = Array.isArray(draft.sourceIds)
      ? draft.sourceIds.map(function(id) { return opened[Number(id) - 1]; }).filter(Boolean)
      : [];
    if (!used.length) used = [opened[0]];
    used = used.filter(function(page, index, pages) {
      return pages.findIndex(function(other) { return normalizeUrl(other.url) === normalizeUrl(page.url); }) === index;
    }).slice(0, 4);

    body = body.replace(/\n\s*##\s*(?:المصادر|المراجع|المصادر الأصلية|sources|references)(?=\s|$)[\s\S]*$/i, "").trim();
    const sourceFooter = "\n\n## المصادر الأصلية\n\n" + used.map(function(page) {
      return "- [" + clean(page.title, 180) + "](" + page.url + ") — " + page.publisher;
    }).join("\n") + "\n";
    const article = "# " + title + "\n\n**تاريخ النشر على المدونة: " + TODAY + "**\n\n" + body + sourceFooter;
    const slug = uniqueSlug(draft.slug || title, posts);
    const filePath = path.join(ROOT, "posts", slug + ".md");
    if (fs.existsSync(filePath)) stop("Refusing to overwrite existing article: " + slug);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, article + "\n", "utf8");
    addPost({
      slug: slug,
      title: title,
      excerpt: excerpt,
      category: category.name,
      read: Math.max(3, Math.min(30, parseInt(draft.read, 10) || 7))
    }, posts);

    fs.writeFileSync(AUDIT,
      "# Source selection log\n\nDate: " + TODAY +
      "\nRandom category: " + category.name +
      "\n\n## English Searches\n" + searches.map(function(item) {
        return "- " + item.query + " (" + (item.ok ? "results found" : "no results") + ")";
      }).join("\n") +
      "\n\n## Selected Original Sources\n" + used.map(function(page) {
        return "- " + page.title + " — " + page.url + " (visible date: " + page.visibleDate + ")";
      }).join("\n") +
      "\n\n## Existing Site Duplicate Check\nCompared the proposed topic with all " + existing.length + " current article metadata entries; the writer was instructed to choose an alternate source if the topic overlaps.\n" +
      "\n## Decision\nDECISION: PUBLISH — Arabic translation digest prepared from the selected original source pages.\n",
      "utf8"
    );
    output("publish", "true");
    console.log("Prepared exactly one Arabic translation digest: " + slug + " (" + category.name + ").");
    return;
  }

  fs.writeFileSync(AUDIT,
    "# Source selection log\n\nDate: " + TODAY +
    "\n\nAll four categories were searched, but no distinct readable source/article was selected.\n\n## Decision\nDECISION: SKIP — no readable non-duplicate source article was available.\n",
    "utf8"
  );
  output("publish", "false");
  console.log("No article created; all searched categories were unavailable or overlapped existing posts.");
}

main().catch(function(error) {
  stop(error && error.stack ? error.stack : String(error));
});
