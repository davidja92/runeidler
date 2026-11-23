# Put Runic Idle in your GitHub repository

The repository download includes the complete game, backend, tests, and a `docs/` copy ready for GitHub Pages. Existing local saves still import through the game menu.

## Play on GitHub Pages

1. Extract the repository ZIP and upload its contents to your repository.
2. Open the repository's **Settings → Pages**.
3. Choose **Deploy from a branch**, select `main`, and choose **`/docs`**.
4. Save and wait for Pages to publish. Open the URL shown there.

GitHub Pages supports a branch's root or `docs` folder as the publishing source. [GitHub's publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

All single-player features work as static files: 23 skills, pure-essence mining, crafted runes, 20 combat spells, 18 fish, crafting, queues, offline progress, 36 monsters, bank, loot, mastery and journal rewards. **Shared friends/rankings require the backend below.** Pages alone cannot run it.

## Enable shared friends and highscores

The included backend is a Cloudflare Worker using D1. It stores competition profiles and follows, not private bank contents or full game saves. On the standalone backend, each browser has a private owner key; the hosted Sites copy instead uses ChatGPT sign-in.

With Node.js 24 or newer installed, run these commands from the repository root:

```sh
npm init -y
npm install --save-dev wrangler
npx wrangler login
npx wrangler d1 create runic-idle-social
```

Copy the returned database ID into `wrangler.toml`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`. Set `ALLOWED_ORIGINS` to your Pages **origin**, such as `https://davidja92.github.io` (no repository path). Keep `AUTH_MODE = "device"` for this standalone configuration.

```sh
node scripts/build-worker.mjs
npx wrangler d1 migrations apply runic-idle-social --remote
npx wrangler deploy
```

Cloudflare provisions D1 with `d1 create` and applies the SQL files configured by `migrations_dir`. Review the migration confirmation before applying it. [Cloudflare D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/) and [migration documentation](https://developers.cloudflare.com/d1/reference/migrations/).

Edit **`docs/config.js`** to point to the Worker URL returned by deployment:

```js
window.IDLE_CONFIG = {
  API_BASE_URL: 'https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev',
  AUTH_MODE: 'device'
};
```

Commit that file and let Pages update. The social API is now shared between players. Alternatively, use the Worker URL for the entire game: it serves both the game and API together, with its configuration generated automatically.

The separately hosted private Sites URL is not a drop-in cross-origin backend for Pages: its ChatGPT access gate is a different authentication path. Use the standalone Worker configuration for Pages.

## Add friends in game

1. Open **Social** and click **Create my profile & friend code**.
2. Send a friend your game URL and your **RI-** code. They create their own profile and send their code back.
3. Enter their code under **Add a friend's code**. They can add your code to follow you back.
4. Select **Friends & me** or **All published profiles**, then **Overall** or a skill. Rank is within the selected group; Overall sorts total level, then total XP.
5. Use **Compare** for a side-by-side skill view. Published progress syncs every minute while the game is open, or manually with **Sync progress**. Offline gains publish on your next sync.

Friend codes do not grant access to a private hosted site. If using the private Sites copy, the owner must grant site access separately. On standalone Pages/Workers, send friends the published URL.

## Competition and privacy

These are **casual, self-reported rankings**, not cheat-resistant ranks. The game save can be edited/imported. The API validates data, account ownership and bounds, but does not certify how XP was earned. A verified season would need server-owned game simulation and a fresh save policy.

Only publish a profile when ready: its name, skill XP, kills and companions are visible to other users of that backend. You can remove it from Social without deleting your local save. Device-mode owner keys stay in browser storage; keep your private backup to retain profile ownership when changing browsers. Do not commit private key backups, browser saves, `.local/`, or local database files to GitHub.

## Local development

```sh
node scripts/build-worker.mjs
node scripts/dev.mjs
```

Open `http://127.0.0.1:8742`. This runs the complete game with a **local-only** SQLite social database. It is separate from production. For static-only testing, serve `docs/` with `python -m http.server 8742`; shared features then use the API configured in `docs/config.js`.

Tests:

```sh
node tests/engine.test.cjs
node tests/expansion.test.cjs
node tests/social.test.mjs
```
