---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn

## Slices

- [x] **1. Prove the foundation: sign in, save data, and go live**
  Becomes usable: You can open the deployed Netlify URL on your phone, sign in with the one account, and see proof that a row written to Supabase was saved and read back correctly.
  Why now: Supabase, Auth, RLS, and Netlify are all unfamiliar to you and everything else gets built on top of them. The spec's own plan is to prove this chain with a throwaway test before any real UI depends on it — bad news here is cheap; bad news three slices in is not. This also covers project bootstrapping (file structure, Git, deployment).
  PRD ref: n/a (infrastructure step named directly in `spec.md > Decisions and Open Issues`, the "one genuine uncertainty" paragraph)
  Spec ref: `spec.md > Stack`, `spec.md > Where It Runs and How Someone Tries It`, `spec.md > Components > Supabase Client & Session Guard`, `spec.md > Components > Sign In`, `spec.md > Data Model`, `spec.md > External Services and Dependencies`
  Build: Scaffold the project per `spec.md > File Structure`. Create the Supabase project with the `profiles`, `accounts`, and `transactions` tables and turn on Row Level Security per the policies described. Create the one Supabase Auth user in the dashboard. Add `js/supabase-client.js` and `js/auth-guard.js`. Build `sign-in.html`/`js/sign-in.js`. Build a throwaway `index.html` that, once signed in, inserts a dummy row into `accounts` and displays it back on screen to prove the full chain works. Push the repo to GitHub and connect it to Netlify; confirm the deployed URL loads.
  Verify (mechanical): Open the deployed Netlify URL, sign in, and confirm the dummy row appears on screen. Check the Supabase table editor directly to confirm the row landed with the correct `user_id`. Check the browser console for errors. Try an incorrect password and confirm the inline error appears.
  Learner check: On your phone, open the Netlify link, sign in, and see the proof message appear.
  Commit: `Set up Supabase, auth, and deployment; prove the connection end to end`

- [x] **2. Add your real accounts and see them listed**
  Becomes usable: You can add accounts one at a time (looping until you decline) and see them listed on a dashboard.
  Why now: Multi-account, multi-currency, personal/business handling is the unique kernel of this app — it needs to exist before any transaction can reference an account.
  PRD ref: `prd.md > Account Setup`, `prd.md > Screens and Layout > Account Setup`, `prd.md > Every later visit`
  Spec ref: `spec.md > Components > Account Setup` (add mode only), `spec.md > Data Model > accounts`, `spec.md > The Core Journey Through the System` (steps 3-5)
  Build: Replace the throwaway `index.html` with real routing (no session → `sign-in.html`; signed in, zero accounts → `setup.html`; signed in, accounts exist → `dashboard.html`). Build `setup.html`/`js/setup.js` in add-only mode: one account at a time (Bank Name, Account Type, Currency, Personal/Business, Starting Balance), looping on "add another?" until declined. Build a minimal `dashboard.html`/`js/dashboard.js` that lists every account with an "Add Account" button. Show a simple "loading..." state while fetching.
  Verify (mechanical): Add 2-3 test accounts across both currencies and both categories. Confirm each lands correctly in the Supabase table editor. Reload the page and confirm it routes straight to the dashboard (setup does not repeat).
  Learner check: Add your real bank accounts on your phone, one at a time, and watch them appear in the list.
  Commit: `Add account setup flow and basic dashboard listing`

- [x] **3. See your real totals at a glance**
  Becomes usable: The actual "at a glance" dashboard — overall totals plus Personal and Business sections, each broken out by currency.
  Why now: This is the first screen you'll look at most, and it's one of the two things Mint and other wallet apps never got right for you.
  PRD ref: `prd.md > Dashboard`
  Spec ref: `spec.md > Components > Dashboard`, `spec.md > Data Model` (computed balance)
  Build: Extend `js/dashboard.js` to compute overall Naira and Dollar totals, then Personal and Business subtotals per currency, and group the account rows under their section.
  Verify (mechanical): Using your test accounts' known starting balances, hand-calculate the expected overall and section totals, then compare against what renders.
  Learner check: Check the dashboard's totals against your own quick mental sum of the test accounts.
  Commit: `Compute dashboard totals grouped by currency and personal/business`

