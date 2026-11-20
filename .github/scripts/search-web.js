const fs = require("fs");
const path = require("path");

const root = process.cwd();
const logPath = path.join(root, "web-search-log.json");
const USER_AGENT = "Mozilla/5.0 (compatible; KamalEditorialResearch/1.0; +https://kamalsalm.vercel.app)";

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/gi, "'").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, function(_, n) { return String.fromCodePoint(Number(n)); })
    .replace(/&#x([0-9a-f]+);/gi, function(_, n) { return String.fromCodePoint(parseInt(n, 16)); });
}
function plainHtml(value) {
  return decodeEntities(String(value || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ").trim();
}
function unwrapUrl(value, base) {
  try {
    const url = new URL(decodeEntities(value), base);
    if (url.hostname.includes("duckduckgo.com")) {
      const target = url.searchParams.get("uddg") || url.searchParams.get("url");
      if (target) return target;
    }
    return url.toString();
  } catch (_) {
    return "";
  }
}
function extractResults(html, base) {
  const matches = Array.from(html.matchAll(/<a\b[^>]*class=["'][^"']*(?:result__a|result-link)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi));
  const results = [];
  for (let matchIndex = 0; matchIndex < matches.length; matchIndex++) {
    const match = matches[matchIndex];
    const anchor = match[0];
    const hrefMatch = anchor.match(/\bhref=["']([^"']+)["']/i);
    const url = hrefMatch ? unwrapUrl(hrefMatch[1], base) : "";
    const title = plainHtml(anchor.replace(/^<a\b[^>]*>/i, "").replace(/<\/a>$/i, ""));
    const previousResult = html.lastIndexOf('<div class="result', match.index);
    const nextResult = html.indexOf('<div class="result', match.index + match[0].length);
    const start = previousResult >= 0 ? previousResult : match.index;
    const end = nextResult > start ? nextResult : Math.min(html.length, match.index + 6000);
    const chunk = html.slice(start, end);
    const snippetMatch = chunk.match(/<(?:div|a|span|td)[^>]*class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|a|span|td)>/i);
    const snippet = snippetMatch ? plainHtml(snippetMatch[1]) : "";
    if (!url || !/^https?:\/\//i.test(url) || !title || /duckduckgo\.com\/(html|lite|l\/)/i.test(url)) continue;
    if (results.some(item => item.url === url)) continue;
    results.push({ title, url, snippet });
    if (results.length >= 6) break;
  }
  return results;
}

const FEEDS = [
  "https://brandingmag.com/feed/",
  "https://identitydesigned.com/feed/",
  "https://thedieline.com/feed/",
  "https://www.creativebloq.com/feeds/all",
  "https://digiday.com/feed/",
  "https://blog.hubspot.com/marketing/rss.xml",
  "https://www.adweek.com/feed/",
  "https://searchenginejournal.com/feed/",
  "https://www.wordstream.com/blog/feed",
  "https://ahrefs.com/blog/feed/"
];
function cdata(value) {
  return String(value || "").replace(/^\s*<!\[CDATA\[/, "").replace(/\]\]>\s*$/, "");
}
function tagValue(chunk, tag) {
  const match = chunk.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tag + ">", "i"));
  return match ? plainHtml(cdata(match[1])) : "";
}
function parseFeedItems(xml) {
  const items = [];
  for (const match of String(xml || "").matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const chunk = match[1];
    const title = tagValue(chunk, "title");
    const url = (chunk.match(/<link>\s*([^<\s]+)\s*<\/link>/i) || [])[1] || "";
    const snippet = tagValue(chunk, "description").slice(0, 320);
    const ts = Date.parse((chunk.match(/<pubDate>\s*([^<]+?)\s*<\/pubDate>/i) || [])[1] || "") || 0;
    if (title && /^https?:\/\//i.test(url) && !/\.(?:jpe?g|png|gif|webp|svg|mp4|pdf)(?:[?#]|$)/i.test(url)) {
      items.push({ title, url, snippet, ts });
    }
  }
  return items;
}
const RSS_STOP = new Set(["latest","news","articles","article","recent","original","industry","publication","with","from","this","that","2025","2026","2027"]);
async function rssSearch(query) {
  const terms = String(query || "").toLowerCase()
    .replace(/site:\S+/g, " ").replace(/\bor\b/g, " ")
    .split(/[^a-z0-9]+/).filter(function(w) { return w.length > 3 && !RSS_STOP.has(w); });
  const cutoff = Date.now() - 90 * 24 * 3600 * 1000;
  let items = [];
  for (const feed of FEEDS) {
    try {
      const response = await request(feed);
      if (!response.ok) continue;
      items = items.concat(parseFeedItems(await response.text()));
    } catch (_) { /* skip unreachable feed */ }
  }
  const seen = new Set();
  const scored = [];
  for (const item of items) {
    const key = item.url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (item.ts && item.ts < cutoff) continue;
    const hay = (item.title + " " + item.snippet).toLowerCase();
    let score = item.ts ? Math.max(0, (item.ts - cutoff) / (Date.now() - cutoff)) : 0.1;
    for (const term of terms) if (hay.includes(term)) score += 2;
    scored.push({ score: score, item: item });
  }
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.slice(0, 6).map(function(entry) {
    return { title: entry.item.title, url: entry.item.url, snippet: entry.item.snippet };
  });
}

function readLog() {
  if (!fs.existsSync(logPath)) return [];
  try {
    const value = JSON.parse(fs.readFileSync(logPath, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch (_) {
    return [];
  }
}
function appendLog(entry) {
  const entries = readLog();
  entries.push(entry);
  fs.writeFileSync(logPath, JSON.stringify(entries, null, 2) + "\n", "utf8");
}
async function request(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18000);
  try {
    return await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": USER_AGENT,
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,ar;q=0.8"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

async function search(query) {
  if (!query || query.length > 300) throw new Error("Pass one search query (1-300 characters).");
  const endpoints = [
    "https://html.duckduckgo.com/html/?q=",
    "https://lite.duckduckgo.com/lite/?q="
  ];
  let lastError = "";
  for (const endpoint of endpoints) {
    try {
      const url = endpoint + encodeURIComponent(query);
      const response = await request(url);
      const html = await response.text();
      const results = response.ok ? extractResults(html, response.url || url) : [];
      const entry = {
        type: "search",
        query,
        language: /[\u0600-\u06FF]/.test(query) ? "ar" : "en",
        timestamp: new Date().toISOString(),
        engine: endpoint.includes("/lite/") ? "DuckDuckGo Lite" : "DuckDuckGo HTML",
        ok: response.ok && results.length > 0,
        status: response.status,
        results,
        error: response.ok && results.length ? "" : "Search endpoint returned no parseable results."
      };
      appendLog(entry);
      if (entry.ok) {
        console.log(JSON.stringify(entry, null, 2));
        return;
      }
      lastError = "HTTP " + response.status + " / no results";
    } catch (error) {
      lastError = error && error.message ? error.message : String(error);
      appendLog({
        type: "search", query,
        language: /[\u0600-\u06FF]/.test(query) ? "ar" : "en",
        timestamp: new Date().toISOString(),
        engine: endpoint.includes("/lite/") ? "DuckDuckGo Lite" : "DuckDuckGo HTML",
        ok: false, results: [], error: lastError
      });
    }
  }
  try {
    const rssResults = await rssSearch(query);
    const rssEntry = {
      type: "search", query,
      language: /[\u0600-\u06FF]/.test(query) ? "ar" : "en",
      timestamp: new Date().toISOString(),
      engine: "Publication RSS",
      ok: rssResults.length > 0,
      status: 200,
      results: rssResults,
      error: rssResults.length ? "" : "RSS feeds returned no usable items."
    };
    appendLog(rssEntry);
    console.log(JSON.stringify(rssEntry, null, 2));
    if (!rssEntry.ok) process.exitCode = 2;
    return;
  } catch (error) {
    lastError = error && error.message ? error.message : String(error);
  }
  console.log(JSON.stringify({ query, ok: false, results: [], error: lastError }, null, 2));
  process.exitCode = 2;
}

async function fetchPage(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch (_) { throw new Error("Invalid URL."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP(S) URLs are allowed.");
  const response = await request(url.toString());
  const type = response.headers.get("content-type") || "";
  if (!response.ok) throw new Error("HTTP " + response.status + " for " + url.hostname);
  if (type && !/text\/html|text\/plain|application\/xhtml\+xml/i.test(type)) {
    throw new Error("Unsupported page content type: " + type);
  }
  const html = await response.text();
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const text = plainHtml(html).slice(0, 12000);
  console.log(JSON.stringify({
    type: "fetch",
    url: response.url || url.toString(),
    ok: true,
    title: titleMatch ? plainHtml(titleMatch[1]) : "",
    text
  }, null, 2));
}

(async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--fetch") {
    if (!args[1]) throw new Error("Usage: node .github/scripts/search-web.js --fetch https://example.com");
    await fetchPage(args[1]);
    return;
  }
  const query = args.join(" ").trim();
  await search(query);
})().catch(function(error) {
  console.error(error && error.message ? error.message : error);
  process.exit(1);
});
