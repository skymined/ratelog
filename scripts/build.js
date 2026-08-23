// Static site generator for RateLog. No dependencies — Node built-ins only.
// Run: node scripts/build.js
// Reads src/data/tools-data.js (single source of truth) and writes static
// HTML + a browser-facing JSON snapshot into the repo root.

const fs = require('fs');
const path = require('path');
const { SITE, tools, comparisons, arenaSource, models, popularitySources } = require('../src/data/tools-data.js');

const ROOT = path.join(__dirname, '..');

// Pricing Watch (see .github/workflows/pricing-watch.yml) runs daily and
// commits its report alongside its snapshot. This makes the site itself
// honest about a detected-but-not-yet-human-verified change, instead of that
// signal living only in a GitHub Issue nobody visiting the site ever sees.
// Self-clearing: once a real re-verification pass bumps SITE.lastVerified
// past the report's checkedAt date, the flag disappears on its own — no
// manual "resolve" step to forget.
function loadPendingWatchReport() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'pricing-watch-report.json'), 'utf8');
    const report = JSON.parse(raw);
    const checkedDate = String(report.checkedAt || '').slice(0, 10);
    if (!checkedDate || checkedDate <= SITE.lastVerified) return null;
    const changed = (report.changed || []).filter((c) => tools.some((t) => t.slug === c.slug));
    if (!changed.length) return null;
    return { changed, checkedDate };
  } catch {
    return null; // missing/unparseable report — not run locally yet, or first run
  }
}
const pendingWatch = loadPendingWatchReport();

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatTokens(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1000000) return `${n % 1000000 === 0 ? n / 1000000 : (n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${Math.round(n / 1000)}K`;
  return String(n);
}

function money(n) {
  if (n === null || n === undefined) return null;
  return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
}

function daysAgo(dateStr, today = SITE.lastVerified) {
  const d1 = new Date(dateStr);
  const d2 = new Date(today);
  return Math.round((d2 - d1) / 86400000);
}

