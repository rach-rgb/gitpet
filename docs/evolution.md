# GitChi Evolution & Game Design

GitChi is a contribution-driven virtual pet. This document outlines the technical design of evolution, activity scoring, and trait determination.

## 🧬 Lifecycle Stages

Pets evolve based on two conditions: **XP** and **Age** (days since birth).

| Stage | Name | Requirement | Notes |
|---|---|---|---|
| 0 | Egg | - | Initial state upon adoption. |
| 1 | Hatchling | 1 XP | Hatches after the very first contribution. |
| 2 | Fledgling | 150 XP & 10 Days | **Trait Lock Point**: The pet's personality is determined here. |
| 3 | Adult | 600 XP & 30 Days | Fully mature visual form. |
| 4 | Elder | 1500 XP & 90 Days | Final stage. Eligible for **Retirement**. |

---

## ⚔️ Activity & Scoring (XP/Stats)

Every GitHub event is mapped to specific stat gains.

| Event Type | XP | Fullness | Happiness | Health |
|---|---|---|---|---|
| **PushEvent** | +10 | +15 | 0 | +5 |
| **PullRequest (Open)** | +10 | 0 | +15 | 0 |
| **PullRequest (Merge)** | +25 | 0 | +30 | +10 |
| **PR Review / Comment** | +15 | 0 | +20 | 0 |

- **Hunger Decay**: Fullness decreases by **0.4 points per hour**.
- **Status Effects**: If Fullness or Happiness drops to 0, the pet becomes **Sick** or **Sad**, slowing down XP gain.

---

## 🧬 Trait Determination

Traits are determined at **Stage 2 (Fledgling)** based on the cumulative activity pattern. The trait with the highest score wins.

### Trait Priority (Tie-breaker order):
1.  **⚒️ Craftsman**: High `qualityScore` (Large commits, major refactors).
2.  **🐕 Collaborator**: High `socialScore` (Reviews, comments, shared PRs).
3.  **🦉 Lone Coder**: High `soloCommitScore` (Frequent pushes to personal repos).
4.  **📐 Architect**: High `diversityScore` (Activity across many different repositories).
5.  **🏃 Sprinter**: High `streakScore` (Consistency in daily activity).

---

## ☁️ Technical Flow
1.  **Webhooks/Polling**: Service monitors GitHub Events API.
2.  **Scoring**: Events are processed and added to `trait_tallies` and `pets` tables.
3.  **Evolution Check**: Every activity triggers a check against `EVOLUTION_THRESHOLDS`.
4.  **Notification**: User is notified via dashboard when evolution occurs.
