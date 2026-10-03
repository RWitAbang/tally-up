---
doc: spec
status: approved
---

# Tally Up — Technical Spec

## How This Works, In Plain Language

Tally Up is a website, not an installed app — you open it in your phone's (or laptop's, or iPad's) browser, and it looks and behaves the same on all three because they're all just visiting the same URL.

There's no custom backend server written for this project. Instead, all your accounts and transactions live in **Supabase** — a hosted database (built on Postgres, a very standard, widely-used type of database). Think of Supabase as two spreadsheet tabs sitting in the cloud instead of on your laptop: an `accounts` tab and a `transactions` tab. Every page of the website — Dashboard, Account Detail, the transaction form — talks to Supabase directly to read or write rows, the same way you'd open a spreadsheet tab, read some rows, or add a new one.

Because nobody but you should see this data, you sign in once per device with a single email/password account (just yours — there's no public sign-up). Supabase checks every request against that login before allowing it through; without signing in, the database simply refuses to hand over any data, no matter what URL someone finds.

The website's files (the HTML pages, the styling, the JavaScript that talks to Supabase) are hosted on **Netlify**, which is what gives you one shareable URL that works identically from any device.

Nowhere in this app is there a framework like React or a build step — every page is plain HTML, CSS, and JavaScript, so you can open any file and read it start to finish.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`.

1. **You open the URL** on your phone. `index.html` first checks: is there a valid Supabase sign-in session for this browser? If not, you're sent to `sign-in.html`.
2. **You sign in** with your one email/password account. Supabase hands back a session, which its client library stores in the browser automatically — that's what lets you stay signed in on that device afterward.
3. **`index.html` checks Supabase:** any rows in `accounts` yet? If none, you're sent to `setup.html` (`prd.md > Account Setup`).
4. **You fill in one account's details and save** → an `insert` into the `accounts` table. "Add another?" loops you back through the same form until you decline, then you land on `dashboard.html`.
5. **Every later visit**, once signed in and with accounts already created, `index.html` sends you straight to `dashboard.html` — no setup repeated (`prd.md > Every later visit`).
6. **Dashboard loads** (`prd.md > Dashboard`) → it asks Supabase for every account and every transaction, adds them up in the browser (grouped first by currency, then by Personal/Business), and renders the totals plus each account row.
7. **You tap "Add Transaction"** → `transaction.html`, pick the account, choose expense/inflow, confirm or edit the date, add a description and amount, submit → an `insert` into `transactions`. You're sent back to the Dashboard, which re-fetches and shows the updated totals immediately (`prd.md > Logging a transaction`).
8. **You tap an account row** → `account.html?id=...` (`prd.md > Viewing an account`) → fetches that one account and its transactions, computes its current balance fresh (starting balance + its transactions added up — not a stored number that gets nudged on every change), and shows the history newest-first.
9. **You tap a transaction** in that history → `transaction.html`, pre-filled, with Edit and Delete available (`prd.md > Fixing a mistake`). Save → `update`; Delete → `delete`. Either way, the next balance calculation just reflects whatever rows remain — there's no separate balance number that could drift out of sync.
10. **You tap "Edit" on an account** (from `account.html`) → `setup.html?account=...`, the same form as Account Setup but pre-filled and in single-edit mode (no "add another?" loop) → `update` on that row in `accounts` (`prd.md > Account Setup > Account details can be edited`).
11. **You tap "Export to Excel"** on the Dashboard, any time → fetches every account and transaction, builds a workbook in the browser (one sheet per account) using SheetJS, and triggers a file download — no server involved (`prd.md > Export to Excel`).

## Stack

- **HTML, CSS, vanilla JavaScript** — no framework, no build step. Chosen because it builds directly on the HTML the learner already knows, keeps every file readable top-to-bottom, and avoids introducing an unfamiliar framework for a proof of concept. Tradeoff accepted: a little more manual DOM work than a framework would give, which is fine at this app's size (a handful of pages, no complex shared UI state beyond what's described above).
- **Supabase** (hosted Postgres database + built-in Auth) — [supabase-js docs](https://supabase.com/docs/reference/javascript/introduction), client library version `2.117.2` loaded via CDN (`https://esm.sh/@supabase/supabase-js@2.117.2`). Chosen over writing and hosting a custom backend because it needs no server for the learner to run or maintain; chosen over Firebase because its table/row model maps directly onto the learner's existing mental model (an Excel sheet per account). *Verify early in the build:* confirm the pinned version still resolves on esm.sh, since npm packages update frequently — if `2.117.2` 404s, drop the version pin to get latest.
- **Supabase Auth** (same project, no separate service) — [docs](https://supabase.com/docs/guides/auth) — email + password, exactly one account, created directly in the Supabase dashboard rather than through a public sign-up page.
- **Netlify** — [docs](https://docs.netlify.com/) — static hosting, connected to the project's GitHub repo so every `git push` auto-deploys (ties directly into the Git/GitHub learning goal). Chosen over Vercel only because the learner already has a Netlify account — functionally equivalent for this project.
- **Google Fonts** — [Fredoka](https://fonts.google.com/specimen/Fredoka) for headings/buttons, [Nunito](https://fonts.google.com/specimen/Nunito) for body text and transaction amounts (rounded and friendly, but clear enough for numbers). Loaded via `<link>` tag, no build step.
- **Phosphor Icons** — [docs](https://github.com/phosphor-icons/web) — "fill" style for a colorful, playful look rather than generic thin-line icons. Loaded via CDN: `https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.2/src/fill/style.css` (note: `unpkg.com` stopped reliably serving this package — use jsDelivr).
- **SheetJS (`xlsx`)** — [docs](https://docs.sheetjs.com/docs/getting-started/installation/standalone/) — generates a real `.xlsx` workbook entirely in the browser, no server needed. Loaded via CDN: `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js` (verified current version, Oct 2026). Chosen because it's the standard, well-documented library for exactly this, and needs nothing beyond a script tag.

## Where It Runs and How Someone Tries It

- **Runtime:** any modern mobile or desktop browser. No install.
- **Environment needed to build/run:** a free Supabase project (its Project URL and anon public key, placed in `js/supabase-client.js`) and a free Netlify account (already have one) connected to this project's GitHub repo.
- **Deployment is required here, not optional** — it's what lets the same app open identically from phone, laptop, and iPad. Deploy steps: push the repo to GitHub → connect the repo in Netlify → Netlify auto-builds and serves it (no build command needed, it's static files) → Netlify gives a `*.netlify.app` URL.
- **Demo recording:** open the deployed Netlify URL, show signing in with the one pre-set account, then walk through adding an account, logging a transaction, viewing an account's history, and editing/deleting an entry. No registration screen is needed in the demo — submission only requires the video and a public GitHub repo, reviewers never need to log in themselves.

## Look and Feel

- **Palette** (from `prd.md > Look and Feel`): `#B8336A` raspberry pink, `#F2AF29` golden orange, `#70B77E` sage green, `#05B2DC` sky blue, `#37505C` dark slate for text/contrast.
- **Typography:** Fredoka for headings and buttons (rounded, playful); Nunito for body copy and all monetary amounts (friendly but legible for numbers).
- **Icons:** Phosphor Icons, fill style, colored from the palette above rather than left default black/gray.
- **Density and tone:** spacious and calm on the Dashboard (it's the screen you'll look at most), slightly denser on Account Detail (it's a list by nature). Interface copy stays plain and warm ("add another account?" not "register additional account").
- Fully achievable in plain CSS — no part of the stack constrains these choices.

## Components

### Supabase Client & Session Guard
`js/supabase-client.js` creates the shared Supabase client (project URL + anon key) used by every page. `js/auth-guard.js` checks for a valid session on every protected page load and redirects to `sign-in.html` if there isn't one. Underpins every other component below.

### Sign In
`sign-in.html` / `js/sign-in.js` — email + password form, calls `supabase.auth.signInWithPassword()`. On success, redirects to `index.html`. On failure, shows a plain inline error ("incorrect email or password"). No registration form exists in the app.

### Account Setup (also handles Account Edit)
`setup.html` / `js/setup.js` — PRD ref: `prd.md > Account Setup`. Two modes, same form, same file — mirroring how `transaction.html` already handles both add and edit:
- **No `?account=` param** (first run, or "Add Account" from the Dashboard): one-account-at-a-time form, `insert`s into `accounts`, loops on "add another?" until declined.
- **`?account=<id>`** (tapped "Edit" from Account Detail): pre-fills the form with that account's current details, shows "Save" instead of "add another?", and `update`s the row instead of inserting a new one.

### Dashboard
`dashboard.html` / `js/dashboard.js` — PRD ref: `prd.md > Dashboard`. Fetches all accounts and all transactions, computes overall + Personal + Business subtotals per currency in JavaScript, renders account rows, and provides "Add Transaction" / "Add Account" buttons.

### Account Detail
`account.html` / `js/account.js` — PRD ref: `prd.md > Account Detail`. Reads `?id=` from the URL, fetches that account and its transactions, computes current balance (starting balance + its transactions), renders history newest-first, links each row into the transaction editor.

### Add / Edit / Delete Transaction
`transaction.html` / `js/transaction.js` — PRD ref: `prd.md > Add / Edit / Delete Transaction`. Reads `?account=` (and `?transaction=` if editing) from the URL. Validates amount is present and non-zero before allowing submit. `insert`s, `update`s, or `delete`s a row in `transactions` accordingly, then returns to where the user came from.

### Export to Excel
`js/export.js`, triggered by a button on `dashboard.html` — PRD ref: `prd.md > Export to Excel`. Fetches every account and its transactions, builds one worksheet per account (Date, Type, Description, Amount columns) with SheetJS, names each sheet after the account (sanitized — Excel sheet names can't contain `\ / ? * [ ]` and are capped at 31 characters), and calls `XLSX.writeFile()` to trigger a browser download. Runs entirely client-side; no data leaves the browser except into the downloaded file.

## Data Model

Three tables in Supabase. Every table carries a `user_id` (for `profiles`, the row's own `id`) checked against the signed-in session via Row Level Security — see **External Services** below. This is slightly more than one signed-in user strictly needs today, but it means the data is already correctly shaped for more than one person to use the app later without a schema change — directly serving the learner's "other users will need to set up their own details later" requirement, at the cost of one extra column per table.

**`profiles`**
| column | type | notes |
|---|---|---|
| id | uuid, primary key | matches the Supabase Auth user's id |
| name | text | |
| surname | text | |
| email | text | mirrors the Auth account's email for convenience |

For this PoC, with exactly one user, this single row is inserted directly (via the Supabase dashboard) rather than through an in-app form — there's no registration screen in this build (see **Decisions**).

**`accounts`**
| column | type | notes |
|---|---|---|
| id | uuid, primary key | default `gen_random_uuid()` |
| user_id | uuid, foreign key → `profiles.id` | set to the signed-in user's id on insert |
| bank_name | text | editable after creation |
| account_number | text, nullable | optional, editable — added during `5-build` final review to disambiguate accounts that share a bank name and type |
| account_type | text | `savings` \| `current` \| `domiciliary` — editable |
| currency | text | `NGN` \| `USD` — editable |
| category | text | `personal` \| `business` — editable |
| starting_balance | numeric | default `0`, editable |
| created_at | timestamptz | default `now()` |

**`transactions`**
| column | type | notes |
|---|---|---|
| id | uuid, primary key | default `gen_random_uuid()` |
| user_id | uuid, foreign key → `profiles.id` | set to the signed-in user's id on insert |
| account_id | uuid, foreign key → `accounts.id`, `on delete cascade` | deleting an account deletes its transactions too — a transaction without its account has no meaning in this app |
| type | text | `expense` \| `inflow` |
| date | date | defaults to today in the UI, editable |
| description | text | |
| amount | numeric | validated > 0 before submit |
| created_at | timestamptz | default `now()` |

**Where data lives, how it updates, what survives navigation:**
- Everything lives in Supabase. No page keeps its own copy — every page fetches fresh from Supabase when it loads, so leaving and returning always shows the true current state.
- **An account's current balance is never stored as its own number.** It's computed every time as `starting_balance + sum(inflow amounts) − sum(expense amounts)` from that account's rows in `transactions`. This is a deliberate simplification (see **What Was Simplified and Why**): editing or deleting a transaction can't leave a stale balance behind, because there's no separate balance value to forget to update. Editing `starting_balance` directly shifts this computed balance the same way — nothing else needs to change.
- Dashboard totals are the same computation run across every account, then grouped by currency and by Personal/Business in JavaScript after fetching.
- The only thing that persists in the browser itself (not Supabase) is the Auth session token, which the Supabase client library stores automatically — that's what keeps you signed in on a device between visits.
- **Caveat worth knowing:** editing an account's `currency` after it already has transactions doesn't convert the existing amounts — they stay the same numbers, now labeled with the new currency. Fine for a single-user PoC where this would be a deliberate, rare correction, not something to guard against with extra logic.

## File Structure

```
tally-up/
├── index.html            # checks session + accounts, routes accordingly
├── sign-in.html          # email + password, one account only
├── setup.html            # account add AND edit (reads ?account= to switch mode)
├── dashboard.html        # totals + Personal/Business sections, Export button
├── account.html          # one account's balance + history (?id=)
├── transaction.html      # add/edit a transaction (?account=&transaction=)
├── css/
│   └── style.css         # palette, Fredoka/Nunito, layout
├── js/
│   ├── supabase-client.js  # Supabase URL + key, shared client
│   ├── auth-guard.js       # redirects to sign-in.html if no session
│   ├── sign-in.js
│   ├── setup.js             # account add AND edit (reads ?account= to switch mode)
│   ├── dashboard.js
│   ├── account.js
│   ├── transaction.js
│   └── export.js            # builds the .xlsx workbook with SheetJS, triggers download
└── devpost/              # Devpost learning workspace
```

## External Services and Dependencies

**Supabase** — [docs](https://supabase.com/docs)
- Client calls: `supabase.from('accounts').select()/.insert()`, same for `transactions`, plus `supabase.auth.signInWithPassword()` / `supabase.auth.getSession()`.
- Auth: project URL + anon public key, both embedded in `js/supabase-client.js`. This is normal for Supabase — the anon key is designed to be public; access is actually controlled by Row Level Security, not by keeping the key secret.
- **Row Level Security:** `profiles` needs a policy requiring `id = auth.uid()`; `accounts` and `transactions` need a policy requiring `user_id = auth.uid()` for `select`, `insert`, `update`, and `delete`. Without this, the "public" anon key would let anyone read or write the tables regardless of sign-in. This must be turned on manually in the Supabase dashboard — it is not the default.
- Free tier (verified via web search, Oct 2026): 500MB database, 50,000 monthly active users for Auth, 1GB file storage, unlimited API requests — all far beyond what a single-user tracker needs. Note: a free project pauses after a week of no activity and needs manually resuming from the dashboard — worth knowing if the app isn't opened for a while.

**Netlify** — [docs](https://docs.netlify.com/)
- Deploys from the GitHub repo automatically on push. Free tier is credit-based (300 credits/month; a deploy costs 15, bandwidth 20/GB) — comfortably enough for a personal, low-traffic app.

**Google Fonts** — [fonts.google.com](https://fonts.google.com/) — Fredoka, Nunito, loaded via `<link>`, no key needed.

**Phosphor Icons** — [github.com/phosphor-icons/web](https://github.com/phosphor-icons/web) — loaded via jsDelivr CSS link, no key needed. *Verify early:* confirm the pinned `2.1.2` CSS URL loads correctly, since the project's CDN hosting changed before (unpkg → jsDelivr).

**SheetJS** — [docs](https://docs.sheetjs.com/docs/getting-started/installation/standalone/) — loaded via `<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js">`, no key needed, runs entirely client-side.

## Important Failure Modes

- **Submitting a transaction with no amount or 0** → inline error "please enter an amount," submission blocked (`prd.md > Missing or zero amount`).
- **A freshly created account with no transactions yet** → Account Detail shows "no transactions yet" instead of a blank space (`prd.md > Empty transaction history`).
- **Wrong email/password at sign-in** → plain inline error message; no lockout logic needed for a single-user PoC.
- **Supabase request is slow or fails** (weak phone connection) → show a simple "loading..." state while waiting, and a plain "couldn't load — try again" message on failure, rather than a blank or broken-looking screen.
- **"Export to Excel" tapped with zero accounts** → a plain inline message ("add an account first") instead of generating an empty or broken file.

## What Was Simplified and Why

- **Plain HTML/CSS/JS instead of a frontend framework** — keeps every file directly readable for a learner building up from HTML, with no build step to debug. The fuller version (React or similar) would add real value only once the UI has much more shared, fast-changing state than this app does.
- **Computed balance instead of a stored, updated balance field** — removes an entire class of bug (balance drifting out of sync after an edit or delete) in exchange for a trivially cheap sum at this data scale (a handful of accounts, a personal volume of transactions).
- **One pre-created Supabase Auth account instead of a sign-up flow** — there is, and will only ever be, one user today. A public registration page would add a screen and an attack surface with no one else to use it yet (see the `user_id` design below for how this still leaves room to add one later).
- **No real-time sync between devices** — each page re-fetches on load rather than pushing live updates between an open phone and an open laptop at the same moment. The fuller version (Supabase Realtime subscriptions) would matter if two devices were being used simultaneously by different people; here it's one person, one device at a time.
- **Account editing reuses the Account Setup form instead of a separate screen** — same fields, same validation, just pre-filled and in single-save mode; a new screen would duplicate logic for no real benefit.
- **Export builds the workbook in the browser instead of on a server** — SheetJS can generate a real `.xlsx` file client-side, so no backend endpoint or file storage is needed just to produce a download.

## Decisions and Open Issues

- **Web app, not a native phone app** — learner's choice; a native app may follow later, after the PoC.
- **Plain JS + Supabase + Netlify, not `localStorage`-only** — upgraded from an initial browser-only approach once the learner identified a real need to use the same data from phone, laptop, and iPad.
- **Supabase over Firebase/Appwrite** — its relational tables map directly onto the learner's existing Excel mental model (a sheet per account); Firebase's document model would've meant learning a different shape for the same idea.
- **Netlify over Vercel** — the learner already has a Netlify account; no reason to open a second one for an equivalent service.
- **Authentication added, with a single pre-created account and no public sign-up** — the learner raised a genuine concern (an accidentally-discoverable URL exposing real personal finances), not a hypothetical one. Supabase Auth + RLS was chosen because it reuses the already-chosen Supabase project rather than adding a new service, and because session persistence means it doesn't reintroduce the daily friction the whole project is trying to remove.
- **Session stays signed in per device until manual sign-out** — matches the "fast, zero-friction" goal from `scope.md > The Core Loop`; the learner didn't want more frequent re-login.
- **Data residing on Supabase is acceptable for the PoC; private self-hosting is a possible later option, not built now** — Supabase is open-source Postgres under the hood, so nothing here locks the data into a proprietary format if the learner wants to move it later. Building actual self-hosting now was explicitly deferred as unnecessary infrastructure work for a PoC.
- **A `profiles` table plus a `user_id` column on `accounts` and `transactions`, even though there's only one user today** — the learner explicitly flagged that other people will need to set up their own details later. Rather than building a multi-user feature now (out of scope for this PoC), the data is shaped so a future self-service sign-up screen can be added without restructuring: each future user's accounts and transactions would already be scoped to just them via `user_id`, and RLS already enforces that boundary per-row rather than per-table.
- **Bank account details (Bank Name, Account Type, Currency, Personal/Business, Starting Balance) are editable after creation** — resolves `prd.md > Open Questions`, reusing the Account Setup form in a single-edit mode rather than building a separate screen.
- **Export to Excel pulled back into the PoC** — originally deferred in `prd.md` to let the build prove the core logging loop first; the learner asked for it explicitly during this spec conversation, and it's a small, self-contained addition (one library, no new service) that doesn't strain the PoC's complexity budget. Implemented client-side with SheetJS, one worksheet per account, matching the format described in `scope.md > Later`.

**One genuine uncertainty, and the plan to resolve it:** the learner is unfamiliar with all three new pieces introduced in this spec — the plain multi-page JS structure, Supabase, and Netlify. Rather than building the real UI first and discovering a setup problem partway through, the first build step will be a minimal, throwaway test: create the Supabase project and its tables, then build one small page that inserts a dummy row and reads it back. This catches key/connection/RLS misconfigurations while nothing else depends on them yet.

**Carried over from `prd.md > Open Questions`:** none remaining — the account-editability question was resolved above.
