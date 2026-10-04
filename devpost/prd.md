---
doc: prd
status: approved
---

# Tally Up — Product Requirements

A phone-first expense tracker across multiple personal and business bank accounts, in Naira and Dollar, for logging a transaction the instant it happens.
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

## The Core Journey

1. **First open, zero accounts.** You land on account setup. You enter one account's details — Bank Name, Account Type, Currency, Personal or Business, Starting Balance — and save it. You're asked "add another account?" and loop through the same form for each one, until you say no.
2. **Setup complete.** You land on the Dashboard.
3. **Every later visit.** You open Tally Up and land directly on the Dashboard — no setup repeated.
4. **Dashboard.** You see your overall Naira and Dollar totals, then a Personal section and a Business section, each with its own Naira/Dollar subtotals and the accounts inside it. You can tap "Add Transaction," tap "Add Account," or tap any account row.
5. **Logging a transaction.** You tap "Add Transaction," pick the account, then choose expense or inflow, confirm or change the date (defaults to today), add a short description, and enter the amount. You submit. The account's balance updates immediately and the entry appears at the top of that account's history. The dashboard totals reflect it too.
6. **Viewing an account.** You tap an account row from the dashboard and land on that account's page: current balance at the top, full transaction history below, newest first.
7. **Fixing a mistake.** You tap a transaction in the history and get Edit and Delete options. Editing updates the balance to match the corrected amount; deleting removes the entry and the balance recalculates.

## Screens and Layout

- **Account Setup** — reached automatically on first open (zero accounts), and reachable any time afterward via "Add Account" on the Dashboard. One account per pass: Bank Name, Account Type, Currency, Personal/Business, Starting Balance, then "add another account?"
- **Dashboard** — the home screen on every visit after setup. Overall Naira/Dollar totals at top, then a Personal section (its own ₦/$ subtotals + its accounts) and a Business section (its own ₦/$ subtotals + its accounts). "Add Transaction" and "Add Account" buttons.
- **Account Detail** — reached by tapping an account row. Current balance at top, full transaction history below (newest first).
- **Add/Edit Transaction** — reached via "Add Transaction" (pick account first) or by tapping an existing transaction (pre-filled, with Delete also available). Fields: expense/inflow, date, description, amount.

## Look and Feel

Minimal and clean, but colorful and playful — not sterile, not a bare spreadsheet.

- **Palette** (learner-supplied): `#B8336A` (raspberry pink), `#F2AF29` (golden orange), `#70B77E` (sage green), `#05B2DC` (sky blue), `#37505C` (dark slate, for contrast/text).
- **Typography** — playful and friendly, explicitly not a default system font (no Arial, no Times New Roman). `4-spec` picks the actual typeface.
- **Icons** — playful style, not generic/boring. `4-spec` picks the actual icon set.

## Features and Behavior

### User Profile
- Name, Surname, and Email identify whoever is using the tracker. For this PoC there's exactly one user, so the profile is set up directly rather than through an in-app registration form.
- Kept as its own piece of data, separate from bank accounts, so a future version could let more than one person set up their own profile without changing how bank accounts or transactions work.

### Account Setup
- Fields per account: Bank Name, Account Number (optional), Account Type (savings, current, domiciliary, utility card, or domiciliary card), Currency (Naira or Dollar), Personal or Business, Starting Balance (optional, defaults to 0).
- One account at a time, looping with "add another account?" until declined — so someone with 2 accounts isn't stuck filling out a form sized for 9.
- Available on first open (forced, until at least one account exists) and afterward on demand via "Add Account" on the Dashboard.
- **Account details can be edited after creation** — Bank Name, Account Number, Account Type, Currency, Personal/Business, and Starting Balance are all editable later, not just at setup.
- Account Number was added during `5-build` final review: with same-bank, same-type accounts in play (e.g. two savings accounts at the same bank), bank name and type alone weren't always enough to tell accounts apart at a glance.

### Dashboard
- Overall totals: Total Naira and Total Dollar, summed across every account regardless of personal/business.
- Personal section: Personal Naira subtotal, Personal Dollar subtotal, and the list of personal accounts.
- Business section: Business Naira subtotal, Business Dollar subtotal, and the list of business accounts.
- Each account row shows: account name, account type, currency, and current balance.
- "Add Transaction" button and "Add Account" button, both always available.

### Account Detail
- Account type and account number (if set) shown just below the bank name, so it's always clear which account you're looking at.
- Current balance at the top.
- Full transaction history below, newest transaction first. Once a history passes 10 entries, it's paginated — 10 per page, numbered page buttons plus prev/next, and swipe left/right between pages — added during `5-build` final review so a long history doesn't mean endless scrolling.
- Tapping a transaction opens Edit/Delete for it.

