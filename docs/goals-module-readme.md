# Goals Module (SA Panel)

## Overview
Goals adds a daily/weekly planning system to SA Panel with:
- Sticker board (`/admin/goals` and `/sa/goals` alias)
- Today execution + end-of-day review
- Weekly planning
- XP/streaks/badges
- Reminders (in-app + email)
- AI quick capture / planning / day summary

## Routes
Primary admin routes:
- `/admin/goals`
- `/admin/goals/today`
- `/admin/goals/week`
- `/admin/goals/learning`
- `/admin/goals/learning/week`
- `/admin/goals/learning/streaks`
- `/admin/goals/achievements`
- `/admin/goals/settings`

Aliases:
- `/sa/goals`
- `/sa/goals/today`
- `/sa/goals/week`
- `/sa/goals/learning`
- `/sa/goals/learning/week`
- `/sa/goals/learning/streaks`
- `/sa/goals/achievements`
- `/sa/goals/settings`
- `/sa/goals/add?date=YYYY-MM-DD&from=daily-email`

## Data model
User-scoped subcollections:
- `users/{uid}/goalsBoards/{boardId}`
- `users/{uid}/stickers/{stickerId}`
- `users/{uid}/dayPlans/{dateId}`
- `users/{uid}/weekPlans/{weekId}`
- `users/{uid}/learningPlans/{weekId}`
- `users/{uid}/learningSessions/{sessionId}`
- `users/{uid}/learningStats/{docId}`
- `users/{uid}/pointsLedger/{entryId}`
- `users/{uid}/badges/{badgeId}`
- `users/{uid}/reminderRules/{ruleId}`
- `users/{uid}/notificationEvents/{eventId}`

Also writes in-app panel docs to:
- `users/{uid}/notifications/{notificationId}`

## Setup
1. Deploy Firestore rules/indexes:
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

2. Deploy functions (includes Goals schedulers):
```bash
cd functions
npm run build
firebase deploy --only functions
```

3. Ensure env vars are set (already used in project):
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (optional, default `gpt-5-mini`)
- `NEXT_PUBLIC_SITE_URL` (or `SITE_URL`/`DEFAULT_SITE_URL`)
- Email integration secrets (existing admin settings + secrets docs)

## Scheduler notes
New Cloud Functions exports:
- `goalsDailyBriefScheduler`
- `goalsWeeklyPlanningScheduler`
- `goalsWrapUpScheduler`

All run every 5 minutes in timezone `America/Montreal` and dispatch only when user settings time matches exactly.

Defaults:
- Daily brief: `08:00`
- Weekly planning reminder: Monday `08:00`
- Wrap-up reminder: `19:30`

Idempotency is enforced per user using:
- `users/{uid}/reminderRules/dispatchState.dailyBriefByDate[dateId]`
- `users/{uid}/reminderRules/dispatchState.weeklyReminderByWeek[weekId]`
- `users/{uid}/reminderRules/dispatchState.wrapUpByDate[dateId]`

## API endpoints
Admin Goals API:
- `GET /api/admin/goals/board`
- `POST /api/admin/goals/stickers`
- `PATCH /api/admin/goals/stickers/:stickerId`
- `DELETE /api/admin/goals/stickers/:stickerId`
- `POST /api/admin/goals/stickers/reorder`
- `GET|PUT /api/admin/goals/day-plan`
- `POST /api/admin/goals/day-plan/start`
- `POST /api/admin/goals/day-plan/review`
- `GET|PUT /api/admin/goals/week-plan`
- `GET|PUT /api/admin/goals/settings`
- `GET /api/admin/goals/achievements`
- `POST /api/admin/goals/project-task`
- `GET /api/admin/goals/learning/dashboard`
- `GET|PUT /api/admin/goals/learning/week-plan`
- `GET /api/admin/goals/learning/streaks`
- `POST /api/admin/goals/learning/sessions`

AI endpoints:
- `POST /api/ai/goals/extract`
- `POST /api/ai/goals/plan-day`
- `POST /api/ai/goals/end-summary`
- `POST /api/ai/goals/learning/plan`
- `POST /api/ai/goals/learning/next-task`
- `POST /api/ai/goals/learning/recap`

All endpoints validate payloads with zod.

## Seed + migration
Seed sample Goals data:
```bash
npm run seed:goals
```

Optional UID override:
```bash
GOALS_SEED_UID=<uid> npm run seed:goals
```

Backfill default Goals docs for active admins:
```bash
npm run migrate:goals
```

## Troubleshooting
- **Daily brief not sending**
  - Confirm reminder settings in `/admin/goals/settings`
  - Confirm user has valid email in `adminUsers/{uid}.email`
  - Confirm global email channel is enabled in reminders settings
  - Check function logs for `goalsDailyBriefScheduler`

- **In-app reminders missing**
  - Verify `users/{uid}/notifications` writes
  - Verify `users/{uid}/notificationEvents` writes
  - Confirm notification panel user is same UID

- **AI extraction/planning fails**
  - Verify `OPENAI_API_KEY`
  - Check API error response in network tab

- **Rules/index errors**
  - Deploy updated `firestore.rules` and `firestore.indexes.json`
