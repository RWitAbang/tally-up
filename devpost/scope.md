---
doc: scope
status: approved
---

# [Project Name — not yet decided]

A phone-first expense tracker across all your personal and business bank accounts, so you can log a transaction the instant it happens and always know your real balances.

## The Unique Kernel
A tracker that's actually *yours*: fast enough to use from your phone with zero friction, handles multiple accounts and multiple currencies (Naira and Dollar) without feeling clunky, and never locks your data in — you can get it out as a real Excel workbook whenever you want. That's what Mint and other wallet apps never got right for you.

## Who It's For
You — tracking 7 personal and 2 business bank accounts (with room to add more), in more than one currency. Today you do this in an Excel workbook with a sheet per account, but you can only update it at a computer, so missed days pile into a backlog you dread catching up on.

## The Core Loop
You pull out your phone, open the tracker, pick an account, choose expense or inflow, enter the amount and a short description (milk, groceries, skating fees), and submit. The date defaults to today but you can change it. The account balance updates immediately, and the new entry shows up in that account's transaction history. You come back because entering a transaction takes seconds — no more backlog.

## Why This Matters to the Learner
Keeping your tracked totals matching what's actually in your banking app gives you real satisfaction — and when they don't match, it's genuinely uncomfortable. This tracker exists to make that match effortless instead of a chore you fall behind on.

## What "Working" Looks Like
You open the app and see a dashboard: total balance in Naira at the top, total in Dollar beside it, and below that every account's balance, with personal and business accounts visually distinguished. You tap into an account, see its current balance at the top, enter a new transaction (account is already selected, pick expense or inflow, date, description, amount), and watch the balance update instantly with the new entry appearing in the transaction history alongside previous ones. That's the "it just works" moment — your check-the-math habit finally has a home that keeps up with you.

## The POC Boundary
- Add and manage multiple accounts (starting with your 9, extensible), each tagged personal or business, with an optional starting balance at creation (defaults to zero) — stands in for historical data since import is a "later" item
- Dashboard: total balance per currency (Naira, Dollar) at a glance, plus each account's balance, with personal/business visually distinguished
- Enter a transaction: select account, choose expense or inflow (no minus-sign math), date (defaults to today, editable), description, amount
- Per-account view: current balance at top, updates instantly on entry, full transaction history
- Fast, low-friction, phone-first

## Later
- Export tracker data to an Excel workbook, with a separate sheet per account showing its transactions — direct answer to not wanting to be locked into an app
- Free-form import of an existing workbook as-is (your real 9-account sheets, unedited) — a fixed-template import was built instead (`5-build` final review): download a template, fill it in, import on Add Account. Reading your actual workbooks directly is harder, since their columns and date formatting aren't something the app controls, and is deferred
- Investments: treasury bills, fixed deposits, stocks
- Backup/alternate access beyond phone (may fall out naturally if this is a web app)
- Automated monthly export emailed as a backup, on the last day of each month — raised during `5-build` final review, deferred because it needs real backend infrastructure this static-site-plus-Supabase architecture doesn't have today (a scheduled server-side function, e.g. Supabase Edge Function + `pg_cron`, plus a separate email-sending service like Resend, since Supabase's built-in email only covers auth messages, not arbitrary attachments)
- A consolidated navigation menu — Sign Out, Export to Excel, and Edit Account currently live as separate direct controls rather than one menu; raised during `5-build` final review, deferred rather than built then
- Archive an account instead of deleting it — keeps its history, hides it from the dashboard; raised when discussing long-term history, deferred
- Recently deleted list — deleted transactions kept for 30 days before permanent removal; raised with multi-select delete, deferred until undo is built
- Reconcile against the bank — enter the balance shown in the banking app and see the difference; raised as a high-value check aligned with the app's purpose, deferred
- Monthly summary — total in, total out, and net per account per month; raised when discussing long-term history, deferred
- Categories or tags — structured labels (e.g. groceries) instead of free-text descriptions, enabling spending summaries; raised, deferred as a larger change
- Self-service sign-up so other people can create their own login — raised during `5-build` final review, deferred because a public sign-up page adds risk (anyone can create accounts against the project) and there is only one user today. When built: email confirmation on, sign-up collects first name, surname, and email (the profile row is created from it), and an invite or allow-list option to limit who can register

## Explicitly Cut
- Nothing cut — this PoC is already a tight boundary around the dashboard + multi-account transaction log.
