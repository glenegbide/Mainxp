# MAINXP — Finance System (Phase 3)

Optional globally; serious when enabled. Nothing here is implemented in Phase 0/1 —
this is the binding plan.

## Scope

Accounts, balances, income, expenses, budgets, debt, savings, subscriptions, business
finances, cash flow, upcoming bills. Currency-aware (CHF default).

## Banking architecture (Part 38) — hard rule

1. **Manual balances FIRST.** 2. CSV/statement import. 3. Open-banking provider later.
`BankingProvider` abstraction with a `manual` adapter; **never fake direct bank
connectivity**. The system must be fully useful with manual data.

## Receipt camera (Part 37)

Photo → AIProvider.vision extracts merchant, date, amount, currency, VAT, category,
personal/business, payment method + confidence. Uncertain → ask user. Duplicate
detection: (merchant, date, amount) fingerprint + image hash. Original image stored in
private (non-public) storage — never under `public/`.

## Safe to Spend (Part 39)

cash available − upcoming bills − minimum debt payments − savings commitments −
emergency buffer = **SAFE TO SPEND**, with the calculation always shown transparently.

## Can I afford this? (Part 40) & Money coach (Part 41)

Practical recommendation from balance, bills, budget, debt, savings target, income
timing. Numbers, never shame: "CHF 300 restaurant budget, CHF 438 spent → CHF 138 over."

## XP

WEALTH XP from: staying inside budget for a period, debt reduction events, savings
contributions, income growth — via ledger with idempotent source events. Never from
merely entering data.

## Transaction reconciliation (addendum #15, P3)

Receipt CHF 82 and bank transaction CHF 82 are the SAME expense. Match on
amount + merchant + date + currency; ask the user when uncertain. No
double-counting, ever.

## Cash-flow forecast (addendum #16, P3)

Today / 7-day / 30-day projected balance from expected income, rent, bills,
debt, subscriptions and planned spending — with early warnings ("balance could
fall below your safety buffer around Aug 27").

## Money Defense Mode (addendum #17, P3)

When finances tighten: prioritize essentials, upcoming bills, debt, collecting
income and revenue-producing actions; stop suggesting monetary rewards
(the rewards engine already prefers non-monetary suggestions).
