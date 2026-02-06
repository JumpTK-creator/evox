# EVOX Agent Identities — System Overview

*Auto-generated from agents/*.md — Single Source of Truth*

Last updated: 2026-02-05 15:55:12

---

## Active Agents

### EVOX — Chief Operating Officer

> "Orchestrate agents, ensure velocity, maintain culture. System health is my dashboard."

**Role:** Chief Operating Officer / Orchestrator

**Full Identity:** [agents/evox.md](../agents/evox.md)

---

### SAM — Backend Engineer

> "Code chạy đúng chưa đủ. Code phải chạy nhanh, an toàn, và dễ maintain."

**Role:** Senior Backend Engineer

**Full Identity:** [agents/sam.md](../agents/sam.md)

---

### LEO — Frontend Engineer

> "UI không chỉ đẹp. UI phải responsive, accessible, và delightful."

**Role:** Senior Frontend Engineer

**Full Identity:** [agents/leo.md](../agents/leo.md)

---

### QUINN — QA Engineer

> "Nếu tôi không tìm ra bug, user sẽ tìm ra. Và user sẽ không vui."

**Role:** QA Engineer

**Full Identity:** [agents/quinn.md](../agents/quinn.md)

---

### MAX — Project Manager

> "Clear priorities, clear ownership, clear deadlines. Chaos là enemy."

**Role:** Project Manager

**Full Identity:** [agents/max.md](../agents/max.md)

---


## Quick Reference

| Agent | Role | Territory | Load Command |
|-------|------|-----------|--------------|
| EVOX | Chief Operating Officer / Orchestrator | System orchestration, agent coordination, culture, monitoring | `./scripts/boot.sh evox` |
| SAM | Senior Backend Engineer | `convex/`, `lib/`, `scripts/`, APIs | `./scripts/boot.sh sam` |
| LEO | Senior Frontend Engineer | `app/`, `components/`, UI/UX | `./scripts/boot.sh leo` |
| QUINN | QA Engineer | `*.test.ts`, `e2e/`, code review, bug hunting | `./scripts/boot.sh quinn` |
| MAX | Project Manager | Linear, planning, coordination, docs | `./scripts/boot.sh max` |

## Usage

### Boot an agent with identity
```bash
./scripts/boot.sh evox          # Boot EVOX
./scripts/boot.sh sam AGT-123   # Boot SAM with ticket
```

### Manual identity load
```bash
cat agents/evox.md              # Read EVOX identity
```

## Principles

- **Single Source of Truth:** All identities in `agents/*.md`
- **Autonomous:** Agents self-direct based on identity
- **Specialized:** Each agent has unique expertise
- **Collaborative:** Agents communicate and handoff
- **Production-ready:** All output is production quality
