# Goals Learning Extension (Future Placeholder)

## Status
- Phase: Implemented (promoted from future plan)
- Implementation state: Active
- Current module impact: Additive extension on top of Goals

This document originally described a future direction. The extension is now implemented with additive schema/API/UI changes while preserving backward compatibility.

## Planned Capabilities (Future)
- Learning metadata attached to planning items
- Learning-focused dashboard and weekly planning surfaces
- Learning streak tracking and motivation loops
- AI-assisted learning plan generation and recap

## Proposed Schema Additions (Future, Not Applied)
Design principle: additive-only changes, owner-scoped, multi-tenant-ready (`workspaceId`, `userId`).

### 1) Optional learning metadata on stickers
Collection (existing): `users/{userId}/stickers/{stickerId}`

Proposed optional object:

```ts
learning?: {
  learningArea?: string;
  learningOutcome?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  studyType?: "read" | "watch" | "build" | "practice" | "review";
  resourceLink?: string;
  timeBoxMinutes?: number;
};
```

Notes:
- All fields optional and absent by default.
- Existing sticker reads/writes continue to work unchanged.

### 2) Optional learning plan docs
Proposed collection: `users/{userId}/learningPlans/{planId}`

```ts
{
  id: string;
  workspaceId: string;
  userId: string;
  weekId: string; // ISO week, YYYY-Www
  focusAreas: string[];
  stickerIds: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3) Optional learning sessions ledger
Proposed collection: `users/{userId}/learningSessions/{sessionId}`

```ts
{
  id: string;
  workspaceId: string;
  userId: string;
  dateId: string; // YYYY-MM-DD
  stickerId?: string;
  learningArea?: string;
  minutesSpent: number;
  notes?: string;
  completed: boolean;
  createdAt: Timestamp;
}
```

### 4) Optional learning streak snapshot
Proposed collection: `users/{userId}/learningStats/{docId}`
- Suggested docId: `current`
- Stores derived counters (current streak, longest streak, weekly consistency)

## UI Concepts (Future, Not Implemented)

### Learning Dashboard
- Summary cards:
  - Time studied this week
  - Completed learning stickers
  - Current learning streak
- Filters:
  - Learning area
  - Difficulty
  - Study type
- Visuals:
  - Weekly progress trend
  - Learning area distribution

### Weekly Learning Planning
- Weekly planner that suggests a balanced mix:
  - Deep work
  - Practice
  - Review
- Drag/drop assignment of learning-focused stickers to week slots
- Time-box validation against user-defined limits

### Learning Streaks
- Dedicated view for:
  - Current and longest learning streaks
  - Consistency heatmap
  - Milestones (example: 7-day, 30-day learning streak)

## AI Integrations (Future, Not Implemented)

### 1) Convert goals into learning plans
- Input: selected stickers + user constraints
- Output: structured weekly learning plan
- Expected API shape (future): `POST /api/ai/goals/learning/plan`
- Must use structured outputs / JSON schema for deterministic parsing

### 2) Suggest next learning task
- Input: active backlog, completion history, available time
- Output: best-next sticker + rationale + estimated time
- Expected API shape (future): `POST /api/ai/goals/learning/next-task`

### 3) Generate weekly learning recap
- Input: completed learning items + sessions
- Output: concise recap, wins, gaps, recommended next focus
- Expected API shape (future): `POST /api/ai/goals/learning/recap`

## Migration Strategy (Future)
1. Gate rollout behind a feature flag (`goalsLearningExtension`).
2. Deploy additive Firestore rules/indexes for new collections only.
3. Introduce optional learning fields and new collections without touching existing required fields.
4. Run idempotent backfill script (if needed) that only creates missing default docs.
5. Ship UI in read-safe mode first (renders even when no learning docs exist).
6. Enable write paths gradually after read validation and telemetry checks.

## Backward Compatibility Plan
- No breaking changes to existing Goals collections or required fields.
- Existing routes (`/sa/goals`, `/today`, `/week`, `/achievements`, `/settings`) remain unchanged.
- Existing API contracts remain unchanged; learning APIs are additive-only.
- Existing sticker documents without `learning` object are valid and fully supported.
- Existing reminders, points, streaks, and badges logic continue operating unchanged.
- Rollback-safe: disabling the feature flag hides learning UI without requiring data rollback.

## Implementation Note
- The sections above were implemented with additive changes only.
- Existing Goals behavior remains backward-compatible for stickers without learning metadata.
