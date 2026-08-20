// Static site generator for RateLog. No dependencies — Node built-ins only.
// Run: node scripts/build.js
// Reads src/data/tools-data.js (single source of truth) and writes static
// HTML + a browser-facing JSON snapshot into the repo root.

const fs = require('fs');
const path = require('path');
const { SITE, tools, comparisons } = require('../src/data/tools-data.js');

const ROOT = path.join(__dirname, '..');

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
              <li><a href="/changelog.html">Changelog</a></li>
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
      </div>
    </div>
  </section>

  <div class="ticker-band" aria-hidden="true">
    <div class="ticker-track">
      ${tickerHtml}
      ${tickerHtml}
    </div>
  </div>

  <section class="section" id="table">
    <div class="wrap">
      <div class="section-head">
        <div><span class="eyebrow">the ledger</span><h2>Headline plan, by tool</h2><p>Each row is the most representative paid tier. Open a tool for the full breakdown across every plan.</p></div>
      </div>
      <div class="controls">
        <div class="chip-row" id="filter-chips">
          <button class="chip" data-filter="all" aria-pressed="true">All</button>
          <button class="chip" data-filter="Terminal agent" aria-pressed="false">Terminal agent</button>
          <button class="chip" data-filter="IDE plugin" aria-pressed="false">IDE plugin</button>
          <button class="chip" data-filter="Editor (fork)" aria-pressed="false">Editor (fork)</button>
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
      <div class="section-head"><div><span class="eyebrow">history</span><h2>What’s changed</h2></div></div>
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
      <div class="callout">
        Verified against ${tool.sources.map((s) => `<a href="${esc(s.url)}">${esc(s.title)}</a>`).join(', ')}. Last checked ${SITE.lastVerified}. See something stale? <a href="/about.html">Here’s how we keep this current.</a>
      </div>
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
    title: `${tool.name} pricing & usage limits (${SITE.lastVerified}) — ${SITE.name}`,
    description: `${tool.name} by ${tool.vendor}: current plan prices, exact usage limits, and a dated history of every pricing change, sourced from official docs.`,
    canonicalPath: `/tools/${tool.slug}.html`,
    active: '/',
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
    title: `${a.name} vs ${b.name}: pricing & usage limits compared — ${SITE.name}`,
    description: `${a.name} vs ${b.name} head-to-head: current plan prices and exact usage limits, sourced from official docs and updated as either tool changes.`,
    canonicalPath: `/compare/${a.slug}-vs-${b.slug}.html`,
    active: '/',
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
    description: 'A dated, sourced log of every pricing and usage-limit change across Claude Code, GitHub Copilot, Cursor, Windsurf, Codex, Gemini CLI, Amazon Q Developer and JetBrains AI Assistant.',
    canonicalPath: '/changelog.html',
    active: '/changelog.html',
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
      <p style="margin-bottom:20px;color:var(--ink-soft);font-size:1.05rem;line-height:1.7">Tools are verified in scheduled batches rather than continuously — every page currently shows the same “last verified” date because all eight were re-checked together in one pass, not because it’s a placeholder that silently updates itself. Between batches, prices can drift; if you spot one that has, <a href="mailto:hello@ratelog.dev" class="text-link">tell us</a>.</p>
      <p style="margin-bottom:20px;color:var(--ink-soft);font-size:1.05rem;line-height:1.7">RateLog isn’t affiliated with any vendor listed here. The comparison table sorts however you choose — price, category, recency — never by a paid relationship. If that changes, it will be disclosed on this page and inline wherever it applies.</p>
      <p style="color:var(--ink-soft);font-size:1.05rem;line-height:1.7">Found something stale or wrong? <a href="mailto:hello@ratelog.dev" class="text-link">Tell us</a> and we’ll re-verify it.</p>
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
      <p style="color:var(--ink-soft);font-size:1.05rem;line-height:1.7">Questions about this policy: <a href="mailto:hello@ratelog.dev" class="text-link">hello@ratelog.dev</a>. Last updated ${SITE.lastVerified}.</p>
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
  const urls = ['/', '/changelog.html', '/about.html', '/privacy.html', ...tools.map((t) => `/tools/${t.slug}.html`), ...comparisons.map(([a, b]) => `/compare/${[a, b].sort().join('-vs-')}.html`)];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`;
  write('sitemap.xml', body);
}

function buildDataJson() {
  write('data/tools.json', JSON.stringify({ lastVerified: SITE.lastVerified, tools }, null, 0));
}

function run() {
  write('index.html', homepage());
  write('changelog.html', changelogPage());
  write('about.html', aboutPage());
  write('privacy.html', privacyPage());
  for (const t of tools) write(`tools/${t.slug}.html`, toolPage(t));
  for (const [a, b] of comparisons) {
    const [x, y] = [a, b].sort();
    write(`compare/${x}-vs-${y}.html`, comparePage(x, y));
  }
  buildSitemap();
  buildDataJson();
  console.log(`\nBuilt ${tools.length} tool pages, ${comparisons.length} comparisons.`);
}

run();