### Add / Edit / Delete Transaction
- Add: pick the account (pre-selected if you tapped in from that account's page; shown with its account type to tell similarly-named accounts apart), choose expense or inflow, set the date (defaults to today, editable), enter a description, enter an amount, submit.
- On submit: the account balance updates immediately, the entry appears at the top of that account's history, and Dashboard totals reflect it. You land back on that account's page, not the Dashboard.
- Edit: same fields, pre-filled with the existing entry; saving recalculates the account balance to match the correction.
- Delete: removes the entry from history; the account balance recalculates as if it never happened.

### Export to Excel
- A button, available at any time (not gated behind any flow), exports everything currently tracked into a real Excel workbook (.xlsx) — one sheet per account, matching the learner's existing Excel habit.
- No longer deferred — pulled back into the PoC at the learner's request during `4-spec`.
- Each sheet is named after the bank name and account type (e.g. "GT Current"), not the bank name alone — added during `5-build` final review once two same-bank accounts made the original naming ambiguous.
- Each sheet leads with the account number (if set) and starting balance, then a running Balance column alongside each transaction — added during `5-build` final review so the exported sheet reads as a real ledger, not just a transaction list.

## States and Boundaries

- **First use** — zero accounts: Account Setup runs automatically, looping until the user declines to add another.
- **Empty transaction history** — a freshly created account's history area reads "no transactions yet" instead of a blank space.
- **Missing or zero amount** — submitting a transaction without an amount (or with 0) shows an inline error, "please enter an amount," and blocks submission until corrected.
- **Normal use** — Dashboard totals (overall and per personal/business section) always equal the sum of each account's starting balance plus its logged transactions.
- **Returning visit** — accounts, balances, and transaction history are exactly as left; setup does not repeat.

## Product Decisions

- One account at a time during setup, looping — chosen so setup time scales with how many accounts someone actually has, instead of a fixed long form.
- Totals broken out strictly by currency (Naira and Dollar shown separately, never combined) — combining them would require a conversion rate and misrepresent real balances.
- Accounts grouped into Personal and Business sections with their own subtotals, rather than one flat list with tags — chosen specifically to avoid dashboard clutter.
- Transaction history is newest-first.
- Edit/delete reached by tapping the transaction (not a swipe gesture) — more discoverable and reliable to build for a phone-first PoC, and the learner named UX/intuitiveness as critical.

## What We're Building
- A user profile (Name, Surname, Email) identifying the person using the tracker — one profile for now, set up directly rather than through an in-app form.
- Account setup: looped one-at-a-time add-account flow with Bank Name, Account Type, Currency, Personal/Business, Starting Balance.
- "Add Account" available any time from the Dashboard, not just on first run.
- **Editing an existing account's details** (Bank Name, Account Type, Currency, Personal/Business, Starting Balance), not just transactions.
- Dashboard with overall + Personal + Business currency totals, grouped account lists, "Add Transaction" and "Add Account" buttons.
- Account Detail page: balance + full transaction history, newest first.
- Add, edit, and delete a transaction, with the account balance always recalculating to match.
- **Export everything tracked to an Excel workbook (.xlsx), one sheet per account, available at any time.**
- Missing-amount validation and an empty-history state.
- Playful, colorful visual direction per the supplied palette, with non-default typography and icons.

## Deferred From the POC
- **Import historical data** from the existing Excel workbook (`scope.md > Later`) — deferred; new accounts start from a manually entered starting balance instead.
- **Investments** — treasury bills, fixed deposits, stocks (`scope.md > Later`) — out of scope for this PoC entirely.
- **Backup/alternate access beyond phone** (`scope.md > Later`) — may fall out naturally depending on platform, not a requirement now.
- **Self-service profile setup** — an in-app registration screen so someone other than the learner could create their own profile and log in. The underlying data is already shaped to support multiple users later (see `spec.md > Decisions`); only the sign-up screen itself is deferred.

## Possible Later Enhancements
- Self-service sign-up so other people could use their own login, per the learner's "someday" interest in sharing this app.

## Non-Goals
- No currency conversion or cross-currency combined totals — Naira and Dollar always stay separate.
- No multi-user accounts or sharing in this PoC.
- No historical data import in this PoC — every account starts from a manually entered starting balance.

## Open Questions
- ~~Whether an account's own details can be edited after creation~~ — resolved during `4-spec`: yes, editable.
