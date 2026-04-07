# Konnect4 Platform Plan

## Updated Project Structure

```text
konnect4/
  client/
    src/
      api.js
      socket.js
      App.jsx
      components/
        auth/
        game/
        home/
        friends/
        leaderboards/
        live-matches/
        ranked/
      styles/
  server/
    data/
      konnect4.sqlite
    src/
      auth/
      db/
        repositories/
      matchmaking/
      rankedSystem.js
      seasonSystem.js
      aiPlayer.js
      roomManager.js
      socketHandlers.js
      platformRoutes.js
      index.js
  shared/
    connect4.js
```

## Backend Architecture

- `auth/`: signup, login, logout, cookie/session auth, route protection.
- `db/`: SQLite bootstrap, schema, repositories.
- `roomManager.js`: in-memory active room state, queues, practice games, future ranked/spectator expansion.
- `rankedSystem.js`: tiers, point formulas, promotion/demotion helpers, queue expansion helpers.
- `seasonSystem.js`: quarter-based season windows and IDs.
- `socketHandlers.js`: realtime events for rooms, matchmaking, spectators, notifications, live updates.
- `platformRoutes.js`: profile, friends, leaderboards, notifications, account-related APIs.

## Frontend Architecture

- `App.jsx`: auth/session bootstrap and top-level navigation.
- `components/auth/`: signup/login forms.
- `components/home/`: play mode cards, queue panels, profile shell.
- `components/game/`: room view, board, spectators, status.
- `components/friends/`: search, requests, list, invite actions.
- `components/leaderboards/`: region/country/global/all-time tables.
- `components/live-matches/`: spectator list and match viewer.
- `components/ranked/`: ranked queue status, rank progress, season summary.

## Database Schema / Models

### `users`

- `id`
- `username`
- `email`
- `passwordHash`
- `country`
- `region`
- `onlineStatus`
- `rankTier`
- `rankPoints`
- `winStreak`
- `rankedWins`
- `rankedLosses`
- `createdAt`
- `updatedAt`

### `sessions`

- `token`
- `userId`
- `createdAt`
- `expiresAt`

### `seasons`

- `id`
- `label`
- `startAt`
- `endAt`
- `status`

### `user_season_stats`

- `userId`
- `seasonId`
- `rankTier`
- `rankPoints`
- `winStreak`
- `rankedWins`
- `rankedLosses`
- `matchesPlayed`
- `wins`
- `losses`

### `user_all_time_stats`

- `userId`
- `matchesPlayed`
- `wins`
- `losses`
- `rankedWins`
- `rankedLosses`
- `privateWins`
- `privateLosses`
- `randomWins`
- `randomLosses`
- `rankedMatchWins`
- `rankedMatchLosses`
- `aiWins`
- `aiLosses`

### `friend_requests`

- `id`
- `senderUserId`
- `receiverUserId`
- `status`
- `createdAt`
- `respondedAt`

### `friendships`

- `id`
- `userOneId`
- `userTwoId`
- `createdAt`

### `notifications`

- `id`
- `userId`
- `type`
- `payloadJson`
- `createdAt`
- `readAt`

### `match_history`

- `id`
- `roomCode`
- `mode`
- `seasonId`
- `status`
- `winnerUserId`
- `startedAt`
- `endedAt`
- `rankChangeJson`
- `metadataJson`

### `match_participants`

- `matchId`
- `userId`
- `usernameSnapshot`
- `rankTierSnapshot`
- `result`
- `rankPointsChange`
- `isAi`

### `live_matches`

- `roomCode`
- `mode`
- `seasonId`
- `status`
- `playerOneUserId`
- `playerTwoUserId`
- `boardJson`
- `stateJson`
- `spectatorCount`
- `updatedAt`

## Socket Events

### Auth / Presence

- `presence:online`
- `presence:offline`
- `notifications:new`

### Play

- `room:create`
- `room:join`
- `room:leave`
- `room:state`
- `game:move`
- `game:rematch`

### Matchmaking

