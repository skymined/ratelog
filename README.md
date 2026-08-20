# RateLog — AI coding tool pricing & limits, tracked like a changelog

A static comparison site for AI coding assistants (Claude Code, GitHub
Copilot, Cursor, Windsurf, OpenAI Codex/ChatGPT, Gemini CLI, Amazon Q
Developer, JetBrains AI Assistant). The differentiator versus the existing
"usage reset trackers" is the **changelog**: every price or limit change is
dated, sourced, and shown as a diff (+ improved / − reduced), not just a
snapshot of current pricing.

No frontend framework, no client-side build step in production — the site is
plain HTML/CSS/JS. A small Node script generates the per-tool and
per-comparison pages from one data file so ~15 pages stay consistent and a
data update never requires hand-editing HTML.

## Structure

```
src/data/tools-data.js   single source of truth — every price, limit, and
                          changelog entry. Edit this, then rebuild.
scripts/build.js          generates index.html, changelog.html, about.html,
                          tools/<slug>.html, compare/<a>-vs-<b>.html,
                          sitemap.xml and data/tools.json from the data file.
scripts/serve.js          zero-dependency static file server for local preview.
scripts/check-changes.js  the Pricing Watch script — see below.
scripts/pricing-snapshots.json  its persisted state (committed; don't hand-edit).
style.css                 the whole design system (tokens, layout, components).
script.js                 theme toggle, mobile nav, table filter/sort —
                          progressive enhancement over server-rendered rows.
favicon.svg
robots.txt
(generated, do not hand-edit — rebuild instead):
index.html, changelog.html, about.html, tools/*.html, compare/*.html,
sitemap.xml, data/tools.json
```

## Updating data

1. Edit `src/data/tools-data.js`. Every plan price and usage-limit string
   must trace to a source URL in that tool's `sources` array — no figures
   from memory.
2. Add a `changes` entry (`{ date, type: 'up'|'down'|'neutral', title,
   description, sourceUrl }`) whenever a price or limit actually changed.
   This is what powers the homepage ticker and `/changelog.html` — the
   whole point of the site is this log, so don't skip it.
3. Update `SITE.lastVerified` if you re-verified the full dataset.
4. Rebuild: `node scripts/build.js`.

## Pricing Watch (automated change *detection*, not verification)

`.github/workflows/pricing-watch.yml` runs `scripts/check-changes.js` once a
day on GitHub's own infrastructure — no Anthropic account, no API key, no
external service. It fetches each tool's `pricingUrl`, strips HTML down to
visible text, and hashes it. If the hash differs from the last run's
snapshot (`scripts/pricing-snapshots.json`, committed to the repo), it opens
or comments on a GitHub issue titled "Pricing Watch — possible changes
detected".

**What it is:** a free, zero-maintenance tripwire so nobody has to remember
to go re-check 8 pricing pages by hand.

**What it isn't:** it doesn't know what changed, whether the change actually
affects a published figure, or verify anything — it's a dumb text diff. It
can also miss changes on pricing pages that render client-side (several of
these already do, per the `openQuestions` notes baked into the original
research — see e.g. Cursor's and JetBrains' entries). Treat a flagged issue
as "go look," then re-verify and edit `tools-data.js` normally per the
section above — same as any other update.

Trigger a check manually anytime from the repo's Actions tab (`workflow_dispatch`).

## Local preview

```
node scripts/build.js     # generate the static pages
node scripts/serve.js     # → http://localhost:8080
```

No npm install needed for the site itself (build.js and serve.js use only
Node built-ins). `node_modules` only shows up if you install something for
testing (e.g. Playwright) — keep that out of the deployed output.

## Deployment

Static output only — deploy the repo root (or a copy of it) to GitHub
Pages, Netlify, Vercel, or Cloudflare Pages. Nothing runs server-side.
Before pointing a real domain at this:

- [ ] Replace `SITE.url` in `src/data/tools-data.js` (currently
      `https://example.com`) with the real deployed URL, then rebuild —
      it's baked into canonical tags, OG tags, and `sitemap.xml`.
- [ ] Replace `robots.txt`'s sitemap URL to match.

## Next up (monetization & SEO checklist)

- [x] Data pass: `tools-data.js` ships with a research-agent-verified
      dataset (WebSearch + WebFetch, independently re-checked in a second
      pass) as of `SITE.lastVerified`. Re-verify anything older than ~60
      days before trusting it — prices in this space move fast.
- [x] OG image: `og-image.png` built from `og-card.html` and wired into
      every page via `page()`'s `ogImage` default.
- [x] User QA pass (2026-08-20): 4 independent persona agents drove the
      live site with Playwright (budget-conscious solo dev, team lead
      pricing out 5 seats, a burned power user chasing a specific change,
      a cold mobile visitor judging credibility). Fixed from that pass:
      dead `/compare/*` links for JetBrains and Amazon Q (compare-CTA links
      now derive strictly from the `comparisons` array instead of guessing
      "first 4 other tools"), mobile ledger table showing blank space
      instead of the Usage-limit/Last-changed columns (now a stacked card
      layout below 860px), footer omitting 2 of 8 tools, and filter chips
      silently dropping each other instead of combining with "Has free
      tier". Still open, logged here rather than guessed at:
  - [ ] Team/Business pricing isn't surfaced on the homepage ledger or the
        `/compare/` pages — both only show each tool's individual headline
        plan. A team lead persona had to open 3 separate tool pages and do
        the seat math by hand. Consider a plan-tier toggle.
  - [ ] `/compare/` pages are thin — two pricing cards plus a "recent
        changes" strip, no computed verdict or per-dollar usage comparison.
  - [ ] FAQ has no tool-specific, current answers (e.g. "why does Cursor
        feel tighter right now") — only generic questions.
  - [ ] Team-tier cards inconsistently disclose seat minimums / monthly vs.
        annual-commitment billing (Gemini's Code Assist page does; most
        others don't).
- [ ] **Google Analytics 4** + **Google Search Console**: same flow as
      other sites in this account — register, drop the snippet/verification
      tag, submit `sitemap.xml`.
- [ ] **Google AdSense**: apply once there's real traffic. This is an
      English-language content/comparison site, a good AdSense fit — place
      units between content sections, never inside the comparison table.
- [ ] (optional) Affiliate links: several of these tools don't run affiliate
      programs; check before assuming this is a revenue lever. If added,
      disclose inline per the About page's existing promise.
- [ ] (optional) Custom domain — better for AdSense review odds and
      long-term trust than a subdomain.
- [ ] Expand `comparisons` in `tools-data.js` beyond the current 13 pairs —
      each new `/compare/x-vs-y.html` is a fresh long-tail SEO entry point
      for a real "X vs Y pricing" search. Every tool currently has at least
      2 pairs; toolPage()'s compare-CTA only links to pairs actually listed
      here, so adding one is enough — no other code changes needed, and
      forgetting a tool just means it gets fewer links, never a dead one.
