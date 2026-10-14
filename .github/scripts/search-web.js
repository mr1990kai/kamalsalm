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
