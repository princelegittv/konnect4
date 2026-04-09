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

## Deploy Online

Konnect4 is set up to deploy as:

- Frontend: Vercel
- Backend: Render
- Database: local SQLite file on the backend service disk

Important:

- The backend uses `node:sqlite`, so deploy with Node `22+`.
- For production, the frontend should use same-origin `/api` and `/socket.io` rewrites.
- Do not set `VITE_SERVER_URL` or `VITE_SOCKET_SERVER_URL` on Vercel unless you intentionally want cross-origin traffic.

### 1. Push This Repo To GitHub

Create a GitHub repository, then push this folder:

```bash
git init
git add .
git commit -m "Prepare Konnect4 for deployment"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Deploy The Backend On Render

1. Go to [Render](https://render.com/).
2. Create a new `Web Service`.
3. Connect your GitHub repo.
4. Render can use [render.yaml](./render.yaml) automatically, or you can enter these settings manually:

   - Root Directory: repo root
   - Build Command: `npm ci`
   - Start Command: `npm run start --workspace server`
   - Health Check Path: `/health`

5. Set environment variables:

   - `NODE_ENV=production`
   - `NODE_VERSION=22.22.0`
   - `CLIENT_URL=https://your-frontend-domain.vercel.app`

6. Deploy the service.

After deploy, confirm the backend is live:

- `https://your-render-service.onrender.com/health`

You should see a JSON response like:

```json
{ "ok": true }
```

### 3. Deploy The Frontend On Vercel

1. Go to [Vercel](https://vercel.com/).
2. Import the same GitHub repo.
3. Set the project root directory to:

   - `client`

4. Use these build settings:

   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. Do not add `VITE_SERVER_URL`.
6. Do not add `VITE_SOCKET_SERVER_URL`.

The frontend already has [vercel.json](./client/vercel.json), which rewrites:

- `/api/*` to your Render backend
- `/socket.io/*` to your Render backend

Before production goes live, update [client/vercel.json](./client/vercel.json) so the destination matches your real Render backend URL if it differs from `https://konnect4-backend.onrender.com`.

### 4. Update The Backend Origin

After Vercel gives you your real frontend URL, make sure Render has:

```text
CLIENT_URL=https://your-real-vercel-domain.vercel.app
```

Then redeploy the backend.

### 5. Why Queueing Failed Before

The frontend login requests were using same-origin `/api`, but the Socket.IO client had been connecting to a different backend domain. That split prevented the browser from sending the same session cookie to realtime matchmaking requests.

This repo is now set up so production socket traffic can stay same-origin through the frontend domain, which makes:

- login persist properly
- queue buttons work
- matchmaking work across devices and browsers

### 6. Cookie Consent

The app now asks users to accept essential cookies before login and matchmaking. This matters because Konnect4 uses cookies for:

- sessions
- authentication
- reconnecting live games
- online matchmaking

### 7. Recommended Launch Checklist

Before sharing the game publicly, verify:

- signup works
- login/logout works
- cookie banner appears
- private room create/join works
- random queue works
- ranked queue works
- spectators can join live matches
- notifications appear and clear correctly
- piece drop sounds play after confirmed moves
- mobile browser layout works on iPhone and Android
- Chrome, Safari, Edge, and Firefox can all connect

### 8. Persistence Note

The current backend stores data in SQLite on the backend service disk. That is fine for an MVP, but for a more durable production setup you should eventually move to a managed database such as Postgres.

## App Readiness

Konnect4 now includes the web-app foundations needed to behave more like an installable mobile app:

- web app manifest
- theme color and mobile app meta tags
- installable app prompt support
- service worker registration for basic app-shell caching
- app icons for browser and install surfaces

Files involved:

- [client/index.html](./client/index.html)
- [client/public/manifest.webmanifest](./client/public/manifest.webmanifest)
- [client/public/sw.js](./client/public/sw.js)
- [client/public/icons/icon.svg](./client/public/icons/icon.svg)
- [client/public/icons/icon-maskable.svg](./client/public/icons/icon-maskable.svg)

Important:

- A PWA alone is not usually enough for direct Google Play publishing.
- The usual next step is packaging the live site with either a Trusted Web Activity or Capacitor.
- For the Play Store, you will also want:
  - a real privacy policy URL
  - polished 512x512 PNG app icon assets
  - splash assets
  - Android package metadata
  - store listing text and screenshots

Recommended next packaging options:

- Trusted Web Activity if you want the Play Store app to load the hosted Konnect4 website directly
- Capacitor if you want a native Android wrapper project inside this repo

## How It Works

- The backend exposes REST auth endpoints under `/api/auth/*`.
- Session data, users, friends, seasons, and leaderboards are persisted in `server/data/konnect4.sqlite`.
- The shared `shared/connect4.js` module contains the core game rules.
- The Socket.IO layer handles private rooms, matchmaking queueing, AI practice, rematches, and disconnect cleanup.
- Every move is validated on the server before room state is broadcast to clients.
