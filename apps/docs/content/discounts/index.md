---
title: Rule-based discount recommendations
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 11
---

# Rule-based discount recommendations

Use an explainable rule-based baseline, not an AI claim. Inputs: eligible scoped stock, days to expiry, verified sales velocity/coverage, price, unit cost, and configurable policy. Excess = max(0, stock minus expected demand before expiry). Missing history produces an insufficient-data explanation or conservative policy, never fake confidence.

A recommendation request returns percentage/excess/reasons/version without automatically saving or applying a discount. Owner/admin explicitly approve a policy-checked rule. At sale time, enforce one line percentage, validity/batch eligibility, maximum discount and floor, then preserve snapshots. Rule thresholds/floors need business confirmation before release.

[Domain](../../../../PRODUCT_DOMAIN.md) defines MVP; [schema](../../../../DATABASE_DESIGN.md) owns persistence. Advanced model replacement is future scope.
