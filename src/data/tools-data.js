// Canonical data source for RateLog. Node-side only (required by scripts/build.js).
// Every number here traces to an official source in each tool's `sources` array.
// Populated from a research pass (WebSearch + WebFetch, independently verified in
// a second pass) completed 2026-08-20. See README.md "Updating data" before editing.

const SITE = {
  name: 'RateLog',
  tagline: 'AI coding tool pricing & limits, tracked like a changelog.',
  url: 'https://skymined.github.io/ratelog',
  lastVerified: '2026-08-20',
};

const tools = [
  {
    slug: 'claude-code',
    name: 'Claude Code',
    vendor: 'Anthropic',
    mark: 'CC',
    category: 'Terminal agent',
    officialUrl: 'https://code.claude.com/docs/en/costs',
    pricingUrl: 'https://claude.com/pricing',
    summary: "Anthropic's agentic coding CLI. Not available on the free claude.ai plan — the cheapest way in is a Pro subscription, or pay-as-you-go through the API (Claude Sonnet 5 at $2/$10 per million input/output tokens).",
    contextWindow: { model: 'Claude Sonnet 5', tokens: 1000000, display: '1M tokens', note: "Native on Sonnet 5 across every plan. Opus 5 also reaches 1M on Max/Team/Enterprise seats (needs usage credits on Pro); older models cap at 200K." },
    headlinePlanIndex: 0,
    hasFreeTier: false,
    freeTier: null,
    plans: [
      { name: 'Pro', priceMonthly: 20, priceYearly: 17, limit: "Shared pool across Claude Code and claude.ai chat, gated by a 5-hour rolling window plus a 7-day window. Anthropic doubled the 5-hour cap in May 2026 and hasn't republished exact message/hour numbers since — treat any specific count you see as approximate, not current.", target: 'Individual devs, light-to-moderate use', notes: '$20/mo, or $17/mo billed annually.' },
      { name: 'Max 5x', priceMonthly: 100, priceYearly: null, limit: "5× the Pro pool, same 5-hour + weekly structure. Anthropic's last published figures (Aug 2025) were ~140–280 Sonnet-hours/week plus ~15–35 Opus-hours/week — since increased by the May 2026 doubling but not re-published exactly.", target: 'Daily heavy use', notes: 'Monthly billing only, no annual discount advertised.' },
      { name: 'Max 20x', priceMonthly: 200, priceYearly: null, limit: "20× the Pro pool, same window structure. Last published figures: ~240–480 Sonnet-hours/week plus ~24–40 Opus-hours/week — since increased but not re-published exactly.", target: 'Power users, very heavy use', notes: 'Monthly billing only.' },
      { name: 'Team Standard', priceMonthly: 25, priceYearly: 20, limit: 'Per-seat allowance roughly comparable to Pro, same 5-hour + weekly structure, shared with claude.ai chat for that seat.', target: 'Small-to-mid teams', notes: '$25/seat/mo, or $20/seat/mo billed annually.' },
      { name: 'Team Premium', priceMonthly: 125, priceYearly: 100, limit: 'Per-seat allowance comparable to Max, same window structure.', target: 'Teams needing Max-level capacity', notes: '$125/seat/mo, or $100/seat/mo billed annually.' },
      { name: 'Enterprise', priceMonthly: null, priceYearly: null, limit: "Seat-based allowance by default (Standard or Premium tier); admins can enable pay-as-you-go 'usage credits' beyond the seat allowance at API rates. Custom limits available on request.", target: 'Large orgs needing compliance controls', notes: 'Contact sales. Adds SSO, SCIM, audit logs, spend controls.' },
    ],
    changes: [
      { date: '2026-08-10', type: 'up', title: 'Sonnet 5 API pricing made permanent', description: "Anthropic made Claude Sonnet 5's introductory API price ($2/$10 per million input/output tokens) permanent, canceling a scheduled increase to $3/$15 that was set for 2026-09-01.", sourceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing' },
      { date: '2026-05-13', type: 'up', title: 'Weekly limits raised 50%', description: 'One week after the 5-hour doubling, Anthropic raised weekly Claude Code usage limits by 50% for Pro, Max, and Team plans. Framed as promotional, it has been extended repeatedly and is confirmed live through August 31, 2026.', sourceUrl: 'https://aicatchup.com/news/claude-code-weekly-limits-50-percent-promo' },
      { date: '2026-05-06', type: 'up', title: '5-hour limits doubled', description: "Anthropic doubled Claude Code's 5-hour rate limits for Pro, Max, and Team plans (permanent) and removed a peak-hour usage reduction, enabled by new compute capacity from a deal giving Anthropic access to SpaceX's Colossus 1 data center.", sourceUrl: 'https://www.anthropic.com/news/higher-limits-spacex' },
      { date: '2025-08-28', type: 'down', title: 'Weekly limits introduced for the first time', description: 'Anthropic stacked a new 7-day usage cap on top of the existing 5-hour window, citing 24/7 automated usage and account sharing/reselling by under 5% of subscribers. This was the structural change that created the current two-window system.', sourceUrl: 'https://techcrunch.com/2025/07/28/anthropic-unveils-new-rate-limits-to-curb-claude-code-power-users/' },
    ],
    sources: [
      { title: 'Claude Pricing', url: 'https://claude.com/pricing' },
      { title: 'Claude Code: Manage costs effectively', url: 'https://code.claude.com/docs/en/costs' },
      { title: 'What is the Max plan?', url: 'https://support.claude.com/en/articles/11049741-what-is-the-max-plan' },
      { title: 'Anthropic API Pricing', url: 'https://platform.claude.com/docs/en/about-claude/pricing' },
    ],
  },

  {
    slug: 'github-copilot',
    name: 'GitHub Copilot',
    vendor: 'Microsoft / GitHub',
    mark: 'GH',
    category: 'IDE plugin',
    officialUrl: 'https://github.com/features/copilot',
    pricingUrl: 'https://github.com/features/copilot/plans',
    summary: "Microsoft's IDE-embedded assistant, billed through a token-based 'AI Credits' system since June 2026 instead of flat monthly request quotas.",
    contextWindow: { model: "GPT-5.3-Codex (Copilot's default 'base model')", tokens: 400000, display: '400K tokens', note: 'Most current models (including Claude Sonnet 5) can opt into a 1M extended window in VS Code/Copilot CLI specifically, at higher AI-credit cost.' },
    headlinePlanIndex: 0,
    hasFreeTier: true,
    freeTier: 'Copilot Free — 2,000 code completions and 50 chat requests per month, limited agent mode, restricted model set (Claude Haiku 4.5, GPT-5 mini). Resets monthly.',
    plans: [
      { name: 'Copilot Pro', priceMonthly: 10, priceYearly: null, limit: 'Unlimited code completions. $15 in total monthly AI Credits (1,000 base + 500 bonus) for chat, agent mode, CLI, and code review — token-metered, no rollover. Extra usage beyond that is $0.01/credit.', target: 'Individual devs stepping up from Free', notes: 'Legacy annual subscribers from before June 2026 stay on the old flat 300 requests/month model until renewal.' },
      { name: 'Copilot Pro+', priceMonthly: 39, priceYearly: null, limit: '$70 in total monthly AI Credits (3,900 base + 3,100 bonus) — about 4.7× Pro’s allowance. Broader model access, including Claude Opus.', target: 'Power users with heavy chat/agent use', notes: '' },
      { name: 'Copilot Max', priceMonthly: 100, priceYearly: null, limit: '$200 in total monthly AI Credits (10,000 base + 10,000 bonus) — about 2.9× Pro+’s allowance. Priority access to new models.', target: 'Heavy, sustained agentic workflows', notes: 'Newest individual tier, introduced with the June 2026 billing overhaul.' },
      { name: 'Copilot Business', priceMonthly: 19, priceYearly: null, limit: '1,900 AI Credits per user/month, pooled at the org level so unused credits can be used by teammates. No rollover.', target: 'Small/medium organizations', notes: 'Per user/month, billed to the org. Promotional bump to 3,000 credits/user/month for existing customers through Sept 1, 2026.' },
      { name: 'Copilot Enterprise', priceMonthly: 39, priceYearly: null, limit: '3,900 AI Credits per user/month, pooled at the enterprise level, same reset rules as Business.', target: 'Large enterprises needing deep GitHub.com integration', notes: 'Includes everything in Business plus GitHub.com-specific integrations.' },
    ],
    changes: [
      { date: '2026-06-01', type: 'neutral', title: 'Flat premium-request quotas replaced with AI Credits', description: 'GitHub replaced its flat monthly Premium Request quotas (e.g. 300/month for Pro) with a token-consumption-based "AI Credits" system (1 credit = $0.01) across all plans, and introduced a new top individual tier, Copilot Max, at $100/month. Total credit allowances ended up higher than sticker price once bonus credits are included, but billing is now metered rather than a flat predictable count.', sourceUrl: 'https://github.blog/changelog/2026-06-01-updates-to-github-copilot-billing-and-plans/' },
    ],
    sources: [
      { title: 'GitHub Copilot · Plans & pricing', url: 'https://github.com/features/copilot/plans' },
      { title: 'Usage-based billing for individuals', url: 'https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-individuals' },
      { title: 'Usage-based billing for organizations and enterprises', url: 'https://docs.github.com/en/copilot/concepts/billing/usage-based-billing-for-organizations-and-enterprises' },
    ],
  },

  {
    slug: 'cursor',
    name: 'Cursor',
    vendor: 'Anysphere',
    mark: 'CU',
    category: 'Editor',
    officialUrl: 'https://cursor.com',
    pricingUrl: 'https://cursor.com/pricing',
    summary: 'A VS Code fork with deep AI integration, billed through a monthly plan with an included usage allowance and on-demand billing beyond it.',
    contextWindow: { model: 'Composer 2.5', tokens: 200000, display: '200K tokens', note: "Cursor caps most models below their vendor-native max — even Gemini's ~1M window shows as 200K by default; a separate 1M 'Max context' tier exists for several models at extra cost." },
    headlinePlanIndex: 0,
    hasFreeTier: true,
    freeTier: "Hobby — full editor access with “limited” Agent requests and Tab completions. Cursor no longer publishes an exact number; check your own account dashboard for remaining quota.",
    plans: [
      { name: 'Pro', priceMonthly: 20, priceYearly: 16, limit: "Includes a set amount of monthly model usage (Cursor's pricing page no longer states this as a specific dollar figure — earlier this year it was described as a ~$20 'other-model' pool alongside a separate first-party pool; the live page now just says 'a set amount,' billing on-demand beyond it). Unlimited Tab completions.", target: 'Individual developers', notes: 'Replaced the old fixed "500 fast requests/month" model in June 2025.' },
      { name: 'Pro+', priceMonthly: 60, priceYearly: 48, limit: "3× Pro's included Agent usage, per Cursor's current pricing page.", target: 'Devs who regularly exhaust Pro', notes: '' },
      { name: 'Ultra', priceMonthly: 200, priceYearly: 160, limit: "20× Pro's included Agent usage, plus priority access to new features.", target: 'Power users running many parallel agents', notes: '' },
      { name: 'Teams Standard', priceMonthly: 40, priceYearly: 32, limit: 'Per-seat included model usage on a shared team billing cycle.', target: 'Small-to-mid teams', notes: 'Includes SSO, usage analytics, privacy mode. Same price as before June 2026 but with materially more included usage.' },
      { name: 'Teams Premium', priceMonthly: 120, priceYearly: 96, limit: "5× a Teams Standard seat's usage at 3× the price.", target: 'Teams with heavy, all-day usage', notes: 'New seat tier introduced June 2026; teams can mix Standard and Premium seats.' },
      { name: 'Enterprise', priceMonthly: null, priceYearly: null, limit: 'Custom, pooled usage across the org.', target: 'Large orgs needing procurement/compliance controls', notes: 'Adds SCIM, invoice billing, audit logs, RBAC.' },
    ],
    changes: [
      { date: '2026-06-01', type: 'up', title: 'Teams split into two seat tiers', description: 'Standard keeps its $40/seat price but gains materially more included usage, split into first-party and third-party model pools. A new $120/seat Premium tier (5× Standard’s usage) was added for heavy daily users.', sourceUrl: 'https://cursor.com/blog/teams-pricing-june-2026' },
      { date: '2025-08-12', type: 'neutral', title: 'Teams moved to usage-based billing', description: 'Teams moved from a fixed per-request cost (250 included requests/month/seat, $0.08 per extra request) to variable, API-rate usage billing.', sourceUrl: 'https://cursor.com/blog/aug-2025-pricing-teams' },
      { date: '2025-06-16', type: 'neutral', title: 'Pro moved off flat "500 fast requests"', description: "Cursor dropped the old flat ‘500 fast requests/month’ Pro model for usage-based pricing: Pro now includes at least $20/month of inference at API prices and unlimited use of the 'Auto' model. Also launched the $200/month Ultra tier.", sourceUrl: 'https://cursor.com/blog/new-tier' },
    ],
    sources: [
      { title: 'Cursor · Pricing', url: 'https://cursor.com/pricing' },
      { title: 'Models & Pricing | Cursor Docs', url: 'https://cursor.com/docs/models-and-pricing' },
      { title: 'Usage and limits | Cursor Docs', url: 'https://cursor.com/help/models-and-usage/usage-limits' },
    ],
  },

  {
    slug: 'windsurf',
    name: 'Devin Desktop (formerly Windsurf)',
    shortName: 'Devin Desktop', // full name is too long for <title> tags (truncates in search results)
    vendor: 'Cognition',
    mark: 'DD',
    category: 'Editor',
    officialUrl: 'https://devin.ai',
    pricingUrl: 'https://devin.ai/pricing',
    summary: "Cognition's AI-native IDE — formerly independent Windsurf, acquired by Cognition in 2025 and rebranded “Devin Desktop” in June 2026, unifying it with Cognition's cloud agent Devin under one billing surface. windsurf.com now permanently redirects to devin.ai.",
    contextWindow: { model: 'SWE-1.7', tokens: null, display: 'Not published', note: 'Cognition has never stated an exact figure for its in-house model; third-party estimates guess ~256K. External frontier models (Claude, GPT, Gemini) are selectable, but docs don’t say whether their native windows pass through uncapped.' },
    headlinePlanIndex: 0,
    hasFreeTier: true,
    freeTier: "A “light” agent quota that refreshes daily and weekly (Cognition doesn't publish an exact number), limited model access, unlimited Tab completions.",
    plans: [
      { name: 'Pro', priceMonthly: 20, priceYearly: null, limit: "Token-based quota refreshing daily and weekly. Cognition's own free SWE-series models don't count against it; frontier model access (Claude/GPT/Gemini) is included.", target: 'Individual devs using agents daily', notes: 'Was $15/mo before March 2026; pre-existing subscribers reported grandfathered at that price.' },
      { name: 'Max', priceMonthly: 200, priceYearly: null, limit: "Same daily+weekly mechanism as Pro but substantially higher — Cognition's own published ranges put it roughly 5–6× Pro's message allowance per period.", target: 'Power users with heavy daily/weekly usage', notes: 'Introduced March 2026 alongside the credits→quota switch.' },
      { name: 'Teams', priceMonthly: 80, priceYearly: null, limit: 'Hybrid seat model: $80/mo is a minimum team spend, not a flat fee. "Full" seats are $40/mo each and get their own Pro-equivalent daily+weekly quota plus Desktop app access; "flex" seats are free and unlimited, sharing an on-demand credit pool but without Desktop access.', target: 'Small-to-mid engineering teams', notes: 'Resolved per docs.devin.ai/admin/billing/self-serve — $80/mo minimum is reached at 2 full seats ($40 each); teams under that add a base-fee makeup, and can add unlimited free flex seats beyond that.' },
      { name: 'Enterprise', priceMonthly: null, priceYearly: null, limit: 'Custom, contact sales. Some sources describe billing in "Agent Compute Units" for newer contracts.', target: 'Large orgs needing SSO / compliance', notes: 'Pricing is contested across sources (see openQuestions in our research notes) — treat any specific figure you see elsewhere as unconfirmed.' },
    ],
    changes: [
      { date: '2026-08-23', type: 'neutral', title: 'Teams pricing structure clarified', description: 'Resolved earlier conflicting reports about Teams pricing: it’s a hybrid model, not a flat per-seat rate — $80/mo minimum team spend, $40/mo per full seat (Pro-equivalent quota + Desktop access), and unlimited free flex seats (shared credits, no Desktop access).', sourceUrl: 'https://docs.devin.ai/admin/billing/self-serve' },
      { date: '2026-06-02', type: 'neutral', title: 'Rebranded to "Devin Desktop"', description: "Cognition rebranded the Windsurf IDE as “Devin Desktop,” unifying it with the cloud agent Devin under one product and opening it to third-party agents via the open Agent Client Protocol.", sourceUrl: 'https://devin.ai/blog/windsurf-is-now-devin-desktop' },
      { date: '2026-03-19', type: 'down', title: 'Flat credits replaced with daily/weekly quotas; Pro price up', description: 'Cognition replaced flat monthly credit-pool billing with a token-based system giving daily + weekly usage allowances, raised Pro from $15→$20/mo and Teams from $30→$40/seat/mo (both reportedly grandfathered for existing subscribers), and launched a new $200/mo Max tier.', sourceUrl: 'https://docs.devin.ai/desktop/accounts/quota' },
    ],
    sources: [
      { title: 'Quota-Based Usage — Devin/Windsurf docs', url: 'https://docs.devin.ai/desktop/accounts/quota' },
      { title: 'Plans and Usage — Devin/Windsurf docs', url: 'https://docs.devin.ai/desktop/accounts/usage' },
      { title: 'Self-serve billing — Devin/Windsurf docs', url: 'https://docs.devin.ai/admin/billing/self-serve' },
      { title: 'devin.ai/pricing', url: 'https://devin.ai/pricing' },
    ],
  },

  {
    slug: 'openai-codex',
    name: 'ChatGPT / Codex',
    vendor: 'OpenAI',
    mark: 'OA',
    category: 'Terminal agent',
    officialUrl: 'https://openai.com/codex/',
    pricingUrl: 'https://openai.com/chatgpt/pricing/',
    summary: "OpenAI's coding agent, accessed through Codex CLI, an IDE extension, or ChatGPT web. Usage is tied to your ChatGPT plan and billed via token-based credits at API rates since April 2026.",
    contextWindow: { model: 'GPT-5.6 Sol', tokens: 272000, display: '272K tokens', note: "Capped well below GPT-5.6's 1.05M native API window. An opt-in config override can raise it to 1M, but prompts past 272K trigger a pricing multiplier either way." },
    headlinePlanIndex: 1,
    hasFreeTier: true,
    freeTier: 'Free — unlimited text chat with the lightweight GPT-5.6 Luna model (as of Aug 2026). Codex is included but limited to "quick coding tasks" with no published numeric cap.',
    plans: [
      { name: 'Go', priceMonthly: 8, priceYearly: null, limit: 'More messages/uploads than Free (no exact numbers published); Codex usable for lightweight coding tasks.', target: 'Casual users wanting more than Free', notes: 'Ad-supported in rollout markets (US, UK, Australia, New Zealand, Canada).' },
      { name: 'Plus', priceMonthly: 20, priceYearly: null, limit: 'Codex CLI/IDE/cloud tasks share a rolling 5-hour window plus a separate weekly cap, billed via token-based credits at API rates. Roughly 10–2,000 messages per 5-hour window depending on model chosen.', target: 'Individual power users', notes: 'The 5-hour window was briefly suspended July 12–30, 2026 during a demand spike, then restored.' },
      { name: 'Pro (5x)', priceMonthly: 100, priceYearly: null, limit: '5× the Plus rate-limit pool, same window structure. ~1–2.5 hours of Voice per period; "maximum" Codex tasks.', target: 'Heavy individual users doing research and coding', notes: '' },
      { name: 'Pro (20x)', priceMonthly: 200, priceYearly: null, limit: '20× the Plus pool, same window structure. Unlimited Voice and faster image generation; "maximum" Codex tasks and deep research.', target: 'Top-tier individual usage', notes: '' },
      { name: 'Business Standard', priceMonthly: 25, priceYearly: 20, limit: 'Per-seat limits comparable to Plus (5-hour + weekly window, token-based credits). Admins can buy pooled extra usage.', target: 'Small/medium teams', notes: '2-seat minimum. Cut from $30/$25 to $25/$20 in April 2026.' },
      { name: 'Business Premium', priceMonthly: 125, priceYearly: 100, limit: "5× a Standard seat's usage with no 5-hour window.", target: 'Teams wanting heavier per-seat usage', notes: 'Rolling out as of mid-2026, may not be universally available yet.' },
      { name: 'Enterprise', priceMonthly: null, priceYearly: null, limit: 'No public numeric limit — negotiated per contract.', target: 'Large organizations', notes: 'Third-party procurement reports suggest roughly $45–75/seat/month; unconfirmed by OpenAI.' },
    ],
    changes: [
      { date: '2026-08-06', type: 'up', title: 'Free-tier chat cap removed', description: 'GPT-5.6 Luna became the default Free-tier model, and OpenAI began removing the numeric cap on Free-tier text chats entirely, moving toward "unlimited" (subject to abuse guardrails).', sourceUrl: 'https://openai.com/chatgpt/pricing/' },
      { date: '2026-04-02', type: 'up', title: 'Business seat price cut', description: 'Cut ChatGPT Business per-seat price about $5: from $30/mo ($25 annual) down to $25/mo ($20 annual).', sourceUrl: 'https://help.openai.com/en/articles/8792828-what-is-chatgpt-business' },
      { date: '2026-04-02', type: 'neutral', title: 'Codex switched to token-based credits', description: 'Switched Codex from flat per-message billing to token-based credits at API rates for Plus, Pro, and Business — cost now scales with tokens used instead of one flat unit per task.', sourceUrl: 'https://help.openai.com/en/articles/20001106-codex-rate-card' },
    ],
    sources: [
      { title: 'ChatGPT Pricing', url: 'https://openai.com/chatgpt/pricing/' },
      { title: 'Using Codex with your ChatGPT plan', url: 'https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan' },
      { title: 'Codex rate card', url: 'https://help.openai.com/en/articles/20001106-codex-rate-card' },
    ],
  },

  {
    slug: 'gemini-cli',
    name: 'Gemini CLI / Code Assist',
    vendor: 'Google',
    mark: 'GM',
    category: 'Terminal agent',
    officialUrl: 'https://codeassist.google/',
    pricingUrl: 'https://codeassist.google/products/business',
    summary: "Google's coding assistant for Cloud/Workspace teams. Individual free access to Gemini CLI ended on June 18, 2026 — it's now priced per-seat for teams, or pay-per-token via your own Gemini API key.",
    contextWindow: { model: 'Gemini 3.1 Pro', tokens: 1048576, display: '~1M tokens', note: 'Effectively every Gemini model the CLI ships with — Pro, Flash, and Flash-Lite alike — shares this same window.' },
    headlinePlanIndex: 0,
    hasFreeTier: false,
    freeTier: "Discontinued for individuals on June 18, 2026 — Gemini CLI and the Code Assist IDE extensions stopped serving free, Pro, and Ultra-subscriber requests. The successor for individuals is Google's separate “Antigravity CLI”; the only way to keep running Gemini CLI itself is to supply your own paid Gemini API key.",
    plans: [
      { name: 'Code Assist Standard (annual)', priceMonthly: 19, priceYearly: 228, limit: '1,500 requests/user/day (agent + CLI combined), 6,000 completion requests/day, 960 chat requests/day, 2 req/sec. Resets daily.', target: 'Teams/businesses, paid upfront annually', notes: '30-day free trial for up to 50 licenses.' },
      { name: 'Code Assist Standard (monthly)', priceMonthly: 22.8, priceYearly: null, limit: 'Same as annual Standard: 1,500 req/day combined.', target: 'Teams wanting pay-as-you-go billing', notes: '' },
      { name: 'Code Assist Enterprise (annual)', priceMonthly: 45, priceYearly: 540, limit: '2,000 requests/user/day, 6,000 completion req/day, 2 req/sec, code customization across up to 20,000 repos, 1M-token local codebase context.', target: 'Larger enterprises needing private-repo code customization', notes: '' },
      { name: 'Code Assist Enterprise (monthly)', priceMonthly: 54, priceYearly: null, limit: 'Same as annual Enterprise: 2,000 req/day.', target: 'Enterprises wanting pay-as-you-go billing', notes: '' },
      { name: 'Individual (pay-per-token API key)', priceMonthly: null, priceYearly: null, limit: "Free API tier has no published flat rate limit (shown only in your AI Studio dashboard). Paid Tier 1 unlocks at any billing link ($10/10-min spend cap, $250 total); Tier 2 needs $100+ spent ($200/10-min, $2,000 cap); Tier 3 needs $1,000+ spent ($200/10-min, $20k–100k+ cap).", target: 'Individuals since the June 2026 free-tier shutdown', notes: 'Not a subscription — usage-based, billed through Google AI Studio/Cloud.' },
    ],
    changes: [
      { date: '2026-06-18', type: 'down', title: 'Free individual access ended entirely', description: 'Gemini CLI and the Code Assist IDE extensions stopped serving requests for the free individual tier and for Google AI Pro/Ultra subscribers — ending free access entirely for individuals, who must now use the successor "Antigravity CLI" or their own paid API key.', sourceUrl: 'https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/' },
      { date: '2026-05-19', type: 'neutral', title: 'Google AI Ultra price cut (no longer grants CLI quota)', description: 'Google cut the Google AI Ultra subscription price from $249.99/mo to $99.99/mo (5× Pro usage), adding a $199.99/mo tier (20× Pro usage) — though after June 18 this subscription no longer grants any Gemini CLI quota at all.', sourceUrl: 'https://codeassist.google/products/business' },
    ],
    sources: [
      { title: 'Gemini Code Assist for teams and businesses', url: 'https://codeassist.google/products/business' },
      { title: 'Gemini Code Assist quotas', url: 'https://docs.cloud.google.com/gemini/docs/quotas' },
      { title: 'Transitioning Gemini CLI to Antigravity CLI', url: 'https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/' },
    ],
  },

  {
    slug: 'amazon-q-developer',
    name: 'Amazon Q Developer',
    vendor: 'Amazon Web Services',
    mark: 'AQ',
    category: 'IDE plugin',
    officialUrl: 'https://aws.amazon.com/q/developer/',
    pricingUrl: 'https://aws.amazon.com/q/developer/pricing/',
    summary: "AWS's IDE/CLI coding assistant. AWS announced in April 2026 that it's sunsetting Q Developer's IDE plugins and paid tier in favor of a new agentic IDE, Kiro.",
    contextWindow: { model: 'Claude Sonnet 4', tokens: 200000, display: '200K tokens', note: "AWS caps this explicitly in its own docs. Anthropic's since-retired 1M beta for Sonnet 4 no longer applies, so there's no gap between Q Developer's cap and the model's own current limit." },
    headlinePlanIndex: 0,
    hasFreeTier: true,
    freeTier: 'Free Tier (AWS Builder ID or IAM) — 50 agentic requests/month (chat + agentic coding, IDE+CLI combined), 1,000 lines/month for Java code transformation, unlimited inline completions. New signups blocked since May 15, 2026; existing accounts keep working.',
    plans: [
      { name: 'Pro Tier', priceMonthly: 19, priceYearly: null, limit: "10,000 inference calls/month (~1,000 requests) per user, 4,000 lines/month for Java transformation (overage $0.003/line), separate 1M lines/month .NET transformation quota. Agentic-request overage isn't purchasable — you wait for the next month.", target: 'Teams needing admin controls, IP indemnity', notes: 'New Pro signups also blocked since May 15, 2026; existing subscribers keep this pricing until end of support (April 30, 2027).' },
    ],
    changes: [
      { date: '2026-04-30', type: 'down', title: 'Product sunset announced', description: 'AWS announced Amazon Q Developer’s IDE plugins and paid Pro subscription are being sunset in favor of a new agentic IDE, "Kiro" — new Free Tier and Pro signups blocked from May 15, 2026, full end of support April 30, 2027.', sourceUrl: 'https://aws.amazon.com/blogs/devops/amazon-q-developer-end-of-support-announcement/' },
    ],
    sources: [
      { title: 'Amazon Q Developer Pricing', url: 'https://aws.amazon.com/q/developer/pricing/' },
      { title: 'Amazon Q Developer FAQs', url: 'https://aws.amazon.com/q/developer/faqs/' },
      { title: 'End-of-support announcement', url: 'https://aws.amazon.com/blogs/devops/amazon-q-developer-end-of-support-announcement/' },
    ],
  },

  {
    slug: 'jetbrains-ai',
    name: 'JetBrains AI Assistant',
    vendor: 'JetBrains',
    mark: 'JB',
    category: 'IDE plugin',
    officialUrl: 'https://www.jetbrains.com/ai-ides/',
    pricingUrl: 'https://www.jetbrains.com/ai-ides/buy/',
    summary: "JetBrains' AI layer across its IDEs (and the Junie coding agent), billed through a credit system where 1 AI Credit ≈ $1 of underlying model usage.",
    contextWindow: { model: 'Claude Sonnet 5 (one of several current-gen options)', tokens: 1000000, display: '1M tokens', note: 'Applies to any current-gen frontier model you pick (Opus 5, GPT-5.6, Gemini 3.x); drops to 200K–400K on older/smaller model choices.' },
    headlinePlanIndex: 0,
    hasFreeTier: true,
    freeTier: 'AI Free — 3 AI Credits per 30 days (no top-ups). Local/on-device completions are unlimited and don’t use credits. Unavailable on free Community-edition IDEs.',
    plans: [
      { name: 'AI Pro (Individual)', priceMonthly: 10, priceYearly: 100, limit: '10 AI Credits per 30 days (1 credit ≈ 10 AI Chat requests, 40 in-editor completions, or 25 explanation requests). Resets 30 days from activation, not your billing date.', target: 'Individual professional developers', notes: 'Top-ups available, valid 12 months.' },
      { name: 'AI Ultimate (Individual)', priceMonthly: 30, priceYearly: 300, limit: '35 AI Credits per 30 days ($30 plan + $5 bonus), or 420 credits/year on the annual plan. Junie’s agent burns credits much faster than chat — each turn is a long multi-step request.', target: 'Individual power users / heavy Junie agent use', notes: '' },
      { name: 'AI Pro (Org seat)', priceMonthly: 20, priceYearly: null, limit: '20 AI Credits per 30 days per seat, same $1=1 credit mechanics.', target: 'Teams licensing seats centrally', notes: '' },
      { name: 'AI Ultimate (Org seat)', priceMonthly: 60, priceYearly: null, limit: '70 AI Credits per 30 days per seat.', target: 'Teams needing Ultimate-level capacity', notes: '' },
      { name: 'AI Enterprise', priceMonthly: 60, priceYearly: null, limit: "Quota described only as “on par with AI Ultimate or higher” — exact number not yet published; JetBrains says the enterprise quota model is still being finalized.", target: 'Large organizations (org-only)', notes: 'Top-ups not yet available on this tier.' },
    ],
    changes: [
      { date: '2026-07-07', type: 'up', title: 'Org credits extended to 12-month validity', description: 'Announced transitioning org/business AI licensing from fixed seat quotas toward on-demand credits with validity extended from 30 days to 12 months, rolling out through July–August 2026.', sourceUrl: 'https://blog.jetbrains.com/blog/2026/07/07/jetbrains-ai-for-teams-and-organizations-from-fragmented-ai-usage-to-coordinated-software-development/' },
      { date: '2025-08-25', type: 'down', title: 'Quotas tied to plan price, shrinking for heavy users', description: "Replaced its opaque per-plan quota with a rule that each plan's AI-Credit allowance equals its USD price (plus a small bonus on Ultimate). JetBrains acknowledged quotas were shrinking for a meaningful share of users, especially heavy Junie agent users, since old quotas had been set unsustainably high as a promotional measure.", sourceUrl: 'https://blog.jetbrains.com/ai/2025/08/a-simpler-more-transparent-model-for-ai-quotas/' },
    ],
    sources: [
      { title: 'JetBrains AI plans and usage', url: 'https://www.jetbrains.com/help/ai-assistant/licensing-and-subscriptions.html' },
      { title: 'A Simpler, More Transparent Model for AI Quotas', url: 'https://blog.jetbrains.com/ai/2025/08/a-simpler-more-transparent-model-for-ai-quotas/' },
    ],
  },

  {
    slug: 'kiro',
    name: 'Kiro',
    vendor: 'Amazon Web Services',
    mark: 'KR',
    category: 'Editor',
    officialUrl: 'https://kiro.dev',
    pricingUrl: 'https://kiro.dev/pricing/',
    summary: "AWS's agentic, spec-driven IDE (a VS Code fork) — the official successor to Amazon Q Developer, which AWS is sunsetting through April 2027.",
    contextWindow: { model: 'Claude Opus 5', tokens: 1000000, display: '1M tokens', note: 'Also true of Claude Sonnet 5, Opus 4.8, and Sonnet 4.6 in Kiro’s lineup — the default “Auto” router picks among them per task.' },
    headlinePlanIndex: 0,
    hasFreeTier: true,
    freeTier: 'Free — 50 credits/month (no rollover), access to open-weight models and Claude Sonnet 4.5, subject to rate limits. Not available in AWS GovCloud.',
    plans: [
      { name: 'Pro', priceMonthly: 20, priceYearly: null, limit: '1,000 credits/month (no rollover), metered in 0.01 increments by task complexity. Overage $0.04/credit.', target: 'Individual devs using Kiro regularly', notes: 'First paid-tier upgrade gets a one-time $20 credit.' },
      { name: 'Pro+', priceMonthly: 40, priceYearly: null, limit: '2,000 credits/month, same metering and overage as Pro.', target: 'Developers with higher, steadier usage', notes: '' },
      { name: 'Pro Max', priceMonthly: 100, priceYearly: null, limit: '5,000 credits/month — 2.5× Pro+.', target: 'Professional devs using Kiro all day', notes: 'Added June 2026 to bridge the Pro+/Power price gap with a predictable flat rate.' },
      { name: 'Power', priceMonthly: 200, priceYearly: null, limit: '10,000 credits/month.', target: 'Heaviest individual users', notes: 'Team plans reuse these per-seat prices plus consolidated billing and SSO via AWS IAM Identity Center.' },
    ],
    changes: [
      { date: '2026-06-10', type: 'up', title: 'Added Pro Max tier', description: 'AWS introduced a $100/mo Pro Max tier (5,000 credits) to bridge the gap between Pro+ ($40) and Power ($200), giving mid-heavy users a predictable flat rate instead of unpredictable overage charges.', sourceUrl: 'https://kiro.dev/blog/kiro-pro-max/' },
      { date: '2025-07-21', type: 'down', title: 'Emergency usage caps and a signup waitlist', description: "Days after Kiro's public preview launched, AWS imposed temporary daily usage caps and a signup waitlist due to overwhelming demand — lifted in October 2025 when the current credit-tier system replaced it.", sourceUrl: 'https://www.theregister.com/2025/07/21/aws_kiro_usage_cap/' },
    ],
    sources: [
      { title: 'Kiro Pricing', url: 'https://kiro.dev/pricing/' },
      { title: 'Kiro Billing docs', url: 'https://kiro.dev/docs/billing/' },
      { title: 'Amazon Q Developer end-of-support announcement', url: 'https://aws.amazon.com/blogs/devops/amazon-q-developer-end-of-support-announcement/' },
    ],
  },

  {
    slug: 'replit-agent',
    name: 'Replit Agent',
    vendor: 'Replit',
    mark: 'RP',
    category: 'Cloud agent',
    officialUrl: 'https://replit.com',
    pricingUrl: 'https://replit.com/pricing',
    summary: "The AI agent built into Replit's browser-based cloud IDE, billed via 'effort-based' checkpoints that scale with the compute actually used rather than flat per-message fees.",
    contextWindow: { model: 'Claude Sonnet 5', tokens: 1000000, display: '1M tokens', note: 'Replit doesn’t publish this itself — it follows Anthropic’s own spec for whichever model the “Auto” router picks.' },
    headlinePlanIndex: 0,
    hasFreeTier: true,
    freeTier: 'Starter — free daily Agent credits (exact amount undisclosed) resetting every 24 hours, 1 published app (expires after 30 days), “Lite” build mode only.',
    plans: [
      { name: 'Core', priceMonthly: 25, priceYearly: 20, limit: '$20–25/mo in credits (matches plan price), consumed per-checkpoint under effort-based pricing. 2 parallel agents. Replit’s Feb 2026 launch post for this plan cited “up to 5 collaborators,” but the live pricing page no longer states a collaborator count for Core — treat that figure as unconfirmed.', target: 'Solo builders, small teams', notes: '' },
      { name: 'Pro', priceMonthly: 100, priceYearly: 95, limit: '$100/mo in credits. Up to 15 collaborators, 10 parallel agents, Premium Support, up to 50 invited viewers, 28-day database rollback. Replit’s launch post also described a 1-month credit rollover and a “Turbo Mode” feature; neither term appears on the live pricing page anymore, so we can’t confirm either is still current.', target: 'Teams and power users', notes: "Replaced the old 'Teams' plan in Feb 2026." },
      { name: 'Enterprise', priceMonthly: null, priceYearly: null, limit: 'Custom negotiated credit allotment.', target: 'Large orgs needing governance/SSO', notes: '' },
    ],
    changes: [
      { date: '2026-02-24', type: 'up', title: 'New Pro plan replaces Teams', description: "Discontinued the separate Teams plan for a new $100/mo Pro plan with 1-month credit rollover and up to 15 collaborators; Core's annual price dropped to $20/mo with 5 collaborators built in.", sourceUrl: 'https://replit.com/blog/pro-plan' },
      { date: '2025-06-18', type: 'neutral', title: 'Switched to effort-based billing', description: "Replaced flat $0.25-per-checkpoint billing with effort-based pricing, where each checkpoint's cost scales with the actual compute the Agent used.", sourceUrl: 'https://replit.com/blog/effort-based-pricing-recap' },
    ],
    sources: [
      { title: 'Replit Pricing', url: 'https://replit.com/pricing' },
      { title: 'Replit Pro Is Here', url: 'https://replit.com/blog/pro-plan' },
      { title: 'Replit Core plan docs', url: 'https://docs.replit.com/billing/plans/replit-core' },
    ],
  },

  {
    slug: 'cline',
    name: 'Cline',
    vendor: 'Cline Bot Inc.',
    mark: 'CL',
    category: 'IDE plugin',
    officialUrl: 'https://cline.bot',
    pricingUrl: 'https://cline.bot/pricing',
    summary: "A free, open-source (Apache-2.0) VS Code/CLI agent that's bring-your-own-API-key by default — added its first direct paid product, a discounted open-weight-model subscription, in June 2026.",
    contextWindow: { model: 'Claude Sonnet 4.6 (BYOK)', tokens: 1000000, display: '1M tokens', note: 'Cline has no fixed model — you bring your own key. This is the window for the model its docs recommend for “best coding performance”; Claude Sonnet 5 is fully supported at the same 1M window.' },
    headlinePlanIndex: 0,
    hasFreeTier: true,
    freeTier: 'Open Source — free forever, no usage cap from Cline itself. Bring your own API key (Anthropic/OpenAI/OpenRouter/Bedrock/Vertex/Azure) and pay that provider directly at cost, no Cline markup.',
    plans: [
      { name: 'ClinePass', priceMonthly: 9.99, priceYearly: null, limit: 'Flat $9.99/mo for curated, discounted access to 11–14 open-weight coding models (GLM, Kimi, DeepSeek, MiniMax, Qwen) without separate provider accounts. Usage tracked against undisclosed 5-hour/weekly/monthly rolling caps, described as “2–5× standard API rate limits.”', target: 'Users wanting cheap curated model access without juggling API keys', notes: 'Moved off the main pricing page onto its own landing page (cline.bot/cline-pass) with introductory pricing sometimes shown ($4.99 first month, occasionally $1.99 on campaign links) — $9.99/mo is the standing rate.' },
      { name: 'Enterprise', priceMonthly: null, priceYearly: null, limit: 'Custom, contact sales. Adds SSO/SCIM, RBAC, audit logs, VPC/on-prem/air-gapped deployment.', target: 'Orgs needing compliance features', notes: '' },
    ],
    changes: [
      { date: '2026-08-23', type: 'down', title: 'Teams tier removed from pricing page', description: 'The self-serve Teams tier ("free for 10 users, then $20/user/month," introduced Oct 2025) no longer appears on the live pricing page, which now shows only Open Source and Enterprise. No official removal announcement found — noting the date we confirmed it gone, not necessarily when it happened.', sourceUrl: 'https://cline.bot/pricing' },
      { date: '2026-06-29', type: 'neutral', title: 'Launched ClinePass', description: "Cline's first-ever direct paid subscription ($9.99/mo) for curated, discounted open-weight-model access — layered on top of the still-free, still-BYOK core product.", sourceUrl: 'https://cline.ghost.io/clinepass-best-of-value-for-open-weight-models/' },
      { date: '2025-10-20', type: 'neutral', title: 'First paid organizational tiers', description: 'Introduced Teams and Enterprise tiers after previously having no paid tier of any kind beyond BYOK inference costs.', sourceUrl: 'https://cline.ghost.io/introducing-cline-for-enterprise/' },
    ],
    sources: [
      { title: 'Cline Pricing', url: 'https://cline.bot/pricing' },
      { title: 'ClinePass docs', url: 'https://docs.cline.bot/getting-started/clinepass' },
    ],
  },

  {
    slug: 'zed',
    name: 'Zed',
    vendor: 'Zed Industries',
    mark: 'ZD',
    category: 'Editor',
    officialUrl: 'https://zed.dev',
    pricingUrl: 'https://zed.dev/pricing',
    summary: 'A Rust-based, GPU-accelerated code editor built from scratch (not a VS Code fork) by the creators of Atom and Xi, with built-in AI agent features on a token-credit model since a September 2025 pricing overhaul.',
    contextWindow: { model: 'Claude Fable 5', tokens: 1000000, display: '1M tokens', note: 'Zed’s top-tier hosted model (Pro/Business only). Zed has no single fixed default — the Agent Panel’s model picker resolves per account.' },
    headlinePlanIndex: 0,
    hasFreeTier: true,
    freeTier: 'Personal — free forever. 2,000 accepted edit predictions (no stated reset window). AI chat/agent features require your own API keys or an external agent (Claude Agent, Codex CLI); no Zed-hosted credit included.',
    plans: [
      { name: 'Pro', priceMonthly: 10, priceYearly: null, limit: 'Unlimited edit predictions. $5/mo of Zed-hosted LLM credit, resetting monthly. Overage billed at API list price + 10%, capped at $10/mo by default (user-adjustable, can be set to $0).', target: 'Individual devs wanting Zed-hosted models without managing API keys', notes: 'No annual discount published.' },
      { name: 'Business', priceMonthly: 30, priceYearly: null, limit: 'Unlimited edit predictions org-wide. No fixed included credit per seat — billed at API list price + 10% or BYOK, with admin-configurable org-wide spend limits.', target: 'Teams needing admin controls and governance', notes: 'Self-serve, no minimum seats; invoice billing available at 25+ seats.' },
    ],
    changes: [
      { date: '2025-09-24', type: 'neutral', title: 'Moved from flat prompt limits to metered billing', description: "Overhauled pricing from flat prompt-count limits to token-based billing. Pro dropped from $20/mo (500 prompts/month) to $10/mo, but the flat allowance was replaced with only $5/mo of included credit plus usage-based overage at API list price + 10%.", sourceUrl: 'https://zed.dev/blog/pricing-change-llm-usage-is-now-token-based' },
    ],
    sources: [
      { title: 'Zed Pricing', url: 'https://zed.dev/pricing' },
      { title: 'Zed Docs — Plans & Pricing', url: 'https://zed.dev/docs/account/plans-and-pricing' },
    ],
  },

  {
    slug: 'warp',
    name: 'Warp',
    vendor: 'Warp Terminal Inc.',
    mark: 'WP',
    category: 'Terminal agent',
    officialUrl: 'https://www.warp.dev',
    pricingUrl: 'https://www.warp.dev/pricing',
    summary: "An AI-native terminal that open-sourced its client (AGPL-3.0 / MIT) in April 2026 while keeping its Oz cloud-agent orchestration platform proprietary, priced on a credit-metered model.",
    contextWindow: { model: 'Claude Sonnet 5', tokens: 1000000, display: '1M tokens', note: 'Reached via Warp’s default “Auto (Responsive)” routing mode, which dynamically selects among Claude/GPT/Gemini/Grok/open-weight models.' },
    headlinePlanIndex: 0,
    hasFreeTier: true,
    freeTier: 'Free — pay-as-you-go/BYOK only. Warp’s own pricing FAQ states the Free plan "doesn’t include bundled AI usage for the Warp Agent"; you bring your own API key or pay per-request at provider rates. No onboarding credit grant found on the live pricing page.',
    plans: [
      { name: 'Build', priceMonthly: 20, priceYearly: 18, limit: '1,500 AI credits/month (~$20 of usage at API rates), refilling every 30 days; unused monthly credits don’t roll over, but purchased “Reload” credits roll over up to 12 months.', target: 'Individual professional developers', notes: 'Consolidated three legacy tiers (Pro/Turbo/Lightspeed) into this one plan in late 2025.' },
      { name: 'Business', priceMonthly: 50, priceYearly: 45, limit: '1,500 AI credits per seat/month, same refill cadence as Build, plus a shared rollover pool of purchased reload credits.', target: 'Teams up to 25 seats', notes: 'Per user/month; adds SAML SSO, admin data controls, BYOK.' },
      { name: 'Max', priceMonthly: 200, priceYearly: 180, limit: '18,000 AI credits/month — 12× Build’s allotment, same refill cycle.', target: 'Power users / heavy individual AI usage', notes: '' },
    ],
    changes: [
      { date: '2026-08-23', type: 'down', title: 'Free tier’s onboarding credit grant no longer listed', description: 'The live pricing page and pricing FAQ no longer mention a 150-then-75 monthly credit allowance for Free users; Free is now described as BYOK/pay-as-you-go only. No dated changelog entry found for when this changed — noting the date we confirmed it.', sourceUrl: 'https://www.warp.dev/pricing' },
      { date: '2025-10-30', type: 'down', title: 'Legacy tiers collapsed into one $20/mo plan', description: 'Collapsed three legacy paid tiers (Pro, Turbo, Lightspeed) into a single $20/mo Build plan; independent analysis characterized this as a net price increase for many existing $10–15/mo subscribers, even though per-unit overage pricing improved and BYOK access was added.', sourceUrl: 'https://blog.kilo.ai/p/warps-new-pricing-still-doesnt-add' },
      { date: '2026-05-20', type: 'up', title: 'BYOK extended to Free tier', description: 'Bring-your-own-API-key support was extended to all plans including Free.', sourceUrl: 'https://www.warp.dev/blog/bring-your-own-inference-to-warp' },
    ],
    sources: [
      { title: 'Warp Pricing', url: 'https://www.warp.dev/pricing' },
      { title: "Changes to Warp's pricing", url: 'https://www.warp.dev/blog/warp-new-pricing-flexibility-byok' },
    ],
  },
];

// Every tool must appear in at least one pair here — toolPage() only links to
// comparisons listed in this array, so an omitted tool gets zero (not 404)
// compare links instead of dead ones.
const comparisons = [
  ['claude-code', 'cursor'],
  ['claude-code', 'github-copilot'],
  ['cursor', 'github-copilot'],
  ['claude-code', 'windsurf'],
  ['github-copilot', 'windsurf'],
  ['claude-code', 'openai-codex'],
  ['github-copilot', 'openai-codex'],
  ['github-copilot', 'jetbrains-ai'],
  ['github-copilot', 'amazon-q-developer'],
  ['claude-code', 'jetbrains-ai'],
  ['claude-code', 'amazon-q-developer'],
  ['claude-code', 'gemini-cli'],
  ['github-copilot', 'gemini-cli'],
  ['claude-code', 'kiro'],
  ['github-copilot', 'kiro'],
  ['amazon-q-developer', 'kiro'],
  ['claude-code', 'replit-agent'],
  ['github-copilot', 'replit-agent'],
  ['claude-code', 'cline'],
  ['github-copilot', 'cline'],
  ['cursor', 'zed'],
  ['github-copilot', 'zed'],
  ['claude-code', 'warp'],
  ['windsurf', 'warp'],
];

// Model-level leaderboard data — distinct from `tools` above, which are the
// wrapped products. These are the underlying LLMs. Populated 2026-08-20 from
// a research pass that deliberately did NOT blend sources into one fake
// composite rank — see leaderboardPage()'s framing. "usedBy" is computed at
// build time from each tool's own contextWindow.model field (single source
// of truth), not hand-maintained here.
const arenaSource = {
  name: 'Arena.ai Code/WebDev',
  url: 'https://arena.ai/leaderboard/code/webdev',
  asOf: '2026-08-19',
  votes: '596,892',
  note: 'Human-preference votes on generated web apps — not a correctness benchmark. The only source in this pass that is both live and covers every model below.',
};

const models = [
  { name: 'Claude Opus 5', vendor: 'Anthropic', arenaElo: 1690.9, arenaRank: 1, vendorClaimedSWEBench: '~96–97% (Anthropic’s own figure, not independently verified)', contextWindowTokens: 1000000, openRouter: { inputPerM: 5.0, outputPerM: 25.0 } },
  { name: 'Kimi K3', vendor: 'Moonshot AI', arenaElo: 1674.0, arenaRank: 2, vendorClaimedSWEBench: 'Disputed — sources range 76.8%–93.4%, no figure we’d call reliable', contextWindowTokens: null, openRouter: null },
  { name: 'Claude Fable 5', vendor: 'Anthropic', arenaElo: 1625.9, arenaRank: 6, vendorClaimedSWEBench: null, contextWindowTokens: 1000000, openRouter: null },
  { name: 'GPT-5.6 Sol', vendor: 'OpenAI', arenaElo: 1619.1, arenaRank: 7, vendorClaimedSWEBench: '~96.2% (secondary source, low confidence)', contextWindowTokens: 1050000, openRouter: { inputPerM: 2.5, outputPerM: 15.0 } },
  { name: 'Claude Sonnet 5', vendor: 'Anthropic', arenaElo: 1539.6, arenaRank: 18, vendorClaimedSWEBench: '~82.1% (press-reported, low confidence)', contextWindowTokens: 1000000, openRouter: { inputPerM: 2.0, outputPerM: 10.0 } },
  { name: 'GPT-5.6 Terra', vendor: 'OpenAI', arenaElo: 1519.9, arenaRank: 26, vendorClaimedSWEBench: null, contextWindowTokens: 1050000, openRouter: { inputPerM: 2.0, outputPerM: 12.0 } },
  { name: 'GPT-5.6 Luna', vendor: 'OpenAI', arenaElo: 1516.6, arenaRank: 29, vendorClaimedSWEBench: null, contextWindowTokens: 1050000, openRouter: { inputPerM: 0.2, outputPerM: 1.2 } },
  { name: 'Gemini 3.1 Pro', vendor: 'Google', arenaElo: 1446.5, arenaRank: 47, vendorClaimedSWEBench: null, contextWindowTokens: 1048576, openRouter: { inputPerM: 2.0, outputPerM: 12.0 } },
  { name: 'GPT-5.3-Codex', vendor: 'OpenAI', arenaElo: 1408.5, arenaRank: 60, vendorClaimedSWEBench: null, contextWindowTokens: 400000, openRouter: null },
];

// Real usage/popularity data — reported per-source rather than blended into
// one composite ranking, because the underlying sources measure different
// things (dev IDE used vs. work-tool used vs. extension installed) and
// disagree on order. See leaderboardFeasibility note: forcing a single score
// here would misrepresent how solid the evidence actually is.
const popularitySources = [
  {
    name: 'Stack Overflow 2025 Developer Survey',
    url: 'https://survey.stackoverflow.co/2025/ai',
    asOf: '2025 · ~49,000 respondents',
    metric: '% of respondents using this as their dev IDE',
    rows: [['Cursor', '17.9%'], ['Claude Code', '9.7%'], ['Zed', '7.3%'], ['Devin Desktop (as “Windsurf”)', '4.9%']],
    note: 'GitHub Copilot and JetBrains AI Assistant are plugins, not standalone IDEs, so this specific chart doesn’t include them.',
  },
  {
    name: 'JetBrains AI Pulse Survey',
    url: 'https://blog.jetbrains.com/research/2026/04/which-ai-coding-tools-do-developers-actually-use-at-work/',
    asOf: 'Jan 2026 · ~10,000 professional devs',
    metric: '% using this tool at work',
    rows: [['GitHub Copilot', '29%'], ['Cursor', '18%'], ['Claude Code', '18%'], ['JetBrains AI Assistant', '9%'], ['OpenAI Codex', '3%']],
    note: 'Claude Code grew 6× in 9 months (3%→18%) with the survey’s best loyalty scores (91% CSAT, NPS 54); Copilot’s growth “plateaued” over the same period.',
  },
  {
    name: 'VS Code Marketplace installs',
    url: 'https://marketplace.visualstudio.com',
    asOf: 'Aug 20, 2026 · live fetch',
    metric: 'Cumulative all-time installs (not active users)',
    rows: [['GitHub Copilot Chat', '77.7M'], ['GitHub Copilot', '74.4M'], ['Claude Code', '23.6M'], ['Gemini Code Assist', '5.1M'], ['Cline', '5.0M'], ['Devin Desktop (legacy “Codeium” listing)', '4.0M'], ['Amazon Q Developer', '1.8M']],
    note: 'Cursor, Devin Desktop’s current app, Zed, Warp, and Kiro aren’t VS Code extensions (they’re standalone apps/forks), so they have no comparable count here.',
  },
];

module.exports = { SITE, tools, comparisons, arenaSource, models, popularitySources };
