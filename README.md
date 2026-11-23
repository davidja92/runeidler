# Runic Idle

A standalone RunicWorld-inspired idle RPG with 23 skills, gathering and production chains, a planned action queue, offline progression, combat and optional shared friend highscores.

## This update

- Mine **pure essence**, craft 15 rune types, and spend them on **20 combat spells**. Magic pauses if required runes are missing. Runes cannot be bought from the shop.
- **18 fish types** with a longer level progression and cooking counterparts.
- Expanded leatherworking, gems, jewellery, farming, baking, herbs, potions, weapons and armour.
- Traditional monster progression with **36 enemies**. Chickens drop feathers; cows drop hides; giants and dragons supply bones.
- Activity mastery at 100, 500 and 2,000 completions, with speed bonuses; rare resource discoveries and openable caches.
- **17 journal goals**, higher-tier tools, consumable attack boosts and separate body armour.
- Friend codes, followers, side-by-side skill comparisons, overall/per-skill ranks, and automatic profile syncing through a shared backend.

## Running and publishing

Read **[GITHUB-SETUP.md](GITHUB-SETUP.md)** for GitHub Pages, the Cloudflare Worker/D1 setup and adding friends. The downloadable repository's `docs/` folder is ready for Pages. Static-only play works without a backend; shared rankings need the included API.

To run the full project locally with Node 24+: `node scripts/build-worker.mjs`, then `node scripts/dev.mjs`. The development social database lives in ignored `.local/`. Open `http://127.0.0.1:8742`.

## Playing

Use **Start** to repeat one activity, or **+ Queue** to plan a number of actions. **Run queue** begins the plan. Gather ingredients before crafting; missing supplies pause progression. **Loop** repeats the plan. Magic's guide can queue a starter essence/air/mind supply chain.

Bank items can be sold, equipped, opened or consumed where appropriate. Cooked food is used in combat. The preview lists expected food and runes per fight. Body armour and weapon/focus slots are separate. Unsafe combat stops rather than running on negative supplies. Health regenerates outside active combat.

Progress saves in the browser. Up to eight hours of offline activity is simulated on return. Export/import game-save backups from the menu. Different origins/browsers have separate local saves. Existing version-1 saves retain IDs and gain safe defaults for new fields.

## Friends and ranks

Open Social, opt into a shared profile, exchange RI- friend codes, then compare Friends & me or all published profiles. Overall ranks use total level, then total XP; individual skill ranks use XP. Ranks are **casual/self-reported** because local saves remain editable. Account ownership and valid data bounds are checked; XP provenance is not verified.

The hosted Sites copy uses ChatGPT identity and retains its existing private access policy. Friend codes do not invite people to a private site. The portable Worker supports browser owner keys for GitHub Pages deployments. No identity/email is published; competition profiles contain the chosen name, XP, kill count and companion count.

## Source layout

- `dist/data.js`: original skill/activity/economy data and factual client-XP references.
- `dist/content.js`: expansion items, spells, runes, fish, crafts and goals.
- `dist/engine.js`: shared deterministic progression and save validation.
- `dist/app.js`, `style.css`, `forest.svg`: game UI and original artwork.
- `dist/social.js`, `config.js`: shared profile/friends/ranking UI and API configuration.
- `server/api.mjs`: authenticated social API, ownership checks, friends and rankings.
- `drizzle/`: schema-only SQL migration and journal for the social database.
- `scripts/build-worker.mjs`: dependency-free bundle with embedded game assets.
- `scripts/dev.mjs`: loopback-only development server with local SQLite.
- `wrangler.toml`: standalone Worker/D1 deployment template.
- `tests/`: progression, expansion and multi-player API checks.

The source retains `.openai/hosting.json` for the existing private Sites project. Standalone Cloudflare deployment uses `wrangler.toml` instead. Generated Workers, local databases, dependencies and secrets are excluded from Git.

Selected original XP values reference locally extracted RunicWorld data. New recipes, timing, economy, mastery, farming cycles, spells, loot and combat are prototype balance, not a reproduction of the original private server's undisclosed mechanics. All artwork is original SVG. There is no live chat, trading between players or synchronized multiplayer combat.
