# AGENTS.md

## Repo Guidance

This repository contains both the Aquatrace app codebase and phase-1 documentation for a future agent workflow system.

The phase-1 agent-system materials currently live in `docs/` and are documentation only.
They are not live runtime orchestration code.
Do not treat them as implemented production systems unless explicitly instructed.

## Phase-1 Agent-System Docs

Key files currently include:
- `docs/AGENT_ARCHITECT.md`
- `docs/AGENT_REGISTRY.md`
- `docs/AGENT_REQUEST_TEMPLATE.md`
- `docs/CHILD_AGENT_TEMPLATE.md`
- `docs/AGENT_SYSTEM_OVERVIEW.md`
- `docs/PHASE1_ROADMAP.md`
- `docs/APPROVAL_RULES.md`
- `docs/CONTEXT_MIGRATION_PLAN.md`
- `docs/HANDOFF_WORKFLOW.md`
- `docs/AGENT_INTAKE.md`
- `docs/AGENT_PLANNER.md`
- `docs/AGENT_QA_REVIEW.md`
- `docs/AGENT_DOCUMENTATION.md`

Use these as reference documents when asked to extend the phase-1 agent system.

## Working Rules

- Do not modify app code, configs, dependencies, or build files unless explicitly instructed.
- Do not assume documentation files are already wired into runtime behavior.
- Do not invent new folders, paths, branches, or repo structures without approval.
- Do not stage unrelated files.
- When working on docs, prefer showing the full diff before any commit.
- When a branch contains unrelated existing changes, stage and commit only the explicitly requested files.
- Keep agent-system work practical, documentation-first, and human-reviewable.

## Agent-System Intent

The current agent-system effort is building a documentation-first foundation for:
- Agent Architect as the meta-agent
- reusable child-agent templates
- human-reviewed agent requests
- manual registry tracking
- phase-1 workflow and approval rules

This is not yet a live autonomous multi-agent deployment.

## If Asked To Extend The Agent System

Prefer this order:
1. create or update the requested doc
2. update `docs/AGENT_REGISTRY.md` if a new agent is added
3. show the diff
4. wait for approval before commit unless explicitly instructed otherwise
