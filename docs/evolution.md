# GitChi Evolution & Game Design

GitChi is a contribution-driven virtual pet. Evolution is designed around three activity profiles:

- Easy: weekend coding, with final growth in about 1 month when consistent.
- Normal: 3-4 development days per week, with final growth in about 2 months when consistent.
- Hard: 5-6 development days per week, with final growth in about 3 months when consistent.

## Lifecycle Stages

Pets evolve based on both **XP** and **age**. The age requirement sets the intended journey length; XP confirms that the user has stayed active enough for the selected difficulty.

| Stage | Name | Easy | Normal | Hard | Notes |
|---|---|---:|---:|---:|---|
| 0 | Egg | - | - | - | Initial state upon adoption. |
| 1 | Hatchling | 1 XP | 1 XP | 1 XP | Hatches after the first contribution. |
| 2 | Fledgling | 120 XP & 7 days | 220 XP & 14 days | 320 XP & 21 days | Trait lock point. |
| 3 | Adult | 300 XP & 18 days | 600 XP & 36 days | 900 XP & 54 days | Mature visual form. |
| 4 | Elder | 500 XP & 30 days | 1000 XP & 60 days | 1500 XP & 90 days | Final stage. Eligible for retirement. |

Only one evolution beyond hatching can occur per calendar day.

## Activity & Scoring

Every GitHub event maps to stat and XP gains. Difficulty modifies XP gain, while stat decay controls maintenance pressure.

| Event Type | Base XP | Fullness | Happiness | Trait Signal |
|---|---:|---:|---:|---|
| PushEvent | +10 | +15 | +10 | Solo coder |
| PushEvent with test/spec/fix message | +15 | +15 | +10 | Craftsman |
| Descriptive commit message | +5 | +5 | 0 | Craftsman |
| PullRequest opened | +15 | +10 | +15 | Collaborator |
| PullRequest merged | +25 | +15 | +30 | Collaborator |
| Review / comment | +15 | 0 | +20 | Collaborator |
| Create / Fork | +10 | +5 | +15 | Architect |
| Issue closed | +10 | 0 | +15 | Architect |
| Activity across 2+ repos in one sync | +20 | +8 | +14 | Architect |
| 5-day streak bonus | +30 | +15 | +15 | Sprinter |

## Difficulty Effects

| Difficulty | Intended User | Final Growth | XP Multiplier | Stat Decay |
|---|---|---:|---:|---:|
| Easy | Weekend coder | ~30 days | 1.2x | 10 points / 7 days |
| Normal | 3-4 days per week | ~60 days | 1.0x | 10 points / 3 days |
| Hard | 5-6 days per week | ~90 days | 0.8x | 10 points / 2 days |

If Fullness drops below 40 or Happiness drops below 30, the pet becomes Hungry or Sad and XP gain is reduced by 50%.

## Trait Determination

Traits are determined at Stage 2 based on cumulative activity patterns before the trait lock.

Trait signals:

1. Craftsman: high quality score from tests, fixes, and descriptive commits.
2. Collaborator: high social score from PRs, reviews, and comments.
3. Lone Coder: high solo commit score from push activity.
4. Architect: high diversity score from repositories, issues, forks, and creation events.
5. Sprinter: high streak score from consistent daily activity.

If multiple traits tie for the highest score, GitChi chooses one deterministically from the tied traits using the user ID. If no trait signal exists yet, the fallback trait is Lone Coder.

## Dormant State

If a pet reaches 0 Fullness and 0 Happiness with no new XP-gaining activity during sync, it becomes dormant. Any later XP-gaining activity wakes it up and clears the dormant timestamp.

## Technical Flow

1. GitHub activity is fetched during scheduled sync.
2. New events are converted into stat, XP, streak, and trait-score deltas.
3. Pet stats and trait tallies are persisted.
4. Evolution is checked against the difficulty-specific threshold table.
5. Evolution is logged and a dashboard notification is created.
