# Konnect4

A full-stack Konnect4 platform built with React, Node.js, Express, and Socket.IO.

## Project Structure

```text
konnect4/
  client/         React + Vite frontend
  server/         Express + Socket.IO backend
  shared/         Shared Konnect4 game engine
```

## Features

- Signup, login, logout, and persistent sessions
- Unique username and email validation
- Hashed passwords stored with Node's `crypto.scrypt`
- Private matches with create/join room codes
- Random online matchmaking queue with cancel support
- Practice vs AI with `easy`, `medium`, `hard`, `extreme`, and `impossible`
- Server-authoritative game state and move validation
- Real-time updates over Socket.IO
- Red/yellow assignment, win detection, draw detection, and rematches
- Graceful disconnect handling
- Animated falling pieces and responsive mobile-friendly UI

## Setup

1. Install dependencies from the project root:

   ```bash
   npm install
   npm run install:all
   ```

2. Start both apps in development mode:

   ```bash
   npm run dev
   ```

3. Open the frontend:

   [http://localhost:5173](http://localhost:5173)

4. The backend runs on:

   [http://localhost:3001](http://localhost:3001)

## Available Scripts

- `npm test` runs the shared game tests and room manager tests
- `npm run dev` starts the frontend and backend together
- `npm run dev:client` starts only the React app
- `npm run dev:server` starts only the Node.js server
- `npm run build` builds the frontend for production
- `npm run start` starts the backend in production mode

## Environment Variables

- `CLIENT_URL` sets the allowed frontend origin for Express and Socket.IO
- `VITE_SERVER_URL` sets the frontend REST API base URL
- `VITE_SOCKET_SERVER_URL` sets the frontend Socket.IO server URL

## How It Works

- The backend exposes REST auth endpoints under `/api/auth/*`.
- Session data, users, friends, seasons, and leaderboards are persisted in `server/data/konnect4.sqlite`.
- The shared `shared/connect4.js` module contains the core game rules.
- The Socket.IO layer handles private rooms, matchmaking queueing, AI practice, rematches, and disconnect cleanup.
- Every move is validated on the server before room state is broadcast to clients.
