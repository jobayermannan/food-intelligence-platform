---
title: Working with coding agents
status: target
owner: Backend architecture
last_reviewed: 2026-10-01
order: 21
---

# Working with coding agents

Begin with [PRODUCT_DOMAIN.md](../../../PRODUCT_DOMAIN.md) and [AGENTIC_DEVELOPMENT_GUIDE.md](../../../AGENTIC_DEVELOPMENT_GUIDE.md). Product/repository target is `food-intelligence-platform`; current folder/package/remote remain legacy until a reviewed rename. Do not treat index.js as a business foundation or create speculative compatibility.

Inspect actual source/state, distinguish legacy/MVP/future, plan impact, implement only the approved phase, verify tenant/location and transaction rules, and update docs. Authentication assumptions are explicit; never reuse email-only JWT issuance.

This turn allows documentation corrections only: no folder move, package edits, NestJS modules, SQL migrations, frontend, Astro runtime, Docker, queues, sockets, payment adapters, or data operations. Later Phase 1 still needs explicit approval.
