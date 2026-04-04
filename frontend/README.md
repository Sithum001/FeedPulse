# FeedPulse Frontend

This is the Next.js frontend for FeedPulse.

- Public page for submitting feedback
- Admin login and dashboard for managing feedback
- Connects to the backend API

For full project setup (backend + frontend), see [../README.md](../README.md).

## Prerequisites

- Node.js 20+
- npm 10+
- Running FeedPulse backend (default: `http://localhost:4000`)

## Environment Variables

Create [frontend/.env.local](.env.local):

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Install

```powershell
cd frontend
npm install
```

## Run (Development)

```powershell
cd frontend
npm run dev
```

Open http://localhost:3000

## Available Scripts

- `npm run dev` - Start Next.js dev server
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run lint` - Run ESLint

## Backend Dependency

This app requires the backend API to be running.

- Default backend URL: `http://localhost:4000`
- Health check: `http://localhost:4000/api/health`

If login or dashboard requests fail, verify:
- Backend is running
- `NEXT_PUBLIC_API_URL` is correct
- Backend CORS `FRONTEND_URL` allows your frontend origin
