---
title: Baseline forecasting and future ML
status: future
owner: Backend architecture
last_reviewed: 2026-10-01
order: 16
---

# Baseline forecasting and future ML

**Forecasting and model services are deferred.** MVP preserves accurate sales/returns, batches, stockouts when known, and immutable cost/time history; rule-based discount advice uses available facts without model infrastructure.

When enough verified data exists, start with a moving-average baseline and rolling time-split evaluation, flag missing days/closures/stockouts, and version features/runs/predictions. Never treat unknown periods as zero or leak future observations. A later Python/external model adapter receives scoped nonpersonal features, has bounded timeouts/fallback, and must improve on baseline.

No training, AI agents, computer vision, optimization engine, forecast persistence, or autonomous purchase/stock/price mutation is in MVP. [Domain](../../../PRODUCT_DOMAIN.md) and [future flow](../architecture/diagrams.md) define extensibility without implementation.
