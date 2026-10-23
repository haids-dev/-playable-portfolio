# Playables

A simple public gallery of playable ads. Pick a game, play it in the browser, and use the game's original store CTA.

## What is included

- One original AppLovin HTML per creative. The importer compares the HTML shell and every decompressed ZIP entry, ignoring only recognized store URLs and ZIP metadata. Binary assets must match exactly. It retains the newest representative, and keeps distinct gameplay separate. Explicit owner-confirmed revision groups live in `scripts/gallery-groups.json`.
- Search, a collection filter, gameplay thumbnails, and a full-screen game page.
- Original game files under `public/games/`. Importing copies their bytes without editing, reformatting, or injecting scripts.
- A host-side CTA bridge in `public/play.js` temporarily supplies the missing MRAID API during the game's existing `bingoPlayableApiDemo` call. The host navigates to the original store URL; startup and an existing native MRAID implementation are preserved.

## Local use

```sh
npm ci
npm start
```

Open the Local URL printed by the server. The default is `http://127.0.0.1:4173`.

## Update the gallery

```sh
npm run inventory
npm run import
```

The importer scans `D:/Cocos` by default. Set `PLAYABLE_SOURCE_ROOT` to scan a different location. Absolute source paths and inventory reports stay in ignored `.local/`; the public catalog only includes game metadata and original filenames.

The ignored `.local/deduplication.json` records which sources were grouped and their store links. Original source projects are never edited or removed. Old gallery links resolve to the retained representative. Run `node scripts/prune-generated.mjs` after importing to remove verified obsolete generated copies from this gallery.

Capture a gameplay thumbnail at the path specified by each catalog entry. `play.html?capture=1&id=<catalog-id>` displays the unchanged game without the gallery header. Run `node scripts/process-thumbnails.mjs` to resize captured images and generate local contact sheets.

Before publishing:

```sh
npm run check
npm run build
```

The check verifies catalog consistency, duplicate prevention, thumbnail presence, the Cloudflare per-file limit, and SHA-256 integrity for every original HTML. When the local inventory is available, it also compares each copied build with its source file.

## Cloudflare

This is a static-assets-only Cloudflare Workers project. No database or application backend is required.

```sh
node scripts/cloudflare.mjs login
npm run deploy
```

`scripts/cloudflare.mjs` uses Wrangler's saved login when the environment contains a malformed placeholder `CLOUDFLARE_API_TOKEN`. It does not change the machine's environment or store tokens in this repo. CI can supply a valid token through its secret settings.

To deploy automatically from GitHub, connect this repository in Cloudflare Workers Builds. Use `npm run build` as the build command and `npx wrangler deploy` as the deploy command. No credentials belong in the repository.

For a new revision, import it as a new immutable build instead of overwriting an existing game's HTML. Its content hash keeps the URL and cached file distinct.
