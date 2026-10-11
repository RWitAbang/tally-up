---
doc: project-summary
status: reference
---

# Tally Up

A phone-first expense tracker for someone who already knows how to track money — they've done it for years in an Excel workbook — but wants logging a transaction to take seconds instead of becoming a backlog.

## The problem it solves

Before Tally Up, tracking meant opening an Excel workbook with one sheet per bank account, and that only worked from a computer. Missing a few days meant a backlog that felt like a chore to catch up on. Keeping tracked totals matching what the bank actually shows is genuinely satisfying — and falling behind on that is genuinely uncomfortable. Tally Up exists to make that match effortless, from a phone, in the moment a transaction happens.

## Who it's for

Built for one person tracking multiple personal and business bank accounts, in more than one currency (Naira, Dollar, Pound). The data model already scopes every row to its owner, so it's shaped to support more people later without being rebuilt — that's a deliberate design choice, not a feature that's live today. Right now there's exactly one way in: a login created directly in the project's database, not a public sign-up page.

## How it works

Three pieces, each doing one job:

- **Netlify** hosts the files and serves them to a browser. It never touches your data.
- **Your browser** runs everything — the logic, the validation, the Excel export. Nothing runs on a server.
- **Supabase** is the only place real data lives: your accounts, your transactions, and your sign-in. Every request is checked against who's signed in before the database hands anything back.

Balances are never stored as a number sitting in the database. They're always worked out fresh — starting balance plus every inflow, minus every expense — so they can't quietly drift out of sync with what actually happened.

## The core loop

Open the app, pick an account, choose expense or inflow, enter an amount and a short description, submit. The date defaults to today. The balance updates immediately, and the entry appears in that account's history right away. That's the whole point: fast enough that logging something takes seconds, not a trip back to a spreadsheet.

## What's built

- Multiple accounts, each personal or business, in Naira, Dollar, or Pound, with an optional account number to tell similar accounts apart.
- A dashboard showing totals per currency and every account's balance, with amounts colored by whether they're positive or negative.
- Full transaction history per account, with search, a filter for inflows or expenses only, and multi-select delete with a short undo window.
- Signing in, signing out, and changing your name, email, or password — with a show/hide toggle on password fields and a confirmation check when setting a new one.
- Exporting everything to a real Excel workbook, one sheet per account, with running balances and properly formatted dates.
- Importing historical transactions and a starting balance from a spreadsheet template when adding a new account, instead of typing years of history by hand.
- A first-run welcome screen that asks a brand-new user's name once, instead of leaving it blank forever.
- A handful of small rules that stop mismatched data before it happens — a domiciliary account can't be set to Naira, choosing Dollar or Pound sets the account type to domiciliary automatically, and both starting balance and currency lock once an account has real transactions, since changing either afterward would throw off or reinterpret every balance calculated since.

## Deliberately left for later

Some things came up while building this and were written down rather than built, because they'd add real complexity or risk for a proof of concept: self-service sign-up, archiving an account instead of deleting it, a "recently deleted" safety net, reconciling against what the bank shows, monthly summaries, spending categories, and reading in an existing workbook exactly as it is today rather than through a template. The full reasoning for each is in `devpost/scope.md`.

## Where things live

- **Live app:** [techsavvietallyup.netlify.app](https://techsavvietallyup.netlify.app/)
- **Code and history:** [github.com/RWitAbang/tally-up](https://github.com/RWitAbang/tally-up)
- **Build log:** `devpost/checklist.md` — every slice and every round of review, in the order it happened
- **Planning docs:** `devpost/scope.md`, `devpost/prd.md`, `devpost/spec.md`
- **How it works, visually:** `devpost/workflow.md`