function relTime(dateStr) {
  const d = daysAgo(dateStr);
  if (d <= 0) return 'today';
  if (d === 1) return '1 day ago';
  if (d < 30) return `${d} days ago`;
  const months = Math.round(d / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function toolBySlug(slug) {
  return tools.find((t) => t.slug === slug);
}

function headlinePlan(tool) {
  return tool.plans[tool.headlinePlanIndex || 0] || tool.plans[0];
}

function latestChange(tool) {
  return [...(tool.changes || [])].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

function allChangesSorted() {
  return tools
    .flatMap((t) => (t.changes || []).map((c) => ({ ...c, toolSlug: t.slug, toolName: t.name })))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function diffBadge(type, label) {
  const cls = type === 'up' ? 'up' : type === 'down' ? 'down' : 'neutral';
  const sign = type === 'up' ? '↑' : type === 'down' ? '↓' : '•';
  return `<span class="badge-diff ${cls}">${sign} ${esc(label)}</span>`;
}

// ---------------------------------------------------------------------------
// layout
// ---------------------------------------------------------------------------

function head({ title, description, canonicalPath, jsonLd, ogImage }) {
  const url = `${SITE.url}${canonicalPath}`;
  return `<meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${url}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="stylesheet" href="/style.css" />
  <link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)} changelog" href="/rss.xml" />
  <meta name="theme-color" content="#f4f5f3" media="(prefers-color-scheme: light)" />
  <meta name="theme-color" content="#0e1013" media="(prefers-color-scheme: dark)" />
  <!-- Google Search Console: paste the verification content from search.google.com/search-console (Add property → HTML tag), then uncomment. -->
  <!-- <meta name="google-site-verification" content="REPLACE_ME" /> -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(SITE.name)}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${url}" />
  ${ogImage ? `<meta property="og:image" content="${SITE.url}${ogImage}" />` : ''}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <script>
    (function () {
      var saved = localStorage.getItem('ratelog-theme');
      if (saved) document.documentElement.setAttribute('data-theme', saved);
    })();
  </script>
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}`;
}

function themeToggleSvg() {
  return `<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg><svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/></svg>`;
}

function header(active) {
  const nav = [
    ['/', 'Compare'],
    ['/finder.html', 'Plan Finder'],
    ['/leaderboard.html', 'Model Leaderboard'],
    ['/changelog.html', 'Changelog'],
    ['/about.html', 'About'],
  ];
  return `<header class="site-header">
    <div class="wrap">
      <a href="/" class="logo">ratelog<span class="dot">.</span></a>
      <nav class="main-nav" aria-label="Primary">
        ${nav.map(([href, label]) => `<a href="${href}"${active === href ? ' aria-current="page"' : ''}>${label}</a>`).join('\n        ')}
      </nav>
      <div class="header-actions">
        <button class="theme-toggle" id="theme-toggle" aria-label="Toggle color theme" type="button">${themeToggleSvg()}</button>
        <button class="mobile-nav-toggle" id="mobile-nav-toggle" aria-label="Toggle menu" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
      </div>
    </div>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <a href="/" class="logo">ratelog<span class="dot">.</span></a>
          <p class="footer-note">Independent tracker of AI coding assistant pricing and usage limits. Not affiliated with Anthropic, GitHub, Cursor, Cognition, OpenAI, Google, AWS, or JetBrains. Figures verified against official sources — see each tool page for citations and the date last checked.</p>
        </div>
        <div class="footer-links">
          <div>
            <h5>Tools</h5>
            <ul>
              ${tools.map((t) => `<li><a href="/tools/${t.slug}.html">${esc(t.name)}</a></li>`).join('\n              ')}
            </ul>
          </div>
          <div>
            <h5>Site</h5>
            <ul>
              <li><a href="/finder.html">Plan Finder</a></li>
              <li><a href="/leaderboard.html">Model Leaderboard</a></li>
              <li><a href="/changelog.html">Changelog</a></li>
              <li><a href="/rss.xml">RSS feed</a></li>
              <li><a href="/badges.html">Badges</a></li>
              <li><a href="/api.html">API</a></li>
              <li><a href="/about.html">About &amp; methodology</a></li>
              <li><a href="/privacy.html">Privacy policy</a></li>
              <li><a href="/sitemap.xml">Sitemap</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <span>Data last verified ${SITE.lastVerified}</span>
        <span>&copy; ${new Date(SITE.lastVerified).getFullYear()} RateLog</span>
      </div>
    </div>
  </footer>
  <script src="/script.js"></script>`;
}

function page({ title, description, canonicalPath, active, jsonLd, ogImage = '/og-image.png', body }) {
  return `<!doctype html>
<html lang="en">
<head>
${head({ title, description, canonicalPath, jsonLd, ogImage })}
</head>
<body>
${header(active)}
${body}
${footer()}
<!--
  Google Analytics 4 — create a property at analytics.google.com, then
  replace G-XXXXXXXXXX below with the real measurement ID and uncomment.
-->
<!--
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
-->
</body>
</html>
`;
}

// ---------------------------------------------------------------------------
// shared fragments
// ---------------------------------------------------------------------------

function ledgerRow(tool) {
  const plan = headlinePlan(tool);
  const change = latestChange(tool);
  const priceStr = plan.priceMonthly === 0 ? 'Free' : plan.priceMonthly === null ? 'Custom' : `${money(plan.priceMonthly)}<span class="mono" style="color:var(--ink-faint)">/mo</span>`;
  return `<tr data-slug="${tool.slug}" data-category="${esc(tool.category)}" data-price="${plan.priceMonthly ?? 999999}" data-changed="${change ? change.date : ''}" data-free="${tool.hasFreeTier ? '1' : '0'}">
          <td data-label="Tool">
            <div class="tool-cell">
              <span class="tool-mark">${esc(tool.mark)}</span>
              <span>
                <a href="/tools/${tool.slug}.html" class="tool-name" style="text-decoration:none;color:inherit">${esc(tool.name)}</a>
                <span class="tool-vendor">${esc(tool.vendor)}</span>
              </span>
            </div>
          </td>
          <td data-label="Plan"><span class="plan-name">${esc(plan.name)}</span>${tool.hasFreeTier ? ' <span class="free-pill">HAS FREE TIER</span>' : ''}</td>
          <td class="num" data-label="Price">${priceStr}</td>
          <td data-label="Usage limit"><span class="limit-desc">${esc(plan.limit)}</span></td>
          <td data-label="Last changed">${change ? diffBadge(change.type, relTime(change.date)) : '<span class="badge-diff neutral">—</span>'}</td>
          <td class="num"><a href="/tools/${tool.slug}.html" class="text-link" style="font-size:13px">Details →</a></td>
        </tr>`;
}

function faqData() {
  return [
    ['Why do AI coding tool limits change so often?', 'Inference is expensive and usage patterns are hard to predict at launch, so vendors adjust quotas — usually down — once real usage data comes in. We’ve seen this happen within weeks of a tool’s launch more than once. Treat any plan’s limit as a snapshot, not a promise.'],
    ['What happens when I hit my usage limit?', 'Depends on the tool. Most either block further requests until a reset window passes (often 5 hours or a week), or fall back to a slower/weaker model. A few let you pay per additional request. We note the actual behavior on each tool’s page where the vendor documents it.'],
    ['Is the cheapest plan always the best value?', 'No. A $20/mo plan with a tight weekly cap can cost more in lost time than a $200/mo plan you actually exhaust less often. Compare the limit against your real usage, not just the sticker price.'],
    ['How do you verify this data?', 'Every figure is checked against the vendor’s own pricing or docs page, independently re-checked at a separate pass, and dated. Sources are linked on every tool page. If a number is genuinely ambiguous in the vendor’s own docs, we say so instead of guessing.'],
    ['Do you get paid to rank a tool higher?', 'No paid placements. The comparison table sorts by whatever you choose (price, recency of change) — never by a vendor relationship. If we ever add affiliate links, they will be disclosed inline, not baked into ranking.'],
  ];
}

function faqSection() {
  const items = faqData();
  return `<section class="section" id="faq">
    <div class="wrap">
      <div class="section-head"><div><span class="eyebrow">frequently asked</span><h2>Before you switch tools</h2></div></div>
      <div>
        ${items.map(([q, a]) => `<details class="faq-item">
          <summary>${esc(q)}</summary>
          <p>${esc(a)}</p>
        </details>`).join('\n        ')}
      </div>
    </div>
  </section>`;
}

function faqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData().map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

function contextWindowSection() {
  const withData = tools.filter((t) => t.contextWindow);
  if (!withData.length) return '';
  const sorted = [...withData].sort((a, b) => (b.contextWindow.tokens ?? -1) - (a.contextWindow.tokens ?? -1));

  return `<section class="section" id="context">
    <div class="wrap">
      <div class="section-head">
        <div><span class="eyebrow">how much it can see</span><h2>Context window, by flagship model</h2><p>Usage limits govern how <em>often</em> you can prompt a tool. This is a different axis — how much of your codebase fits in <em>one</em> request, for the model each tool defaults to. Tools that let you switch models may unlock a larger window; see notes.</p></div>
      </div>
      <div class="ledger-wrap">
        <table class="ledger">
          <thead>
            <tr>
              <th>Tool</th>
              <th>Flagship model</th>
              <th class="num">Context window</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((t) => `<tr>
              <td data-label="Tool">
                <div class="tool-cell">
                  <span class="tool-mark">${esc(t.mark)}</span>
                  <span>
                    <a href="/tools/${t.slug}.html" class="tool-name" style="text-decoration:none;color:inherit">${esc(t.name)}</a>
                  </span>
                </div>
              </td>
              <td data-label="Flagship model">${esc(t.contextWindow.model)}</td>
              <td class="num tabular-nums mono" data-label="Context window">${esc(t.contextWindow.display)}</td>
              <td data-label="Notes"><span class="limit-desc">${esc(t.contextWindow.note || '—')}</span></td>
            </tr>`).join('\n            ')}
          </tbody>
        </table>
      </div>
    </div>
  </section>`;
}

// ---------------------------------------------------------------------------
// pages
// ---------------------------------------------------------------------------

function homepage() {
  const changes = allChangesSorted().slice(0, 8);
  const tickerItems = changes.length ? changes : [];
  const tickerHtml = tickerItems.map((c) => `<span class="ticker-item"><span class="t-name">${esc(c.toolName)}</span> ${c.type === 'up' ? '<span class="diff-up" style="color:var(--signal-up)">↑</span>' : c.type === 'down' ? '<span class="diff-down" style="color:var(--signal-down)">↓</span>' : '•'} ${esc(c.title)} · ${relTime(c.date)}</span>`).join('\n        ');

  const recentCount = allChangesSorted().filter((c) => daysAgo(c.date) <= 30).length;

  const body = `<section class="hero">
    <div class="wrap">
      <span class="eyebrow">ai coding tools, priced honestly</span>
      <h1>Which AI coding tool is worth paying for <em>— right now.</em></h1>
      <p class="lede">Plans and limits shift monthly. <strong>${tools.length} tools</strong>, one ledger — every price, quota, and quiet nerf, dated and sourced, so you can compare what you’d actually get for your money today.</p>
      <div class="hero-meta">
        <span class="pulse-badge"><span class="pulse-dot"></span>${recentCount} change${recentCount === 1 ? '' : 's'} in the last 30 days</span>
        <a href="/changelog.html" class="text-link">See the full changelog →</a>
        <a href="/rss.xml" class="text-link">RSS →</a>
      </div>
    </div>
  </section>

  <div class="ticker-band" aria-hidden="true">
    <div class="ticker-track">
      ${tickerHtml}
      ${tickerHtml}
    </div>
  </div>

  ${pendingWatch ? `<section class="section" style="padding-bottom:0">
    <div class="wrap">
      <div class="callout">Our automated watcher flagged a possible pricing-page change on ${pendingWatch.checkedDate} for ${pendingWatch.changed.map((c) => `<a href="/tools/${c.slug}.html">${esc(c.name)}</a>`).join(', ')} — not yet independently re-verified, so the figures below may be behind. <a href="/about.html">How we verify data.</a></div>
    </div>
  </section>` : ''}

  <section class="section" style="padding-bottom:0">
    <div class="wrap">
      <div class="finder-cta">
        <div class="finder-cta-text">
          <h3>Already know your budget or must-haves?</h3>
          <p>Skip the table below — filter every plan from every tool by price, usage, or feature in one step.</p>
        </div>
        <a href="/finder.html" class="btn-solid">Open Plan Finder →</a>
      </div>
    </div>
  </section>

  <section class="section" id="table">
    <div class="wrap">
      <div class="section-head">
        <div><span class="eyebrow">the ledger</span><h2>Headline plan, by tool</h2><p>Each row is the most representative paid tier — open a tool for the full breakdown across every plan it offers.</p></div>
      </div>
      <div class="controls">
        <div class="chip-row" id="filter-chips">
          <button class="chip" data-filter="all" aria-pressed="true">All</button>
          <button class="chip" data-filter="Terminal agent" aria-pressed="false">Terminal agent</button>
          <button class="chip" data-filter="IDE plugin" aria-pressed="false">IDE plugin</button>
          <button class="chip" data-filter="Editor" aria-pressed="false">Editor</button>
          <button class="chip" data-filter="Cloud agent" aria-pressed="false">Cloud agent</button>
          <span class="chip-sep" aria-hidden="true"></span>
          <button class="chip" id="free-tier-toggle" aria-pressed="false">+ Has free tier</button>
        </div>
        <select class="sort-select" id="sort-select">
          <option value="default">Sort: default</option>
          <option value="price-asc">Sort: price, low → high</option>
          <option value="price-desc">Sort: price, high → low</option>
          <option value="changed">Sort: recently changed</option>
        </select>
      </div>
      <div class="ledger-wrap">
        <table class="ledger" id="ledger-table">
          <thead>
            <tr>
              <th>Tool</th>
              <th>Plan</th>
              <th class="num">Price</th>
              <th>Usage limit</th>
              <th>Last changed</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="ledger-body">
            ${tools.map(ledgerRow).join('\n            ')}
          </tbody>
        </table>
      </div>
      <p id="ledger-empty" style="display:none;color:var(--ink-faint);padding:24px 0;font-size:14px">No tools match this filter.</p>
    </div>
  </section>

  ${contextWindowSection()}

  <section class="section">
    <div class="wrap">
      <div class="section-head"><div><span class="eyebrow">how to read this</span><h2>Three things worth knowing</h2></div></div>
      <div class="card-grid">
        <div class="info-card"><h3>Limits reset on a clock, not a calendar day</h3><p>Most tools cap you over a rolling window — 5 hours, a week — not a hard monthly count. Two tools with the same headline number can feel very different in practice.</p></div>
        <div class="info-card"><h3>The mid tier is rarely the deal</h3><p>Entry tiers exist to get you in the door; the real usage math usually favors either the free tier or the top tier, depending on how often you actually hit the wall.</p></div>
        <div class="info-card"><h3>Cuts are quieter than launches</h3><p>A new tier gets a blog post. A quota cut gets a docs edit. That asymmetry is exactly why this page tracks changes, not just current prices.</p></div>
      </div>
    </div>
  </section>

  ${faqSection()}`;

  return page({
    title: `${SITE.name} — Compare AI coding tool pricing & usage limits`,
    description: `Live comparison of ${tools.length} AI coding assistants — Claude Code, GitHub Copilot, Cursor and more — with sourced pricing, usage limits, and a dated changelog of every plan change.`,
    canonicalPath: '/',
    active: '/',
    jsonLd: faqJsonLd(),
    body,
  });
}

function toolPage(tool) {
  const change = latestChange(tool);
  // Only link to comparison pages that actually exist — deriving this list
  // from anything other than `comparisons` itself produces dead links for
  // whichever tools weren't included in a pair (caught by user QA: every
  // compare link off the JetBrains and Amazon Q pages 404'd).
  const others = comparisons
    .filter(([a, b]) => a === tool.slug || b === tool.slug)
    .map(([a, b]) => toolBySlug(a === tool.slug ? b : a));
  const toolChanges = [...(tool.changes || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    url: tool.officialUrl,
    offers: tool.plans.filter((p) => typeof p.priceMonthly === 'number').map((p) => ({
      '@type': 'Offer',
      name: `${tool.name} ${p.name}`,
      price: p.priceMonthly,
      priceCurrency: 'USD',
      description: p.limit,
    })),
  };

  const body = `<section class="tool-hero">
    <div class="wrap">
      <div class="tool-hero-top">
        <span class="tool-mark" style="width:40px;height:40px;font-size:15px">${esc(tool.mark)}</span>
        <span class="mono" style="font-size:13px;color:var(--ink-faint)">${esc(tool.category)}</span>
      </div>
      <h1>${esc(tool.name)}</h1>
      <p class="vendor-line">by ${esc(tool.vendor)} · <a href="${esc(tool.officialUrl)}" class="text-link">official site →</a></p>
      <p class="dek">${esc(tool.summary)}</p>
      <div class="tool-quicklinks">
        ${change ? `<span class="mono" style="font-size:13px;color:var(--ink-soft)">Last change: ${diffBadge(change.type, change.title)} · ${relTime(change.date)}</span>` : ''}
        ${tool.contextWindow ? `<span class="mono" style="font-size:13px;color:var(--ink-soft)">Context window: <strong style="color:var(--ink)">${esc(tool.contextWindow.display)}</strong> (${esc(tool.contextWindow.model)})</span>` : ''}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head"><div><span class="eyebrow">plans</span><h2>Every tier</h2>${tool.freeTier ? `<p>${tool.hasFreeTier ? 'Free tier' : 'Free tier (discontinued)'}: ${esc(tool.freeTier)}</p>` : '<p>No free tier.</p>'}</div></div>
      <div class="plan-grid">
        ${tool.plans.map((p) => `<div class="plan-card">
          <div class="plan-name">${esc(p.name)}</div>
          <div class="plan-price">${p.priceMonthly === null ? 'Custom' : p.priceMonthly === 0 ? 'Free' : `${money(p.priceMonthly)}<span>/mo</span>`}</div>
          <div class="plan-limit">${esc(p.limit)}</div>
          <div class="plan-target">${esc(p.target)}</div>
        </div>`).join('\n        ')}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head"><div><span class="eyebrow">history</span><h2>What’s changed</h2></div>
        <div style="display:flex;gap:8px">
          <a href="/rss/${tool.slug}.xml" class="pill-link">RSS (${esc(tool.name)} only)</a>
          <a href="/rss.xml" class="pill-link">RSS (all tools)</a>
          <a href="webcal://${SITE.url.replace(/^https?:\/\//, '')}/calendar/${tool.slug}.ics" class="pill-link">Add to Calendar (${esc(tool.name)} only)</a>
        </div>
      </div>
      ${toolChanges.length ? `<div class="diff-log">
        ${toolChanges.map((c) => `<div class="diff-entry ${c.type}">
          <div class="diff-date">${c.date}${diffBadge(c.type, c.type === 'up' ? 'improved' : c.type === 'down' ? 'reduced' : 'changed')}</div>
          <h4>${esc(c.title)}</h4>
          <p style="color:var(--ink-soft);font-size:14px;margin-bottom:8px">${esc(c.description)}</p>
          ${c.sourceUrl ? `<a href="${esc(c.sourceUrl)}" class="text-link" style="font-size:13px">source →</a>` : ''}
        </div>`).join('\n        ')}
      </div>` : '<p style="color:var(--ink-faint)">No changes logged yet for this tool.</p>'}
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head"><div><span class="eyebrow">sources</span><h2>Where this comes from</h2></div></div>
      ${pendingWatch && pendingWatch.changed.some((c) => c.slug === tool.slug) ? `<div class="callout" style="margin-bottom:14px">Our automated watcher flagged ${esc(tool.pricingUrl)} as possibly changed on ${pendingWatch.checkedDate} — not yet independently re-verified, so figures below may already be behind.</div>` : ''}
      <div class="callout">
        Verified against ${tool.sources.map((s) => `<a href="${esc(s.url)}">${esc(s.title)}</a>`).join(', ')}. Last checked ${SITE.lastVerified}. See something stale? <a href="/about.html">Here’s how we keep this current.</a>
      </div>
      <p style="margin-top:14px;font-size:13px;color:var(--ink-faint)">Writing about ${esc(tool.name)}? <a href="/badges.html" class="text-link">Grab a badge →</a></p>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head"><div><span class="eyebrow">compare</span><h2>${esc(tool.name)} vs. the field</h2></div></div>
      <div class="compare-cta">
        ${others.map((o) => `<a class="pill-link" href="/compare/${[tool.slug, o.slug].sort().join('-vs-')}.html">${esc(tool.name)} vs ${esc(o.name)}</a>`).join('\n        ')}
      </div>
    </div>
  </section>`;

  return page({
    title: `${tool.shortName || tool.name} pricing & usage limits (${SITE.lastVerified}) — ${SITE.name}`,
    description: `${tool.name} by ${tool.vendor}: current plan prices, exact usage limits, and a dated history of every pricing change, sourced from official docs.`,
    canonicalPath: `/tools/${tool.slug}.html`,
    jsonLd,
    body,
  });
}

function comparePage(slugA, slugB) {
  const [a, b] = [toolBySlug(slugA), toolBySlug(slugB)].sort((x, y) => x.slug.localeCompare(y.slug));
  const rows = [a, b];

  const body = `<section class="vs-header">
    <div class="wrap" style="display:flex;align-items:center;justify-content:center;gap:20px">
      <span class="vs-name">${esc(a.name)}</span>
      <span class="vs-x">vs</span>
      <span class="vs-name">${esc(b.name)}</span>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head"><div><span class="eyebrow">side by side</span><h2>Headline plans compared</h2></div></div>
      <div class="plan-grid" style="grid-template-columns:repeat(2,1fr)">
        ${rows.map((t) => {
          const p = headlinePlan(t);
          return `<div class="plan-card">
          <div class="tool-cell" style="margin-bottom:14px"><span class="tool-mark">${esc(t.mark)}</span><span><span class="tool-name">${esc(t.name)}</span><span class="tool-vendor" style="display:block">${esc(t.vendor)}</span></span></div>
          <div class="plan-name">${esc(p.name)}</div>
          <div class="plan-price">${p.priceMonthly === 0 ? 'Free' : p.priceMonthly === null ? 'Custom' : `${money(p.priceMonthly)}<span>/mo</span>`}</div>
          <div class="plan-limit">${esc(p.limit)}</div>
          <div class="plan-target">${esc(p.target)}</div>
          <div style="margin-top:14px"><a href="/tools/${t.slug}.html" class="text-link" style="font-size:13px">Full breakdown →</a></div>
        </div>`;
        }).join('\n        ')}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head"><div><span class="eyebrow">recent moves</span><h2>Who changed what, most recently</h2></div></div>
      <div class="card-grid" style="grid-template-columns:repeat(2,1fr)">
        ${rows.map((t) => {
          const c = latestChange(t);
          return `<div class="info-card"><h3>${esc(t.name)}</h3>${c ? `<p>${diffBadge(c.type, relTime(c.date))} &nbsp;${esc(c.title)}</p>` : '<p>No changes logged yet.</p>'}</div>`;
        }).join('\n        ')}
      </div>
    </div>
  </section>`;

  return page({
    title: `${a.shortName || a.name} vs ${b.shortName || b.name}: pricing & usage limits compared — ${SITE.name}`,
    description: `${a.name} vs ${b.name} head-to-head: current plan prices and exact usage limits, sourced from official docs and updated as either tool changes.`,
    canonicalPath: `/compare/${a.slug}-vs-${b.slug}.html`,
    body,
  });
}

function changelogPage() {
  const changes = allChangesSorted();
  const body = `<section class="hero" style="border-bottom:none;padding-bottom:8px">
    <div class="wrap">
      <span class="eyebrow">changelog</span>
      <h1 style="font-size:clamp(1.9rem,3.4vw,2.8rem)">Every pricing &amp; limit change we’ve caught.</h1>
      <p class="lede">Newest first. Green means you got more for your money; rust means less.</p>
      <div class="hero-meta">
        <a href="/rss.xml" class="pulse-badge" style="text-decoration:none">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"><circle cx="5.5" cy="18.5" r="1.5" fill="var(--accent)" stroke="none"/><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/></svg>
          Subscribe via RSS
        </a>
        <a href="webcal://${SITE.url.replace(/^https?:\/\//, '')}/calendar/all.ics" class="pulse-badge" style="text-decoration:none">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          Add to Calendar
        </a>
        <span style="font-size:13.5px;color:var(--ink-faint)">No account or email needed — either way, changes just show up where you already look.</span>
      </div>
    </div>
  </section>
  <section class="section" style="border-top:1px solid var(--line)">
    <div class="wrap">
      <div class="diff-log">
        ${changes.map((c) => `<div class="diff-entry ${c.type}">
          <div class="diff-date">${c.date}${diffBadge(c.type, c.type === 'up' ? 'improved' : c.type === 'down' ? 'reduced' : 'changed')}</div>
          <h4><a href="/tools/${c.toolSlug}.html">${esc(c.toolName)}</a> — ${esc(c.title)}</h4>
          <p style="color:var(--ink-soft);font-size:14px;margin-bottom:8px">${esc(c.description)}</p>
          ${c.sourceUrl ? `<a href="${esc(c.sourceUrl)}" class="text-link" style="font-size:13px">source →</a>` : ''}
        </div>`).join('\n        ')}
      </div>
    </div>
  </section>`;

  return page({
    title: `Changelog — every AI coding tool pricing change — ${SITE.name}`,
    description: `A dated, sourced log of every pricing and usage-limit change across ${tools.length} AI coding tools — Claude Code, GitHub Copilot, Cursor, Windsurf, Codex, and more.`,
    canonicalPath: '/changelog.html',
    active: '/changelog.html',
    body,
  });
}

function usedByBadges(modelName) {
  const users = tools.filter((t) => t.contextWindow && t.contextWindow.model.includes(modelName));
  if (!users.length) return '<span style="color:var(--ink-faint);font-size:12.5px">not a default model for any tracked tool</span>';
  return users.map((t) => `<a href="/tools/${t.slug}.html" class="pill-link" style="padding:3px 10px;font-size:11.5px">${esc(t.mark)}</a>`).join(' ');
}

function leaderboardPage() {
  const byArena = [...models].sort((a, b) => a.arenaRank - b.arenaRank);

  const benchmarkRows = byArena.map((m) => `<tr data-elo="${m.arenaElo}">
          <td class="num mono" data-label="Rank">#${m.arenaRank}</td>
          <td data-label="Model"><span class="plan-name">${esc(m.name)}</span><span class="tool-vendor" style="display:block">${esc(m.vendor)}</span></td>
          <td class="num tabular-nums mono" data-label="Arena Elo">${m.arenaElo.toFixed(1)}</td>
          <td data-label="Used by">${usedByBadges(m.name)}</td>
          <td data-label="Vendor-claimed SWE-bench">${m.vendorClaimedSWEBench ? `<span style="color:var(--ink-soft);font-size:13px">${esc(m.vendorClaimedSWEBench)}</span>` : '<span style="color:var(--ink-faint)">—</span>'}</td>
        </tr>`).join('\n        ');

  const pricingRows = models.filter((m) => m.openRouter).sort((a, b) => a.openRouter.inputPerM - b.openRouter.inputPerM).map((m) => `<tr>
          <td data-label="Model"><span class="plan-name">${esc(m.name)}</span></td>
          <td class="num mono" data-label="Input $/M">$${m.openRouter.inputPerM.toFixed(2)}</td>
          <td class="num mono" data-label="Output $/M">$${m.openRouter.outputPerM.toFixed(2)}</td>
          <td class="num mono" data-label="Context">${formatTokens(m.contextWindowTokens)}</td>
        </tr>`).join('\n        ');

  const popularityCards = popularitySources.map((src) => `<div class="info-card" style="text-align:left">
        <h3 style="margin-bottom:2px">${esc(src.name)}</h3>
        <p class="mono" style="font-size:12px;color:var(--ink-faint);margin-bottom:2px">${esc(src.asOf)}</p>
        <p style="font-size:12.5px;color:var(--ink-soft);margin-bottom:12px">${esc(src.metric)}</p>
        <table style="width:100%;font-size:13.5px;margin-bottom:10px">
          ${src.rows.map(([name, val]) => `<tr><td style="padding:3px 0;color:var(--ink)">${esc(name)}</td><td class="mono tabular-nums" style="padding:3px 0;text-align:right;color:var(--ink-soft)">${esc(val)}</td></tr>`).join('\n          ')}
        </table>
        <p style="font-size:12px;color:var(--ink-faint);line-height:1.5">${esc(src.note)}</p>
        <a href="${esc(src.url)}" class="text-link" style="font-size:12.5px">source →</a>
      </div>`).join('\n      ');

  const body = `<section class="hero">
    <div class="wrap">
      <span class="eyebrow">model leaderboard</span>
      <h1>Which model is actually winning <em>— and how do we know?</em></h1>
      <p class="lede">The tools above wrap <strong>models</strong>. This page ranks the models themselves — benchmark standing, real usage, and raw API cost — and is explicit about which numbers are independently verified versus what a vendor simply claims.</p>
    </div>
  </section>

  <section class="section" id="benchmarks">
    <div class="wrap">
      <div class="section-head">
        <div><span class="eyebrow">${esc(arenaSource.name)} · ${esc(arenaSource.asOf)}</span><h2>Benchmark standing</h2><p>${esc(arenaSource.votes)} human-preference votes, independently fetched live — the only source in our research that's both current and covers every model below. SWE-bench Verified, the benchmark most press coverage cites, currently has <strong>zero independently-verified submissions</strong> for any of these 2026-generation models — what vendors headline as "SWE-bench Verified" scores are self-reported, shown here for reference but not as a ranked column.</p></div>
      </div>
      <div class="ledger-wrap">
        <table class="ledger">
          <thead>
            <tr>
              <th class="num">Rank</th>
              <th>Model</th>
              <th class="num">Arena Elo</th>
              <th>Used by</th>
              <th>Vendor-claimed SWE-bench</th>
            </tr>
          </thead>
          <tbody>
            ${benchmarkRows}
          </tbody>
        </table>
      </div>
      <p style="margin-top:14px;font-size:13px;color:var(--ink-faint)">${esc(arenaSource.note)} <a href="${esc(arenaSource.url)}" class="text-link">source →</a></p>
    </div>
  </section>

  <section class="section" id="popularity">
    <div class="wrap">
      <div class="section-head">
        <div><span class="eyebrow">real usage</span><h2>How popular is each tool, really?</h2><p>We didn't blend these into one fake ranking — the sources measure different things and disagree on order. Read them side by side: notice that the most-<em>used</em> tools (Copilot, ChatGPT) aren't always the most-<em>loved</em> ones.</p></div>
      </div>
      <div class="card-grid" style="grid-template-columns:repeat(3,1fr)">
        ${popularityCards}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="section-head">
        <div><span class="eyebrow">openrouter · live · ${SITE.lastVerified}</span><h2>Raw model cost, if you bought it directly</h2><p>What each model costs per million tokens via <a href="https://openrouter.ai" class="text-link">OpenRouter</a> — a unified API reseller whose prices track the vendors' own direct API rates closely (not a markup channel). This is the number to compare against a wrapped tool's subscription price to see how much of what you're paying is the model versus the product built around it. Only the models we could confirm pricing for are listed.</p></div>
      </div>
      <div class="ledger-wrap">
        <table class="ledger">
          <thead>
            <tr>
              <th>Model</th>
              <th class="num">Input $/M tokens</th>
              <th class="num">Output $/M tokens</th>
              <th class="num">Context</th>
            </tr>
          </thead>
          <tbody>
            ${pricingRows}
          </tbody>
        </table>
      </div>
    </div>
  </section>`;

  return page({
    title: `Model leaderboard — benchmark, usage & raw cost — ${SITE.name}`,
    description: 'Which AI model actually wins on coding benchmarks, real developer usage, and raw per-token API cost — with independently-verified figures kept clearly separate from vendor-claimed ones.',
    canonicalPath: '/leaderboard.html',
    active: '/leaderboard.html',
    body,
  });
}

function aboutPage() {
  const body = `<section class="hero" style="border-bottom:none;padding-bottom:8px">
    <div class="wrap">
      <span class="eyebrow">about</span>
      <h1 style="font-size:clamp(1.9rem,3.4vw,2.8rem)">Why this exists, and how it stays honest.</h1>
    </div>
  </section>
  <section class="section" style="border-top:1px solid var(--line)">
    <div class="wrap" style="max-width:72ch">
      <p style="margin-bottom:20px;color:var(--ink-soft);font-size:1.05rem;line-height:1.7">RateLog exists because AI coding tool pricing pages tell you today’s number and nothing else. They don’t tell you the Pro tier’s quota got cut 30% two months ago, or that a competitor just matched your plan’s price at double the limit. We track that.</p>
      <p style="margin-bottom:20px;color:var(--ink-soft);font-size:1.05rem;line-height:1.7">Every figure on this site is checked against the vendor’s own pricing or documentation page, then independently re-checked in a second pass before publishing. Each tool page links its sources and the date they were last verified. Where a vendor’s own docs are vague, we say so rather than inventing precision that isn’t there.</p>
      <p style="margin-bottom:20px;color:var(--ink-soft);font-size:1.05rem;line-height:1.7">Tools are verified in scheduled batches rather than continuously — every page currently shows the same “last verified” date because all ${tools.length} were re-checked together in one pass, not because it’s a placeholder that silently updates itself. Between batches, prices can drift; if you spot one that has, <a href="mailto:mylittletaste@gmail.com" class="text-link">tell us</a>.</p>
      <p style="margin-bottom:20px;color:var(--ink-soft);font-size:1.05rem;line-height:1.7">RateLog isn’t affiliated with any vendor listed here. The comparison table sorts however you choose — price, category, recency — never by a paid relationship. If that changes, it will be disclosed on this page and inline wherever it applies.</p>
      <p style="color:var(--ink-soft);font-size:1.05rem;line-height:1.7">Found something stale or wrong? <a href="mailto:mylittletaste@gmail.com" class="text-link">Tell us</a> and we’ll re-verify it.</p>
    </div>
  </section>`;

  return page({
    title: `About & methodology — ${SITE.name}`,
    description: 'How RateLog verifies AI coding tool pricing and usage-limit data, and why the changelog exists.',
    canonicalPath: '/about.html',
    active: '/about.html',
    body,
  });
}

function privacyPage() {
  const body = `<section class="hero" style="border-bottom:none;padding-bottom:8px">
    <div class="wrap">
      <span class="eyebrow">privacy</span>
      <h1 style="font-size:clamp(1.9rem,3.4vw,2.8rem)">Privacy policy.</h1>
    </div>
  </section>
  <section class="section" style="border-top:1px solid var(--line)">
    <div class="wrap" style="max-width:72ch">
      <p style="margin-bottom:20px;color:var(--ink-soft);font-size:1.05rem;line-height:1.7">RateLog doesn’t have user accounts, doesn’t ask you for any personal information, and doesn’t sell data — there isn’t any to sell. This page explains the little that touches your browser when you visit.</p>
      <p style="margin-bottom:20px;color:var(--ink-soft);font-size:1.05rem;line-height:1.7"><strong style="color:var(--ink)">Analytics.</strong> This site uses Google Analytics to see aggregate traffic (which pages get read, roughly where visitors come from) — never anything that identifies you personally. Google Analytics sets cookies to do this; you can block them with your browser’s cookie settings or an extension like uBlock Origin without losing any site functionality.</p>
      <p style="margin-bottom:20px;color:var(--ink-soft);font-size:1.05rem;line-height:1.7"><strong style="color:var(--ink)">Advertising.</strong> This site may show ads served by Google AdSense. Google and its partners use cookies to serve ads based on your visits here and elsewhere on the web. You can opt out of personalized advertising at <a href="https://adssettings.google.com" class="text-link">adssettings.google.com</a>, or opt out of third-party vendor cookies generally via <a href="https://www.aboutads.info/choices" class="text-link">aboutads.info/choices</a>.</p>
      <p style="margin-bottom:20px;color:var(--ink-soft);font-size:1.05rem;line-height:1.7"><strong style="color:var(--ink)">Server logs.</strong> Like any web host, GitHub Pages (where this site is hosted) logs standard request data (IP address, browser type, page requested) for security and operational purposes. RateLog itself never sees or stores this.</p>
      <p style="color:var(--ink-soft);font-size:1.05rem;line-height:1.7">Questions about this policy: <a href="mailto:mylittletaste@gmail.com" class="text-link">mylittletaste@gmail.com</a>. Last updated ${SITE.lastVerified}.</p>
    </div>
  </section>`;

  return page({
    title: `Privacy policy — ${SITE.name}`,
    description: 'What RateLog collects (almost nothing) and how Google Analytics / AdSense cookies work if enabled.',
    canonicalPath: '/privacy.html',
    active: '/privacy.html',
    body,
  });
}

// ---------------------------------------------------------------------------
// write
// ---------------------------------------------------------------------------

// Every href/src in the templates above is written as root-absolute ("/style.css",
// "/tools/x.html") because that's simplest to author. That only works if the site
// is served from a domain root. GitHub Pages project sites are served from a
// subpath (e.g. skymined.github.io/ratelog/), so root-absolute links would 404
// there. Rather than thread a base-path prefix through every template function,
// rewrite root-absolute hrefs/srcs to relative ones here, based on how deep the
// output file sits (0 = repo root, 1 = one directory in, e.g. tools/ or compare/).
// Absolute URLs (https://…, mailto:…) never match "/, so they're left alone —
// canonical/OG tags and sitemap.xml correctly stay fully absolute.
function relativizeLinks(html, relPath) {
  const depth = relPath.split('/').length - 1;
  const base = depth === 0 ? '.' : Array(depth).fill('..').join('/');
  return html.replace(/(href|src)="\/(?!\/)/g, `$1="${base}/`);
}

function write(relPath, content) {
  const full = path.join(ROOT, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const output = relPath.endsWith('.html') ? relativizeLinks(content, relPath) : content;
  fs.writeFileSync(full, output, 'utf8');
  console.log('wrote', relPath);
}

function buildSitemap() {
  const urls = ['/', '/finder.html', '/leaderboard.html', '/changelog.html', '/about.html', '/privacy.html', '/badges.html', '/api.html', ...tools.map((t) => `/tools/${t.slug}.html`), ...comparisons.map(([a, b]) => `/compare/${[a, b].sort().join('-vs-')}.html`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  write('sitemap.xml', body);
}

// shields.io-style embeddable badge — fully self-contained SVG (opaque fills),
// so it renders consistently regardless of the embedding page's own theme.
// Static/build-time only: no backend to regenerate these on request, so a
// badge reflects data as of the last deploy, same as the rest of the site.
function badgeSvg(label, message, color) {
  const charW = 6.5;
  const pad = 10;
  const labelW = Math.round(label.length * charW) + pad * 2;
  const msgW = Math.round(message.length * charW) + pad * 2;
  const total = labelW + msgW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${esc(label)}: ${esc(message)}">
  <title>${esc(label)}: ${esc(message)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="20" fill="#14171c"/>
    <rect x="${labelW}" width="${msgW}" height="20" fill="${color}"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="'IBM Plex Mono',DejaVu Sans Mono,Consolas,monospace" font-size="11">
    <text x="${labelW / 2}" y="14">${esc(label)}</text>
    <text x="${labelW + msgW / 2}" y="14">${esc(message)}</text>
  </g>
</svg>
`;
}

function buildBadges() {
  const BADGE_ACCENT = '#a5690f';
  const BADGE_UP = '#1b7a4d';
  const BADGE_DOWN = '#b0392c';
  const BADGE_NEUTRAL = '#5b616b';
  for (const t of tools) {
    const plan = headlinePlan(t);
    const priceMsg = plan.priceMonthly === 0 ? 'free' : plan.priceMonthly === null ? 'custom' : `${money(plan.priceMonthly)}/mo`;
    write(`badge/${t.slug}.svg`, badgeSvg(t.name.length > 20 ? t.mark : t.name, priceMsg, BADGE_ACCENT));

    const change = latestChange(t);
    const freshMsg = change ? relTime(change.date) : 'no data';
    const freshColor = !change ? BADGE_NEUTRAL : change.type === 'up' ? BADGE_UP : change.type === 'down' ? BADGE_DOWN : BADGE_NEUTRAL;
    write(`badge/${t.slug}-changed.svg`, badgeSvg('last changed', freshMsg, freshColor));
  }
}

function badgesPage() {
  const rows = tools.map((t) => {
    const priceUrl = `${SITE.url}/badge/${t.slug}.svg`;
    const changedUrl = `${SITE.url}/badge/${t.slug}-changed.svg`;
    const linkUrl = `${SITE.url}/tools/${t.slug}.html`;
    const priceMd = `[![${t.name} pricing](${priceUrl})](${linkUrl})`;
    const changedMd = `[![${t.name} last changed](${changedUrl})](${linkUrl})`;
    return `<div class="info-card" style="text-align:left">
        <h3 style="margin-bottom:12px">${esc(t.name)}</h3>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
          <img src="/badge/${t.slug}.svg" alt="${esc(t.name)} pricing" width="1" height="1" style="width:auto;height:20px" />
          <img src="/badge/${t.slug}-changed.svg" alt="${esc(t.name)} last changed" width="1" height="1" style="width:auto;height:20px" />
        </div>
        <label style="display:block;font-family:var(--font-mono);font-size:11px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Markdown</label>
        <textarea readonly onclick="this.select()" style="width:100%;font-family:var(--font-mono);font-size:12px;padding:8px;border:1px solid var(--line);border-radius:4px;background:var(--paper-sunken);color:var(--ink-soft);resize:vertical;margin-bottom:8px" rows="2">${esc(priceMd)}
${esc(changedMd)}</textarea>
      </div>`;
  }).join('\n      ');

  const dataUrl = `${SITE.url}/data/tools.json`;
  const claudeCodeIndex = tools.findIndex((t) => t.slug === 'claude-code');
  const exampleQuery = `$.tools[${claudeCodeIndex}].plans[0].priceMonthly`;
  const shieldsUrl = `https://img.shields.io/badge/dynamic/json?url=${encodeURIComponent(dataUrl)}&query=${encodeURIComponent(exampleQuery)}&label=${encodeURIComponent('Claude Code Pro')}&prefix=%24&suffix=%2Fmo&color=a5690f`;
  const shieldsMd = `[![Claude Code Pro price](${shieldsUrl})](${SITE.url}/tools/claude-code.html)`;

  const body = `<section class="hero" style="border-bottom:none;padding-bottom:8px">
    <div class="wrap">
      <span class="eyebrow">embeddable</span>
      <h1 style="font-size:clamp(1.9rem,3.4vw,2.8rem)">Badges for your README or blog post.</h1>
      <p class="lede">Writing about a tool? Drop its live-ish price or “last changed” badge in — click a badge to copy its Markdown. Badges are static images baked at our last build, same freshness as the rest of the site (see <a href="/about.html" class="text-link">About</a>).</p>
    </div>
  </section>
  <section class="section" style="border-top:1px solid var(--line)">
    <div class="wrap">
      <div class="section-head"><div><span class="eyebrow">always current</span><h2>Or pull it live via shields.io</h2><p>The badges above are rebuilt with the rest of the site, so they lag between builds. Our full dataset is also open at <code style="font-family:var(--font-mono)">/data/tools.json</code> — point shields.io's dynamic JSON badge at it directly and it re-fetches on every view, no rebuild needed.</p></div></div>
      <div class="info-card" style="text-align:left">
        <div style="margin-bottom:14px"><img src="${shieldsUrl}" alt="Claude Code Pro price (live via shields.io)" width="1" height="1" style="width:auto;height:20px" /></div>
        <label style="display:block;font-family:var(--font-mono);font-size:11px;color:var(--ink-faint);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Markdown (this example — swap the slug/path for any tool or plan field)</label>
        <textarea readonly onclick="this.select()" style="width:100%;font-family:var(--font-mono);font-size:12px;padding:8px;border:1px solid var(--line);border-radius:4px;background:var(--paper-sunken);color:var(--ink-soft);resize:vertical;margin-bottom:8px" rows="2">${esc(shieldsMd)}</textarea>
        <p style="color:var(--ink-faint);font-size:12.5px">Note: shields.io's JSONPath engine doesn't support <code style="font-family:var(--font-mono)">?(@.slug=='...')</code>-style filters — you have to address a tool by its numeric position in the <code style="font-family:var(--font-mono)">tools</code> array (Claude Code is index ${claudeCodeIndex} today; open <a href="/data/tools.json" class="text-link">/data/tools.json</a> and count to find another tool's index, and re-check it if the list order ever changes). See <a href="/api.html" class="text-link">the API page</a> for the full schema.</p>
      </div>
    </div>
  </section>
  <section class="section" style="border-top:1px solid var(--line)">
    <div class="wrap">
      <div class="card-grid" style="grid-template-columns:repeat(2,1fr)">
        ${rows}
      </div>
    </div>
  </section>`;

  return page({
    title: `Badges — embed live tool pricing — ${SITE.name}`,
    description: 'Free embeddable SVG badges showing each AI coding tool\'s current price and when it last changed — for READMEs, blog posts, and comparison content.',
    canonicalPath: '/badges.html',
    active: '/badges.html',
    body,
  });
}

// iCalendar (.ics) feeds — subscribe once in Google/Apple/Outlook Calendar and
// future changes appear automatically (the calendar app re-polls the URL on
// its own schedule), no site visit or feed reader required. Distinctive vs.
// competitors per research — nothing else in this niche offers it.
function slugify(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}
function icsEscape(str) {
  return String(str ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
function icsDate(dateStr) {
  return dateStr.replace(/-/g, '');
}
function icsEvent({ uid, date, summary, description, url }) {
  const start = icsDate(date);
  const end = icsDate(new Date(new Date(date + 'T00:00:00Z').getTime() + 86400000).toISOString().slice(0, 10));
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@ratelog.dev`,
    `DTSTAMP:${SITE.lastVerified.replace(/-/g, '')}T000000Z`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `URL:${url}`,
    'END:VEVENT',
  ].join('\r\n');
}
function icsCalendar(name, description, events) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RateLog//Pricing Changelog//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${icsEscape(name)}`,
    `X-WR-CALDESC:${icsEscape(description)}`,
    ...events,
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n';
}
function buildCalendars() {
  for (const t of tools) {
    const events = [...(t.changes || [])].sort((a, b) => new Date(a.date) - new Date(b.date)).map((c) => icsEvent({
      uid: `ratelog-${t.slug}-${c.date}-${slugify(c.title)}`,
      date: c.date,
      summary: `${c.type === 'up' ? '↑' : c.type === 'down' ? '↓' : '•'} ${t.name}: ${c.title}`,
      description: c.description,
      url: `${SITE.url}/tools/${t.slug}.html`,
    }));
    write(`calendar/${t.slug}.ics`, icsCalendar(`${SITE.name} — ${t.name}`, `Pricing & usage-limit changes for ${t.name}, tracked by RateLog.`, events));
  }
  const allEvents = allChangesSorted().slice().reverse().map((c) => icsEvent({
    uid: `ratelog-${c.toolSlug}-${c.date}-${slugify(c.title)}`,
    date: c.date,
    summary: `${c.type === 'up' ? '↑' : c.type === 'down' ? '↓' : '•'} ${c.toolName}: ${c.title}`,
    description: c.description,
    url: `${SITE.url}/tools/${c.toolSlug}.html`,
  }));
  write('calendar/all.ics', icsCalendar(`${SITE.name} — all tools`, 'Every AI coding tool pricing & usage-limit change RateLog has caught.', allEvents));
}

function finderPage() {
  const flatPlans = tools.flatMap((t) =>
    t.plans.map((p) => ({ tool: t, plan: p }))
  );
  const rows = flatPlans.map(({ tool: t, plan: p }) => {
    const priceStr = p.priceMonthly === 0 ? 'Free' : p.priceMonthly === null ? 'Custom' : `${money(p.priceMonthly)}<span class="mono" style="color:var(--ink-faint)">/mo</span>`;
    return `<tr data-price="${p.priceMonthly ?? 999999}" data-category="${esc(t.category)}" data-free="${t.hasFreeTier ? '1' : '0'}" data-ctx="${t.contextWindow?.tokens ?? 0}">
          <td data-label="Tool">
            <div class="tool-cell">
              <span class="tool-mark">${esc(t.mark)}</span>
              <span><a href="/tools/${t.slug}.html" class="tool-name" style="text-decoration:none;color:inherit">${esc(t.name)}</a><span class="tool-vendor">${esc(t.vendor)}</span></span>
            </div>
          </td>
          <td data-label="Plan"><span class="plan-name">${esc(p.name)}</span></td>
          <td class="num" data-label="Price">${priceStr}</td>
          <td data-label="Fits">${esc(p.target)}</td>
          <td class="num mono" data-label="Context window">${t.contextWindow ? esc(t.contextWindow.display) : '—'}</td>
        </tr>`;
  }).join('\n          ');

  const body = `<section class="hero">
    <div class="wrap">
      <span class="eyebrow">plan finder</span>
      <h1>Every plan, filtered to what you'd actually pay <em>and get.</em></h1>
      <p class="lede">Set a budget and a minimum context window — we filter across ${flatPlans.length} plans from all ${tools.length} tools by the numbers we're actually sure of. No fake "your exact monthly cost" estimate — we don't have reliable enough usage-to-request data to back that, so we won't pretend to.</p>
    </div>
  </section>
  <section class="section">
    <div class="wrap">
      <div class="calc finder-calc" style="margin-bottom:28px">
        <div class="field">
          <label>Max budget/mo <span class="val" id="budget-val">$250+</span></label>
          <input type="range" id="budget-slider" min="0" max="250" value="50" step="5" aria-label="Max monthly budget">
          <div class="marks"><span>$0</span><span>$50</span><span>$150</span><span>$250+</span></div>
        </div>
        <div class="field">
          <label>Min context window <span class="val" id="ctx-val">Any</span></label>
          <input type="range" id="ctx-slider" min="0" max="3" value="0" step="1" aria-label="Minimum context window">
          <div class="marks"><span>Any</span><span>200K</span><span>400K</span><span>1M</span></div>
        </div>
      </div>
      <div class="controls">
        <div class="chip-row" id="finder-chips">
          <button class="chip" data-filter="all" aria-pressed="true">All categories</button>
          <button class="chip" data-filter="Terminal agent" aria-pressed="false">Terminal agent</button>
          <button class="chip" data-filter="IDE plugin" aria-pressed="false">IDE plugin</button>
          <button class="chip" data-filter="Editor" aria-pressed="false">Editor</button>
          <button class="chip" data-filter="Cloud agent" aria-pressed="false">Cloud agent</button>
          <span class="chip-sep" aria-hidden="true"></span>
          <button class="chip" id="finder-free-toggle" aria-pressed="false">+ Has free tier</button>
        </div>
      </div>
      <p id="finder-count" class="mono" style="font-size:13px;color:var(--ink-soft);margin-bottom:10px"></p>
      <div class="ledger-wrap">
        <table class="ledger" id="finder-table">
          <thead><tr><th>Tool</th><th>Plan</th><th class="num">Price</th><th>Fits</th><th class="num">Context window</th></tr></thead>
          <tbody id="finder-body">
            ${rows}
          </tbody>
        </table>
      </div>
      <p id="finder-empty" style="display:none;color:var(--ink-faint);padding:24px 0;font-size:14px">No plans match — try a higher budget or a lower context-window minimum.</p>
    </div>
  </section>
  <script>
  (function () {
    var tbody = document.getElementById('finder-body');
    var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
    var emptyMsg = document.getElementById('finder-empty');
    var countEl = document.getElementById('finder-count');
    var budgetSlider = document.getElementById('budget-slider');
    var budgetVal = document.getElementById('budget-val');
    var ctxSlider = document.getElementById('ctx-slider');
    var ctxVal = document.getElementById('ctx-val');
    var chips = Array.prototype.slice.call(document.querySelectorAll('#finder-chips .chip[data-filter]'));
    var freeToggle = document.getElementById('finder-free-toggle');
    var activeCategory = 'all';
    var freeOnly = false;
    var CTX_STEPS = [0, 200000, 400000, 1000000];
    var CTX_LABELS = ['Any', '200K+', '400K+', '1M+'];

    function apply() {
      var budget = +budgetSlider.value;
      budgetVal.textContent = budget >= 250 ? '$250+' : '$' + budget;
      var ctxMin = CTX_STEPS[+ctxSlider.value];
      ctxVal.textContent = CTX_LABELS[+ctxSlider.value];

      var visible = rows.filter(function (row) {
        var price = +row.getAttribute('data-price');
        if (budget < 250 && price > budget) return false;
        if (+row.getAttribute('data-ctx') < ctxMin) return false;
        if (freeOnly && row.getAttribute('data-free') !== '1') return false;
        if (activeCategory !== 'all' && row.getAttribute('data-category') !== activeCategory) return false;
        return true;
      });
      rows.forEach(function (r) { r.style.display = 'none'; });
      visible.sort(function (a, b) { return (+a.getAttribute('data-price')) - (+b.getAttribute('data-price')); });
      visible.forEach(function (r) { tbody.appendChild(r); r.style.display = ''; });
      emptyMsg.style.display = visible.length ? 'none' : 'block';
      countEl.textContent = visible.length + ' of ' + rows.length + ' plans match';
    }

    budgetSlider.addEventListener('input', apply);
    ctxSlider.addEventListener('input', apply);
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', 'true');
        activeCategory = chip.getAttribute('data-filter');
        apply();
      });
    });
    freeToggle.addEventListener('click', function () {
      freeOnly = !freeOnly;
      freeToggle.setAttribute('aria-pressed', String(freeOnly));
      apply();
    });
    apply();
  })();
  </script>`;

  return page({
    title: `Plan Finder — filter by budget & context window — ${SITE.name}`,
    description: `Filter every plan across ${tools.length} AI coding tools by monthly budget, minimum context window, category, and free-tier availability.`,
    canonicalPath: '/finder.html',
    active: '/finder.html',
    body,
  });
}

function apiPage() {
  const sampleTool = tools[0];
  const sample = JSON.stringify({ lastVerified: SITE.lastVerified, tools: [{ slug: sampleTool.slug, name: sampleTool.name, vendor: sampleTool.vendor, plans: sampleTool.plans.slice(0, 1), contextWindow: sampleTool.contextWindow, changes: sampleTool.changes.slice(0, 1) }] }, null, 2);

  const body = `<section class="hero" style="border-bottom:none;padding-bottom:8px">
    <div class="wrap">
      <span class="eyebrow">for developers</span>
      <h1 style="font-size:clamp(1.9rem,3.4vw,2.8rem)">A free JSON endpoint. No key, no limit, no login.</h1>
      <p class="lede">Every figure on this site — as one file. Point a script, a dashboard, or your own tool at it instead of copying numbers by hand. We don't version this yet, so build defensively (see caveats below), but we'll keep the shape stable where we can.</p>
    </div>
  </section>
  <section class="section" style="border-top:1px solid var(--line)">
    <div class="wrap" style="max-width:72ch">
      <div class="section-head"><div><span class="eyebrow">endpoint</span><h2>GET /data/tools.json</h2></div></div>
      <div class="callout" style="margin-bottom:24px"><code style="font-family:var(--font-mono)">${SITE.url}/data/tools.json</code></div>

      <div class="section-head"><div><h2 style="font-size:1.2rem">Shape</h2></div></div>
      <p style="color:var(--ink-soft);margin-bottom:16px">One JSON object: <code class="mono">lastVerified</code> (the batch verification date for the whole file) and <code class="mono">tools</code> (an array — every field visible on each tool's own page: <code class="mono">slug</code>, <code class="mono">name</code>, <code class="mono">vendor</code>, <code class="mono">category</code>, <code class="mono">plans[]</code>, <code class="mono">contextWindow</code>, <code class="mono">changes[]</code>, <code class="mono">sources[]</code>).</p>
      <div class="ledger-wrap" style="margin-bottom:24px">
        <pre style="margin:0;padding:16px;font-family:var(--font-mono);font-size:12.5px;overflow-x:auto;line-height:1.6">${esc(sample)}</pre>
      </div>

      <div class="section-head"><div><h2 style="font-size:1.2rem">Caveats — read before you build on this</h2></div></div>
      <ul style="color:var(--ink-soft);line-height:1.9;padding-left:20px;margin-bottom:24px">
        <li>Static file, rebuilt whenever we update the site — not real-time. Same “batch verified” cadence as everything else here (see <a href="/about.html" class="text-link">About</a>).</li>
        <li>No schema version field yet. If we need a breaking change we'll add one rather than break silently — but until then, treat field additions as safe and field removals as possible.</li>
        <li>No auth, no rate limit, served straight off GitHub Pages — please cache client-side rather than polling it every request.</li>
        <li>Not legal/financial advice — same disclaimer as the rest of the site.</li>
      </ul>

      <div class="section-head"><div><h2 style="font-size:1.2rem">Built something with it?</h2></div></div>
      <p style="color:var(--ink-soft)">Tell us at <a href="mailto:mylittletaste@gmail.com" class="text-link">mylittletaste@gmail.com</a> and we'll link it here.</p>
    </div>
  </section>`;

  return page({
    title: `API — free JSON pricing data — ${SITE.name}`,
    description: 'A free, keyless JSON endpoint with every AI coding tool price, usage limit, and changelog entry RateLog tracks.',
    canonicalPath: '/api.html',
    active: '/api.html',
    body,
  });
}

function buildDataJson() {
  write('data/tools.json', JSON.stringify({ lastVerified: SITE.lastVerified, tools }, null, 0));
}

function rfc822(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z'); // noon UTC avoids off-by-one-day on date-only strings
  return d.toUTCString();
}

function rssItem(c) {
  const url = `${SITE.url}/tools/${c.toolSlug}.html`;
  const title = `${c.toolName} — ${c.title}`;
  const sign = c.type === 'up' ? '↑ improved' : c.type === 'down' ? '↓ reduced' : 'changed';
  return `    <item>
      <title>${esc(title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="false">ratelog-${esc(c.toolSlug)}-${esc(c.date)}-${esc(c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40))}</guid>
      <pubDate>${rfc822(c.date)}</pubDate>
      <description>${esc(`[${sign}] ${c.description}`)}</description>
    </item>`;
}

function buildRssFeed() {
  const changes = allChangesSorted().slice(0, 60); // keep the feed a reasonable size
  const items = changes.map(rssItem).join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.name)} changelog</title>
    <link>${SITE.url}/changelog.html</link>
    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${esc('Every AI coding tool pricing and usage-limit change RateLog has caught, dated and sourced.')}</description>
    <language>en-us</language>
    <lastBuildDate>${changes.length ? rfc822(changes[0].date) : new Date(0).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
  write('rss.xml', body);
}

function buildPerToolRssFeeds() {
  for (const t of tools) {
    const changes = [...(t.changes || [])]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((c) => ({ ...c, toolSlug: t.slug, toolName: t.name }));
    const items = changes.map(rssItem).join('\n');
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE.name)} — ${esc(t.name)} changelog</title>
    <link>${SITE.url}/tools/${t.slug}.html</link>
    <atom:link href="${SITE.url}/rss/${t.slug}.xml" rel="self" type="application/rss+xml" />
    <description>${esc(`Every pricing and usage-limit change RateLog has caught for ${t.name}, dated and sourced — no other tools mixed in.`)}</description>
    <language>en-us</language>
    <lastBuildDate>${changes.length ? rfc822(changes[0].date) : new Date(0).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;
    write(`rss/${t.slug}.xml`, body);
  }
}

function run() {
  write('index.html', homepage());
  write('changelog.html', changelogPage());
  write('about.html', aboutPage());
  write('privacy.html', privacyPage());
  write('leaderboard.html', leaderboardPage());
  write('badges.html', badgesPage());
  buildBadges();
  buildCalendars();
  write('api.html', apiPage());
  write('finder.html', finderPage());
  for (const t of tools) write(`tools/${t.slug}.html`, toolPage(t));
  for (const [a, b] of comparisons) {
    const [x, y] = [a, b].sort();
    write(`compare/${x}-vs-${y}.html`, comparePage(x, y));
  }
  buildSitemap();
  buildDataJson();
  buildRssFeed();
  buildPerToolRssFeeds();
  console.log(`\nBuilt ${tools.length} tool pages, ${comparisons.length} comparisons.`);
}

run();
