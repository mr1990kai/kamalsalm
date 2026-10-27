# Automation Instructions — Kamal Elnhrawy Website

## Purpose
Publish one Arabic translation digest per workflow run from a recent international article about branding, design, marketing, or media buying. Choose the category randomly at the beginning of every run:
- البراندينج
- التصميم
- التسويق
- الميديا باينج

## Sources and search
- Use the existing search helper for English-language web searches and use its fetch mode to read original source pages.
- Prefer recent articles from established international specialist publishers such as Search Engine Land, IPA, WARC, Contagious, Brand New, System1, IAB, Think with Google, TikTok for Business, The Dieline, Ehrenberg-Bass Institute, Adobe, Digiday, HubSpot, Marketing Week, and comparable design/advertising publications.
- Search in English only. Do not run Arabic-market searches. Do not look for or add Egyptian-market applications.
- Prefer the latest useful original story or article found in search results. Use a publication date only when it appears on the page; never invent one.
- Read every entry in posts-data.js and compare the new topic against all Markdown articles in posts/. Do not compare only the first 18 posts, and do not treat a new headline as proof that the topic is new.

## Writing style
- Publish a faithful, concise Arabic translation digest of the original article or closely related source material.
- Do not turn the article into an Egyptian-market application, an opinion piece, a fact-checking report, a case-study proof exercise, or a tutorial invented by the assistant.
- Do not add Egypt/Arab-specific examples, hypothetical local businesses, extra recommendations, long analysis, or a section about research limitations.
- Do not invent or change names, dates, quotes, numbers, claims, or product availability. Preserve the source's meaning and qualifiers.
- Do not reproduce a full copyrighted article verbatim or translate it paragraph-by-paragraph. Use fresh Arabic wording and a concise digest; keep close paraphrase from any single source under 200 words.
- Aim for about 3,000–4,500 Arabic characters. Keep the headline and section headings faithful to the source, avoid generic introductions and filler, and place source links together at the end rather than inline.
- Each workflow run must create exactly one Markdown file in posts/<slug>.md and one matching metadata item in posts-data.js. The existing cover script generates the SVG, and the workflow updates the sitemap.
- Keep the category exactly as randomly selected, language as Arabic, and the date as the current date in Africa/Cairo.

## Duplicate prevention
- Compare all existing titles, slugs, excerpts, and article bodies before selecting a source.
- Avoid publishing the same source article or core topic under a different title, including a duplicate generated on another run the same day.
- If one category has no readable source, rotate to another category. If no suitable distinct source is available, skip that run instead of inventing content.
- The workflow runs a separate near-duplicate body check as a second safeguard.

## Operations
- Keep the current two daily schedule times unless the site owner changes them.
- Use the existing GROQ_API_KEY GitHub Actions secret, and never reveal credentials.
- Do not add research-audit.md or web-search-log.json to the commit. These are temporary run artifacts only.
