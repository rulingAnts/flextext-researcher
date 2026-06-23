# Flextext Researcher — repo guide for Claude / LLMs

This repo ships the **Flextext Researcher** PWA (<https://rulingants.github.io/flextext-researcher/>):
the **researcher console** — set up and manage coworkers' devices, mint invite
links, approve installs, push tasks/settings, and review decrypted inventory. It is
the researcher's own tool (not a field-worker app). It is a **thin companion** to the
**Flextext Editor**, which is the **main project** — a separate, independent Git repo
at `rulingAnts/flextext-editor` (local: `/Users/Seth/GIT/flextext editor/`).

## The one thing to understand: this is a SHELL, not a fork

`index.html` here is a thin shell. It loads the **editor's engine** cross-path over
the same GitHub Pages origin — `/flextext-editor/js/app.js` +
`/flextext-editor/css/app.css` — and sets `window.__MODE='researcher'` so that
shared engine boots straight into the researcher panel (`setupResearcherMode`).

**⇒ All researcher / connectivity / panel logic lives in the EDITOR repo, not
here.** To change behavior, edit the editor repo's `js/` (mainly `researcher.js`,
`researcher-panel.js`, and the `RESEARCHER_MODE` branch in `app.js`). Do **not**
copy engine code into this repo. This repo holds ONLY:

- `index.html` — the shell (sets `window.__MODE='researcher'`; carries
  `#view-researcher`, `#toast`, and the install/webkit banners)
- `researcher.webmanifest` — manifest with a distinct `id`/`scope` so it installs
  as its own app, separate from the editor and recorder
- `sw.js` — its own service worker (a SW can't reach above its own folder on
  GitHub Pages, so each app serves its own)
- `icons/` — the researcher's app icons (a recolored editor mark, teal `#0f766e`)

## Why a separate repo (don't merge it into the editor)

Two PWAs on one origin must have **non-overlapping scopes** or the browser treats
them as one app (installing one makes the other report "already installed"). The
editor owns `/flextext-editor/` (root scope); the recorder owns `/text-recorder/`;
this console lives at the disjoint sibling path `/flextext-researcher/`. A separate
repo keeps the editor at `/flextext-editor/` **untouched** — relocating the editor
would change its PWA `id` and **orphan every installed copy in the field**.

## ⚠ VERSION COUPLING

`sw.js` here **precaches the editor's engine files by path** (`/flextext-editor/js/*.js`,
`css/app.css`). Those files have their own lifecycle in the editor repo.
**Whenever the editor engine changes in a way this app should pick up, bump
`VERSION` in `sw.js` here** — otherwise installed copies keep serving a **stale
cached engine** offline.

### ⚠ Also keep the SHELL precache list in sync with `app.js`'s import graph
Bumping `VERSION` is **not enough on its own**. The editor's `js/app.js` is loaded
here as a `type="module"`, so the browser resolves **every static `import` at the
top of `app.js` at load time** — even though the researcher panel uses only part of
the graph. So whenever `app.js` gains/loses a top-level `import`, the `SHELL` array
in `sw.js` must be updated to match, or an updated app that then goes **offline
mid-load** throws on the missing import and is **dead offline**. Keep the
`/flextext-editor/...` block here byte-identical to the editor's `sw.js` SHELL.

## ⚠ DEPLOY ORDER — editor first, always

GitHub Pages serves this repo's root at <https://rulingants.github.io/flextext-researcher/>.
When a change spans both repos:

1. Deploy the **editor's `productionWeb` FIRST**; confirm `/flextext-editor/` is live.
2. **Then** bump this `sw.js` `VERSION` (if not already) and `git push` this repo.

Reason: this SW precaches whatever editor engine is live **at install time**.
Pushing this repo first would cache the OLD editor engine. (Same rule the recorder
follows; the three apps share one engine.)

## Auth / OAuth note

Sign-in is Google (OIDC), handled by the shared engine + the `flextext-r2-worker`
Cloudflare Worker. The worker allow-lists the **origin** `rulingants.github.io`
for the OAuth return, so this app's `…/flextext-researcher/` return path already
works with no worker change. The session token is stored per the "stay signed in"
choice (sessionStorage by default = lock-on-exit; localStorage when opted in).

## Branches / deploy

Single `main` branch, deployed straight to Pages (root) — no dev/prod split like
the editor, so this repo is effectively always "production." Test engine changes on
the **editor** repo's dev server first (`?mode=researcher` on localhost boots this
same panel); this shell itself rarely changes. Per the editor's release rule, do
not push without the maintainer's OK.