- `queue:join`
- `queue:leave`
- `ranked:queue:join`
- `ranked:queue:leave`
- `queue:status`

### Practice

- `practice:create`

### Spectating / Live Matches

- `live:list`
- `live:subscribe`
- `live:unsubscribe`
- `live:update`

### Friends

- `friends:invite`
- `friends:request`
- `friends:request:respond`

## API Routes

### Auth

- `GET /api/auth/session`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`

### Profile

- `GET /api/profile`

### Friends

- `GET /api/friends`
- `GET /api/friends/search?q=...`
- `POST /api/friends/requests`
- `POST /api/friends/requests/:requestId/respond`

### Notifications

- `GET /api/notifications`

### Leaderboards

- `GET /api/leaderboards?scope=global|region|country&timeframe=season|all-time`

### Future Ranked / Live / History APIs

- `GET /api/ranked/season`
- `GET /api/live-matches`
- `GET /api/match-history`

## Ranked Formulas and Thresholds

### Tiers

- Bronze: `0+`
- Silver: `400+`
- Gold: `850+`
- Platinum: `1400+`
- Diamond: `2100+`
- Master: `3000+`
- Legend: `4200+`

### Ranked Point Behavior

- Normal win: `+28`
- Normal loss: `-20`
- Disconnect / quit loss: `-34`
- Win streak bonus starts at 3 wins:
  - 3 streak: `+16` extra
  - 4 streak: `+24` extra
  - 5 streak: `+32` extra
  - Continue `+8` more per streak win

### Matchmaking Expansion

- `0-24s`: same tier only
- `25-59s`: same tier plus adjacent tiers
- `60-119s`: expand two tiers out
- `120s+`: expand three tiers out

## Season Reset Strategy

- Use calendar quarters: Q1, Q2, Q3, Q4.
- Current season ID format: `YYYY-QN`.
- On server startup and periodically, ensure current season exists.
- When a new quarter starts:
  - archive prior season
  - create the next season row
  - initialize new `user_season_stats`
  - reset seasonal rank points and seasonal leaderboard standings
  - preserve all-time records and match history

## Leaderboard Logic

- Seasonal boards use `user_season_stats`.
- All-time boards use `users` and `user_all_time_stats`.
- Sorting priority:
  1. rank points
  2. ranked wins
  3. username
- Filters:
  - `global`
  - `region`
  - `country`
  - `season`
  - `all-time`

## Friend System Flow

1. Search users by username.
2. Prevent self-requests and duplicates.
3. Create pending request.
4. Emit realtime notification to receiver.
5. Receiver accepts or declines.
6. On accept, create a normalized friendship pair.
7. Friends list shows online status, rank, and invite actions.

## Spectator / Live Matches Flow

1. Active public/random/ranked matches publish to `live_matches`.
2. Clients request the live match list.
3. Spectators subscribe to one room in read-only mode.
4. Spectators receive `room:state` or `live:update`.
5. Spectators can leave without affecting the match.
6. Server tracks `spectatorCount` and excludes spectators from move validation.

## AI Difficulty Plan

- Easy: mostly random, sometimes blocks or takes a free win.
- Medium: immediate win detection plus basic threat blocking.
- Hard: heuristic board evaluation and center-column preference.
- Extreme: deeper minimax search.
- Impossible: near-perfect alpha-beta minimax with move ordering and caching.

## Phased Implementation Plan

### Phase 1

- Rename app to Konnect4
- Introduce SQLite database
- Migrate auth to DB-backed users and sessions
- Add ranked/season utilities
- Add profile, friends, notifications, and leaderboard APIs

### Phase 2

- Add ranked matchmaking queue and post-match rank updates
- Persist match history and season stats
- Expand frontend navigation for ranked, leaderboards, friends, and profile

### Phase 3

- Add live matches registry and spectator sockets
- Add realtime friend request notifications and online presence updates
- Add private friend invites

### Phase 4

- Add richer ranked UI, season banners, match history views, and leaderboard filters
- Add automated season rollover tasks and archival summaries
