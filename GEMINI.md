# Research and Automation Instructions — Kamal Elnhrawy Website

## Role
Act as a careful research editor and developer for this Arabic portfolio and blog. The blog focuses on digital marketing, media buying, ecommerce, branding, advertising creative, conversion optimization, landing pages, and practical business experiments.

## Mandatory research rules for new articles
- Use `node .github/scripts/search-web.js "your actual query"` for real web searches. This searches DuckDuckGo's HTML/Lite results without requiring another paid API key, prints results, and records each actual query/result in `web-search-log.json`. A query counts only when the helper reports `ok: true` and includes real result URLs. Never claim that you searched if the helper did not return results. Use `node .github/scripts/search-web.js --fetch <URL>` to read the original source page when accessible.
- Start with English-language sources, preferably original research, official platform updates, credible industry publications, company case studies, and published reports. Prefer recent material, and check publication dates.
- Search Arabic-language web results separately for the same idea using several Arabic phrasings, including relevant Egyptian/Arab marketing terms. Search both the key concept and the specific case study or finding.
- Read `posts-data.js` and relevant existing files in `posts/` to prevent repetition on this blog.
- Treat novelty as a reasoned screening result, not a guarantee that no Arabic article exists anywhere. If search results contain a close Arabic-language equivalent, do not publish that angle. Try a different candidate. If novelty remains uncertain after screening candidates, skip publishing rather than inventing novelty.
- Never copy, closely translate, or paraphrase a single foreign article section-by-section. Synthesize facts from multiple sources into original Arabic analysis and add a useful Egyptian-market application.
- Never invent sources, titles, quotes, statistics, dates, experiments, or case-study results. Use direct source URLs and explain what each source supports.
- Keep reported facts separate from analysis and recommendations. Do not present an untested idea as proven.
- Use natural, clear Arabic suitable for Egyptian readers without forcing slang into technical explanations.
- Use the existing blog format: a Markdown file in `posts/<slug>.md` and one matching object in `posts-data.js` using the current `window.POSTS` schema.
- Do not reference a cover image unless that exact asset exists in the repository.

## Research audit required for scheduled article generation
Create a temporary `research-audit.md` in the workflow workspace. It is for validation and run logs, not for publication or committing. Include these exact headings:
- `## English Search Queries`
- `## Arabic Market Search Queries`
- `## English Source Articles`
- `## Arabic-Market Results`
- `## Existing Site Duplicate Check`
- `## Decision`

Under each search-query heading, list at least three actual queries you executed, one per bullet, using the format `- query: ...`. Under English Source Articles, list at least two usable English-language sources with title, publisher, publication date (or state clearly if unavailable), and a direct URL. Under Arabic-Market Results, summarize the closest matching Arabic-language results actually found, link them when available, and explain why the candidate is or is not substantially covered. Under Existing Site Duplicate Check, compare the proposed angle with existing article titles/slugs and explain the distinction. Finish with exactly one line containing either `DECISION: PUBLISH` or `DECISION: SKIP`, plus a short reason.

For publication, all of the following must be true:
1. At least two reliable English-language sources support the main finding.
2. At least three English queries and three Arabic queries were executed.
3. There is no close Arabic-language article covering the same core idea in the searched results, and the audit explains the limits of the search.
4. The topic is not a close duplicate of an existing post on this site.
5. The article can be written with verifiable claims and direct source links.

If any condition is not met, set `DECISION: SKIP`, do not create a new article, and do not edit `posts-data.js`.

## Coding and safety rules
- Make only the changes required by the current task.
- For scheduled article work, edit only the new article and `posts-data.js`, and create the temporary research audit.
- Never delete existing articles or rewrite the site's templates during article generation.
- Never expose or print API keys, secrets, tokens, or other credentials.
- Do not commit or push changes yourself in scheduled article jobs; the workflow validates and commits approved changes.