- [x] **4. Log a transaction and watch balances update**
  Becomes usable: The core loop this whole app exists for — log an expense or inflow and see it reflected immediately.
  Why now: This is the single behavior the kernel is built around; everything before this slice was setup for it.
  PRD ref: `prd.md > Logging a transaction`, `prd.md > Add / Edit / Delete Transaction` (add path), `prd.md > Missing or zero amount`, `prd.md > Empty transaction history`
  Spec ref: `spec.md > Components > Add / Edit / Delete Transaction` (add path), `spec.md > Components > Account Detail`, `spec.md > Data Model > transactions`, `spec.md > Important Failure Modes`
  Build: Build `transaction.html`/`js/transaction.js` in add-only mode: pick the account (pre-selected if arriving from that account's page), choose expense/inflow, date (defaults to today, editable), description, amount — with an inline "please enter an amount" error blocking submission on a missing or zero amount. Build `account.html`/`js/account.js`: current balance at the top (starting balance + its transactions), full history newest-first, "no transactions yet" when empty. Wire up the dashboard's "Add Transaction" button and make account rows link to `account.html`.
  Verify (mechanical): Log an inflow and an expense against a test account; confirm the account balance and dashboard totals update correctly. Try submitting with an empty and a zero amount; confirm both are blocked with the inline error. Open a freshly created account with no transactions and confirm it shows "no transactions yet."
  Learner check: Log a real transaction from your phone and watch the account balance and dashboard totals update immediately.
  Commit: `Add transaction logging with account detail view and balance calculation`

- [ ] **5. Fix a mistake: edit or delete a transaction**
  Becomes usable: Tapping a past transaction lets you correct or remove it, with the balance always catching up.
  Why now: Mistakes are inevitable in a fast-entry tool; this closes the loop the PRD calls "Fixing a mistake."
  PRD ref: `prd.md > Fixing a mistake`
  Spec ref: `spec.md > Components > Add / Edit / Delete Transaction` (edit/delete path)
  Build: Extend `transaction.html`/`js/transaction.js` to handle a `?transaction=` param: pre-fill the form with the existing entry and show Edit/Delete instead of a plain submit. Wire up tapping a transaction in `account.html`'s history to open it in this mode.
  Verify (mechanical): Edit an existing test transaction's amount and confirm the account balance recalculates correctly. Delete a test transaction and confirm it disappears and the balance recalculates as if it never happened.
  Learner check: Tap a transaction you logged, change its amount, save, and confirm the balance is right — then delete a test transaction.
  Commit: `Add transaction editing and deletion`

- [ ] **6. Fix a mistake in an account's own details**
  Becomes usable: Correcting a mistyped bank name, currency, category, or starting balance after an account already exists.
  Why now: The smaller, lower-risk half of "editable after creation," built once the transaction edit/delete pattern already exists to reuse.
  PRD ref: `prd.md > Account Setup > Account details can be edited`
  Spec ref: `spec.md > Components > Account Setup` (edit mode), `spec.md > The Core Journey Through the System` (step 10)
  Build: Extend `setup.html`/`js/setup.js` to handle a `?account=` param: pre-fill the form with that account's current details, show "Save" instead of "add another?", and `update` the row instead of inserting. Add an "Edit" entry point from `account.html`.
  Verify (mechanical): Edit a test account's bank name and category; confirm the change lands in Supabase and shows correctly on both the dashboard and that account's detail page.
  Learner check: Edit one of your test accounts' details and confirm the change shows up on the dashboard.
  Commit: `Add account editing`

- [ ] **7. Get your data out: export to Excel**
  Becomes usable: A real `.xlsx` download, one sheet per account — the other half of the unique kernel, the promise that this tracker never locks your data in.
  Why now: Last, because it reads everything the rest of the app produces; building it earlier would mean exporting against fake or incomplete data.
  PRD ref: `prd.md > Export to Excel`
  Spec ref: `spec.md > Components > Export to Excel`, `spec.md > Stack` (SheetJS), `spec.md > Important Failure Modes` (zero accounts)
  Build: Add `js/export.js` using SheetJS: fetch every account and its transactions, build one worksheet per account (Date, Type, Description, Amount), sanitize sheet names (no `\ / ? * [ ]`, capped at 31 characters), trigger the download. Add the "Export to Excel" button to `dashboard.html`, available at any time, with a plain "add an account first" message when there are zero accounts.
  Verify (mechanical): With test data in place, export and open the downloaded `.xlsx`; confirm the sheets, columns, and values match what's in the app. Reason through (or briefly test against) the zero-accounts case to confirm the guard message appears instead of a broken file.
  Learner check: Tap "Export to Excel," open the downloaded file, and check it matches what you see in the app.
  Commit: `Add Excel export`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after Slice 2, once you can add your real accounts and see them listed
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: [not yet started]
Route and stops: [not yet started]
Edit outcome: [not yet started]
Reflection: [not yet started]
Activity mode: [not yet started]

## Revisions

- Added explicit `grant` statements for the `authenticated` role on `accounts`, `transactions`, and `profiles`, on top of the RLS policies from the original plan — raw SQL table creation in Supabase doesn't auto-grant table privileges the way its dashboard UI does, and the first live insert failed with "permission denied" until these were added. No change to `scope.md`/`prd.md`/`spec.md`; this is a one-time setup correction in the Supabase project itself.
- Netlify's "Team protection" (Visitor access) defaulted to Private, which would have blocked anyone — including the learner on their phone — from reaching the deployed site without a Netlify login. Switched Project visibility to Public in Netlify's Site configuration; the app's own Supabase Auth sign-in remains the actual access gate, unaffected by this setting.
- Dashboard listing is sorted alphabetically by bank name (not creation order) — learner preference discovered during the early checkpoint, not specified in `prd.md`/`spec.md`.
- Starting Balance now uses a custom-formatted text input (comma-grouped, capped at 2 decimals) with our own inline validation message, instead of a native `type="number"` input — the learner wanted thousands separators and a styled "Please enter a number" message, neither of which a native number input can do. Formatting was initially blur-only; the learner asked for it live as they type instead, so `js/currency.js` now also exports `attachLiveAmountFormatting()`, which reformats on every keystroke while preserving cursor position. The same helper will be reused for the transaction Amount field in Slice 4.
- Found and fixed a real bug in the live amount formatter: typing a decimal point placed the cursor *before* the dot instead of after it, so the next digit typed landed in the integer part instead of becoming a decimal digit, making decimal entry look broken. Fixed by tracking whether the cursor is before or after the decimal point separately from digit-counting.
- Added a "Cancel" button to Account Setup (shown only when at least one account already exists, so it never appears during the forced first-run setup) and a "Sign Out" link on the Dashboard — both were gaps in the original plan surfaced by the learner trying the app: `spec.md > Decisions` already assumed manual sign-out was possible but no screen ever built a way to trigger it.
- Local testing kept showing stale HTML/CSS/JS after edits (the browser was caching responses from Python's plain `http.server`, which sends no cache-control headers). Replaced it with `.claude/no-cache-server.py`, a tiny wrapper that adds `Cache-Control: no-store` to every response, wired up via `.claude/launch.json`. This doesn't affect the deployed app at all — it's local dev tooling only.
