// Zero-AI, zero-dependency pricing-page change watcher for GitHub Actions.
// Fetches each tool's pricing page, strips markup, hashes the visible text,
// and compares against the last committed snapshot. A hash mismatch means
// "the page's text changed" — it does NOT mean we know WHAT changed, and it
// can miss changes on client-side-rendered (JS-heavy) pricing pages since
// this does a plain HTTP GET, no browser rendering. Treat a flag as "go
// look," not as a verified fact — the actual re-verification still needs a
// research pass (WebSearch/WebFetch + human or Claude review), same as the
// original data.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { tools } = require('../src/data/tools-data.js');

const SNAPSHOT_PATH = path.join(__dirname, 'pricing-snapshots.json');
const REPORT_PATH = path.join(__dirname, 'pricing-watch-report.json');

function normalize(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function fetchText(url, ms = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RateLogWatch/1.0; +https://github.com/skymined/ratelog)' },
    });
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const prev = fs.existsSync(SNAPSHOT_PATH) ? JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8')) : {};
  const next = {};
  const changed = [];
  const errored = [];

  for (const tool of tools) {
    const url = tool.pricingUrl;
    try {
      const html = await fetchText(url);
      const text = normalize(html);
      const h = hash(text);
      next[tool.slug] = { url, hash: h, textLength: text.length, checkedAt: new Date().toISOString() };
      const prevEntry = prev[tool.slug];
      if (prevEntry && prevEntry.hash !== h) {
        changed.push({ slug: tool.slug, name: tool.name, url, prevTextLength: prevEntry.textLength, newTextLength: text.length });
      }
    } catch (err) {
      errored.push({ slug: tool.slug, name: tool.name, url, error: String(err && err.message || err) });
      if (prev[tool.slug]) next[tool.slug] = prev[tool.slug]; // keep last-known-good snapshot on fetch failure
    }
  }

  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(next, null, 2) + '\n');

  const report = { changed, errored, checkedAt: new Date().toISOString() };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');

  console.log(`Checked ${tools.length} tools. Changed: ${changed.length}. Fetch errors: ${errored.length}.`);
  changed.forEach((c) => console.log(`  CHANGED  ${c.name} — ${c.url} (text length ${c.prevTextLength} -> ${c.newTextLength})`));
  errored.forEach((e) => console.log(`  ERROR    ${e.name} — ${e.url} — ${e.error}`));

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed.length > 0}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
